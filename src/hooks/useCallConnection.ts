'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeSocket } from '@/lib/realtime-socket';
import { CallConnection, CallStatus } from '@/lib/call-connection';
import { getRtcConfiguration } from '@/lib/webrtc';

export function useCallConnection(socket: RealtimeSocket | null, roomId: string, stream: MediaStream | null,
  enabled: boolean, userName: string, userId?: string) {
  const controller = useRef<CallConnection | null>(null);
  const identity = useRef({ userName, userId });
  identity.current = { userName, userId };
  const [status, setStatus] = useState<CallStatus>('waiting');
  const [error, setError] = useState('');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remotePeerName, setRemotePeerName] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !stream || !enabled) return;
    const connection = new CallConnection({
      socket, roomId, stream, ...identity.current, configuration: getRtcConfiguration(),
      onStatus: setStatus, onError: setError, onRemoteStream: setRemoteStream,
      onPeer: (peer) => setRemotePeerName(peer?.userName || null),
    });
    controller.current = connection;
    connection.start();
    const connectError = () => {
      setStatus('reconnecting');
      setError('Сервер звонков недоступен. Проверьте подключение к интернету.');
    };
    socket.on('connect_error', connectError);
    return () => {
      socket.off('connect_error', connectError);
      connection.stop();
      if (controller.current === connection) controller.current = null;
    };
  }, [socket, roomId, stream, enabled]);

  const replaceVideo = useCallback(async (track: MediaStreamTrack | null) => {
    await controller.current?.replaceVideo(track);
  }, []);
  const stopConnection = useCallback(() => controller.current?.stop(), []);
  return { remoteStream, remotePeerName, status, connectionError: error,
    isPeerConnected: status === 'connected', replaceVideo, stopConnection };
}
