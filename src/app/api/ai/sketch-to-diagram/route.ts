import { NextResponse } from 'next/server';
import { classifyStrokesToShapes, type StrokeInput } from '@/lib/sketch-analysis';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
    const rateCheck = checkRateLimit(`sketch-to-diagram:${ip}`, 45, 60000);
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

    const body = await request.json();
    const strokes: StrokeInput[] = body?.strokes || [];
    const context = body?.context || 'Architecture sketch';

    const result = classifyStrokesToShapes(strokes, context);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Sketch-to-diagram error:', error);
    return NextResponse.json({ error: 'Failed to process sketch vectorization' }, { status: 500 });
  }
}
