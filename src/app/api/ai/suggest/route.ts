import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { checkRateLimit } from '@/lib/rate-limiter';
import { suggestRequestSchema } from '@/types/ai';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
    const rateCheck = checkRateLimit(`ai-suggest:${ip}`, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment before trying again.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateCheck.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const rawBody = await request.json().catch(() => null);
    const parseResult = suggestRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request payload', 
          details: parseResult.error.format() 
        }, 
        { status: 400 }
      );
    }

    const { prompt } = parseResult.data;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'AI suggestions are unavailable. Add OPENAI_API_KEY to your server environment to enable real-time diagram generation.',
          code: 'AI_KEY_MISSING'
        },
        { status: 503 }
      );
    }

    const openai = createOpenAI({ apiKey });
    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: `You are an AI Architecture Copilot for a whiteboard diagramming tool.
Given a user prompt, output a sequence of NDJSON line objects.
Each line must be valid JSON matching one of these schemas:
{"type":"node","data":{"id":"unique-id","label":"Label","shape":"rectangle"|"ellipse"|"cylinder","x":number,"y":number}}
{"type":"edge","data":{"id":"edge-id","label":"Label","source":"node-id-1","target":"node-id-2"}}
Only output raw JSON lines, no markdown codeblocks or extra text.`,
      prompt: `Create diagram nodes for: ${prompt}`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process AI suggestion request' }, 
      { status: 500 }
    );
  }
}
