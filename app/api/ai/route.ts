import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const { apiKey, prompt, systemPrompt } = await req.json() as {
      apiKey: string;
      prompt: string;
      systemPrompt: string;
    };

    if (!apiKey) return NextResponse.json({ error: 'No API key provided' }, { status: 400 });
    if (!prompt) return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt ?? 'You are a helpful powerbuilding coach.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    return NextResponse.json({ text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
