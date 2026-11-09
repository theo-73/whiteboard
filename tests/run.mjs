import { after } from 'node:test';

import './mermaid-compiler.test.mjs';
import './sketch-to-diagram.test.mjs';
import './rate-limiter.test.mjs';
import './auto-layout.test.mjs';
import './supabase.test.mjs';

// Explicitly exit once all tests conclude so tldraw's animation loop polyfill does not hang Node
after(() => {
  setTimeout(() => {
    process.exit(process.exitCode || 0);
  }, 50);
});
