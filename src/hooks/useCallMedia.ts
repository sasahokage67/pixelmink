'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useCallMedia(enabled: boolean, audioOnly = false) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [preview, setPreview] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(audioOnly);
  const [sharing, setSharing] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState('');
  const activeStream = useRef<MediaStream | null>(null);
  const camera = useRef<MediaStreamTrack | null>(null);
  const screen = useRef<MediaStreamTrack | null>(null);
  const generation = useRef(0);
  const operation = useRef(false);
  const replaceVideoRef = useRef<(track: MediaStreamTrack | null) => Promise<void>>(async () => {});

  const stop = useCallback(() => {
    generation.current += 1;
    if (screen.current) {
      screen.current.onended = null;
      screen.current.stop();
      screen.current = null;
    }
    activeStream.current?.getTracks().forEach((track) => track.stop());
    camera.current?.stop();
    activeStream.current = null;
    camera.current = null;
    setStream(null);
    setPreview(null);
    setSharing(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const epoch = ++generation.current;
    const acquire = async () => {
      let result: MediaStream;
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Для камеры и микрофона нужен HTTPS или localhost.');
        let preferred = '';
        try { preferred = localStorage.getItem('pixelmink_preferred_cam_id') || ''; } catch {}
        try {
          result = await navigator.mediaDevices.getUserMedia({
            audio: true, video: audioOnly ? false : {
              ...(preferred ? { deviceId: { ideal: preferred } } : {}),
              width: { ideal: 1280 }, height: { ideal: 720 },
            },
          });
        } catch (err) {
          if (audioOnly || generation.current !== epoch) throw err;
          result = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      } catch (err) {
        if (generation.current !== epoch) return;
        setError(err instanceof Error && err.name === 'Error' ? err.message :
          'Камера или микрофон недоступны. Разрешите доступ в браузере. Можно продолжить без них.');
        result = new MediaStream();
      }
      // getUserMedia may resolve after leaving the page or StrictMode cleanup.
      if (generation.current !== epoch) {
        result.getTracks().forEach((track) => track.stop());
        return;
      }
      activeStream.current = result;
      camera.current = result.getVideoTracks()[0] || null;
      setCamOff(!camera.current);
      setMicMuted(!result.getAudioTracks().length);
      setStream(result);
      setPreview(new MediaStream(result.getTracks()));
      if (camera.current) setCameraId(camera.current.getSettings().deviceId || '');
      try {
        const found = await navigator.mediaDevices.enumerateDevices();
        if (generation.current === epoch) setDevices(found.filter((device) => device.kind === 'videoinput'));
      } catch {}
    };
    void acquire();
    return stop;
  }, [enabled, audioOnly, stop]);

  const switchCamera = useCallback(async (deviceId = '') => {
    if (operation.current || !activeStream.current) return;
    operation.current = true;
    const epoch = generation.current;
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({
        audio: false, video: deviceId ? { deviceId: { ideal: deviceId } } : true,
      });
      const track = acquired.getVideoTracks()[0];
      if (epoch !== generation.current || !track) {
        acquired.getTracks().forEach((item) => item.stop());
        return;
      }
      try {
        if (!screen.current) await replaceVideoRef.current(track);
        if (epoch !== generation.current) { track.stop(); return; }
      } catch (err) { track.stop(); throw err; }
      const previous = camera.current;
      if (previous) activeStream.current?.removeTrack(previous);
      activeStream.current?.addTrack(track);
      camera.current = track;
      previous?.stop();
      setCamOff(false);
      setCameraId(track.getSettings().deviceId || deviceId);
      if (!screen.current) setPreview(new MediaStream(activeStream.current!.getTracks()));
      try { localStorage.setItem('pixelmink_preferred_cam_id', track.getSettings().deviceId || deviceId); } catch {}
      setError('');
    } catch {
      setError('Не удалось включить камеру. Проверьте разрешения и доступность устройства.');
    } finally { operation.current = false; }
  }, []);

  const toggleCam = useCallback(async () => {
    const track = camera.current;
    if (!track || track.readyState === 'ended') { await switchCamera(); return; }
    track.enabled = !track.enabled;
    setCamOff(!track.enabled);
  }, [switchCamera]);

  const toggleMic = useCallback(() => {
    const track = activeStream.current?.getAudioTracks()[0];
    if (!track || track.readyState === 'ended') {
      setError('Микрофон недоступен. Разрешите доступ и перезайдите в звонок.');
      return;
    }
    track.enabled = !track.enabled;
    setMicMuted(!track.enabled);
  }, []);

  const stopSharing = useCallback(async () => {
    const track = screen.current;
    if (!track) return;
    screen.current = null;
    track.onended = null;
    track.stop();
    setSharing(false);
    setPreview(activeStream.current ? new MediaStream(activeStream.current.getTracks()) : null);
    try { await replaceVideoRef.current(camera.current); } catch { setError('Не удалось восстановить камеру после демонстрации.'); }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (screen.current) { await stopSharing(); return; }
    if (operation.current || !activeStream.current) return;
    operation.current = true;
    const epoch = generation.current;
    try {
      const acquired = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = acquired.getVideoTracks()[0];
      if (epoch !== generation.current || !track) { acquired.getTracks().forEach((item) => item.stop()); return; }
      try {
        await replaceVideoRef.current(track);
        if (epoch !== generation.current) { track.stop(); return; }
      } catch (err) { track.stop(); throw err; }
      screen.current = track;
      track.onended = () => { void stopSharing(); };
      setPreview(acquired);
      setSharing(true);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'NotAllowedError')) setError('Демонстрация экрана недоступна в этом браузере.');
    } finally { operation.current = false; }
  }, [stopSharing]);

  return { stream, preview, error, micMuted, camOff, sharing, devices, cameraId,
    toggleCam, toggleMic, switchCamera, toggleScreenShare, stop, replaceVideoRef };
}
