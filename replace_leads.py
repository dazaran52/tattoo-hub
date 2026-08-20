import json
import re

def process_dict(d, replacements):
    for k, v in d.items():
        if isinstance(v, dict):
            process_dict(v, replacements)
        elif isinstance(v, str):
            for pattern, repl in replacements:
                v = re.sub(pattern, repl, v)
            d[k] = v

replacements_ru = [
    (r'\bлиды\b', 'заявки'),
    (r'\bЛиды\b', 'Заявки'),
    (r'\bлидов\b', 'заявок'),
    (r'\bЛидов\b', 'Заявок'),
    (r'\bлида\b', 'заявки'),
    (r'\bЛида\b', 'Заявки'),
    (r'\bлиду\b', 'заявке'),
    (r'\bлиде\b', 'заявке'),
    (r'\bлид\b', 'заявка'),
    (r'\bЛид\b', 'Заявка'),
    (r'\bLead\b', 'Заявка'),
    (r'\blead\b', 'заявка'),
    (r'\bLeads\b', 'Заявки'),
    (r'\bleads\b', 'заявки'),
]

replacements_uk = [
    (r'\bліди\b', 'заявки'),
    (r'\bЛіди\b', 'Заявки'),
    (r'\bлідів\b', 'заявок'),
    (r'\bЛідів\b', 'Заявок'),
    (r'\bліда\b', 'заявки'),
    (r'\bЛіда\b', 'Заявки'),
    (r'\bліду\b', 'заявці'),
    (r'\bЛіду\b', 'Заявці'),
    (r'\bлід\b', 'заявка'),
    (r'\bЛід\b', 'Заявка'),
    (r'\bLead\b', 'Заявка'),
    (r'\blead\b', 'заявка'),
    (r'\bLeads\b', 'Заявки'),
    (r'\bleads\b', 'заявки'),
]

replacements_en = [
    (r'\bleads\b', 'requests'),
    (r'\bLeads\b', 'Requests'),
    (r'\blead\b', 'request'),
    (r'\bLead\b', 'Request'),
]

replacements_cs = [
    (r'\bleady\b', 'poptávky'),
    (r'\bLeady\b', 'Poptávky'),
    (r'\bleadů\b', 'poptávek'),
    (r'\bLeadů\b', 'Poptávek'),
    (r'\bleadech\b', 'poptávkách'),
    (r'\bLeadech\b', 'Poptávkách'),
    (r'\blead\b', 'poptávka'),
    (r'\bLead\b', 'Poptávka'),
]

configs = [
    ('frontend/src/i18n/dictionaries/ru.json', replacements_ru),
    ('frontend/src/i18n/dictionaries/uk.json', replacements_uk),
    ('frontend/src/i18n/dictionaries/en.json', replacements_en),
    ('frontend/src/i18n/dictionaries/cs.json', replacements_cs),
]

for path, reps in configs:
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    process_dict(data, reps)
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Done")
