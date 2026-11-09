import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyStrokesToShapes } from '../src/lib/sketch-analysis.ts';

test('Sketch to Diagram - Converts Box & Arrow into Nodes and Arrows', () => {
  // Simulate a hand-drawn rectangle stroke (closed loop)
  const boxStroke = {
    points: [
      [100, 100],
      [260, 100],
      [260, 180],
      [100, 180],
      [102, 102], // close the loop
    ],
  };

  // Simulate a hand-drawn arrow stroke (linear from box to next target)
  const arrowStroke = {
    points: [
      [260, 140],
      [310, 140],
      [360, 140],
      [420, 140],
    ],
  };

  // Simulate second box
  const targetBoxStroke = {
    points: [
      [430, 100],
      [590, 100],
      [590, 180],
      [430, 180],
      [432, 102],
    ],
  };

  const result = classifyStrokesToShapes(
    [boxStroke, arrowStroke, targetBoxStroke],
    'Microservices architecture'
  );

  assert.equal(result.vectorizedCount, 3);

  const geoShapes = result.shapes.filter((s) => s.type === 'geo');
  const arrowShapes = result.shapes.filter((s) => s.type === 'arrow');

  assert.equal(geoShapes.length, 2, 'Should classify 2 strokes as container geo nodes');
  assert.equal(arrowShapes.length, 1, 'Should classify linear stroke as an arrow');

  // Verify node coordinates align with sketch input
  assert.equal(geoShapes[0].x, 100);
  assert.equal(geoShapes[0].y, 100);
  assert.ok(geoShapes[0].props.w >= 140);
  assert.ok(geoShapes[0].props.h >= 80);
});

test('Sketch to Diagram - Empty input returns empty shapes gracefully', () => {
  const result = classifyStrokesToShapes([]);
  assert.equal(result.vectorizedCount, 0);
  assert.equal(result.shapes.length, 0);
});
