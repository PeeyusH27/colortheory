import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { EditorialHeader } from '@/components/layout/EditorialHeader';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { Divider } from '@/components/ui/Divider';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { Text } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { config } from '@/constants/config';
import { PRIVACY_SECTIONS, TERMS_SECTIONS } from '@/constants/legal';
import { spacing } from '@/theme/spacing';

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const isTerms = doc === 'terms';
  const sections = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS;
  const fullUrl = isTerms ? config.legal.termsUrl : config.legal.privacyUrl;

  return (
    <ScreenContainer scroll>
      <EditorialHeader leading="close" eyebrow={isTerms ? 'Terms of service' : 'Privacy'} title={isTerms ? 'The ground rules' : 'How we treat your portrait'} />
      {fullUrl ? (
        <TextButton label={`Read the full ${isTerms ? 'terms' : 'policy'}`} icon={ExternalLink} onPress={() => WebBrowser.openBrowserAsync(fullUrl)} />
      ) : (
        <InlineAlert tone="info" message="This is a plain-language summary of how the app behaves. Publish a reviewed policy and set its URL in the app configuration." />
      )}
      <View style={styles.sections}>
        {sections.map((s, i) => (
          <View key={s.heading} style={styles.section}>
            <Text variant="numeric" tone="accent">
              {String(i + 1).padStart(2, '0')}
            </Text>
            <Text variant="h3" accessibilityRole="header">
              {s.heading}
            </Text>
            <Text variant="bodyM" tone="secondary">
              {s.body}
            </Text>
            {i < sections.length - 1 ? <Divider /> : null}
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sections: { marginTop: spacing[6] },
  section: { gap: spacing[2] },
});
