// Teste automatizado do Padrão de Sistemas Tóliman: duas pessoas na mesma pasta do SharePoint.
// A pasta é simulada com uma pasta temporária: o showDirectoryPicker do navegador é trocado por
// um objeto que lê e grava nessa pasta (pelo Node), com a mesma interface da File System Access API.
//
// Uso: python3 scripts/3_painel.py && node tests/pasta-sharepoint.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = 'file://' + path.join(RAIZ, 'saida', 'Dashboard_Produtividade_Motoristas.html');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'motoristas-'));
const PASTA = path.join(TMP, 'Produtividade de Motoristas');
fs.mkdirSync(PASTA);
const SHOTS = process.env.SHOTS || '';

let falhas = 0, ok = 0;
const conferir = (cond, txt) => { if (cond) { ok++; console.log('  ok  ', txt); } else { falhas++; console.log('  FALHOU', txt); } };

// versão anterior (painel-dados/), para conferir a leitura só para leitura
const leg = path.join(PASTA, 'painel-dados', 'registro');
fs.mkdirSync(leg, { recursive: true });
fs.writeFileSync(path.join(PASTA, 'painel-dados', 'usuarios.json'), JSON.stringify({ lista: [{ id: 'u1', nome: 'Carla Antiga', ativo: true, admin: true }] }));
fs.writeFileSync(path.join(leg, 'u1.json'), JSON.stringify([{ id: 'eAntigo1', quando: '2026-11-01T12:00:00.000Z', usuario: 'u1', acao: 'checagem', tipo: 'cf',
  mes: '2026-10', chave: 'cf_2026-10_01-1-999999', ref: 'CT-e de teste da versão anterior', de: 'pendente', para: 'ok', obs: 'conferido antes' }]));

/* ponte Node <-> página: operações de arquivo na pasta temporária */
async function ponte(page) {
  await page.exposeFunction('__fs', (op, rel, dados) => {
    const p = path.join(TMP, rel);
    if (!p.startsWith(TMP)) throw new Error('fora da pasta');
    if (op === 'lista') return fs.readdirSync(p, { withFileTypes: true }).map(d => [d.name, d.isDirectory() ? 'directory' : 'file']);
    if (op === 'tipo') return fs.existsSync(p) ? (fs.statSync(p).isDirectory() ? 'directory' : 'file') : '';
    if (op === 'mkdir') { fs.mkdirSync(p, { recursive: true }); return true; }
    if (op === 'ler') return { texto: fs.readFileSync(p, 'utf8'), mod: Math.floor(fs.statSync(p).mtimeMs) };
    if (op === 'gravar') { fs.writeFileSync(p, dados); return true; }
    if (op === 'apagar') { fs.rmSync(p); return true; }
    throw new Error('op ' + op);
  });
  await page.addInitScript(raiz => {
    const junta = (a, b) => a + '/' + b;
    class Arq {
      constructor(rel, nome) { this.kind = 'file'; this.rel = rel; this.name = nome; }
      async getFile() { const r = await window.__fs('ler', this.rel); return { lastModified: r.mod, text: async () => r.texto }; }
      async createWritable() { let buf = ''; const rel = this.rel; return { write: async t => { buf += t; }, close: async () => window.__fs('gravar', rel, buf) }; }
    }
    class Dir {
      constructor(rel, nome) { this.kind = 'directory'; this.rel = rel; this.name = nome; }
      async getDirectoryHandle(n, o) { const r = junta(this.rel, n), t = await window.__fs('tipo', r);
        if (t !== 'directory') { if (o && o.create) await window.__fs('mkdir', r); else throw new DOMException('não existe', 'NotFoundError'); } return new Dir(r, n); }
      async getFileHandle(n, o) { const r = junta(this.rel, n), t = await window.__fs('tipo', r);
        if (t !== 'file') { if (o && o.create) await window.__fs('gravar', r, ''); else throw new DOMException('não existe', 'NotFoundError'); } return new Arq(r, n); }
      async *entries() { for (const [n, k] of await window.__fs('lista', this.rel)) yield [n, k === 'directory' ? new Dir(junta(this.rel, n), n) : new Arq(junta(this.rel, n), n)]; }
      async removeEntry(n) { await window.__fs('apagar', junta(this.rel, n)); }
      async queryPermission() { return 'granted'; }
      async requestPermission() { return 'granted'; }
    }
    window.showDirectoryPicker = async () => new Dir(raiz, raiz.split('/').pop());
  }, path.basename(PASTA));
}
const corpo = page => page.$eval('#dlgEntrada', d => d.open ? d.textContent.replace(/\s+/g, ' ') : '');
async function abrir(browser, nome) {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => { falhas++; console.log('  ERRO JS', nome, e.message); });
  await ponte(page);
  await page.goto(HTML);
  await page.waitForTimeout(600);
  return page;
}
async function entrar(page, login, senha) {
  await page.selectOption('#entUsuario', login);
  await page.fill('#entSenha', senha);
  await page.click('#dlgEntrada .cta');
  await page.waitForTimeout(1500);
}
const ler = rel => JSON.parse(fs.readFileSync(path.join(PASTA, rel), 'utf8'));
const arquivos = sub => fs.existsSync(path.join(PASTA, sub)) ? fs.readdirSync(path.join(PASTA, sub)) : [];

const browser = await chromium.launch();
try {
  console.log('Pessoa A: primeiro acesso');
  const A = await abrir(browser, 'A');
  conferir((await corpo(A)).includes('Conectar a pasta do SharePoint'), 'sem pasta, pede para conectar');
  if (SHOTS) await A.screenshot({ path: SHOTS + '/1-conectar.png' });
  await A.click('#dlgEntrada .cta'); await A.waitForTimeout(600);
  conferir((await corpo(A)).includes('Primeiro acesso'), 'pasta vazia: primeiro acesso');
  await A.fill('#entNome', 'Ana Souza'); await A.fill('#entSenha', 'acesso2026'); await A.fill('#entRepete', 'acesso2026');
  await A.click('#dlgEntrada .cta'); await A.waitForTimeout(2500);
  conferir(!(await corpo(A)), 'entrou e a janela fechou');
  const ana = ler('usuarios/ana-souza.json');
  conferir(ana.admin === true && ana.senha.alg === 'PBKDF2-SHA256' && ana.senha.iter === 150000, 'usuarios/ana-souza.json: administradora, PBKDF2 150 mil');
  conferir(!JSON.stringify(ana).includes('acesso2026'), 'o texto da senha não é gravado');

  console.log('A cadastra Bruno com senha provisória');
  await A.click('#cfg-btn'); await A.click('[data-cfg="usuarios"]'); await A.waitForTimeout(300);
  await A.fill('#us-nome', 'Bruno Lima'); await A.fill('#us-senha', 'provisoria1');
  await A.click('form[data-form="novo"] button[type=submit]'); await A.waitForTimeout(1500);
  conferir(ler('usuarios/bruno-lima.json').trocarSenha === true, 'usuarios/bruno-lima.json com trocarSenha');
  conferir((await A.textContent('#cfg-corpo')).includes('só um administrador ativo'), 'aviso de um só administrador');
  if (SHOTS) await A.screenshot({ path: SHOTS + '/2-usuarios.png' });
  await A.click('#cfg-fechar');

  console.log('Pessoa B: senha provisória');
  const B = await abrir(browser, 'B');
  await B.click('#dlgEntrada .cta'); await B.waitForTimeout(600);
  conferir((await corpo(B)).includes('Usuário'), 'pasta com usuários: tela de entrada');
  if (SHOTS) await B.screenshot({ path: SHOTS + '/3-entrar.png' });
  await entrar(B, 'bruno-lima', 'errada1');
  conferir((await corpo(B)).includes('Senha incorreta.'), 'senha errada: "Senha incorreta."');
  await entrar(B, 'bruno-lima', 'provisoria1');
  conferir((await corpo(B)).includes('senha provisória'), 'pede para trocar a senha provisória');
  await B.fill('#entSenha', 'provisoria1'); await B.fill('#entRepete', 'provisoria1'); await B.click('#dlgEntrada .cta'); await B.waitForTimeout(1500);
  conferir((await corpo(B)).includes('Escolha uma senha diferente da provisória.'), 'não aceita a mesma senha');
  await B.fill('#entSenha', 'bruno2026'); await B.fill('#entRepete', 'bruno2026'); await B.click('#dlgEntrada .cta'); await B.waitForTimeout(2500);
  conferir(!(await corpo(B)), 'B entrou com a senha nova');

  console.log('Checagem com bloqueio por registro');
  for (const P of [A, B]) { await P.selectOption('#mes', '2026-10'); await P.click('#tab-pi'); await P.waitForTimeout(400); }
  await A.evaluate(() => naFila(ciclo)); await A.waitForTimeout(800);
  conferir((await A.textContent('#colab')).includes('Bruno Lima'), 'A vê Bruno online');
  await B.click('#indevido .ck-btn'); await B.waitForTimeout(1200);
  await A.evaluate(() => naFila(ciclo)); await A.waitForTimeout(800);
  await A.click('#indevido .ck-btn'); await A.waitForTimeout(800);
  conferir((await A.textContent('#ck-uso')).includes('em uso por Bruno Lima'), 'A vê a checagem "em uso por Bruno Lima"');
  conferir(await A.$eval('#ck-save', b => b.disabled), 'botão de salvar desativado para A');
  if (SHOTS) await A.screenshot({ path: SHOTS + '/4-em-uso.png' });
  await A.click('#ck-cancel');
  await B.selectOption('#ck-status', 'ok'); await B.fill('#ck-obs', 'Conferido no Rodopar'); await B.click('#ck-save');
  await B.waitForTimeout(3500);
  conferir(arquivos('dados').length === 2, 'dados/: um arquivo por navegador (' + arquivos('dados').length + ')');
  conferir(arquivos('backups').some(n => /^Produtividade_Motoristas_dados_\d{4}-\d{2}-\d{2}_Bruno_Lima\.json$/.test(n)), 'backups/: cópia do dia de Bruno');
  await A.evaluate(() => naFila(ciclo)); await A.waitForTimeout(1000);
  conferir((await A.textContent('#indevido')).includes('Verificado — sem correção'), 'A recebe a checagem de Bruno');
  await A.click('#tab-reg'); await A.waitForTimeout(300);
  const reg = await A.textContent('#registro');
  conferir(reg.includes('Bruno Lima') && reg.includes('Conferido no Rodopar'), 'Registro mostra a checagem de Bruno');
  conferir(reg.includes('versão anterior') && reg.includes('Carla Antiga'), 'Registro lê a versão anterior (painel-dados)');
  if (SHOTS) await A.screenshot({ path: SHOTS + '/5-registro.png' });

  console.log('Sessão bloqueada');
  await A.evaluate(() => bloquearSessao()); await A.waitForTimeout(500);
  conferir((await corpo(A)).includes('Sessão bloqueada'), 'bloqueio pede a senha');
  if (SHOTS) await A.screenshot({ path: SHOTS + '/6-bloqueada.png' });
  await A.fill('#entSenha', 'acesso2026'); await A.click('#dlgEntrada .cta'); await A.waitForTimeout(1500);
  conferir(!(await corpo(A)), 'desbloqueou');
  const hist = arquivos('historico').flatMap(n => ler('historico/' + n));
  conferir(['entrada', 'senha-errada', 'troca-senha', 'bloqueio', 'usuario'].every(t => hist.some(h => h.tipo === t)), 'historico/ com entradas, senha errada, troca, bloqueio e usuários');

  console.log('Administrador desativa Bruno');
  await A.click('#cfg-btn'); await A.click('[data-cfg="usuarios"]'); await A.waitForTimeout(300);
  await A.click('button[data-us="bruno-lima"][data-op="ativo"]'); await A.waitForTimeout(800);
  conferir(ler('usuarios/bruno-lima.json').ativo === false, 'Bruno desativado');
  await A.click('button[data-us="ana-souza"][data-op="admin"]'); await A.waitForTimeout(500);
  conferir((await A.textContent('#cfg-corpo')).includes('pelo menos um administrador ativo') && ler('usuarios/ana-souza.json').admin, 'não tira o único administrador');
  await A.click('#cfg-fechar');
  await B.evaluate(() => naFila(ciclo)); await B.waitForTimeout(800);
  conferir((await corpo(B)).includes('Sessão bloqueada'), 'Bruno desativado: sessão de B bloqueia');
  await B.fill('#entSenha', 'bruno2026'); await B.click('#dlgEntrada .cta'); await B.waitForTimeout(1500);
  conferir((await corpo(B)).includes('Usuário não encontrado ou desativado.'), 'no desbloqueio, B sai');
  await A.close(); await B.close();

  console.log('Outros modos');
  const L = await browser.newPage();
  await L.addInitScript(() => { window.claude = { use: () => Promise.reject(new Error('sem recurso')) }; });
  await L.goto(HTML); await L.waitForTimeout(600);
  conferir((await L.textContent('#colab')).includes('Somente leitura') && !(await corpo(L)), 'painel publicado: só leitura, sem janela de entrada');
  await L.close();
  const S = await browser.newPage();
  await S.addInitScript(() => { delete window.showDirectoryPicker; });
  await S.goto(HTML); await S.waitForTimeout(600);
  conferir((await corpo(S)).includes('Navegador sem suporte'), 'navegador sem acesso à pasta: "Navegador sem suporte"');
  await S.close();
} finally {
  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
}
console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
