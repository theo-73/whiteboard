import { z } from 'zod';

export interface StreamNode {
  id: string;
  label: string;
  shape?: 'rectangle' | 'ellipse' | 'cylinder';
  x?: number;
  y?: number;
}

export interface StreamEdge {
  id?: string;
  label?: string;
  source: string;
  target: string;
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

// Zod schemas for runtime boundary validation
export const nodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  shape: z.enum(['rectangle', 'ellipse', 'cylinder']).default('rectangle'),
  x: z.number().optional(),
  y: z.number().optional(),
});

export const edgeSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  source: z.string(),
  target: z.string(),
});

export const diagramSchema = z.object({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});

export const suggestRequestSchema = z.object({
  prompt: z.string().trim().min(1, 'Prompt cannot be empty'),
});

export const canvasShapeInputSchema = z.object({
  id: z.string().optional(),
  type: z.string().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
});

export const architectureAssistRequestSchema = z.object({
  shapes: z.array(canvasShapeInputSchema).default([]),
});
