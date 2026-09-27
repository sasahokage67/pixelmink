export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const { getVercelWebSocketHub } = require('../../../../server/vercel-websocket-hub');

export function GET() {
  try {
    // Safely load @vercel/functions if available in Vercel environment
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vercelFunctions = require('@vercel/functions');
    if (typeof vercelFunctions?.experimental_upgradeWebSocket === 'function') {
      return vercelFunctions.experimental_upgradeWebSocket((ws: any) => {
        getVercelWebSocketHub().attach(ws);
      });
    }
  } catch {
    // Standalone Node / local environment without @vercel/functions
  }
  return new Response('WebSocket upgrade requires Vercel serverless environment', { status: 426 });
}
