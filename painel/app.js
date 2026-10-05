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
let ATIVOS = DATA.filter(d=>!isManobrista(d));

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

/* ranking */
const METRICS = {
  frete:{lab:'Frete cliente', fmt:v=>'R$ '+brl(v), pool:()=>ATIVOS},
  bonif:{lab:'Bonificações',  fmt:v=>'R$ '+brl(v), pool:()=>DATA},
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
  {k:'nome', l:'Motorista', f:d=>`<strong style="font-weight:600">${d.nome}</strong><br><span class="gtag"><span class="gdot" style="background:${gcol(d.grupo)}"></span>${short(d.grupo)}</span>`},
  {k:'frete',l:'Frete (R$)',f:d=>`<span class="num">${brl(d.frete)}</span>`},
  {k:'bonif',l:'Bonif. (R$)',f:d=>`<span class="num">${brl(d.bonif)}</span>`},
  {k:'pctBF',l:'% Bonif./frete', f:d=>`<span class="num">${typeof d.pctBF==='number'?pct(d.pctBF,2):'<span style="color:var(--muted);font-size:11px">manobrista</span>'}</span>`},
  {k:'part', l:'Part. % frete',  f:d=>`<span class="num">${pct(d.part,2)}</span>${d.rF?`<span class="rk-tag num">#${d.rF}</span>`:''}`},
  {k:'viag', l:'Viagens',   f:d=>`<span class="num">${nf(d.viag)}</span>`},
  {k:'km',   l:'KM',        f:d=>`<span class="num">${nf(d.km)}</span>`},
  {k:'media',l:'km/l',      f:d=>`<span class="num">${d.media?nf(d.media,3):'—'}</span>`},
  {k:'pos',  l:'Pos. grupo',f:d=>`<span class="num">${d.pos||'—'}</span>`},
];
let sortK='frete', sortDir=-1;
const q = document.getElementById('q'), fg = document.getElementById('fgrupo');
[...GROUPS].sort((a,b)=>gcode(a)-gcode(b)).forEach(g=>fg.insertAdjacentHTML('beforeend',`<option value="${g}">${shortTxt(g)}</option>`));
document.getElementById('thead').innerHTML = COLS.map(c=>`<th data-k="${c.k}">${c.l}<span class="ar"></span></th>`).join('');

function renderTable(){
  const term = q.value.trim().toLowerCase(), g = fg.value;
  let rows = DATA.filter(d=>(!g||d.grupo===g) && (!term || d.nome.toLowerCase().includes(term) || d.cod.includes(term)));
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
q.addEventListener('input',renderTable); fg.addEventListener('change',renderTable);

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
const fleetVal = k => k==='part' ? 1/DATA.length : T[FLEETK[k]];

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

  const gRows = DATA.filter(x=>x.grupo===d.grupo);
  document.getElementById('d-meta').innerHTML = [
    `<span class="pill">${mlab(MES)}</span>`,
    `<span class="pill"><span class="gdot" style="background:${gcol(d.grupo)}"></span>${short(d.grupo)}</span>`,
    d.pos ? `<span class="pill">Posição no grupo <b>${d.pos} de ${gRows.length}</b></span>` : '',
    d.rF  ? `<span class="pill">Rank de frete <b>${d.rF} de ${ATIVOS.length}</b></span>` : '',
    d.rB  ? `<span class="pill">Rank de bonificação <b>${d.rB} de ${DATA.length}</b></span>` : '',
    isManobrista(d) ? `<span class="pill warn">Sem frete faturado no período</span>` : ''
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
    ? (d.media>=T.media?'+':'')+nf((d.media/T.media-1)*100,1)+'% ante a média da frota' : 'sem consumo registrado';

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
      <div class="avg">${c.k==='part'?'Média por motorista':'Média da frota'}: ${c.fmt(f)}</div>
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
}
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
  }).join('');

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
const TABS = {'tab-geral':'v-geral','tab-ind':'v-ind','tab-evo':'v-evo'};
function setTab(id){
  Object.entries(TABS).forEach(([t,v])=>{
    document.getElementById(t).setAttribute('aria-selected', t===id);
    document.getElementById(v).classList.toggle('hidden', t!==id);
  });
  document.getElementById('mes-wrap').classList.toggle('dim', id==='tab-evo');
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

/* ================= RENDER GERAL ================= */
function renderMes(keepCod){
  DATA = DATASETS[MES];
  T    = TOTAIS[MES];
  ATIVOS = DATA.filter(d=>!isManobrista(d));
  document.getElementById('per-lab').innerHTML = `${mlab(MES)} · <strong>${DATA.length} motoristas</strong>`;
  renderKPIs(); renderComposicao(); renderGrupos(); renderRank(); renderTable();
  renderIndividual(keepCod);
}
renderMes();
renderEvolucao();
