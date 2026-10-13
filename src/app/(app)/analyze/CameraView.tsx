'use client';

import { Camera, CameraOff, Lock, RefreshCw, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { CameraTips } from '@/components/camera/CameraTips';
import { FaceGuideOverlay } from '@/components/camera/FaceGuideOverlay';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { IconButton } from '@/components/ui/IconButton';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import { PortraitUploadButton } from '@/features/camera/PortraitUploadButton';
import { useCamera } from '@/features/camera/useCamera';
import { toAppError } from '@/utils/errors';

function Panel({ icon: Icon, title, body, children }: { icon: LucideIcon; title: string; body: ReactNode; children?: ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-cream">
      <span className="flex size-16 items-center justify-center rounded-full bg-cream/10">
        <Icon aria-hidden size={28} strokeWidth={1.6} />
      </span>
      <h2 className="type-h2">{title}</h2>
      <p className="type-body-m max-w-xs text-inverse-muted">{body}</p>
      {children ? <div className="mt-2 flex w-full max-w-xs flex-col gap-3">{children}</div> : null}
    </div>
  );
}

export function CameraView() {
  const router = useRouter();
  // Destructured: the hook returns a ref, and reading fields off that object during render would
  // look like ref access to the React Compiler.
  const { videoRef, status, facing, canFlip, capturing, flip, capture: captureFrame, requestCamera } = useCamera();
  const [flash, setFlash] = useState(0);
  const live = status === 'ready' || status === 'starting';

  const capture = async () => {
    setFlash((n) => n + 1);
    try {
      if (await captureFrame()) router.push('/analyze/confirm');
    } catch (error) {
      toast.error(toAppError(error, 'invalid_image').message);
    }
  };

  const upload = <PortraitUploadButton variant="secondary" tone="cream" fullWidth label="Upload a photo instead" />;

  return (
    <div className="page flex flex-col gap-6">
      <PageHeader
        back={{ href: '/discover', label: 'Discover' }}
        eyebrow="New analysis"
        title="Take your portrait"
        subtitle="Face soft daylight and fill the oval. Your photo stays in this browser unless you choose cloud analysis on the next step."
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <div className="flex flex-col gap-4">
          <div className="editorial-frame relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden bg-ink shadow-offset">
            {/* Kept mounted while live so the stream can attach; mirrored for the front camera. */}
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label="Camera preview"
              className={cx(
                'absolute inset-0 size-full object-cover transition-opacity duration-300',
                facing === 'user' && '-scale-x-100',
                status === 'ready' ? 'opacity-100' : 'opacity-0',
              )}
            />
            {live ? <FaceGuideOverlay active={status === 'ready'} /> : null}
            {live ? (
              <p
                aria-live="polite"
                className="type-label absolute inset-x-4 top-4 mx-auto w-fit rounded-full bg-ink/75 px-4 py-2 text-center text-cream backdrop-blur-sm">
                {status === 'ready' ? 'Face the light and look toward the camera' : 'Starting camera…'}
              </p>
            ) : null}
            {flash ? <span key={flash} aria-hidden className="pointer-events-none absolute inset-0 animate-[fade-in_450ms_ease-out_reverse_both] bg-cream" /> : null}

            {status === 'checking' ? (
              <div className="absolute inset-0 flex items-center justify-center text-cream" role="status">
                <Spinner size={28} />
                <span className="sr-only">Checking camera access…</span>
              </div>
            ) : null}
            {status === 'needs-permission' ? (
              <Panel icon={Camera} title="Allow your camera" body="We use the camera only while this page is open. Your browser will ask for permission.">
                <Button variant="accent" fullWidth onClick={requestCamera}>
                  Allow camera
                </Button>
                {upload}
              </Panel>
            ) : null}
            {status === 'denied' ? (
              <Panel
                icon={CameraOff}
                title="Camera access is off"
                body="Turn the camera on for this site in your browser’s settings (usually the camera icon in the address bar), then reload — or upload a photo instead.">
                {upload}
              </Panel>
            ) : null}
            {status === 'unavailable' ? (
              <Panel icon={CameraOff} title="Camera unavailable" body="We couldn’t find or start a camera on this device. You can still upload a portrait.">
                {upload}
              </Panel>
            ) : null}
            {status === 'insecure' ? (
              <Panel icon={Lock} title="Camera needs a secure connection" body="Browsers only allow the camera on https:// or localhost. You can still upload a portrait.">
                {upload}
              </Panel>
            ) : null}
          </div>

          {live ? (
            <div className="mx-auto flex w-full max-w-md items-center justify-between gap-4">
              <PortraitUploadButton variant="ghost" label="Upload" />
              <button
                type="button"
                onClick={() => void capture()}
                disabled={status !== 'ready' || capturing}
                aria-label="Take photo"
                className="flex size-20 items-center justify-center rounded-full border-4 border-navy bg-paper transition-transform duration-150 active:scale-95 disabled:opacity-50">
                <span className="size-15 rounded-full bg-coral" />
              </button>
              {canFlip ? (
                <IconButton icon={RefreshCw} label="Switch camera" tone="outline" onClick={flip} />
              ) : (
                <span className="w-[5.5rem]" />
              )}
            </div>
          ) : null}
        </div>
        <CameraTips className="rounded-md border-[1.5px] border-navy bg-paper p-5 sm:p-6" />
      </div>
    </div>
  );
}
