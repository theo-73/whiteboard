import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { checkRateLimit } from '@/lib/rate-limiter';
import { architectureAssistRequestSchema } from '@/types/ai';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
    const rateCheck = checkRateLimit(`ai-assist:${ip}`, 30, 60000);
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
    const parseResult = architectureAssistRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { shapes } = parseResult.data;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Architecture Assist is unavailable. Add OPENAI_API_KEY to your server environment to enable deep diagram reviews.',
          code: 'AI_KEY_MISSING'
        },
        { status: 503 }
      );
    }

    // Map shape IDs to their labels
    const shapeLabelMap = new Map<string, string>();
    const nodeLabels: string[] = [];

    shapes.forEach((s) => {
      if ((s.type === 'geo' || s.type === 'text' || s.type === 'note') && s.id) {
        const props = s.props as { text?: string } | undefined;
        const text = props?.text?.trim();
        const label = text || (s.type === 'text' ? 'Text Component' : 'Component');
        shapeLabelMap.set(s.id, label);
        if (text) {
          nodeLabels.push(text);
        }
      }
    });

    // Extract arrow connection relationships
    const connectionPairs: string[] = [];
    shapes.forEach((s) => {
      if (s.type === 'arrow') {
        const props = s.props as { start?: { boundShapeId?: string }; end?: { boundShapeId?: string } } | undefined;
        const sourceId = props?.start?.boundShapeId;
        const targetId = props?.end?.boundShapeId;
        if (sourceId && targetId && shapeLabelMap.has(sourceId) && shapeLabelMap.has(targetId)) {
          connectionPairs.push(`${shapeLabelMap.get(sourceId)} → ${shapeLabelMap.get(targetId)}`);
        }
      }
    });

    let contextText = nodeLabels.length > 0
      ? `Existing architecture components on canvas: ${nodeLabels.join(', ')}.`
      : 'Canvas is currently blank or contains unlabelled shapes.';

    if (connectionPairs.length > 0) {
      contextText += ` Active connections: ${connectionPairs.join('; ')}.`;
    }

    const openai = createOpenAI({ apiKey });
    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: `You are an expert Systems Architect AI. Analyze the user's software architecture diagram.
Output NDJSON line objects representing architectural recommendations and improvements.
Each line must match:
{"id":"rec-1","category":"missing_component"|"api_suggestion"|"dbms_guidance"|"scalability_tip","priority":"CRITICAL"|"HIGH"|"MEDIUM","title":"Title","description":"Detailed explanation","suggestedNode":{"label":"New Node","shape":"rectangle"|"ellipse"|"cylinder"}}
Only output valid JSON lines.`,
      prompt: `Analyze this architecture and suggest improvements:\n${contextText}`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process architecture review request' }, 
      { status: 500 }
    );
  }
}
