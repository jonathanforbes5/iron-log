import { NextRequest, NextResponse } from 'next/server';
import { signToken, COOKIE_NAME, COOKIE_MAX_AGE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json() as { password?: string };

  const expected = process.env.LOGIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;

  if (!expected || !secret) {
    return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });
  }

  if (!password || password !== expected) {
    return NextResponse.json({ ok: false, error: 'Wrong password' }, { status: 401 });
  }

  const token = await signToken(secret);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return res;
}
