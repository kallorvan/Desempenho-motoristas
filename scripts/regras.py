#!/usr/bin/env python3
"""Regras de verificação sobre as movimentações do mês (dados/lancamentos/AAAA-MM.json).

Uso: python3 scripts/regras.py AAAA-MM      → relatório das ocorrências

O painel (3_painel.py) roda as mesmas regras a cada build, então criar ou ajustar
uma regra aqui não exige reler o PDF. Para acrescentar uma regra: registrar em
REGRAS (id, nível, título, descrição) e devolver as ocorrências em `verificar`.
Níveis: 'alerta' (precisa de conferência) e 'info' (situação conhecida, só registro).
"""
import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# Parâmetros (ajustar aqui quando a política mudar)
TAXAS_VIAGEM = (1.75, 1.85, 2.05)   # bônus de viagem em % do frete, usuais em set/2026
VALORES_LONA = (30.0, 35.0)         # R$ por lona
CTE_SEM_NUMERO = '00--000000'       # lançamentos de evento (E:)

REGRAS = [
    dict(id='CTE_FRETE_DUP', curto='CT-e duplicado', nivel='alerta', titulo='CT-e com frete em mais de um lançamento',
         descricao='O mesmo CT-e aparece com frete em dois ou mais lançamentos (do mesmo motorista ou de '
                   'outro) e cada um gerou bônus de viagem. Possível frete e bônus contados em dobro.'),
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


def indice_cte(movs):
    """CT-e -> [(cod, índice, lançamento)] dos lançamentos com frete (base da regra de duplicidade)."""
    por_cte = defaultdict(list)
    for cod, ls in movs.items():
        for i, x in enumerate(ls):
            if x['cte'] != CTE_SEM_NUMERO and x['frete'] > 0:
                por_cte[x['cte']].append((cod, i, x))
    return por_cte


def grupos_duplicados(mes):
    """[{cte, itens: [[cod, índice], ...]}] dos CT-e com frete em mais de um lançamento."""
    carga = carregar(mes)
    if carga is None:
        return []
    _, movs = carga
    return [{'cte': cte, 'itens': [[c, i] for c, i, _ in v]}
            for cte, v in indice_cte(movs).items() if len(v) > 1]


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

    per = d.get('periodo', {}).get('viagens')
    if per:
        ini, fim = (datetime.strptime(p, '%d/%m/%Y').date() for p in per)

    for cod, ls in movs.items():
        for i, x in enumerate(ls):
            outros = [o for o in por_cte.get(x['cte'], []) if (o[0], o[1]) != (cod, i)]
            if x['frete'] > 0 and outros:
                marca(cod, i, 'CTE_FRETE_DUP', 'CT-e ' + x['cte'] + ' também em ' + '; '.join(
                    f'{c} doc. {o["doc"]} (frete R$ {brl(o["frete"])}, bônus R$ {brl(o["viagem"])})' for c, _, o in outros))
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
