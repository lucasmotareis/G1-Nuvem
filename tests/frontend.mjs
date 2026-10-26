import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// O caminho opcional permite usar um runtime já instalado, sem mudar a aplicação.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:18080';
const evidence = path.resolve(process.env.TEST_OUTPUT_DIR || path.join(root, 'test-results/frontend'));
if (!process.env.TEST_ACCESS_PASSWORD) throw new Error('Defina TEST_ACCESS_PASSWORD para testar o ambiente protegido.');
const credentials = { username: process.env.TEST_ACCESS_USER || 'visitante', password: process.env.TEST_ACCESS_PASSWORD };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL, httpCredentials: credentials, viewport: { width: 1440, height: 1080 }, locale: 'pt-BR' });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
const checks = [];
const record = (name) => { checks.push(name); console.log(`APROVADO: ${name}`); };
const waitText = (selector, text) => page.locator(selector).filter({ hasText: text }).waitFor();
const search = async (value) => {
  await page.getByRole('searchbox', { name: 'Buscar por local' }).fill(value);
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
};

try {
  const health = await context.request.get('/health');
  assert.equal(health.status(), 200);
  assert.equal((await health.json()).banco, 'conectado');
  const before = await (await context.request.get('/estatisticas')).json();
  await page.goto('/');
  await waitText('#connection-status', 'Tudo conectado');
  await page.locator('#items-list[aria-busy="false"]').waitFor();
  assert.equal(await page.locator('.item-card').count(), before.itens_no_banco);
  assert.equal(await page.locator('#total-items').textContent(), String(before.itens_no_banco));
  record('Página inicial, lista real e estatísticas da API');

  await search('biblio');
  await waitText('#results-description', 'em locais com “biblio”');
  const places = await page.locator('.item-location span').allTextContents();
  assert(places.length > 0 && places.every((value) => value.toLowerCase().includes('biblio')));
  await search(`sem-objetos-${Date.now()}`);
  await waitText('#items-status', 'Nada por aqui ainda.');
  await page.getByRole('button', { name: 'Limpar filtro' }).click();
  await page.locator('#items-list[aria-busy="false"]').waitFor();
  assert.equal(await page.locator('.item-card').count(), before.itens_no_banco);
  record('Filtro por local, resultado vazio e limpeza do filtro');

  await page.locator('#photo').setInputFiles({ name: 'invalido.txt', mimeType: 'text/plain', buffer: Buffer.from('arquivo de teste') });
  await waitText('#form-message', 'Escolha uma imagem JPG ou PNG.');
  assert.equal(await page.locator('#photo').inputValue(), '');
  record('Interface rejeita arquivo que não é JPG/PNG');

  const description = `Garrafa encontrada no campus ${Date.now()}`;
  await page.getByLabel('O que você encontrou?').fill(description);
  await page.getByLabel('Onde foi encontrado?').fill('Biblioteca');
  await page.locator('#photo').setInputFiles(path.join(root, 'docs/evidencias/foto-teste-1.png'));
  assert(await page.locator('#photo-preview').isVisible());
  const postWithPhoto = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/itens');
  await page.getByRole('button', { name: 'Cadastrar objeto', exact: true }).click();
  const createdResponse = await postWithPhoto;
  assert.equal(createdResponse.status(), 201);
  const created = await createdResponse.json();
  await waitText('#form-message', `Registro #${created.id}`);
  await page.getByRole('heading', { name: description, exact: true }).waitFor();
  await page.getByRole('button', { name: `Ampliar foto: ${description}`, exact: true }).click();
  assert(await page.locator('#photo-dialog').isVisible());
  await page.waitForFunction(() => document.querySelector('#dialog-image').naturalWidth > 0);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#photo-dialog').isVisible(), false);
  const photo = await context.request.get(`/fotos/${created.foto}`);
  assert.equal(photo.status(), 200);
  record('Cadastro multipart com foto retorna 201, atualiza a lista e abre foto real no diálogo');

  const noPhotoDescription = `Chaveiro encontrado ${Date.now()}`;
  await page.getByLabel('O que você encontrou?').fill(noPhotoDescription);
  await page.getByLabel('Onde foi encontrado?').fill('Recepção');
  const postWithoutPhoto = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/itens');
  await page.getByRole('button', { name: 'Cadastrar objeto', exact: true }).click();
  const noPhotoResponse = await postWithoutPhoto;
  assert.equal(noPhotoResponse.status(), 201);
  const noPhoto = await noPhotoResponse.json();
  assert.equal(noPhoto.foto, null);
  await waitText('#form-message', `Registro #${noPhoto.id}`);
  await waitText('#total-items', String(before.itens_no_banco + 2));
  const after = await (await context.request.get('/estatisticas')).json();
  assert.equal(after.itens_no_banco, before.itens_no_banco + 2);
  assert.equal(after.fotos_no_volume, before.fotos_no_volume + 1);
  record('Cadastro sem foto e incremento real das contagens');

  // Os cenários abaixo simulam respostas para verificar o tratamento na UI.
  await page.route('**/itens?local=seguranca', (route) => route.fulfill({ json: [{ id: 999, descricao: '<img src=x onerror="window.injetado=true">', local: '<b>local</b>', foto: null, criado_em: '2026-10-26T12:00:00' }] }));
  await search('seguranca');
  await waitText('.item-content h3', '<img src=x');
  assert.equal(await page.locator('.item-content h3 img').count(), 0);
  assert.equal(await page.evaluate(() => window.injetado), undefined);
  await page.unroute('**/itens?local=seguranca');
  record('Resposta simulada: descrições e locais são texto, sem injetar HTML');

  await page.route('**/itens?local=indisponivel', (route) => route.fulfill({ status: 503, json: { erro: 'teste' } }));
  await search('indisponivel');
  await waitText('#items-status', 'Não foi possível consultar os objetos.');
  await page.unroute('**/itens?local=indisponivel');
  await page.getByRole('button', { name: 'Limpar filtro' }).click();
  await page.locator('#items-list[aria-busy="false"]').waitFor();
  record('Resposta simulada: falha de consulta e recuperação pelo filtro');

  await page.route('**/itens', (route) => route.request().method() === 'POST' ? route.fulfill({ status: 503, json: { erro: 'teste' } }) : route.continue());
  await page.getByLabel('O que você encontrou?').fill('Descrição preservada');
  await page.getByLabel('Onde foi encontrado?').fill('Local preservado');
  await page.getByRole('button', { name: 'Cadastrar objeto', exact: true }).click();
  await waitText('#form-message', 'Não foi possível confirmar o cadastro.');
  assert.equal(await page.locator('#description').inputValue(), 'Descrição preservada');
  assert.equal(await page.locator('#location').inputValue(), 'Local preservado');
  await page.unroute('**/itens');
  record('Resposta simulada: falha de cadastro preserva os campos para conferência');

  await page.route('**/health', (route) => route.fulfill({ status: 503, json: { status: 'erro' } }));
  await page.route('**/estatisticas', (route) => route.fulfill({ status: 503, json: { erro: 'teste' } }));
  await page.getByRole('button', { name: 'Atualizar objetos e estatísticas' }).click();
  await waitText('#connection-status', 'Conexão indisponível');
  assert.equal(await page.locator('#total-items').textContent(), '—');
  await page.unroute('**/health');
  await page.unroute('**/estatisticas');
  await page.getByRole('button', { name: 'Atualizar objetos e estatísticas' }).click();
  await waitText('#connection-status', 'Tudo conectado');
  record('Resposta simulada: indicador offline, contagens indisponíveis e retomada');

  const missing = await context.request.get('/rota-inexistente');
  assert.equal(missing.status(), 404);
  const staticFile = await context.request.get('/app.js');
  assert.equal(staticFile.status(), 200);
  assert.equal(staticFile.headers()['x-content-type-options'], 'nosniff');
  record('API mantém 404 e arquivos estáticos são servidos pelo Nginx');

  await mkdir(evidence, { recursive: true });
  await page.reload();
  await waitText('#connection-status', 'Tudo conectado');
  await page.locator('#items-list[aria-busy="false"]').waitFor();
  await page.screenshot({ path: path.join(evidence, '30-frontend-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.getByRole('link', { name: 'Encontrei algo' }).click();
  await page.getByLabel('O que você encontrou?').fill('Teste de navegação móvel');
  await page.screenshot({ path: path.join(evidence, '30-frontend-mobile.png'), fullPage: true });
  assert.deepEqual(pageErrors, []);
  record('Layout móvel em 390px sem rolagem horizontal e sem erros JavaScript');

  const report = { legenda: 'Testes reais do frontend no Chromium contra o Compose isolado; cenários simulados estão identificados individualmente.', executadoEm: new Date().toISOString(), baseURL, checks, before, after, created, noPhoto, pageErrors };
  await writeFile(path.join(evidence, '30-frontend-testes.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ before, after, created, noPhoto }));
} finally {
  await browser.close();
}
