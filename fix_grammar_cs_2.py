import json

with open('frontend/src/i18n/dictionaries/cs.json', 'r', encoding='utf-8') as f:
    cs = json.load(f)

def fix_cs(d):
    for k, v in d.items():
        if isinstance(v, dict):
            fix_cs(v)
        elif isinstance(v, str):
            v = v.replace('Olovo je na prodej!', 'Poptávka je vystavena k prodeji!')
            v = v.replace('Ještě jste nezakoupili žádné potenciální zákazníky.', 'Ještě jste nezakoupili žádnou poptávku.')
            v = v.replace('Pro váš požadavek nejsou žádné potenciální zákazníky.', 'Nebyly nalezeny žádné poptávky.')
            v = v.replace('Chyba při vytváření potenciálního zákazníka', 'Chyba při vytváření poptávky')
            v = v.replace('Potenciální zákazník byl úspěšně vytvořen a přidán do složky My Leads!', 'Poptávka byla úspěšně vytvořena a přidána do sekce Moje poptávky!')
            v = v.replace('Před poskytnutím úplného přístupu k potenciálním zákazníkům administrace zkontroluje vaši práci.', 'Před poskytnutím úplného přístupu k poptávkám administrace zkontroluje vaši práci.')
            d[k] = v

fix_cs(cs)

with open('frontend/src/i18n/dictionaries/cs.json', 'w', encoding='utf-8') as f:
    json.dump(cs, f, ensure_ascii=False, indent=2)

