'use strict';

const $ = (selector) => document.querySelector(selector);
const searchForm = $('#search-form');
const searchInput = $('#search-local');
const itemForm = $('#item-form');
const photoInput = $('#photo');
const fileHelp = $('#photo-help');
const list = $('#items-list');
const status = $('#items-status');
let activeFilter = '';
let requestSequence = 0;
let previewUrl;
let submitting = false;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.method === 'POST' ? 30000 : 10000);
  try {
    const response = await fetch(path, { ...options, signal: controller.signal, cache: 'no-store' });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(data?.erro || `A aplicação respondeu com HTTP ${response.status}.`);
      error.status = response.status;
      throw error;
    }
    if (data === null) throw new Error('A resposta da aplicação não pôde ser lida.');
    return { data, status: response.status };
  } finally {
    clearTimeout(timeout);
  }
}

function icon(id) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#icon-${id}`);
  svg.append(use);
  return svg;
}

function showListStatus(title, message, { error = false, loading = false } = {}) {
  status.replaceChildren();
  status.classList.toggle('error', error);
  if (loading) {
    const loader = document.createElement('span');
    loader.className = 'loader';
    loader.setAttribute('aria-hidden', 'true');
    status.append(loader);
  }
  const heading = document.createElement('h3');
  heading.textContent = title;
  const description = document.createElement('p');
  description.textContent = message;
  status.append(heading, description);
  status.hidden = false;
}

function photoPath(value) {
  // A API só fornece caminhos /fotos/. Não aceitar URLs externas vindas de dados.
  return typeof value === 'string' && /^\/fotos\/[^/]+$/.test(value) ? value : null;
}

function renderItems(items) {
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const card = $('#item-template').content.cloneNode(true);
    card.querySelector('h3').textContent = item.descricao;
    card.querySelector('.item-location span').textContent = item.local;
    const date = new Date(item.criado_em);
    const formatted = Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    card.querySelector('.item-date').textContent = `Registro #${item.id}${formatted ? ` · ${formatted}` : ''}`;
    const path = photoPath(item.foto);
    if (path) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `Ampliar foto: ${item.descricao}`);
      const image = document.createElement('img');
      image.src = path;
      image.alt = `Foto de ${item.descricao}`;
      image.loading = 'lazy';
      image.addEventListener('error', () => button.remove(), { once: true });
      button.append(image);
      button.addEventListener('click', () => {
        $('#photo-dialog-title').textContent = item.descricao;
        $('#dialog-image').src = path;
        $('#dialog-image').alt = `Foto de ${item.descricao}`;
        $('#dialog-location').textContent = `Encontrado em: ${item.local}`;
        $('#photo-dialog').showModal();
      });
      card.querySelector('.item-visual').append(button);
    }
    fragment.append(card);
  }
  list.replaceChildren(fragment);
}

async function loadItems() {
  const sequence = ++requestSequence;
  const filter = activeFilter;
  list.setAttribute('aria-busy', 'true');
  list.replaceChildren();
  $('#results-description').textContent = 'Buscando objetos…';
  $('#clear-filter').hidden = !filter;
  showListStatus('Procurando por aqui…', 'Estamos consultando os objetos cadastrados.', { loading: true });
  try {
    const { data } = await request(`/itens${filter ? `?local=${encodeURIComponent(filter)}` : ''}`);
    if (sequence !== requestSequence) return;
    if (!Array.isArray(data)) throw new Error('Lista de objetos inválida.');
    renderItems(data);
    $('#results-description').textContent = `${data.length} ${data.length === 1 ? 'objeto encontrado' : 'objetos encontrados'}${filter ? ` em locais com “${filter}”` : ' no campus'}`;
    if (data.length) status.hidden = true;
    else showListStatus(filter ? 'Nada por aqui ainda.' : 'O próximo reencontro começa com você.', filter ? 'Não encontramos objetos nesse local. Tente outro ou limpe o filtro.' : 'Encontrou algum objeto? Use o formulário ao lado para cadastrá-lo.');
  } catch {
    if (sequence !== requestSequence) return;
    $('#results-description').textContent = 'Consulta indisponível';
    showListStatus('Não foi possível consultar os objetos.', 'Confira a conexão e use o botão Atualizar para tentar novamente.', { error: true });
  } finally {
    if (sequence === requestSequence) list.setAttribute('aria-busy', 'false');
  }
}

async function loadSummary() {
  const [health, stats] = await Promise.allSettled([request('/health'), request('/estatisticas')]);
  const connected = health.status === 'fulfilled' && health.value.data.status === 'ok' && health.value.data.banco === 'conectado';
  $('#connection-dot').className = `status-dot${connected ? '' : ' offline'}`;
  $('#connection-status').textContent = connected ? 'Tudo conectado' : 'Conexão indisponível';
  $('#connection-description').textContent = connected ? 'Aplicação e banco disponíveis' : 'Tente atualizar em alguns instantes';
  $('#total-items').textContent = stats.status === 'fulfilled' ? stats.value.data.itens_no_banco : '—';
  $('#total-photos').textContent = stats.status === 'fulfilled' ? stats.value.data.fotos_no_volume : '—';
}

async function refresh() {
  const button = $('#refresh-button');
  button.disabled = true;
  try { await Promise.all([loadItems(), loadSummary()]); }
  finally { button.disabled = false; }
}

function formMessage(message, error = false) {
  const element = $('#form-message');
  element.textContent = message;
  element.classList.toggle('error', error);
  element.hidden = !message;
}

function clearPhoto() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = undefined;
  photoInput.value = '';
  $('#photo-preview').removeAttribute('src');
  $('#photo-preview').hidden = true;
  $('#photo-prompt').hidden = false;
  $('#remove-photo').hidden = true;
  fileHelp.textContent = 'JPG ou PNG · até 10 MB';
}

function selectPhoto() {
  const file = photoInput.files[0];
  if (!file) { clearPhoto(); return true; }
  const allowed = ['image/jpeg', 'image/png'].includes(file.type) && /\.(png|jpe?g)$/i.test(file.name);
  if (!allowed || file.size > 10 * 1024 * 1024) {
    clearPhoto();
    formMessage(allowed ? 'Escolha uma foto de até 10 MB.' : 'Escolha uma imagem JPG ou PNG.', true);
    return false;
  }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  $('#photo-preview').src = previewUrl;
  $('#photo-preview').hidden = false;
  $('#photo-prompt').hidden = true;
  $('#remove-photo').hidden = false;
  fileHelp.textContent = file.name;
  formMessage('');
  return true;
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  activeFilter = searchInput.value.trim();
  void loadItems();
});
$('#clear-filter').addEventListener('click', () => {
  searchInput.value = '';
  activeFilter = '';
  void loadItems();
});
searchInput.addEventListener('search', () => {
  if (!searchInput.value) { activeFilter = ''; void loadItems(); }
});
$('#refresh-button').addEventListener('click', () => void refresh());
photoInput.addEventListener('change', selectPhoto);
$('#remove-photo').addEventListener('click', () => { clearPhoto(); formMessage(''); });
const dropzone = $('#photo-dropzone');
for (const eventName of ['dragenter', 'dragover']) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    if (!submitting) dropzone.classList.add('drag-over');
  });
}
for (const eventName of ['dragleave', 'drop']) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove('drag-over');
  });
}
dropzone.addEventListener('drop', (event) => {
  if (submitting || !event.dataTransfer.files.length) return;
  const transfer = new DataTransfer();
  transfer.items.add(event.dataTransfer.files[0]);
  photoInput.files = transfer.files;
  selectPhoto();
});

itemForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitting) return;
  const description = $('#description').value.trim();
  const location = $('#location').value.trim();
  if (!description || !location) {
    formMessage('Preencha a descrição e o local do objeto.', true);
    (!description ? $('#description') : $('#location')).focus();
    return;
  }
  if (!selectPhoto()) return;
  const payload = new FormData();
  payload.append('descricao', description);
  payload.append('local', location);
  if (photoInput.files[0]) payload.append('foto', photoInput.files[0]);
  submitting = true;
  $('#item-fields').disabled = true;
  $('#submit-button span').textContent = 'Cadastrando…';
  formMessage('Enviando o objeto. Aguarde um instante.');
  try {
    const response = await request('/itens', { method: 'POST', body: payload });
    if (response.status !== 201) throw new Error('O cadastro não foi confirmado.');
    itemForm.reset();
    clearPhoto();
    searchInput.value = '';
    activeFilter = '';
    formMessage(`Objeto cadastrado! Registro #${response.data.id}. Obrigado por ajudar.`);
    await refresh();
  } catch {
    formMessage('Não foi possível confirmar o cadastro. Seus campos foram mantidos. Confira a lista antes de tentar novamente.', true);
  } finally {
    submitting = false;
    $('#item-fields').disabled = false;
    $('#submit-button span').textContent = 'Cadastrar objeto';
  }
});

$('#close-photo').addEventListener('click', () => $('#photo-dialog').close());
$('#photo-dialog').addEventListener('click', (event) => {
  if (event.target === $('#photo-dialog')) {
    const bounds = event.target.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.target.close();
  }
});
window.addEventListener('pagehide', () => { if (previewUrl) URL.revokeObjectURL(previewUrl); });
void refresh();
