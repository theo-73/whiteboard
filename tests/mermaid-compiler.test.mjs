import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAndCompileMermaid } from '../src/lib/mermaid-compiler.ts';

test('Mermaid Compiler - Basic LR Flowchart Parsing', () => {
  const mermaid = `
    flowchart LR
    client[Frontend Client] --> api[API Gateway]
    api --> service[Auth Service]
    service --> db[(User Database)]
  `;

  const result = parseAndCompileMermaid(mermaid, { x: 500, y: 300 });

  assert.equal(result.nodes.length, 4, 'Should parse 4 nodes');
  assert.equal(result.edges.length, 3, 'Should parse 3 edges');

  const dbNode = result.nodes.find((n) => n.id === 'db');
  assert.ok(dbNode, 'db node should exist');
  assert.equal(dbNode.shape, 'cylinder', '[(...)] syntax should produce a cylinder/database');
  assert.equal(dbNode.label, 'User Database');

  const clientNode = result.nodes.find((n) => n.id === 'client');
  assert.ok(clientNode, 'client node should exist');
  assert.equal(clientNode.shape, 'rectangle', '[...] syntax should produce a rectangle');

  // Verify shapes output
  assert.ok(result.shapes.length >= 7, 'Should produce at least 4 nodes and 3 arrow shapes');
  const arrowShapes = result.shapes.filter((s) => s.type === 'arrow');
  assert.equal(arrowShapes.length, 3, 'Should produce 3 tldraw arrow shapes');
});

test('Mermaid Compiler - Decision Rhombus & Ellipse Detection', () => {
  const mermaid = `
    graph TD
    start((Start Process)) --> decision{Is Valid?}
    decision -->|Yes| approved[Approved]
    decision -->|No| rejected[Rejected]
  `;

  const result = parseAndCompileMermaid(mermaid, { x: 400, y: 200 });

  const startNode = result.nodes.find((n) => n.id === 'start');
  assert.equal(startNode?.shape, 'ellipse', '((...)) should parse to ellipse');

  const decisionNode = result.nodes.find((n) => n.id === 'decision');
  assert.equal(decisionNode?.shape, 'rhombus', '{...} should parse to rhombus/decision');

  assert.equal(result.edges.length, 3);
  const yesEdge = result.edges.find((e) => e.target === 'approved');
  assert.equal(yesEdge?.label, 'Yes', 'Should extract edge label');
});

test('Mermaid Compiler - Tolerates Empty Lines and Comments', () => {
  const mermaid = `
    %% Architecture Diagram
    flowchart LR

    %% Empty lines below

    nodeA[Alpha] --> nodeB[Beta]
  `;

  const result = parseAndCompileMermaid(mermaid, { x: 0, y: 0 });
  assert.equal(result.nodes.length, 2);
  assert.equal(result.edges.length, 1);
});
