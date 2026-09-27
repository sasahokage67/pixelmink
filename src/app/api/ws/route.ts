import { experimental_upgradeWebSocket } from '@vercel/functions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const { getVercelWebSocketHub } = require('../../../../server/vercel-websocket-hub');

export function GET() {
  return experimental_upgradeWebSocket((ws) => {
    getVercelWebSocketHub().attach(ws);
  });
}
