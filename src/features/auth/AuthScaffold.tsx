import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Blob } from '@/components/brand/Blob';
import { EditorialHeader } from '@/components/layout/EditorialHeader';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

interface AuthScaffoldProps {
  eyebrow: string;
  title: string;
  deck?: string;
  children: ReactNode;
  footer?: ReactNode;
  accent?: string;
}

/**
 * Shared layout for sign-in / sign-up / reset screens: restrained and form-first, with a single
 * colour blob as the only maximalist gesture so the inputs stay the focus.
 */
export function AuthScaffold({ eyebrow, title, deck, children, footer, accent = palette.sky }: AuthScaffoldProps) {
  return (
    <ScreenContainer scroll keyboardAware footer={footer} contentContainerStyle={styles.content}>
      <View style={styles.blob} pointerEvents="none">
        <Blob seed={title.length * 7 + 3} color={accent} size={220} />
      </View>
      <EditorialHeader leading="back" eyebrow={eyebrow} title={title} deck={deck} />
      <View style={styles.body}>{children}</View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing[8] },
  blob: { position: 'absolute', top: -40, right: -70, opacity: 0.55 },
  body: { gap: spacing[5], marginTop: spacing[2] },
});
