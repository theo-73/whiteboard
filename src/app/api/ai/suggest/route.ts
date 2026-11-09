import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { checkRateLimit } from '@/lib/rate-limiter';
import { z } from 'zod';

export const nodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  shape: z.enum(['rectangle', 'ellipse', 'cylinder']),
  x: z.number().optional(),
  y: z.number().optional(),
});

export const edgeSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  source: z.string(),
  target: z.string(),
});

export const diagramSchema = z.object({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});

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

    const body = await request.json();
    const prompt = body?.prompt || '';
    const apiKey = body?.apiKey || process.env.OPENAI_API_KEY;

    if (apiKey) {
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
    }

    // Default structured NDJSON streaming engine
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendChunk = async (chunk: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
          await new Promise((resolve) => setTimeout(resolve, 300));
        };

        const type = prompt.toLowerCase();
        
        if (type.includes('auth')) {
          await sendChunk({ type: 'node', data: { id: 'auth-1', label: 'Client App', shape: 'rectangle', x: 100, y: 100 } });
          await sendChunk({ type: 'node', data: { id: 'auth-2', label: 'Auth Server', shape: 'rectangle', x: 400, y: 100 } });
          await sendChunk({ type: 'edge', data: { id: 'e-1', label: 'Login Request', source: 'auth-1', target: 'auth-2' } });
        } else if (type.includes('aws') || type.includes('serverless')) {
          await sendChunk({ type: 'node', data: { id: 'aws-1', label: 'CloudFront CDN', shape: 'rectangle', x: 100, y: 150 } });
          await sendChunk({ type: 'node', data: { id: 'aws-2', label: 'API Gateway', shape: 'rectangle', x: 350, y: 150 } });
          await sendChunk({ type: 'node', data: { id: 'aws-3', label: 'AWS Lambda (Fn)', shape: 'ellipse', x: 600, y: 100 } });
          await sendChunk({ type: 'node', data: { id: 'aws-4', label: 'DynamoDB Table', shape: 'cylinder', x: 850, y: 150 } });
          await sendChunk({ type: 'edge', data: { id: 'e-aws-1', label: 'HTTPS', source: 'aws-1', target: 'aws-2' } });
          await sendChunk({ type: 'edge', data: { id: 'e-aws-2', label: 'Invoke', source: 'aws-2', target: 'aws-3' } });
          await sendChunk({ type: 'edge', data: { id: 'e-aws-3', label: 'Read/Write', source: 'aws-3', target: 'aws-4' } });
        } else if (type.includes('k8s') || type.includes('kubernetes')) {
          await sendChunk({ type: 'node', data: { id: 'k8s-1', label: 'Ingress Controller', shape: 'rectangle', x: 100, y: 200 } });
          await sendChunk({ type: 'node', data: { id: 'k8s-2', label: 'Frontend Pod', shape: 'rectangle', x: 380, y: 100 } });
          await sendChunk({ type: 'node', data: { id: 'k8s-3', label: 'Backend Pod', shape: 'rectangle', x: 380, y: 300 } });
          await sendChunk({ type: 'node', data: { id: 'k8s-4', label: 'StatefulSet DB', shape: 'cylinder', x: 680, y: 200 } });
          await sendChunk({ type: 'edge', data: { id: 'e-k8s-1', label: 'Traffic', source: 'k8s-1', target: 'k8s-2' } });
          await sendChunk({ type: 'edge', data: { id: 'e-k8s-2', label: 'gRPC', source: 'k8s-2', target: 'k8s-3' } });
          await sendChunk({ type: 'edge', data: { id: 'e-k8s-3', label: 'Persist', source: 'k8s-3', target: 'k8s-4' } });
        } else if (type.includes('kafka') || type.includes('event')) {
          await sendChunk({ type: 'node', data: { id: 'kaf-1', label: 'Event Producer', shape: 'rectangle', x: 100, y: 200 } });
          await sendChunk({ type: 'node', data: { id: 'kaf-2', label: 'Kafka Broker / Queue', shape: 'ellipse', x: 400, y: 200 } });
          await sendChunk({ type: 'node', data: { id: 'kaf-3', label: 'Consumer (Analytics)', shape: 'rectangle', x: 700, y: 100 } });
          await sendChunk({ type: 'node', data: { id: 'kaf-4', label: 'Consumer (Notification)', shape: 'rectangle', x: 700, y: 300 } });
          await sendChunk({ type: 'edge', data: { id: 'e-kaf-1', label: 'Publish Event', source: 'kaf-1', target: 'kaf-2' } });
          await sendChunk({ type: 'edge', data: { id: 'e-kaf-2', label: 'Subscribe', source: 'kaf-2', target: 'kaf-3' } });
          await sendChunk({ type: 'edge', data: { id: 'e-kaf-3', label: 'Subscribe', source: 'kaf-2', target: 'kaf-4' } });
        } else if (type.includes('api') || type.includes('microservice')) {
          await sendChunk({ type: 'node', data: { id: 'api-1', label: 'API Gateway', shape: 'rectangle', x: 200, y: 100 } });
          await sendChunk({ type: 'node', data: { id: 'api-2', label: 'User Service', shape: 'rectangle', x: 100, y: 300 } });
          await sendChunk({ type: 'node', data: { id: 'api-3', label: 'Product Service', shape: 'rectangle', x: 300, y: 300 } });
          await sendChunk({ type: 'edge', data: { id: 'e-1', label: 'Route', source: 'api-1', target: 'api-2' } });
          await sendChunk({ type: 'edge', data: { id: 'e-2', label: 'Route', source: 'api-1', target: 'api-3' } });
        } else if (type.includes('database') || type.includes('schema')) {
          await sendChunk({ type: 'node', data: { id: 'db-1', label: 'Users Table', shape: 'cylinder', x: 100, y: 200 } });
          await sendChunk({ type: 'node', data: { id: 'db-2', label: 'Posts Table', shape: 'cylinder', x: 400, y: 200 } });
          await sendChunk({ type: 'edge', data: { id: 'e-db', label: '1:N Relation', source: 'db-1', target: 'db-2' } });
        } else {
          await sendChunk({ type: 'node', data: { id: 'sys-1', label: 'Frontend App', shape: 'rectangle', x: 100, y: 200 } });
          await sendChunk({ type: 'node', data: { id: 'sys-2', label: 'Backend API', shape: 'rectangle', x: 400, y: 200 } });
          await sendChunk({ type: 'node', data: { id: 'sys-3', label: 'Database', shape: 'ellipse', x: 700, y: 200 } });
          await sendChunk({ type: 'edge', data: { id: 'e-sys-1', label: 'HTTP/REST', source: 'sys-1', target: 'sys-2' } });
          await sendChunk({ type: 'edge', data: { id: 'e-sys-2', label: 'SQL Query', source: 'sys-2', target: 'sys-3' } });
        }

        await sendChunk({ type: 'complete', data: null });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (error) {
    console.error('AI suggest route error:', error);
    return NextResponse.json({ error: 'Failed to process AI suggestion request' }, { status: 500 });
  }
}
