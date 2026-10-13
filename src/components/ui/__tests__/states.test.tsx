import { render, screen, userEvent } from '@testing-library/react-native';

import { AppError } from '@/utils/errors';

import { ProvenanceBadge } from '../Badge';
import { Checkbox } from '../Checkbox';
import { ConfirmationModal } from '../ConfirmationModal';
import { EmptyState } from '../EmptyState';
import { ErrorState } from '../ErrorState';
import { LoadingState } from '../LoadingState';

describe('ErrorState', () => {
  it('shows friendly copy and a retry action for retryable errors', async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    await render(<ErrorState error={new AppError('network', 'raw server message')} onRetry={onRetry} />);
    expect(screen.getByText('Connection hiccup')).toBeOnTheScreen();
    expect(screen.queryByText('raw server message')).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides retry for errors that retrying cannot fix', async () => {
    await render(<ErrorState error={new AppError('session_expired', 'x')} onRetry={jest.fn()} />);
    expect(screen.getByText('Your session expired')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
  });

  it('lets an explicit code override the error classification (offline)', async () => {
    await render(<ErrorState code="offline" />);
    expect(screen.getByText('You’re offline')).toBeOnTheScreen();
  });
});

describe('EmptyState', () => {
  it('renders title, body and action', async () => {
    const onAction = jest.fn();
    const user = userEvent.setup();
    await render(<EmptyState title="No palettes yet" body="Run an analysis." actionLabel="Analyze my look" onAction={onAction} />);
    expect(screen.getByRole('header', { name: 'No palettes yet' })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Analyze my look' }));
    expect(onAction).toHaveBeenCalled();
  });
});

describe('LoadingState', () => {
  it('is announced as progress', async () => {
    await render(<LoadingState label="Loading palettes" />);
    expect(screen.getByRole('progressbar', { name: 'Loading palettes' })).toBeOnTheScreen();
  });
});

describe('ConfirmationModal (account deletion)', () => {
  it('requires the confirmation phrase before enabling delete', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    await render(
      <ConfirmationModal
        visible
        title="Delete your account?"
        message="This is permanent."
        confirmationPhrase="DELETE"
        confirmLabel="Delete account"
        destructive
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );
    const confirm = screen.getByRole('button', { name: 'Delete account' });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText('Type DELETE to confirm'), 'delete');
    expect(confirm).toBeEnabled();
    await user.press(confirm);
    expect(onConfirm).toHaveBeenCalled();
  });
});

describe('Checkbox (upload consent)', () => {
  it('exposes checkbox semantics and toggles', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<Checkbox checked={false} onChange={onChange} label="I consent to uploading this portrait" />);
    const box = screen.getByRole('checkbox', { name: 'I consent to uploading this portrait' });
    expect(box).not.toBeChecked();
    await user.press(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('ProvenanceBadge', () => {
  it.each([
    ['demo', /sample results, not based on your photo/],
    ['device', /Estimated on this device/],
    ['ai', /approximation/],
    ['drape', /not an AI-generated try-on/],
  ] as const)('explains %s results to screen readers', async (kind, label) => {
    await render(<ProvenanceBadge kind={kind} />);
    expect(screen.getByLabelText(label)).toBeOnTheScreen();
  });
});
