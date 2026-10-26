// Run against a locally running API: npm run smoke
// Read-only smoke tests (no seeded data, no account creation).
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5600';
async function test(path, expected) {
  const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(5000) });
  const body = await res.json();
  if (res.status !== expected) throw new Error(`${path}: expected ${expected}, got ${res.status}: ${body.message || ''}`);
  console.log(`OK ${res.status} ${path}`);
  return body;
}
(async () => {
  const health = await test('/api/health', 200);
  if (health.database !== 'connected') throw new Error('MongoDB not connected');
  await test('/api/menu', 200);
  await test('/api/franchise/public', 200);
  await test('/api/auth/profile', 401);
  await test('/api/admin/reports', 401);
  await test('/api/franchise/me', 401);
  console.log('API smoke checks passed (read only)');
})().catch(e => {console.error('API smoke failed:',e.message);process.exitCode=1;});
