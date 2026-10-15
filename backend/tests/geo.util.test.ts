import {
  calculateHaversineDistance,
  isValidCoordinate,
  isValidLatitude,
  isValidLongitude,
  validateLocationAccuracy,
} from '../src/shared/utils/geo.util';

describe('Geographic Utilities (Haversine & Coordinate Validation)', () => {
  // Known coordinates:
  // Bangalore Vidhana Soudha: 12.9791, 77.5913
  // Bangalore Chinnaswamy Stadium: 12.9788, 77.5996
  // Exact distance between them is approx 900 meters

  it('should return 0 meters for identical coordinates', () => {
    const dist = calculateHaversineDistance(12.9716, 77.5946, 12.9716, 77.5946);
    expect(dist).toBe(0);
  });

  it('should calculate accurate distance within known ground truth', () => {
    const dist = calculateHaversineDistance(12.9791, 77.5913, 12.9788, 77.5996);
    // Should be around 901 metres (+/- 10m)
    expect(dist).toBeGreaterThan(880);
    expect(dist).toBeLessThan(930);
  });

  it('should throw an error for non-finite coordinates (NaN or Infinity)', () => {
    expect(() => calculateHaversineDistance(NaN, 77.59, 12.97, 77.59)).toThrow();
    expect(() => calculateHaversineDistance(12.97, Infinity, 12.97, 77.59)).toThrow();
    expect(() => calculateHaversineDistance(12.97, 77.59, -Infinity, 77.59)).toThrow();
  });

  describe('Coordinate Validation', () => {
    it('should validate valid latitudes (-90 to 90)', () => {
      expect(isValidLatitude(0)).toBe(true);
      expect(isValidLatitude(90)).toBe(true);
      expect(isValidLatitude(-90)).toBe(true);
      expect(isValidLatitude(12.9716)).toBe(true);

      expect(isValidLatitude(90.1)).toBe(false);
      expect(isValidLatitude(-90.1)).toBe(false);
      expect(isValidLatitude('12.97')).toBe(false);
      expect(isValidLatitude(NaN)).toBe(false);
      expect(isValidLatitude(null)).toBe(false);
    });

    it('should validate valid longitudes (-180 to 180)', () => {
      expect(isValidLongitude(0)).toBe(true);
      expect(isValidLongitude(180)).toBe(true);
      expect(isValidLongitude(-180)).toBe(true);
      expect(isValidLongitude(77.5946)).toBe(true);

      expect(isValidLongitude(180.1)).toBe(false);
      expect(isValidLongitude(-180.1)).toBe(false);
      expect(isValidLongitude('77.59')).toBe(false);
      expect(isValidLongitude(NaN)).toBe(false);
      expect(isValidLongitude(undefined)).toBe(false);
    });

    it('should validate coordinate pairs', () => {
      expect(isValidCoordinate(12.9716, 77.5946)).toBe(true);
      expect(isValidCoordinate(-45.0, 120.0)).toBe(true);
      expect(isValidCoordinate(91.0, 50.0)).toBe(false);
      expect(isValidCoordinate(45.0, 185.0)).toBe(false);
    });
  });

  describe('Location Accuracy Validation', () => {
    it('should accept accuracy within threshold', () => {
      const res = validateLocationAccuracy(25, 50);
      expect(res.valid).toBe(true);
    });

    it('should accept accuracy exactly at threshold', () => {
      const res = validateLocationAccuracy(50, 50);
      expect(res.valid).toBe(true);
    });

    it('should reject accuracy worse than threshold', () => {
      const res = validateLocationAccuracy(75, 50);
      expect(res.valid).toBe(false);
      expect(res.reason).toMatch(/insufficient/i);
    });

    it('should reject negative, zero, or non-finite accuracy', () => {
      expect(validateLocationAccuracy(0, 50).valid).toBe(false);
      expect(validateLocationAccuracy(-10, 50).valid).toBe(false);
      expect(validateLocationAccuracy(NaN, 50).valid).toBe(false);
      expect(validateLocationAccuracy('20', 50).valid).toBe(false);
    });
  });
});
