#!/usr/bin/env python3
"""Lê o PDF "Planilha de comissão" do Rodopar e grava dados/AAAA-MM.json.

Uso: python3 scripts/1_extrair.py entrada/<arquivo>.pdf AAAA-MM

Confere os lançamentos de cada bloco contra os resumos e imprime o relatório de
conferência. Divergência é achado: o valor gravado é sempre o do resumo.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / 'scripts'))
from comum import GRUPOS, derivar, vira_nao_computada  # noqa: E402

NUM = r'-?[\d.]+,\d{2}'


def br(s):
    """'1.234,56' -> 1234.56 ; vazio/None -> None"""
    if s is None or s.strip() == '':
        return None
    return float(s.strip().replace('.', '').replace(',', '.'))


def texto_pdf(pdf):
    # -W/-H grandes: o recorte padrão corta a coluna VIAGEM na borda direita
    r = subprocess.run(['pdftotext', '-layout', '-x', '0', '-y', '0', '-W', '3000', '-H', '3000',
                        str(pdf), '-'], capture_output=True, text=True, check=True)
    return r.stdout


# Linha de lançamento casada pelo FIM: T.FRETE CTe [NºRV] VG LONA VIRA CARREG LONA VIAGEM
# - CTe pode ser um container com espaço (MRSU 306.229-7)
# - Nº RV pode vir em branco ou com texto (PEND., FERIAS)
RE_LANC = re.compile(
    rf'({NUM})\s+([A-Z]{{4}} [\d.]+-\d|\S+)\s+(?:(\S+)\s+)?(\d+)\s+(\d+)\s+({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s*$')
RE_INICIO_LANC = re.compile(r'^\s?([MOE]):\s+(\S+)')
RE_MOTORISTA = re.compile(r'^\s*MOTORISTA:\s*(.*?)\s+-\s+COD\.:\s*(\S+)\s*$', re.M)


def lancamentos(linhas):
    """Junta as linhas de cada lançamento (nome longo quebra a linha) e lê as colunas."""
    out, atual = [], None
    for ln in linhas:
        if RE_INICIO_LANC.match(ln):
            if atual:
                out.append(atual)
            atual = [ln]
        elif atual is not None:
            if ln.strip() == '' or 'RESUMO' in ln:
                out.append(atual)
                atual = None
            else:
                atual.append(ln)
    if atual:
        out.append(atual)
    res, falhas = [], []
    for fis in out:
        # os números ficam numa das linhas físicas: a 1ª (destino longo quebra depois)
        # ou a 2ª (nome longo quebra antes)
        m = next((m for m in map(RE_LANC.search, fis) if m), None)
        tipo, doc = RE_INICIO_LANC.match(fis[0]).groups()
        if not m:
            falhas.append(' '.join(x.strip() for x in fis))
            continue
        g = m.groups()
        lanc = dict(tipo=tipo, doc=doc, frete=br(g[0]), cte=g[1], rv=g[2] or '', vg=int(g[3]), lonaq=int(g[4]),
                    vira=br(g[5]), carreg=br(g[6]), lona=br(g[7]), viagem=br(g[8]))
        lanc.update(cabecalho_lanc(fis, m))
        res.append(lanc)
    return res, falhas


RE_DATA = re.compile(r'\d{2}/\d{2}/\d{2}')
RE_CONTAINER = re.compile(r'^([A-Z]{4} [\d.]+-\d)\s+(.*)$')


def cabecalho_lanc(fis, m):
    """Colunas de texto do lançamento (data, chegada, container, cliente, origem/destino),
    tiradas do que sobra das linhas físicas sem o bloco numérico do fim."""
    partes = []
    for ln in fis:
        if m.string is ln:
            ln = ln[:m.start()]
        partes.append(ln.strip())
    # as duas primeiras datas são DATA e DT.CHEGADA; nome longo pode colar na 1ª data
    # e continuar entre as duas, então o que vem antes da 2ª data é descartado
    txt = ' '.join(p for p in partes if p)
    datas = list(RE_DATA.finditer(txt))
    if len(datas) < 2:
        return dict(data='', chegada='', container='', cliente='', od='')
    resto = txt[datas[1].end():].strip()
    cont = ''
    mc = RE_CONTAINER.match(resto)
    if mc:
        cont, resto = mc.groups()
    pedacos = re.split(r'\s{2,}', resto)
    od = ' '.join(x.strip() for x in pedacos[1:])
    if re.fullmatch(r'/\s*x\s*/', od):  # eventos (E:) não têm origem/destino
        od = ''
    return dict(data=datas[0].group(), chegada=datas[1].group(), container=cont,
                cliente=pedacos[0].strip(), od=od)


def campo(txt, rotulo, padrao=NUM):
    """Valor logo depois do rótulo, na mesma linha; None se em branco."""
    m = re.search(re.escape(rotulo) + r'[ \t]*(?:R\$[ \t]*)?(' + padrao + r')?', txt)
    return m.group(1) if m else None


def resumo_bonus(txt):
    def par(rot):
        m = re.search(rf'{rot}:\s+(\d+)\s+{rot}:\s+R\$\s+({NUM})', txt)
        return int(m.group(1)), br(m.group(2))
    r = {}
    r['qViag'], r['vViag'] = par('TOTAL DE VIAGENS')
    r['qVira'], r['vVira'] = par('TOTAL DE VIRAS')
    r['qCarreg'], r['vCarreg'] = par('TOTAL CARREGAMENTO')
    r['qLona'], r['vLona'] = par('TOTAL DE LONAS')
    r['qViagVira'] = int(campo(txt, 'TOTAL VIAGEM+VIRA:', r'\d+'))
    r['subtotal'] = br(campo(txt, 'SUBTOTAL BÔNUS:'))
    r['totalBonus'] = br(campo(txt, 'TOTAL BÔNUS:'))
    r['frete'] = br(campo(txt, 'TOTAL DE FRETE CLIENTE:'))
    return r


def resumo_premio(txt):
    p = {}
    p['media'] = br(campo(txt, 'MÉDIA MOTORISTA:', r'[\d.]+,\d+'))
    p['gcod'] = int(campo(txt, 'GRUPO DE MAIOR KM:', r'\d+'))
    m = re.search(r'NOME:[ \t]*(.*)', txt)
    partes = re.split(r'\s{2,}', m.group(1).strip()) if m else ['']
    p['gnome'] = partes[0] if partes and not re.fullmatch(NUM, partes[0]) else ''
    p['totalPdf'] = br(partes[-1]) if partes and re.fullmatch(NUM, partes[-1]) else None
    p['pos'] = int(campo(txt, 'POSIÇÃO NO GRUPO:', r'\d+'))
    p['pctMedia'] = int(campo(txt, 'PERCENTUAL DE BÔNUS:', r'\d+')) / 100
    p['econ'] = br(campo(txt, 'VALOR ECONOMIA:'))
    p['premio'] = br(campo(txt, 'PRÊMIO POR ECONOMIA:'))
    p['bMedia'] = br(campo(txt, 'BÔNUS POR MÉDIA:'))
    p['premTotPdf'] = br(campo(txt, 'TOTAL PREMIAÇÃO:'))
    km = campo(txt, 'KM RODADO:', r'[\d.]+')
    p['km'] = int(km.replace('.', '')) if km else 0
    return p


def escolher_premio(blocos):
    """Bloco duplicado: vence o de maior TOTAL PREMIAÇÃO, desempate por média e km."""
    def chave(p):
        tot = p['premTotPdf'] if p['premTotPdf'] is not None else (p['premio'] or 0) + (p['bMedia'] or 0)
        return (tot, p['media'] or 0, p['km'])
    return max(blocos, key=chave)


def aplicar_ajustes(rows, mes, rel):
    """Exceções à regra "vale o resumo", autorizadas pelo usuário e documentadas em
    dados/ajustes/AAAA-MM.json: {"<cod>": {"frete": "linhas", "motivo": "..."}}."""
    arq = RAIZ / 'dados' / 'ajustes' / f'{mes}.json'
    if not arq.exists():
        return
    ajustes = json.loads(arq.read_text(encoding='utf8'))
    por_cod = {r['cod']: r for r in rows}
    for cod, aj in ajustes.items():
        r = por_cod.get(cod)
        if r is None:
            rel['falhas'].append(f'ajuste para {cod}, que não está no PDF do mês')
            continue
        if aj.get('frete') == 'linhas':
            antes, r['frete'] = r['frete'], r['_freteLinhas']
            rel['ajustes'].append(f'{cod} {r["nome"]}: frete do resumo {antes:,.2f} → soma das linhas '
                                  f'{r["frete"]:,.2f} ({r["frete"] - antes:+,.2f}) — {aj.get("motivo", "")}')


CAMPOS_LANC = ['tipo', 'doc', 'data', 'chegada', 'container', 'cliente', 'od', 'frete', 'cte', 'rv',
               'vg', 'lonaq', 'vira', 'carreg', 'lona', 'viagem']


def gravar_lancamentos(mes, txt, movs):
    """dados/lancamentos/AAAA-MM.json: todas as movimentações do PDF, por motorista,
    com o período do fechamento. Base do detalhe no painel e das verificações."""
    per = {}
    for chave, rot in (('viagens', 'FECHAMENTO DE VIAGENS'), ('media', 'FECHAMENTO DE MÉDIA')):
        m = re.search(rot + r':\s*(\d{2}/\d{2}/\d{4})[^-]*-\s*(\d{2}/\d{2}/\d{4})', txt)
        if m:
            per[chave] = list(m.groups())
    dest = RAIZ / 'dados' / 'lancamentos' / f'{mes}.json'
    dest.parent.mkdir(exist_ok=True)
    corpo = {'periodo': per, 'campos': CAMPOS_LANC,
             'motoristas': {cod: [[x[k] for k in CAMPOS_LANC] for x in ls] for cod, ls in movs.items()}}
    # uma linha por lançamento: legível no diff do git e compacto
    linhas = [f'  {json.dumps(cod)}: [\n' + ',\n'.join('   ' + json.dumps(r, ensure_ascii=False) for r in ls) + '\n  ]'
              for cod, ls in corpo['motoristas'].items()]
    dest.write_text('{\n "periodo": ' + json.dumps(per) + ',\n "campos": ' + json.dumps(CAMPOS_LANC) +
                    ',\n "motoristas": {\n' + ',\n'.join(linhas) + '\n }\n}\n', encoding='utf8')


def processar(pdf):
    """Lê o PDF e confere cada bloco. Devolve (rows, movs, rel, txt): rows com os valores
    do resumo (sem ajustes nem colunas derivadas), movs = lançamentos por motorista."""
    txt = texto_pdf(pdf)

    marcas = list(RE_MOTORISTA.finditer(txt))
    # um motorista pode ter o bloco partido em várias páginas: agrupar por código
    blocos = {}
    for i, m in enumerate(marcas):
        fim = marcas[i + 1].start() if i + 1 < len(marcas) else len(txt)
        nome, cod = m.group(1).strip(), m.group(2)
        b = blocos.setdefault(cod, {'nome': nome, 'txt': ''})
        b['txt'] += txt[m.end():fim] + '\n'

    movs = {}  # cod -> lançamentos, na ordem do PDF
    rel = {'identidade': [], 'frete': [], 'rubricas': [], 'premio': [], 'duplicados': [],
           'totalPdf': [], 'arred': [], 'eventos': [], 'falhas': [], 'arredLinhas': 0, 'viraRegra': [], 'ajustes': []}
    rows = []
    for cod, b in blocos.items():
        t = b['txt']
        lanc, falhas = lancamentos(t.split('\n'))
        movs[cod] = lanc
        for f in falhas:
            rel['falhas'].append(f'{cod} {b["nome"]}: linha não lida: {f[:140]}')
        rb = resumo_bonus(t)
        idx = [m.start() for m in re.finditer('RESUMO PRÊMIO POR MÉDIA', t)]
        pbs = [resumo_premio(t[s:(idx[k + 1] if k + 1 < len(idx) else len(t))]) for k, s in enumerate(idx)]
        if not pbs:
            rel['falhas'].append(f'{cod} {b["nome"]}: sem RESUMO PRÊMIO POR MÉDIA')
            continue
        pr = escolher_premio(pbs)
        if len(pbs) > 1:
            outros = [p for p in pbs if p is not pr]
            rel['duplicados'].append(
                f'{cod} {b["nome"]}: {len(pbs)} blocos de prêmio; considerado média {pr["media"]} · '
                f'{pr["km"]} km · total {pr["premTotPdf"]}; desconsiderado(s): ' +
                '; '.join(f'média {p["media"]} · {p["km"]} km · total {p["premTotPdf"]}' for p in outros))

        # --- conferência dos lançamentos contra o resumo do bônus
        soma = lambda k: round(sum(x[k] for x in lanc), 2)  # noqa: E731
        sf = soma('frete')
        if abs(sf - rb['frete']) > 0.005:
            rel['frete'].append(f'{cod} {b["nome"]}: resumo {rb["frete"]:,.2f} × linhas {sf:,.2f} '
                                f'(dif. {rb["frete"] - sf:+,.2f})')
        descart = vira_nao_computada(lanc)
        for x in descart:
            rel['viraRegra'].append(f'{cod} {b["nome"]}: {x["doc"]} vira R$ {x["vira"]:,.2f} na mesma linha '
                                    f'de viagem R$ {x["viagem"]:,.2f}')
        for k, rk in (('viagem', 'vViag'), ('vira', 'vVira'), ('carreg', 'vCarreg'), ('lona', 'vLona')):
            s = soma(k)
            if k == 'vira':
                s = round(s - sum(x['vira'] for x in descart), 2)
            if abs(s - rb[rk]) > 0.055:
                rel['rubricas'].append(f'{cod} {b["nome"]}: {rk} resumo {rb[rk]:,.2f} × linhas {s:,.2f} '
                                       f'(dif. {rb[rk] - s:+,.2f})')
            elif abs(s - rb[rk]) > 0.005:  # cada linha arredonda o seu bônus
                rel['arredLinhas'] += 1
        vg = sum(x['vg'] for x in lanc)
        if vg != rb['qViag']:
            rel['rubricas'].append(f'{cod} {b["nome"]}: coluna VG soma {vg} × {rb["qViag"]} viagens no resumo')
        for x in lanc:
            if x['tipo'] == 'E':
                rel['eventos'].append(f'{cod} {b["nome"]}: {x["doc"]} R$ {x["carreg"] + x["vira"] + x["lona"] + x["viagem"]:,.2f}')

        # --- identidades
        sub = round(rb['vViag'] + rb['vVira'] + rb['vCarreg'] + rb['vLona'], 2)
        if abs(sub - rb['subtotal']) > 0.005:
            rel['identidade'].append(f'{cod} {b["nome"]}: subtotal {rb["subtotal"]:,.2f} × parcelas {sub:,.2f}')
        if abs(rb['subtotal'] - rb['totalBonus']) > 0.005:
            rel['identidade'].append(f'{cod} {b["nome"]}: subtotal {rb["subtotal"]:,.2f} × total bônus {rb["totalBonus"]:,.2f}')
        premio, bmed = pr['premio'] or 0.0, pr['bMedia'] or 0.0
        premtot = round(premio + bmed, 2)  # como a coluna K da planilha (=H+J)
        if pr['premTotPdf'] is None:
            if premtot:
                rel['premio'].append(
                    f'{cod} {b["nome"]}: TOTAL PREMIAÇÃO em branco no PDF, mas prêmio por economia '
                    f'{pr["premio"]} + bônus por média {bmed:,.2f} = {premtot:,.2f}; o TOTAL impresso '
                    f'({pr["totalPdf"]}) não inclui esse valor')
        elif abs(pr['premTotPdf'] - premtot) > 0.015:
            rel['identidade'].append(f'{cod} {b["nome"]}: total premiação {pr["premTotPdf"]:,.2f} × parcelas {premtot:,.2f}')
        elif abs(pr['premTotPdf'] - premtot) > 0.0001:
            rel['arred'].append(f'{cod} {b["nome"]}: total premiação PDF {pr["premTotPdf"]:,.2f} × soma {premtot:,.2f}')
        bonif = round(rb['totalBonus'] + premtot, 2)
        if pr['totalPdf'] is not None and abs(pr['totalPdf'] - bonif) > 0.0001:
            lst = rel['arred'] if abs(pr['totalPdf'] - bonif) <= 0.015 else rel['totalPdf']
            lst.append(f'{cod} {b["nome"]}: TOTAL PDF {pr["totalPdf"]:,.2f} × soma {bonif:,.2f}')

        gnome = GRUPOS.get(pr['gcod'], pr['gnome'] or 'SEM GRUPO')
        if pr['gnome'] and pr['gnome'] != gnome:
            rel['falhas'].append(f'{cod}: grupo {pr["gcod"]} "{pr["gnome"]}" difere da tabela "{gnome}"')
        rows.append(dict(cod=cod, nome=b['nome'], grupo=gnome, gcod=pr['gcod'], frete=rb['frete'],
                         bonusOp=rb['totalBonus'], econ=pr['econ'] or 0.0, premio=premio,
                         pctMedia=pr['pctMedia'], bMedia=bmed, premTot=premtot, bonif=bonif,
                         viag=rb['qViag'], vira=rb['qViagVira'], km=pr['km'], media=pr['media'] or 0.0,
                         pos=pr['pos'],
                         # usados só na planilha/conferência
                         _vViag=rb['vViag'], _vVira=rb['vVira'], _vCarreg=rb['vCarreg'], _vLona=rb['vLona'],
                         _premTotPdf=pr['premTotPdf'], _totalPdf=pr['totalPdf'], _nLanc=len(lanc), _freteLinhas=sf))

    rows.sort(key=lambda r: r['nome'])
    return rows, movs, rel, txt


def main():
    if len(sys.argv) != 3 or not re.fullmatch(r'\d{4}-\d{2}', sys.argv[2]):
        sys.exit(__doc__)
    pdf, mes = Path(sys.argv[1]), sys.argv[2]
    rows, movs, rel, txt = processar(pdf)
    aplicar_ajustes(rows, mes, rel)
    derivar(rows)

    dest = RAIZ / 'dados' / f'{mes}.json'
    publico = [{k: v for k, v in r.items() if not k.startswith('_')} for r in rows]
    dest.write_text(json.dumps(publico, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
    gravar_lancamentos(mes, txt, movs)
    (RAIZ / 'saida').mkdir(exist_ok=True)
    (RAIZ / 'saida' / f'conferencia_{mes}.json').write_text(
        json.dumps({'rows': rows, 'relatorio': rel}, ensure_ascii=False, indent=1), encoding='utf8')

    # --- relatório
    tot = lambda k: round(sum(r[k] for r in rows), 2)  # noqa: E731
    print(f'== Conferência {mes} — {pdf.name}')
    print(f'Motoristas: {len(rows)} · lançamentos lidos: {sum(r["_nLanc"] for r in rows)}')
    print(f'Frete cliente R$ {tot("frete"):,.2f} · bônus op. R$ {tot("bonusOp"):,.2f} · '
          f'premiação R$ {tot("premTot"):,.2f} · bonificações R$ {tot("bonif"):,.2f}')
    print(f'Viagens {tot("viag"):.0f} · viagem+vira {tot("vira"):.0f} · km {tot("km"):,.0f}')
    titulos = [('falhas', 'Linhas/blocos não lidos (ERRO DE LEITURA — corrigir o parser)'),
               ('identidade', 'Identidades que não fecham'),
               ('premio', 'Premiação em branco no PDF'),
               ('frete', 'Frete do resumo × soma dos lançamentos (mantido o resumo)'),
               ('rubricas', 'Rubricas do bônus × lançamentos (mantido o resumo)'),
               ('totalPdf', 'TOTAL impresso × bônus + premiação'),
               ('duplicados', 'Blocos de prêmio duplicados'),
               ('ajustes', f'Ajustes autorizados aplicados (dados/ajustes/{mes}.json)'),
               ('viraRegra', 'Vira não computada por estar na linha de uma viagem paga (regra do Rodopar)'),
               ('eventos', 'Lançamentos de evento (E:) — incentivo/ajuda'),
               ('arred', 'Arredondamento de R$ 0,01 (planilha usa a soma)')]
    for k, t in titulos:
        print(f'\n-- {t}: {len(rel[k])}')
        for x in rel[k]:
            print('   ' + x)
    print(f'\n-- Rubricas com diferença de até R$ 0,05 entre resumo e linhas (arredondamento por linha): '
          f'{rel["arredLinhas"]}')
    print(f'\nGravado: {dest.relative_to(RAIZ)}')


if __name__ == '__main__':
    main()
