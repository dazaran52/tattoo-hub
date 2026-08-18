import json
import os
import re
from deep_translator import GoogleTranslator

FRONTEND_DIR = "frontend/src"
I18N_DIR = os.path.join(FRONTEND_DIR, "i18n/dictionaries")

langs = {
    'en': 'en',
    'cs': 'cs',
    'uk': 'uk'
}

def translate_dict(d, ru_d, translator, file_lang):
    translated_count = 0
    for k, v in list(d.items()):
        if isinstance(v, str):
            ru_v = ru_d.get(k)
            # Only translate if the current value is exactly the same as the Russian value
            # This ensures we don't overwrite manual translations
            if ru_v and v == ru_v and re.search('[а-яА-ЯёЁ]', v):
                try:
                    res = translator.translate(v)
                    if res:
                        d[k] = res
                        translated_count += 1
                except Exception as e:
                    print(f"Error translating '{v}': {e}")
        elif isinstance(v, dict):
            if k in ru_d and isinstance(ru_d[k], dict):
                translated_count += translate_dict(v, ru_d[k], translator, file_lang)
    return translated_count

def main():
    ru_path = os.path.join(I18N_DIR, "ru.json")
    with open(ru_path, 'r', encoding='utf-8') as f:
        ru_data = json.load(f)

    for lang_code, target_lang in langs.items():
        file_path = os.path.join(I18N_DIR, f"{lang_code}.json")
        if not os.path.exists(file_path):
            continue
            
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        print(f"Processing {lang_code}.json...")
        translator = GoogleTranslator(source='ru', target=target_lang)
        
        count = translate_dict(data, ru_data, translator, lang_code)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
        print(f"Translated {count} strings in {lang_code}.json")

if __name__ == "__main__":
    main()
