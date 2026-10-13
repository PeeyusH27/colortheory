// Import each weight from its own subpath so Metro only bundles the files we actually use
// (the package index would pull in every weight of every family).
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono/400Regular';
import { DMMono_500Medium } from '@expo-google-fonts/dm-mono/500Medium';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display/400Regular';
import { PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display/400Regular_Italic';
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display/600SemiBold';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import { PlayfairDisplay_700Bold_Italic } from '@expo-google-fonts/playfair-display/700Bold_Italic';
import { PlayfairDisplay_900Black } from '@expo-google-fonts/playfair-display/900Black';

import type { FontFamilyToken } from './typography';

/** Map passed to `useFonts`. Keys must match `fontFamilies` in typography.ts. */
export const fontAssets: Record<FontFamilyToken, number> = {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
  PlayfairDisplay_900Black,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  DMMono_400Regular,
  DMMono_500Medium,
};

/** If fonts have not resolved after this long, render with system fonts rather than wait. */
export const FONT_LOAD_TIMEOUT_MS = 4000;
