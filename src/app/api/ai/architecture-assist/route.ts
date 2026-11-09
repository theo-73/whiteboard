import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { checkRateLimit } from '@/lib/rate-limiter';

interface CanvasShapeInput {
  id?: string;
  type?: string;
  props?: {
    geo?: string;
    text?: string;
    start?: { boundShapeId?: string };
    end?: { boundShapeId?: string };
  };
}

export interface ArchitectureRecommendation {
  id: string;
  category: 'missing_component' | 'api_suggestion' | 'dbms_guidance' | 'scalability_tip';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  description: string;
  suggestedNode?: {
    label: string;
    shape: 'rectangle' | 'ellipse' | 'cylinder';
    connectTo?: string;
  };
}

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

    const body = await request.json();
    const shapes: CanvasShapeInput[] = body?.shapes || [];
    const apiKey = body?.apiKey || process.env.OPENAI_API_KEY;

    // Map shape IDs to their labels
    const shapeLabelMap = new Map<string, string>();
    const nodeLabels: string[] = [];

    shapes.forEach((s) => {
      if ((s.type === 'geo' || s.type === 'text' || s.type === 'note') && s.id) {
        const label = s.props?.text?.trim() || (s.type === 'text' ? 'Text Component' : 'Component');
        shapeLabelMap.set(s.id, label);
        if (s.props?.text?.trim()) {
          nodeLabels.push(s.props.text.trim());
        }
      }
    });

    // Extract arrow connection relationships
    const connectionPairs: string[] = [];
    shapes.forEach((s) => {
      if (s.type === 'arrow') {
        const sourceId = s.props?.start?.boundShapeId;
        const targetId = s.props?.end?.boundShapeId;
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

    if (apiKey) {
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
    }

    // Default intelligent Architecture Assist streaming fallback
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendChunk = async (chunk: ArchitectureRecommendation) => {
          controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
          await new Promise((resolve) => setTimeout(resolve, 350));
        };

        const labelsLower = nodeLabels.map((l) => l.toLowerCase()).join(' ');

        // 1. Check for missing Cache / Redis
        if (!labelsLower.includes('redis') && !labelsLower.includes('cache')) {
          await sendChunk({
            id: 'rec-cache',
            category: 'missing_component',
            priority: 'HIGH',
            title: 'Add Redis In-Memory Caching Layer',
            description: 'Your database queries will benefit from a Redis cache layer to reduce load and cut p99 latency under heavy traffic.',
            suggestedNode: {
              label: 'Redis Cache',
              shape: 'ellipse',
            },
          });
        }

        // 2. Check for missing Load Balancer / API Gateway
        if (!labelsLower.includes('gateway') && !labelsLower.includes('load balancer') && !labelsLower.includes('ingress')) {
          await sendChunk({
            id: 'rec-gateway',
            category: 'api_suggestion',
            priority: 'CRITICAL',
            title: 'Deploy API Gateway / Reverse Proxy',
            description: 'Direct client access to backend services exposes internal ports. Introduce an NGINX or AWS ALB API Gateway for SSL termination, rate-limiting, and routing.',
            suggestedNode: {
              label: 'API Gateway',
              shape: 'rectangle',
            },
          });
        }

        // 3. Database DBMS guidance
        if (!labelsLower.includes('db') && !labelsLower.includes('postgres') && !labelsLower.includes('database')) {
          await sendChunk({
            id: 'rec-db',
            category: 'dbms_guidance',
            priority: 'CRITICAL',
            title: 'Configure Primary Database & Read Replicas',
            description: 'Add a persistent PostgreSQL cluster with automated WAL archival and read-replicas for high-availability database operations.',
            suggestedNode: {
              label: 'Postgres DB (Primary)',
              shape: 'cylinder',
            },
          });
        } else {
          await sendChunk({
            id: 'rec-db-replica',
            category: 'dbms_guidance',
            priority: 'MEDIUM',
            title: 'Implement Read-Replica Partitioning',
            description: 'Offload analytical queries and read traffic to async read-replicas to protect write throughput on the primary node.',
          });
        }

        // 4. Message Queue / Async Worker
        if (!labelsLower.includes('kafka') && !labelsLower.includes('queue') && !labelsLower.includes('rabbitmq')) {
          await sendChunk({
            id: 'rec-queue',
            category: 'scalability_tip',
            priority: 'HIGH',
            title: 'Decouple Heavy Operations via Message Queue',
            description: 'Use a message broker (Kafka or RabbitMQ) for background tasks like email notifications, PDF rendering, and webhook processing.',
            suggestedNode: {
              label: 'Kafka / RabbitMQ Queue',
              shape: 'ellipse',
            },
          });
        }

        // 5. Monitoring & Observability
        await sendChunk({
          id: 'rec-observability',
          category: 'scalability_tip',
          priority: 'MEDIUM',
          title: 'Integrate OpenTelemetry & Prometheus Metrics',
          description: 'Export distributed traces and RED/USE metrics to Grafana for end-to-end request visibility across microservices.',
          suggestedNode: {
            label: 'Prometheus & Grafana',
            shape: 'rectangle',
          },
        });

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
    console.error('Architecture Assist route error:', error);
    return NextResponse.json({ error: 'Failed to generate architecture recommendations' }, { status: 500 });
  }
}
