import json

with open('frontend/src/i18n/dictionaries/cs.json', 'r', encoding='utf-8') as f:
    cs = json.load(f)

def fix_cs(d):
    for k, v in d.items():
        if isinstance(v, dict):
            fix_cs(v)
        elif isinstance(v, str):
            v = v.replace('Odeslat potenciálního zákazníka na tržiště', 'Odeslat poptávku na tržiště')
            v = v.replace('Vedení bylo úspěšně přeneseno na trh!', 'Poptávka byla úspěšně předána na tržiště!')
            v = v.replace('toto vedení', 'tuto poptávku')
            v = v.replace('Vedení bylo úspěšně přeneseno na mistra! 🎉', 'Poptávka byla úspěšně předána tatérovi! 🎉')
            v = v.replace('Aktualizace databáze potenciálních zákazníků...', 'Aktualizace databáze poptávek...')
            v = v.replace('Oznámení o nových potenciálních zákaznících povoleno! 🔔', 'Oznámení o nových poptávkách povoleno! 🔔')
            v = v.replace('Zveřejněte svůj zájemce', 'Zveřejnit svou poptávku')
            v = v.replace('Převod / prodej olova', 'Předat / Prodat poptávku')
            v = v.replace('k poptávce a chatu s tatérem ➔', 'k chatu s tatérem ➔')
            d[k] = v

fix_cs(cs)

with open('frontend/src/i18n/dictionaries/cs.json', 'w', encoding='utf-8') as f:
    json.dump(cs, f, ensure_ascii=False, indent=2)

