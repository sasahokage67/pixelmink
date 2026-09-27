const parseTurnUrls = () => {
  const raw = process.env.NEXT_PUBLIC_TURN_URLS || process.env.NEXT_PUBLIC_TURN_URL || '';
  return raw
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
};

export function getRtcConfiguration(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
  ];

  const turnUrls = parseTurnUrls();
  const username = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrls.length > 0 && username && credential) {
    iceServers.push({ urls: turnUrls, username, credential });
  }

  return {
    iceServers,
    iceCandidatePoolSize: 4,
  };
}
