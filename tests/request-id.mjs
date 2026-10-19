import assert from 'node:assert/strict';
import { requestId } from '../shared/request-id.ts';
const native = Object.getOwnPropertyDescriptor(crypto, 'randomUUID');
const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
assert.match(requestId(), pattern);
Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
try {
  const ids = new Set(Array.from({ length: 1000 }, requestId));
  assert.equal(ids.size, 1000);
  for (const id of ids) assert.match(id, pattern);
} finally {
  if (native) Object.defineProperty(crypto, 'randomUUID', native);
  else delete crypto.randomUUID;
}
console.log('PASS: UUID v4 native and HTTP LAN fallback, 1000 distinct IDs');
