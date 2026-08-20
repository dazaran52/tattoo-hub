import json

with open('frontend/src/i18n/dictionaries/ru.json', 'r', encoding='utf-8') as f:
    ru = json.load(f)

def fix_grammar_2(d):
    for k, v in d.items():
        if isinstance(v, dict):
            fix_grammar_2(v)
        elif isinstance(v, str):
            v = v.replace('Заявка удаленаа', 'Заявка удалена')
            v = v.replace('Добавить Заявки', 'Добавить заявку')
            v = v.replace('Заявка успешно создана и добавлен в Мои Заявки!', 'Заявка успешно создана и добавлена в Мои заявки!')
            d[k] = v

fix_grammar_2(ru)

with open('frontend/src/i18n/dictionaries/ru.json', 'w', encoding='utf-8') as f:
    json.dump(ru, f, ensure_ascii=False, indent=2)
