import { NextResponse } from 'next/server';

interface CanvasShapeInput {
  id?: string;
  type?: string;
  props?: {
    geo?: string;
    text?: string;
    w?: number;
    h?: number;
    start?: { boundShapeId?: string };
    end?: { boundShapeId?: string };
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const roomId = body?.roomId || 'default-room';
    const shapes: CanvasShapeInput[] = body?.shapes || [];
    const format = body?.format || 'mermaid';

    const nodeLines: string[] = [];
    const edgeLines: string[] = [];
    const shapeIdToNodeId = new Map<string, string>();
    let nodeIndex = 1;

    // 1. Process all geometric, text, and note shapes into Mermaid nodes
    shapes.forEach((s) => {
      if ((s.type === 'geo' || s.type === 'text' || s.type === 'note') && s.id) {
        const nodeId = `N${nodeIndex++}`;
        shapeIdToNodeId.set(s.id, nodeId);

        const rawText = s.props?.text?.trim() || (s.type === 'text' ? 'Text' : 'Component');
        const cleanText = rawText.replace(/[[\](){}"]/g, '');

        let shapeSyntax = `[${cleanText}]`;
        if (s.props?.geo === 'ellipse' || s.props?.geo === 'cylinder') {
          shapeSyntax = s.props.geo === 'cylinder' ? `[(${cleanText})]` : `((${cleanText}))`;
        } else if (s.props?.geo === 'rhombus') {
          shapeSyntax = `{${cleanText}}`;
        }

        nodeLines.push(`    ${nodeId}${shapeSyntax}`);
      }
    });

    // 2. Process arrow connections using actual bound shape references
    shapes.forEach((s) => {
      if (s.type === 'arrow') {
        const sourceShapeId = s.props?.start?.boundShapeId;
        const targetShapeId = s.props?.end?.boundShapeId;

        if (
          sourceShapeId &&
          targetShapeId &&
          shapeIdToNodeId.has(sourceShapeId) &&
          shapeIdToNodeId.has(targetShapeId)
        ) {
          const sourceNode = shapeIdToNodeId.get(sourceShapeId)!;
          const targetNode = shapeIdToNodeId.get(targetShapeId)!;
          const label = s.props?.text?.trim() ? `|${s.props.text.trim()}|` : '';
          edgeLines.push(`    ${sourceNode} -->${label} ${targetNode}`);
        }
      }
    });

    // Fallback template if diagram has no connected shapes
    if (nodeLines.length === 0) {
      nodeLines.push('    A[Client App] --> B(API Gateway)');
      nodeLines.push('    B --> C[(PostgreSQL DB)]');
    }

    const mermaidCode = `graph TD\n${nodeLines.join('\n')}${
      edgeLines.length > 0 ? '\n' + edgeLines.join('\n') : ''
    }`;

    return NextResponse.json({
      success: true,
      format,
      roomId,
      shapeCount: shapes.length,
      mermaidCode,
    });
  } catch (error) {
    console.error('Export canvas error:', error);
    return NextResponse.json({ error: 'Failed to export canvas' }, { status: 500 });
  }
}
