/* ================= ACESSO E DADOS — Padrão de Sistemas Tóliman =================
   Segue a página "Padrão de Sistemas Tóliman" (https://claude.ai/artifact/NiiyT3so8rej7pLiy84L5M):
   - o sistema é este HTML único, aberto no Chrome ou no Edge a partir da pasta do sistema no
     SharePoint (canal do Teams da equipe, atalho do OneDrive), e grava nessa mesma pasta pela
     File System Access API;
   - entrada com usuário e senha (PBKDF2-SHA256, 150 mil iterações, sal de 16 bytes); a primeira
     pessoa numa pasta vazia vira administradora; 20 minutos sem uso bloqueiam a sessão;
   - cada navegador grava só os próprios arquivos:
       usuarios/<login>.json                 um por pessoa, senha só como hash
       dados/<id do navegador>.json          checagens e registro, ~2 s após cada alteração
       backups/<Sistema>_dados_AAAA-MM-DD_<nome>.json   uma cópia por dia de cada pessoa
       presenca/<id do navegador>.json       quem está online e em qual checagem
       historico/AAAA-MM_<id do navegador>.json         entradas, senhas, bloqueios, usuários
   - versão anterior (painel-dados/, da pasta do Teams): lida só para leitura e juntada.
   No painel publicado no claude.ai o sistema abre só para leitura, sem checagens. */
const VERSAO = '__VERSAO__';
const NOME_SISTEMA = 'Produtividade_Motoristas';
const PASTA_NOME = 'Produtividade de Motoristas';   /* nome da pasta criada para ESTE sistema */
const PASTA_SUBS = ['usuarios', 'dados', 'historico'];
const ITER_SENHA = 150000, MIN_SENHA = 6;
const PARADO_MS = 20 * 60000, PULSO_MS = 20000, ONLINE_MS = 3 * 60000, GRAVAR_MS = 2000, BACKUP_DIAS = 60;
const VERSAO_DADOS = 1;

const CK_STATUS = [['pendente','Pendente'],['verificando','Em verificação'],['ok','Verificado — sem correção'],['corrigido','Corrigido no Rodopar']];
const CK_LAB = Object.fromEntries(CK_STATUS);
const COLAB = {
  modo: '',            /* 'pasta' depois de entrar; vazio fora do sistema */
  leitura: false,      /* painel publicado: só leitura */
  suporte: typeof window.showDirectoryPicker === 'function',
  handle: null, pendente: null, sessao: null, bloqueada: false,
  usuarios: {}, nomes: {}, checks: {}, eventos: {}, log: [], colegas: [],
  salvoEm: '', erroGravar: false, erroPasta: false,
  registro: '', desde: '', versoes: {}, lidos: {}, ultimo: '', legadoLido: false
};

/* ---------- utilidades ---------- */
const carregar = (k, d) => { try { const v = localStorage.getItem('mot.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const salvar = (k, v) => { try { localStorage.setItem('mot.' + k, JSON.stringify(v)); } catch (e) {} };
function instalacao() { let id = carregar('instalacao', ''); if (!id) salvar('instalacao', id = (crypto.randomUUID ? crypto.randomUUID() : novoId('i'))); return id; }
const meuArquivo = () => instalacao() + '.json';
const novoId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const agoraISO = () => new Date().toISOString();
const hojeISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const hora = iso => { try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
const quando = iso => { try { return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return iso || ''; } };
const semAcento = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const loginDe = nome => semAcento(nome).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const nomeArquivo = t => semAcento(t).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'usuario';
/* exportações: <sistema>_<conteúdo>_AAAA-MM-DD_a_AAAA-MM-DD.<ext>, sem acentos e sem espaços */
const nomeExport = (conteudo, ini, fim, ext) => [NOME_SISTEMA, nomeArquivo(conteudo).toLowerCase(), ini === fim ? ini : ini + '_a_' + fim].join('_') + '.' + ext;
const ckSan = s => String(s).replace(/[^A-Za-z0-9_.~:@+-]/g, '_').slice(0, 190);
const ckChavePI = (m, it) => ckSan(`pi_${m}_${it.cod}_${it.doc}_${it.cte}`);
const ckChaveCF = (m, cte) => ckSan(`cf_${m}_${cte}`);
const nomeUsuario = id => (COLAB.usuarios[id] || {}).nome || COLAB.nomes[id] || '';
const ckOf = k => COLAB.checks[k] || null;
const ehAdmin = () => !!(COLAB.sessao && COLAB.sessao.admin);
const usuarioAtual = () => COLAB.sessao ? { login: COLAB.sessao.login, nome: COLAB.sessao.nome } : null;

let TOAST_T;
function avisoRapido(t) { const el = document.getElementById('toast'); el.textContent = t; el.hidden = false; clearTimeout(TOAST_T); TOAST_T = setTimeout(() => { el.hidden = true; }, 2600); }

/* ---------- senha: PBKDF2-SHA256 com sal; só o hash vai para usuarios/<login>.json ---------- */
const paraB64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const deB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function hashSenha(senha, sal, iter) {
  const s = sal ? deB64(sal) : crypto.getRandomValues(new Uint8Array(16)), n = iter || ITER_SENHA;
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: s, iterations: n }, chave, 256);
  return { alg: 'PBKDF2-SHA256', iter: n, sal: paraB64(s), hash: paraB64(bits) };
}
async function senhaConfere(u, senha) {
  if (!u || !u.senha || !u.senha.sal) return false;
  return (await hashSenha(senha, u.senha.sal, u.senha.iter)).hash === u.senha.hash;
}
function problemaSenha(nova, repetida) {
  if (nova.length < MIN_SENHA) return 'A senha precisa ter pelo menos ' + MIN_SENHA + ' caracteres.';
  if (repetida != null && nova !== repetida) return 'As duas senhas não são iguais.';
  return '';
}

/* ---------- pasta do SharePoint (File System Access API) ---------- */
const IDB = {
  abrir() { return new Promise((ok, er) => { const r = indexedDB.open('painel-motoristas', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => ok(r.result); r.onerror = () => er(r.error); }); },
  async get(k) { const d = await IDB.abrir(); return new Promise(ok => { const r = d.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); }); },
  async set(k, v) { const d = await IDB.abrir(); return new Promise(ok => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => ok(); t.onerror = () => ok(); }); }
};
let FILA = Promise.resolve();
const naFila = fn => (FILA = FILA.then(fn, fn));   /* uma leitura ou gravação por vez */
const subpasta = nome => COLAB.handle.getDirectoryHandle(nome, { create: true });
async function escreverArquivo(dir, nome, texto) {
  const w = await (await dir.getFileHandle(nome, { create: true })).createWritable();
  await w.write(texto); await w.close();
}
async function arquivosJson(dir) {
  const l = [];
  for await (const [nome, h] of dir.entries()) if (h.kind === 'file' && /\.json$/i.test(nome)) l.push([nome, h]);
  return l;
}
async function lerJson(h) { try { return JSON.parse(await (await h.getFile()).text()); } catch (e) { return null; } }   /* null = ainda chegando pelo OneDrive */
async function avisoPasta(h) {
  const nomes = [];
  for await (const [n] of h.entries()) nomes.push(n);
  /* "vazia" desconsidera o próprio HTML do sistema, arquivos do Windows e a versão anterior (painel-dados) */
  const outros = nomes.filter(n => !/\.html?$/i.test(n) && !n.startsWith('.') && n.toLowerCase() !== 'desktop.ini' && n !== 'painel-dados');
  const estrutura = !outros.length || PASTA_SUBS.some(n => nomes.includes(n));
  if (h.name === PASTA_NOME && estrutura) return '';
  return 'A pasta escolhida se chama ' + h.name + '. Os dados deste sistema ficam na pasta ' + PASTA_NOME + '. ' +
    'Escolha essa pasta ou, se for esta mesmo, clique em Usar esta pasta.';
}

/* ---------- usuários ---------- */
async function lerUsuarios() {
  const us = {};
  for (const [, h] of await arquivosJson(await subpasta('usuarios'))) {
    const u = await lerJson(h);
    if (u && u.login) us[u.login] = u;
  }
  COLAB.usuarios = us;
  for (const u of Object.values(us)) COLAB.nomes[u.login] = u.nome;
  return us;
}
async function gravarUsuario(u) {
  await escreverArquivo(await subpasta('usuarios'), u.login + '.json', JSON.stringify(u, null, 1));
  COLAB.usuarios[u.login] = u; COLAB.nomes[u.login] = u.nome;
}
const ativos = () => Object.values(COLAB.usuarios).filter(u => u.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
const adminsAtivos = () => ativos().filter(u => u.admin);

/* ---------- histórico (só administradores consultam) ---------- */
async function registrarHistorico(tipo, detalhe, quem) {
  if (!COLAB.handle) return;
  const u = quem || usuarioAtual() || {};
  try {
    const dir = await subpasta('historico'), nome = hojeISO().slice(0, 7) + '_' + meuArquivo();
    let lista = [];
    try { lista = (await lerJson(await dir.getFileHandle(nome))) || []; } catch (e) {}
    lista.push({ id: novoId('h'), quando: agoraISO(), tipo, usuario: u.login || '', nome: u.nome || '', detalhe: detalhe || '', origem: instalacao() });
    await escreverArquivo(dir, nome, JSON.stringify(lista, null, 1));
  } catch (e) { /* o histórico nunca impede o uso */ }
}

/* ---------- dados do sistema: checagens e registro ---------- */
function dadosBackup() {
  return { versao: VERSAO_DADOS, sistema: NOME_SISTEMA, geradoEm: agoraISO(), origem: instalacao(), usuario: usuarioAtual(),
    checagens: COLAB.checks, eventos: Object.values(COLAB.eventos).sort((a, b) => a.quando < b.quando ? -1 : 1) };
}
function derivarLog() {
  COLAB.log = Object.values(COLAB.eventos).filter(r => r.acao === 'checagem').sort((a, b) => (a.quando < b.quando) - (a.quando > b.quando));
  for (const r of COLAB.log) if (r.usuario && r.nome && !COLAB.nomes[r.usuario]) COLAB.nomes[r.usuario] = r.nome;
  for (const c of Object.values(COLAB.checks)) if (c.usuario && c.nome && !COLAB.nomes[c.usuario]) COLAB.nomes[c.usuario] = c.nome;
}
/* junção, as mesmas regras do "Recuperar um backup": por checagem fica o atualizadoEm mais novo;
   o registro (eventos) é somado pelo id */
function aplicarMescla(d) {
  if (!d || typeof d !== 'object') return 0;
  let n = 0;
  for (const [k, c] of Object.entries(d.checagens || {})) {
    const meu = COLAB.checks[k];
    if (c && c.atualizadoEm && (!meu || c.atualizadoEm > (meu.atualizadoEm || ''))) { COLAB.checks[k] = c; n++; }
  }
  for (const e of (Array.isArray(d.eventos) ? d.eventos : [])) if (e && e.id && !COLAB.eventos[e.id]) { COLAB.eventos[e.id] = e; n++; }
  if (n) { derivarLog(); salvar('dados', dadosBackup()); }
  return n;
}
let TIMER_GRAVAR;
function aoMudarDados() {
  salvar('dados', dadosBackup());   /* cópia no navegador, para funcionar sem internet */
  clearTimeout(TIMER_GRAVAR); TIMER_GRAVAR = setTimeout(() => naFila(gravarPasta), GRAVAR_MS);
}
async function gravarPasta() {
  if (!COLAB.handle || !COLAB.sessao) return;
  const dados = dadosBackup();
  const conteudo = JSON.stringify(Object.assign({}, dados, { geradoEm: '' }));
  if (conteudo === COLAB.ultimo) return;
  try {
    const texto = JSON.stringify(dados);
    await escreverArquivo(await subpasta('dados'), meuArquivo(), texto);
    await escreverArquivo(await subpasta('backups'), NOME_SISTEMA + '_dados_' + hojeISO() + '_' + nomeArquivo(COLAB.sessao.nome) + '.json', texto);
    COLAB.ultimo = conteudo; COLAB.salvoEm = agoraISO(); COLAB.erroGravar = false;
    await limparBackups();
  } catch (e) { COLAB.erroGravar = true; }
  renderColab();
}
/* limpeza dos backups: uma vez por dia, só os do próprio usuário; ficam os últimos 60 dias e,
   antes disso, só a primeira cópia de cada mês */
async function limparBackups() {
  const hoje = hojeISO();
  if (carregar('limpezaBackups', '') === hoje) return;
  const dir = await subpasta('backups'), meu = '_' + nomeArquivo(COLAB.sessao.nome) + '.json';
  const limite = new Date(Date.now() - BACKUP_DIAS * 864e5).toISOString().slice(0, 10);
  const porMes = {};
  for (const [nome] of await arquivosJson(dir)) {
    const m = /_dados_(\d{4}-\d{2})-\d{2}_/.exec(nome), dia = m && nome.match(/\d{4}-\d{2}-\d{2}/)[0];
    if (m && nome.endsWith(meu) && dia < limite) (porMes[m[1]] = porMes[m[1]] || []).push(nome);
  }
  for (const lista of Object.values(porMes)) for (const nome of lista.sort().slice(1)) await dir.removeEntry(nome);
  salvar('limpezaBackups', hoje);
}

/* versão anterior do painel: painel-dados/ (usuarios.json + registro/<id>.json), só leitura */
async function lerLegado(raiz) {
  let base;
  try { base = raiz.name === 'painel-dados' ? raiz : await raiz.getDirectoryHandle('painel-dados'); } catch (e) { return -1; }
  const nomes = {};
  try { const u = await lerJson(await base.getFileHandle('usuarios.json')); for (const x of (u && u.lista) || []) nomes[x.id] = x.nome; } catch (e) {}
  const eventos = [];
  try {
    for (const [, h] of await arquivosJson(await base.getDirectoryHandle('registro'))) {
      const arr = await lerJson(h);
      if (Array.isArray(arr)) for (const r of arr) if (r && r.id) eventos.push(Object.assign({}, r, { usuario: r.usuario ? 'anterior:' + r.usuario : '',
        nome: nomes[r.usuario] || (r.tipo === 'usuario' ? 'administrador' : ''), anterior: true }));
    }
  } catch (e) {}
  for (const [id, nome] of Object.entries(nomes)) COLAB.nomes['anterior:' + id] = nome;
  const checagens = {};
  for (const r of eventos.slice().sort((a, b) => a.quando < b.quando ? -1 : 1)) if (r.acao === 'checagem' && r.chave)
    checagens[r.chave] = { tipo: r.tipo, mes: r.mes, ref: r.ref, status: r.para, obs: r.obs || '', usuario: r.usuario, nome: r.nome, quando: r.quando, atualizadoEm: r.quando };
  return aplicarMescla({ checagens, eventos: eventos.filter(r => r.acao === 'checagem') });
}

/* ---------- ciclo: lê os colegas, confere o bloqueio e avisa a presença ---------- */
async function sincronizar() {
  let mudou = 0;
  for (const [nome, h] of await arquivosJson(await subpasta('dados'))) {
    if (nome === meuArquivo()) continue;
    const f = await h.getFile();
    if (COLAB.lidos[nome] === f.lastModified) continue;
    let d; try { d = JSON.parse(await f.text()); } catch (e) { continue; }   /* ainda chegando pelo OneDrive */
    COLAB.lidos[nome] = f.lastModified;
    if (d && d.origem !== instalacao()) mudou += aplicarMescla(d);
  }
  const colegas = [];
  for (const [nome, h] of await arquivosJson(await subpasta('presenca'))) {
    if (nome === meuArquivo()) continue;
    const c = await lerJson(h);
    if (!c || !c.usuario) continue;
    c.online = !c.saiu && Date.now() - Date.parse(c.visto) < ONLINE_MS;
    colegas.push(c);
  }
  COLAB.colegas = colegas;
  await lerUsuarios();
  if (!COLAB.legadoLido) { COLAB.legadoLido = true; const n = await lerLegado(COLAB.handle); if (n > 0) mudou += n; }
  if (mudou) aoMudarDados();
}
async function avisarPresenca(saindo) {
  if (!COLAB.handle || !COLAB.sessao) return;
  try {
    await escreverArquivo(await subpasta('presenca'), meuArquivo(), JSON.stringify({ versao: VERSAO_DADOS, origem: instalacao(), usuario: usuarioAtual(),
      visto: agoraISO(), saiu: !!saindo, registro: saindo || COLAB.bloqueada ? '' : COLAB.registro || '', desde: COLAB.desde, versoes: COLAB.versoes }));
  } catch (e) {}
}
/* bloqueio por registro (aqui, a checagem de um item): quem abriu primeiro fica com ela */
const donoDoRegistro = (id, desde) => COLAB.colegas
  .filter(c => c.online && c.registro === id && (Date.parse(c.desde) < Date.parse(desde) || (c.desde === desde && c.origem < instalacao())))
  .sort((a, b) => Date.parse(a.desde) - Date.parse(b.desde))[0] || null;
const aguardandoDe = id => COLAB.colegas.find(c => c.versoes && c.versoes[id] && c.versoes[id] > ((COLAB.checks[id] || {}).atualizadoEm || '')) || null;
async function avaliarSessao() {
  if (!COLAB.sessao) return;
  const u = COLAB.usuarios[COLAB.sessao.login];
  if (!u || u.ativo === false) { if (!COLAB.bloqueada) bloquearSessao(); return; }   /* desativado: sai no próximo desbloqueio */
  COLAB.sessao.admin = !!u.admin; COLAB.sessao.nome = u.nome;
}
async function ciclo() {
  if (!COLAB.handle || !COLAB.sessao) return;
  try { await sincronizar(); COLAB.erroPasta = false; }
  catch (e) { COLAB.erroPasta = true; }
  await avaliarSessao();
  await avisarPresenca();
  colabRender();
  if (dlgCk.open && CK_ATUAL) renderUsoCk();
}
let TIMER_CICLO = null;
function iniciarCiclo() {
  if (TIMER_CICLO) return;
  TIMER_CICLO = setInterval(() => naFila(ciclo), PULSO_MS);
}
document.addEventListener('visibilitychange', () => {
  if (!COLAB.sessao) return;
  if (document.visibilityState === 'hidden') naFila(gravarPasta);
  else naFila(ciclo);
});
window.addEventListener('pagehide', () => { if (COLAB.sessao) { gravarPasta(); avisarPresenca(true); } });

/* ---------- inatividade: 20 minutos sem uso bloqueiam a sessão ---------- */
let ATIVIDADE = Date.now();
['pointerdown', 'pointermove', 'keydown', 'wheel'].forEach(ev => document.addEventListener(ev, () => { ATIVIDADE = Date.now(); }, { passive: true }));
setInterval(() => { if (COLAB.sessao && !COLAB.bloqueada && Date.now() - ATIVIDADE > PARADO_MS) bloquearSessao(); }, 30000);
let LIBERADO = '';
function bloquearSessao() {
  if (!COLAB.sessao) return;
  COLAB.bloqueada = true;
  LIBERADO = COLAB.registro ? 'checagem' : '';
  if (dlgCk.open) dlgCk.close();
  if (dlgCfg.open) dlgCfg.close();
  COLAB.registro = '';
  naFila(() => avisarPresenca());
  registrarHistorico('bloqueio', 'Sessão bloqueada por inatividade (20 min)');
  mostrarEntrada('bloqueada');
}

/* ---------- janela de entrada ---------- */
const dlgEntrada = document.getElementById('dlgEntrada');
dlgEntrada.addEventListener('cancel', e => e.preventDefault());   /* Esc não fecha */
let ENT_MODO = '', ENT_PENDENTE = null;
const campo = (id, rot, tipo, extra) => `<div><label for="${id}">${rot}</label><input type="${tipo}" id="${id}"${extra || ''}></div>`;
async function escolherModo() {
  if (!COLAB.suporte) return 'sem-suporte';
  if (!COLAB.handle) {
    let h = null; try { h = await IDB.get('pastaSistema'); } catch (e) {}
    if (!h) return 'pasta';
    COLAB.pendente = h;
    let perm = 'prompt'; try { perm = await h.queryPermission({ mode: 'readwrite' }); } catch (e) {}
    if (perm !== 'granted') return 'reconectar';
    COLAB.handle = h; COLAB.pendente = null;
  }
  try { await lerUsuarios(); } catch (e) { COLAB.handle = null; return ['pasta', ['err', 'Não foi possível usar a pasta: ' + (e && e.message || 'sem acesso') + '. Confira se o OneDrive está sincronizando.']]; }
  return Object.keys(COLAB.usuarios).length ? 'login' : 'primeiro';
}
async function mostrarEntrada(modo, aviso) {
  if (!modo) { const r = await escolherModo(); if (Array.isArray(r)) [modo, aviso] = r; else modo = r; }
  ENT_MODO = modo;
  let t = 'Entrar', c = '';
  if (modo === 'sem-suporte') {
    t = 'Navegador sem suporte';
    c = '<p>Abra o sistema no <b>Google Chrome</b> ou no <b>Microsoft Edge</b>. Este navegador não permite usar a pasta do SharePoint, onde ficam os usuários e as senhas.</p>';
  } else if (modo === 'pasta') {
    t = 'Conectar a pasta do SharePoint';
    c = '<p class="dica">Os usuários e as senhas ficam na pasta do sistema, no canal do Teams da equipe. Conecte a pasta para entrar.</p>'
      + '<div class="acoes"><button type="button" class="cta" data-ac="conectar">Conectar a pasta</button></div>'
      + `<p class="dica">Na janela que abrir, escolha a pasta <b>${esc(PASTA_NOME)}</b> (a mesma onde está este arquivo) e clique em <b>Permitir</b>.</p>`;
  } else if (modo === 'reconectar') {
    t = 'Autorizar a pasta';
    c = '<p class="dica">O navegador precisa da sua autorização para usar a pasta do sistema.</p>'
      + '<div class="acoes"><button type="button" class="cta" data-ac="autorizar">Autorizar a pasta</button><button type="button" data-ac="outra">Escolher outra pasta</button></div>';
  } else if (modo === 'pasta-diferente') {
    t = 'Pasta diferente';
    c = '<div class="acoes"><button type="button" class="cta" data-ac="outra">Escolher outra pasta</button><button type="button" data-ac="usar">Usar esta pasta</button></div>';
  } else if (modo === 'primeiro') {
    t = 'Primeiro acesso';
    c = '<p class="dica">Ainda não há usuários nesta pasta. Crie o seu acesso: você será o <b>administrador</b> e poderá cadastrar os colegas em Configurações › Usuários e senhas.</p>'
      + '<form data-modo="primeiro" autocomplete="off">' + campo('entNome', 'Seu nome', 'text', ' maxlength="40" autocomplete="name"')
      + campo('entSenha', 'Senha (mínimo ' + MIN_SENHA + ' caracteres)', 'password', ' autocomplete="new-password"')
      + campo('entRepete', 'Repita a senha', 'password', ' autocomplete="new-password"')
      + '<div class="acoes"><button type="submit" class="cta">Criar acesso e entrar</button></div></form>';
  } else if (modo === 'login') {
    const ult = carregar('ultimoUsuario', '');
    c = '<form data-modo="login" autocomplete="off"><div><label for="entUsuario">Usuário</label><select id="entUsuario">'
      + ativos().map(u => `<option value="${esc(u.login)}"${u.login === ult ? ' selected' : ''}>${esc(u.nome)}</option>`).join('') + '</select></div>'
      + campo('entSenha', 'Senha', 'password', ' autocomplete="current-password"')
      + '<div class="acoes"><button type="submit" class="cta">Entrar</button></div></form>'
      + '<p class="dica">Esqueceu a senha? Peça a um administrador para redefinir em Configurações › Usuários e senhas.</p>';
  } else if (modo === 'trocar') {
    t = 'Crie a sua senha';
    c = `<p class="dica">Olá, <b>${esc(ENT_PENDENTE ? ENT_PENDENTE.nome : '')}</b>. Você entrou com uma senha provisória. Escolha uma senha sua para continuar.</p>`
      + '<form data-modo="trocar" autocomplete="off">' + campo('entSenha', 'Nova senha (mínimo ' + MIN_SENHA + ' caracteres)', 'password', ' autocomplete="new-password"')
      + campo('entRepete', 'Repita a nova senha', 'password', ' autocomplete="new-password"')
      + '<div class="acoes"><button type="submit" class="cta">Salvar e entrar</button><button type="button" data-ac="voltar">Voltar</button></div></form>';
  } else if (modo === 'bloqueada') {
    t = 'Sessão bloqueada';
    c = `<p class="dica">O sistema ficou mais de 20 minutos sem uso. Para continuar como <b>${esc(COLAB.sessao ? COLAB.sessao.nome : '')}</b>, digite a sua senha.</p>`
      + '<form data-modo="bloqueada" autocomplete="off">' + campo('entSenha', 'Senha', 'password', ' autocomplete="current-password"')
      + '<div class="acoes"><button type="submit" class="cta">Continuar</button><button type="button" data-ac="sair">Entrar com outro usuário</button></div></form>';
  }
  document.getElementById('entTitulo').textContent = t;
  document.getElementById('entCorpo').innerHTML = c;
  document.getElementById('entMsg').innerHTML = aviso ? `<div class="msg ${aviso[0]}" role="alert">${aviso[1]}</div>` : '';
  if (!dlgEntrada.open) dlgEntrada.showModal();
  const f = dlgEntrada.querySelector('#entNome, #entSenha, .cta'); if (f) f.focus({ preventScroll: true });
}
const erroEntrada = t => mostrarEntrada(ENT_MODO, ['err', esc(t)]);
async function usarPasta(h) {
  COLAB.handle = h; COLAB.pendente = null; COLAB.lidos = {}; COLAB.legadoLido = false;
  try { await IDB.set('pastaSistema', h); } catch (e) {}
  mostrarEntrada();
}
async function conectarPasta() {
  let h;
  try { h = await window.showDirectoryPicker({ id: 'motoristas-sharepoint', mode: 'readwrite' }); }
  catch (e) { return; }   /* a pessoa cancelou a escolha */
  let aviso = '';
  try { aviso = await avisoPasta(h); } catch (e) { return mostrarEntrada('pasta', ['err', 'Não foi possível usar a pasta: ' + esc(e.message || 'sem acesso') + '. Confira se o OneDrive está sincronizando.']); }
  if (aviso) { COLAB.pendente = h; return mostrarEntrada('pasta-diferente', ['warn', esc(aviso)]); }
  usarPasta(h);
}
async function entrar(u) {
  COLAB.sessao = { login: u.login, nome: u.nome, admin: !!u.admin };
  COLAB.bloqueada = false; COLAB.modo = 'pasta'; ATIVIDADE = Date.now();
  salvar('ultimoUsuario', u.login);
  dlgEntrada.close();
  await registrarHistorico('entrada', 'Entrou no sistema');
  await naFila(ciclo);
  iniciarCiclo();
  if (LIBERADO) { avisoRapido('O sistema ficou mais de 20 minutos sem uso e a ' + LIBERADO + ' foi liberada para os colegas.'); LIBERADO = ''; }
}
dlgEntrada.addEventListener('click', async e => {
  const b = e.target.closest('button[data-ac]'); if (!b) return;
  const a = b.dataset.ac;
  if (a === 'conectar' || a === 'outra') conectarPasta();
  else if (a === 'autorizar') {
    try { if ((await COLAB.pendente.requestPermission({ mode: 'readwrite' })) === 'granted') return usarPasta(COLAB.pendente); } catch (err) {}
    mostrarEntrada('reconectar', ['err', 'Não foi possível usar a pasta: autorização negada. Confira se o OneDrive está sincronizando.']);
  }
  else if (a === 'usar') usarPasta(COLAB.pendente);
  else if (a === 'voltar') { ENT_PENDENTE = null; mostrarEntrada('login'); }
  else if (a === 'sair') sair();
});
dlgEntrada.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, m = f.dataset.modo, v = id => (f.querySelector('#' + id) || {}).value || '';
  const btn = f.querySelector('.cta'); if (btn) btn.disabled = true;
  try {
    if (m === 'primeiro') {
      const nome = v('entNome').trim().replace(/\s+/g, ' ');
      if (nome.length < 2 || !loginDe(nome)) return erroEntrada('Informe o seu nome.');
      const p = problemaSenha(v('entSenha'), v('entRepete')); if (p) return erroEntrada(p);
      await lerUsuarios();
      if (Object.keys(COLAB.usuarios).length) return mostrarEntrada('login', ['warn', 'Outra pessoa já criou o primeiro acesso nesta pasta. Entre com o seu usuário.']);
      const agora = agoraISO(), login = loginDe(nome);
      const u = { versao: VERSAO_DADOS, login, nome, admin: true, ativo: true, trocarSenha: false, senha: await hashSenha(v('entSenha')),
        criadoEm: agora, criadoPor: login, alteradoEm: agora, alteradoPor: login };
      await gravarUsuario(u);
      await registrarHistorico('usuario', 'Primeiro acesso: ' + nome + ' (administrador)', u);
      return entrar(u);
    }
    if (m === 'login') {
      await lerUsuarios();
      const u = COLAB.usuarios[v('entUsuario')];
      if (!u || u.ativo === false) return erroEntrada('Usuário não encontrado ou desativado.');
      if (!(await senhaConfere(u, v('entSenha')))) { await registrarHistorico('senha-errada', 'Senha incorreta na entrada', u); return erroEntrada('Senha incorreta.'); }
      if (u.trocarSenha) { ENT_PENDENTE = u; return mostrarEntrada('trocar'); }
      return entrar(u);
    }
    if (m === 'trocar') {
      const p = problemaSenha(v('entSenha'), v('entRepete')); if (p) return erroEntrada(p);
      const u = ENT_PENDENTE; if (!u) return mostrarEntrada('login');
      if (await senhaConfere(u, v('entSenha'))) return erroEntrada('Escolha uma senha diferente da provisória.');
      const nu = Object.assign({}, u, { senha: await hashSenha(v('entSenha')), trocarSenha: false, alteradoEm: agoraISO(), alteradoPor: u.login });
      await gravarUsuario(nu);
      await registrarHistorico('troca-senha', 'Trocou a senha provisória', nu);
      ENT_PENDENTE = null;
      return entrar(nu);
    }
    if (m === 'bloqueada') {
      await lerUsuarios();
      const u = COLAB.usuarios[COLAB.sessao.login];
      if (!u || u.ativo === false) { COLAB.sessao = null; COLAB.modo = ''; colabRender(); return mostrarEntrada('login', ['err', 'Usuário não encontrado ou desativado.']); }
      if (!(await senhaConfere(u, v('entSenha')))) { await registrarHistorico('senha-errada', 'Senha incorreta no desbloqueio', u); return erroEntrada('Senha incorreta.'); }
      return entrar(u);
    }
  } catch (err) {
    erroEntrada('Não foi possível usar a pasta: ' + (err && err.message || 'erro de leitura') + '. Confira se o OneDrive está sincronizando.');
  } finally { if (btn && btn.isConnected) btn.disabled = false; }
});
async function sair() {
  if (COLAB.sessao) {
    await naFila(gravarPasta);
    await avisarPresenca(true);
    await registrarHistorico('saida', 'Saiu do sistema');
  }
  COLAB.sessao = null; COLAB.modo = ''; COLAB.bloqueada = false; COLAB.registro = '';
  if (dlgCk.open) dlgCk.close();
  if (dlgCfg.open) dlgCfg.close();
  colabRender();
  mostrarEntrada();
}

/* ---------- selo + botão de checagem de um item (pagamento indevido ou confronto) ---------- */
function ckHtml(chave, tipo, mes, desc) {
  if (!COLAB.modo) return '';
  const c = ckOf(chave), st = c ? c.status : 'pendente';
  return `<span class="ck"><span class="ck-b ${esc(st)}">${esc(CK_LAB[st] || st)}</span>`
    + (c && c.usuario ? `<span class="ck-o">${esc(nomeUsuario(c.usuario) || '—')} · ${esc(quando(c.quando))}${c.obs ? ' · ' + esc(c.obs) : ''}</span>` : '')
    + `<button type="button" class="ck-btn" data-ck="${esc(chave)}" data-tipo="${tipo}" data-mes="${esc(mes)}" data-desc="${esc(desc)}">${c ? 'Editar checagem' : 'Registrar checagem'}</button></span>`;
}
function ckResumo(chaves) {
  const n = chaves.length, f = chaves.filter(k => { const c = ckOf(k); return c && (c.status === 'ok' || c.status === 'corrigido'); }).length;
  return { n, f };
}

/* ---------- cabeçalho: situação da pasta, quem está online, usuário e configurações ---------- */
function colabRender() { renderColab(); renderCkAll(); renderRegistro(); if (dlgCfg.open) renderCfg(); }
function renderColab() {
  const el = document.getElementById('colab');
  if (COLAB.leitura) {
    el.innerHTML = '<span class="s-situacao neutro" title="Checagens e registro só no sistema aberto pela pasta do SharePoint, no Chrome ou no Edge."><i></i>Somente leitura</span>';
    return;
  }
  if (!COLAB.sessao) { el.innerHTML = ''; return; }
  const sit = COLAB.erroPasta ? '<button type="button" class="s-situacao alerta" data-cfg="reconectar"><i></i>SharePoint: clique para reconectar</button>'
    : COLAB.erroGravar ? '<span class="s-situacao alerta"><i></i>SharePoint: não foi possível salvar</span>'
    : COLAB.salvoEm ? `<span class="s-situacao"><i></i>SharePoint: salvo em ${esc(hora(COLAB.salvoEm))}</span>`
    : `<span class="s-situacao"><i></i>SharePoint: conectado</span>`;
  const on = new Map();
  for (const c of COLAB.colegas) if (c.online && c.usuario && c.usuario.login !== COLAB.sessao.login) on.set(c.usuario.login, c.usuario.nome);
  const ini = COLAB.sessao.nome.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  el.innerHTML = sit
    + (on.size ? `<span class="on-l">Online: ${[...on.values()].map(n => `<span class="on-u">${esc(n)}</span>`).join('')}</span>` : '')
    + `<span class="s-usuario"><span class="s-avatar" aria-hidden="true">${esc(ini)}</span>${esc(COLAB.sessao.nome)}</span>`
    + `<div class="cfg-menu"><button type="button" class="s-btn pequeno" id="cfg-btn" aria-haspopup="true" aria-expanded="false">Configurações ▾</button>
       <div class="lista" id="cfg-lista" hidden role="menu">
        ${ehAdmin() ? '<button type="button" role="menuitem" data-cfg="usuarios">Usuários e senhas</button><button type="button" role="menuitem" data-cfg="historico">Histórico de acesso</button>' : ''}
        <button type="button" role="menuitem" data-cfg="senha">Trocar minha senha</button>
        <button type="button" role="menuitem" data-cfg="backup">Recuperar um backup</button>
        ${ehAdmin() ? '<button type="button" role="menuitem" data-cfg="anterior">Importar da versão anterior</button>' : ''}
        <button type="button" role="menuitem" data-cfg="pasta">Pasta do sistema</button>
        <button type="button" role="menuitem" data-cfg="bloquear">Bloquear sessão</button>
        <button type="button" role="menuitem" data-cfg="sair">Sair</button>
       </div></div>`;
}
document.getElementById('colab').addEventListener('click', e => {
  const m = e.target.closest('#cfg-btn');
  const lista = document.getElementById('cfg-lista');
  if (m && lista) { const ab = lista.hidden; lista.hidden = !ab; m.setAttribute('aria-expanded', String(ab)); if (ab) { const f = lista.querySelector('button'); if (f) f.focus(); } return; }
  const b = e.target.closest('[data-cfg]'); if (!b) return;
  if (lista) lista.hidden = true;
  const op = b.dataset.cfg;
  if (op === 'sair') return sair();
  if (op === 'bloquear') return bloquearSessao();
  if (op === 'reconectar') { COLAB.handle = null; return mostrarEntrada(); }
  abrirCfg(op);
});
document.addEventListener('click', e => { const l = document.getElementById('cfg-lista'); if (l && !l.hidden && !e.target.closest('.cfg-menu')) l.hidden = true; });
document.addEventListener('keydown', e => { const l = document.getElementById('cfg-lista'); if (e.key === 'Escape' && l && !l.hidden) { l.hidden = true; document.getElementById('cfg-btn').focus(); } });

/* ---------- Configurações ---------- */
const dlgCfg = document.getElementById('dlg-cfg');
let CFG = { op: '', msg: null, redefinir: '', hist: null };
const msgHtml = m => m ? `<div class="s-msg ${m[0]}" role="status">${m[1]}</div>` : '';
function abrirCfg(op) { CFG = { op, msg: null, redefinir: '', hist: null }; renderCfg(); if (!dlgCfg.open) dlgCfg.showModal(); if (op === 'historico') carregarHistorico(); }
document.getElementById('cfg-fechar').addEventListener('click', () => dlgCfg.close());
function renderCfg() {
  const t = document.getElementById('cfg-tit'), box = document.getElementById('cfg-corpo');
  if (!COLAB.sessao) { dlgCfg.close(); return; }
  if (CFG.op === 'usuarios') {
    if (!ehAdmin()) { CFG.op = 'senha'; return renderCfg(); }
    t.textContent = 'Usuários e senhas';
    const us = Object.values(COLAB.usuarios).sort((a, b) => (a.ativo === false) - (b.ativo === false) || a.nome.localeCompare(b.nome, 'pt-BR'));
    box.innerHTML = msgHtml(CFG.msg)
      + (adminsAtivos().length < 2 ? '<div class="s-msg aviso">O sistema tem só um administrador ativo. Cadastre um segundo, para alguém poder redefinir senhas nas férias.</div>' : '')
      + `<div class="s-tabela"><div class="s-tab-cab"><h3>Usuários</h3><span>${ativos().length} ativo(s)</span></div><div class="s-rolagem"><table>
        <thead><tr><th>Nome</th><th>Login</th><th>Perfil</th><th>Situação</th><th class="n">Ações</th></tr></thead><tbody>
        ${us.map(u => `<tr class="${u.ativo === false ? 'inativo' : ''}"><td>${esc(u.nome)}${u.login === COLAB.sessao.login ? ' (você)' : ''}</td><td class="num">${esc(u.login)}</td>
          <td>${u.admin ? 'Administrador' : 'Usuário'}</td>
          <td>${u.ativo === false ? '<span class="s-selo neutro">Desativado</span>' : u.trocarSenha ? '<span class="s-selo aviso">Senha provisória</span>' : '<span class="s-selo ok">Ativo</span>'}</td>
          <td class="n"><div class="s-acoes" style="justify-content:flex-end">
            <button type="button" class="s-btn pequeno" data-us="${esc(u.login)}" data-op="admin">${u.admin ? 'Tirar administrador' : 'Tornar administrador'}</button>
            <button type="button" class="s-btn pequeno" data-us="${esc(u.login)}" data-op="redefinir">Redefinir senha</button>
            <button type="button" class="s-btn pequeno ${u.ativo === false ? '' : 'perigo'}" data-us="${esc(u.login)}" data-op="ativo">${u.ativo === false ? 'Reativar' : 'Desativar'}</button>
          </div></td></tr>
          ${CFG.redefinir === u.login ? `<tr><td colspan="5"><form class="us-nova" data-form="redefinir" data-us="${esc(u.login)}">
            <div class="s-campo"><label for="us-prov">Nova senha provisória de ${esc(u.nome)}</label><input type="text" id="us-prov" autocomplete="off" minlength="${MIN_SENHA}">
            <span class="s-ajuda">Na próxima entrada, ${esc(u.nome)} cria uma senha própria.</span></div><span></span>
            <button type="button" class="s-btn" data-op="cancelar-redef">Cancelar</button><button type="submit" class="s-btn primario">Redefinir senha</button></form></td></tr>` : ''}`).join('')}
        </tbody></table></div></div>
        <h4>Cadastrar usuário</h4>
        <form class="us-nova" data-form="novo" autocomplete="off">
          <div class="s-campo"><label for="us-nome">Nome</label><input type="text" id="us-nome" maxlength="40"></div>
          <div class="s-campo"><label for="us-senha">Senha provisória</label><input type="text" id="us-senha" autocomplete="off"></div>
          <label class="fl check" style="height:42px"><input type="checkbox" id="us-admin"> Administrador</label>
          <button type="submit" class="s-btn primario" style="height:42px">Cadastrar usuário</button>
        </form>
        <p class="ck-ref" style="color:var(--steel)">Senha provisória com no mínimo ${MIN_SENHA} caracteres. Na primeira entrada, a pessoa cria uma senha própria.</p>`;
  } else if (CFG.op === 'historico') {
    if (!ehAdmin()) { CFG.op = 'senha'; return renderCfg(); }
    t.textContent = 'Histórico de acesso';
    const h = CFG.hist;
    const TIPO = { 'entrada': 'Entrada', 'saida': 'Saída', 'senha-errada': 'Senha incorreta', 'troca-senha': 'Troca de senha', 'bloqueio': 'Bloqueio',
      'usuario': 'Usuários', 'senha-redefinida': 'Senha redefinida', 'backup': 'Backup recuperado', 'anterior': 'Versão anterior' };
    box.innerHTML = msgHtml(CFG.msg) + (h == null ? '<div class="s-msg info">Lendo o histórico da pasta…</div>' : !h.length
      ? '<div class="s-vazio"><h4>Nenhum registro</h4><p>As entradas, senhas erradas, trocas de senha e bloqueios aparecem aqui.</p></div>'
      : `<div class="s-acoes"><button type="button" class="s-btn" data-op="baixar-hist">Exportar histórico</button></div>
        <div class="s-tabela"><div class="s-tab-cab"><h3>Movimentações</h3><span>${h.length} registro(s) · mais recentes primeiro</span></div><div class="s-rolagem"><table>
        <thead><tr><th>Quando</th><th>Usuário</th><th>Evento</th><th>Detalhe</th></tr></thead><tbody>
        ${h.slice(0, 500).map(r => `<tr><td class="num">${esc(quando(r.quando))}</td><td>${esc(r.nome || r.usuario || '—')}</td><td>${r.tipo === 'senha-errada' || r.tipo === 'bloqueio'
          ? `<span class="s-selo aviso">${esc(TIPO[r.tipo])}</span>` : esc(TIPO[r.tipo] || r.tipo)}</td><td>${esc(r.detalhe || '')}</td></tr>`).join('')}
        </tbody></table></div></div>`);
  } else if (CFG.op === 'senha') {
    t.textContent = 'Trocar minha senha';
    box.innerHTML = msgHtml(CFG.msg) + `<form data-form="minha" autocomplete="off" style="display:grid;gap:12px;max-width:420px">
      <div class="s-campo"><label for="ms-atual">Senha atual</label><input type="password" id="ms-atual" autocomplete="current-password"></div>
      <div class="s-campo"><label for="ms-nova">Nova senha (mínimo ${MIN_SENHA} caracteres)</label><input type="password" id="ms-nova" autocomplete="new-password"></div>
      <div class="s-campo"><label for="ms-rep">Repita a nova senha</label><input type="password" id="ms-rep" autocomplete="new-password"></div>
      <div class="s-acoes"><button type="submit" class="s-btn primario">Salvar senha</button></div></form>`;
  } else if (CFG.op === 'backup') {
    t.textContent = 'Recuperar um backup';
    box.innerHTML = msgHtml(CFG.msg) + `<p class="ck-ref">Escolha um arquivo da pasta <b>backups/</b> (ou de <b>dados/</b>). As checagens dele são juntadas às de agora: em cada item fica a versão mais nova, e o registro é somado. Nada é apagado.</p>
      <div class="s-campo" style="max-width:460px"><label for="bk-arq">Arquivo de backup (.json)</label><input type="file" id="bk-arq" accept=".json,application/json"></div>`;
  } else if (CFG.op === 'anterior') {
    t.textContent = 'Importar da versão anterior';
    box.innerHTML = msgHtml(CFG.msg) + `<p class="ck-ref">Antes deste sistema, o painel guardava os usuários e as checagens na pasta <b>painel-dados</b>, dentro da pasta da equipe no Teams. Escolha essa pasta (ou a pasta da equipe que a contém): as checagens e o registro dela são juntados aqui, só para leitura. A pasta antiga não é alterada. Os usuários antigos não tinham senha: cadastre-os de novo em Usuários e senhas.</p>
      <div class="s-acoes"><button type="button" class="s-btn primario" data-op="escolher-anterior">Escolher a pasta antiga</button></div>`;
  } else if (CFG.op === 'pasta') {
    t.textContent = 'Pasta do sistema';
    box.innerHTML = msgHtml(CFG.msg) + `<p class="ck-ref">Conectado à pasta <b>${esc(COLAB.handle ? COLAB.handle.name : '—')}</b>. ${COLAB.salvoEm ? 'Último salvamento às ' + esc(hora(COLAB.salvoEm)) + '.' : ''}
      Os dados ficam em <b>dados/</b>, uma cópia por dia em <b>backups/</b>, os usuários em <b>usuarios/</b> e as movimentações de acesso em <b>historico/</b>.</p>
      <p class="ck-ref">Antes das férias: confira no topo “SharePoint: salvo em …” com a hora de agora, confira que o OneDrive não tem arquivos pendentes e feche o sistema.</p>
      <div class="s-acoes"><button type="button" class="s-btn" data-op="trocar-pasta">Escolher outra pasta</button></div>`;
  }
}
dlgCfg.addEventListener('click', async e => {
  const b = e.target.closest('button[data-op]'); if (!b) return;
  const op = b.dataset.op, login = b.dataset.us, u = login && COLAB.usuarios[login];
  if (op === 'cancelar-redef') { CFG.redefinir = ''; return renderCfg(); }
  if (op === 'redefinir') { CFG.redefinir = login; CFG.msg = null; renderCfg(); const i = document.getElementById('us-prov'); if (i) i.focus(); return; }
  if (op === 'baixar-hist') return baixarHistorico();
  if (op === 'trocar-pasta') { dlgCfg.close(); await sair(); COLAB.handle = null; try { await IDB.set('pastaSistema', null); } catch (err) {} return mostrarEntrada('pasta'); }
  if (op === 'escolher-anterior') {
    let h; try { h = await window.showDirectoryPicker({ id: 'motoristas-anterior', mode: 'read' }); } catch (err) { return; }
    const n = await lerLegado(h);
    CFG.msg = n < 0 ? ['erro', 'Não encontrei a pasta painel-dados nesta pasta. Escolha a pasta da equipe que a contém, ou a própria painel-dados.']
      : ['ok', `Versão anterior importada: ${n} item(ns) novo(s).`];
    if (n >= 0) { aoMudarDados(); await registrarHistorico('anterior', `Importou a versão anterior (pasta ${h.name}): ${n} item(ns)`); colabRender(); }
    return renderCfg();
  }
  if (!u) return;
  if (op === 'admin' || op === 'ativo') {
    const novo = Object.assign({}, u, op === 'admin' ? { admin: !u.admin } : { ativo: u.ativo === false });
    const perde = u.admin && u.ativo !== false && (!novo.admin || novo.ativo === false);
    if (perde && adminsAtivos().length <= 1) { CFG.msg = ['erro', 'Sempre há pelo menos um administrador ativo. Cadastre outro administrador antes de fazer essa mudança.']; return renderCfg(); }
    novo.alteradoEm = agoraISO(); novo.alteradoPor = COLAB.sessao.login;
    try {
      await gravarUsuario(novo);
      const txt = op === 'admin' ? `${u.nome} ${novo.admin ? 'passou a ser administrador' : 'deixou de ser administrador'}` : `Usuário ${novo.ativo === false ? 'desativado' : 'reativado'}: ${u.nome}`;
      await registrarHistorico('usuario', txt);
      CFG.msg = ['ok', txt + '.'];
    } catch (err) { CFG.msg = ['erro', 'Não foi possível usar a pasta: ' + esc(err.message || 'sem acesso') + '. Confira se o OneDrive está sincronizando.']; }
    renderColab(); renderCfg();
  }
});
dlgCfg.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, tipo = f.dataset.form, val = id => (f.querySelector('#' + id) || {}).value || '';
  const btn = f.querySelector('button[type=submit]'); if (btn) btn.disabled = true;
  try {
    if (tipo === 'novo') {
      const nome = val('us-nome').trim().replace(/\s+/g, ' '), login = loginDe(nome), senha = val('us-senha');
      if (nome.length < 2 || !login) { CFG.msg = ['erro', 'Informe o nome do usuário.']; return renderCfg(); }
      const p = problemaSenha(senha); if (p) { CFG.msg = ['erro', p]; return renderCfg(); }
      await lerUsuarios();
      if (COLAB.usuarios[login]) { CFG.msg = ['erro', `Já existe um usuário com esse nome (${esc(login)}).`]; return renderCfg(); }
      const agora = agoraISO(), admin = f.querySelector('#us-admin').checked;
      await gravarUsuario({ versao: VERSAO_DADOS, login, nome, admin, ativo: true, trocarSenha: true, senha: await hashSenha(senha),
        criadoEm: agora, criadoPor: COLAB.sessao.login, alteradoEm: agora, alteradoPor: COLAB.sessao.login });
      await registrarHistorico('usuario', `Usuário cadastrado: ${nome}${admin ? ' (administrador)' : ''}`);
      CFG.msg = ['ok', `Usuário cadastrado: ${esc(nome)}. Passe a senha provisória a ${esc(nome)}; na primeira entrada será pedida uma senha nova.`];
      return renderCfg();
    }
    if (tipo === 'redefinir') {
      const u = COLAB.usuarios[f.dataset.us], senha = val('us-prov');
      const p = problemaSenha(senha); if (p) { CFG.msg = ['erro', p]; return renderCfg(); }
      await gravarUsuario(Object.assign({}, u, { senha: await hashSenha(senha), trocarSenha: true, alteradoEm: agoraISO(), alteradoPor: COLAB.sessao.login }));
      await registrarHistorico('senha-redefinida', `Senha redefinida: ${u.nome}`);
      CFG.redefinir = ''; CFG.msg = ['ok', `Senha de ${esc(u.nome)} redefinida. Na próxima entrada, será pedida uma senha nova.`];
      return renderCfg();
    }
    if (tipo === 'minha') {
      const u = COLAB.usuarios[COLAB.sessao.login];
      if (!(await senhaConfere(u, val('ms-atual')))) { await registrarHistorico('senha-errada', 'Senha atual incorreta na troca de senha'); CFG.msg = ['erro', 'Senha incorreta.']; return renderCfg(); }
      const p = problemaSenha(val('ms-nova'), val('ms-rep')); if (p) { CFG.msg = ['erro', p]; return renderCfg(); }
      await gravarUsuario(Object.assign({}, u, { senha: await hashSenha(val('ms-nova')), trocarSenha: false, alteradoEm: agoraISO(), alteradoPor: u.login }));
      await registrarHistorico('troca-senha', 'Trocou a própria senha');
      CFG.msg = ['ok', 'Senha alterada.'];
      return renderCfg();
    }
  } catch (err) {
    CFG.msg = ['erro', 'Não foi possível usar a pasta: ' + esc(err && err.message || 'sem acesso') + '. Confira se o OneDrive está sincronizando.']; renderCfg();
  } finally { if (btn && btn.isConnected) btn.disabled = false; }
});
dlgCfg.addEventListener('change', async e => {
  if (e.target.id !== 'bk-arq' || !e.target.files.length) return;
  const arq = e.target.files[0];
  let d = null; try { d = JSON.parse(await arq.text()); } catch (err) {}
  if (!d || d.sistema && d.sistema !== NOME_SISTEMA || !d.checagens) { CFG.msg = ['erro', 'Este arquivo não é um backup deste sistema. Escolha um arquivo da pasta backups/.']; return renderCfg(); }
  const n = aplicarMescla(d);
  aoMudarDados(); colabRender();
  await registrarHistorico('backup', `Recuperou o backup ${arq.name}: ${n} item(ns)`);
  CFG.msg = ['ok', `Backup recuperado: ${n} item(ns) novo(s) ou mais recente(s).`];
  renderCfg();
});
async function carregarHistorico() {
  const l = [];
  try {
    for (const [, h] of await arquivosJson(await subpasta('historico'))) { const a = await lerJson(h); if (Array.isArray(a)) l.push(...a); }
  } catch (e) { CFG.msg = ['erro', 'Não foi possível ler o histórico da pasta. Confira se o OneDrive está sincronizando.']; }
  CFG.hist = l.sort((a, b) => (a.quando < b.quando) - (a.quando > b.quando));
  if (dlgCfg.open && CFG.op === 'historico') renderCfg();
}
async function baixarHistorico() {
  const h = CFG.hist || [];
  const rows = [['Quando', 'Usuário', 'Login', 'Evento', 'Detalhe', 'Computador']].concat(h.map(r => [quando(r.quando), r.nome || '', r.usuario || '', r.tipo, r.detalhe || '', r.origem || '']));
  const dias = h.map(r => (r.quando || '').slice(0, 10)).filter(Boolean).sort();
  const nome = nomeExport('historico_acesso', dias[0] || hojeISO(), dias[dias.length - 1] || hojeISO(), 'xlsx');
  try { await salvarArquivo(nome, XLSX_MIN.build([{ name: 'Histórico', rows, header: 0, widths: [16, 26, 22, 16, 60, 38] }])); avisoRapido('Exportado: ' + h.length + ' registros'); }
  catch (e) { CFG.msg = ['erro', 'Não foi possível gerar o arquivo.']; renderCfg(); }
}

/* ---------- checagem de um item, com bloqueio por registro ---------- */
const dlgCk = document.getElementById('dlg-ck');
let CK_ATUAL = null, CK_FORCAR = false;
document.getElementById('ck-status').innerHTML = CK_STATUS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
function renderUsoCk() {
  const box = document.getElementById('ck-uso'), save = document.getElementById('ck-save');
  const dono = donoDoRegistro(CK_ATUAL.chave, COLAB.desde), ag = !dono && !CK_FORCAR && aguardandoDe(CK_ATUAL.chave);
  box.innerHTML = dono ? `<div class="s-msg aviso">Esta checagem está em uso por ${esc(dono.usuario.nome)} desde ${esc(hora(dono.desde))}. Escolha outra ou aguarde: ela é liberada sozinha quando essa pessoa trocar de checagem, ficar 20 minutos sem mexer ou fechar o sistema.</div>`
    : ag ? `<div class="s-msg info">Aguardando chegar pelo OneDrive o que ${esc(ag.usuario.nome)} alterou nesta checagem. Costuma levar menos de um minuto.</div>
      <div class="s-acoes"><button type="button" class="s-btn pequeno" id="ck-forcar">Abrir assim mesmo</button></div>` : '';
  save.disabled = !!dono || !!ag;
  document.getElementById('ck-status').disabled = !!dono || !!ag;
  document.getElementById('ck-obs').disabled = !!dono || !!ag;
}
function abrirChecagem(b) {
  CK_ATUAL = { chave: b.dataset.ck, tipo: b.dataset.tipo, mes: b.dataset.mes, desc: b.dataset.desc }; CK_FORCAR = false;
  const c = ckOf(CK_ATUAL.chave);
  document.getElementById('ck-tit').textContent = CK_ATUAL.tipo === 'cf' ? 'Checagem do confronto' : 'Checagem do pagamento indevido';
  document.getElementById('ck-ref').textContent = `${mlab(CK_ATUAL.mes)} · ${CK_ATUAL.desc}`;
  document.getElementById('ck-status').value = c ? c.status : 'pendente';
  document.getElementById('ck-obs').value = c ? (c.obs || '') : '';
  document.getElementById('ck-msg').innerHTML = '';
  const hist = COLAB.log.filter(r => r.chave === CK_ATUAL.chave);
  document.getElementById('ck-hist').innerHTML = hist.length
    ? '<b>Histórico</b>' + hist.map(r => `<div>${esc(quando(r.quando))} · <b>${esc(nomeUsuario(r.usuario) || '—')}</b> · ${esc(CK_LAB[r.de] || r.de || '—')} → ${esc(CK_LAB[r.para] || r.para || '—')}${r.obs ? ' · ' + esc(r.obs) : ''}</div>`).join('')
    : '<span>Sem checagens registradas.</span>';
  COLAB.registro = CK_ATUAL.chave; COLAB.desde = agoraISO();
  renderUsoCk();
  dlgCk.showModal();
  naFila(() => avisarPresenca()).then(() => { if (dlgCk.open) renderUsoCk(); });
}
dlgCk.addEventListener('close', () => { if (COLAB.registro) { COLAB.registro = ''; naFila(() => avisarPresenca()); } });
document.getElementById('ck-uso').addEventListener('click', e => { if (e.target.id === 'ck-forcar') { CK_FORCAR = true; renderUsoCk(); } });
document.getElementById('ck-cancel').addEventListener('click', () => dlgCk.close());
document.getElementById('ck-form').addEventListener('submit', e => {
  e.preventDefault();
  if (!COLAB.sessao || document.getElementById('ck-save').disabled) return;
  const status = document.getElementById('ck-status').value, obs = document.getElementById('ck-obs').value.trim();
  const ant = ckOf(CK_ATUAL.chave);
  if (ant && ant.status === status && (ant.obs || '') === obs) { dlgCk.close(); return; }
  const agora = agoraISO(), u = usuarioAtual();
  COLAB.checks[CK_ATUAL.chave] = { tipo: CK_ATUAL.tipo, mes: CK_ATUAL.mes, ref: CK_ATUAL.desc, status, obs, usuario: u.login, nome: u.nome, quando: agora, atualizadoEm: agora };
  const ev = { id: novoId('e'), quando: agora, usuario: u.login, nome: u.nome, acao: 'checagem', tipo: CK_ATUAL.tipo, mes: CK_ATUAL.mes, chave: CK_ATUAL.chave,
    ref: CK_ATUAL.desc, de: ant ? ant.status : 'pendente', para: status, obs };
  COLAB.eventos[ev.id] = ev; COLAB.versoes[CK_ATUAL.chave] = agora;
  derivarLog(); aoMudarDados();
  dlgCk.close(); colabRender();
  avisoRapido('Checagem salva: ' + (CK_LAB[status] || status));
});
document.addEventListener('click', e => {
  const b = e.target.closest('.ck-btn[data-ck]'); if (!b) return;
  e.stopPropagation(); abrirChecagem(b);
}, true);

/* ---------------- aba Registro (checagens de todos, juntadas da pasta) ---------------- */
const REG_TIPO = { pi: 'Pagamento indevido', cf: 'Confronto' };
const regUsuario = r => nomeUsuario(r.usuario) || r.nome || '';
function regFiltrado() {
  const q = document.getElementById('reg-q').value.trim().toLowerCase();
  return COLAB.log.filter(r => !q || [regUsuario(r), r.ref, r.obs, r.mes, CK_LAB[r.para]].join(' ').toLowerCase().includes(q));
}
function renderRegistro() {
  const box = document.getElementById('registro'), note = document.getElementById('reg-note');
  document.getElementById('reg-btn').disabled = !COLAB.modo || !COLAB.log.length;
  if (!COLAB.modo) {
    note.textContent = '';
    box.innerHTML = `<div class="s-vazio" style="margin:14px"><h4>Checagens só no sistema</h4><p>${COLAB.leitura
      ? 'Este link é só para leitura. As checagens e o registro ficam no sistema aberto pela pasta do SharePoint, no Chrome ou no Edge.'
      : 'Entre com o seu usuário para ver e registrar as checagens.'}</p></div>`;
    return;
  }
  const rs = regFiltrado();
  note.textContent = `${COLAB.log.length} registro(s) · mais recentes primeiro · pasta ${COLAB.handle ? COLAB.handle.name : ''}`;
  box.innerHTML = rs.length ? `<div style="overflow-x:auto"><table class="reg-t">
      <thead><tr><th>Quando</th><th>Usuário</th><th>Tipo</th><th>Mês</th><th>Item</th><th>De → para</th><th>Observações</th></tr></thead>
      <tbody>${rs.map(r => `<tr><td class="num">${esc(quando(r.quando))}</td><td>${esc(regUsuario(r) || '—')}${r.anterior ? ' <span class="s-selo neutro">versão anterior</span>' : ''}</td>
        <td>${esc(REG_TIPO[r.tipo] || r.tipo || '')}</td><td>${r.mes ? esc(mshort(r.mes)) : ''}</td><td class="w">${esc(r.ref || '')}</td>
        <td>${esc(CK_LAB[r.de] || r.de || '—')} → ${esc(CK_LAB[r.para] || r.para || '—')}</td><td class="w">${esc(r.obs || '')}</td></tr>`).join('')}</tbody>
    </table></div>` : '<div class="s-vazio" style="margin:14px"><h4>Nenhuma checagem registrada</h4><p>Cada checagem salva no Pagamento indevido e nos Confrontos aparece aqui, com usuário, data e hora.</p></div>';
}
document.getElementById('reg-q').addEventListener('input', renderRegistro);
document.getElementById('reg-btn').addEventListener('click', async () => {
  const msg = document.getElementById('reg-msg');
  const rows = [['Quando', 'Usuário', 'Tipo', 'Mês', 'Item', 'De', 'Para', 'Observações']].concat(
    COLAB.log.map(r => [quando(r.quando), regUsuario(r), REG_TIPO[r.tipo] || '', r.mes ? mshort(r.mes) : '', r.ref || '',
      CK_LAB[r.de] || r.de || '', CK_LAB[r.para] || r.para || '', r.obs || '']));
  const dias = COLAB.log.map(r => (r.quando || '').slice(0, 10)).filter(Boolean).sort();
  try {
    const nome = nomeExport('registro_checagens', dias[0] || hojeISO(), dias[dias.length - 1] || hojeISO(), 'xlsx');
    const st = await salvarArquivo(nome, XLSX_MIN.build([{ name: 'Registro', rows, header: 0, widths: [16, 26, 18, 8, 60, 24, 24, 60] }]));
    msg.textContent = ''; avisoRapido(st === 'delivered' ? 'Registro enviado.' : `Exportado: ${COLAB.log.length} registros`);
  } catch (e) { msg.textContent = e && e.code === 'declined' ? 'Download cancelado.' : 'Não foi possível gerar o arquivo.'; }
});

/* ---------------- início ---------------- */
function renderCkAll() { renderIndevido(); renderConfrontos(); }
document.getElementById('versao').textContent = 'Versão ' + VERSAO;
setTimeout(function acessoInit() {   /* depois do resto do painel montar a tela */
  const local = carregar('dados', null);   /* cópia do navegador: aparece já, a pasta completa no ciclo */
  if (local) aplicarMescla(local);
  if (window.claude && typeof window.claude.use === 'function') { COLAB.leitura = true; colabRender(); return; }
  colabRender();
  mostrarEntrada();
});
