import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { LocateFixed, MapPin, Search, ShieldCheck, Star } from 'lucide-react';
import {
  isMapsQuotaError,
  useAutocompleteSuggestions,
} from '../hooks/useAutocompleteSuggestions';
import type { LocationPoint, ProfessionalProfile } from '../types';
import { ServiceIcon } from './ServiceIcon';

const GMP_ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'];
const DEFAULT_MAP_ID = 'DEMO_MAP_ID';

export const PlacesLocationSearch: React.FC<{
  value: string;
  placeholder?: string;
  onSelectLocation: (point: LocationPoint) => void;
}> = ({ value, placeholder = 'Search locality, street, or city...', onSelectLocation }) => {
  const placesLib = useMapsLibrary('places');
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const { suggestions, isLoading, error, resetSession } =
    useAutocompleteSuggestions(open ? inputValue : '');

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleSelectSuggestion = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!placesLib || !suggestion.placePrediction) return;
      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location'],
        });
        const loc = place.location;
        if (loc) {
          const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat);
          const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng);
          const formatted =
            place.formattedAddress ||
            place.displayName ||
            suggestion.placePrediction.text.text;
          const cityPart = formatted.split(',').slice(-3, -2)[0]?.trim() || formatted.split(',')[0] || 'India';
          setInputValue(formatted);
          setOpen(false);
          resetSession();
          onSelectLocation({
            lat,
            lng,
            address: formatted,
            city: cityPart,
          });
        }
      } catch (err) {
        if (isMapsQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      }
    },
    [placesLib, onSelectLocation, resetSession]
  );

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={inputValue}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          className="w-full text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
        />
        {isLoading && (
          <span className="text-xs text-slate-400 whitespace-nowrap">
            Searching...
          </span>
        )}
      </div>

      {open && (suggestions.length > 0 || error) && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-60 overflow-y-auto">
          {error && (
            <div className="px-3.5 py-2.5 text-xs text-amber-700 bg-amber-50">
              {error}
            </div>
          )}
          {suggestions.map((suggestion, idx) => {
            const label = suggestion.placePrediction?.text.text || '';
            return (
              <button
                key={`${label}-${idx}`}
                type="button"
                onClick={() => void handleSelectSuggestion(suggestion)}
                className="w-full text-left px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-start gap-2.5 border-b last:border-b-0 border-slate-100"
              >
                <MapPin className="w-4 h-4 text-[#2563EB] mt-0.5 shrink-0" />
                <span className="line-clamp-2">{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

function statusMarkerColor(status: ProfessionalProfile['availabilityStatus']): {
  bg: string;
  border: string;
  text: string;
} {
  switch (status) {
    case 'Available Now':
      return { bg: '#059669', border: '#065F46', text: '#FFFFFF' };
    case 'Busy':
      return { bg: '#D97706', border: '#92400E', text: '#FFFFFF' };
    case 'On Another Job':
      return { bg: '#2563EB', border: '#1E40AF', text: '#FFFFFF' };
    default:
      return { bg: '#64748B', border: '#334155', text: '#FFFFFF' };
  }
}

export const NearbyProsMap: React.FC<{
  customerLocation: LocationPoint;
  professionals: ProfessionalProfile[];
  selectedProId: string | null;
  radiusKm: number;
  categoryIconLookup: Record<string, string>;
  onSelectPro: (pro: ProfessionalProfile) => void;
}> = ({
  customerLocation,
  professionals,
  selectedProId,
  radiusKm,
  categoryIconLookup,
  onSelectPro,
}) => {
  const zoomForRadius =
    radiusKm <= 1 ? 15 : radiusKm <= 3 ? 13.5 : radiusKm <= 5 ? 12.8 : 11.8;

  return (
    <div className="relative w-full h-[400px] sm:h-[480px] lg:h-[560px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
      <GoogleMap
        mapId={DEFAULT_MAP_ID}
        internalUsageAttributionIds={GMP_ATTRIBUTION_IDS}
        center={{ lat: customerLocation.lat, lng: customerLocation.lng }}
        zoom={zoomForRadius}
        gestureHandling="greedy"
        disableDefaultUI={false}
        streetViewControl={false}
        mapTypeControl={false}
        className="w-full h-full"
      >
        {/* Customer Location Marker */}
        <AdvancedMarker
          position={{ lat: customerLocation.lat, lng: customerLocation.lng }}
          title="Your Location"
          zIndex={50}
        >
          <div className="flex flex-col items-center">
            <div className="px-2.5 py-1 rounded-lg bg-[#0B1F3A] text-white text-[11px] font-semibold shadow-md whitespace-nowrap mb-1">
              You
            </div>
            <div className="w-4 h-4 rounded-full bg-[#2563EB] border-2 border-white shadow-md" />
          </div>
        </AdvancedMarker>

        {/* Real / Demo Professional Markers */}
        {professionals
          .filter(
            (pro) =>
              typeof pro.lat === 'number' &&
              typeof pro.lng === 'number' &&
              pro.isSharingLocation
          )
          .map((pro) => {
            const colors = statusMarkerColor(pro.availabilityStatus);
            const isSelected = selectedProId === pro.uid;
            const iconName = categoryIconLookup[pro.categoryId] || 'Wrench';
            return (
              <AdvancedMarker
                key={pro.uid}
                position={{ lat: pro.lat!, lng: pro.lng! }}
                title={`${pro.fullName} — ${pro.categoryName} (${pro.availabilityStatus})`}
                onClick={() => onSelectPro(pro)}
                zIndex={isSelected ? 100 : 20}
              >
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border-2 shadow-md transition-transform cursor-pointer ${
                    isSelected ? 'scale-110 ring-2 ring-blue-300' : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: isSelected ? '#0B1F3A' : colors.border,
                    color: colors.text,
                  }}
                >
                  <ServiceIcon iconName={iconName} className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold whitespace-nowrap">
                    {pro.fullName.split(' ')[0]}
                  </span>
                  {pro.isVerified && (
                    <ShieldCheck className="w-3 h-3 text-blue-100 shrink-0" />
                  )}
                  {typeof pro.ratingAvg === 'number' && pro.ratingAvg > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {pro.ratingAvg.toFixed(1)}
                    </span>
                  )}
                </div>
              </AdvancedMarker>
            );
          })}
      </GoogleMap>
    </div>
  );
};

export const LocationPickerMap: React.FC<{
  location: LocationPoint;
  onLocationChange: (loc: LocationPoint) => void;
}> = ({ location, onLocationChange }) => {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const handleUseMyGPS = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported in this browser.');
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onLocationChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: `Pinned GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`,
          city: location.city || 'Current Location',
        });
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === 1
            ? 'Location permission was denied. Search your address above or click on the map.'
            : 'Unable to detect GPS coordinates right now.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <PlacesLocationSearch
            value={location.address}
            placeholder="Search street, apartment, or locality in India"
            onSelectLocation={onLocationChange}
          />
        </div>
        <button
          type="button"
          onClick={handleUseMyGPS}
          disabled={locating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium whitespace-nowrap shrink-0"
        >
          <LocateFixed className="w-4 h-4 text-[#2563EB]" />
          {locating ? 'Locating...' : 'Use GPS'}
        </button>
      </div>

      {geoError && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {geoError}
        </p>
      )}

      <div className="w-full h-[260px] rounded-2xl overflow-hidden border border-slate-200">
        <GoogleMap
          mapId={DEFAULT_MAP_ID}
          internalUsageAttributionIds={GMP_ATTRIBUTION_IDS}
          center={{ lat: location.lat, lng: location.lng }}
          zoom={15}
          gestureHandling="greedy"
          disableDefaultUI={true}
          onClick={(ev) => {
            const latLng = ev.detail.latLng;
            if (latLng) {
              onLocationChange({
                lat: latLng.lat,
                lng: latLng.lng,
                address:
                  location.address ||
                  `Pinned Location (${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)})`,
                city: location.city,
              });
            }
          }}
          className="w-full h-full"
        >
          <AdvancedMarker
            position={{ lat: location.lat, lng: location.lng }}
            title="Service Address Pin"
          >
            <Pin background="#2563EB" borderColor="#0B1F3A" glyphColor="#FFFFFF" />
          </AdvancedMarker>
        </GoogleMap>
      </div>
      <p className="text-xs text-slate-500">
        Tip: Search your address above or tap anywhere on the map to adjust the service pin.
      </p>
    </div>
  );
};

const RouteOverlay: React.FC<{
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
  onRouteComputed?: (info: { distanceMeters?: number; durationSeconds?: number }) => void;
}> = ({ origin, destination, onRouteComputed }) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !routesLib) return;

    let active = true;

    const compute = async () => {
      try {
        const RouteClass = routesLib.Route as unknown as {
          computeRoutes: (req: Record<string, unknown>) => Promise<{
            routes?: Array<{
              distanceMeters?: number;
              durationMillis?: number;
              path?: google.maps.LatLng[];
              viewport?: google.maps.LatLngBounds;
              createPolylines?: (opts?: Record<string, unknown>) => google.maps.Polyline[];
            }>;
          }>;
        };

        if (typeof RouteClass?.computeRoutes !== 'function') {
          return;
        }

        const res = await RouteClass.computeRoutes({
          origin,
          destination,
          travelMode: 'DRIVING',
          fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
        });

        if (!active) return;

        if (polylineRef.current) {
          polylineRef.current.setMap(null);
          polylineRef.current = null;
        }

        const route = res.routes?.[0];
        if (!route) return;

        if (route.path && route.path.length > 0) {
          polylineRef.current = new google.maps.Polyline({
            path: route.path,
            geodesic: true,
            strokeColor: '#2563EB',
            strokeOpacity: 0.9,
            strokeWeight: 5,
            map,
          });
        }

        if (route.viewport) {
          map.fitBounds(route.viewport, 48);
        }

        onRouteComputed?.({
          distanceMeters: route.distanceMeters,
          durationSeconds:
            typeof route.durationMillis === 'number'
              ? Math.round(route.durationMillis / 1000)
              : undefined,
        });
      } catch (err) {
        if (isMapsQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      }
    };

    void compute();

    return () => {
      active = false;
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, routesLib, origin.lat, origin.lng, destination.lat, destination.lng]);

  return null;
};

export const LiveTrackingMap: React.FC<{
  customerLat: number;
  customerLng: number;
  proLat?: number;
  proLng?: number;
  isProSharingLocation: boolean;
  proName: string;
  onRouteInfo?: (info: { distanceMeters?: number; durationSeconds?: number }) => void;
}> = ({
  customerLat,
  customerLng,
  proLat,
  proLng,
  isProSharingLocation,
  proName,
  onRouteInfo,
}) => {
  const hasLivePro =
    isProSharingLocation && typeof proLat === 'number' && typeof proLng === 'number';

  return (
    <div className="w-full h-[360px] sm:h-[420px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
      <GoogleMap
        mapId={DEFAULT_MAP_ID}
        internalUsageAttributionIds={GMP_ATTRIBUTION_IDS}
        center={
          hasLivePro
            ? { lat: (customerLat + proLat!) / 2, lng: (customerLng + proLng!) / 2 }
            : { lat: customerLat, lng: customerLng }
        }
        zoom={14}
        gestureHandling="greedy"
        disableDefaultUI={false}
        streetViewControl={false}
        mapTypeControl={false}
        className="w-full h-full"
      >
        <AdvancedMarker
          position={{ lat: customerLat, lng: customerLng }}
          title="Service Destination"
        >
          <Pin background="#0B1F3A" borderColor="#061326" glyphColor="#FFFFFF" />
        </AdvancedMarker>

        {hasLivePro && (
          <>
            <AdvancedMarker
              position={{ lat: proLat!, lng: proLng! }}
              title={`${proName} (Live Location)`}
            >
              <div className="px-2.5 py-1.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold border-2 border-white shadow-lg whitespace-nowrap">
                {proName.split(' ')[0]} · Live
              </div>
            </AdvancedMarker>

            <RouteOverlay
              origin={{ lat: proLat!, lng: proLng! }}
              destination={{ lat: customerLat, lng: customerLng }}
              onRouteComputed={onRouteInfo}
            />
          </>
        )}
      </GoogleMap>
    </div>
  );
};
