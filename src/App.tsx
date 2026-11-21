import React, { useEffect, useMemo, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { AdminDashboardScreen } from './components/AdminDashboard';
import { AuthScreen, WelcomeScreen } from './components/AuthScreens';
import {
  BookingConfirmationScreen,
  BookingFormScreen,
  MyBookingsScreen,
} from './components/BookingFlow';
import { SplashScreen } from './components/BrandLogo';
import {
  CustomerHome,
  ServiceCategoriesScreen,
  ServiceDetailsScreen,
} from './components/CustomerHome';
import {
  CustomerProfileScreen,
  NotificationsScreen,
  RatingsAndReviewsScreen,
} from './components/CustomerProfileAndReviews';
import {
  BookingChatScreen,
  LiveTrackingScreen,
} from './components/LiveTrackingAndChat';
import {
  NearbyProfessionalsScreen,
  ProfessionalProfileScreen,
} from './components/NearbyAndProfile';
import {
  EarningsDashboardScreen,
  ProfessionalDashboardScreen,
  ProfessionalRegistrationScreen,
  ProfessionalRequestsScreen,
} from './components/ProfessionalPortal';
import { MobileBottomNav, TopNav } from './components/TopNav';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_OFFERS,
  DEFAULT_PRICING_ITEMS,
  DEMO_SAMPLE_PROFESSIONALS,
  INDIAN_CITIES,
} from './data/catalog';
import {
  ADMIN_BOOTSTRAP_EMAIL,
  auth,
  db,
  handleFirestoreError,
  OperationType,
  testConnection,
} from './lib/firebase';
import { generateId } from './lib/geo';
import type {
  AppScreen,
  AvailabilityStatus,
  BookingRecord,
  BookingStatus,
  LocationPoint,
  NotificationItem,
  OfferItem,
  PaymentMethod,
  PricingItem,
  ProfessionalPrivateKYC,
  ProfessionalProfile,
  ReviewRecord,
  ServiceCategory,
  UserProfile,
  UserRole,
} from './types';

const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('splash');
  const [activeRole, setActiveRole] = useState<UserRole>('customer');
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [firestoreOffline, setFirestoreOffline] = useState(false);

  // Catalog & Marketplace State
  const [categories, setCategories] = useState<ServiceCategory[]>(DEFAULT_CATEGORIES);
  const [pricingItems, setPricingItems] = useState<PricingItem[]>(DEFAULT_PRICING_ITEMS);
  const [offers, setOffers] = useState<OfferItem[]>(DEFAULT_OFFERS);
  const [realProfessionals, setRealProfessionals] = useState<ProfessionalProfile[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [customerBookings, setCustomerBookings] = useState<BookingRecord[]>([]);
  const [proBookings, setProBookings] = useState<BookingRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [myProKyc, setMyProKyc] = useState<ProfessionalPrivateKYC | null>(null);

  // Selection & Flow State
  const [customerLocation, setCustomerLocation] = useState<LocationPoint>(INDIAN_CITIES[0]);
  const [demoMode, setDemoMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>(DEFAULT_CATEGORIES[0]);
  const [mapCategoryFilter, setMapCategoryFilter] = useState<string>('all');
  const [selectedPro, setSelectedPro] = useState<ProfessionalProfile | null>(null);
  const [bookingEmergency, setBookingEmergency] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [reviewTargetBooking, setReviewTargetBooking] = useState<BookingRecord | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const activeRoleRef = React.useRef<UserRole>(activeRole);
  activeRoleRef.current = activeRole;
  const customerLocationRef = React.useRef<LocationPoint>(customerLocation);
  customerLocationRef.current = customerLocation;

  // Listen for Google Maps Quota Exceeded event
  useEffect(() => {
    const handler = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  // Validate Firestore connectivity on mount
  useEffect(() => {
    testConnection().then((ok) => {
      if (!ok) setFirestoreOffline(true);
    });
  }, []);

  // Splash auto-advance (non-blocking; user can also click Get Started immediately)
  useEffect(() => {
    if (screen !== 'splash') return;
    const t = setTimeout(() => {
      setScreen((prev) => (prev === 'splash' ? 'welcome' : prev));
    }, 1100);
    return () => clearTimeout(t);
  }, [screen]);

  // Firebase Auth listener & User Profile Bootstrap
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUserProfile(null);
        setIsAdmin(false);
        setCustomerBookings([]);
        setProBookings([]);
        setNotifications([]);
        setMyProKyc(null);
        setAuthReady(true);
        return;
      }

      const userRef = doc(db, 'users', fbUser.uid);
      try {
        const snap = await getDoc(userRef);
        let profile: UserProfile;
        if (snap.exists()) {
          profile = snap.data() as UserProfile;
        } else {
          const loc = customerLocationRef.current;
          profile = {
            uid: fbUser.uid,
            displayName: fbUser.displayName || fbUser.phoneNumber || 'AF Fixing User',
            ...(fbUser.email ? { email: fbUser.email } : {}),
            ...(fbUser.phoneNumber ? { phone: fbUser.phoneNumber } : {}),
            ...(fbUser.photoURL ? { photoURL: fbUser.photoURL } : {}),
            role: activeRoleRef.current === 'professional' ? 'professional' : 'customer',
            defaultAddress: loc.address,
            defaultCity: loc.city,
            defaultLat: loc.lat,
            defaultLng: loc.lng,
            isBlocked: false,
          };
          await setDoc(userRef, {
            ...profile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        if (profile.defaultLat && profile.defaultLng && profile.defaultAddress) {
          setCustomerLocation({
            lat: profile.defaultLat,
            lng: profile.defaultLng,
            address: profile.defaultAddress,
            city: profile.defaultCity || 'India',
          });
        }

        let adminFlag =
          Boolean(fbUser.emailVerified) &&
          fbUser.email === ADMIN_BOOTSTRAP_EMAIL;
        if (!adminFlag) {
          const adminSnap = await getDoc(doc(db, 'admins', fbUser.uid));
          adminFlag = adminSnap.exists();
        }

        setUserProfile(profile);
        setIsAdmin(adminFlag);
      } catch (err) {
        console.error('Error syncing user profile:', err);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // Public Catalog, Professionals & Reviews Listeners
  useEffect(() => {
    const unsubCats = onSnapshot(
      collection(db, 'serviceCategories'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs
            .map((d) => d.data() as ServiceCategory)
            .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
          setCategories(list);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'serviceCategories')
    );

    const unsubPrices = onSnapshot(
      collection(db, 'pricingItems'),
      (snap) => {
        if (!snap.empty) {
          setPricingItems(snap.docs.map((d) => d.data() as PricingItem));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'pricingItems')
    );

    const unsubOffers = onSnapshot(
      collection(db, 'offers'),
      (snap) => {
        if (!snap.empty) {
          setOffers(snap.docs.map((d) => d.data() as OfferItem));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'offers')
    );

    const prosQuery = query(
      collection(db, 'professionals'),
      where('isBlocked', '==', false)
    );
    const unsubPros = onSnapshot(
      prosQuery,
      (snap) => {
        setRealProfessionals(
          snap.docs.map((d) => d.data() as ProfessionalProfile)
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'professionals')
    );

    const unsubReviews = onSnapshot(
      collection(db, 'reviews'),
      (snap) => {
        setReviews(snap.docs.map((d) => d.data() as ReviewRecord));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reviews')
    );

    return () => {
      unsubCats();
      unsubPrices();
      unsubOffers();
      unsubPros();
      unsubReviews();
    };
  }, []);

  // User-Scoped Bookings, Notifications & Pro KYC Listeners (Only when signed in)
  useEffect(() => {
    if (!authReady || !userProfile) return;

    const uid = userProfile.uid;

    const unsubCustBookings = onSnapshot(
      query(collection(db, 'bookings'), where('customerId', '==', uid)),
      (snap) => {
        setCustomerBookings(snap.docs.map((d) => d.data() as BookingRecord));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookings')
    );

    const unsubProBookings = onSnapshot(
      query(collection(db, 'bookings'), where('professionalId', '==', uid)),
      (snap) => {
        setProBookings(snap.docs.map((d) => d.data() as BookingRecord));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookings')
    );

    const unsubNotifs = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', uid)),
      (snap) => {
        setNotifications(snap.docs.map((d) => d.data() as NotificationItem));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
    );

    const unsubKyc = onSnapshot(
      doc(db, 'professionals', uid, 'private', 'verification'),
      (snap) => {
        if (snap.exists()) {
          setMyProKyc(snap.data() as ProfessionalPrivateKYC);
        }
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.GET,
          `professionals/${uid}/private/verification`
        )
    );

    return () => {
      unsubCustBookings();
      unsubProBookings();
      unsubNotifs();
      unsubKyc();
    };
  }, [authReady, userProfile?.uid]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const enrichedProfessionals = useMemo(() => {
    return realProfessionals
      .filter((p) => !p.isBlocked)
      .map((p) => {
        const proRevs = reviews.filter((r) => r.professionalId === p.uid);
        if (proRevs.length === 0) return p;
        const avg =
          proRevs.reduce((acc, r) => acc + r.rating, 0) / proRevs.length;
        return {
          ...p,
          ratingAvg: Number(avg.toFixed(1)),
          reviewCount: proRevs.length,
        };
      });
  }, [realProfessionals, reviews]);

  const myProProfile = useMemo(() => {
    if (!userProfile) return null;
    return enrichedProfessionals.find((p) => p.uid === userProfile.uid) || null;
  }, [enrichedProfessionals, userProfile]);

  const displayedProfessionals = useMemo(() => {
    if (demoMode) {
      return [...enrichedProfessionals, ...DEMO_SAMPLE_PROFESSIONALS];
    }
    return enrichedProfessionals;
  }, [enrichedProfessionals, demoMode]);

  const activeBooking = useMemo(() => {
    if (!activeBookingId) return null;
    return (
      customerBookings.find((b) => b.id === activeBookingId) ||
      proBookings.find((b) => b.id === activeBookingId) ||
      null
    );
  }, [activeBookingId, customerBookings, proBookings]);

  const unreadNotifications = notifications.filter((n) => !n.isRead).length;

  const pushNotification = async (
    userId: string,
    title: string,
    body: string,
    type: NotificationItem['type'],
    bookingId?: string
  ) => {
    const id = generateId('notif');
    try {
      await setDoc(doc(db, 'notifications', id), {
        id,
        userId,
        title: title.slice(0, 120),
        body: body.slice(0, 400),
        type,
        bookingId: bookingId || '',
        isRead: false,
        createdAt: serverTimestamp(),
      });
      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted' &&
        userId === userProfile?.uid
      ) {
        new Notification(title, { body });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `notifications/${id}`);
    }
  };

  const handleSubmitBooking = async (payload: {
    category: ServiceCategory;
    pro: ProfessionalProfile;
    issueTitle: string;
    issueDescription: string;
    issueMediaNames: string[];
    location: LocationPoint;
    customerPhone: string;
    scheduledDate: string;
    scheduledSlot: string;
    isEmergency: boolean;
    inspectionFee: number;
    estimatedLabour: number;
    estimatedMaterial: number;
    totalEstimated: number;
    paymentMethod: PaymentMethod;
  }) => {
    if (!userProfile) {
      setScreen('auth');
      return;
    }
    if (userProfile.isBlocked) {
      throw new Error('Your account is currently suspended.');
    }

    const bookingId = generateId('bk');
    const invoiceNumber = `AFF-${Date.now().toString().slice(-6)}`;

    const bookingDoc = {
      id: bookingId,
      customerId: userProfile.uid,
      customerName: userProfile.displayName,
      customerPhone: payload.customerPhone || '',
      professionalId: payload.pro.uid,
      professionalName: payload.pro.fullName,
      professionalPhoto: payload.pro.photoURL || '',
      categoryId: payload.category.id,
      categoryName: payload.category.name,
      issueTitle: payload.issueTitle,
      issueDescription: payload.issueDescription,
      issueMediaNames: payload.issueMediaNames,
      address: payload.location.address,
      lat: payload.location.lat,
      lng: payload.location.lng,
      scheduledDate: payload.scheduledDate,
      scheduledSlot: payload.scheduledSlot,
      isEmergency: payload.isEmergency,
      status: 'Request Sent' as BookingStatus,
      inspectionFee: payload.inspectionFee,
      estimatedLabour: payload.estimatedLabour,
      estimatedMaterial: payload.estimatedMaterial,
      totalEstimated: payload.totalEstimated,
      paymentMethod: payload.paymentMethod,
      paymentStatus: 'Pending' as const,
      invoiceNumber,
      isProSharingLocation: Boolean(payload.pro.isSharingLocation),
      ...(typeof payload.pro.lat === 'number' ? { proLat: payload.pro.lat } : {}),
      ...(typeof payload.pro.lng === 'number' ? { proLng: payload.pro.lng } : {}),
      hasReview: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'bookings', bookingId), bookingDoc);
      const payId = generateId('pay');
      await setDoc(doc(db, 'payments', payId), {
        id: payId,
        bookingId,
        customerId: userProfile.uid,
        professionalId: payload.pro.uid,
        amount: payload.totalEstimated,
        method: payload.paymentMethod,
        status: 'Pending',
        invoiceNumber,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await pushNotification(
        payload.pro.uid,
        'New Booking Request',
        `${userProfile.displayName} requested ${payload.category.name}: ${payload.issueTitle}`,
        'booking_request',
        bookingId
      );

      setActiveBookingId(bookingId);
      setScreen('booking-confirmation');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `bookings/${bookingId}`);
    }
  };

  const handleCancelBooking = async (b: BookingRecord, reason: string) => {
    try {
      await updateDoc(doc(db, 'bookings', b.id), {
        status: 'Cancelled',
        cancellationReason: reason.slice(0, 300),
        updatedAt: serverTimestamp(),
      });
      await pushNotification(
        b.professionalId,
        'Booking Cancelled',
        `${b.customerName} cancelled booking ${b.invoiceNumber || b.id}.`,
        'cancelled',
        b.id
      );
      showToast('Booking cancelled.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${b.id}`);
    }
  };

  const handleRescheduleBooking = async (
    b: BookingRecord,
    date: string,
    slot: string
  ) => {
    try {
      await updateDoc(doc(db, 'bookings', b.id), {
        scheduledDate: date,
        scheduledSlot: slot,
        updatedAt: serverTimestamp(),
      });
      showToast('Booking slot rescheduled.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${b.id}`);
    }
  };

  const handleReportIssue = async (
    b: BookingRecord,
    subject: string,
    description: string
  ) => {
    if (!userProfile) return;
    const id = generateId('cmp');
    try {
      await setDoc(doc(db, 'complaints', id), {
        id,
        bookingId: b.id,
        customerId: userProfile.uid,
        customerName: userProfile.displayName,
        professionalId: b.professionalId,
        subject,
        description,
        status: 'Open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast('Issue report submitted to AF FIXING support.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `complaints/${id}`);
    }
  };

  const handleSaveProProfile = async (
    proPayload: Omit<ProfessionalProfile, 'createdAt' | 'updatedAt'>,
    kycPayload: Omit<ProfessionalPrivateKYC, 'updatedAt'>
  ) => {
    if (!userProfile) return;
    try {
      const proRef = doc(db, 'professionals', proPayload.uid);
      const existing = await getDoc(proRef);
      if (existing.exists()) {
        await updateDoc(proRef, {
          fullName: proPayload.fullName,
          photoURL: proPayload.photoURL,
          categoryId: proPayload.categoryId,
          categoryName: proPayload.categoryName,
          skills: proPayload.skills,
          experienceYears: proPayload.experienceYears,
          serviceArea: proPayload.serviceArea,
          workingHours: proPayload.workingHours,
          inspectionCharge: proPayload.inspectionCharge,
          hourlyRate: proPayload.hourlyRate,
          bio: proPayload.bio,
          lat: proPayload.lat,
          lng: proPayload.lng,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(proRef, {
          ...proPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await setDoc(
        doc(db, 'professionals', proPayload.uid, 'private', 'verification'),
        {
          ...kycPayload,
          updatedAt: serverTimestamp(),
        }
      );

      await updateDoc(doc(db, 'users', userProfile.uid), {
        role: 'professional',
        updatedAt: serverTimestamp(),
      });
      setActiveRole('professional');
      showToast('Professional profile saved.');
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `professionals/${proPayload.uid}`
      );
    }
  };

  const handleToggleProOnline = async (nextOnline: boolean) => {
    if (!myProProfile) return;
    if (!nextOnline) {
      try {
        await updateDoc(doc(db, 'professionals', myProProfile.uid), {
          isOnline: false,
          isSharingLocation: false,
          availabilityStatus: 'Offline',
          updatedAt: serverTimestamp(),
        });
        showToast('You are now Offline.');
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `professionals/${myProProfile.uid}`
        );
      }
      return;
    }

    if (!navigator.geolocation) {
      throw new Error(
        'Geolocation is not supported in this browser. Cannot go online for live map tracking.'
      );
    }

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    }).catch((geoErr: GeolocationPositionError) => {
      if (geoErr.code === 1) {
        throw new Error(
          'Location permission was denied. Enable browser location access to share your live position and go online.'
        );
      }
      throw new Error('Unable to acquire GPS coordinates right now.');
    });

    const liveLat = position.coords.latitude;
    const liveLng = position.coords.longitude;

    try {
      await updateDoc(doc(db, 'professionals', myProProfile.uid), {
        isOnline: true,
        isSharingLocation: true,
        availabilityStatus: 'Available Now',
        lat: liveLat,
        lng: liveLng,
        updatedAt: serverTimestamp(),
      });

      // Also push live coordinates to any active bookings for this professional
      const activeForPro = proBookings.filter((b) =>
        ['Accepted', 'On The Way', 'Arrived', 'Work Started'].includes(b.status)
      );
      for (const b of activeForPro) {
        await updateDoc(doc(db, 'bookings', b.id), {
          proLat: liveLat,
          proLng: liveLng,
          isProSharingLocation: true,
          updatedAt: serverTimestamp(),
        });
      }

      showToast('You are now ONLINE with live GPS enabled.');
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `professionals/${myProProfile.uid}`
      );
    }
  };

  const handleChangeProStatus = async (status: AvailabilityStatus) => {
    if (!myProProfile) return;
    try {
      await updateDoc(doc(db, 'professionals', myProProfile.uid), {
        availabilityStatus: status,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `professionals/${myProProfile.uid}`
      );
    }
  };

  const handleUpdateBookingStatus = async (
    booking: BookingRecord,
    nextStatus: BookingStatus,
    extra?: { finalAmount?: number; markPaid?: boolean; shareLiveGps?: boolean }
  ) => {
    let proLat = myProProfile?.lat;
    let proLng = myProProfile?.lng;

    if (extra?.shareLiveGps && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
          });
        });
        proLat = pos.coords.latitude;
        proLng = pos.coords.longitude;
      } catch {
        // retain existing coords if user declined mid-job refresh
      }
    }

    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
      isProSharingLocation: Boolean(extra?.shareLiveGps && typeof proLat === 'number'),
      updatedAt: serverTimestamp(),
    };
    if (typeof proLat === 'number' && typeof proLng === 'number') {
      updatePayload.proLat = proLat;
      updatePayload.proLng = proLng;
    }
    if (typeof extra?.finalAmount === 'number') {
      updatePayload.finalAmount = extra.finalAmount;
    }
    if (extra?.markPaid) {
      updatePayload.paymentStatus = 'Paid';
    }

    try {
      await updateDoc(doc(db, 'bookings', booking.id), updatePayload);

      const notifMap: Record<
        string,
        { title: string; body: string; type: NotificationItem['type'] }
      > = {
        Accepted: {
          title: 'Booking Accepted',
          body: `${booking.professionalName} accepted your ${booking.categoryName} request.`,
          type: 'booking_accepted',
        },
        Rejected: {
          title: 'Booking Declined',
          body: `${booking.professionalName} is unavailable for this slot.`,
          type: 'booking_rejected',
        },
        'On The Way': {
          title: 'Technician On The Way',
          body: `${booking.professionalName} is heading to your location.`,
          type: 'on_the_way',
        },
        Arrived: {
          title: 'Technician Arrived',
          body: `${booking.professionalName} has arrived at your address.`,
          type: 'arrived',
        },
        Completed: {
          title: 'Job Completed',
          body: `Your ${booking.categoryName} service is completed. Please rate your experience.`,
          type: 'completed',
        },
      };

      const notif = notifMap[nextStatus];
      if (notif) {
        await pushNotification(
          booking.customerId,
          notif.title,
          notif.body,
          notif.type,
          booking.id
        );
      }

      showToast(`Booking status updated to ${nextStatus}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
    }
  };

  const handleSubmitReview = async (payload: {
    booking: BookingRecord;
    rating: number;
    comment: string;
  }) => {
    if (!userProfile) return;
    const revId = generateId('rev');
    try {
      await setDoc(doc(db, 'reviews', revId), {
        id: revId,
        bookingId: payload.booking.id,
        customerId: userProfile.uid,
        customerName: userProfile.displayName,
        professionalId: payload.booking.professionalId,
        categoryId: payload.booking.categoryId,
        rating: payload.rating,
        comment: payload.comment,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'bookings', payload.booking.id), {
        hasReview: true,
        updatedAt: serverTimestamp(),
      });
      showToast('Verified review published.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reviews/${revId}`);
    }
  };

  const renderScreen = () => {
    if (screen === 'splash') {
      return <SplashScreen onContinue={() => setScreen('welcome')} />;
    }
    if (screen === 'welcome') {
      return (
        <WelcomeScreen
          onSelectRole={(role) => {
            setActiveRole(role);
            if (userProfile) {
              setScreen(
                role === 'professional'
                  ? myProProfile
                    ? 'pro-dashboard'
                    : 'pro-register'
                  : 'customer-home'
              );
            } else {
              setScreen('auth');
            }
          }}
          onBrowseServices={() => {
            setActiveRole('customer');
            setScreen('customer-home');
          }}
        />
      );
    }
    if (screen === 'auth') {
      return (
        <AuthScreen
          intendedRole={activeRole}
          onRoleChange={setActiveRole}
          onSuccess={() => {
            if (activeRole === 'professional') {
              setScreen(myProProfile ? 'pro-dashboard' : 'pro-register');
            } else {
              setScreen('customer-home');
            }
          }}
          onBack={() => setScreen('welcome')}
        />
      );
    }

    switch (screen) {
      case 'customer-home':
        return (
          <CustomerHome
            location={customerLocation}
            categories={categories}
            pricingItems={pricingItems}
            offers={offers}
            liveProfessionals={displayedProfessionals}
            recentBookings={customerBookings}
            demoMode={demoMode}
            onToggleDemoMode={setDemoMode}
            onChangeLocation={setCustomerLocation}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              setScreen('service-details');
            }}
            onSelectPro={(pro) => {
              setSelectedPro(pro);
              setScreen('pro-profile');
            }}
            onBookCategory={(cat, emergency) => {
              setSelectedCategory(cat);
              setSelectedPro(null);
              setBookingEmergency(Boolean(emergency));
              setScreen('booking-form');
            }}
            onOpenBookingTracking={(b) => {
              setActiveBookingId(b.id);
              setScreen('live-tracking');
            }}
            onNavigate={setScreen}
          />
        );

      case 'categories':
        return (
          <ServiceCategoriesScreen
            categories={categories}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              setScreen('service-details');
            }}
            onBack={() => setScreen('customer-home')}
          />
        );

      case 'service-details':
        return (
          <ServiceDetailsScreen
            category={selectedCategory}
            pricingItems={pricingItems}
            onFindNearbyPros={(cat) => {
              setMapCategoryFilter(cat.id);
              setScreen('nearby-map');
            }}
            onBookNow={(cat, emergency) => {
              setSelectedCategory(cat);
              setSelectedPro(null);
              setBookingEmergency(Boolean(emergency));
              setScreen('booking-form');
            }}
            onBack={() => setScreen('categories')}
          />
        );

      case 'nearby-map':
      case 'pro-list':
        return (
          <NearbyProfessionalsScreen
            initialView={screen === 'pro-list' ? 'list' : 'map'}
            customerLocation={customerLocation}
            categories={categories}
            professionals={displayedProfessionals}
            selectedCategoryId={mapCategoryFilter}
            demoMode={demoMode}
            onToggleDemoMode={setDemoMode}
            onChangeLocation={setCustomerLocation}
            onCategoryFilterChange={setMapCategoryFilter}
            onViewProfile={(pro) => {
              setSelectedPro(pro);
              setScreen('pro-profile');
            }}
            onBookPro={(pro) => {
              if (pro.isDemo) {
                showToast(
                  'Sample Demo profiles cannot receive live bookings. Register or go online as a real pro to test booking.'
                );
                return;
              }
              const cat =
                categories.find((c) => c.id === pro.categoryId) ||
                selectedCategory;
              setSelectedCategory(cat);
              setSelectedPro(pro);
              setBookingEmergency(false);
              setScreen('booking-form');
            }}
            onRegisterPro={() => {
              setActiveRole('professional');
              setScreen(userProfile ? 'pro-register' : 'auth');
            }}
          />
        );

      case 'pro-profile':
        return selectedPro ? (
          <ProfessionalProfileScreen
            pro={selectedPro}
            customerLocation={customerLocation}
            reviews={reviews}
            onBookPro={(pro) => {
              if (pro.isDemo) {
                showToast(
                  'Sample Demo profiles cannot receive live bookings. Toggle Demo Mode off and use a registered professional.'
                );
                return;
              }
              const cat =
                categories.find((c) => c.id === pro.categoryId) ||
                selectedCategory;
              setSelectedCategory(cat);
              setSelectedPro(pro);
              setBookingEmergency(false);
              setScreen('booking-form');
            }}
            onBack={() => setScreen('nearby-map')}
          />
        ) : null;

      case 'booking-form':
        return (
          <BookingFormScreen
            user={userProfile}
            categories={categories}
            pricingItems={pricingItems}
            professionals={realProfessionals}
            initialCategory={selectedCategory}
            initialPro={selectedPro}
            initialLocation={customerLocation}
            initialEmergency={bookingEmergency}
            onSubmitBooking={handleSubmitBooking}
            onRequireAuth={() => setScreen('auth')}
            onCancel={() => setScreen('customer-home')}
          />
        );

      case 'booking-confirmation':
        return activeBooking ? (
          <BookingConfirmationScreen
            booking={activeBooking}
            onTrackBooking={() => setScreen('live-tracking')}
            onOpenChat={() => setScreen('chat')}
            onViewAllBookings={() => setScreen('my-bookings')}
          />
        ) : null;

      case 'live-tracking':
        return activeBooking ? (
          <LiveTrackingScreen
            booking={activeBooking}
            onOpenChat={() => setScreen('chat')}
            onBack={() =>
              setScreen(
                activeRole === 'professional' ? 'pro-requests' : 'my-bookings'
              )
            }
          />
        ) : null;

      case 'chat':
        return activeBooking && userProfile ? (
          <BookingChatScreen
            booking={activeBooking}
            currentUser={userProfile}
            onBack={() => setScreen('live-tracking')}
          />
        ) : null;

      case 'my-bookings':
        return (
          <MyBookingsScreen
            bookings={customerBookings}
            onTrackBooking={(b) => {
              setActiveBookingId(b.id);
              setScreen('live-tracking');
            }}
            onOpenChat={(b) => {
              setActiveBookingId(b.id);
              setScreen('chat');
            }}
            onCancelBooking={handleCancelBooking}
            onRescheduleBooking={handleRescheduleBooking}
            onRateBooking={(b) => {
              setReviewTargetBooking(b);
              setScreen('reviews');
            }}
            onReportIssue={handleReportIssue}
            onExploreServices={() => setScreen('categories')}
          />
        );

      case 'customer-profile':
        return (
          <CustomerProfileScreen
            user={userProfile}
            isAdmin={isAdmin}
            hasProProfile={Boolean(myProProfile)}
            location={customerLocation}
            onSaveProfile={async (updates) => {
              if (!userProfile) return;
              await updateDoc(doc(db, 'users', userProfile.uid), {
                ...updates,
                updatedAt: serverTimestamp(),
              });
              setUserProfile((prev) => (prev ? { ...prev, ...updates } : prev));
              setCustomerLocation({
                lat: updates.defaultLat,
                lng: updates.defaultLng,
                address: updates.defaultAddress,
                city: updates.defaultCity,
              });
              showToast('Profile saved.');
            }}
            onSwitchRole={setActiveRole}
            onNavigate={setScreen}
            onLogout={async () => {
              await signOut(auth);
              setActiveRole('customer');
              setScreen('welcome');
            }}
          />
        );

      case 'pro-register':
        return (
          <ProfessionalRegistrationScreen
            user={userProfile}
            existingPro={myProProfile}
            existingKyc={myProKyc}
            categories={categories}
            onSaveProfile={handleSaveProProfile}
            onRequireAuth={() => setScreen('auth')}
            onDone={() => setScreen('pro-dashboard')}
          />
        );

      case 'pro-dashboard':
        return myProProfile ? (
          <ProfessionalDashboardScreen
            pro={myProProfile}
            bookings={proBookings}
            reviews={reviews.filter(
              (r) => r.professionalId === myProProfile.uid
            )}
            onToggleOnline={handleToggleProOnline}
            onChangeStatus={handleChangeProStatus}
            onNavigateRequests={() => setScreen('pro-requests')}
            onNavigateEarnings={() => setScreen('pro-earnings')}
            onEditProfile={() => setScreen('pro-register')}
          />
        ) : (
          <ProfessionalRegistrationScreen
            user={userProfile}
            existingPro={null}
            existingKyc={myProKyc}
            categories={categories}
            onSaveProfile={handleSaveProProfile}
            onRequireAuth={() => setScreen('auth')}
            onDone={() => setScreen('pro-dashboard')}
          />
        );

      case 'pro-requests':
        return (
          <ProfessionalRequestsScreen
            bookings={proBookings}
            onUpdateBookingStatus={handleUpdateBookingStatus}
            onOpenChat={(b) => {
              setActiveBookingId(b.id);
              setScreen('chat');
            }}
          />
        );

      case 'pro-earnings':
        return <EarningsDashboardScreen bookings={proBookings} />;

      case 'reviews':
        return (
          <RatingsAndReviewsScreen
            targetBooking={reviewTargetBooking}
            reviews={reviews}
            onSubmitReview={handleSubmitReview}
            onBack={() =>
              setScreen(
                activeRole === 'professional' ? 'pro-dashboard' : 'my-bookings'
              )
            }
          />
        );

      case 'notifications':
        return (
          <NotificationsScreen
            notifications={notifications}
            onMarkRead={async (id) => {
              await updateDoc(doc(db, 'notifications', id), { isRead: true });
            }}
            onOpenBookingId={(bookingId) => {
              setActiveBookingId(bookingId);
              setScreen('live-tracking');
            }}
          />
        );

      case 'admin':
        return (
          <AdminDashboardScreen
            isAdmin={isAdmin}
            categories={categories}
            pricingItems={pricingItems}
            offers={offers}
            professionals={realProfessionals}
            onBack={() => setScreen('customer-home')}
          />
        );

      default:
        return null;
    }
  };

  const hideChrome =
    screen === 'splash' || screen === 'welcome' || screen === 'auth';

  const appShell = (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {firestoreOffline && (
        <div className="bg-red-50 border-b border-red-200 text-red-900 px-4 py-2 text-xs text-center">
          Unable to reach Firestore right now. Check your network connection or
          Firebase configuration.
        </div>
      )}

      {!MAPS_API_KEY && (
        <div className="bg-slate-100 border-b border-slate-200 text-slate-700 px-4 py-2 text-xs text-center">
          Google Maps API key (VITE_GOOGLE_MAPS_API_KEY) is not detected in this
          environment. Configure it to render interactive maps.
        </div>
      )}

      {!hideChrome && (
        <TopNav
          currentScreen={screen}
          activeRole={activeRole}
          isAdmin={isAdmin}
          unreadNotifications={unreadNotifications}
          isSignedIn={Boolean(userProfile)}
          onNavigate={(next) => {
            if (
              (next === 'my-bookings' ||
                next === 'notifications' ||
                next === 'customer-profile') &&
              !userProfile
            ) {
              setScreen('auth');
              return;
            }
            setScreen(next);
          }}
        />
      )}

      <main className="flex-1">{renderScreen()}</main>

      {!hideChrome && (
        <MobileBottomNav
          currentScreen={screen}
          activeRole={activeRole}
          isAdmin={isAdmin}
          onNavigate={(next) => {
            if (
              (next === 'my-bookings' || next === 'customer-profile') &&
              !userProfile
            ) {
              setScreen('auth');
              return;
            }
            setScreen(next);
          }}
        />
      )}

      {toastMsg && (
        <div className="fixed bottom-20 md:bottom-6 right-4 left-4 sm:left-auto sm:max-w-sm z-50 bg-[#0B1F3A] text-white px-4 py-3 rounded-xl shadow-lg text-xs font-medium flex items-center justify-between gap-3">
          <span>{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-blue-300 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );

  if (MAPS_API_KEY) {
    return (
      <APIProvider
        apiKey={MAPS_API_KEY}
        language="en"
        region="IN"
        libraries={['places', 'marker', 'routes']}
      >
        {appShell}
      </APIProvider>
    );
  }

  return appShell;
}
