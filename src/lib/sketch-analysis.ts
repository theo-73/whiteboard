import { getStroke } from 'perfect-freehand';

export interface StrokeInput {
  id?: string;
  points: Array<[number, number]>;
}

export interface StrokeBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isClosed: boolean;
  points: Array<[number, number]>;
}

export function analyzeStroke(stroke: StrokeInput): StrokeBoundingBox | null {
  if (!stroke.points || stroke.points.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const firstPt = stroke.points[0];
  const lastPt = stroke.points[stroke.points.length - 1];

  stroke.points.forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const endToStartDist = Math.hypot(lastPt[0] - firstPt[0], lastPt[1] - firstPt[1]);
  const isClosed = endToStartDist < 45 || endToStartDist < Math.min(width, height) * 0.4;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    startX: firstPt[0],
    startY: firstPt[1],
    endX: lastPt[0],
    endY: lastPt[1],
    isClosed,
    points: stroke.points,
  };
}

export function classifyStrokesToShapes(
  strokes: StrokeInput[],
  contextStr: string = 'architecture sketch'
): {
  vectorizedCount: number;
  shapes: Array<Record<string, unknown>>;
} {
  const context = (contextStr || '').toLowerCase();

  // Vectorize strokes with perfect-freehand for quality verification
  const vectorizedStrokes = strokes.map((s) => {
    if (!s.points || s.points.length === 0) return [];
    return getStroke(s.points, { size: 8, thinning: 0.5, smoothing: 0.5 });
  });

  const analyzedList = strokes
    .map(analyzeStroke)
    .filter((b): b is StrokeBoundingBox => b !== null);

  if (analyzedList.length === 0) {
    return {
      vectorizedCount: 0,
      shapes: [],
    };
  }

  const generatedShapes: Array<Record<string, unknown>> = [];
  const nodeBoxes: StrokeBoundingBox[] = [];
  const arrowStrokes: StrokeBoundingBox[] = [];

  // Classify strokes into container nodes vs connector arrows
  analyzedList.forEach((box) => {
    const aspectRatio = box.width > box.height ? box.width / box.height : box.height / box.width;
    const isLinear = !box.isClosed && (aspectRatio > 3.0 || (box.width < 35 || box.height < 35));

    if (isLinear && (box.width > 50 || box.height > 50)) {
      arrowStrokes.push(box);
    } else {
      nodeBoxes.push(box);
    }
  });

  // If all strokes were linear or none, treat the first as a node
  if (nodeBoxes.length === 0 && arrowStrokes.length > 0) {
    nodeBoxes.push(...arrowStrokes.splice(0, 1));
  }

  let nodeIndex = 1;
  const defaultLabels = [
    'Client App', 'API Gateway', 'Core Service', 'Worker Pod', 'Cache Store'
  ];

  interface NodeMeta {
    id: string;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    w: number;
    h: number;
  }
  const createdNodes: NodeMeta[] = [];

  nodeBoxes.forEach((node) => {
    const isCircular = Math.abs(node.width - node.height) < Math.max(30, Math.min(node.width, node.height) * 0.35);
    const isDb = context.includes('database') || context.includes('db') || (node.width > 80 && node.height > 60 && Math.abs(node.width - node.height) < 40 && node.isClosed);

    let geoType = 'rectangle';
    let label = defaultLabels[(nodeIndex - 1) % defaultLabels.length];

    if (isDb && nodeIndex > 1) {
      geoType = 'ellipse';
      label = 'Postgres DB';
    } else if (isCircular) {
      geoType = 'ellipse';
      label = nodeIndex === 1 ? 'Client' : 'Service';
    }

    const w = Math.max(140, Math.round(node.width));
    const h = Math.max(80, Math.round(node.height));
    const nodeId = `shape:sketch_${nodeIndex}_${Math.random().toString(36).substring(2, 7)}`;
    const posX = Math.round(node.minX);
    const posY = Math.round(node.minY);

    createdNodes.push({
      id: nodeId,
      minX: posX,
      minY: posY,
      maxX: posX + w,
      maxY: posY + h,
      w,
      h,
    });

    generatedShapes.push({
      id: nodeId,
      type: 'geo',
      x: posX,
      y: posY,
      props: {
        geo: geoType,
        w,
        h,
        text: label,
        color: nodeIndex % 3 === 1 ? 'violet' : nodeIndex % 3 === 2 ? 'blue' : 'green',
        fill: 'semi',
        dash: 'draw',
      },
    });

    nodeIndex++;
  });

  // Helper to find closest node to a point for arrow snap binding
  const findClosestNode = (px: number, py: number, threshold = 65): NodeMeta | null => {
    let closest: NodeMeta | null = null;
    let minDist = Infinity;

    createdNodes.forEach((n) => {
      const clampedX = Math.max(n.minX, Math.min(px, n.maxX));
      const clampedY = Math.max(n.minY, Math.min(py, n.maxY));
      const dist = Math.hypot(px - clampedX, py - clampedY);

      if (dist < minDist && dist <= threshold) {
        minDist = dist;
        closest = n;
      }
    });

    return closest;
  };

  // Generate arrow connector shapes with snapping bindings
  arrowStrokes.forEach((arrow) => {
    const startNode = findClosestNode(arrow.startX, arrow.startY);
    const endNode = findClosestNode(arrow.endX, arrow.endY);

    const startBinding = startNode
      ? {
          type: 'binding',
          boundShapeId: startNode.id,
          normalizedAnchor: {
            x: Math.max(0, Math.min(1, (arrow.startX - startNode.minX) / startNode.w)),
            y: Math.max(0, Math.min(1, (arrow.startY - startNode.minY) / startNode.h)),
          },
          isExact: false,
        }
      : { x: 0, y: 0 };

    const endBinding = endNode
      ? {
          type: 'binding',
          boundShapeId: endNode.id,
          normalizedAnchor: {
            x: Math.max(0, Math.min(1, (arrow.endX - endNode.minX) / endNode.w)),
            y: Math.max(0, Math.min(1, (arrow.endY - endNode.minY) / endNode.h)),
          },
          isExact: false,
        }
      : { x: Math.round(arrow.endX - arrow.startX), y: Math.round(arrow.endY - arrow.startY) };

    generatedShapes.push({
      type: 'arrow',
      x: Math.round(arrow.startX),
      y: Math.round(arrow.startY),
      props: {
        start: startBinding,
        end: endBinding,
        color: 'violet',
        dash: 'draw',
      },
    });
  });

  return {
    vectorizedCount: vectorizedStrokes.length,
    shapes: generatedShapes,
  };
}
