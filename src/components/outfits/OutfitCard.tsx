import { Bookmark, BookmarkCheck, Share2 } from 'lucide-react';
import Link from 'next/link';

import type { Outfit } from '@/types/outfits';

import { ProvenanceBadge } from '../ui/Badge';
import { cx } from '../ui/cx';
import { IconButton } from '../ui/IconButton';

import { DrapePreview } from './DrapePreview';
import { OutfitFlatLay } from './OutfitFlatLay';

interface OutfitCardProps {
  outfit: Outfit;
  href: string;
  /** `drape` shows the colour on the user's portrait; `flatlay` shows the illustrated outfit. */
  visual?: 'drape' | 'flatlay';
  portraitUri?: string | null;
  saved?: boolean;
  onToggleSave?: () => void;
  onShare?: () => void;
  /** Called when the card is opened (e.g. to record "recently viewed"). */
  onOpen?: () => void;
  className?: string;
}

export function OutfitCard({ outfit, href, visual = 'flatlay', portraitUri, saved = false, onToggleSave, onShare, onOpen, className }: OutfitCardProps) {
  return (
    <article className={cx('editorial-frame group flex h-full flex-col bg-paper shadow-offset-sm', className)}>
      <Link href={href} onClick={onOpen} className="flex flex-1 flex-col" aria-label={`${outfit.name}. ${outfit.category}. Open outfit details`}>
        <div className="relative">
          {visual === 'drape' ? (
            <DrapePreview hex={outfit.mainColor.hex} colorName={outfit.mainColor.name} portraitUri={portraitUri} aspect={1.2} />
          ) : (
            <OutfitFlatLay pieces={outfit.pieces} />
          )}
          {visual === 'drape' ? (
            // Drapes put colour on the user's photo, so they're labelled as non-AI previews.
            <ProvenanceBadge kind="drape" className="absolute top-2 left-2" />
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-2 border-t-[1.5px] border-navy p-4 pb-2">
          <p className="type-eyebrow flex items-center gap-2 text-muted">
            <span aria-hidden className="size-3 shrink-0 border border-navy" style={{ backgroundColor: outfit.mainColor.hex }} />
            <span className="truncate">
              {outfit.mainColor.name} · {outfit.category}
            </span>
          </p>
          <h3 className="type-h3 line-clamp-2 text-navy group-hover:underline group-hover:underline-offset-4">{outfit.name}</h3>
          <p className="type-body-s line-clamp-3 text-muted">{outfit.reason}</p>
        </div>
      </Link>
      {onToggleSave || onShare ? (
        <div className="flex gap-2 px-4 pt-1 pb-4">
          {onToggleSave ? (
            <IconButton
              icon={saved ? BookmarkCheck : Bookmark}
              label={saved ? `Remove ${outfit.name} from wardrobe` : `Save ${outfit.name} to wardrobe`}
              pressed={saved}
              onClick={onToggleSave}
              tone={saved ? 'solid' : 'outline'}
              size={40}
              iconSize={18}
            />
          ) : null}
          {onShare ? <IconButton icon={Share2} label={`Share ${outfit.name}`} onClick={onShare} tone="outline" size={40} iconSize={18} /> : null}
        </div>
      ) : null}
    </article>
  );
}
