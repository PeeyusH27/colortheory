'use client';

import { useEffect, useRef, useState } from 'react';

import { AppError, toAppError } from '@/utils/errors';

import { captureVideoFrame } from './normalizePortrait';
import { usePortraitStore } from './portraitStore';

export type CameraStatus =
  | 'checking'
  | 'needs-permission'
  | 'starting'
  | 'ready'
  | 'denied'
  | 'unavailable'
  | 'insecure';

type Facing = 'user' | 'environment';

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * Camera state machine for /analyze. UI components stay dumb; this hook owns the permission flow,
 * the MediaStream lifecycle, capture and hand-off to the portrait store.
 *
 * The browser permission prompt only appears after the user presses "Allow camera" (unless they
 * granted it before). Nothing is captured until the shutter is pressed, the stream stops when the
 * page is hidden or left, and nothing is uploaded from here.
 */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('checking');
  const [facing, setFacing] = useState<Facing>('user');
  const [canFlip, setCanFlip] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [wanted, setWanted] = useState(false);
  const setPortrait = usePortraitStore((s) => s.setPortrait);

  // Initial check: is a camera API available, and was permission granted before?
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!window.isSecureContext) return setStatus('insecure');
      if (!navigator.mediaDevices?.getUserMedia) return setStatus('unavailable');
      try {
        const permission = await navigator.permissions?.query({ name: 'camera' as PermissionName });
        if (cancelled) return;
        if (permission?.state === 'granted') {
          setWanted(true);
          return;
        }
        if (permission?.state === 'denied') return setStatus('denied');
      } catch {
        // Firefox and older Safari don't support querying camera permission; ask on demand.
      }
      if (!cancelled) setStatus('needs-permission');
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  // Start (or restart after a flip) the stream once the user wants the camera.
  useEffect(() => {
    if (!wanted) return;
    let cancelled = false;
    const start = async () => {
      setStatus('starting');
      stopStream(streamRef.current);
      streamRef.current = null;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } },
        });
        if (cancelled) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (!cancelled) {
          setCanFlip(devices.filter((d) => d.kind === 'videoinput').length > 1);
          setStatus('ready');
        }
      } catch (error) {
        if (cancelled) return;
        const name = error instanceof DOMException ? error.name : '';
        setWanted(false);
        if (name === 'NotAllowedError' || name === 'SecurityError') setStatus('denied');
        else setStatus('unavailable');
      }
    };
    void start();
    return () => {
      cancelled = true;
    };
  }, [wanted, facing]);

  // Release the camera when the tab is hidden; resume when it returns.
  useEffect(() => {
    if (!wanted) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stopStream(streamRef.current);
        streamRef.current = null;
        setStatus('starting');
      } else if (!streamRef.current) {
        setWanted(false);
        queueMicrotask(() => setWanted(true));
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [wanted]);

  // Always stop the camera when leaving the page.
  useEffect(
    () => () => {
      stopStream(streamRef.current);
      streamRef.current = null;
    },
    [],
  );

  const flip = () => setFacing((f) => (f === 'user' ? 'environment' : 'user'));

  /** Returns true when a portrait was captured and stored. Throws AppError on failure. */
  const capture = async (): Promise<boolean> => {
    const video = videoRef.current;
    if (!video || status !== 'ready' || capturing) return false;
    setCapturing(true);
    try {
      const normalized = await captureVideoFrame(video);
      setPortrait({ ...normalized, source: 'camera', facing: facing === 'user' ? 'front' : 'back', capturedAt: new Date().toISOString() });
      stopStream(streamRef.current);
      streamRef.current = null;
      return true;
    } catch (error) {
      throw toAppError(error, 'invalid_image');
    } finally {
      setCapturing(false);
    }
  };

  const requestCamera = () => {
    if (status === 'insecure') throw new AppError('permission_denied', 'The camera needs a secure (https) connection.');
    setWanted(true);
  };

  return { videoRef, status, facing, canFlip, capturing, flip, capture, requestCamera };
}
