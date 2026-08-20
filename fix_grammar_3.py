import json

def fix_grammar_3(filepath, reps):
    with open(filepath, 'r', encoding='utf-8') as f:
        d = json.load(f)

    def process(obj):
        for k, v in obj.items():
            if isinstance(v, dict):
                process(v)
            elif isinstance(v, str):
                for pattern, repl in reps:
                    v = v.replace(pattern, repl)
                obj[k] = v
                
    process(d)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)

ru_reps = [
    ('лидах', 'заявках'),
    ('лидам', 'заявкам'),
]

uk_reps = [
    ('лідах', 'заявках'),
    ('лідам', 'заявкам'),
]

fix_grammar_3('frontend/src/i18n/dictionaries/ru.json', ru_reps)
fix_grammar_3('frontend/src/i18n/dictionaries/uk.json', uk_reps)
