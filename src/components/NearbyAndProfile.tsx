import React, { useMemo, useState } from 'react';
import {
  Clock,
  Info,
  List,
  Map as MapIcon,
  MapPin,
  ShieldCheck,
  Star,
  Wrench,
  X,
} from 'lucide-react';
import { INDIAN_CITIES } from '../data/catalog';
import { estimateArrivalWindow, formatInr, haversineDistanceKm } from '../lib/geo';
import type {
  LocationPoint,
  ProfessionalProfile,
  ReviewRecord,
  ServiceCategory,
} from '../types';
import { NearbyProsMap, PlacesLocationSearch } from './GoogleMapsView';

const RADIUS_OPTIONS = [1, 3, 5, 10];

export const NearbyProfessionalsScreen: React.FC<{
  initialView: 'map' | 'list';
  customerLocation: LocationPoint;
  categories: ServiceCategory[];
  professionals: ProfessionalProfile[];
  selectedCategoryId: string;
  demoMode: boolean;
  onToggleDemoMode: (v: boolean) => void;
  onChangeLocation: (loc: LocationPoint) => void;
  onCategoryFilterChange: (catId: string) => void;
  onViewProfile: (pro: ProfessionalProfile) => void;
  onBookPro: (pro: ProfessionalProfile) => void;
  onRegisterPro: () => void;
}> = ({
  initialView,
  customerLocation,
  categories,
  professionals,
  selectedCategoryId,
  demoMode,
  onToggleDemoMode,
  onChangeLocation,
  onCategoryFilterChange,
  onViewProfile,
  onBookPro,
  onRegisterPro,
}) => {
  const [viewMode, setViewMode] = useState<'map' | 'list'>(initialView);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available'>('all');
  const [sortBy, setSortBy] = useState<'fastest' | 'rating' | 'price'>('fastest');
  const [selectedPro, setSelectedPro] = useState<ProfessionalProfile | null>(null);
  const [showLocationBar, setShowLocationBar] = useState(false);

  const categoryIconLookup = useMemo(() => {
    const record: Record<string, string> = {};
    categories.forEach((c) => {
      record[c.id] = c.iconName;
    });
    return record;
  }, [categories]);

  const filteredWithDistance = useMemo(() => {
    const items = professionals
      .filter((p) => {
        if (p.isBlocked) return false;
        if (selectedCategoryId && selectedCategoryId !== 'all' && p.categoryId !== selectedCategoryId) {
          return false;
        }
        if (availabilityFilter === 'available' && p.availabilityStatus !== 'Available Now') {
          return false;
        }
        if (typeof p.lat !== 'number' || typeof p.lng !== 'number') {
          return false;
        }
        const dist = haversineDistanceKm(customerLocation.lat, customerLocation.lng, p.lat, p.lng);
        return dist <= radiusKm;
      })
      .map((p) => ({
        pro: p,
        distanceKm: haversineDistanceKm(customerLocation.lat, customerLocation.lng, p.lat!, p.lng!),
      }));

    items.sort((a, b) => {
      if (sortBy === 'rating') {
        return (b.pro.ratingAvg || 0) - (a.pro.ratingAvg || 0);
      }
      if (sortBy === 'price') {
        return a.pro.inspectionCharge - b.pro.inspectionCharge;
      }
      if (a.pro.availabilityStatus === 'Available Now' && b.pro.availabilityStatus !== 'Available Now') {
        return -1;
      }
      if (b.pro.availabilityStatus === 'Available Now' && a.pro.availabilityStatus !== 'Available Now') {
        return 1;
      }
      return a.distanceKm - b.distanceKm;
    });

    return items;
  }, [
    professionals,
    selectedCategoryId,
    availabilityFilter,
    customerLocation.lat,
    customerLocation.lng,
    radiusKm,
    sortBy,
  ]);

  const selectedDistance = selectedPro && typeof selectedPro.lat === 'number' && typeof selectedPro.lng === 'number'
    ? haversineDistanceKm(customerLocation.lat, customerLocation.lng, selectedPro.lat, selectedPro.lng)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5 pb-24 md:pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#0B1F3A]">
            Nearby Service Professionals
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>{customerLocation.city} · {customerLocation.address}</span>
            <button
              type="button"
              onClick={() => setShowLocationBar((v) => !v)}
              className="font-semibold text-[#2563EB] hover:underline"
            >
              Change location
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'map'
                  ? 'bg-white text-[#0B1F3A] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Map View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-[#0B1F3A] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List View
            </button>
          </div>

          <button
            type="button"
            onClick={() => onToggleDemoMode(!demoMode)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold ${
              demoMode
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {demoMode ? 'Demo Mode: ON' : 'Demo Mode'}
          </button>
        </div>
      </div>

      {showLocationBar && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <PlacesLocationSearch
            value={customerLocation.address}
            onSelectLocation={(loc) => {
              onChangeLocation(loc);
              setShowLocationBar(false);
            }}
          />
          <div className="flex flex-wrap gap-2">
            {INDIAN_CITIES.map((city) => (
              <button
                key={city.city}
                type="button"
                onClick={() => {
                  onChangeLocation(city);
                  setShowLocationBar(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium hover:border-[#2563EB]"
              >
                {city.city}
              </button>
            ))}
          </div>
        </div>
      )}

      {demoMode && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-xs text-amber-900">
          <Info className="w-4 h-4 shrink-0 text-amber-700" />
          <span>
            <strong>Demo Mode:</strong> Displaying sample illustrative professionals. Real live availability is only queried when Demo Mode is off.
          </span>
        </div>
      )}

      {/* Filter Bar: Radius, Category, Availability, Sort */}
      <div className="p-3.5 rounded-2xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-1">Radius:</span>
          {RADIUS_OPTIONS.map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => setRadiusKm(km)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border tabular-nums transition-colors ${
                radiusKm === km
                  ? 'bg-[#0B1F3A] text-white border-[#0B1F3A]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {km} km
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategoryId}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            aria-label="Filter by service category"
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() =>
              setAvailabilityFilter((v) => (v === 'all' ? 'available' : 'all'))
            }
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              availabilityFilter === 'available'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            Available Now Only
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'fastest' | 'rating' | 'price')}
            aria-label="Sort professionals"
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white"
          >
            <option value="fastest">Fastest Arrival</option>
            <option value="rating">Highest Rated</option>
            <option value="price">Lowest Inspection Fee</option>
          </select>
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 px-1">
        <span className="font-medium text-slate-800 tabular-nums">
          {filteredWithDistance.length} {filteredWithDistance.length === 1 ? 'professional' : 'professionals'} within {radiusKm} km
        </span>
        <span>·</span>
        <span className="text-emerald-700 font-medium">Green = Available Now</span>
        <span className="text-amber-700 font-medium">Amber = Busy</span>
        <span className="text-blue-700 font-medium">Blue = On Another Job</span>
      </div>

      {viewMode === 'map' ? (
        <div className="relative">
          <NearbyProsMap
            customerLocation={customerLocation}
            professionals={filteredWithDistance.map((x) => x.pro)}
            selectedProId={selectedPro?.uid || null}
            radiusKm={radiusKm}
            categoryIconLookup={categoryIconLookup}
            onSelectPro={(pro) => setSelectedPro(pro)}
          />

          {/* Empty Overlay Notice if no pros */}
          {filteredWithDistance.length === 0 && (
            <div className="mt-4 p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[#0B1F3A]">
                  No live professionals found within {radiusKm} km
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Try increasing your search radius to 10 km, changing your city, registering as a professional to go online, or enabling Demo Mode.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleDemoMode(true)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                >
                  Preview Demo Mode
                </button>
                <button
                  type="button"
                  onClick={onRegisterPro}
                  className="px-3.5 py-2 rounded-xl bg-[#0B1F3A] text-white text-xs font-semibold"
                >
                  Go Online as Pro
                </button>
              </div>
            </div>
          )}

          {/* Selected Professional Bottom Information Card */}
          {selectedPro && (
            <div className="mt-4 p-5 rounded-2xl border border-slate-200 bg-white shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                    {selectedPro.photoURL ? (
                      <img
                        src={selectedPro.photoURL}
                        alt={selectedPro.fullName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <Wrench className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-[#0B1F3A]">
                        {selectedPro.fullName}
                      </h3>
                      {selectedPro.isVerified && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB]">
                          <ShieldCheck className="w-4 h-4" />
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums">
                      <span>{selectedPro.categoryName}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-[#0B1F3A]">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        {selectedPro.ratingAvg && selectedPro.ratingAvg > 0
                          ? `${selectedPro.ratingAvg.toFixed(1)} (${selectedPro.reviewCount || 0} reviews)`
                          : 'New (0 reviews)'}
                      </span>
                      <span>·</span>
                      <span>{selectedDistance} km away</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs pt-1 tabular-nums">
                      <span
                        className={`font-semibold ${
                          selectedPro.availabilityStatus === 'Available Now'
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {selectedPro.availabilityStatus}
                      </span>
                      <span className="text-slate-500 inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Est. arrival: {estimateArrivalWindow(selectedDistance)}
                      </span>
                      <span className="font-semibold text-[#0B1F3A]">
                        Inspection: {formatInr(selectedPro.inspectionCharge)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onViewProfile(selectedPro)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-[#0B1F3A]"
                  >
                    View Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => onBookPro(selectedPro)}
                    className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Book Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPro(null)}
                    aria-label="Close card"
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {filteredWithDistance.length === 0 ? (
            <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 text-center space-y-3">
              <p className="text-base font-bold text-[#0B1F3A]">
                No matching professionals within {radiusKm} km
              </p>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Expand the radius or switch to Demo Mode to inspect sample technician cards.
              </p>
              <div className="flex justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onToggleDemoMode(true)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
                >
                  Preview Demo Mode
                </button>
                <button
                  type="button"
                  onClick={onRegisterPro}
                  className="px-4 py-2 rounded-xl bg-[#0B1F3A] text-white text-xs font-semibold"
                >
                  Register as Pro
                </button>
              </div>
            </div>
          ) : (
            filteredWithDistance.map(({ pro, distanceKm }) => (
              <div
                key={pro.uid}
                className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                    {pro.photoURL ? (
                      <img
                        src={pro.photoURL}
                        alt={pro.fullName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <Wrench className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base sm:text-lg font-bold text-[#0B1F3A]">
                        {pro.fullName}
                      </h3>
                      {pro.isVerified && (
                        <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {pro.categoryName} · {pro.experienceYears} yrs exp · {pro.serviceArea}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs pt-1 tabular-nums">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#0B1F3A]">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        {pro.ratingAvg && pro.ratingAvg > 0
                          ? `${pro.ratingAvg.toFixed(1)} (${pro.reviewCount || 0})`
                          : 'New'}
                      </span>
                      <span className="text-slate-600">{distanceKm} km away</span>
                      <span className="text-slate-600">
                        Est. {estimateArrivalWindow(distanceKm)}
                      </span>
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
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <div className="text-left sm:text-right tabular-nums">
                    <p className="text-xs text-slate-500">Inspection fee</p>
                    <p className="text-base font-bold text-[#0B1F3A]">
                      {formatInr(pro.inspectionCharge)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onViewProfile(pro)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-[#0B1F3A] hover:bg-slate-50"
                    >
                      Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => onBookPro(pro)}
                      className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const ProfessionalProfileScreen: React.FC<{
  pro: ProfessionalProfile;
  customerLocation: LocationPoint;
  reviews: ReviewRecord[];
  onBookPro: (pro: ProfessionalProfile) => void;
  onBack: () => void;
}> = ({ pro, customerLocation, reviews, onBookPro, onBack }) => {
  const proReviews = reviews.filter((r) => r.professionalId === pro.uid);
  const distanceKm =
    typeof pro.lat === 'number' && typeof pro.lng === 'number'
      ? haversineDistanceKm(customerLocation.lat, customerLocation.lng, pro.lat, pro.lng)
      : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 pb-24 md:pb-12">
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-semibold text-[#2563EB] hover:underline"
      >
        &larr; Back to Nearby Professionals
      </button>

      {pro.isDemo && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          This is an illustrative Demo Mode profile. Register a real Service Professional account to receive live bookings.
        </div>
      )}

      <div className="p-6 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
            {pro.photoURL ? (
              <img
                src={pro.photoURL}
                alt={pro.fullName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <Wrench className="w-8 h-8" />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold text-[#0B1F3A]">
                {pro.fullName}
              </h1>
              {pro.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB]">
                  <ShieldCheck className="w-4 h-4" />
                  ID Verified
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-600">
              {pro.categoryName} · {pro.experienceYears} years experience
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 tabular-nums">
              <span className="inline-flex items-center gap-1 font-semibold text-[#0B1F3A]">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {pro.ratingAvg && pro.ratingAvg > 0
                  ? `${pro.ratingAvg.toFixed(1)} (${pro.reviewCount || proReviews.length} reviews)`
                  : `New (${proReviews.length} reviews)`}
              </span>
              <span>·</span>
              <span>{pro.completedJobs || 0} completed jobs</span>
              {distanceKm !== null && (
                <>
                  <span>·</span>
                  <span>
                    {distanceKm} km away ({estimateArrivalWindow(distanceKm)})
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onBookPro(pro)}
          className="px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          Book Now
        </button>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
          <p className="text-xs text-slate-500">Current Availability</p>
          <p
            className={`text-base font-bold ${
              pro.availabilityStatus === 'Available Now'
                ? 'text-emerald-700'
                : 'text-amber-700'
            }`}
          >
            {pro.availabilityStatus}
          </p>
          <p className="text-xs text-slate-500">
            Working hours: {pro.workingHours || '08:00 AM – 09:00 PM'}
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-1 tabular-nums">
          <p className="text-xs text-slate-500">Inspection &amp; Visit Fee</p>
          <p className="text-base font-bold text-[#0B1F3A]">
            {formatInr(pro.inspectionCharge)}
          </p>
          <p className="text-xs text-slate-500">
            Hourly labour est.: {formatInr(pro.hourlyRate || pro.inspectionCharge + 150)}
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
          <p className="text-xs text-slate-500">Primary Service Area</p>
          <p className="text-base font-bold text-[#0B1F3A]">{pro.serviceArea}</p>
          <p className="text-xs text-slate-500">
            {pro.isSharingLocation ? 'Live GPS location active' : 'Location sharing offline'}
          </p>
        </div>
      </div>

      {/* Bio & Skills */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4">
        <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
          Expertise &amp; Background
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          {pro.bio || 'Verified specialist registered on AF FIXING for doorstep repairs and transparent service estimates.'}
        </p>
        {pro.skills && pro.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-700">
            {pro.skills.map((skill, idx) => (
              <span key={skill} className="font-medium">
                {idx > 0 ? '· ' : ''}
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Verified Completed-Job Reviews */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
          Verified Customer Reviews
        </h2>
        {proReviews.length === 0 ? (
          <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-600">
            No completed-job reviews recorded yet for this technician.
          </div>
        ) : (
          <div className="space-y-3">
            {proReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-2xl border border-slate-200 bg-white space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0B1F3A]">{rev.customerName}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-600 tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {rev.rating.toFixed(1)}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{rev.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
