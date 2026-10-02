import { z } from 'zod';

/** Mirrors the API's @StrongPassword rule so users get instant feedback; the API stays authoritative. */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_BYTES = 72;

export const passwordSchema = z
  .string()
  .refine(
    (value) => [...value].length >= PASSWORD_MIN_LENGTH,
    `Use at least ${PASSWORD_MIN_LENGTH} characters`,
  )
  .refine((value) => value.trim().length > 0, 'Password cannot be only spaces')
  .refine(
    (value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES,
    'Password is too long (maximum 72 bytes)',
  );

export const PASSWORD_HINT = `At least ${PASSWORD_MIN_LENGTH} characters. A short phrase is easier to remember and harder to guess.`;
