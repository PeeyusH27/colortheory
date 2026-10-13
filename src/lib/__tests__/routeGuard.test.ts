import { decideRoute } from '../routeGuard';

const visit = (pathname: string, opts: { search?: string; signedIn?: boolean; demo?: boolean } = {}) =>
  decideRoute({ pathname, search: opts.search ?? '', signedIn: opts.signedIn ?? false, demo: opts.demo ?? false });

describe('decideRoute', () => {
  it('sends signed-out visitors to sign-in and remembers where they were going', () => {
    expect(visit('/results/abc', { search: '?fresh=1' })).toBe(`/sign-in?${new URLSearchParams({ next: '/results/abc?fresh=1' })}`);
    expect(visit('/discover')).toMatch(/^\/sign-in\?next=%2Fdiscover$/);
  });

  it('admits members and demo visitors to app pages', () => {
    expect(visit('/discover', { signedIn: true })).toBeNull();
    expect(visit('/analyze/confirm', { demo: true })).toBeNull();
  });

  it('keeps signed-in members out of guest-only pages and the landing page', () => {
    expect(visit('/sign-in', { signedIn: true })).toBe('/discover');
    expect(visit('/', { signedIn: true })).toBe('/discover');
    expect(visit('/', { demo: true })).toBe('/discover');
  });

  it('lets members revisit the introduction', () => {
    expect(visit('/', { signedIn: true, search: '?intro=1' })).toBeNull();
  });

  it('requires a recovery session for the reset page', () => {
    expect(visit('/reset-password')).toMatch(/^\/forgot-password\?link_error=/);
    expect(visit('/reset-password', { signedIn: true })).toBeNull();
  });

  it('leaves public pages alone', () => {
    expect(visit('/')).toBeNull();
    expect(visit('/legal/privacy')).toBeNull();
    expect(visit('/sign-in')).toBeNull();
    // A prefix match must be a whole segment: "/outfits-guide" is not "/outfits".
    expect(visit('/outfits-guide')).toBeNull();
  });
});
