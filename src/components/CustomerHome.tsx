import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  ChevronRight,
  Clock,
  Info,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Tag,
  Wrench,
} from 'lucide-react';
import { INDIAN_CITIES, MEDIA_ASSETS } from '../data/catalog';
import { estimateArrivalWindow, formatInr, haversineDistanceKm } from '../lib/geo';
import type {
  AppScreen,
  BookingRecord,
  LocationPoint,
  OfferItem,
  PricingItem,
  ProfessionalProfile,
  ServiceCategory,
} from '../types';
import { PlacesLocationSearch } from './GoogleMapsView';
import { ServiceIcon } from './ServiceIcon';

export const CustomerHome: React.FC<{
  location: LocationPoint;
  categories: ServiceCategory[];
  pricingItems: PricingItem[];
  offers: OfferItem[];
  liveProfessionals: ProfessionalProfile[];
  recentBookings: BookingRecord[];
  demoMode: boolean;
  onToggleDemoMode: (enabled: boolean) => void;
  onChangeLocation: (loc: LocationPoint) => void;
  onSelectCategory: (cat: ServiceCategory) => void;
  onSelectPro: (pro: ProfessionalProfile) => void;
  onBookCategory: (cat: ServiceCategory, isEmergency?: boolean) => void;
  onOpenBookingTracking: (booking: BookingRecord) => void;
  onNavigate: (screen: AppScreen) => void;
}> = ({
  location,
  categories,
  offers,
  liveProfessionals,
  recentBookings,
  demoMode,
  onToggleDemoMode,
  onChangeLocation,
  onSelectCategory,
  onSelectPro,
  onBookCategory,
  onOpenBookingTracking,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  const nearbyAvailable = useMemo(() => {
    return liveProfessionals
      .filter((p) => p.isOnline && p.isSharingLocation && typeof p.lat === 'number' && typeof p.lng === 'number')
      .map((p) => ({
        pro: p,
        distanceKm: haversineDistanceKm(location.lat, location.lng, p.lat!, p.lng!),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 4);
  }, [liveProfessionals, location.lat, location.lng]);

  const popularCategories = categories.slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-10 pb-24 md:pb-12">
      {/* Top Location & Search Strip */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <button
              type="button"
              onClick={() => setLocationPickerOpen((v) => !v)}
              className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#2563EB] text-left transition-colors"
            >
              <MapPin className="w-4 h-4 text-[#2563EB] shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500">
                  Service Location
                </p>
                <p className="text-sm font-semibold text-[#0B1F3A] truncate max-w-[260px] sm:max-w-xs">
                  {location.city} · {location.address}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What service do you need today?"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Clearly labelled Demo Mode Toggle */}
            <button
              type="button"
              onClick={() => onToggleDemoMode(!demoMode)}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-colors ${
                demoMode
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {demoMode ? 'Demo Mode: ON (Sample Pros)' : 'Preview Demo Mode'}
            </button>
          </div>
        </div>

        {locationPickerOpen && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#0B1F3A]">
                Select City or Search Address
              </h3>
              <button
                type="button"
                onClick={() => setLocationPickerOpen(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>
            <PlacesLocationSearch
              value={location.address}
              onSelectLocation={(loc) => {
                onChangeLocation(loc);
                setLocationPickerOpen(false);
              }}
            />
            <div className="flex flex-wrap gap-2">
              {INDIAN_CITIES.map((city) => (
                <button
                  key={city.city}
                  type="button"
                  onClick={() => {
                    onChangeLocation(city);
                    setLocationPickerOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    location.city === city.city
                      ? 'bg-[#0B1F3A] text-white border-[#0B1F3A]'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {city.city}
                </button>
              ))}
            </div>
          </div>
        )}

        {demoMode && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
            <div>
              <span className="font-semibold">Demo Mode Active:</span> Sample
              illustrative professionals are shown for preview only. They are
              not live database providers. Toggle Demo Mode off anytime to view
              only real registered professionals.
            </div>
          </div>
        )}
      </section>

      {/* Hero Split Banner */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 rounded-2xl bg-[#0B1F3A] text-white p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-300 tracking-wide">
              AF FIXING · Find. Book. Fix.
            </p>
            <h1 className="mt-3 font-display text-2xl sm:text-4xl font-extrabold leading-tight text-balance">
              Verified home repair pros at your doorstep with live tracking.
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              Check real-time availability within 1–10 km, compare transparent
              inspection &amp; labour estimates in INR, and track your
              technician on Google Maps.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('nearby-map')}
              className="px-5 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-500 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <MapPin className="w-4 h-4" />
              Open Live Nearby Map
            </button>
            <button
              type="button"
              onClick={() => onNavigate('categories')}
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Explore All 12 Services
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 min-h-[240px]">
          <img
            src={MEDIA_ASSETS.hero}
            alt="AF FIXING verified technician inspecting a split air conditioner"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* 12 Service Categories Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0B1F3A]">
              Home Service Categories
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Select a service to view transparent rate cards and nearby technicians.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('categories')}
            className="text-sm font-semibold text-[#2563EB] hover:text-blue-700 inline-flex items-center gap-1 whitespace-nowrap"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 text-center">
            <p className="text-sm font-medium text-slate-700">
              No services match &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs font-semibold text-[#2563EB]"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className="group text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#2563EB] hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-3 group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                    <ServiceIcon iconName={cat.iconName} className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-[#0B1F3A] leading-snug">
                    {cat.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                    {cat.description}
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">From</span>
                  <span className="font-semibold text-[#0B1F3A] tabular-nums">
                    {formatInr(cat.minEstimate)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Available Professionals Nearby (Real Database or Explicit Demo) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0B1F3A]">
              {demoMode
                ? 'Sample Professionals (Demo Preview)'
                : 'Available Professionals Nearby'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {demoMode
                ? 'Illustrative demo records — switch off Demo Mode for live database results.'
                : 'Live online technicians sharing their real availability around ' +
                  location.city +
                  '.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('nearby-map')}
            className="text-sm font-semibold text-[#2563EB] hover:text-blue-700 inline-flex items-center gap-1 whitespace-nowrap"
          >
            Map View
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {nearbyAvailable.length === 0 ? (
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#0B1F3A]">
                No verified professionals are currently online near {location.city}
              </h3>
              <p className="text-sm text-slate-600 max-w-xl">
                AF FIXING only displays real service professionals who have
                registered and toggled Go Online. You can register as a
                professional to test live dispatch or preview Sample Demo Mode.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onToggleDemoMode(true)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 whitespace-nowrap"
              >
                Preview Demo Mode
              </button>
              <button
                type="button"
                onClick={() => onNavigate('pro-register')}
                className="px-4 py-2.5 rounded-xl bg-[#0B1F3A] hover:bg-[#122C4F] text-white text-xs font-semibold whitespace-nowrap"
              >
                Register as Pro
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {nearbyAvailable.map(({ pro, distanceKm }) => (
              <div
                key={pro.uid}
                className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                      {pro.photoURL ? (
                        <img
                          src={pro.photoURL}
                          alt={pro.fullName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                          <Wrench className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <h3 className="text-sm font-bold text-[#0B1F3A] truncate">
                          {pro.fullName}
                        </h3>
                        {pro.isVerified && (
                          <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {pro.categoryName}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 tabular-nums">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#0B1F3A]">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          {pro.ratingAvg && pro.ratingAvg > 0
                            ? pro.ratingAvg.toFixed(1)
                            : 'New'}
                        </span>
                        <span>·</span>
                        <span>{distanceKm} km away</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Status</span>
                      <span
                        className={`font-semibold ${
                          pro.availabilityStatus === 'Available Now'
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {pro.availabilityStatus}
                      </span>
                    </div>
                    <div className="flex justify-between tabular-nums">
                      <span>Est. arrival</span>
                      <span className="font-medium text-slate-900">
                        {estimateArrivalWindow(distanceKm)}
                      </span>
                    </div>
                    <div className="flex justify-between tabular-nums">
                      <span>Inspection</span>
                      <span className="font-semibold text-[#0B1F3A]">
                        {formatInr(pro.inspectionCharge)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPro(pro)}
                  className="mt-4 w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-[#2563EB] text-white text-xs font-semibold transition-colors"
                >
                  View Profile &amp; Book
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Popular Services + Emergency Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Emergency Service Banner */}
        <div className="lg:col-span-5 rounded-2xl border border-red-200 bg-red-50 p-6 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-red-700">
              <AlertCircle className="w-4 h-4" />
              Priority Dispatch · Urgent Home Repairs
            </div>
            <h2 className="mt-2 font-display text-xl font-bold text-slate-900">
              Emergency Repair Needed?
            </h2>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed">
              Short-circuit, burst water pipe, or AC breakdown? Request an
              Available Now technician for priority dispatch.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {categories
              .filter((c) => c.isEmergencyEligible)
              .slice(0, 3)
              .map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onBookCategory(cat, true)}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  Urgent {cat.name.split(' ')[0]}
                </button>
              ))}
          </div>
        </div>

        {/* Popular Services + Offers */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
              Popular Services &amp; Active Offers
            </h2>
            <span className="text-xs text-slate-500">Transparent INR Rates</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {popularCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-[#2563EB] flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-[#0B1F3A] flex items-center justify-center shrink-0">
                    <ServiceIcon iconName={cat.iconName} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0B1F3A] truncate">
                      {cat.name}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {formatInr(cat.minEstimate)} – {formatInr(cat.maxEstimate)}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>

          {offers.length > 0 && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {offers
                .filter((o) => o.isActive)
                .slice(0, 2)
                .map((offer) => (
                  <div
                    key={offer.id}
                    className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5"
                  >
                    <Tag className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0B1F3A]">
                        {offer.title} · <span className="font-mono">{offer.code}</span>
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {offer.discountLabel}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* Recently Booked Services (Real User Bookings) */}
      {recentBookings.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[#0B1F3A]">
              Recently Booked Services
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('my-bookings')}
              className="text-sm font-semibold text-[#2563EB] hover:text-blue-700"
            >
              All Bookings
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentBookings.slice(0, 3).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onOpenBookingTracking(b)}
                className="text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#2563EB] transition-colors space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{b.categoryName}</span>
                  <span className="font-semibold text-[#2563EB]">{b.status}</span>
                </div>
                <p className="text-sm font-bold text-[#0B1F3A] truncate">
                  {b.issueTitle}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-600 tabular-nums pt-1">
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="w-3.5 h-3.5" />
                    {b.scheduledDate}
                  </span>
                  <span className="font-semibold text-[#0B1F3A]">
                    {formatInr(b.finalAmount ?? b.totalEstimated)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export const ServiceCategoriesScreen: React.FC<{
  categories: ServiceCategory[];
  onSelectCategory: (cat: ServiceCategory) => void;
  onBack: () => void;
}> = ({ categories, onSelectCategory, onBack }) => {
  const [query, setQuery] = useState('');
  const [onlyEmergency, setOnlyEmergency] = useState(false);

  const list = categories.filter((c) => {
    const matchesQ =
      !query.trim() ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.description.toLowerCase().includes(query.toLowerCase());
    const matchesEmergency = !onlyEmergency || Boolean(c.isEmergencyEligible);
    return matchesQ && matchesEmergency;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-[#2563EB] hover:underline mb-1"
          >
            &larr; Back to Home
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B1F3A]">
            All Home Service Categories
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter services..."
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
          />
          <button
            type="button"
            onClick={() => setOnlyEmergency((v) => !v)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors ${
              onlyEmergency
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            Emergency Eligible
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat)}
            className="text-left p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#2563EB] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                  <ServiceIcon iconName={cat.iconName} className="w-5 h-5" />
                </div>
                {cat.isEmergencyEligible && (
                  <span className="text-[11px] font-semibold text-red-700">
                    Emergency Priority
                  </span>
                )}
              </div>
              <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
                {cat.name}
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                {cat.description}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs tabular-nums">
              <span className="text-slate-500">
                Inspection: {formatInr(cat.baseInspectionFee)}
              </span>
              <span className="font-semibold text-[#0B1F3A]">
                Est. {formatInr(cat.minEstimate)} – {formatInr(cat.maxEstimate)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export const ServiceDetailsScreen: React.FC<{
  category: ServiceCategory;
  pricingItems: PricingItem[];
  onFindNearbyPros: (cat: ServiceCategory) => void;
  onBookNow: (cat: ServiceCategory, isEmergency?: boolean) => void;
  onBack: () => void;
}> = ({ category, pricingItems, onFindNearbyPros, onBookNow, onBack }) => {
  const items = pricingItems.filter(
    (p) => p.categoryId === category.id && p.isActive
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 pb-24 md:pb-12">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-[#2563EB] hover:underline mb-2"
        >
          &larr; All Categories
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          <div className="md:col-span-7 p-6 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-4">
                <ServiceIcon iconName={category.iconName} className="w-6 h-5" />
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B1F3A]">
                {category.name}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
                {category.description}
              </p>

              <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                  Verified Technicians
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#2563EB]" />
                  Same-day &amp; Urgent Slots
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onBookNow(category, false)}
                className="px-5 py-3 rounded-xl bg-[#0B1F3A] hover:bg-[#122C4F] text-white text-sm font-semibold transition-colors"
              >
                Book {category.name}
              </button>
              <button
                type="button"
                onClick={() => onFindNearbyPros(category)}
                className="px-5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#0B1F3A] text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <MapPin className="w-4 h-4 text-[#2563EB]" />
                See Nearby Pros on Map
              </button>
            </div>
          </div>

          <div className="md:col-span-5 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 min-h-[220px]">
            <img
              src={
                category.id === 'ac-repair'
                  ? MEDIA_ASSETS.acRepair
                  : MEDIA_ASSETS.tools
              }
              alt={category.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Transparent Estimated Pricing Rate Card */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0B1F3A]">
            Transparent Rate Card &amp; Estimated Charges
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Inspection fee is waived or adjusted into labour if you proceed with
            the repair. Final charges may change after professional inspection
            and customer approval — undisclosed charges are strictly prohibited.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-2">
            <p className="text-sm font-semibold text-[#0B1F3A]">
              Standard Inspection &amp; Estimate
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-sm tabular-nums">
              <div>
                <p className="text-xs text-slate-500">Inspection Charge</p>
                <p className="font-bold text-[#0B1F3A]">
                  {formatInr(category.baseInspectionFee)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Estimated Labour Range</p>
                <p className="font-bold text-[#0B1F3A]">
                  {formatInr(category.minEstimate)} – {formatInr(category.maxEstimate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Material / Spare Parts</p>
                <p className="font-medium text-slate-700">
                  Quoted transparently before fitting
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#0B1F3A]">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-slate-600">{item.description}</p>
                  )}
                  {item.materialNote && (
                    <p className="text-xs text-slate-500">{item.materialNote}</p>
                  )}
                </div>
                <div className="sm:text-right shrink-0 tabular-nums">
                  <p className="text-base font-bold text-[#0B1F3A]">
                    {item.priceType === 'inspection_based'
                      ? `${formatInr(item.minPrice)}+ (Est. after inspection)`
                      : `${formatInr(item.minPrice)} – ${formatInr(item.maxPrice)}`}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Inspection: {formatInr(item.inspectionFee)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
