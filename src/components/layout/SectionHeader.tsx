import { ArrowUpRight } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { TextButton } from '@/components/ui/TextButton';
import { Text } from '@/components/ui/Text';
import { colors, palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

interface SectionHeaderProps {
  /** Magazine section number, e.g. "01". */
  index?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  inverse?: boolean;
  /** Heavy ink rule under the title, as in the reference style guide. */
  ruled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ index, title, subtitle, actionLabel, onAction, inverse, ruled = true, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        <View style={styles.titleWrap}>
          {index ? (
            <Text variant="numeric" color={inverse ? palette.sky : colors.text.accent} style={styles.index}>
              {index}
            </Text>
          ) : null}
          <Text variant="h2" tone={inverse ? 'inverse' : 'primary'} accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
        </View>
        {actionLabel && onAction ? (
          <TextButton label={actionLabel} onPress={onAction} icon={ArrowUpRight} color={inverse ? palette.cream : colors.text.primary} />
        ) : null}
      </View>
      {ruled ? <View style={[styles.rule, { backgroundColor: inverse ? palette.cream : palette.navy }]} /> : null}
      {subtitle ? (
        <Text variant="bodyS" tone={inverse ? 'inverseSecondary' : 'secondary'}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[2], marginBottom: spacing[4] },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing[3] },
  titleWrap: { flexDirection: 'row', alignItems: 'baseline', gap: spacing[2], flex: 1 },
  index: { fontSize: 13 },
  title: { flexShrink: 1 },
  rule: { height: 2 },
});
