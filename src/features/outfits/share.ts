import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

import type { Outfit } from '@/types/outfits';

/**
 * Sharing never uploads anything: text shares go through the OS share sheet, and generated
 * previews are downloaded from their short-lived signed URL to the cache first.
 */
export async function shareOutfit(outfit: Pick<Outfit, 'name' | 'mainColor' | 'pieces'>) {
  const swatches = outfit.pieces.map((p) => `${p.colorName} ${p.hex}`).join(' · ');
  await Share.share({
    title: outfit.name,
    message: `${outfit.name}\n${swatches}\n\nFound with ColorTheory — discover the colors that are yours.`,
  });
}

export async function sharePalette(name: string, colors: { name: string; hex: string }[]) {
  await Share.share({
    title: name,
    message: `${name}\n${colors.map((c) => `${c.name} ${c.hex}`).join('\n')}\n\nMy ColorTheory palette.`,
  });
}

export async function shareRemoteImage(url: string, filename: string) {
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
    await Share.share({ url, message: url });
    return;
  }
  const target = new File(Paths.cache, filename);
  if (target.exists) target.delete();
  const file = await File.downloadFileAsync(url, target);
  try {
    await Sharing.shareAsync(file.uri, { mimeType: 'image/png', dialogTitle: 'Share preview' });
  } finally {
    // Temporary copy for the share sheet only.
    if (file.exists) file.delete();
  }
}
