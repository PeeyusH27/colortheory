import { colors, palette } from '@/theme/colors';

import { ButtonBase, type ButtonProps } from './ButtonBase';

export interface SecondaryButtonProps extends ButtonProps {
  /** `ink` outline on light surfaces, `cream` outline on dark ones, `destructive` for deletes. */
  tone?: 'ink' | 'cream' | 'destructive';
}

const APPEARANCES = {
  ink: {
    background: 'transparent',
    foreground: colors.text.primary,
    borderColor: colors.action.secondaryBorder,
    disabledForeground: colors.text.tertiary,
  },
  cream: {
    background: 'transparent',
    foreground: palette.cream,
    borderColor: 'rgba(247, 243, 236, 0.6)',
    disabledForeground: 'rgba(247, 243, 236, 0.5)',
  },
  destructive: {
    background: 'transparent',
    foreground: colors.status.error,
    borderColor: colors.status.error,
    disabledForeground: colors.text.tertiary,
  },
} as const;

export function SecondaryButton({ tone = 'ink', ...props }: SecondaryButtonProps) {
  return <ButtonBase {...props} appearance={APPEARANCES[tone]} />;
}
