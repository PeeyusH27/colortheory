import { forgotPasswordSchema, passwordStrength, resetPasswordSchema, signInSchema, signUpSchema } from '../schemas';

const messages = (result: { success: boolean; error?: { issues: { message: string; path: PropertyKey[] }[] } }) =>
  result.success ? [] : (result.error?.issues ?? []).map((i) => `${String(i.path[0])}: ${i.message}`);

describe('signInSchema', () => {
  it('trims the email and accepts any non-empty password', () => {
    const r = signInSchema.safeParse({ email: '  alex@example.com ', password: 'x' });
    expect(r.success && r.data.email).toBe('alex@example.com');
  });

  it('explains missing or malformed fields', () => {
    expect(messages(signInSchema.safeParse({ email: '', password: '' }))).toEqual([
      'email: Enter your email address',
      'password: Enter your password',
    ]);
    expect(messages(signInSchema.safeParse({ email: 'alex@', password: 'x' }))).toEqual(['email: Enter a valid email address']);
  });
});

describe('signUpSchema', () => {
  const valid = { displayName: 'Alex', email: 'alex@example.com', password: 'colours42', confirmPassword: 'colours42' };

  it('accepts a valid sign-up', () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    [{ password: 'short1', confirmPassword: 'short1' }, 'password: Use at least 8 characters'],
    [{ password: 'nonumbers', confirmPassword: 'nonumbers' }, 'password: Include at least one number'],
    [{ password: '12345678', confirmPassword: '12345678' }, 'password: Include at least one letter'],
    [{ confirmPassword: 'different1' }, 'confirmPassword: Passwords don’t match'],
    [{ displayName: '   ' }, 'displayName: Tell us what to call you'],
  ])('rejects %o', (override, expected) => {
    expect(messages(signUpSchema.safeParse({ ...valid, ...override }))).toContain(expected);
  });
});

describe('reset & forgot password', () => {
  it('validates the email and matching new passwords', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: 'newpass99', confirmPassword: 'newpass99' }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: 'newpass99', confirmPassword: 'newpass98' }).success).toBe(false);
  });
});

describe('passwordStrength', () => {
  it('rates longer, more varied passwords higher', () => {
    expect(passwordStrength('abc')).toBe(0);
    expect(passwordStrength('colours42')).toBe(1);
    expect(passwordStrength('Colours42colours')).toBe(3);
    expect(passwordStrength('Colours-42-colours')).toBe(4);
  });
});
