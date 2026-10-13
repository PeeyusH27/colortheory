import type { Outfit } from '@/types/outfits';

/**
 * Sharing never uploads anything. Text shares use the Web Share API where available (mobile
 * browsers, Safari) and fall back to copying to the clipboard. Returns what happened so the UI can
 * confirm it ("Copied").
 */
export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'unavailable';

async function shareText(title: string, text: string): Promise<ShareOutcome> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Fall through to the clipboard (e.g. share not allowed in this context).
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'unavailable';
  }
}

export function shareOutfit(outfit: Pick<Outfit, 'name' | 'mainColor' | 'pieces'>) {
  const swatches = outfit.pieces.map((p) => `${p.colorName} ${p.hex}`).join(' · ');
  return shareText(outfit.name, `${outfit.name}\n${swatches}\n\nFound with ColorTheory — discover the colors that are yours.`);
}

export function sharePalette(name: string, colors: { name: string; hex: string }[]) {
  return shareText(name, `${name}\n${colors.map((c) => `${c.name} ${c.hex}`).join('\n')}\n\nMy ColorTheory palette.`);
}

/**
 * Shares a generated preview image (a short-lived signed URL). Downloads it into memory and shares
 * the file where the browser supports file sharing; otherwise saves it as a download.
 */
export async function shareRemoteImage(url: string, filename: string): Promise<ShareOutcome | 'downloaded'> {
  const response = await fetch(url);
  if (!response.ok) return 'unavailable';
  const blob = await response.blob();
  const file = new File([blob], filename, { type: blob.type || 'image/png' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'ColorTheory preview' });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  return 'downloaded';
}
