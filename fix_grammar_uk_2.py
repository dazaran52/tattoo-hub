import json

with open('frontend/src/i18n/dictionaries/uk.json', 'r', encoding='utf-8') as f:
    uk = json.load(f)

def fix_grammar_2(d):
    for k, v in d.items():
        if isinstance(v, dict):
            fix_grammar_2(v)
        elif isinstance(v, str):
            v = v.replace('Заявка виставлено на продаж!', 'Заявку виставлено на продаж!')
            v = v.replace('Заявка успішно передано на маркетплейс!', 'Заявку успішно передано на маркетплейс!')
            v = v.replace('Заявка успішно передано майстру!', 'Заявку успішно передано майстру!')
            v = v.replace('Додати Заявки', 'Додати заявку')
            v = v.replace('Заявка успішно створена та доданий до Мої Заявки!', 'Заявку успішно створено та додано в Мої заявки!')
            d[k] = v

fix_grammar_2(uk)

with open('frontend/src/i18n/dictionaries/uk.json', 'w', encoding='utf-8') as f:
    json.dump(uk, f, ensure_ascii=False, indent=2)
