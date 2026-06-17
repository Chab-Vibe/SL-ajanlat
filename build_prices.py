# -*- coding: utf-8 -*-
"""
SL Lemezkereskedés – árlista átalakító.
Beolvassa az  arak_strukturalt.csv  fájlt (a mester-árlista), és legenerálja az
app/data/prices.js -t, amiből az alkalmazás dolgozik.

Használat:  python build_prices.py
Az árak szerkesztése a CSV-ben történik; utána futtasd ezt a scriptet, és frissül az app.

A nem CSV-alapú adatokat (élhajlítás díjsávok, élhajlítás-profilok, tartozékok, ÁFA-kulcs)
ez a script tartalmazza statikusan – ezeket itt lehet módosítani.
"""
import csv, json, os

CSV_PATH = 'arak_strukturalt.csv'
OUT_PATH = os.path.join('app', 'data', 'prices.js')

# ---- statikus, nem CSV-ben tárolt adatok -------------------------------------
VAT_RATE = 0.27

ELHAJLITAS_BANDS = [
    [6.5, 650], [11, 900], [14, 1050], [16, 1100], [20, 1200], [24, 1400], [25, 1600],
    [30, 1700], [31.2, 1950], [35, 2050], [41, 2300], [41.6, 2500], [45, 2650], [50, 2800],
    [55, 3150], [62, 3250], [62.5, 3400], [70, 3900], [75, 4200], [80, 4400], [85, 4650],
    [90, 4900], [95, 5050], [100, 5250], [105, 5500], [110, 5700], [115, 5900], [125, 6450]
]
ELHAJLITAS_PRESETS = [
    {"name": "Oromszegő standard", "teritek": 0},
    {"name": "Kúpos 14×14", "teritek": 0},
    {"name": "Kúpos 19,3×19,3", "teritek": 0},
    {"name": "Falszegő", "teritek": 0},
    {"name": "Ablakpárkány / könyöklő", "teritek": 0},
    {"name": "Attikaszegő", "teritek": 0},
    {"name": "Kéményszegő", "teritek": 0},
    {"name": "Vápalemez", "teritek": 0},
]
ACCESSORIES = [
    "Kúpos", "Kúpos vég", "Fa csavar", "Fém csavar", "Fűzőcsavar",
    "Tetőfólia 130g", "Tetőkibúvó", "Kéményszegő", "Villanyszegő", "Hóvágó",
    "Oromszegő", "Falszegő", "Vápa", "Szegő", "Kis opel csavar", '"J" szegő (m)', "Kiszállítás"
]

def to_num(s):
    s = (s or '').strip().replace(' ', '').replace(',', '.')
    try:
        f = float(s)
        return int(f) if f == int(f) else f
    except ValueError:
        return 0

def main():
    rows = []
    with open(CSV_PATH, encoding='utf-8-sig', newline='') as f:
        rd = csv.reader(f, delimiter=';')
        header = next(rd)
        for r in rd:
            if not r or len(r) < 7 or not r[0].strip():
                continue
            rows.append([r[0], r[1], r[2], r[3], r[4], r[5], to_num(r[6])])

    static = {
        "vatRate": VAT_RATE,
        "elhajlitasBands": ELHAJLITAS_BANDS,
        "elhajlitasPresets": ELHAJLITAS_PRESETS,
        "accessories": ACCESSORIES,
    }

    parts = []
    parts.append("/* ==========================================================================")
    parts.append("   SL Lemezkereskedés – ÁR ADATOK (GENERÁLT FÁJL)")
    parts.append("   Ezt a fájlt a  build_prices.py  hozza létre az  arak_strukturalt.csv -ből.")
    parts.append("   NE szerkeszd kézzel! Az árakat a CSV-ben módosítsd, majd futtasd:  python build_prices.py")
    parts.append("   ========================================================================== */")
    parts.append("window.SL_PRICES = " + json.dumps(static, ensure_ascii=False, indent=2) + ";")
    parts.append("")
    parts.append("/* Oszlopok: [gyarto, profil, meret, vastagsag, felulet, szin, ar] */")
    parts.append("window.SL_PRICE_ROWS = [")
    parts.append(",\n".join("  " + json.dumps(r, ensure_ascii=False) for r in rows))
    parts.append("];")
    parts.append("")

    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        f.write("\n".join(parts))

    print("Generálva:", OUT_PATH)
    print("Ársorok:", len(rows))

if __name__ == '__main__':
    main()
