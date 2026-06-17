export interface Bbox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export function parseBbox(query: Record<string, unknown>): Bbox | null {
  const { minLat, maxLat, minLng, maxLng } = query;
  if (minLat === undefined || maxLat === undefined || minLng === undefined || maxLng === undefined) return null;
  const vals = [Number(minLat), Number(maxLat), Number(minLng), Number(maxLng)];
  if (vals.some(isNaN)) return null;
  const [sLat, nLat, wLng, eLng] = vals;
  if (sLat < -90 || nLat > 90 || wLng < -180 || eLng > 180 || sLat >= nLat || wLng >= eLng) return null;
  return { minLat: sLat, maxLat: nLat, minLng: wLng, maxLng: eLng };
}
