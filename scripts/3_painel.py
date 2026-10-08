#!/usr/bin/env python3
"""Lê todo dados/*.json e gera saida/Dashboard_Produtividade_Motoristas.html.

Uso: python3 scripts/3_painel.py

Junta painel/base.html (casca) e painel/app.js (lógica), injetando DATASETS,
TOTAIS e os rótulos dos meses.
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / 'scripts'))
from comum import KM_MIN, avaliado, totais  # noqa: E402
import regras  # noqa: E402

MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto',
         'Setembro', 'Outubro', 'Novembro', 'Dezembro']
CAMPOS = ['cod', 'nome', 'grupo', 'frete', 'bonusOp', 'econ', 'premio', 'pctMedia', 'bMedia', 'premTot',
          'bonif', 'viag', 'vira', 'km', 'media', 'pos', 'pctBF', 'fpv', 'bpv', 'fkm', 'bkm', 'part', 'rF', 'rB']


def js(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':'))


def main():
    arquivos = sorted((RAIZ / 'dados').glob('[0-9][0-9][0-9][0-9]-[0-9][0-9].json'))
    datasets, tots, mlabel, mshort, lanc = {}, {}, {}, {}, {}
    for f in arquivos:
        mes = f.stem
        rows = json.loads(f.read_text(encoding='utf8'))
        datasets[mes] = [{k: r[k] for k in CAMPOS} for r in rows]
        tots[mes] = totais(rows)
        aval = [r for r in rows if avaliado(r)]
        fora = [r for r in rows if not avaliado(r)]
        tots[mes]['aval'] = totais(aval)
        s = lambda k: round(sum(r[k] for r in fora), 2)  # noqa: E731
        tots[mes]['fora'] = {'n': len(fora), 'frete': s('frete'), 'bonusOp': s('bonusOp'),
                             'premTot': s('premTot'), 'bonif': s('bonif'), 'km': s('km')}
        carga = regras.carregar(mes)
        if carga:
            d, _ = carga
            oc = regras.verificar(mes)
            lanc[mes] = {'campos': d['campos'], 'periodo': d['periodo'], 'mot': d['motoristas'],
                         'flags': oc, 'resumo': regras.resumo(oc), 'dup': regras.grupos_duplicados(mes)}
        aaaa, mm = mes.split('-')
        nome = MESES[int(mm) - 1]
        mlabel[mes] = f'{nome} / {aaaa}'
        mshort[mes] = f'{nome[:3]}/{aaaa[2:]}'

    app = (RAIZ / 'painel' / 'app.js').read_text(encoding='utf8')
    for k, v in (('__LANC__', lanc), ('__REGRAS__', regras.REGRAS), ('__KM_MIN__', KM_MIN), ('__DATASETS__', datasets), ('__TOTAIS__', tots), ('__MLABEL__', mlabel), ('__MSHORT__', mshort)):
        assert app.count(k) == 1, f'placeholder {k} deve aparecer uma vez em app.js'
        app = app.replace(k, js(v))
    base = (RAIZ / 'painel' / 'base.html').read_text(encoding='utf8')
    assert base.count('__APP_JS__') == 1
    html = base.replace('__APP_JS__', app.rstrip('\n'))

    (RAIZ / 'saida').mkdir(exist_ok=True)
    dest = RAIZ / 'saida' / 'Dashboard_Produtividade_Motoristas.html'
    dest.write_text(html, encoding='utf8')
    print(f'Gravado: {dest.relative_to(RAIZ)} — meses: ' +
          ', '.join(f'{m} ({len(d)} motoristas, frete R$ {tots[m]["frete"]:,.2f})' for m, d in datasets.items()))


if __name__ == '__main__':
    main()
