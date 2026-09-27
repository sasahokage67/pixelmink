const isLoopback = (hostname: string) => ['localhost', '127.0.0.1', '[::1]'].includes(hostname);

export function resolveSocketEndpoint(configured: string | undefined, origin: string): string | undefined {
  if (!configured?.trim()) return undefined; // Socket.IO uses the current origin.
  try {
    const endpoint = new URL(configured, origin);
    const page = new URL(origin);
    if (!['http:', 'https:'].includes(endpoint.protocol)) return undefined;
    // The checked-in development .env points at localhost. On another device,
    // localhost is THAT device, not the application's signaling server.
    if (isLoopback(endpoint.hostname) && !isLoopback(page.hostname)) return undefined;
    if (page.protocol === 'https:' && endpoint.protocol !== 'https:') return undefined;
    return endpoint.href;
  } catch {
    return undefined;
  }
}
