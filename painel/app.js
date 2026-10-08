/* ==========================================================================
   BASES POR MÊS  —  DATASETS e TOTAIS injetados pelo build (scripts/3_painel.py)
   ========================================================================== */
const DATASETS = __DATASETS__;
const TOTAIS   = __TOTAIS__;
const MESES    = Object.keys(DATASETS).sort();
const MLABEL   = __MLABEL__;
const MSHORT   = __MSHORT__;
const mlab  = m => MLABEL[m] || m;
const mshort= m => MSHORT[m] || m;

let MES  = MESES[MESES.length-1];
let DATA = DATASETS[MES];
let T    = TOTAIS[MES];

/* ---------- formatação ---------- */
const nf = (v,d=0)=> (v==null||isNaN(v)) ? '—' : v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const brl = v => nf(v,2);
const pct = (v,d=1)=> (v==null||isNaN(v)) ? '—' : (v*100).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})+'%';
const compact = v => v>=1e6 ? nf(v/1e6,2)+' mi' : v>=1e3 ? nf(v/1e3,1)+' mil' : nf(v,0);
const sgn = (v,d=1)=> v==null||isNaN(v) ? '—' : (v>=0?'+':'')+nf(v*100,d)+'%';

const SHORT = {
  'GRUPO VOLVO SCANIA 480 /510 e 540':[20,'Volvo/Scania 480·510·540'],
  'GRUPO VOLVO SCANIA CAÇAMBA':      [48,'Volvo/Scania Caçamba'],
  'GRUPO VOLVO SCANIA GRANELEIRO':   [50,'Volvo/Scania Graneleiro'],
  'GRUPO VOLVO SCANIA TAMPA BAIXA':  [21,'Volvo/Scania Tampa Baixa'],
  'GRUPO METEOR VW':                 [49,'Meteor VW'],
  'GRUPO SCANIA E VOLVO 440':        [17,'Scania/Volvo 440'],
  'GRUPO VOLVO BI TRUCK':            [18,'Volvo Bi-Truck']
};
const gcode = g => SHORT[g] ? SHORT[g][0] : null;
const short = g => SHORT[g] ? `<span class="gnum num">${SHORT[g][0]}</span>${SHORT[g][1]}` : (g||'—');
const shortTxt = g => SHORT[g] ? `${SHORT[g][0]} — ${SHORT[g][1]}` : g;
const GCOL = ['#1C2543','#DD4663','#AE82B1','#F4D38D','#5C6486','#E88A9C','#8FA0C8'];

/* ordem de grupos fixa (união de todos os meses) para a cor não mudar de mês para mês */
const ALLROWS = MESES.flatMap(m=>DATASETS[m]);
const GROUPS = [...new Set(ALLROWS.map(d=>d.grupo))].sort((a,b)=>
  ALLROWS.filter(d=>d.grupo===b).reduce((s,d)=>s+d.frete,0) - ALLROWS.filter(d=>d.grupo===a).reduce((s,d)=>s+d.frete,0));
const gcol = g => GCOL[GROUPS.indexOf(g) % GCOL.length];

const isManobrista = d => d.frete === 0;

/* critério de avaliação: só quem rodou ao menos KM_MIN no mês entra nos rankings e
   nas comparações com a frota; os totais da frota continuam com todos (foi pago) */
const KM_MIN = __KM_MIN__;

/* movimentações do PDF (por mês, quando disponíveis) e verificações calculadas no build */
const LANC = __LANC__;
const REGRAS = __REGRAS__;
const esc = t => String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const REGRA = Object.fromEntries(REGRAS.map(r=>[r.id,r]));
const movsDe = (mes,cod)=>{ const L = LANC[mes]; if(!L || !L.mot[cod]) return null;
  return L.mot[cod].map(r=>Object.fromEntries(L.campos.map((c,i)=>[c,r[i]]))); };
const flagsDe = (mes,cod)=> (LANC[mes] && LANC[mes].flags[cod]) || {};
const nAlertas = (mes,cod)=> Object.values(flagsDe(mes,cod)).flat().filter(f=>REGRA[f[0]].nivel==='alerta').length;
const tagAlerta = d => { const n = nAlertas(MES,d.cod); return n ? `<span class="tagx alerta">${n} alerta${n>1?'s':''} nas movimentações</span>` : ''; };
const isAvaliado = d => d.km >= KM_MIN;
const motivoFora = d => isManobrista(d) ? 'manobrista / sem frete' : (d.km <= 2 ? 'sem km apurado' : nf(d.km)+' km');
let ATIVOS = DATA.filter(d=>isAvaliado(d) && !isManobrista(d));
let RK = {};
function calcRanks(){
  RK = {};
  const pool = DATA.filter(isAvaliado);
  const rank = (arr,k) => { const v = arr.map(d=>d[k]); arr.forEach(d=>{ (RK[d.cod] ||= {})[k] = 1 + v.filter(x=>x>d[k]).length; }); };
  rank(pool.filter(d=>d.frete>0),'frete');
  rank(pool.filter(d=>d.bonif>0),'bonif');
}
const rkF = d => RK[d.cod] && RK[d.cod].frete, rkB = d => RK[d.cod] && RK[d.cod].bonif;
const tagFora = d => isAvaliado(d) ? '' : `<span class="tagx fora" title="Abaixo de ${nf(KM_MIN)} km no mês: fora dos rankings e das comparações">fora do critério · ${motivoFora(d)}</span>`;

/* ================= SELETOR DE MÊS ================= */
const mesSel = document.getElementById('mes');
mesSel.innerHTML = MESES.slice().reverse().map(m=>`<option value="${m}">${mlab(m)}</option>`).join('');
mesSel.value = MES;
mesSel.addEventListener('change',()=>{ MES = mesSel.value; renderMes(); });

/* ================= VISÃO GERAL ================= */
function renderKPIs(){
  const prev = MESES[MESES.indexOf(MES)-1], P = prev ? TOTAIS[prev] : null;
  const d = (a,b)=> (P && b) ? a/b-1 : null;
  const tag = v => v==null ? '' : `<span class="delta ${v>=0?'up':'down'}">${sgn(v)}</span>`;
  const vs  = prev ? ` vs ${mshort(prev)}` : '';

  document.getElementById('k-frete').textContent = brl(T.frete);
  document.getElementById('k-frete-sub').innerHTML = 'R$ '+brl(T.freteMedioViagem)+' por viagem'+tag(d(T.frete,P&&P.frete))+vs;
  document.getElementById('k-bonif').textContent = brl(T.totalBonif);
  document.getElementById('k-bonif-sub').innerHTML = pct(T.pctBonifFrete,2)+' do frete cliente'+tag(d(T.totalBonif,P&&P.totalBonif))+vs;
  document.getElementById('k-km').textContent = nf(T.km);
  document.getElementById('k-km-sub').innerHTML = 'R$ '+nf(T.fretePorKm,2)+' de frete por km'+tag(d(T.km,P&&P.km))+vs;
  document.getElementById('k-viag').textContent = nf(T.viagens);
  document.getElementById('k-viag-sub').innerHTML = nf(T.viagensVira)+' com vira · '+nf(T.viagensVira-T.viagens)+' viras'+tag(d(T.viagens,P&&P.viagens))+vs;
  document.getElementById('k-media').textContent = nf(T.media,2);
  document.getElementById('k-media-sub').innerHTML = 'R$ '+brl(T.valorEconomia)+' de economia'+tag(d(T.media,P&&P.media))+vs;
  document.getElementById('k-pctbf').textContent = pct(T.pctBonifFrete,2);
  document.getElementById('k-pctbf-sub').textContent = 'R$ '+brl(T.totalBonif)+' sobre R$ '+brl(T.frete);
  document.getElementById('k-part').textContent = pct(T.partFrete,2);
  document.getElementById('k-part-sub').textContent = 'soma dos '+DATA.length+' motoristas · '+pct(1/DATA.length,2)+' em média por motorista';
}

function renderComp(el,legEl,items,total){
  el.innerHTML = items.filter(i=>i.v>0).map(i=>
    `<span style="width:${(i.v/total*100)}%;background:${i.c}"></span>`).join('') ||
    `<span style="width:100%;background:#E7E9F1"></span>`;
  legEl.innerHTML = items.map(i=>
    `<div class="leg-row"><span class="sw" style="background:${i.c}"></span>
     <span>${i.k}</span>
     <span class="lv">R$ ${brl(i.v)}<span class="lp">${total?pct(i.v/total,1):'—'}</span></span></div>`).join('') +
    `<div class="leg-row" style="border-top:1px solid var(--line);padding-top:9px">
     <span></span><span style="font-weight:700">Total</span>
     <span class="lv">R$ ${brl(total)}</span></div>`;
}
function renderComposicao(){
  renderComp(document.getElementById('stack'),document.getElementById('leg'),[
    {k:'Bônus operacional', v:T.bonusOp,        c:'var(--ink)'},
    {k:'Prêmio por economia', v:T.premioEconomia, c:'var(--coral)'},
    {k:'Bônus por média',   v:T.bonusMedia,     c:'var(--mauve)'}
  ],T.totalBonif);
  document.getElementById('comp-mini').innerHTML = `
    <div><div class="lab">Bonificação por viagem</div><div class="val"><small>R$ </small>${brl(T.bonifMediaViagem)}</div></div>
    <div><div class="lab">Bonificação por km</div><div class="val"><small>R$ </small>${nf(T.bonifPorKm,2)}</div></div>
    <div><div class="lab">Economia gerada</div><div class="val"><small>R$ </small>${brl(T.valorEconomia)}</div></div>
    <div><div class="lab">Convertida em prêmio</div><div class="val">${pct(T.premioEconomia/T.valorEconomia,1)}</div></div>`;
}

function renderGrupos(){
  const gAgg = GROUPS.map(g=>{
    const r = DATA.filter(d=>d.grupo===g);
    return {g, n:r.length, frete:r.reduce((s,d)=>s+d.frete,0), km:r.reduce((s,d)=>s+d.km,0), bonif:r.reduce((s,d)=>s+d.bonif,0)};
  }).filter(x=>x.n>0);
  const gMax = Math.max(...gAgg.map(x=>x.frete),1);
  document.getElementById('grupos').innerHTML = gAgg.map(x=>`
    <div>
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin-bottom:5px">
        <span class="gtag"><span class="gdot" style="background:${gcol(x.g)}"></span>${short(x.g)}</span>
        <span style="font-size:12px;font-weight:600;white-space:nowrap">R$ ${compact(x.frete)}</span>
      </div>
      <div class="track thin"><div class="fill" style="width:${Math.max(x.frete/gMax*100,1.2)}%;background:${gcol(x.g)}"></div></div>
      <div style="font-size:10.5px;color:var(--muted);margin-top:5px">${x.n} motoristas · ${nf(x.km)} km · R$ ${compact(x.bonif)} em bonificações</div>
    </div>`).join('');
}

/* motoristas fora do critério (abaixo de KM_MIN) */
function renderFora(){
  const F = T.fora, rows = DATA.filter(d=>!isAvaliado(d)).sort((a,b)=>b.bonif-a.bonif);
  document.getElementById('fora-note').textContent = `abaixo de ${nf(KM_MIN)} km no mês · fora dos rankings e das comparações`;
  document.getElementById('fora').innerHTML = !rows.length
    ? `<div style="color:var(--muted);font-size:12.5px">Todos os motoristas do mês rodaram ${nf(KM_MIN)} km ou mais.</div>`
    : `<div class="mini" style="margin-bottom:14px">
        <div><div class="lab">Motoristas</div><div class="val">${F.n} <small>de ${DATA.length}</small></div></div>
        <div><div class="lab">Bonificação paga</div><div class="val"><small>R$ </small>${brl(F.bonif)} <small>${pct(F.bonif/T.totalBonif,1)} do total</small></div></div>
        <div><div class="lab">Bônus operacional</div><div class="val"><small>R$ </small>${brl(F.bonusOp)}</div></div>
        <div><div class="lab">Premiação</div><div class="val"><small>R$ </small>${brl(F.premTot)}</div></div>
      </div>
      <div class="fora-list">${rows.map(d=>`
        <button data-cod="${d.cod}" class="fora-row">
          <span class="nm">${d.nome} <span class="gtag num">${d.cod}</span></span>
          <span class="fm">${motivoFora(d)}</span>
          <span class="num fv">R$ ${brl(d.bonif)}</span>
        </button>`).join('')}</div>
      <div class="tbl-foot">Os valores continuam nos totais da frota (foram pagos). Frete desses motoristas: R$ ${brl(F.frete)}.</div>`;
}
document.getElementById('fora').addEventListener('click',e=>{
  const b=e.target.closest('button[data-cod]'); if(b) openDriver(b.dataset.cod);
});

/* ranking */
const METRICS = {
  frete:{lab:'Frete cliente', fmt:v=>'R$ '+brl(v), pool:()=>ATIVOS},
  bonif:{lab:'Bonificações',  fmt:v=>'R$ '+brl(v), pool:()=>ATIVOS},
  km:   {lab:'KM rodado',     fmt:v=>nf(v)+' km',  pool:()=>ATIVOS},
  media:{lab:'Média km/l',    fmt:v=>nf(v,3)+' km/l', pool:()=>ATIVOS},
  econ: {lab:'Economia',      fmt:v=>'R$ '+brl(v), pool:()=>ATIVOS},
  pctBF:{lab:'% Bonif./frete',fmt:v=>pct(v,2), pool:()=>ATIVOS.filter(d=>typeof d.pctBF==='number')},
  part: {lab:'Part. % no frete', fmt:v=>pct(v,2), pool:()=>ATIVOS}
};
let rankM = 'frete';
function renderRank(){
  const m = METRICS[rankM];
  const rows = [...m.pool()].sort((a,b)=>b[rankM]-a[rankM]).slice(0,12);
  const max = rows.length ? (rows[0][rankM] || 1) : 1;
  document.getElementById('rank').innerHTML = rows.map((d,i)=>`
    <div class="rk">
      <span class="pos num">${String(i+1).padStart(2,'0')}</span>
      <button data-cod="${d.cod}">
        <div class="nm">${d.nome}</div>
        <div class="track"><div class="fill" style="width:${Math.max(d[rankM]/max*100,1.5)}%"></div></div>
      </button>
      <span class="vl num">${m.fmt(d[rankM])}</span>
    </div>`).join('');
}
document.getElementById('rank-ctl').addEventListener('click',e=>{
  const b = e.target.closest('.chip'); if(!b) return;
  rankM = b.dataset.m;
  [...e.currentTarget.children].forEach(c=>c.setAttribute('aria-pressed', c===b));
  renderRank();
});

/* tabela */
const COLS = [
  {k:'cod',  l:'Cód.',      f:d=>`<span class="num">${d.cod}</span>`},
  {k:'nome', l:'Motorista', f:d=>`<strong style="font-weight:600">${d.nome}</strong><br><span class="gtag"><span class="gdot" style="background:${gcol(d.grupo)}"></span>${short(d.grupo)}</span>${tagFora(d)}${tagAlerta(d)}`},
  {k:'frete',l:'Frete (R$)',f:d=>`<span class="num">${brl(d.frete)}</span>`},
  {k:'bonif',l:'Bonif. (R$)',f:d=>`<span class="num">${brl(d.bonif)}</span>`},
  {k:'pctBF',l:'% Bonif./frete', f:d=>`<span class="num">${typeof d.pctBF==='number'?pct(d.pctBF,2):'<span style="color:var(--muted);font-size:11px">manobrista</span>'}</span>`},
  {k:'part', l:'Part. % frete',  f:d=>`<span class="num">${pct(d.part,2)}</span>${rkF(d)?`<span class="rk-tag num">#${rkF(d)}</span>`:''}`},
  {k:'viag', l:'Viagens',   f:d=>`<span class="num">${nf(d.viag)}</span>`},
  {k:'km',   l:'KM',        f:d=>`<span class="num">${nf(d.km)}</span>`},
  {k:'media',l:'km/l',      f:d=>`<span class="num">${d.media?nf(d.media,3):'—'}</span>`},
  {k:'pos',  l:'Pos. grupo',f:d=>`<span class="num">${d.pos||'—'}</span>`},
];
let sortK='frete', sortDir=-1;
const q = document.getElementById('q'), fg = document.getElementById('fgrupo'), fc = document.getElementById('fcrit');
[...GROUPS].sort((a,b)=>gcode(a)-gcode(b)).forEach(g=>fg.insertAdjacentHTML('beforeend',`<option value="${g}">${shortTxt(g)}</option>`));
document.getElementById('thead').innerHTML = COLS.map(c=>`<th data-k="${c.k}">${c.l}<span class="ar"></span></th>`).join('');

function renderTable(){
  const term = q.value.trim().toLowerCase(), g = fg.value;
  const c = fc.value;
  let rows = DATA.filter(d=>(!g||d.grupo===g) && (!term || d.nome.toLowerCase().includes(term) || d.cod.includes(term))
    && (!c || (c==='aval') === isAvaliado(d)));
  rows.sort((a,b)=>{
    if(sortK==='nome'||sortK==='cod') return String(a[sortK]).localeCompare(String(b[sortK]),'pt-BR')*sortDir;
    const x = typeof a[sortK]==='number'?a[sortK]:-1, y = typeof b[sortK]==='number'?b[sortK]:-1;
    return (x-y)*sortDir;
  });
  document.getElementById('tbody').innerHTML = rows.map(d=>
    `<tr data-cod="${d.cod}">${COLS.map(c=>`<td>${c.f(d)}</td>`).join('')}</tr>`).join('')
    || `<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:26px">Nenhum motorista encontrado. Ajuste a busca ou o filtro de grupo.</td></tr>`;
  document.querySelectorAll('#thead th').forEach(th=>
    th.querySelector('.ar').textContent = th.dataset.k===sortK ? (sortDir<0?'↓':'↑') : '');
  if(typeof syncThead==='function') syncThead();
  const sf = rows.reduce((s,d)=>s+d.frete,0), sb = rows.reduce((s,d)=>s+d.bonif,0);
  const sp = rows.reduce((s,d)=>s+d.part,0);
  document.getElementById('tfoot').textContent =
    `${rows.length} de ${DATA.length} motoristas · R$ ${brl(sf)} em frete · R$ ${brl(sb)} em bonificações · ` +
    `${sf?pct(sb/sf,2):'—'} de bonificação sobre frete · ${pct(sp,2)} do frete total da frota`;
}
document.getElementById('thead').addEventListener('click',e=>{
  const th=e.target.closest('th'); if(!th) return;
  if(sortK===th.dataset.k) sortDir*=-1; else {sortK=th.dataset.k; sortDir = th.dataset.k==='nome'||th.dataset.k==='cod' ? 1 : -1;}
  renderTable();
});
q.addEventListener('input',renderTable); fg.addEventListener('change',renderTable); fc.addEventListener('change',renderTable);

/* ================= INDIVIDUAL ================= */
let ORDER = [], cur = 0;
const sel = document.getElementById('sel');
const CMP = [
  {k:'fpv',   l:'Frete por viagem',        fmt:v=>'R$ '+brl(v)},
  {k:'bpv',   l:'Bonificação por viagem',  fmt:v=>'R$ '+brl(v)},
  {k:'fkm',   l:'Frete por km',            fmt:v=>'R$ '+nf(v,2)},
  {k:'bkm',   l:'Bonificação por km',      fmt:v=>'R$ '+nf(v,2)},
  {k:'media', l:'Média de consumo',        fmt:v=>nf(v,3)+' km/l'},
  {k:'pctBF', l:'% Bonificação sobre frete cliente', fmt:v=>pct(v,2)},
  {k:'part',  l:'Part. % no frete total',        fmt:v=>pct(v,2)}
];
const FLEETK = {fpv:'freteMedioViagem', bpv:'bonifMediaViagem', fkm:'fretePorKm', bkm:'bonifPorKm',
                media:'media', pctBF:'pctBonifFrete'};
const fleetVal = k => k==='part' ? 1/DATA.length : T.aval[FLEETK[k]];

/* série do motorista mês a mês (usada no painel individual e na aba Evolução) */
const serie = (cod,k)=> MESES.map(m=>{
  const r = DATASETS[m].find(x=>x.cod===cod);
  return {mes:m, v: r ? (typeof r[k]==='number' ? r[k] : null) : null};
});

function sparkline(pts,color){
  const vals = pts.map(p=>p.v).filter(v=>v!=null);
  if(vals.length<2) return '';
  const mx = Math.max(...vals), mn = Math.min(...vals, 0);
  const W=100, H=26, n=pts.length;
  const x = i => n===1 ? W/2 : i/(n-1)*W;
  const y = v => H - (mx===mn ? H/2 : (v-mn)/(mx-mn)*(H-5)+2.5);
  const d = pts.map((p,i)=> p.v==null ? null : `${i===0?'M':'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).filter(Boolean).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map((p,i)=> p.v==null?'':`<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="2.4" fill="${color}"/>`).join('')}
  </svg>`;
}

function showDriver(i){
  if(!ORDER.length) return;
  cur = (i+ORDER.length)%ORDER.length;
  const d = ORDER[cur];
  sel.value = d.cod;
  document.getElementById('prev').disabled = cur===0;
  document.getElementById('next').disabled = cur===ORDER.length-1;

  document.getElementById('d-cod').textContent = 'MOTORISTA '+d.cod;
  document.getElementById('d-nome').textContent = d.nome;

  const gRows = DATA.filter(x=>x.grupo===d.grupo && isAvaliado(x));
  document.getElementById('d-meta').innerHTML = [
    `<span class="pill">${mlab(MES)}</span>`,
    `<span class="pill"><span class="gdot" style="background:${gcol(d.grupo)}"></span>${short(d.grupo)}</span>`,
    d.pos ? `<span class="pill">Posição no grupo <b>${d.pos} de ${gRows.length}</b></span>` : '',
    rkF(d) ? `<span class="pill">Rank de frete <b>${rkF(d)} de ${DATA.filter(x=>isAvaliado(x)&&x.frete>0).length}</b></span>` : '',
    rkB(d) ? `<span class="pill">Rank de bonificação <b>${rkB(d)} de ${DATA.filter(x=>isAvaliado(x)&&x.bonif>0).length}</b></span>` : '',
    !isAvaliado(d) ? `<span class="pill warn">Fora do critério · ${motivoFora(d)} (mínimo ${nf(KM_MIN)} km) · sem ranking</span>` : '',
    isManobrista(d) ? `<span class="pill warn">Sem frete faturado no período</span>` : '',
    nAlertas(MES,d.cod) ? `<a class="pill warn" href="#d-mov-sec" style="color:#fff;text-decoration:none">${nAlertas(MES,d.cod)} alerta(s) nas movimentações ↓</a>` : ''
  ].filter(Boolean).join('');

  document.getElementById('d-frete').textContent = brl(d.frete);
  document.getElementById('d-frete-sub').textContent = pct(d.part,2)+' do frete total da frota';
  document.getElementById('d-bonif').textContent = brl(d.bonif);
  document.getElementById('d-bonif-sub').textContent = typeof d.pctBF==='number' ? pct(d.pctBF,2)+' do próprio frete' : 'sem frete no período';
  document.getElementById('d-km').textContent = nf(d.km);
  document.getElementById('d-km-sub').textContent = d.km ? nf(d.km/T.km*100,2)+'% da quilometragem da frota' : '—';
  document.getElementById('d-viag').textContent = nf(d.viag);
  document.getElementById('d-viag-sub').textContent = nf(d.vira)+' com vira · '+nf(d.vira-d.viag)+' viras';
  document.getElementById('d-media').textContent = d.media?nf(d.media,3):'—';
  document.getElementById('d-media-sub').textContent = d.media
    ? (d.media>=T.aval.media?'+':'')+nf((d.media/T.aval.media-1)*100,1)+'% ante a média dos avaliados' : 'sem consumo registrado';

  renderComp(document.getElementById('d-stack'),document.getElementById('d-leg'),[
    {k:'Bônus operacional', v:d.bonusOp, c:'var(--ink)'},
    {k:'Prêmio por economia', v:d.premio, c:'var(--coral)'},
    {k:'Bônus por média', v:d.bMedia, c:'var(--mauve)'}
  ], d.bonif);

  document.getElementById('d-mini').innerHTML = `
    <div><div class="lab">Economia gerada</div><div class="val"><small>R$ </small>${brl(d.econ)}</div></div>
    <div><div class="lab">% bônus por média</div><div class="val">${pct(d.pctMedia,0)}</div></div>
    <div><div class="lab">Prêmio total</div><div class="val"><small>R$ </small>${brl(d.premTot)}</div></div>
    <div><div class="lab">Frete por viagem</div><div class="val">${d.fpv!=null?'<small>R$ </small>'+brl(d.fpv):'—'}</div></div>
    <div><div class="lab">% Bonif. sobre frete cliente</div><div class="val">${typeof d.pctBF==='number'?pct(d.pctBF,2):'—'}</div></div>
    <div><div class="lab">Part. % no frete total</div><div class="val">${pct(d.part,2)}</div></div>`;

  document.getElementById('d-cmp').innerHTML = CMP.map(c=>{
    const v = typeof d[c.k]==='number' ? d[c.k] : null;
    const f = fleetVal(c.k);
    const max = Math.max(v??0, f)*1.18 || 1;
    const dl = v!=null && f ? (v/f-1)*100 : null;
    return `<div class="cmp-row">
      <div class="top-line"><span class="cl">${c.l}</span>
        <span class="cv num">${v!=null?c.fmt(v):'—'}${dl!=null?`<span class="delta ${dl>=0?'up':'down'}">${dl>=0?'+':''}${nf(dl,1)}%</span>`:''}</span></div>
      <div class="cmp-track">
        <div class="f" style="width:${v!=null?Math.min(v/max*100,100):0}%"></div>
        <div class="mk" style="left:${Math.min(f/max*100,100)}%"></div>
      </div>
      <div class="avg">${c.k==='part'?'Média por motorista':'Média dos avaliados (≥ '+nf(KM_MIN)+' km)'}: ${c.fmt(f)}</div>
    </div>`;
  }).join('');

  /* histórico do motorista mês a mês */
  const HK = [
    {k:'frete', l:'Frete cliente', fmt:v=>'R$ '+brl(v)},
    {k:'bonif', l:'Bonificações',  fmt:v=>'R$ '+brl(v)},
    {k:'km',    l:'KM rodado',     fmt:v=>nf(v)+' km'},
    {k:'media', l:'Média km/l',    fmt:v=>nf(v,3)},
    {k:'viag',  l:'Viagens',       fmt:v=>nf(v)}
  ];
  document.getElementById('d-hist').innerHTML = HK.map(h=>{
    const s = serie(d.cod,h.k);
    const a = s[s.length-1].v, b = s[s.length-2] ? s[s.length-2].v : null;
    const dl = (a!=null && b) ? a/b-1 : null;
    return `<div class="hist-row">
      <div class="hl">${h.l}</div>
      <div class="hs">${sparkline(s,'var(--ink)')||'<span class="hna">série incompleta</span>'}</div>
      <div class="hv">${s.map(p=>`<span class="hm"><i>${mshort(p.mes)}</i>${p.v!=null?h.fmt(p.v):'—'}</span>`).join('')}
        ${dl!=null?`<span class="delta ${dl>=0?'up':'down'}">${sgn(dl)}</span>`:''}</div>
    </div>`;
  }).join('');
  renderMov(d);
}
/* movimentações do motorista, na mesma disposição do PDF, com as verificações */
let movFiltro = 'todas';
function renderMov(d){
  const L = movsDe(MES,d.cod), F = flagsDe(MES,d.cod);
  const note = document.getElementById('d-mov-note'), box = document.getElementById('d-mov'),
        tools = document.getElementById('d-mov-tools'), foot = document.getElementById('d-mov-foot');
  if(!L){
    note.textContent = ''; tools.innerHTML = ''; foot.textContent = '';
    box.innerHTML = `<div style="padding:18px;color:var(--muted);font-size:12.5px">As movimentações detalhadas de ${mlab(MES)} não estão disponíveis — o PDF do mês não foi processado com o detalhe dos lançamentos.</div>`;
    return;
  }
  const per = LANC[MES].periodo.viagens;
  const nAl = Object.values(F).flat().filter(f=>REGRA[f[0]].nivel==='alerta').length;
  const nIn = Object.values(F).flat().filter(f=>REGRA[f[0]].nivel==='info').length;
  note.textContent = `${L.length} lançamentos${per?` · viagens de ${per[0]} a ${per[1]}`:''} · ${nAl} alerta(s) · ${nIn} informativo(s)`;
  tools.innerHTML = ['todas','alerta','qualquer'].map(k=>`<button class="chip" data-f="${k}" aria-pressed="${movFiltro===k}">${
    {todas:'Todos os lançamentos', alerta:'Só com alerta', qualquer:'Com qualquer verificação'}[k]}</button>`).join('');
  const nivelLinha = i => { const f = F[i]||[]; return f.some(x=>REGRA[x[0]].nivel==='alerta') ? 'al' : (f.length ? 'inf' : ''); };
  const idx = L.map((_,i)=>i).filter(i=> movFiltro==='todas' || (movFiltro==='alerta' ? nivelLinha(i)==='al' : (F[i]||[]).length));
  const v = x => x ? brl(x) : '<span style="color:#B9BFD2">0,00</span>';
  const H = ['Documento','Data','Chegada','Container','Cliente','Origem / Destino','T. Frete','CT-e','Nº RV','VG','Lona','Vira','Carregamento','Lona (R$)','Viagem'];
  const rows = idx.map(i=>{ const x = L[i], f = F[i]||[];
    return `<tr class="${nivelLinha(i)} ${f.length?'tem':''}">
      <td class="l num"><span class="tp ${x.tipo}">${x.tipo}</span>${x.doc}</td>
      <td class="num">${x.data}</td><td class="num dim">${x.chegada}</td>
      <td class="l num dim">${x.container||''}</td>
      <td class="l wrap">${esc(x.cliente)}</td><td class="l wrap">${esc(x.od)}</td>
      <td class="num">${v(x.frete)}</td><td class="num dim">${x.cte}</td><td class="num ${/^\d+$/.test(x.rv)?'dim':''}">${x.rv}</td>
      <td class="num">${x.vg}</td><td class="num">${x.lonaq}</td>
      <td class="num">${v(x.vira)}</td><td class="num">${v(x.carreg)}</td><td class="num">${v(x.lona)}</td><td class="num">${v(x.viagem)}</td>
    </tr>${f.length?`<tr class="sub ${nivelLinha(i)}"><td colspan="15"><div class="subin">${f.map(([id,msg])=>
      `<span class="fi"><span class="flag ${REGRA[id].nivel}" title="${esc(REGRA[id].descricao)}">${REGRA[id].curto}</span><span class="fmsg">${esc(msg)}</span>${
        id==='CTE_FRETE_DUP'?` <button class="link" data-cte="${esc(x.cte)}">ver lado a lado</button>`:''}</span>`).join('')}</div></td></tr>`:''}`; }).join('');
  const s = k => L.reduce((a,x)=>a+x[k],0);
 box.innerHTML = `<table><thead><tr>${H.map((h,i)=>`<th style="text-align:${[0,3,4,5].includes(i)?'left':'right'}">${h}</th>`).join('')}</tr></thead>
    <tbody>${rows || `<tr><td colspan="15" style="text-align:center;color:var(--muted);padding:20px">Nenhum lançamento com esse filtro.</td></tr>`}</tbody>
    <tfoot><tr><td style="text-align:left" colspan="6">Soma dos ${L.length} lançamentos</td><td class="num">${brl(s('frete'))}</td><td></td><td></td>
      <td class="num">${s('vg')}</td><td class="num">${s('lonaq')}</td><td class="num">${brl(s('vira'))}</td><td class="num">${brl(s('carreg'))}</td>
      <td class="num">${brl(s('lona'))}</td><td class="num">${brl(s('viagem'))}</td></tr></tfoot></table>`;
  const dif = d.frete - s('frete');
  foot.innerHTML = `Frete usado no fechamento: R$ ${brl(d.frete)}${Math.abs(dif)>0.005?` — <strong>R$ ${brl(Math.abs(dif))} ${dif>0?'a mais':'a menos'} que a soma dos lançamentos</strong> (resumo do PDF)`:' — igual à soma dos lançamentos'} · bônus operacional: R$ ${brl(d.bonusOp)}.`;
}
document.getElementById('d-mov').addEventListener('click',e=>{
  const b = e.target.closest('button[data-cte]'); if(b) abrirConfronto(b.dataset.cte);
});
document.getElementById('d-mov-tools').addEventListener('click',e=>{
  const b = e.target.closest('.chip'); if(!b) return;
  movFiltro = b.dataset.f; renderMov(ORDER[cur]);
});

/* ================= RELATÓRIO XLSX DAS VERIFICAÇÕES ================= */
/* gerador mínimo de .xlsx (zip sem compressão + SpreadsheetML), sem biblioteca externa,
   para o botão funcionar também com o HTML aberto direto do computador, sem internet */
const XLSX_MIN = (()=>{
  const enc = new TextEncoder();
  const CRC = new Uint32Array(256).map((_,n)=>{ let c=n; for(let k=0;k<8;k++) c = c&1 ? 0xEDB88320^(c>>>1) : c>>>1; return c>>>0; });
  const crc32 = b => { let c = 0xFFFFFFFF; for(let i=0;i<b.length;i++) c = CRC[(c^b[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
  function zip(files){
    const parts = [], central = []; let off = 0;
    const u16 = v => [v&255, v>>>8&255], u32 = v => [v&255, v>>>8&255, v>>>16&255, v>>>24&255];
    for(const [name, text] of files){
      const nm = enc.encode(name), data = enc.encode(text), c = crc32(data);
      const head = [...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
        ...u32(c), ...u32(data.length), ...u32(data.length), ...u16(nm.length), ...u16(0)];
      parts.push(new Uint8Array(head), nm, data);
      central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
        ...u32(c), ...u32(data.length), ...u32(data.length), ...u16(nm.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
        ...u32(0), ...u32(off)]), nm);
      off += head.length + nm.length + data.length;
    }
    const csz = central.reduce((a,p)=>a+p.length,0);
    const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
      ...u32(csz), ...u32(off), ...u16(0)]);
    return new Blob([...parts, ...central, end], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  const x = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
  const col = i => { let s=''; i++; while(i){ const m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=(i-m-1)/26; } return s; };
  /* estilos: 0 normal · 1 cabeçalho · 2 moeda · 3 título · 4 alerta · 5 informativo · 6 nota · 7 inteiro */
  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>
<fonts count="5"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
<font><b/><sz val="13"/><color rgb="FF1C2543"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFB3243F"/><name val="Arial"/></font>
<font><i/><sz val="9"/><color rgb="FF767B8D"/><name val="Arial"/></font></fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1F3864"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFBE3E8"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFDF3DC"/></patternFill></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="3" borderId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="0" fillId="4" borderId="0" applyFill="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" applyFont="1"/>
<xf numFmtId="1" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>
</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  /* sheet: {name, rows:[[valor|{v,s}]], widths:[n], header: índice da linha de cabeçalho (0-based) ou -1} */
  function sheetXml(sh){
    const rows = sh.rows.map((r,ri)=>`<row r="${ri+1}">${r.map((c,ci)=>{
      if(c==null || c==='') return '';
      const o = (typeof c==='object') ? c : {v:c};
      const s = o.s ?? (ri===sh.header ? 1 : (typeof o.v==='number' ? 2 : 0));
      const ref = col(ci)+(ri+1);
      return typeof o.v==='number'
        ? `<c r="${ref}" s="${s}"><v>${o.v}</v></c>`
        : `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${x(o.v)}</t></is></c>`;
    }).join('')}</row>`).join('');
    const ncol = Math.max(...sh.rows.map(r=>r.length));
    const pane = sh.header>=0 ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${sh.header+1}" topLeftCell="A${sh.header+2}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : '';
    const cols = sh.widths ? `<cols>${sh.widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
    const af = sh.header>=0 && sh.rows.length>sh.header+1 ? `<autoFilter ref="A${sh.header+1}:${col(ncol-1)}${sh.rows.length}"/>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols}<sheetData>${rows}</sheetData>${af}</worksheet>`;
  }
  function build(sheets){
    const ns = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
    const files = [
      ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
      ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook ${ns}><sheets>${sheets.map((s,i)=>`<sheet name="${x(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets>${
        sheets.some(s=>s.header>=0 && s.rows.length>s.header+1) ? `<definedNames>${sheets.map((s,i)=>s.header>=0 && s.rows.length>s.header+1 ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${x(s.name)}'!$A$${s.header+1}:$${col(Math.max(...s.rows.map(r=>r.length))-1)}$${s.rows.length}</definedName>` : '').join('')}</definedNames>` : ''}</workbook>`],
      ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml', STYLES],
      ...sheets.map((s,i)=>[`xl/worksheets/sheet${i+1}.xml`, sheetXml(s)])
    ];
    return zip(files);
  }
  return {build};
})();

/* monta o relatório do período escolhido: Resumo · Ocorrências · Frete × lançamentos */
function relatorioVerificacoes(meses, comInfo){
  const nivelTxt = n => n==='alerta' ? 'Alerta' : 'Informativo';
  const regrasUsadas = REGRAS.filter(r=>comInfo || r.nivel==='alerta');
  const ordem = Object.fromEntries(REGRAS.map((r,i)=>[r.id,i]));
  const per = meses.length===1 ? mlab(meses[0]) : `${mlab(meses[0])} a ${mlab(meses[meses.length-1])}`;
  const agora = new Date().toLocaleString('pt-BR');
  const L0 = meses.map(m=>LANC[m]).find(Boolean), campos = L0.campos;

  /* ocorrências, uma linha por (lançamento, regra) */
  const oc = [];
  for(const m of meses){
    const L = LANC[m], base = Object.fromEntries(DATASETS[m].map(d=>[d.cod,d]));
    for(const [cod,porI] of Object.entries(L.flags)) for(const [i,fs] of Object.entries(porI)) for(const [id,msg] of fs){
      const r = REGRA[id]; if(!comInfo && r.nivel!=='alerta') continue;
      const x = Object.fromEntries(campos.map((c,k)=>[c, L.mot[cod][i][k]])), d = base[cod] || {};
      oc.push({m, r, cod, d, x, msg});
    }
  }
  oc.sort((a,b)=> (a.r.nivel===b.r.nivel?0:(a.r.nivel==='alerta'?-1:1)) || ordem[a.r.id]-ordem[b.r.id]
    || a.m.localeCompare(b.m) || (a.d.nome||'').localeCompare(b.d.nome||'','pt-BR'));

  /* Resumo */
  const resumo = [
    [{v:'Relatório de verificações das movimentações', s:3}],
    [{v:`Período: ${per} · gerado em ${agora} · Tóliman Transportes / Grupo Dínamo`, s:6}],
    [{v:`Alerta = precisa de conferência; Informativo = situação conhecida, só registro.${comInfo?'':' (informativos não incluídos)'}`, s:6}],
    [],
    ['Nível','Regra','Descrição', ...(meses.length>1?meses.map(mshort):[]), 'Lançamentos','Motoristas']
  ];
  for(const r of regrasUsadas){
    const porMes = meses.map(m=>LANC[m].resumo[r.id].lanc);
    const mot = new Set(oc.filter(o=>o.r.id===r.id).map(o=>o.m+'|'+o.cod)).size;
    resumo.push([{v:nivelTxt(r.nivel), s:r.nivel==='alerta'?4:5}, r.titulo, r.descricao,
      ...(meses.length>1?porMes.map(v=>({v,s:7})):[]), {v:porMes.reduce((a,b)=>a+b,0), s:7}, {v:mot, s:7}]);
  }
  const nAl = oc.filter(o=>o.r.nivel==='alerta').length, nIn = oc.length-nAl;
  resumo.push([], ['Total de ocorrências', '', '', ...(meses.length>1?meses.map(()=>''):[]), {v:oc.length,s:7}],
    [`${nAl} alerta(s)${comInfo?` · ${nIn} informativo(s)`:''}`]);

  /* Ocorrências */
  const H = ['Mês','Nível','Regra','Detalhe','Cód.','Motorista','Grupo','Tipo','Documento','Data','Chegada','Container','Cliente',
    'Origem / Destino','T. Frete','CT-e','Nº RV','VG','Lona (qtd)','Vira','Carregamento','Lona (R$)','Viagem'];
  const ocRows = [H, ...oc.map(o=>[mshort(o.m), {v:nivelTxt(o.r.nivel), s:o.r.nivel==='alerta'?4:5}, o.r.titulo, o.msg,
    o.cod, o.d.nome||'', o.d.grupo||'', o.x.tipo, o.x.doc, o.x.data, o.x.chegada, o.x.container, o.x.cliente, o.x.od,
    o.x.frete, o.x.cte, o.x.rv, {v:o.x.vg,s:7}, {v:o.x.lonaq,s:7}, o.x.vira, o.x.carreg, o.x.lona, o.x.viagem])];

  /* Frete do fechamento × soma dos lançamentos, por motorista */
  const fr = [['Mês','Cód.','Motorista','Frete no fechamento','Soma dos lançamentos','Diferença','Observação']];
  for(const m of meses){
    const L = LANC[m];
    for(const d of DATASETS[m]){
      const ls = L.mot[d.cod]; if(!ls) continue;
      const s = Math.round(ls.reduce((a,r)=>a + r[campos.indexOf('frete')],0)*100)/100;
      const dif = Math.round((d.frete - s)*100)/100;
      if(Math.abs(dif)>0.005) fr.push([mshort(m), d.cod, d.nome, d.frete, s, dif, 'frete do resumo do PDF difere da soma das linhas']);
    }
  }
  if(fr.length===1) fr.push(['', '', 'Nenhuma diferença no período.']);

  /* Confronto lado a lado: uma linha por CT-e, lançamento A e B nas colunas */
  const cfc = [['doc','Documento'],['data','Data'],['chegada','Chegada'],['container','Container'],['od','Origem / Destino'],
               ['frete','T. Frete'],['rv','Nº RV'],['vg','VG'],['viagem','Bônus viagem']];
  const nMax = Math.max(2, ...meses.flatMap(m=>confrontosDe(m).map(c=>c.itens.length)));
  const cf = [['Mês','CT-e','Leitura','Campos que diferem',
    ...Array.from({length:nMax},(_,i)=>{ const L = String.fromCharCode(65+i);
      return [`${L} · Cód.`,`${L} · Motorista`, ...cfc.map(c=>`${L} · ${c[1]}`)]; }).flat()]];
  for(const m of meses) for(const c of confrontosDe(m)){
    cf.push([mshort(m), c.cte, cfLeitura(c), c.difs.map(d=>CF_CAMPOS.find(x=>x[0]===d)[1]).join(', ') || 'nenhum',
      ...c.itens.flatMap(it=>[it.cod, it.nome, ...cfc.map(([k])=> ['vg'].includes(k) ? {v:it.x[k],s:7} : it.x[k])])]);
  }
  if(cf.length===1) cf.push(['', '', 'Nenhum CT-e com frete em mais de um lançamento no período.']);

  /* Pagamento indevido: por motorista e o detalhe por lançamento */
  const pi = [['Mês','Cód.','Motorista','Motivo','Documento','Data','Origem / Destino','CT-e','VG','Bônus pago','Carregamento devido','A recuperar']];
  const piTot = {pago:0, devido:0, recuperar:0, lanc:0, vg:0, mot:new Set()};
  for(const m of meses){
    const A = LANC[m].apur; if(!A) continue;
    const nome = Object.fromEntries(DATASETS[m].map(d=>[d.cod,d.nome]));
    for(const mo of A.motoristas){
      for(const it of A.itens.filter(i=>i.cod===mo.cod)){
        pi.push([mshort(m), it.cod, nome[it.cod]||'', it.motivo, it.doc, it.data, it.od, it.cte, {v:it.vg,s:7}, it.pago, it.devido, it.recuperar]);
      }
      pi.push([{v:mshort(m),s:6}, {v:mo.cod,s:6}, {v:`Subtotal ${nome[mo.cod]||mo.cod}`,s:6}, '', '', '', '', '', {v:mo.vg,s:7}, mo.pago, mo.devido, mo.recuperar]);
      piTot.pago+=mo.pago; piTot.devido+=mo.devido; piTot.recuperar+=mo.recuperar; piTot.lanc+=mo.lanc; piTot.vg+=mo.vg; piTot.mot.add(m+'|'+mo.cod);
    }
  }
  if(pi.length===1) pi.push(['', '', 'Nenhum pagamento indevido de viagem no período.']);
  else pi.push([], [{v:'TOTAL',s:3}, '', `${piTot.mot.size} motorista(s) · ${piTot.lanc} lançamento(s)`, '', '', '', '', '', {v:piTot.vg,s:7},
    Math.round(piTot.pago*100)/100, Math.round(piTot.devido*100)/100, Math.round(piTot.recuperar*100)/100],
    [{v:`Carregamento devido: R$ ${brl(LANC[meses[0]].apur ? LANC[meses[0]].apur.valorCarregamento : 25)} por lançamento em rota de carregamento; ordem cancelada: nada devido.`, s:6}]);

  return XLSX_MIN.build([
    {name:'Resumo', rows:resumo, header:4, widths:[13,44,90,...(meses.length>1?meses.map(()=>9):[]),13,12]},
    {name:'Ocorrências', rows:ocRows, header:0, widths:[8,12,34,70,7,34,30,6,16,10,10,16,30,34,12,15,10,5,9,9,13,10,10]},
    {name:'Pagamento indevido', rows:pi, header:0, widths:[8,7,34,30,16,10,34,15,5,13,19,13]},
    {name:'Confronto CT-e', rows:cf, header:0, widths:[8,14,62,34, ...Array.from({length:nMax},()=>[7,32,15,10,10,15,32,12,10,5,12]).flat()]},
    {name:'Frete x lançamentos', rows:fr, header:0, widths:[8,7,36,18,20,13,46]}
  ]);
}

/* entrega do arquivo: no painel publicado pelo recurso de downloads da plataforma
   (o visitante confirma); aberto direto do computador, download comum do navegador */
let DOWNLOADS = null;
if(window.claude && typeof window.claude.use==='function'){
  window.claude.use('downloads').then(ns=>{ DOWNLOADS = ns; }).catch(()=>{});
}
async function salvarArquivo(nome, blob){
  if(DOWNLOADS){
    const r = await DOWNLOADS.save({filename:nome, data:blob});
    return r.status;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
  return 'saved';
}
function renderRelControles(){
  const sel = document.getElementById('rel-per');
  const ms = MESES.filter(m=>LANC[m]);
  const opts = ms.slice().reverse().map(m=>`<option value="${m}">${mlab(m)}</option>`);
  if(ms.length>1) opts.push(`<option value="todos">Todos os meses com movimentações (${ms.length})</option>`);
  sel.innerHTML = opts.join('') || '<option value="">Sem movimentações</option>';
  sel.value = LANC[MES] ? MES : (ms[ms.length-1]||'');
  document.getElementById('rel-btn').disabled = !ms.length;
}
document.getElementById('rel-btn').addEventListener('click', async ()=>{
  const btn = document.getElementById('rel-btn'), msg = document.getElementById('rel-msg');
  const v = document.getElementById('rel-per').value; if(!v) return;
  const meses = v==='todos' ? MESES.filter(m=>LANC[m]) : [v];
  const comInfo = document.getElementById('rel-info').checked;
  const nome = `Verificacoes_Motoristas_${v==='todos' ? meses[0]+'_a_'+meses[meses.length-1] : v}.xlsx`;
  btn.disabled = true; msg.textContent = 'Gerando…';
  try{
    const st = await salvarArquivo(nome, relatorioVerificacoes(meses, comInfo));
    msg.textContent = st==='delivered' ? 'Relatório enviado.' : `Relatório gerado: ${nome}`;
  }catch(e){
    const c = e && e.code;
    msg.textContent = c==='declined' ? 'Download cancelado.' : c==='rate_limited' ? 'Já há um download aguardando confirmação.'
      : 'Não foi possível baixar o relatório nesta visualização.';
  }finally{ btn.disabled = false; }
});

/* ================= CONFRONTOS (CT-e com frete em mais de um lançamento) ================= */
const CF_CAMPOS = [
  ['cod','Motorista'],['doc','Documento'],['tipo','Tipo'],['data','Data'],['chegada','Chegada'],['container','Container'],
  ['cliente','Cliente'],['od','Origem / Destino'],['frete','T. Frete'],['rv','Nº RV'],['vg','VG (viagem contada)'],
  ['lonaq','Lona (qtd)'],['vira','Vira'],['carreg','Carregamento'],['lona','Lona (R$)'],['viagem','Bônus de viagem']];
const CF_MOEDA = new Set(['frete','vira','carreg','lona','viagem']);
function confrontosDe(mes){
  const L = LANC[mes]; if(!L) return [];
  const nome = Object.fromEntries(DATASETS[mes].map(d=>[d.cod,d.nome]));
  return L.dup.map(g=>{
    const itens = g.itens.map(([cod,i])=>({cod, i, nome:nome[cod]||cod, x:Object.fromEntries(L.campos.map((c,k)=>[c, L.mot[cod][i][k]])),
      local: ((L.flags[cod]||{})[i]||[]).some(f=>f[0]==='ROTA_CARREGAMENTO')}));
    const difs = CF_CAMPOS.map(c=>c[0]).filter(k=>new Set(itens.map(it=> k==='cod' ? it.cod : it.x[k])).size>1);
    const mesmo = new Set(itens.map(it=>it.cod)).size===1;
    const trecho = new Set(itens.map(it=>it.x.od)).size===1;
    return {cte:g.cte, itens, difs, mesmo, trecho, local: itens.some(it=>it.local),
      frete: itens.reduce((a,it)=>a+it.x.frete,0), bonus: itens.reduce((a,it)=>a+it.x.viagem,0),
      vg: itens.reduce((a,it)=>a+it.x.vg,0)};
  }).sort((a,b)=> (b.mesmo-a.mesmo) || (b.trecho-a.trecho) || (b.local-a.local) || (b.frete-a.frete));
}
function cfLeitura(c){
  const p = [];
  p.push(c.mesmo ? 'Mesmo motorista' : 'Motoristas diferentes');
  p.push(c.trecho ? 'mesmo trecho' : 'trechos diferentes');
  if(c.difs.includes('container')) p.push('containers diferentes'); else if(c.itens[0].x.container) p.push('mesmo container');
  if(!c.difs.includes('frete')) p.push('mesmo valor de frete');
  if(!c.difs.includes('rv')) p.push('mesmo Nº RV');
  const loc = c.itens.map((it,i)=>it.local ? String.fromCharCode(65+i) : '').filter(Boolean);
  if(loc.length) p.push(`lançamento ${loc.join(' e ')} em rota de carregamento com valor de viagem`);
  return p.join(' · ');
}
let CF_ALVO = null;
function renderConfrontos(){
  const L = LANC[MES], cs = confrontosDe(MES);
  const note = document.getElementById('cf-note'), list = document.getElementById('cf-list'), k = document.getElementById('cf-kpis');
  if(!L){ note.textContent=''; k.innerHTML=''; list.innerHTML = `<div class="card pad" style="color:var(--muted);font-size:12.5px">Movimentações detalhadas não disponíveis para ${mlab(MES)}.</div>`; return; }
  note.textContent = `${mlab(MES)} · mesmo CT-e com frete em mais de um lançamento, comparado campo a campo · campos diferentes marcados com ≠`;
  const tot = (f)=>cs.filter(f).length;
  k.innerHTML = [
    ['CT-e em confronto', cs.length, `${cs.reduce((a,c)=>a+c.itens.length,0)} lançamentos`, ''],
    ['Mesmo motorista', tot(c=>c.mesmo), `${tot(c=>!c.mesmo)} entre motoristas diferentes`, 'k1'],
    ['Mesmo trecho', tot(c=>c.trecho), `${tot(c=>!c.trecho)} com trechos diferentes`, 'k2'],
    ['Com rota de carregamento', tot(c=>c.local), 'um dos lançamentos é rota local com valor de viagem', 'k1'],
    ['Frete repetido', 'R$ '+compact(cs.reduce((a,c)=>a+c.frete-Math.max(...c.itens.map(it=>it.x.frete)),0)), 'valor que aparece a mais nas duplicidades', 'k3'],
    ['Bônus de viagem envolvido', 'R$ '+brl(cs.reduce((a,c)=>a+c.bonus,0)), 'soma do bônus pago nos lançamentos em confronto', 'k4']
  ].map(([l,v,s,c])=>`<div class="kpi ${c}"><div class="lab">${l}</div><div class="val"><span class="num">${v}</span></div><div class="sub">${s}</div></div>`).join('');
  const q = document.getElementById('cf-q').value.trim().toLowerCase(), f = document.getElementById('cf-f').value;
  const vis = cs.filter(c=> (f==='todos' || (f==='mesmo'&&c.mesmo) || (f==='entre'&&!c.mesmo) || (f==='trecho'&&c.trecho) || (f==='outro'&&!c.trecho) || (f==='local'&&c.local))
    && (!q || c.cte.toLowerCase().includes(q) || c.itens.some(it=>it.nome.toLowerCase().includes(q)||it.cod.includes(q)||it.x.doc.toLowerCase().includes(q))));
  const letra = i => String.fromCharCode(65+i);
  const fmt = (k,v,it)=> k==='cod' ? `${esc(it.nome)} <span class="gtag num">${it.cod}</span>` : CF_MOEDA.has(k) ? 'R$ '+brl(v) : esc(v===''?'—':v);
  list.innerHTML = vis.map(c=>`
    <div class="cf" id="cf-${esc(c.cte)}">
      <div class="cf-h">
        <div><div class="ct num">CT-e ${esc(c.cte)}</div><div style="font-size:11.5px;color:var(--ink2);margin-top:3px">${cfLeitura(c)}</div></div>
        <div class="bd">
          <span class="flag ${c.mesmo?'alerta':'info'}">${c.mesmo?'mesmo motorista':'entre motoristas'}</span>
          <span class="flag ${c.trecho?'alerta':'info'}">${c.trecho?'mesmo trecho':'trechos diferentes'}</span>
          ${c.local?'<span class="flag alerta">rota de carregamento</span>':''}
        </div>
        <div class="vv num">frete R$ ${brl(c.frete)} · bônus R$ ${brl(c.bonus)} · VG ${c.vg}</div>
      </div>
      <div style="overflow-x:auto"><table class="cf-t">
        <thead><tr><th>Campo</th>${c.itens.map((it,i)=>`<th>Lançamento ${letra(i)} · <button data-cod="${it.cod}" title="Abrir a ficha do motorista">${esc(it.nome.split(' ')[0])} ${it.cod}</button>${it.local?' · <span style="color:#F4D38D">rota de carregamento</span>':''}</th>`).join('')}</tr></thead>
        <tbody>${CF_CAMPOS.map(([kk,l])=>`<tr class="${c.difs.includes(kk)?'dif':''}"><th>${l}</th>${c.itens.map(it=>
          `<td class="${CF_MOEDA.has(kk)||['doc','data','chegada','container','rv','vg','lonaq'].includes(kk)?'num':''}">${fmt(kk, kk==='cod'?it.cod:it.x[kk], it)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <div class="cf-foot">${c.difs.length ? `Diferem: ${c.difs.map(d=>CF_CAMPOS.find(x=>x[0]===d)[1]).join(', ')}.` : 'Todos os campos iguais.'}
        ${c.vg>1 ? ` <strong>Viagem contada ${c.vg} vezes (VG).</strong>` : ''}</div>
    </div>`).join('') || `<div class="card pad" style="color:var(--muted);font-size:12.5px">Nenhum confronto com esse filtro.</div>`;
  if(CF_ALVO){
    const el = document.getElementById('cf-'+CF_ALVO);
    if(el){ el.classList.add('alvo'); setTimeout(()=>{ const y = el.getBoundingClientRect().top + scrollY - topHdr.offsetHeight - 12; scrollTo({top:y,behavior:'smooth'}); },60); }
    CF_ALVO = null;
  }
}
function abrirConfronto(cte){
  document.getElementById('cf-q').value = ''; document.getElementById('cf-f').value = 'todos';
  CF_ALVO = cte; setTab('tab-conf'); renderConfrontos();
}
document.getElementById('cf-q').addEventListener('input',renderConfrontos);
document.getElementById('cf-f').addEventListener('change',renderConfrontos);
document.getElementById('cf-list').addEventListener('click',e=>{
  const b = e.target.closest('button[data-cod]'); if(b) openDriver(b.dataset.cod);
});

/* pagamento indevido de viagem (rota de carregamento e ordem cancelada paga) */
function renderIndevido(){
  const L = LANC[MES], box = document.getElementById('indevido'), note = document.getElementById('ind-note');
  if(!L || !L.apur){ note.textContent=''; box.innerHTML = `<div class="pad" style="color:var(--muted);font-size:12.5px">Movimentações detalhadas não disponíveis para ${mlab(MES)}.</div>`; return; }
  const A = L.apur, T0 = A.total, nome = Object.fromEntries(DATA.map(d=>[d.cod,d.nome]));
  note.textContent = `viagem paga em rota de carregamento (devido R$ ${brl(A.valorCarregamento)} de carregamento por lançamento) e ordem cancelada paga`;
  if(!A.motoristas.length){ box.innerHTML = `<div class="pad" style="color:var(--muted);font-size:12.5px">Nenhum pagamento indevido de viagem em ${mlab(MES)}.</div>`; return; }
  const det = cod => A.itens.filter(i=>i.cod===cod).map(i=>`<span>${esc(i.doc)} · ${i.data} · ${esc(i.od)} · R$ ${brl(i.pago)}</span>`).join('');
  box.innerHTML = `<div class="ind-kpi">
      <div><div class="lab">Motoristas</div><div class="val num">${T0.motoristas}</div></div>
      <div><div class="lab">Lançamentos</div><div class="val num">${T0.lanc}</div></div>
      <div><div class="lab">Bônus de viagem pago</div><div class="val num">R$ ${brl(T0.pago)}</div></div>
      <div><div class="lab">Carregamento devido</div><div class="val num">R$ ${brl(T0.devido)}</div></div>
      <div><div class="lab">A recuperar</div><div class="val num rec">R$ ${brl(T0.recuperar)}</div></div>
      <div><div class="lab">Viagens contadas a mais</div><div class="val num">${T0.vg}</div></div>
    </div>
    <div style="overflow-x:auto"><table class="ind-t">
      <thead><tr><th>Motorista</th><th>Motivo</th><th>Lanç.</th><th>Bônus pago</th><th>Carregamento devido</th><th>A recuperar</th><th>VG</th></tr></thead>
      <tbody>${A.motoristas.map(m=>`<tr data-cod="${m.cod}">
        <td><span class="nm">${esc(nome[m.cod]||m.cod)}</span> <span class="gtag num">${m.cod}</span><span class="det num">${det(m.cod)}</span></td>
        <td>${m.motivos.join(' · ')}</td><td class="num">${m.lanc}</td><td class="num">R$ ${brl(m.pago)}</td>
        <td class="num">R$ ${brl(m.devido)}</td><td class="num rec">R$ ${brl(m.recuperar)}</td><td class="num">${m.vg}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2">Total · ${T0.motoristas} motoristas</td><td class="num">${T0.lanc}</td><td class="num">R$ ${brl(T0.pago)}</td>
        <td class="num">R$ ${brl(T0.devido)}</td><td class="num">R$ ${brl(T0.recuperar)}</td><td class="num">${T0.vg}</td></tr></tfoot>
    </table></div>`;
}
document.getElementById('indevido').addEventListener('click',e=>{
  const tr = e.target.closest('tr[data-cod]'); if(!tr) return;
  openDriver(tr.dataset.cod); setTimeout(()=>document.getElementById('d-mov-sec').scrollIntoView({behavior:'smooth'}),50);
});

/* resumo das verificações do mês (visão geral) */
function renderVerif(){
  const L = LANC[MES], box = document.getElementById('verif'), note = document.getElementById('verif-note');
  if(!L){ note.textContent = ''; box.innerHTML = `<div class="pad" style="color:var(--muted);font-size:12.5px">Movimentações detalhadas não disponíveis para ${mlab(MES)}.</div>`; return; }
  const nome = Object.fromEntries(DATA.map(d=>[d.cod,d.nome]));
  const tot = REGRAS.filter(r=>r.nivel==='alerta').reduce((a,r)=>a+L.resumo[r.id].lanc,0);
  note.textContent = `${tot} lançamento(s) com alerta · clique na regra para ver os casos`;
  box.innerHTML = REGRAS.map(r=>{
    const c = L.resumo[r.id];
    const casos = [];
    Object.entries(L.flags).forEach(([cod,porI])=>Object.entries(porI).forEach(([i,fs])=>fs.forEach(([id,msg])=>{
      if(id===r.id){ const x = L.mot[cod][i]; casos.push({cod, doc:x[L.campos.indexOf('doc')], data:x[L.campos.indexOf('data')], msg,
        cte: id==='CTE_FRETE_DUP' ? x[L.campos.indexOf('cte')] : ''}); }
    })));
    casos.sort((a,b)=> (nome[a.cod]||'').localeCompare(nome[b.cod]||'','pt-BR'));
    return `<details class="vr ${c.lanc?'':'zero'}" ${c.lanc?'':'onclick="return false"'}>
      <summary><span class="flag ${r.nivel}">${r.nivel==='alerta'?'alerta':'info'}</span>
        <div><div class="vt">${r.titulo}</div><div class="vd">${r.descricao}</div></div>
        <div class="vc num">${c.lanc} lanç.<small>${c.mot} motorista(s)</small></div></summary>
      ${c.lanc?`<div class="vlist">${casos.map(k=>`<button class="vli" data-cod="${k.cod}"${k.cte?` data-cte="${esc(k.cte)}" title="Abrir o confronto lado a lado"`:''}><span class="vn">${nome[k.cod]||k.cod} <span class="gtag num">${k.cod}</span></span><span class="vdoc num">${k.doc} · ${k.data}</span><span class="vm">${esc(k.msg)}</span></button>`).join('')}</div>`:''}
    </details>`;
  }).join('');
}
document.getElementById('verif').addEventListener('click',e=>{
  const b = e.target.closest('.vli'); if(!b) return;
  if(b.dataset.cte){ abrirConfronto(b.dataset.cte); return; }
  openDriver(b.dataset.cod); setTimeout(()=>document.getElementById('d-mov-sec').scrollIntoView({behavior:'smooth'}),50);
});

sel.addEventListener('change',()=>showDriver(ORDER.findIndex(d=>d.cod===sel.value)));
document.getElementById('prev').addEventListener('click',()=>showDriver(cur-1));
document.getElementById('next').addEventListener('click',()=>showDriver(cur+1));

function renderIndividual(keepCod){
  ORDER = [...DATA].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  sel.innerHTML = ORDER.map(d=>`<option value="${d.cod}">${d.nome} — ${d.cod}</option>`).join('');
  const i = keepCod ? ORDER.findIndex(d=>d.cod===keepCod) : -1;
  showDriver(i>=0 ? i : 0);
}

/* ================= EVOLUÇÃO ================= */
const EMET = {
  frete:{lab:'Frete cliente',  tot:'frete',        fmt:v=>'R$ '+brl(v), cfmt:v=>'R$ '+compact(v)},
  bonif:{lab:'Bonificações',   tot:'totalBonif',   fmt:v=>'R$ '+brl(v), cfmt:v=>'R$ '+compact(v)},
  km:   {lab:'KM rodado',      tot:'km',           fmt:v=>nf(v)+' km',  cfmt:v=>compact(v)+' km'},
  viag: {lab:'Viagens',        tot:'viagens',      fmt:v=>nf(v),        cfmt:v=>nf(v)},
  media:{lab:'Média km/l',     tot:'media',        fmt:v=>nf(v,3),      cfmt:v=>nf(v,3)},
  premTot:{lab:'Premiação',    tot:'totalPremiacao',fmt:v=>'R$ '+brl(v),cfmt:v=>'R$ '+compact(v)},
  econ: {lab:'Economia gerada',tot:'valorEconomia',fmt:v=>'R$ '+brl(v), cfmt:v=>'R$ '+compact(v)}
};
let evM = 'frete', evSort = 'delta', evOnly = 'todos';

function renderEvolucao(){
  const M = EMET[evM];
  const A = MESES[MESES.length-1], B = MESES[MESES.length-2];

  /* --- KPIs da frota --- */
  document.getElementById('ev-kpis').innerHTML = Object.keys(EMET).map((k,i)=>{
    const m = EMET[k];
    const a = TOTAIS[A][m.tot], b = B ? TOTAIS[B][m.tot] : null;
    const dl = b ? a/b-1 : null;
    return `<div class="kpi ${['','k1','k2','k3','k4','k1','k2'][i]}">
      <div class="lab">${m.lab}</div>
      <div class="val"><span class="num">${m.cfmt(a)}</span></div>
      <div class="sub">${B?`${mshort(B)} ${m.cfmt(b)}`:'—'}${dl!=null?`<span class="delta ${dl>=0?'up':'down'}">${sgn(dl)}</span>`:''}</div>
    </div>`;
  }).join('') + (()=>{
    const a = TOTAIS[A].fora, b = B ? TOTAIS[B].fora : null;
    const dl = b && b.bonif ? a.bonif/b.bonif-1 : null;
    return `<div class="kpi k3"><div class="lab">Pago fora do critério</div>
      <div class="val"><span class="num">R$ ${compact(a.bonif)}</span></div>
      <div class="sub">${a.n} mot. &lt; ${nf(KM_MIN)} km${b?` · ${mshort(B)} R$ ${compact(b.bonif)}`:''}${dl!=null?`<span class="delta ${dl<=0?'up':'down'}">${sgn(dl)}</span>`:''}</div></div>`;
  })();

  /* --- barras por mês (métrica selecionada) --- */
  const bars = MESES.map(m=>({m, v:TOTAIS[m][M.tot]}));
  const bmax = Math.max(...bars.map(b=>b.v))*1.1 || 1;
  document.getElementById('ev-fleet').innerHTML = bars.map((b,i)=>{
    const p = i>0 ? b.v/bars[i-1].v-1 : null;
    return `<div class="evb">
      <div class="evb-h"><span>${mlab(b.m)}</span><span class="num">${M.fmt(b.v)}${p!=null?`<span class="delta ${p>=0?'up':'down'}">${sgn(p)}</span>`:''}</span></div>
      <div class="track"><div class="fill" style="width:${Math.max(b.v/bmax*100,1.5)}%"></div></div>
    </div>`;
  }).join('');

  /* --- composição da bonificação mês a mês --- */
  const cmax = Math.max(...MESES.map(m=>TOTAIS[m].totalBonif));
  document.getElementById('ev-comp').innerHTML = MESES.map(m=>{
    const t = TOTAIS[m];
    const parts = [['Bônus operacional',t.bonusOp,'var(--ink)'],['Prêmio por economia',t.premioEconomia,'var(--coral)'],['Bônus por média',t.bonusMedia,'var(--mauve)']];
    return `<div class="evb">
      <div class="evb-h"><span>${mlab(m)}</span><span class="num">R$ ${brl(t.totalBonif)} · ${pct(t.pctBonifFrete,2)} do frete</span></div>
      <div class="stack" style="height:26px;margin:2px 0 0;width:${Math.max(t.totalBonif/cmax*100,4)}%">
        ${parts.map(p=>`<span style="width:${p[1]/t.totalBonif*100}%;background:${p[2]}" title="${p[0]}"></span>`).join('')}
      </div>
    </div>`;
  }).join('') + `<div class="leg" style="margin-top:14px">
      <div class="leg-row"><span class="sw" style="background:var(--ink)"></span><span>Bônus operacional</span><span class="lv"></span></div>
      <div class="leg-row"><span class="sw" style="background:var(--coral)"></span><span>Prêmio por economia</span><span class="lv"></span></div>
      <div class="leg-row"><span class="sw" style="background:var(--mauve)"></span><span>Bônus por média</span><span class="lv"></span></div>
    </div>`;

  /* --- lista por motorista --- */
  const codes = [...new Set(MESES.flatMap(m=>DATASETS[m].map(d=>d.cod)))];
  let rows = codes.map(cod=>{
    const s = serie(cod,evM);
    const last = DATASETS[A].find(x=>x.cod===cod), first = B ? DATASETS[B].find(x=>x.cod===cod) : null;
    const ref = last || MESES.map(m=>DATASETS[m].find(x=>x.cod===cod)).filter(Boolean).pop();
    const a = last ? last[evM] : null, b = first ? first[evM] : null;
    const dl = (a!=null && b) ? a/b-1 : null;
    const sit = last && first ? 'ambos' : (last ? 'entrou' : 'saiu');
    return {cod, nome:ref.nome, grupo:ref.grupo, s, a, b, dl, sit, abs:(a||0)-(b||0)};
  });
  const term = evQ.value.trim().toLowerCase();
  if(term) rows = rows.filter(r=>r.nome.toLowerCase().includes(term)||r.cod.includes(term));
  if(evOnly==='subiu') rows = rows.filter(r=>r.dl!=null && r.dl>0);
  if(evOnly==='caiu')  rows = rows.filter(r=>r.dl!=null && r.dl<0);
  if(evOnly==='novos') rows = rows.filter(r=>r.sit!=='ambos');
  if(evOnly==='fora')  rows = rows.filter(r=>{ const l = DATASETS[A].find(x=>x.cod===r.cod); return l && !isAvaliado(l); });
  rows.sort((x,y)=>{
    if(evSort==='delta') return (y.dl??-Infinity)-(x.dl??-Infinity);
    if(evSort==='queda') return (x.dl??Infinity)-(y.dl??Infinity);
    if(evSort==='abs')   return y.abs-x.abs;
    return x.nome.localeCompare(y.nome,'pt-BR');
  });
  const scale = Math.max(...rows.flatMap(r=>[r.a||0,r.b||0]),1);
  document.getElementById('ev-list').innerHTML = rows.map(r=>`
    <div class="evr" data-cod="${r.cod}" role="button" tabindex="0">
      <div class="evr-n">
        <div class="nm">${r.nome}</div>
        <span class="gtag"><span class="gdot" style="background:${gcol(r.grupo)}"></span>${short(r.grupo)}</span>
        ${(()=>{ const l = DATASETS[A].find(x=>x.cod===r.cod); return l ? tagFora(l) : ''; })()}
        ${r.sit!=='ambos'?`<span class="tagx ${r.sit}">${r.sit==='entrou'?'entrou em '+mshort(A):'sem registro em '+mshort(A)}</span>`:''}
      </div>
      <div class="evr-b">
        ${MESES.map(m=>{
          const p = r.s.find(x=>x.mes===m);
          return `<div class="evr-line"><i>${mshort(m)}</i>
            <div class="track thin"><div class="fill" style="width:${Math.max((p.v||0)/scale*100,0.6)}%;background:${m===A?'var(--ink)':'#B9BFD2'}"></div></div>
            <b class="num">${p.v!=null?M.fmt(p.v):'—'}</b></div>`;
        }).join('')}
      </div>
      <div class="evr-d">${r.dl!=null?`<span class="delta big ${r.dl>=0?'up':'down'}">${sgn(r.dl)}</span>`:'<span class="hna">—</span>'}</div>
    </div>`).join('') || `<div style="text-align:center;color:var(--muted);padding:26px">Nenhum motorista encontrado.</div>`;

  document.getElementById('ev-foot').textContent =
    `${rows.length} motoristas · ${rows.filter(r=>r.dl!=null&&r.dl>0).length} em alta · ` +
    `${rows.filter(r=>r.dl!=null&&r.dl<0).length} em queda · ` +
    `${rows.filter(r=>r.sit==='entrou').length} entraram · ${rows.filter(r=>r.sit==='saiu').length} sem registro em ${mshort(A)}`;
}
const evQ = document.getElementById('ev-q');
document.getElementById('ev-ctl').addEventListener('click',e=>{
  const b=e.target.closest('.chip'); if(!b) return;
  evM=b.dataset.m; [...e.currentTarget.children].forEach(c=>c.setAttribute('aria-pressed',c===b));
  renderEvolucao();
});
document.getElementById('ev-sort').addEventListener('change',e=>{evSort=e.target.value;renderEvolucao();});
document.getElementById('ev-filter').addEventListener('change',e=>{evOnly=e.target.value;renderEvolucao();});
evQ.addEventListener('input',renderEvolucao);
document.getElementById('ev-list').addEventListener('click',e=>{
  const r=e.target.closest('.evr'); if(r) openDriver(r.dataset.cod);
});
document.getElementById('ev-list').addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ') return;
  const r=e.target.closest('.evr'); if(r){e.preventDefault();openDriver(r.dataset.cod);}
});

/* ================= ABAS ================= */
const TABS = {'tab-geral':'v-geral','tab-ind':'v-ind','tab-evo':'v-evo','tab-conf':'v-conf'};
function setTab(id){
  Object.entries(TABS).forEach(([t,v])=>{
    document.getElementById(t).setAttribute('aria-selected', t===id);
    document.getElementById(v).classList.toggle('hidden', t!==id);
  });
  document.getElementById('mes-wrap').classList.toggle('dim', id==='tab-evo');
  if(typeof posThead==='function') posThead();
  window.scrollTo({top:0,behavior:'instant'});
}
Object.keys(TABS).forEach(t=>document.getElementById(t).addEventListener('click',()=>setTab(t)));

function openDriver(cod){
  const i = ORDER.findIndex(d=>d.cod===cod);
  if(i<0){
    /* motorista não está no mês selecionado: leva ao mês em que ele aparece */
    const m = MESES.slice().reverse().find(mm=>DATASETS[mm].some(d=>d.cod===cod));
    if(!m) return;
    MES = m; mesSel.value = m; renderMes(cod);
    setTab('tab-ind'); return;
  }
  setTab('tab-ind'); showDriver(i);
}
document.getElementById('tbody').addEventListener('click',e=>{
  const tr=e.target.closest('tr[data-cod]'); if(tr) openDriver(tr.dataset.cod);
});
document.getElementById('rank').addEventListener('click',e=>{
  const b=e.target.closest('button[data-cod]'); if(b) openDriver(b.dataset.cod);
});

/* cabeçalho congelado: sombra só depois de rolar */
const topHdr = document.querySelector('header.top');
const marcaTopo = ()=>{
  const y = window.scrollY;
  topHdr.classList.toggle('stuck', y > 4);
  /* histerese para não piscar quando a altura do cabeçalho muda no celular */
  if(y > 200) topHdr.classList.add('compact'); else if(y < 40) topHdr.classList.remove('compact');
};
window.addEventListener('scroll', marcaTopo, {passive:true}); marcaTopo();

/* títulos da tabela congelados: uma cópia do thead fica fixa abaixo do cabeçalho
   enquanto a tabela está na tela, acompanhando a rolagem horizontal */
const tScroll = document.querySelector('.tbl-scroll'), tReal = tScroll.querySelector('table');
const tFloat = document.createElement('div'); tFloat.className = 'thead-float';
tFloat.innerHTML = '<table><thead><tr></tr></thead></table>';
document.body.appendChild(tFloat);
function syncThead(){
  const realRow = document.getElementById('thead');
  const fRow = tFloat.querySelector('tr'), fTab = tFloat.querySelector('table');
  fRow.innerHTML = realRow.innerHTML;
  const ws = [...realRow.children].map(th=>th.getBoundingClientRect().width);
  [...fRow.children].forEach((th,i)=>{ th.style.width = th.style.minWidth = th.style.maxWidth = ws[i]+'px'; });
  fTab.style.width = tReal.getBoundingClientRect().width+'px';
  posThead();
}
function posThead(){
  const hb = topHdr.getBoundingClientRect().bottom, r = tScroll.getBoundingClientRect();
  const th = document.getElementById('thead').getBoundingClientRect();
  const on = !document.getElementById('v-geral').classList.contains('hidden') && th.top < hb && r.bottom > hb + th.height*2;
  tFloat.classList.toggle('on', on);
  if(!on) return;
  tFloat.style.top = hb+'px'; tFloat.style.left = (r.left+tScroll.clientLeft)+'px'; tFloat.style.width = tScroll.clientWidth+'px';
  tFloat.querySelector('table').style.marginLeft = (-tScroll.scrollLeft)+'px';
}
tFloat.addEventListener('click',e=>{
  const th = e.target.closest('th'); if(!th) return;
  document.querySelector(`#thead th[data-k="${th.dataset.k}"]`).click();
});
window.addEventListener('scroll', posThead, {passive:true});
window.addEventListener('resize', syncThead);
tScroll.addEventListener('scroll', posThead, {passive:true});
if(document.fonts) document.fonts.ready.then(()=>syncThead());

/* ================= RENDER GERAL ================= */
function renderMes(keepCod){
  DATA = DATASETS[MES];
  T    = TOTAIS[MES];
  ATIVOS = DATA.filter(d=>isAvaliado(d) && !isManobrista(d));
  calcRanks();
  document.getElementById('per-lab').innerHTML = `${mlab(MES)} · <strong>${DATA.length} motoristas</strong>`;
  renderKPIs(); renderComposicao(); renderGrupos(); renderFora(); renderIndevido(); renderVerif(); renderRelControles(); renderRank(); renderTable(); renderConfrontos();
  renderIndividual(keepCod);
}
renderMes();
renderEvolucao();
