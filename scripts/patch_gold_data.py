import json
import os
import glob

HISTORICAL_GOLD_USD = {
    2000: 280, 2001: 265, 2002: 300, 2003: 360, 2004: 410,
    2005: 440, 2006: 600, 2007: 700, 2008: 870, 2009: 970,
    2010: 1225, 2011: 1570, 2012: 1670, 2013: 1410, 2014: 1270,
    2015: 1160, 2016: 1250, 2017: 1260, 2018: 1270, 2019: 1400,
    2020: 1770, 2021: 1800, 2022: 1800, 2023: 1940, 2024: 2060,
    2025: 2350, 2026: 2600,
}

HISTORICAL_USDIDR = {
    2000: 8400, 2001: 10400, 2002: 9300, 2003: 8500, 2004: 9000,
    2005: 9700, 2006: 9100, 2007: 9100, 2008: 9700, 2009: 10400,
    2010: 9100, 2011: 8700, 2012: 9600, 2013: 12200, 2014: 12400,
    2015: 13800, 2016: 13300, 2017: 13500, 2018: 14300, 2019: 14100,
    2020: 14500, 2021: 14400, 2022: 15000, 2023: 15400, 2024: 15700,
    2025: 16000, 2026: 16600,
}

TROY_OZ_TO_GRAM = 31.1034768
OLD_FLAT_GOLD_USD = 1800
OLD_FLAT_USDIDR = 15000


def patch_file(filepath):
    with open(filepath, 'r') as f:
        data = json.load(f)

    changes_usdidr = 0
    changes_gold = 0

    for entry in data:
        date_str = entry.get('date', '')
        year = int(date_str[:4]) if len(date_str) >= 4 else 2000
        historical_usdidr = HISTORICAL_USDIDR.get(year, 15000)
        historical_gold_usd = HISTORICAL_GOLD_USD.get(year, 1800)

        current_usdidr = entry.get('usdidrRate', 0)
        current_gold_price = entry.get('goldPrice', 0)

        # Infer what gold_usd was used originally (using ORIGINAL usdidr, before patching)
        if current_usdidr > 0 and current_gold_price > 0:
            implied_gold_usd = (current_gold_price * TROY_OZ_TO_GRAM) / current_usdidr
        else:
            implied_gold_usd = None

        # Patch USDIDR if it matches the old flat fallback
        patched_usdidr = False
        if current_usdidr == OLD_FLAT_USDIDR:
            entry['usdidrRate'] = historical_usdidr
            changes_usdidr += 1
            patched_usdidr = True

        # Use the (possibly patched) usdidr for gold recalculation
        new_usdidr = entry['usdidrRate']

        # Determine correct gold_usd value
        if implied_gold_usd is not None and abs(implied_gold_usd - OLD_FLAT_GOLD_USD) / OLD_FLAT_GOLD_USD < 0.05:
            # Gold was using old flat fallback ($1800) -> replace with historical yearly value
            correct_gold_usd = historical_gold_usd
        elif implied_gold_usd is not None and patched_usdidr:
            # USDIDR was wrong, but gold_usd came from real data -> recalculate with correct usdidr
            correct_gold_usd = implied_gold_usd
        else:
            correct_gold_usd = None

        if correct_gold_usd is not None:
            new_gold_price = round((correct_gold_usd * new_usdidr) / TROY_OZ_TO_GRAM)
            if new_gold_price != current_gold_price:
                entry['goldPrice'] = new_gold_price
                changes_gold += 1

    if changes_usdidr > 0 or changes_gold > 0:
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"  Patched {os.path.basename(filepath)}: usdidr={changes_usdidr}, gold={changes_gold}")
    else:
        print(f"  No changes: {os.path.basename(filepath)}")


def main():
    data_dir = os.path.join('D:', os.sep, 'CODE', 'QUANTBIT', 'data', 'years')
    pattern = os.path.join(data_dir, '*.json')
    files = sorted(glob.glob(pattern))
    print(f"Found {len(files)} yearly files")

    for filepath in files:
        patch_file(filepath)

    for fname in [os.path.join('data', 'historical_market_data.json'),
                  os.path.join('src', 'data', 'historical_market_data.json')]:
        fpath = os.path.join('D:', os.sep, 'CODE', 'QUANTBIT', fname)
        if os.path.exists(fpath):
            print(f"\nProcessing {fname}...")
            patch_file(fpath)


if __name__ == '__main__':
    main()
