import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTopologicalLayers } from '../src/lib/auto-layout.ts';

test('Auto-Layout - Assigns Sequential Layers to Directed Pipeline', () => {
  // Graph: Client (A) -> Gateway (B) -> Service (C) -> Database (D)
  const nodes = new Map([
    ['A', { id: 'A', label: 'Client', x: 0, y: 0, w: 160, h: 80, shapeType: 'rectangle' }],
    ['B', { id: 'B', label: 'Gateway', x: 0, y: 0, w: 160, h: 80, shapeType: 'rectangle' }],
    ['C', { id: 'C', label: 'Service', x: 0, y: 0, w: 160, h: 80, shapeType: 'rectangle' }],
    ['D', { id: 'D', label: 'Database', x: 0, y: 0, w: 160, h: 80, shapeType: 'cylinder' }],
  ]);

  const inDegrees = new Map([
    ['A', 0],
    ['B', 1],
    ['C', 1],
    ['D', 1],
  ]);

  const adjList = new Map([
    ['A', ['B']],
    ['B', ['C']],
    ['C', ['D']],
    ['D', []],
  ]);

  const layers = computeTopologicalLayers(nodes, inDegrees, adjList);

  assert.equal(layers.length, 4, 'Should create 4 sequential layers');
  assert.deepEqual(layers[0], ['A'], 'Layer 0 should contain root node A');
  assert.deepEqual(layers[1], ['B'], 'Layer 1 should contain node B');
  assert.deepEqual(layers[2], ['C'], 'Layer 2 should contain node C');
  assert.deepEqual(layers[3], ['D'], 'Layer 3 should contain sink node D');
});

test('Auto-Layout - Groups Parallel Branches in the Same Layer', () => {
  // Graph: Gateway (A) -> [AuthService (B), PaymentService (C)] -> Database (D)
  const nodes = new Map([
    ['A', { id: 'A', label: 'Gateway', x: 0, y: 0, w: 160, h: 80, shapeType: 'rectangle' }],
    ['B', { id: 'B', label: 'AuthService', x: 0, y: 0, w: 160, h: 80, shapeType: 'rectangle' }],
    ['C', { id: 'C', label: 'PaymentService', x: 0, y: 0, w: 160, h: 80, shapeType: 'rectangle' }],
    ['D', { id: 'D', label: 'Database', x: 0, y: 0, w: 160, h: 80, shapeType: 'cylinder' }],
  ]);

  const inDegrees = new Map([
    ['A', 0],
    ['B', 1],
    ['C', 1],
    ['D', 2],
  ]);

  const adjList = new Map([
    ['A', ['B', 'C']],
    ['B', ['D']],
    ['C', ['D']],
    ['D', []],
  ]);

  const layers = computeTopologicalLayers(nodes, inDegrees, adjList);

  assert.equal(layers.length, 3, 'Should create 3 layers (Root, Parallel Services, Sink)');
  assert.deepEqual(layers[0], ['A']);
  assert.equal(layers[1].length, 2, 'Layer 1 should contain both parallel services');
  assert.ok(layers[1].includes('B') && layers[1].includes('C'));
  assert.deepEqual(layers[2], ['D']);
});

test('Auto-Layout - Handles Cyclic Graphs Gracefully Without Crashing', () => {
  // Cycle: A -> B -> C -> A
  const nodes = new Map([
    ['A', { id: 'A', label: 'Node A', x: 0, y: 0, w: 160, h: 80, shapeType: 'rectangle' }],
    ['B', { id: 'B', label: 'Node B', x: 0, y: 0, w: 160, h: 80, shapeType: 'rectangle' }],
    ['C', { id: 'C', label: 'Node C', x: 0, y: 0, w: 160, h: 80, shapeType: 'rectangle' }],
  ]);

  const inDegrees = new Map([
    ['A', 1],
    ['B', 1],
    ['C', 1],
  ]);

  const adjList = new Map([
    ['A', ['B']],
    ['B', ['C']],
    ['C', ['A']],
  ]);

  const layers = computeTopologicalLayers(nodes, inDegrees, adjList);

  assert.ok(layers.length >= 1, 'Should output layers even for cyclic graphs');
  const allPlaced = layers.flat();
  assert.equal(allPlaced.length, 3, 'All 3 cyclic nodes must be assigned to a layer');
});
