import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Ban,
  CheckCircle2,
  Database,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Users,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_OFFERS,
  DEFAULT_PRICING_ITEMS,
} from '../data/catalog';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatInr, generateId } from '../lib/geo';
import type {
  BookingRecord,
  ComplaintRecord,
  OfferItem,
  PricingItem,
  ProfessionalProfile,
  ServiceCategory,
  UserProfile,
} from '../types';

export const AdminDashboardScreen: React.FC<{
  isAdmin: boolean;
  categories: ServiceCategory[];
  pricingItems: PricingItem[];
  offers: OfferItem[];
  professionals: ProfessionalProfile[];
  onBack: () => void;
}> = ({
  isAdmin,
  categories,
  pricingItems,
  offers,
  professionals,
  onBack,
}) => {
  const [tab, setTab] = useState<
    'overview' | 'pros' | 'customers' | 'bookings' | 'pricing' | 'complaints' | 'offers'
  >('overview');
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [allBookings, setAllBookings] = useState<BookingRecord[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // New pricing / offer state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState<{
    minPrice: number;
    maxPrice: number;
    inspectionFee: number;
  }>({ minPrice: 149, maxPrice: 499, inspectionFee: 149 });
  const [newOfferTitle, setNewOfferTitle] = useState('');
  const [newOfferCode, setNewOfferCode] = useState('');
  const [newOfferAmount, setNewOfferAmount] = useState(100);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => setCustomers(snap.docs.map((d) => d.data() as UserProfile)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const unsubBookings = onSnapshot(
      collection(db, 'bookings'),
      (snap) => setAllBookings(snap.docs.map((d) => d.data() as BookingRecord)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookings')
    );

    const unsubComplaints = onSnapshot(
      collection(db, 'complaints'),
      (snap) =>
        setComplaints(snap.docs.map((d) => d.data() as ComplaintRecord)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'complaints')
    );

    return () => {
      unsubUsers();
      unsubBookings();
      unsubComplaints();
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-14 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
        <h1 className="font-display text-2xl font-bold text-[#0B1F3A]">
          Administrator Access Required
        </h1>
        <p className="text-sm text-slate-600">
          This dashboard is restricted to verified AF FIXING administrators.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-[#0B1F3A] text-white text-sm font-semibold"
        >
          Return Home
        </button>
      </div>
    );
  }

  const handleSeedCatalog = async () => {
    setSeeding(true);
    setStatusNotice(null);
    try {
      for (const cat of DEFAULT_CATEGORIES) {
        await setDoc(doc(db, 'serviceCategories', cat.id), {
          ...cat,
          updatedAt: serverTimestamp(),
        });
      }
      for (const p of DEFAULT_PRICING_ITEMS) {
        await setDoc(doc(db, 'pricingItems', p.id), {
          ...p,
          updatedAt: serverTimestamp(),
        });
      }
      for (const o of DEFAULT_OFFERS) {
        await setDoc(doc(db, 'offers', o.id), {
          ...o,
          updatedAt: serverTimestamp(),
        });
      }
      setStatusNotice('Catalog, rate cards, and offers synced to Firestore.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'serviceCategories');
    } finally {
      setSeeding(false);
    }
  };

  const handleVerifyPro = async (
    pro: ProfessionalProfile,
    verificationStatus: 'verified' | 'rejected'
  ) => {
    try {
      await updateDoc(doc(db, 'professionals', pro.uid), {
        verificationStatus,
        isVerified: verificationStatus === 'verified',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `professionals/${pro.uid}`);
    }
  };

  const handleToggleBlockPro = async (pro: ProfessionalProfile) => {
    try {
      await updateDoc(doc(db, 'professionals', pro.uid), {
        isBlocked: !pro.isBlocked,
        isOnline: false,
        availabilityStatus: 'Offline',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `professionals/${pro.uid}`);
    }
  };

  const handleToggleBlockCustomer = async (u: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', u.uid), {
        isBlocked: !u.isBlocked,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${u.uid}`);
    }
  };

  const handleSavePricingItem = async (item: PricingItem) => {
    try {
      await setDoc(doc(db, 'pricingItems', item.id), {
        ...item,
        minPrice: Number(priceDraft.minPrice),
        maxPrice: Math.max(Number(priceDraft.minPrice), Number(priceDraft.maxPrice)),
        inspectionFee: Number(priceDraft.inspectionFee),
        updatedAt: serverTimestamp(),
      });
      setEditingPriceId(null);
      setStatusNotice(`Updated pricing for ${item.title}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `pricingItems/${item.id}`);
    }
  };

  const handleResolveComplaint = async (c: ComplaintRecord) => {
    try {
      await updateDoc(doc(db, 'complaints', c.id), {
        status: 'Resolved',
        adminNote: 'Reviewed and resolved by AF FIXING Operations.',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `complaints/${c.id}`);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newOfferTitle.trim().length < 2 || newOfferCode.trim().length < 2) return;
    const id = generateId('offer');
    try {
      await setDoc(doc(db, 'offers', id), {
        id,
        title: newOfferTitle.trim().slice(0, 120),
        code: newOfferCode.trim().toUpperCase().slice(0, 30),
        discountAmount: Number(newOfferAmount) || 100,
        discountLabel: `Flat ₹${Number(newOfferAmount) || 100} OFF`,
        isActive: true,
        updatedAt: serverTimestamp(),
      });
      setNewOfferTitle('');
      setNewOfferCode('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `offers/${id}`);
    }
  };

  const activeBookings = allBookings.filter(
    (b) => !['Completed', 'Cancelled', 'Rejected'].includes(b.status)
  );
  const completedRevenue = allBookings
    .filter((b) => b.status === 'Completed')
    .reduce((sum, b) => sum + (b.finalAmount ?? b.totalEstimated ?? 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#0B1F3A]">
            AF FIXING Admin Control Panel
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify service professionals, configure INR rate cards, monitor
            bookings, and resolve customer complaints.
          </p>
        </div>

        <button
          type="button"
          disabled={seeding}
          onClick={() => void handleSeedCatalog()}
          className="px-4 py-2.5 rounded-xl bg-[#0B1F3A] text-white text-xs font-semibold inline-flex items-center gap-2 self-start"
        >
          <Database className="w-4 h-4" />
          {seeding ? 'Syncing...' : 'Sync Default Catalog to Firestore'}
        </button>
      </div>

      {statusNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
          {statusNotice}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {(
          [
            ['overview', 'Overview'],
            ['pros', `Professionals (${professionals.length})`],
            ['customers', `Customers (${customers.length})`],
            ['bookings', `Bookings (${allBookings.length})`],
            ['pricing', 'Categories & Pricing'],
            ['complaints', `Complaints (${complaints.length})`],
            ['offers', `Offers (${offers.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              tab === key
                ? 'bg-[#0B1F3A] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
            <div className="p-5 rounded-2xl border border-slate-200 bg-white">
              <p className="text-xs text-slate-500">Registered Customers</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#0B1F3A]">
                {customers.length}
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-slate-200 bg-white">
              <p className="text-xs text-slate-500">Registered Professionals</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#0B1F3A]">
                {professionals.length}
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                {professionals.filter((p) => p.isOnline).length} online now
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-slate-200 bg-white">
              <p className="text-xs text-slate-500">Active Bookings</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#0B1F3A]">
                {activeBookings.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {allBookings.length} total bookings
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-slate-200 bg-white">
              <p className="text-xs text-slate-500">Completed GMV</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#0B1F3A]">
                {formatInr(completedRevenue)}
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === 'pros' && (
        <div className="space-y-3">
          {professionals.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
              No service professionals registered in Firestore yet.
            </div>
          ) : (
            professionals.map((pro) => (
              <div
                key={pro.uid}
                className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#2563EB]" />
                    <span className="font-bold text-sm text-[#0B1F3A]">
                      {pro.fullName}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({pro.verificationStatus})
                    </span>
                    {pro.isBlocked && (
                      <span className="text-xs font-bold text-red-600">
                        BLOCKED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    {pro.categoryName} · {pro.serviceArea} · Inspection:{' '}
                    {formatInr(pro.inspectionCharge)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleVerifyPro(pro, 'verified')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verify
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleVerifyPro(pro, 'rejected')}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 inline-flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleBlockPro(pro)}
                    className="px-3 py-1.5 rounded-xl border border-red-200 text-xs font-semibold text-red-700 inline-flex items-center gap-1"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    {pro.isBlocked ? 'Unblock' : 'Block'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'customers' && (
        <div className="space-y-3">
          {customers.map((u) => (
            <div
              key={u.uid}
              className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-sm font-bold text-[#0B1F3A] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#2563EB]" />
                  {u.displayName}
                  {u.isBlocked && (
                    <span className="text-xs text-red-600 font-bold">BLOCKED</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {u.email || u.phone || u.uid} · Role: {u.role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleToggleBlockCustomer(u)}
                className="px-3 py-1.5 rounded-xl border border-red-200 text-xs font-semibold text-red-700"
              >
                {u.isBlocked ? 'Unblock Account' : 'Block Account'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'bookings' && (
        <div className="space-y-3">
          {allBookings.map((b) => (
            <div
              key={b.id}
              className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div>
                <p className="font-bold text-sm text-[#0B1F3A]">
                  {b.issueTitle} · <span className="text-[#2563EB]">{b.status}</span>
                </p>
                <p className="text-slate-600">
                  Customer: {b.customerName} &rarr; Pro: {b.professionalName} ({b.categoryName})
                </p>
              </div>
              <div className="sm:text-right tabular-nums">
                <p className="font-bold text-sm text-[#0B1F3A]">
                  {formatInr(b.finalAmount ?? b.totalEstimated)}
                </p>
                <p className="text-slate-500">{b.scheduledDate}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'pricing' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Update transparent rate cards across all {categories.length}{' '}
            categories. Changes apply immediately to customer estimates.
          </p>
          <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {pricingItems.map((item) => {
              const editing = editingPriceId === item.id;
              return (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-bold text-[#0B1F3A]">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      Category: {item.categoryId} · Inspection:{' '}
                      {formatInr(item.inspectionFee)} · Range:{' '}
                      {formatInr(item.minPrice)}–{formatInr(item.maxPrice)}
                    </p>
                  </div>

                  {editing ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <input
                        type="number"
                        value={priceDraft.inspectionFee}
                        onChange={(e) =>
                          setPriceDraft((p) => ({
                            ...p,
                            inspectionFee: Number(e.target.value),
                          }))
                        }
                        className="w-20 px-2 py-1.5 rounded-lg border border-slate-300"
                        placeholder="Insp"
                      />
                      <input
                        type="number"
                        value={priceDraft.minPrice}
                        onChange={(e) =>
                          setPriceDraft((p) => ({
                            ...p,
                            minPrice: Number(e.target.value),
                          }))
                        }
                        className="w-20 px-2 py-1.5 rounded-lg border border-slate-300"
                        placeholder="Min"
                      />
                      <input
                        type="number"
                        value={priceDraft.maxPrice}
                        onChange={(e) =>
                          setPriceDraft((p) => ({
                            ...p,
                            maxPrice: Number(e.target.value),
                          }))
                        }
                        className="w-20 px-2 py-1.5 rounded-lg border border-slate-300"
                        placeholder="Max"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSavePricingItem(item)}
                        className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white font-semibold"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPriceId(null)}
                        className="px-2 py-1.5 text-slate-500"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPriceId(item.id);
                        setPriceDraft({
                          inspectionFee: item.inspectionFee,
                          minPrice: item.minPrice,
                          maxPrice: item.maxPrice,
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#0B1F3A] self-start"
                    >
                      Edit Rate
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'complaints' && (
        <div className="space-y-3">
          {complaints.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
              No customer complaints reported.
            </div>
          ) : (
            complaints.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-bold text-[#0B1F3A]">
                    {c.subject} ·{' '}
                    <span className="text-[#2563EB]">{c.status}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {c.description}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    By {c.customerName} · Booking {c.bookingId}
                  </p>
                </div>
                {c.status !== 'Resolved' && (
                  <button
                    type="button"
                    onClick={() => void handleResolveComplaint(c)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 self-start"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Resolved
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'offers' && (
        <div className="space-y-5">
          <form
            onSubmit={handleCreateOffer}
            className="p-4 rounded-2xl border border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-4 gap-3"
          >
            <input
              type="text"
              value={newOfferTitle}
              onChange={(e) => setNewOfferTitle(e.target.value)}
              placeholder="Offer title"
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
              required
            />
            <input
              type="text"
              value={newOfferCode}
              onChange={(e) => setNewOfferCode(e.target.value)}
              placeholder="Promo code (e.g. FIX200)"
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono uppercase"
              required
            />
            <input
              type="number"
              min={10}
              value={newOfferAmount}
              onChange={(e) => setNewOfferAmount(Number(e.target.value))}
              placeholder="Discount INR"
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#0B1F3A] text-white text-xs font-semibold"
            >
              Add Offer
            </button>
          </form>

          <div className="space-y-2">
            {offers.map((o) => (
              <div
                key={o.id}
                className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4 text-[#2563EB]" />
                  <div>
                    <p className="text-sm font-bold text-[#0B1F3A]">
                      {o.title} · <span className="font-mono">{o.code}</span>
                    </p>
                    <p className="text-xs text-slate-500">{o.discountLabel}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-700">
                  {o.isActive ? 'Active' : 'Paused'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
