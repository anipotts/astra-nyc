export const MAX_SOURCE_PLAN_BYTES = 4 * 1024 * 1024;
export function validateSourcePlanBytes(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > MAX_SOURCE_PLAN_BYTES || new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-')
    throw new Error('The source is not a supported PDF within the 4 MB preview limit.');
}
export function validateSourcePlanPages(count) {
  if (!Number.isInteger(count) || count < 1 || count > 3)
    throw new Error('This document exceeds the three-page preview limit or has no readable pages.');
}
