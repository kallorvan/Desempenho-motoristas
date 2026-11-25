#!/usr/bin/env python3
"""Regras de verificação sobre as movimentações do mês (dados/lancamentos/AAAA-MM.json).

Uso: python3 scripts/regras.py AAAA-MM      → relatório das ocorrências

O painel (3_painel.py) roda as mesmas regras a cada build, então criar ou ajustar
uma regra aqui não exige reler o PDF. Para acrescentar uma regra: registrar em
REGRAS (id, nível, título, descrição) e devolver as ocorrências em `verificar`.
Níveis: 'alerta' (precisa de conferência) e 'info' (situação conhecida, só registro).
"""
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# Parâmetros (ajustar aqui quando a política mudar)
TAXAS_VIAGEM = (1.75, 1.85, 2.05)   # bônus de viagem em % do frete, usuais em set/2026
VALORES_LONA = (30.0, 35.0)         # R$ por lona
CTE_SEM_NUMERO = '00--000000'       # lançamentos de evento (E:)
# Rotas locais: são carregamento, não viagem — não podem ter valor de viagem (regra
# informada pelo usuário em out/2026). Pares sem ordem: vale nos dois sentidos.
ROTAS_CARREGAMENTO = [('MACHADO', 'MACHADO'), ('MACHADO', 'POUSO ALEGRE'), ('MACHADO', 'VARGINHA')]
_ROTAS_CARREG = {frozenset(r) for r in ROTAS_CARREGAMENTO}
# Valor de carregamento devido no lugar do bônus de viagem nessas rotas (definido pelo
# usuário em out/2026: R$ 25,00 por lançamento) — usado na apuração de pagamento indevido.
VALOR_CARREGAMENTO = 25.0
# Viagem dividida (regra do usuário, nov/2026): dois motoristas no mesmo CT-e, com Nº RV
# diferentes, um recebe 60% do frete do CT-e e o outro 40% (vale com trecho igual ou não).
DIVISAO_VIAGEM = (60, 40)
TOL_DIVISAO = 0.011                 # R$, arredondamento do Rodopar em cada parte

REGRAS = [
    dict(id='CTE_FRETE_DUP', curto='CT-e duplicado', nivel='alerta', titulo='CT-e com frete em mais de um lançamento',
         descricao='O mesmo CT-e aparece com frete em dois ou mais lançamentos (do mesmo motorista ou de '
                   'outro) e cada um gerou bônus de viagem. Possível frete e bônus contados em dobro.'),
    dict(id='VIAGEM_DIVIDIDA', curto='Viagem dividida', nivel='info',
         titulo='Viagem dividida entre dois motoristas (60% / 40%)',
         descricao='O mesmo CT-e aparece em dois motoristas com Nº RV diferentes e o frete dividido '
                   '60% / 40% (as partes somam o frete do CT-e). É a regra de viagem dividida: '
                   'cada um recebe o bônus sobre a própria parte. Vale com o trecho igual ou não.'),
    dict(id='ROTA_CARREGAMENTO', curto='Rota de carregamento', nivel='alerta',
         titulo='Valor de viagem em rota de carregamento',
         descricao='Rotas ' + ', '.join(f'{a.title()} x {b.title()}' for a, b in ROTAS_CARREGAMENTO) +
                   ' (nos dois sentidos) são carregamento e não podem ter valor de viagem.'),
    dict(id='ORDEM_CANCELADA_PAGA', curto='Ordem cancelada paga', nivel='alerta',
         titulo='Ordem cancelada com valor pago',
         descricao='Mesmo CT-e, mesmo trecho e mesmo motorista: uma das ordens foi cancelada (VG 0) e não '
                   'deveria entrar no pagamento, mas tem valor que entrou para pagamento (viagem, lona, vira '
                   'ou carregamento). Tudo o que foi pago na linha deve ser estornado.'),
    dict(id='ORDEM_CANCELADA', curto='Ordem cancelada', nivel='info',
         titulo='Ordem cancelada (mesmo CT-e, trecho e motorista)',
         descricao='Uma das ordens do mesmo CT-e, trecho e motorista foi cancelada e ficou fora da contagem '
                   'de viagens e do pagamento.'),
    dict(id='REPETIDO_MES_ANTERIOR', curto='Já no mês anterior', nivel='alerta',
         titulo='Lançamento que já estava no fechamento do mês anterior',
         descricao='Mesmo motorista, mesmo documento e mesmo CT-e já constavam nas movimentações do mês anterior '
                   '(ex.: viagens do dia 30/09 no fechamento de out/2026, cujo período começa em 30/09). '
                   'Possível frete e bônus contados e pagos nos dois meses.'),
    dict(id='CTE_MES_ANTERIOR', curto='CT-e do mês anterior', nivel='alerta',
         titulo='CT-e com frete já lançado no mês anterior',
         descricao='O CT-e tem frete neste mês e já teve frete no mês anterior, em outro motorista ou outro '
                   'documento, sem ser a divisão 60% / 40%. Possível frete e bônus contados nos dois meses '
                   '(ex.: nov/2026, Varginha x Santos com o mesmo container e frete inteiro em out e nov).'),
    dict(id='RV_FERIAS', curto='RV férias', nivel='alerta', titulo='Viagem com Nº RV "FERIAS"',
         descricao='Lançamento com o Nº RV marcado como FERIAS: motorista em férias com viagem lançada.'),
    dict(id='TAXA_VIAGEM', curto='Taxa atípica', nivel='alerta', titulo='Bônus de viagem fora das taxas usuais',
         descricao='Bônus de viagem ÷ frete diferente de ' + ', '.join(f'{t:.2f}%'.replace('.', ',') for t in TAXAS_VIAGEM) + '.'),
    dict(id='FRETE_SEM_BONUS', curto='Frete s/ bônus', nivel='alerta', titulo='Frete sem bônus de viagem',
         descricao='Lançamento com frete e sem bônus de viagem.'),
    dict(id='BONUS_SEM_FRETE', curto='Bônus s/ frete', nivel='alerta', titulo='Bônus de viagem sem frete',
         descricao='Bônus de viagem pago em lançamento sem frete.'),
    dict(id='LONA_VALOR', curto='Lona atípica', nivel='alerta', titulo='Valor de lona fora do padrão',
         descricao='Valor por lona diferente de ' + ' / '.join(f'R$ {v:.2f}'.replace('.', ',') for v in VALORES_LONA) +
                   ', ou quantidade de lona sem valor (ou o contrário).'),
    dict(id='DATA_FORA', curto='Fora do período', nivel='alerta', titulo='Data fora do período de viagens',
         descricao='Data do lançamento fora do período do fechamento de viagens do PDF.'),
    dict(id='RV_PENDENTE', curto='RV pendente', nivel='info', titulo='Nº RV pendente',
         descricao='Lançamento com o Nº RV "PEND." (RV ainda não fechado).'),
    dict(id='VIRA_COM_VIAGEM', curto='Vira não computada', nivel='info', titulo='Vira não computada (na linha de uma viagem)',
         descricao='Regra do Rodopar: vira lançada na mesma linha de um pagamento de viagem não entra no total de viras.'),
    dict(id='EVENTO', curto='Evento', nivel='info', titulo='Evento (incentivo / ajuda)',
         descricao='Lançamento E: (incentivo, ajuda com manobras); entra na rubrica de carregamento.'),
    dict(id='ZERADO', curto='Sem valor', nivel='info', titulo='Lançamento sem valor',
         descricao='Lançamento sem frete e sem nenhum bônus.'),
]
POR_ID = {r['id']: r for r in REGRAS}


def brl(v):
    return f'{v:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')


def carregar(mes):
    arq = RAIZ / 'dados' / 'lancamentos' / f'{mes}.json'
    if not arq.exists():
        return None
    d = json.loads(arq.read_text(encoding='utf8'))
    campos = d['campos']
    movs = {cod: [dict(zip(campos, r)) for r in ls] for cod, ls in d['motoristas'].items()}
    return d, movs


RUBRICAS = (('viagem', 'viagem'), ('lona', 'lona'), ('vira', 'vira'), ('carreg', 'carregamento'))


def conferencia_rubricas(d, movs):
    """{cod: {rubrica: True/False}}: a rubrica entrou inteira para pagamento, isto é, o RESUMO
    DO BÔNUS do motorista traz pelo menos a soma das linhas (tolerância de R$ 0,05 do
    arredondamento por linha; vira na linha de uma viagem não conta — regra do Rodopar).
    Vazio quando o arquivo de lançamentos não tem os resumos (gerado antes de out/2026)."""
    res = d.get('resumos') or {}
    out = {}
    for cod, rb in res.items():
        ls = movs.get(cod, [])
        out[cod] = {}
        for k, _ in RUBRICAS:
            soma = sum(x[k] for x in ls if not (k == 'vira' and x['viagem']))
            out[cod][k] = rb[k] + 0.05 >= soma
    return out


def pago_linha(x, conf=None):
    """O que a linha teve de pagamento: ({rubrica: valor} que entrou para pagamento,
    [rubricas com valor na linha que não dá para confirmar no resumo])."""
    pago, sem = {}, []
    for k, _ in RUBRICAS:
        v = x[k]
        if not v or (k == 'vira' and x['viagem']):  # vira na linha de viagem não é computada
            continue
        if conf is not None and not conf.get(k, True):
            sem.append(k)
            continue
        pago[k] = round(v, 2)
    return pago, sem


def compor(pago):
    """{'viagem': 138.38, 'lona': 60.0} -> 'viagem R$ 138,38 + lona R$ 60,00'"""
    nomes = dict(RUBRICAS)
    return ' + '.join(f'{nomes[k]} R$ {brl(v)}' for k, v in pago.items())


def cidades(od):
    """'MACHADO/MG x POUSO ALEGRE/MG' -> ('MACHADO', 'POUSO ALEGRE'); None se não houver trecho."""
    p = [re.sub(r'/[A-Z]{2}$', '', x.strip()) for x in re.split(r'\s+x\s+', od or '')]
    return tuple(p) if len(p) == 2 and all(p) else None


def rota_carregamento(od):
    c = cidades(od)
    return bool(c) and frozenset(c) in _ROTAS_CARREG


def indice_cte(movs):
    """CT-e -> [(cod, índice, lançamento)] dos lançamentos com frete (base da regra de duplicidade)."""
    por_cte = defaultdict(list)
    for cod, ls in movs.items():
        for i, x in enumerate(ls):
            if x['cte'] != CTE_SEM_NUMERO and x['frete'] > 0:
                por_cte[x['cte']].append((cod, i, x))
    return por_cte


def divisao(itens):
    """[pct de cada item] se o grupo é uma viagem dividida 60/40, senão None.

    itens: lançamentos (dicts) do mesmo CT-e. Exige 2 motoristas diferentes, Nº RV
    diferentes e cada frete igual à sua parte do total (tolerância TOL_DIVISAO)."""
    if len(itens) != 2:
        return None
    (ca, a), (cb, b) = itens
    if ca == cb or a['rv'] == b['rv']:
        return None
    tot = a['frete'] + b['frete']
    for pa, pb in (DIVISAO_VIAGEM, DIVISAO_VIAGEM[::-1]):
        if abs(a['frete'] - tot * pa / 100) <= TOL_DIVISAO and abs(b['frete'] - tot * pb / 100) <= TOL_DIVISAO:
            return [pa, pb]
    return None


def mes_anterior(mes):
    aaaa, mm = map(int, mes.split('-'))
    return f'{aaaa - (mm == 1)}-{12 if mm == 1 else mm - 1:02d}'


def cte_anterior(mes, movs):
    """CT-e -> [(cod, índice, lançamento)] do mês anterior com frete, só dos CT-e que têm frete
    neste mês, sem os lançamentos que são o mesmo motorista + documento (REPETIDO_MES_ANTERIOR)."""
    carga = carregar(mes_anterior(mes))
    if carga is None:
        return {}
    atual = indice_cte(movs)
    out = {}
    for cte, v in indice_cte(carga[1]).items():
        if cte not in atual:
            continue
        meus = {(c, x['doc']) for c, _, x in atual[cte]}
        resto = [t for t in v if (t[0], t[2]['doc']) not in meus]
        if resto:
            out[cte] = resto
    return out


def grupos_duplicados(mes):
    """[{cte, itens: [[cod, índice] ou [cod, índice, mês anterior], ...]}] dos CT-e com frete em mais
    de um lançamento — no mês ou somando o mês anterior (CTE_MES_ANTERIOR)."""
    carga = carregar(mes)
    if carga is None:
        return []
    _, movs = carga
    ant, mant = cte_anterior(mes, movs), mes_anterior(mes)
    gs = []
    for cte, v in indice_cte(movs).items():
        p = ant.get(cte, [])
        if len(v) + len(p) > 1:
            gs.append({'cte': cte, 'itens': [[c, i, mant] for c, i, _ in p] + [[c, i] for c, i, _ in v],
                       'divisao': divisao([(c, x) for c, _, x in p + v]), 'anterior': bool(p)})
    return gs


def verificar(mes):
    """{cod: {índice do lançamento: [[id, mensagem], ...]}} ou None se o mês não tem lançamentos."""
    carga = carregar(mes)
    if carga is None:
        return None
    d, movs = carga
    oc = defaultdict(lambda: defaultdict(list))

    def marca(cod, i, rid, msg):
        oc[cod][i].append([rid, msg])

    # índice por CT-e para a regra de duplicidade
    por_cte = indice_cte(movs)
    conf = conferencia_rubricas(d, movs)

    # movimentações do mês anterior, para achar lançamentos repetidos entre fechamentos
    ant = mes_anterior(mes)
    cte_ant = cte_anterior(mes, movs)
    carga_ant = carregar(ant)
    no_ant = {}
    if carga_ant:
        for c, ls in carga_ant[1].items():
            for x in ls:
                no_ant.setdefault((c, x['doc'], x['cte']), x)

    per = d.get('periodo', {}).get('viagens')
    if per:
        ini, fim = (datetime.strptime(p, '%d/%m/%Y').date() for p in per)

    for cod, ls in movs.items():
        for i, x in enumerate(ls):
            outros = [o for o in por_cte.get(x['cte'], []) if (o[0], o[1]) != (cod, i)]
            div = divisao([(c, o) for c, _, o in por_cte.get(x['cte'], [])]) if outros else None
            if x['frete'] > 0 and div:
                c2, _, o = outros[0]
                meu = div[[k for k, (c, j, _) in enumerate(por_cte[x['cte']]) if (c, j) == (cod, i)][0]]
                marca(cod, i, 'VIAGEM_DIVIDIDA',
                      f'CT-e {x["cte"]}: {meu}% do frete (R$ {brl(x["frete"])}, bônus R$ {brl(x["viagem"])}) · '
                      f'{100 - meu}% com {c2} doc. {o["doc"]} (frete R$ {brl(o["frete"])}, RV {o["rv"]}) · '
                      f'frete do CT-e R$ {brl(x["frete"] + o["frete"])}')
            elif x['frete'] > 0 and outros:
                marca(cod, i, 'CTE_FRETE_DUP', 'CT-e ' + x['cte'] + ' também em ' + '; '.join(
                    f'{c} doc. {o["doc"]} (frete R$ {brl(o["frete"])}, bônus R$ {brl(o["viagem"])})' for c, _, o in outros))
            for c2, i2, o in outros:
                if c2 == cod and o['od'] == x['od'] and not x['vg'] and o['vg']:
                    pago, sem = pago_linha(x, conf.get(cod))
                    if pago:
                        marca(cod, i, 'ORDEM_CANCELADA_PAGA', f'ordem cancelada (doc. {o["doc"]} é a ordem válida) '
                                                              f'com {compor(pago)} pago — estornar R$ {brl(sum(pago.values()))}'
                              + (f'; não confirmado no resumo: {", ".join(sem)}' if sem else ''))
                    else:
                        marca(cod, i, 'ORDEM_CANCELADA', f'ordem cancelada; válida: doc. {o["doc"]}')
                    break
            if x['viagem'] > 0 and rota_carregamento(x['od']):
                marca(cod, i, 'ROTA_CARREGAMENTO', f'{x["od"]} com bônus de viagem R$ {brl(x["viagem"])}'
                      + (' e contada como viagem (VG 1)' if x['vg'] else '') + ' — deveria ser carregamento')
            y = no_ant.get((cod, x['doc'], x['cte']))
            if y and any((x['frete'], x['viagem'], x['vira'], x['carreg'], x['lona'])):
                marca(cod, i, 'REPETIDO_MES_ANTERIOR',
                      f'doc. {x["doc"]} · CT-e {x["cte"]} ({x["data"]}) já no fechamento de {ant[5:]}/{ant[:4]} '
                      f'(lá: viagem R$ {brl(y["viagem"])}, VG {y["vg"]}; aqui: viagem R$ {brl(x["viagem"])}, VG {x["vg"]})')
            p = cte_ant.get(x['cte'], []) if x['frete'] > 0 else []
            if p:
                div2 = divisao([(c, o) for c, _, o in p] + [(cod, x)]) if len(p) == 1 and len(por_cte[x['cte']]) == 1 else None
                c2, _, o = p[0]
                if div2:
                    marca(cod, i, 'VIAGEM_DIVIDIDA',
                          f'CT-e {x["cte"]}: {div2[1]}% do frete (R$ {brl(x["frete"])}, bônus R$ {brl(x["viagem"])}) · '
                          f'{div2[0]}% com {c2} doc. {o["doc"]} no mês anterior ({o["data"]}, frete R$ {brl(o["frete"])}, '
                          f'RV {o["rv"]}) · frete do CT-e R$ {brl(x["frete"] + o["frete"])}')
                else:
                    marca(cod, i, 'CTE_MES_ANTERIOR', f'CT-e {x["cte"]} (frete R$ {brl(x["frete"])}, bônus R$ {brl(x["viagem"])}) '
                          f'já com frete em {ant[5:]}/{ant[:4]}: ' + '; '.join(
                              f'{c} doc. {y["doc"]} {y["data"]} {y["od"]} (frete R$ {brl(y["frete"])}, bônus R$ {brl(y["viagem"])}'
                              f'{", mesmo container" if y["container"] and y["container"] == x["container"] else ""})'
                              for c, _, y in p))
            if x['rv'] == 'FERIAS':
                marca(cod, i, 'RV_FERIAS', f'Nº RV "FERIAS" com frete R$ {brl(x["frete"])} e bônus R$ {brl(x["viagem"])}')
            if x['frete'] > 0 and x['viagem'] > 0:
                taxa = x['viagem'] / x['frete'] * 100
                if all(abs(taxa - t) > 0.006 for t in TAXAS_VIAGEM):
                    marca(cod, i, 'TAXA_VIAGEM', f'bônus de viagem = {taxa:.2f}% do frete'.replace('.', ','))
            if x['frete'] > 0 and not x['viagem']:
                marca(cod, i, 'FRETE_SEM_BONUS', f'frete R$ {brl(x["frete"])} sem bônus de viagem')
            if x['viagem'] > 0 and not x['frete']:
                marca(cod, i, 'BONUS_SEM_FRETE', f'bônus de viagem R$ {brl(x["viagem"])} sem frete')
            if x['lonaq'] or x['lona']:
                if not x['lonaq'] or not x['lona']:
                    marca(cod, i, 'LONA_VALOR', f'{x["lonaq"]} lona(s) e R$ {brl(x["lona"])}')
                elif all(abs(x['lona'] / x['lonaq'] - v) > 0.005 for v in VALORES_LONA):
                    marca(cod, i, 'LONA_VALOR', f'{x["lonaq"]} lona(s) por R$ {brl(x["lona"])} '
                                                f'(R$ {brl(x["lona"] / x["lonaq"])} cada)')
            if per and x['data']:
                dt = datetime.strptime(x['data'], '%d/%m/%y').date()
                if not ini <= dt <= fim:
                    marca(cod, i, 'DATA_FORA', f'data {x["data"]} fora de {per[0]}–{per[1]}')
            if x['rv'] == 'PEND.':
                marca(cod, i, 'RV_PENDENTE', 'Nº RV pendente')
            if x['vira'] and x['viagem']:
                marca(cod, i, 'VIRA_COM_VIAGEM', f'vira R$ {brl(x["vira"])} não computada (linha com viagem)')
            if x['tipo'] == 'E':
                marca(cod, i, 'EVENTO', f'{x["cliente"] or "evento"}: R$ {brl(x["carreg"] + x["vira"] + x["lona"] + x["viagem"])}')
            if not any((x['frete'], x['vira'], x['carreg'], x['lona'], x['viagem'])):
                marca(cod, i, 'ZERADO', 'sem frete e sem bônus')
    return {cod: dict(v) for cod, v in oc.items()}


def apuracao(mes, oc=None):
    """Pagamento indevido de viagem, por motorista: bônus de viagem em rota de carregamento
    (devido só o carregamento, VALOR_CARREGAMENTO por lançamento) e ordem cancelada (nada
    devido: estorna viagem, lona, vira e carregamento da linha que entraram para pagamento). Devolve {'itens': [...], 'motoristas': [...], 'total': {...}}."""
    carga = carregar(mes)
    if carga is None:
        return None
    d, movs = carga
    oc = verificar(mes) if oc is None else oc
    conf = conferencia_rubricas(d, movs)
    itens = []
    for cod, por_i in oc.items():
        for i, marcas in por_i.items():
            ids = {m[0] for m in marcas}
            x = movs[cod][int(i)]
            sem = []
            if 'ORDEM_CANCELADA_PAGA' in ids:
                # ordem cancelada: estorna tudo o que a linha teve de pagamento (viagem, lona,
                # vira, carregamento), desde que tenha entrado para pagamento no resumo
                motivo, devido = 'Ordem cancelada paga', 0.0
                pago, sem = pago_linha(x, conf.get(cod))
            elif 'ROTA_CARREGAMENTO' in ids:
                motivo, devido = 'Viagem em rota de carregamento', VALOR_CARREGAMENTO
                pago = {'viagem': round(x['viagem'], 2)}
            else:
                continue
            total = round(sum(pago.values()), 2)
            itens.append({'cod': cod, 'i': int(i), 'motivo': motivo, 'doc': x['doc'], 'data': x['data'],
                          'od': x['od'], 'cte': x['cte'], 'container': x['container'], 'vg': x['vg'], 'pago': total,
                          'comp': pago, 'composicao': compor(pago), 'semConf': sem,
                          'devido': devido, 'recuperar': round(total - devido, 2)})
    por = defaultdict(lambda: {'lanc': 0, 'pago': 0.0, 'devido': 0.0, 'recuperar': 0.0, 'vg': 0, 'motivos': set()})
    for it in itens:
        m = por[it['cod']]
        m['lanc'] += 1
        m['vg'] += it['vg']
        m['motivos'].add(it['motivo'])
        for k in ('pago', 'devido', 'recuperar'):
            m[k] = round(m[k] + it[k], 2)
    mots = sorted(({'cod': c, **{k: v for k, v in m.items() if k != 'motivos'}, 'motivos': sorted(m['motivos'])}
                   for c, m in por.items()), key=lambda m: -m['recuperar'])
    tot = {k: round(sum(m[k] for m in mots), 2) for k in ('pago', 'devido', 'recuperar')}
    tot.update(lanc=len(itens), vg=sum(m['vg'] for m in mots), motoristas=len(mots))
    return {'itens': itens, 'motoristas': mots, 'total': tot, 'valorCarregamento': VALOR_CARREGAMENTO}


def resumo(oc):
    """Contagem por regra: lançamentos e motoristas."""
    out = {r['id']: {'lanc': 0, 'mot': set()} for r in REGRAS}
    for cod, por_i in oc.items():
        for marcas in por_i.values():
            for rid, _ in marcas:
                out[rid]['lanc'] += 1
                out[rid]['mot'].add(cod)
    return {k: {'lanc': v['lanc'], 'mot': len(v['mot'])} for k, v in out.items()}


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    mes = sys.argv[1]
    oc = verificar(mes)
    if oc is None:
        sys.exit(f'Sem dados/lancamentos/{mes}.json — rode o 1_extrair.py do mês.')
    nomes = {r['cod']: r['nome'] for r in json.loads((RAIZ / 'dados' / f'{mes}.json').read_text(encoding='utf8'))}
    _, movs = carregar(mes)
    res = resumo(oc)
    ap = apuracao(mes, oc)
    print(f'== Pagamento indevido de viagem — {mes} (carregamento devido: R$ {brl(VALOR_CARREGAMENTO)} por lançamento)')
    for m in ap['motoristas']:
        print(f'   {m["cod"]} {nomes.get(m["cod"], "")[:30]:30} {m["lanc"]} lanç. · pago R$ {brl(m["pago"]):>8} · '
              f'devido R$ {brl(m["devido"]):>6} · a recuperar R$ {brl(m["recuperar"]):>8} · VG {m["vg"]} · {", ".join(m["motivos"])}')
        for it in (i for i in ap['itens'] if i['cod'] == m['cod'] and (len(i['comp']) > 1 or i['semConf'])):
            print(f'      {it["doc"]}: {it["composicao"]}' +
                  (f' · não confirmado no resumo: {", ".join(it["semConf"])}' if it['semConf'] else ''))
    t = ap['total']
    print(f'   TOTAL: {t["motoristas"]} motoristas, {t["lanc"]} lançamentos · pago R$ {brl(t["pago"])} · '
          f'devido R$ {brl(t["devido"])} · a recuperar R$ {brl(t["recuperar"])} · VG {t["vg"]}\n')
    print(f'== Verificações das movimentações — {mes}')
    for nivel in ('alerta', 'info'):
        for r in (r for r in REGRAS if r['nivel'] == nivel):
            c = res[r['id']]
            print(f'\n-- [{nivel}] {r["titulo"]}: {c["lanc"]} lançamento(s), {c["mot"]} motorista(s)')
            if nivel == 'info' and c['lanc'] > 12:
                continue  # informativos muito frequentes: só a contagem
            for cod in sorted(oc):
                for i, marcas in sorted(oc[cod].items()):
                    for rid, msg in marcas:
                        if rid == r['id']:
                            x = movs[cod][i]
                            print(f'   {cod} {nomes.get(cod, "")[:28]:28} {x["tipo"]}: {x["doc"]} {x["data"]} — {msg}')


if __name__ == '__main__':
    main()
