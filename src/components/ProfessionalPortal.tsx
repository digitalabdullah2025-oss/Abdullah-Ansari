import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  LocateFixed,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Power,
  ShieldCheck,
  Star,
  Wallet,
} from 'lucide-react';
import { INDIAN_CITIES, MEDIA_ASSETS } from '../data/catalog';
import { formatInr } from '../lib/geo';
import type {
  AvailabilityStatus,
  BookingRecord,
  BookingStatus,
  ProfessionalPrivateKYC,
  ProfessionalProfile,
  ReviewRecord,
  ServiceCategory,
  UserProfile,
} from '../types';

export const ProfessionalRegistrationScreen: React.FC<{
  user: UserProfile | null;
  existingPro: ProfessionalProfile | null;
  existingKyc: ProfessionalPrivateKYC | null;
  categories: ServiceCategory[];
  onSaveProfile: (
    proPayload: Omit<ProfessionalProfile, 'createdAt' | 'updatedAt'>,
    kycPayload: Omit<ProfessionalPrivateKYC, 'updatedAt'>
  ) => Promise<void>;
  onRequireAuth: () => void;
  onDone: () => void;
}> = ({
  user,
  existingPro,
  existingKyc,
  categories,
  onSaveProfile,
  onRequireAuth,
  onDone,
}) => {
  const [fullName, setFullName] = useState(
    existingPro?.fullName || user?.displayName || ''
  );
  const [phone, setPhone] = useState(existingKyc?.phone || user?.phone || '+91');
  const [photoURL, setPhotoURL] = useState(
    existingPro?.photoURL || user?.photoURL || MEDIA_ASSETS.proMale
  );
  const [categoryId, setCategoryId] = useState(
    existingPro?.categoryId || categories[0]?.id || 'ac-repair'
  );
  const [skillsText, setSkillsText] = useState(
    existingPro?.skills?.join(', ') || 'Diagnostics, Preventive Servicing, Repair'
  );
  const [experienceYears, setExperienceYears] = useState(
    existingPro?.experienceYears ?? 3
  );
  const [serviceArea, setServiceArea] = useState(
    existingPro?.serviceArea || INDIAN_CITIES[0].address
  );
  const [workingHours, setWorkingHours] = useState(
    existingPro?.workingHours || '08:00 AM – 09:00 PM'
  );
  const [inspectionCharge, setInspectionCharge] = useState(
    existingPro?.inspectionCharge ?? 149
  );
  const [hourlyRate, setHourlyRate] = useState(existingPro?.hourlyRate ?? 349);
  const [bio, setBio] = useState(existingPro?.bio || '');
  const [govIdType, setGovIdType] = useState<ProfessionalPrivateKYC['govIdType']>(
    existingKyc?.govIdType || 'Aadhaar'
  );
  const [govIdLast4, setGovIdLast4] = useState(existingKyc?.govIdLast4 || '');
  const [govIdNote, setGovIdNote] = useState(existingKyc?.govIdNote || '');
  const [lat, setLat] = useState(existingPro?.lat ?? INDIAN_CITIES[0].lat);
  const [lng, setLng] = useState(existingPro?.lng ?? INDIAN_CITIES[0].lng);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Browser geolocation is unavailable.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setErrorMsg(null);
      },
      () => {
        setErrorMsg('Location permission denied. Using selected city coordinates.');
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (fullName.trim().length < 2) {
      setErrorMsg('Full name must be at least 2 characters.');
      return;
    }
    if (phone.trim().length < 6) {
      setErrorMsg('Enter a valid mobile number.');
      return;
    }
    if (govIdLast4.trim().length < 4) {
      setErrorMsg('Enter the last 4+ characters of your Government ID for verification.');
      return;
    }

    const cat = categories.find((c) => c.id === categoryId) || categories[0];
    setSaving(true);
    setErrorMsg(null);

    try {
      await onSaveProfile(
        {
          uid: user.uid,
          fullName: fullName.trim().slice(0, 120),
          photoURL: photoURL.trim().slice(0, 500),
          categoryId: cat.id,
          categoryName: cat.name,
          skills: skillsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 10),
          experienceYears: Number(experienceYears) || 1,
          serviceArea: serviceArea.trim().slice(0, 160),
          workingHours: workingHours.trim().slice(0, 80),
          inspectionCharge: Number(inspectionCharge) || 149,
          hourlyRate: Number(hourlyRate) || 349,
          bio: bio.trim().slice(0, 600),
          verificationStatus: existingPro?.verificationStatus || 'pending',
          isVerified: existingPro?.isVerified ?? false,
          isBlocked: existingPro?.isBlocked ?? false,
          availabilityStatus: existingPro?.availabilityStatus || 'Offline',
          isOnline: existingPro?.isOnline ?? false,
          isSharingLocation: existingPro?.isSharingLocation ?? false,
          lat,
          lng,
          ratingAvg: existingPro?.ratingAvg ?? 0,
          reviewCount: existingPro?.reviewCount ?? 0,
          completedJobs: existingPro?.completedJobs ?? 0,
        },
        {
          uid: user.uid,
          phone: phone.trim().slice(0, 20),
          govIdType,
          govIdLast4: govIdLast4.trim().slice(0, 12),
          govIdNote: govIdNote.trim().slice(0, 200),
        }
      );
      onDone();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-[#0B1F3A]">
          {existingPro ? 'Service Professional Profile' : 'Register as Service Professional'}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Complete your trade details and Government ID verification to appear on
          AF FIXING customer searches.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          {errorMsg}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-2xl border border-slate-200 bg-white space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mobile Number *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Primary Service Category *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Experience (Years)
            </label>
            <input
              type="number"
              min={0}
              max={60}
              value={experienceYears}
              onChange={(e) => setExperienceYears(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Service Area / Locality *
            </label>
            <input
              type="text"
              value={serviceArea}
              onChange={(e) => setServiceArea(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Working Hours
            </label>
            <input
              type="text"
              value={workingHours}
              onChange={(e) => setWorkingHours(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Inspection Charge (INR)
            </label>
            <input
              type="number"
              min={0}
              value={inspectionCharge}
              onChange={(e) => setInspectionCharge(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Hourly / Base Service Rate (INR)
            </label>
            <input
              type="number"
              min={0}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Skills (comma separated)
          </label>
          <input
            type="text"
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Profile Bio &amp; Certifications
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Describe your tools, specializations, and service standards..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>

        {/* Profile Picture Preset or URL */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Profile Photo URL
          </label>
          <input
            type="text"
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>

        {/* Base Location Coordinates */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600 tabular-nums">
            <p className="font-semibold text-[#0B1F3A]">Base Work Coordinates</p>
            <p>
              Lat: {lat.toFixed(4)} · Lng: {lng.toFixed(4)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDetectGps}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-[#0B1F3A] inline-flex items-center gap-1.5"
          >
            <LocateFixed className="w-3.5 h-3.5 text-[#2563EB]" />
            Use Current GPS
          </button>
        </div>

        {/* Government ID Verification */}
        <div className="pt-3 border-t border-slate-200 space-y-3">
          <h2 className="text-sm font-bold text-[#0B1F3A]">
            Government ID Verification (Private KYC)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={govIdType}
              onChange={(e) =>
                setGovIdType(e.target.value as ProfessionalPrivateKYC['govIdType'])
              }
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="Aadhaar">Aadhaar Card</option>
              <option value="PAN">PAN Card</option>
              <option value="Driving License">Driving License</option>
              <option value="Voter ID">Voter ID</option>
            </select>
            <input
              type="text"
              value={govIdLast4}
              onChange={(e) => setGovIdLast4(e.target.value)}
              placeholder="Last 4 digits (e.g. 4821)"
              maxLength={12}
              required
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
            <input
              type="text"
              value={govIdNote}
              onChange={(e) => setGovIdNote(e.target.value)}
              placeholder="ID Document Reference"
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl bg-[#0B1F3A] hover:bg-[#122C4F] text-white text-sm font-semibold disabled:opacity-60"
        >
          {saving ? 'Saving Profile...' : 'Save & Open Professional Dashboard'}
        </button>
      </form>
    </div>
  );
};

export const ProfessionalDashboardScreen: React.FC<{
  pro: ProfessionalProfile;
  bookings: BookingRecord[];
  reviews: ReviewRecord[];
  onToggleOnline: (nextOnline: boolean) => Promise<void>;
  onChangeStatus: (status: AvailabilityStatus) => Promise<void>;
  onNavigateRequests: () => void;
  onNavigateEarnings: () => void;
  onEditProfile: () => void;
}> = ({
  pro,
  bookings,
  reviews,
  onToggleOnline,
  onChangeStatus,
  onNavigateRequests,
  onNavigateEarnings,
  onEditProfile,
}) => {
  const [toggling, setToggling] = useState(false);
  const [geoWarning, setGeoWarning] = useState<string | null>(null);

  const pendingCount = bookings.filter((b) => b.status === 'Request Sent').length;
  const activeCount = bookings.filter((b) =>
    ['Accepted', 'On The Way', 'Arrived', 'Work Started'].includes(b.status)
  ).length;
  const completedJobs = bookings.filter((b) => b.status === 'Completed');
  const totalEarnings = completedJobs.reduce(
    (sum, b) => sum + (b.finalAmount ?? b.totalEstimated ?? 0),
    0
  );

  const handleToggle = async () => {
    setToggling(true);
    setGeoWarning(null);
    try {
      await onToggleOnline(!pro.isOnline);
    } catch (err) {
      setGeoWarning(
        err instanceof Error ? err.message : 'Unable to update availability.'
      );
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 pb-24 md:pb-12">
      {/* Top Status & GO ONLINE / GO OFFLINE Hero */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0B1F3A] text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-blue-200">
            <span>{pro.categoryName}</span>
            <span>·</span>
            <span>
              Verification:{' '}
              {pro.isVerified ? 'Verified Partner' : pro.verificationStatus}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold">
            Welcome, {pro.fullName}
          </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            {pro.isOnline
              ? 'You are currently ONLINE and visible on the AF FIXING customer nearby map.'
              : 'You are OFFLINE and hidden from live availability searches. Go online to accept nearby bookings.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={toggling}
            onClick={() => void handleToggle()}
            className={`px-7 py-4 rounded-2xl font-display font-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-3 transition-all shadow-lg ${
              pro.isOnline
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-[#2563EB] hover:bg-blue-500 text-white'
            }`}
          >
            <Power className="w-5 h-5" />
            {toggling
              ? 'Updating GPS...'
              : pro.isOnline
              ? 'ONLINE · Tap to Go Offline'
              : 'GO ONLINE'}
          </button>

          {pro.isOnline && (
            <select
              value={pro.availabilityStatus}
              onChange={(e) =>
                void onChangeStatus(e.target.value as AvailabilityStatus)
              }
              aria-label="Availability status"
              className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold"
            >
              <option value="Available Now" className="text-slate-900">
                Available Now
              </option>
              <option value="Busy" className="text-slate-900">
                Busy
              </option>
              <option value="On Another Job" className="text-slate-900">
                On Another Job
              </option>
            </select>
          )}
        </div>
      </div>

      {geoWarning && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          {geoWarning}
        </div>
      )}

      {!pro.isVerified && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-center justify-between gap-4">
          <span>
            <strong>KYC Status: {pro.verificationStatus}.</strong> An admin can
            approve your verified badge in the Admin Dashboard.
          </span>
          <button
            type="button"
            onClick={onEditProfile}
            className="font-semibold text-[#2563EB] whitespace-nowrap"
          >
            Edit KYC
          </button>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
        <button
          type="button"
          onClick={onNavigateRequests}
          className="text-left p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#2563EB] transition-colors"
        >
          <p className="text-xs text-slate-500">Pending Requests</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#0B1F3A]">
            {pendingCount}
          </p>
          <p className="mt-1 text-xs text-[#2563EB] font-semibold">
            Review queue &rarr;
          </p>
        </button>

        <button
          type="button"
          onClick={onNavigateRequests}
          className="text-left p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#2563EB] transition-colors"
        >
          <p className="text-xs text-slate-500">Active / Accepted Jobs</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#0B1F3A]">
            {activeCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">In progress today</p>
        </button>

        <button
          type="button"
          onClick={onNavigateEarnings}
          className="text-left p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#2563EB] transition-colors"
        >
          <p className="text-xs text-slate-500">Total Earnings</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#0B1F3A]">
            {formatInr(totalEarnings)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {completedJobs.length} completed jobs
          </p>
        </button>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <p className="text-xs text-slate-500">Customer Rating</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#0B1F3A] inline-flex items-center gap-1.5">
            {(pro.ratingAvg || 0).toFixed(1)}
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {reviews.length} verified reviews
          </p>
        </div>
      </div>

      {/* Recent Reviews & Booking History Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
              Recent Job Requests
            </h2>
            <button
              type="button"
              onClick={onNavigateRequests}
              className="text-xs font-semibold text-[#2563EB]"
            >
              Manage all
            </button>
          </div>
          {bookings.length === 0 ? (
            <p className="text-sm text-slate-500">
              No bookings received yet. Stay online so nearby customers can book you.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {bookings.slice(0, 4).map((b) => (
                <div
                  key={b.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0B1F3A] truncate">
                      {b.issueTitle}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {b.customerName} · {b.scheduledDate}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#2563EB] shrink-0">
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
            Recent Customer Feedback
          </h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-slate-500">
              Completed job reviews from customers will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {reviews.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1"
                >
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#0B1F3A]">{r.customerName}</span>
                    <span className="font-semibold text-amber-600 tabular-nums">
                      {r.rating.toFixed(1)} ★
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ProfessionalRequestsScreen: React.FC<{
  bookings: BookingRecord[];
  onUpdateBookingStatus: (
    booking: BookingRecord,
    nextStatus: BookingStatus,
    extra?: { finalAmount?: number; markPaid?: boolean; shareLiveGps?: boolean }
  ) => Promise<void>;
  onOpenChat: (booking: BookingRecord) => void;
}> = ({ bookings, onUpdateBookingStatus, onOpenChat }) => {
  const [finalBillInputs, setFinalBillInputs] = useState<Record<string, string>>({});

  const nextActionFor = (
    status: BookingStatus
  ): { label: string; next: BookingStatus } | null => {
    switch (status) {
      case 'Accepted':
        return { label: 'Start Travel (On The Way)', next: 'On The Way' };
      case 'On The Way':
        return { label: 'Mark Arrived', next: 'Arrived' };
      case 'Arrived':
        return { label: 'Start Work', next: 'Work Started' };
      case 'Work Started':
        return { label: 'Complete Job & Settle Bill', next: 'Completed' };
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12">
      <h1 className="font-display text-2xl font-extrabold text-[#0B1F3A]">
        Booking Requests &amp; Active Jobs
      </h1>

      {bookings.length === 0 ? (
        <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 text-center text-sm text-slate-600">
          No booking requests yet. Ensure your status is set to Online on the
          Dashboard.
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const nextStep = nextActionFor(b.status);
            const billValue =
              finalBillInputs[b.id] ?? String(b.finalAmount ?? b.totalEstimated);
            return (
              <div
                key={b.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono">{b.id}</span>
                      <span>·</span>
                      <span className="font-semibold text-[#2563EB]">{b.status}</span>
                      {b.isEmergency && (
                        <>
                          <span>·</span>
                          <span className="font-bold text-red-600">EMERGENCY</span>
                        </>
                      )}
                    </div>
                    <h2 className="mt-1 font-display text-lg font-bold text-[#0B1F3A]">
                      {b.issueTitle}
                    </h2>
                    {b.issueDescription && (
                      <p className="text-xs text-slate-600 mt-1">
                        {b.issueDescription}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 mt-2">
                      Customer: <strong>{b.customerName}</strong> ·{' '}
                      <MapPin className="inline w-3 h-3 mr-0.5" />
                      {b.address}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <Clock className="inline w-3 h-3 mr-1" />
                      {b.scheduledDate} · {b.scheduledSlot}
                    </p>
                  </div>

                  <div className="sm:text-right tabular-nums shrink-0">
                    <p className="text-xs text-slate-500">Estimated Total</p>
                    <p className="text-lg font-extrabold text-[#0B1F3A]">
                      {formatInr(b.finalAmount ?? b.totalEstimated)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {b.paymentMethod} · {b.paymentStatus}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                  {b.status === 'Request Sent' && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          void onUpdateBookingStatus(b, 'Accepted', {
                            shareLiveGps: true,
                          })
                        }
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Accept Request
                      </button>
                      <button
                        type="button"
                        onClick={() => void onUpdateBookingStatus(b, 'Rejected')}
                        className="px-4 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {nextStep && (
                    <div className="flex flex-wrap items-center gap-2">
                      {nextStep.next === 'Completed' && (
                        <input
                          type="number"
                          min={0}
                          value={billValue}
                          onChange={(e) =>
                            setFinalBillInputs((prev) => ({
                              ...prev,
                              [b.id]: e.target.value,
                            }))
                          }
                          aria-label="Customer-approved final bill INR"
                          className="w-28 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          void onUpdateBookingStatus(b, nextStep.next, {
                            shareLiveGps: nextStep.next !== 'Completed',
                            finalAmount:
                              nextStep.next === 'Completed'
                                ? Number(billValue) || b.totalEstimated
                                : undefined,
                            markPaid: nextStep.next === 'Completed',
                          })
                        }
                        className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold"
                      >
                        {nextStep.label}
                      </button>
                    </div>
                  )}

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-[#0B1F3A] hover:bg-slate-50 inline-flex items-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5 text-[#2563EB]" />
                    Navigate
                  </a>

                  <button
                    type="button"
                    onClick={() => onOpenChat(b)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-[#0B1F3A] hover:bg-slate-50 inline-flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#2563EB]" />
                    Chat
                  </button>

                  {b.customerPhone && (
                    <a
                      href={`tel:${b.customerPhone}`}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const EarningsDashboardScreen: React.FC<{
  bookings: BookingRecord[];
}> = ({ bookings }) => {
  const completed = bookings.filter((b) => b.status === 'Completed');
  const totalEarned = completed.reduce(
    (s, b) => s + (b.finalAmount ?? b.totalEstimated ?? 0),
    0
  );
  const cashEarned = completed
    .filter((b) => b.paymentMethod === 'Cash')
    .reduce((s, b) => s + (b.finalAmount ?? b.totalEstimated ?? 0), 0);
  const digitalEarned = totalEarned - cashEarned;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12">
      <h1 className="font-display text-2xl font-extrabold text-[#0B1F3A]">
        Earnings &amp; Settlement Ledger
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
        <div className="p-5 rounded-2xl bg-[#0B1F3A] text-white">
          <p className="text-xs text-blue-200">Total Completed Revenue</p>
          <p className="mt-1 font-display text-3xl font-extrabold">
            {formatInr(totalEarned)}
          </p>
          <p className="mt-1 text-xs text-slate-300">
            Across {completed.length} completed jobs
          </p>
        </div>
        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <p className="text-xs text-slate-500">UPI / Online Settlements</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#0B1F3A]">
            {formatInr(digitalEarned)}
          </p>
        </div>
        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <p className="text-xs text-slate-500">Cash Collected</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#0B1F3A]">
            {formatInr(cashEarned)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0B1F3A] inline-flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#2563EB]" />
            Completed Job Invoices
          </h2>
        </div>
        {completed.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No completed jobs yet. Completed bookings will appear here with
            invoice totals.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm tabular-nums">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Invoice</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Service</th>
                  <th className="py-3 px-4 font-semibold">Mode</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completed.map((b) => (
                  <tr key={b.id}>
                    <td className="py-3 px-4 font-mono text-xs">
                      {b.invoiceNumber || b.id}
                    </td>
                    <td className="py-3 px-4">{b.customerName}</td>
                    <td className="py-3 px-4">{b.issueTitle}</td>
                    <td className="py-3 px-4">{b.paymentMethod}</td>
                    <td className="py-3 px-4 text-right font-bold text-[#0B1F3A]">
                      {formatInr(b.finalAmount ?? b.totalEstimated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
