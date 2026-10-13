import { z } from 'zod';

/**
 * Form validation for auth screens. Server-side rules (Supabase password policy, rate limits)
 * still apply; these give fast, friendly feedback before a request is made.
 */

const email = z
  .string()
  .trim()
  .min(1, { error: 'Enter your email address' })
  .pipe(z.email({ error: 'Enter a valid email address' }));

export const PASSWORD_MIN_LENGTH = 8;

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: `Use at least ${PASSWORD_MIN_LENGTH} characters` })
  .max(72, { error: 'Use 72 characters or fewer' })
  .regex(/[A-Za-z]/, { error: 'Include at least one letter' })
  .regex(/[0-9]/, { error: 'Include at least one number' });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: 'Enter your password' }),
});

export const signUpSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, { error: 'Tell us what to call you' })
      .max(60, { error: 'Use 60 characters or fewer' }),
    email,
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { error: 'Passwords don’t match', path: ['confirmPassword'] });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { error: 'Passwords don’t match', path: ['confirmPassword'] });

export const displayNameSchema = z.object({
  displayName: z.string().trim().min(1, { error: 'Enter a name' }).max(60, { error: 'Use 60 characters or fewer' }),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type DisplayNameValues = z.infer<typeof displayNameSchema>;

/** 0–4 strength hint for the sign-up meter. Purely advisory. */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}
