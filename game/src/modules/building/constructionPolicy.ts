/** Rules for player-driven construction. Keep this separate from terrain geometry and save data. */
export interface ConstructionPolicy {
  readonly allowSurfaceConstruction: boolean;
}

export const UNDERGROUND_ONLY_POLICY: Readonly<ConstructionPolicy> = Object.freeze({
  allowSurfaceConstruction: false
});

/** For validating pre-policy saves, never for authorizing player commands. */
export const LEGACY_SURFACE_POLICY: Readonly<ConstructionPolicy> = Object.freeze({
  allowSurfaceConstruction: true
});

export const UNDERGROUND_ONLY_REASON = 'ساخت‌وساز فعلاً فقط در زیرزمین مجاز است.';
export const LEGACY_SURFACE_READ_ONLY_REASON =
  'سازه‌های سطحیِ ذخیره‌های قدیمی در این نسخه فقط قابل مشاهده‌اند.';

export function canConstructAtLevel(
  y: number, policy: ConstructionPolicy = UNDERGROUND_ONLY_POLICY
): boolean {
  return Number.isInteger(y) && (y < 0 || policy.allowSurfaceConstruction);
}

export function canEditFootprint(
  y: number, height: number, policy: ConstructionPolicy = UNDERGROUND_ONLY_POLICY
): boolean {
  return Number.isInteger(height) && height > 0 &&
    Array.from({ length: height }, (_, offset) => y + offset)
      .every((level) => canConstructAtLevel(level, policy));
}
