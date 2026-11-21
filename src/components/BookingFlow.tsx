import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Star,
  Upload,
} from 'lucide-react';
import { estimateArrivalWindow, formatInr, haversineDistanceKm } from '../lib/geo';
import type {
  BookingRecord,
  LocationPoint,
  PaymentMethod,
  PricingItem,
  ProfessionalProfile,
  ServiceCategory,
  UserProfile,
} from '../types';
import { LocationPickerMap } from './GoogleMapsView';

export const BookingFormScreen: React.FC<{
  user: UserProfile | null;
  categories: ServiceCategory[];
  pricingItems: PricingItem[];
  professionals: ProfessionalProfile[];
  initialCategory: ServiceCategory;
  initialPro: ProfessionalProfile | null;
  initialLocation: LocationPoint;
  initialEmergency: boolean;
  onSubmitBooking: (payload: {
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
  }) => Promise<void>;
  onRequireAuth: () => void;
  onCancel: () => void;
}> = ({
  user,
  categories,
  pricingItems,
  professionals,
  initialCategory,
  initialPro,
  initialLocation,
  initialEmergency,
  onSubmitBooking,
  onRequireAuth,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategory.id);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [mediaPreviews, setMediaPreviews] = useState<
    { name: string; previewUrl: string; type: string }[]
  >([]);
  const [addressLocation, setAddressLocation] = useState<LocationPoint>(initialLocation);
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '+91');
  const [scheduledDate, setScheduledDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [scheduledSlot, setScheduledSlot] = useState(
    initialEmergency ? 'Immediate Priority (Within 30 mins)' : '10:00 AM – 12:00 PM'
  );
  const [isEmergency, setIsEmergency] = useState(initialEmergency);
  const [selectedProId, setSelectedProId] = useState<string>(initialPro?.uid || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [razorpayConfigured, setRazorpayConfigured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/payments/config')
      .then((r) => r.json())
      .then((data: { razorpayConfigured?: boolean }) => {
        setRazorpayConfigured(Boolean(data.razorpayConfigured));
      })
      .catch(() => setRazorpayConfigured(false));
  }, []);

  const selectedCategory =
    categories.find((c) => c.id === selectedCategoryId) || initialCategory;

  const eligiblePros = useMemo(() => {
    return professionals
      .filter(
        (p) =>
          !p.isBlocked &&
          !p.isDemo &&
          p.isOnline &&
          p.categoryId === selectedCategory.id
      )
      .sort((a, b) => {
        if (a.availabilityStatus === 'Available Now' && b.availabilityStatus !== 'Available Now') {
          return -1;
        }
        return 0;
      });
  }, [professionals, selectedCategory.id]);

  const selectedPro =
    eligiblePros.find((p) => p.uid === selectedProId) ||
    (initialPro && !initialPro.isDemo && initialPro.categoryId === selectedCategory.id
      ? initialPro
      : eligiblePros[0] || null);

  const categoryRates = pricingItems.filter(
    (p) => p.categoryId === selectedCategory.id && p.isActive
  );

  const inspectionFee =
    selectedPro?.inspectionCharge ?? selectedCategory.baseInspectionFee;
  const estimatedLabour = categoryRates[0]?.minPrice ?? selectedCategory.minEstimate;
  const estimatedMaterial = 0;
  const totalEstimated = Math.max(inspectionFee, estimatedLabour + estimatedMaterial);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4);
    const mapped = files.map((file) => ({
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      type: file.type,
    }));
    setMediaPreviews((prev) => [...prev, ...mapped].slice(0, 4));
  };

  const handleConfirm = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!selectedPro) {
      setErrorMsg(
        'Please select a real online service professional. No live professionals are currently online for this category.'
      );
      return;
    }
    if (issueTitle.trim().length < 2) {
      setErrorMsg('Please enter a brief title describing the repair issue.');
      setStep(1);
      return;
    }
    if (addressLocation.address.trim().length < 3) {
      setErrorMsg('Please confirm your service address.');
      setStep(2);
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmitBooking({
        category: selectedCategory,
        pro: selectedPro,
        issueTitle: issueTitle.trim(),
        issueDescription: issueDescription.trim(),
        issueMediaNames: mediaPreviews.map((m) => m.name),
        location: addressLocation,
        customerPhone: customerPhone.trim(),
        scheduledDate,
        scheduledSlot,
        isEmergency,
        inspectionFee,
        estimatedLabour,
        estimatedMaterial,
        totalEstimated,
        paymentMethod,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to submit booking.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12">
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-[#2563EB] hover:underline mb-1"
          >
            &larr; Cancel Booking
          </button>
          <h1 className="font-display text-2xl font-extrabold text-[#0B1F3A]">
            Book {selectedCategory.name}
          </h1>
        </div>
        <span className="text-xs font-semibold text-slate-500 tabular-nums">
          Step {step} of 4
        </span>
      </div>

      {/* Stepper Indicator */}
      <div className="grid grid-cols-4 gap-2">
        {['1. Issue Details', '2. Address & Time', '3. Select Pro', '4. Review & Pay'].map(
          (label, idx) => {
            const s = (idx + 1) as 1 | 2 | 3 | 4;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStep(s)}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-colors truncate ${
                  step === s
                    ? 'bg-[#0B1F3A] text-white border-[#0B1F3A]'
                    : step > s
                    ? 'bg-blue-50 text-[#2563EB] border-blue-200'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                {label}
              </button>
            );
          }
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          {errorMsg}
        </div>
      )}

      {step === 1 && (
        <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Service Category
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
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
              What needs fixing? *
            </label>
            <input
              type="text"
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              placeholder="e.g., Split AC not cooling / water dripping indoors"
              maxLength={160}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Additional Problem Details
            </label>
            <textarea
              rows={3}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="Mention brand, model, noise, or error codes if visible..."
              maxLength={1000}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Upload Issue Photos or Short Video (Optional, up to 4 files)
            </label>
            <label className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-medium text-slate-700">
              <Upload className="w-4 h-4 text-[#2563EB]" />
              <span>Attach photos or videos of the issue</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {mediaPreviews.length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {mediaPreviews.map((m, idx) => (
                  <div
                    key={`${m.name}-${idx}`}
                    className="p-2 rounded-xl border border-slate-200 bg-white text-xs"
                  >
                    {m.type.startsWith('image/') ? (
                      <img
                        src={m.previewUrl}
                        alt={m.name}
                        className="w-full h-20 object-cover rounded-lg mb-1"
                      />
                    ) : (
                      <div className="w-full h-20 rounded-lg bg-slate-100 flex items-center justify-center mb-1">
                        <ImageIcon className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <p className="truncate text-[11px] text-slate-600">{m.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-xl bg-[#0B1F3A] text-white text-sm font-semibold"
            >
              Next: Address &amp; Schedule
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-5">
          <div>
            <h2 className="text-base font-bold text-[#0B1F3A] mb-2">
              Confirm Service Address &amp; Map Pin
            </h2>
            <LocationPickerMap
              location={addressLocation}
              onLocationChange={setAddressLocation}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Contact Phone
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Preferred Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Time Slot
              </label>
              <select
                value={scheduledSlot}
                onChange={(e) => setScheduledSlot(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="Immediate Priority (Within 30 mins)">
                  Immediate Priority (Within 30 mins)
                </option>
                <option value="09:00 AM – 11:00 AM">09:00 AM – 11:00 AM</option>
                <option value="10:00 AM – 12:00 PM">10:00 AM – 12:00 PM</option>
                <option value="02:00 PM – 04:00 PM">02:00 PM – 04:00 PM</option>
                <option value="05:00 PM – 07:00 PM">05:00 PM – 07:00 PM</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
              className="rounded border-slate-300 text-[#2563EB]"
            />
            <span>Mark as Urgent / Emergency Service Request</span>
          </label>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-5 py-2.5 rounded-xl bg-[#0B1F3A] text-white text-sm font-semibold"
            >
              Next: Choose Professional
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-5">
          <div>
            <h2 className="text-base font-bold text-[#0B1F3A]">
              Select Available {selectedCategory.name} Professional
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Only real registered professionals currently online in Firestore can receive live bookings.
            </p>
          </div>

          {eligiblePros.length === 0 ? (
            <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <p className="text-sm font-bold text-amber-900">
                No online {selectedCategory.name} professionals in Firestore right now
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                To complete a real live booking, switch to the Service Professional Portal to register &amp; toggle GO ONLINE, or try another category with an online technician.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {eligiblePros.map((pro) => {
                const dist =
                  typeof pro.lat === 'number' && typeof pro.lng === 'number'
                    ? haversineDistanceKm(
                        addressLocation.lat,
                        addressLocation.lng,
                        pro.lat,
                        pro.lng
                      )
                    : 2.5;
                const active = selectedPro?.uid === pro.uid;
                return (
                  <button
                    key={pro.uid}
                    type="button"
                    onClick={() => setSelectedProId(pro.uid)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      active
                        ? 'border-[#2563EB] bg-blue-50/40 ring-1 ring-[#2563EB]'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0B1F3A]">
                          {pro.fullName}
                        </span>
                        {pro.isVerified && (
                          <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 tabular-nums">
                        {pro.availabilityStatus} · {dist} km away · Est.{' '}
                        {estimateArrivalWindow(dist)}
                      </p>
                    </div>
                    <div className="text-right tabular-nums">
                      <p className="text-sm font-bold text-[#0B1F3A]">
                        {formatInr(pro.inspectionCharge)}
                      </p>
                      <p className="text-[11px] text-slate-500">Inspection fee</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-5 py-2.5 rounded-xl bg-[#0B1F3A] text-white text-sm font-semibold"
            >
              Next: Review Charges
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-6">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-[#0B1F3A]">
              Transparent Charge Estimate
            </h2>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-sm tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-600">Inspection / Visit Charge</span>
                <span className="font-semibold text-[#0B1F3A]">
                  {formatInr(inspectionFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Estimated Labour Charges</span>
                <span className="font-semibold text-[#0B1F3A]">
                  {formatInr(estimatedLabour)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Additional Material Charges</span>
                <span className="text-slate-500">
                  Quoted only with customer approval
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-extrabold text-[#0B1F3A]">
                <span>Total Estimated Amount</span>
                <span>{formatInr(totalEstimated)}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Final charges may change after professional inspection and customer
              approval. Professionals are prohibited from adding undisclosed
              charges.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-[#0B1F3A]">Payment Method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['Cash', 'UPI', 'Online'] as PaymentMethod[]).map((method) => {
                const disabled = method === 'Online' && !razorpayConfigured;
                return (
                  <button
                    key={method}
                    type="button"
                    disabled={disabled}
                    onClick={() => setPaymentMethod(method)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      paymentMethod === method
                        ? 'border-[#2563EB] bg-blue-50/50 ring-1 ring-[#2563EB]'
                        : 'border-slate-200 bg-white'
                    } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <p className="text-sm font-bold text-[#0B1F3A]">
                      {method === 'Cash'
                        ? 'Cash after Service'
                        : method === 'UPI'
                        ? 'UPI on Completion'
                        : 'Online (Razorpay)'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {method === 'Online' && !razorpayConfigured
                        ? 'Configure RAZORPAY_KEY_ID & SECRET in env to enable'
                        : method === 'UPI'
                        ? 'Pay via GPay / PhonePe / Paytm after work'
                        : 'Pay directly after job completion'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
            >
              Back
            </button>
            <button
              type="button"
              disabled={submitting || !selectedPro}
              onClick={() => void handleConfirm()}
              className="px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? 'Submitting Request...' : 'Confirm Booking Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const BookingConfirmationScreen: React.FC<{
  booking: BookingRecord;
  onTrackBooking: () => void;
  onOpenChat: () => void;
  onViewAllBookings: () => void;
}> = ({ booking, onTrackBooking, onOpenChat, onViewAllBookings }) => {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6 pb-24 md:pb-12">
      <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div>
          <p className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider">
            Booking Request Sent
          </p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-[#0B1F3A]">
            {booking.issueTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Reference <span className="font-mono font-semibold">{booking.id}</span> has been sent to{' '}
            <span className="font-semibold text-[#0B1F3A]">{booking.professionalName}</span>.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-sm tabular-nums">
          <div className="flex justify-between">
            <span className="text-slate-500">Service</span>
            <span className="font-semibold text-[#0B1F3A]">{booking.categoryName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Schedule</span>
            <span className="font-medium text-slate-900">
              {booking.scheduledDate} · {booking.scheduledSlot}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Estimated Total</span>
            <span className="font-bold text-[#0B1F3A]">
              {formatInr(booking.totalEstimated)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Payment</span>
            <span className="font-medium text-slate-900">
              {booking.paymentMethod} ({booking.paymentStatus})
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={onTrackBooking}
            className="flex-1 py-3 px-4 rounded-xl bg-[#0B1F3A] hover:bg-[#122C4F] text-white text-sm font-semibold whitespace-nowrap"
          >
            Track Live Status
          </button>
          <button
            type="button"
            onClick={onOpenChat}
            className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-[#0B1F3A] inline-flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-[#2563EB]" />
            Chat
          </button>
          <button
            type="button"
            onClick={onViewAllBookings}
            className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-700"
          >
            My Bookings
          </button>
        </div>
      </div>
    </div>
  );
};

export const MyBookingsScreen: React.FC<{
  bookings: BookingRecord[];
  onTrackBooking: (b: BookingRecord) => void;
  onOpenChat: (b: BookingRecord) => void;
  onCancelBooking: (b: BookingRecord, reason: string) => Promise<void>;
  onRescheduleBooking: (b: BookingRecord, date: string, slot: string) => Promise<void>;
  onRateBooking: (b: BookingRecord) => void;
  onReportIssue: (b: BookingRecord, subject: string, description: string) => Promise<void>;
  onExploreServices: () => void;
}> = ({
  bookings,
  onTrackBooking,
  onOpenChat,
  onCancelBooking,
  onRescheduleBooking,
  onRateBooking,
  onReportIssue,
  onExploreServices,
}) => {
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const [invoiceBooking, setInvoiceBooking] = useState<BookingRecord | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<BookingRecord | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState('10:00 AM – 12:00 PM');
  const [complaintTarget, setComplaintTarget] = useState<BookingRecord | null>(null);
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintBody, setComplaintBody] = useState('');

  const filtered = bookings.filter((b) => {
    const terminal =
      b.status === 'Completed' || b.status === 'Cancelled' || b.status === 'Rejected';
    return tab === 'active' ? !terminal : terminal;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-extrabold text-[#0B1F3A]">
          My Bookings
        </h1>
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setTab('active')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${
              tab === 'active' ? 'bg-white text-[#0B1F3A] shadow-sm' : 'text-slate-600'
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setTab('past')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${
              tab === 'past' ? 'bg-white text-[#0B1F3A] shadow-sm' : 'text-slate-600'
            }`}
          >
            Completed &amp; Past
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 text-center space-y-3">
          <p className="text-base font-bold text-[#0B1F3A]">
            No {tab === 'active' ? 'active' : 'past'} bookings yet
          </p>
          <p className="text-sm text-slate-600">
            Browse verified home repair services and book a nearby technician.
          </p>
          <button
            type="button"
            onClick={onExploreServices}
            className="px-5 py-2.5 rounded-xl bg-[#0B1F3A] text-white text-xs font-semibold"
          >
            Browse Services
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const isTerminal =
              b.status === 'Completed' || b.status === 'Cancelled' || b.status === 'Rejected';
            return (
              <div
                key={b.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono">{b.invoiceNumber || b.id}</span>
                      <span>·</span>
                      <span>{b.categoryName}</span>
                      <span>·</span>
                      <span className="font-semibold text-[#2563EB]">{b.status}</span>
                    </div>
                    <h2 className="mt-1 font-display text-lg font-bold text-[#0B1F3A]">
                      {b.issueTitle}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      Technician: <span className="font-semibold">{b.professionalName}</span> ·{' '}
                      <MapPin className="inline w-3 h-3 mr-0.5" />
                      {b.address}
                    </p>
                  </div>
                  <div className="sm:text-right tabular-nums shrink-0">
                    <p className="text-xs text-slate-500">
                      {b.finalAmount ? 'Final Bill' : 'Estimated'}
                    </p>
                    <p className="text-lg font-extrabold text-[#0B1F3A]">
                      {formatInr(b.finalAmount ?? b.totalEstimated)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {b.paymentMethod} · {b.paymentStatus}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onTrackBooking(b)}
                    className="px-3.5 py-2 rounded-xl bg-[#0B1F3A] text-white text-xs font-semibold"
                  >
                    Live Tracking
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenChat(b)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-[#0B1F3A] hover:bg-slate-50 inline-flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#2563EB]" />
                    Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceBooking(b)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Invoice
                  </button>

                  {!isTerminal && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRescheduleTarget(b);
                          setNewDate(b.scheduledDate);
                          setNewSlot(b.scheduledSlot);
                        }}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Reschedule
                      </button>
                      <button
                        type="button"
                        onClick={() => void onCancelBooking(b, 'Cancelled by customer')}
                        className="px-3.5 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {b.status === 'Completed' && !b.hasReview && (
                    <button
                      type="button"
                      onClick={() => onRateBooking(b)}
                      className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Star className="w-3.5 h-3.5" />
                      Rate &amp; Review
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setComplaintTarget(b)}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-red-700 inline-flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Report Issue
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs font-bold text-[#2563EB]">AF FIXING INVOICE</p>
                <p className="font-mono text-sm font-bold text-[#0B1F3A]">
                  {invoiceBooking.invoiceNumber || invoiceBooking.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInvoiceBooking(null)}
                className="text-xs font-semibold text-slate-500"
              >
                Close
              </button>
            </div>
            <div className="space-y-2 text-sm tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-500">Service</span>
                <span className="font-medium">{invoiceBooking.categoryName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Technician</span>
                <span className="font-medium">{invoiceBooking.professionalName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Inspection Charge</span>
                <span>{formatInr(invoiceBooking.inspectionFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Labour Estimate</span>
                <span>{formatInr(invoiceBooking.estimatedLabour ?? 0)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-[#0B1F3A]">
                <span>{invoiceBooking.finalAmount ? 'Final Approved Total' : 'Estimated Total'}</span>
                <span>{formatInr(invoiceBooking.finalAmount ?? invoiceBooking.totalEstimated)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Payment Mode</span>
                <span>{invoiceBooking.paymentMethod} ({invoiceBooking.paymentStatus})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-[#0B1F3A]">
              Reschedule Booking
            </h3>
            <div className="space-y-3">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
              <select
                value={newSlot}
                onChange={(e) => setNewSlot(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="09:00 AM – 11:00 AM">09:00 AM – 11:00 AM</option>
                <option value="10:00 AM – 12:00 PM">10:00 AM – 12:00 PM</option>
                <option value="02:00 PM – 04:00 PM">02:00 PM – 04:00 PM</option>
                <option value="05:00 PM – 07:00 PM">05:00 PM – 07:00 PM</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onRescheduleBooking(rescheduleTarget, newDate, newSlot);
                  setRescheduleTarget(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#0B1F3A] text-white text-xs font-semibold"
              >
                Save New Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Issue / Complaint Modal */}
      {complaintTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-[#0B1F3A]">
              Report an Issue
            </h3>
            <input
              type="text"
              value={complaintSubject}
              onChange={(e) => setComplaintSubject(e.target.value)}
              placeholder="Subject (e.g., Overcharge / Late arrival)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
            <textarea
              rows={3}
              value={complaintBody}
              onChange={(e) => setComplaintBody(e.target.value)}
              placeholder="Describe what happened..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setComplaintTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (complaintSubject.trim().length < 2 || complaintBody.trim().length < 5) return;
                  await onReportIssue(
                    complaintTarget,
                    complaintSubject.trim(),
                    complaintBody.trim()
                  );
                  setComplaintTarget(null);
                  setComplaintSubject('');
                  setComplaintBody('');
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
