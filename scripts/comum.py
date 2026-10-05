"""Tabela de grupos e colunas derivadas — as mesmas contas das colunas R–Y da planilha."""

# código do grupo de maior km -> nome (aba "Base Classificação Motorista")
GRUPOS = {
    17: 'GRUPO SCANIA E VOLVO 440',
    18: 'GRUPO VOLVO BI TRUCK',
    20: 'GRUPO VOLVO SCANIA 480 /510 e 540',
    21: 'GRUPO VOLVO SCANIA TAMPA BAIXA',
    48: 'GRUPO VOLVO SCANIA CAÇAMBA',
    49: 'GRUPO METEOR VW',
    50: 'GRUPO VOLVO SCANIA GRANELEIRO',
}
# motorista sem média no mês (GRUPO DE MAIOR KM: 0 no PDF)
SEM_GRUPO = (0, 'SEM GRUPO')
CODIGO_GRUPO = {v: k for k, v in GRUPOS.items()} | {SEM_GRUPO[1]: SEM_GRUPO[0]}


def _div(a, b):
    return a / b if b else None


def _rank(vals, v):
    """RANK() do Excel, decrescente, empates com a mesma posição."""
    return 1 + sum(1 for x in vals if x > v)


def derivar(rows):
    tf = sum(r['frete'] for r in rows)
    fretes = [r['frete'] for r in rows]
    bonifs = [r['bonif'] for r in rows]
    for r in rows:
        x = _div(r['bonif'], r['frete'])
        r['pctBF'] = round(x, 5) if x is not None else 'Manobrista'
        for k, a, b, nd in (('fpv', 'frete', 'viag', 2), ('bpv', 'bonif', 'vira', 2),
                            ('fkm', 'frete', 'km', 4), ('bkm', 'bonif', 'km', 4)):
            x = _div(r[a], r[b])
            r[k] = round(x, nd) if x is not None else None
        r['part'] = round(r['frete'] / tf, 6) if tf else 0.0
        r['rF'] = _rank(fretes, r['frete']) if r['frete'] else None
        r['rB'] = _rank(bonifs, r['bonif']) if r['bonif'] else None
    return rows


def totais(rows):
    s = lambda k: round(sum(r[k] for r in rows), 2)  # noqa: E731
    t = {'cod': 'TOTAL / MEDIA', 'nome': f'{len(rows)} Motoristas',
         'frete': s('frete'), 'bonusOp': s('bonusOp'), 'valorEconomia': s('econ'),
         'premioEconomia': s('premio'), 'bonusMedia': s('bMedia'), 'totalPremiacao': s('premTot'),
         'totalBonif': s('bonif'), 'viagens': float(s('viag')), 'viagensVira': float(s('vira')),
         'km': float(s('km'))}
    medias = [r['media'] for r in rows if r['media'] > 0]
    t['media'] = round(sum(medias) / len(medias), 6)  # simples, como o AVERAGEIFS do modelo
    t['pctBonifFrete'] = round(t['totalBonif'] / t['frete'], 6)
    t['freteMedioViagem'] = round(t['frete'] / t['viagens'], 6)
    t['bonifMediaViagem'] = round(t['totalBonif'] / t['viagensVira'], 6)
    t['fretePorKm'] = round(t['frete'] / t['km'], 6)
    t['bonifPorKm'] = round(t['totalBonif'] / t['km'], 6)
    t['partFrete'] = 1.0
    return t


def vira_nao_computada(linhas):
    """Regra do Rodopar: vira lançada na mesma linha de um pagamento de viagem não é
    computada no TOTAL DE VIRAS (ex.: 0763, set/2026, R$ 55,00)."""
    return [x for x in linhas if x['vira'] and x['viagem']]
