import React, { useEffect, useRef, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  doc,
} from 'firebase/firestore';
import {
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { estimateArrivalWindow, formatInr, generateId, haversineDistanceKm } from '../lib/geo';
import type { BookingRecord, BookingStatus, ChatMessage, UserProfile } from '../types';
import { LiveTrackingMap } from './GoogleMapsView';

const PROGRESS_STEPS: BookingStatus[] = [
  'Request Sent',
  'Accepted',
  'On The Way',
  'Arrived',
  'Work Started',
  'Completed',
];

export const LiveTrackingScreen: React.FC<{
  booking: BookingRecord;
  onOpenChat: () => void;
  onBack: () => void;
}> = ({ booking, onOpenChat, onBack }) => {
  const [routeInfo, setRouteInfo] = useState<{
    distanceMeters?: number;
    durationSeconds?: number;
  }>({});

  const currentStepIdx = PROGRESS_STEPS.indexOf(booking.status);
  const isCancelledOrRejected =
    booking.status === 'Cancelled' || booking.status === 'Rejected';

  const hasLiveGps =
    booking.isProSharingLocation &&
    typeof booking.proLat === 'number' &&
    typeof booking.proLng === 'number';

  const fallbackDistanceKm = hasLiveGps
    ? haversineDistanceKm(
        booking.lat,
        booking.lng,
        booking.proLat!,
        booking.proLng!
      )
    : null;

  const etaDisplay =
    typeof routeInfo.durationSeconds === 'number'
      ? estimateArrivalWindow(
          (routeInfo.distanceMeters || 1000) / 1000,
          routeInfo.durationSeconds
        )
      : fallbackDistanceKm !== null
      ? estimateArrivalWindow(fallbackDistanceKm)
      : 'Waiting for technician GPS';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-[#2563EB] hover:underline mb-1"
          >
            &larr; Back to Bookings
          </button>
          <h1 className="font-display text-2xl font-extrabold text-[#0B1F3A]">
            Live Booking Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            {booking.invoiceNumber || booking.id} · {booking.categoryName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenChat}
            className="px-4 py-2.5 rounded-xl bg-[#0B1F3A] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4" />
            Chat with Pro
          </button>
          <a
            href={`tel:${booking.customerPhone || '+911800000000'}`}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#0B1F3A] inline-flex items-center gap-1.5"
          >
            <Phone className="w-4 h-4 text-[#2563EB]" />
            Call
          </a>
        </div>
      </div>

      {/* 6-Step Progress Bar */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[#0B1F3A]">
            Current Status: <span className="text-[#2563EB]">{booking.status}</span>
          </span>
          <span className="text-xs text-slate-500 inline-flex items-center gap-1 tabular-nums">
            <Clock className="w-3.5 h-3.5" />
            ETA: {etaDisplay}
          </span>
        </div>

        {isCancelledOrRejected ? (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            This booking is {booking.status.toLowerCase()}.{' '}
            {booking.cancellationReason || ''}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {PROGRESS_STEPS.map((st, idx) => {
              const reached = currentStepIdx >= idx;
              return (
                <div
                  key={st}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                    reached
                      ? 'bg-blue-50 border-blue-200 text-[#0B1F3A]'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      reached ? 'text-[#2563EB]' : 'text-slate-300'
                    }`}
                  />
                  <span className="truncate">{st}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Map Section */}
      <div className="space-y-3">
        {!hasLiveGps && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            Live technician pin and route will appear once{' '}
            <strong>{booking.professionalName}</strong> enables location sharing
            for this job. Showing your pinned service destination below.
          </div>
        )}

        <LiveTrackingMap
          customerLat={booking.lat}
          customerLng={booking.lng}
          proLat={booking.proLat}
          proLng={booking.proLng}
          isProSharingLocation={booking.isProSharingLocation}
          proName={booking.professionalName}
          onRouteInfo={setRouteInfo}
        />
      </div>

      {/* Details Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2">
          <h2 className="text-sm font-bold text-[#0B1F3A]">
            Assigned Professional
          </h2>
          <div className="flex items-center gap-2 text-base font-bold text-[#0B1F3A]">
            <span>{booking.professionalName}</span>
            <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
          </div>
          <p className="text-xs text-slate-600">{booking.categoryName}</p>
          <p className="text-xs text-slate-500 pt-1">
            <MapPin className="inline w-3.5 h-3.5 mr-1 text-[#2563EB]" />
            {booking.address}
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2 tabular-nums">
          <h2 className="text-sm font-bold text-[#0B1F3A]">
            Booking &amp; Charge Summary
          </h2>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Issue</span>
            <span className="font-medium text-slate-900 truncate max-w-[200px]">
              {booking.issueTitle}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Schedule</span>
            <span>
              {booking.scheduledDate} · {booking.scheduledSlot}
            </span>
          </div>
          <div className="flex justify-between text-sm font-bold text-[#0B1F3A] pt-1 border-t border-slate-100">
            <span>{booking.finalAmount ? 'Final Bill' : 'Estimated Total'}</span>
            <span>{formatInr(booking.finalAmount ?? booking.totalEstimated)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BookingChatScreen: React.FC<{
  booking: BookingRecord;
  currentUser: UserProfile;
  onBack: () => void;
}> = ({ booking, currentUser, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const path = `bookings/${booking.id}/messages`;
    const q = query(collection(db, path), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ChatMessage);
        setMessages(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
    return () => unsub();
  }, [booking.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim().slice(0, 1000);
    if (!trimmed) return;
    setSending(true);
    const id = generateId('msg');
    const path = `bookings/${booking.id}/messages`;
    try {
      await setDoc(doc(db, path, id), {
        id,
        bookingId: booking.id,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        senderRole:
          currentUser.uid === booking.professionalId ? 'professional' : 'customer',
        text: trimmed,
        createdAt: serverTimestamp(),
      });
      setDraft('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${path}/${id}`);
    } finally {
      setSending(false);
    }
  };

  const quickReplies = [
    'On my way, reaching soon.',
    'Please share landmark near your gate.',
    'Can you confirm the inspection timing?',
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col h-[calc(100vh-140px)] pb-20 md:pb-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-[#2563EB] hover:underline"
          >
            &larr; Back
          </button>
          <h1 className="font-display text-lg font-bold text-[#0B1F3A]">
            Chat · {booking.issueTitle}
          </h1>
          <p className="text-xs text-slate-500">
            {currentUser.uid === booking.professionalId
              ? `Customer: ${booking.customerName}`
              : `Technician: ${booking.professionalName}`}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-600">
            Start a booking conversation for arrival coordinates, landmarks, or
            repair queries.
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUser.uid;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                    mine
                      ? 'bg-[#0B1F3A] text-white'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  <p className="text-[11px] font-semibold opacity-75 mb-0.5">
                    {m.senderName}
                  </p>
                  <p className="leading-relaxed break-words">{m.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="pt-3 border-t border-slate-200 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {quickReplies.map((qr) => (
            <button
              key={qr}
              type="button"
              onClick={() => void sendMessage(qr)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-700"
            >
              {qr}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(draft);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message..."
            maxLength={1000}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
