import { colors, palette } from '@/theme/colors';

import { ButtonBase, type ButtonProps } from './ButtonBase';

export interface PrimaryButtonProps extends ButtonProps {
  /** `ink` on light backgrounds, `cream` on dark/inverse sections, `coral` for the hero CTA. */
  tone?: 'ink' | 'cream' | 'coral';
}

const APPEARANCES = {
  ink: {
    background: colors.action.primary,
    foreground: colors.text.onAction,
    disabledBackground: colors.action.primaryDisabled,
  },
  cream: {
    background: palette.cream,
    foreground: palette.navy,
    disabledBackground: 'rgba(247, 243, 236, 0.5)',
  },
  coral: {
    background: palette.coral,
    foreground: palette.ink,
    disabledBackground: palette.blush,
  },
} as const;

export function PrimaryButton({ tone = 'ink', ...props }: PrimaryButtonProps) {
  return <ButtonBase {...props} appearance={APPEARANCES[tone]} />;
}
