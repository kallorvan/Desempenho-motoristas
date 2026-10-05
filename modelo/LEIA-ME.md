# modelo/

Coloque aqui o `Indicadores_Produtividade_Motoristas_07_2026.xlsx` (ou o de agosto).
É a referência de layout que o `2_planilha.py` replica — 25 colunas, duas abas,
cores e fórmulas descritas em `docs/procedimento.md`.

Atenção: esse arquivo é OOXML **strict**, e o `openpyxl` o abre com
`sheetnames: []`. Para inspecioná-lo, converta antes:

    soffice --headless --convert-to xlsx:"Calc MS Excel 2007 XML" --outdir conv <arquivo>.xlsx
