'use client';

import { ImagePlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, type ComponentProps } from 'react';

import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { toAppError } from '@/utils/errors';

import { ACCEPTED_IMAGE_TYPES, normalizeImageFile } from './normalizePortrait';
import { usePortraitStore } from './portraitStore';

type Props = Omit<ComponentProps<typeof Button>, 'onClick' | 'children' | 'loading'> & { label?: string };

/**
 * "Upload a portrait": opens the system file picker (no permission prompt needed), resizes and
 * strips metadata in the browser, then continues to confirmation. Nothing is uploaded here.
 */
export function PortraitUploadButton({ label = 'Upload a photo', icon = ImagePlus, ...buttonProps }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const setPortrait = usePortraitStore((s) => s.setPortrait);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const normalized = await normalizeImageFile(file);
      setPortrait({ ...normalized, source: 'library', capturedAt: new Date().toISOString() });
      router.push('/analyze/confirm');
    } catch (error) {
      toast.error(toAppError(error, 'invalid_image').message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <Button {...buttonProps} icon={icon} loading={busy} onClick={() => input.current?.click()}>
        {label}
      </Button>
    </>
  );
}
