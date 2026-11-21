import React, { useState } from 'react';
import {
  Bell,
  Check,
  LogOut,
  MapPin,
  ShieldCheck,
  Star,
  User,
} from 'lucide-react';
import type {
  AppScreen,
  BookingRecord,
  LocationPoint,
  NotificationItem,
  ReviewRecord,
  UserProfile,
  UserRole,
} from '../types';
import { LocationPickerMap } from './GoogleMapsView';

export const CustomerProfileScreen: React.FC<{
  user: UserProfile | null;
  isAdmin: boolean;
  hasProProfile: boolean;
  location: LocationPoint;
  onSaveProfile: (updates: {
    displayName: string;
    phone: string;
    defaultAddress: string;
    defaultCity: string;
    defaultLat: number;
    defaultLng: number;
  }) => Promise<void>;
  onSwitchRole: (role: UserRole) => void;
  onNavigate: (screen: AppScreen) => void;
  onLogout: () => Promise<void>;
}> = ({
  user,
  isAdmin,
  hasProProfile,
  location,
  onSaveProfile,
  onSwitchRole,
  onNavigate,
  onLogout,
}) => {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phone || '+91');
  const [loc, setLoc] = useState<LocationPoint>({
    lat: user?.defaultLat ?? location.lat,
    lng: user?.defaultLng ?? location.lng,
    address: user?.defaultAddress || location.address,
    city: user?.defaultCity || location.city,
  });
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-[#0B1F3A]">
          Sign in to manage your profile
        </h1>
        <button
          type="button"
          onClick={() => onNavigate('auth')}
          className="px-6 py-3 rounded-xl bg-[#0B1F3A] text-white text-sm font-semibold"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);
    try {
      await onSaveProfile({
        displayName: displayName.trim() || user.displayName,
        phone: phone.trim(),
        defaultAddress: loc.address,
        defaultCity: loc.city,
        defaultLat: loc.lat,
        defaultLng: loc.lng,
      });
      setSavedNotice(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-[#0B1F3A] text-white flex items-center justify-center overflow-hidden">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-7 h-7" />
            )}
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-[#0B1F3A]">
              {user.displayName}
            </h1>
            <p className="text-xs text-slate-500">
              {user.email || user.phone || 'Authenticated Account'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void onLogout()}
          className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-2 self-start"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>

      {/* Mode Switcher */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-[#0B1F3A]">
            Switch Portal Mode
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {hasProProfile
              ? 'Switch between booking services and your Service Professional dashboard.'
              : 'Offer your repair skills on AF FIXING by completing professional registration.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              onSwitchRole('professional');
              onNavigate(hasProProfile ? 'pro-dashboard' : 'pro-register');
            }}
            className="px-4 py-2 rounded-xl bg-[#0B1F3A] text-white text-xs font-semibold"
          >
            {hasProProfile ? 'Open Pro Dashboard' : 'Become a Service Pro'}
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              Admin Panel
            </button>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="p-6 rounded-2xl border border-slate-200 bg-white space-y-5"
      >
        <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
          Personal Details &amp; Saved Address
        </h2>

        {savedNotice && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            Profile and saved service location updated.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mobile Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Default Service Address
          </label>
          <LocationPickerMap location={loc} onLocationChange={setLoc} />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export const RatingsAndReviewsScreen: React.FC<{
  targetBooking: BookingRecord | null;
  reviews: ReviewRecord[];
  onSubmitReview: (payload: {
    booking: BookingRecord;
    rating: number;
    comment: string;
  }) => Promise<void>;
  onBack: () => void;
}> = ({ targetBooking, reviews, onSubmitReview, onBack }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBooking) return;
    setSubmitting(true);
    setErrMsg(null);
    try {
      await onSubmitReview({
        booking: targetBooking,
        rating,
        comment: comment.trim(),
      });
      setSubmitted(true);
      setComment('');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Unable to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12">
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-semibold text-[#2563EB] hover:underline"
      >
        &larr; Back
      </button>

      <h1 className="font-display text-2xl font-extrabold text-[#0B1F3A]">
        Ratings &amp; Verified Reviews
      </h1>

      {targetBooking && !submitted && !targetBooking.hasReview && (
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4"
        >
          <div>
            <h2 className="text-base font-bold text-[#0B1F3A]">
              Rate your {targetBooking.categoryName} service with{' '}
              {targetBooking.professionalName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Booking: {targetBooking.issueTitle}
            </p>
          </div>

          {errMsg && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              {errMsg}
            </div>
          )}

          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setRating(num)}
                aria-label={`Rate ${num} stars`}
                className="p-2 rounded-xl border border-slate-200 hover:border-amber-400"
              >
                <Star
                  className={`w-6 h-6 ${
                    num <= rating
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-slate-300'
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-sm font-bold text-[#0B1F3A] tabular-nums">
              {rating} / 5
            </span>
          </div>

          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with punctuality, pricing transparency, and repair quality..."
            required
            maxLength={800}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-[#0B1F3A] text-white text-sm font-semibold"
          >
            {submitting ? 'Submitting...' : 'Submit Verified Review'}
          </button>
        </form>
      )}

      {submitted && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
          Thank you! Your verified review has been published.
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
          All Verified Completed-Job Reviews
        </h2>
        {reviews.length === 0 ? (
          <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-600">
            No completed-job reviews have been posted yet.
          </div>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#0B1F3A]">
                    {rev.customerName}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">Verified Booking</span>
                </div>
                <span className="inline-flex items-center gap-1 font-bold text-amber-600 tabular-nums">
                  <Star className="w-4 h-4 fill-current" />
                  {rev.rating.toFixed(1)}
                </span>
              </div>
              <p className="text-sm text-slate-700">{rev.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const NotificationsScreen: React.FC<{
  notifications: NotificationItem[];
  onMarkRead: (id: string) => Promise<void>;
  onOpenBookingId: (bookingId: string) => void;
}> = ({ notifications, onMarkRead, onOpenBookingId }) => {
  const [browserPerm, setBrowserPerm] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const requestBrowserNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setBrowserPerm(perm);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#0B1F3A]">
            Notifications
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time booking requests, status changes, and arrival updates.
          </p>
        </div>

        {browserPerm !== 'granted' && browserPerm !== 'unsupported' && (
          <button
            type="button"
            onClick={() => void requestBrowserNotifications()}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#0B1F3A] inline-flex items-center gap-2 self-start"
          >
            <Bell className="w-4 h-4 text-[#2563EB]" />
            Enable Desktop / Push Alerts
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 text-center text-sm text-slate-600">
          You have no notifications yet.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border flex items-start justify-between gap-4 ${
                n.isRead
                  ? 'border-slate-200 bg-white'
                  : 'border-blue-200 bg-blue-50/40'
              }`}
            >
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#0B1F3A]">{n.title}</p>
                <p className="text-xs text-slate-600">{n.body}</p>
                {n.bookingId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.isRead) void onMarkRead(n.id);
                      onOpenBookingId(n.bookingId!);
                    }}
                    className="text-xs font-semibold text-[#2563EB] hover:underline pt-1"
                  >
                    Open Booking &rarr;
                  </button>
                )}
              </div>
              {!n.isRead && (
                <button
                  type="button"
                  onClick={() => void onMarkRead(n.id)}
                  className="p-2 rounded-lg text-slate-500 hover:text-[#2563EB]"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
