export type UserRole = 'customer' | 'professional' | 'admin';

export type AvailabilityStatus =
  | 'Available Now'
  | 'Busy'
  | 'Offline'
  | 'On Another Job';

export type BookingStatus =
  | 'Request Sent'
  | 'Accepted'
  | 'On The Way'
  | 'Arrived'
  | 'Work Started'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected';

export type PaymentMethod = 'Cash' | 'UPI' | 'Online';

export type PaymentStatus =
  | 'Pending'
  | 'Awaiting Verification'
  | 'Paid'
  | 'Refunded'
  | 'Failed';

export type AppScreen =
  | 'splash'
  | 'welcome'
  | 'auth'
  | 'customer-home'
  | 'categories'
  | 'service-details'
  | 'nearby-map'
  | 'pro-list'
  | 'pro-profile'
  | 'booking-form'
  | 'booking-confirmation'
  | 'live-tracking'
  | 'chat'
  | 'my-bookings'
  | 'customer-profile'
  | 'pro-register'
  | 'pro-dashboard'
  | 'pro-requests'
  | 'pro-earnings'
  | 'reviews'
  | 'notifications'
  | 'admin';

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  role: UserRole;
  defaultAddress?: string;
  defaultCity?: string;
  defaultLat?: number;
  defaultLng?: number;
  isBlocked: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  iconName: string;
  baseInspectionFee: number;
  minEstimate: number;
  maxEstimate: number;
  isEmergencyEligible?: boolean;
  isActive: boolean;
  sortOrder?: number;
  updatedAt?: unknown;
}

export interface PricingItem {
  id: string;
  categoryId: string;
  title: string;
  description?: string;
  inspectionFee: number;
  minPrice: number;
  maxPrice: number;
  priceType: 'fixed_range' | 'inspection_based';
  materialNote?: string;
  isActive: boolean;
  updatedAt?: unknown;
}

export interface OfferItem {
  id: string;
  title: string;
  code: string;
  discountAmount: number;
  discountLabel: string;
  categoryId?: string;
  isActive: boolean;
  updatedAt?: unknown;
}

export interface ProfessionalProfile {
  uid: string;
  fullName: string;
  photoURL?: string;
  categoryId: string;
  categoryName: string;
  skills?: string[];
  experienceYears: number;
  serviceArea: string;
  workingHours?: string;
  inspectionCharge: number;
  hourlyRate?: number;
  bio?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  isVerified: boolean;
  isBlocked: boolean;
  availabilityStatus: AvailabilityStatus;
  isOnline: boolean;
  isSharingLocation: boolean;
  lat?: number;
  lng?: number;
  ratingAvg?: number;
  reviewCount?: number;
  completedJobs?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  isDemo?: boolean;
}

export interface ProfessionalPrivateKYC {
  uid: string;
  phone: string;
  govIdType: 'Aadhaar' | 'PAN' | 'Driving License' | 'Voter ID';
  govIdLast4: string;
  govIdNote?: string;
  updatedAt?: unknown;
}

export interface BookingRecord {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  professionalId: string;
  professionalName: string;
  professionalPhoto?: string;
  categoryId: string;
  categoryName: string;
  issueTitle: string;
  issueDescription?: string;
  issueMediaNames?: string[];
  address: string;
  lat: number;
  lng: number;
  scheduledDate: string;
  scheduledSlot: string;
  isEmergency: boolean;
  status: BookingStatus;
  inspectionFee: number;
  estimatedLabour?: number;
  estimatedMaterial?: number;
  totalEstimated: number;
  finalAmount?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  invoiceNumber?: string;
  proLat?: number;
  proLng?: number;
  isProSharingLocation: boolean;
  hasReview: boolean;
  cancellationReason?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  createdAt?: unknown;
}

export interface ReviewRecord {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  professionalId: string;
  categoryId: string;
  rating: number;
  comment: string;
  createdAt?: unknown;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type:
    | 'booking_request'
    | 'booking_accepted'
    | 'booking_rejected'
    | 'on_the_way'
    | 'arrived'
    | 'completed'
    | 'cancelled'
    | 'system';
  bookingId?: string;
  isRead: boolean;
  createdAt?: unknown;
}

export interface ComplaintRecord {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  professionalId?: string;
  subject: string;
  description: string;
  status: 'Open' | 'In Review' | 'Resolved';
  adminNote?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PaymentRecord {
  id: string;
  bookingId: string;
  customerId: string;
  professionalId: string;
  amount: number;
  method: PaymentMethod;
  status: 'Pending' | 'Awaiting Verification' | 'Paid' | 'Refund Requested' | 'Refunded';
  invoiceNumber: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LocationPoint {
  lat: number;
  lng: number;
  address: string;
  city: string;
}
