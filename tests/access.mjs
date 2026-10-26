import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const { chromium, request } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:18080';
const password = process.env.TEST_ACCESS_PASSWORD;
const username = process.env.TEST_ACCESS_USER || 'visitante';
assert(password, 'Defina TEST_ACCESS_PASSWORD sem registrar seu valor.');
const out = path.resolve(process.env.TEST_OUTPUT_DIR || 'test-results/access');
await mkdir(out, { recursive: true });
const checks = [];
const anonymous = await request.newContext({ baseURL });
const wrong = await request.newContext({ baseURL, httpCredentials: { username, password: 'senha-incorreta-para-ensaio' } });
const valid = await request.newContext({ baseURL, httpCredentials: { username, password } });
const browser = await chromium.launch({ headless: true });
try {
  for (const route of ['/', '/index.html', '/app.js', '/styles.css', '/health', '/itens', '/itens?local=biblio', '/estatisticas', '/healthz', '/fotos/inexistente.png']) {
    const response = await anonymous.get(route);
    assert.equal(response.status(), 401, `Acesso anonimo a ${route}`);
    assert.match(response.headers()['www-authenticate'], /^Basic /);
  }
  assert.equal((await anonymous.post('/itens', { multipart: { descricao: 'nao deve cadastrar', local: 'ensaio' } })).status(), 401);
  checks.push('Sem credenciais: interface, arquivos estaticos, API, fotos e POST retornam 401');
  assert.equal((await wrong.get('/')).status(), 401);
  assert.equal((await wrong.get('/itens')).status(), 401);
  checks.push('Senha incorreta retorna 401');
  const health = await valid.get('/health');
  assert.equal(health.status(), 200);
  assert.equal((await health.json()).banco, 'conectado');
  const stats = await (await valid.get('/estatisticas')).json();
  const items = await (await valid.get('/itens')).json();
  for (const item of items.filter((item) => item.foto)) {
    assert.equal((await anonymous.get(item.foto)).status(), 401);
    assert.equal((await valid.get(item.foto)).status(), 200);
  }
  assert.equal((await valid.get('/run/nginx-auth/htpasswd')).status(), 404);
  assert.equal((await valid.get('/.env')).status(), 404);
  checks.push('Credencial valida libera API/fotos; arquivos secretos nao sao servidos');
  const context = await browser.newContext({ baseURL, httpCredentials: { username, password }, viewport: { width: 1440, height: 1080 } });
  const page = await context.newPage();
  await page.goto('/');
  await page.locator('#connection-status').filter({ hasText: 'Tudo conectado' }).waitFor();
  await page.locator('#items-list[aria-busy="false"]').waitFor();
  assert.equal(await page.locator('.item-card').count(), stats.itens_no_banco);
  const source = await page.content();
  assert(!source.includes(password));
  const js = await (await valid.get('/app.js')).text();
  assert(!js.includes(password));
  await page.screenshot({ path: path.join(out, '35-acesso-autenticado.png'), fullPage: true });
  checks.push('Navegador autenticado carrega a interface; senha ausente do HTML/JavaScript');
  const report = { legenda: 'Testes reais de autenticacao HTTP Basic no Nginx; credenciais omitidas.', executadoEmUtc: new Date().toISOString(), baseURL, checks, stats };
  await writeFile(path.join(out, '35-autenticacao-testes.json'), JSON.stringify(report, null, 2) + '\n');
  for (const check of checks) console.log(`APROVADO: ${check}`);
} finally {
  await Promise.all([anonymous.dispose(), wrong.dispose(), valid.dispose(), browser.close()]);
}
