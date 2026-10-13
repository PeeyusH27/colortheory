import { fireEvent, render, screen } from '@testing-library/react';

import { AppError } from '@/utils/errors';

import { ProvenanceBadge } from '../Badge';
import { Checkbox } from '../Checkbox';
import { ConfirmDialog } from '../ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../States';

describe('ErrorState', () => {
  it('shows friendly copy and a retry action for retryable errors', () => {
    const onRetry = vi.fn();
    render(<ErrorState error={new AppError('network', 'raw server message')} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Connection hiccup')).toBeTruthy();
    expect(screen.queryByText('raw server message')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides retry for errors that retrying cannot fix', () => {
    render(<ErrorState error={new AppError('session_expired', 'x')} onRetry={vi.fn()} />);
    expect(screen.getByText('Your session expired')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('lets an explicit code override the error classification (offline)', () => {
    render(<ErrorState code="offline" />);
    expect(screen.getByText('You’re offline')).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('renders a heading, body and action', () => {
    render(<EmptyState title="No palettes yet" body="Run an analysis." action={<button type="button">Analyze my look</button>} />);
    expect(screen.getByRole('heading', { name: 'No palettes yet' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Analyze my look' })).toBeTruthy();
  });
});

describe('LoadingState', () => {
  it('is announced politely as a status', () => {
    render(<LoadingState label="Loading palettes" />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toContain('Loading palettes');
  });
});

describe('ConfirmDialog (account deletion)', () => {
  it('requires the confirmation phrase before enabling delete', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Delete your account?"
        body="This is permanent."
        details={['All portraits in cloud storage']}
        confirmationPhrase="DELETE"
        confirmLabel="Delete account"
        destructive
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    const confirm = screen.getByRole('button', { name: 'Delete account' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(screen.getByText('All portraits in cloud storage')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'delete' } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('Checkbox (upload consent)', () => {
  it('exposes native checkbox semantics and reports changes', () => {
    const onChange = vi.fn();
    render(<Checkbox checked={false} onChange={onChange} label="I consent to uploading this portrait" description="Only your account can read it." />);
    const box = screen.getByRole('checkbox', { name: 'I consent to uploading this portrait' }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(box.getAttribute('aria-describedby')).toBeTruthy();
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('ProvenanceBadge', () => {
  it.each([
    ['demo', /sample results, not based on your photo/],
    ['device', /Estimated in your browser/],
    ['ai', /may not perfectly preserve your appearance/],
    ['drape', /not an AI-generated try-on/],
  ] as const)('explains %s results to assistive technology', (kind, text) => {
    render(<ProvenanceBadge kind={kind} />);
    expect(screen.getByText(text)).toBeTruthy();
  });
});
