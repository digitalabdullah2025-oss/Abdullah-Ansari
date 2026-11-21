export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function estimateArrivalWindow(distanceKm: number, routeDurationSeconds?: number): string {
  if (typeof routeDurationSeconds === 'number' && routeDurationSeconds > 0) {
    const baseMins = Math.max(5, Math.round(routeDurationSeconds / 60));
    const low = Math.max(5, baseMins - 3);
    const high = baseMins + 7;
    return `${low}–${high} mins`;
  }
  const approxMins = Math.max(10, Math.round((distanceKm / 18) * 60) + 5);
  const low = Math.max(10, approxMins - 3);
  const high = approxMins + 10;
  return `${low}–${high} mins`;
}

export function formatInr(amount: number | undefined | null): string {
  const val = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return `₹${val.toLocaleString('en-IN')}`;
}

export function clampString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

export function generateId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now()}_${randomPart}`;
}
