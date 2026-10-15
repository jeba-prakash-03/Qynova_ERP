/**
 * Geographic utility functions for Haversine distance calculations and coordinate validation.
 */

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 *
 * @param lat1 Latitude of point 1 in degrees
 * @param lon1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lon2 Longitude of point 2 in degrees
 * @returns Distance in metres rounded to 2 decimal places
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    throw new Error('Coordinates must be finite numbers');
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c * 100) / 100;
}

/**
 * Validates whether a latitude is a finite number between -90 and 90 degrees.
 */
export function isValidLatitude(lat: any): boolean {
  return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

/**
 * Validates whether a longitude is a finite number between -180 and 180 degrees.
 */
export function isValidLongitude(lon: any): boolean {
  return typeof lon === 'number' && Number.isFinite(lon) && lon >= -180 && lon <= 180;
}

/**
 * Validates coordinate pair.
 */
export function isValidCoordinate(lat: any, lon: any): boolean {
  return isValidLatitude(lat) && isValidLongitude(lon);
}

/**
 * Validates reported GPS accuracy against a maximum threshold in metres.
 */
export function validateLocationAccuracy(
  accuracy: any,
  maxAllowedAccuracyMeters: number
): { valid: boolean; reason?: string } {
  if (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy <= 0) {
    return {
      valid: false,
      reason: 'Reported location accuracy must be a positive finite number.',
    };
  }

  if (accuracy > maxAllowedAccuracyMeters) {
    return {
      valid: false,
      reason: `Your location accuracy is insufficient (reported: ${Math.round(accuracy)}m, required: <=${maxAllowedAccuracyMeters}m). Move to an area with a clearer GPS signal and retry.`,
    };
  }

  return { valid: true };
}
