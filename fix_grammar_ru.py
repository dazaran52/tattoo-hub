import json
import re

with open('frontend/src/i18n/dictionaries/ru.json', 'r', encoding='utf-8') as f:
    ru = json.load(f)

with open('frontend/src/i18n/dictionaries/uk.json', 'r', encoding='utf-8') as f:
    uk = json.load(f)

def fix_grammar_ru(d):
    for k, v in d.items():
        if isinstance(v, dict):
            fix_grammar_ru(v)
        elif isinstance(v, str):
            v = v.replace('Создать заявка', 'Создать заявку')
            v = v.replace('Редактировать заявка', 'Редактировать заявку')
            v = v.replace('Удалить заявка', 'Удалить заявку')
            v = v.replace('Заявка успешно создан', 'Заявка успешно создана')
            v = v.replace('Заявка успешно обновлен', 'Заявка успешно обновлена')
            v = v.replace('Заявка удален', 'Заявка удалена')
            v = v.replace('этот заявка', 'эту заявку')
            v = v.replace('этот Заявка', 'эту Заявку')
            v = v.replace('Создайте новый.', 'Создайте новую.')
            v = v.replace('Сдать заявка', 'Сдать заявку')
            v = v.replace('Заявка выставлен', 'Заявка выставлена')
            v = v.replace('Заявка успешно передан', 'Заявка успешно передана')
            v = v.replace('ни одного заявки', 'ни одной заявки')
            v = v.replace('Разместить свой заявка', 'Разместить свою заявку')
            v = v.replace('Добавить Заявка', 'Добавить заявку')
            v = v.replace('Передать / Продать заявки', 'Передать / Продать заявку')
            v = v.replace('Передать / Продать заявка', 'Передать / Продать заявку')
            d[k] = v

def fix_grammar_uk(d):
    for k, v in d.items():
        if isinstance(v, dict):
            fix_grammar_uk(v)
        elif isinstance(v, str):
            v = v.replace('Створити заявка', 'Створити заявку')
            v = v.replace('Редагувати заявка', 'Редагувати заявку')
            v = v.replace('Видалити заявка', 'Видалити заявку')
            v = v.replace('Заявка успішно створений', 'Заявка успішно створена')
            v = v.replace('Заявка успішно оновлений', 'Заявка успішно оновлена')
            v = v.replace('Заявка видалений', 'Заявка видалена')
            v = v.replace('цей заявка', 'цю заявку')
            v = v.replace('Цей заявка', 'Цю заявку')
            v = v.replace('Створіть новий.', 'Створіть нову.')
            v = v.replace('Здати заявка', 'Здати заявку')
            v = v.replace('Заявка виставлений', 'Заявка виставлена')
            v = v.replace('Заявка успішно переданий', 'Заявка успішно передана')
            v = v.replace('жодного заявки', 'жодної заявки')
            v = v.replace('Розмістити свій заявка', 'Розмістити свою заявку')
            v = v.replace('Додати Заявка', 'Додати заявку')
            v = v.replace('Передати / Продати заявки', 'Передати / Продати заявку')
            v = v.replace('Передати / Продати заявка', 'Передати / Продати заявку')
            d[k] = v

fix_grammar_ru(ru)
fix_grammar_uk(uk)

with open('frontend/src/i18n/dictionaries/ru.json', 'w', encoding='utf-8') as f:
    json.dump(ru, f, ensure_ascii=False, indent=2)

with open('frontend/src/i18n/dictionaries/uk.json', 'w', encoding='utf-8') as f:
    json.dump(uk, f, ensure_ascii=False, indent=2)
