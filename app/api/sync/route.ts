import { NextRequest, NextResponse } from 'next/server';

const STATE_KEY = 'ironlog:state:v2';

// Lazily import @vercel/kv so the app still works if KV is not configured.
async function getKV() {
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const kv = await getKV();
    if (!kv) return NextResponse.json({ state: null, ok: false, reason: 'kv_unavailable' });
    const state = await kv.get(STATE_KEY);
    return NextResponse.json({ state, ok: true });
  } catch {
    return NextResponse.json({ state: null, ok: false, reason: 'error' });
  }
}

export async function POST(req: NextRequest) {
  try {
    const kv = await getKV();
    if (!kv) return NextResponse.json({ ok: false, reason: 'kv_unavailable' });
    const { state } = await req.json() as { state: unknown };
    await kv.set(STATE_KEY, state);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: 'error' });
  }
}
