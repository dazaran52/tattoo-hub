import json
import os
import re
import glob
from deep_translator import GoogleTranslator

FRONTEND_DIR = "frontend/src"
I18N_DIR = os.path.join(FRONTEND_DIR, "i18n/dictionaries")

def to_camel_case(text):
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    words = text.strip().split()
    if not words:
        return ""
    words = words[:4]
    camel = words[0].lower() + ''.join(w.capitalize() for w in words[1:])
    return camel

def main():
    en_path = os.path.join(I18N_DIR, "en.json")
    ru_path = os.path.join(I18N_DIR, "ru.json")
    
    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
    with open(ru_path, 'r', encoding='utf-8') as f:
        ru_data = json.load(f)
        
    translator = GoogleTranslator(source='ru', target='en')
    
    # We need to find all keys that start with "key_" (from previous script)
    keys_to_translate = [k for k in en_data.keys() if k.startswith("key_") and re.match(r'^key_[a-f0-9]{6}$', k)]
    print(f"Found {len(keys_to_translate)} keys to translate")
    
    mapping = {}
    used_keys = set(en_data.keys())
    
    for i, old_key in enumerate(keys_to_translate):
        ru_text = ru_data.get(old_key, "")
        if not ru_text:
            continue
            
        try:
            en_text = translator.translate(ru_text)
        except Exception as e:
            print(f"Translate error for {ru_text}: {e}")
            en_text = ru_text
            
        semantic_key = to_camel_case(en_text)
        if not semantic_key:
            semantic_key = old_key
            
        original_semantic = semantic_key
        counter = 2
        while semantic_key in used_keys and semantic_key != old_key:
            semantic_key = f"{original_semantic}{counter}"
            counter += 1
            
        used_keys.add(semantic_key)
        mapping[old_key] = semantic_key
        
        # Add to JSON
        en_data[semantic_key] = en_text
        ru_data[semantic_key] = ru_text
        
        # Delete old key
        if semantic_key != old_key:
            if old_key in en_data: del en_data[old_key]
            if old_key in ru_data: del ru_data[old_key]
            
        if i % 100 == 0:
            print(f"Processed {i}/{len(keys_to_translate)}")
            
    # Replace in code
    all_files = glob.glob(f"{FRONTEND_DIR}/**/*.ts", recursive=True) + glob.glob(f"{FRONTEND_DIR}/**/*.tsx", recursive=True)
    
    replaced_count = 0
    for file_path in all_files:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = content
        for old_key, new_key in mapping.items():
            if old_key != new_key:
                new_content = new_content.replace(f"'{old_key}'", f"'{new_key}'")
                new_content = new_content.replace(f'"{old_key}"', f'"{new_key}"')
                new_content = new_content.replace(f"`{old_key}`", f"`{new_key}`")
                
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            replaced_count += 1
            
    with open(en_path, 'w', encoding='utf-8') as f:
        json.dump(en_data, f, indent=2, ensure_ascii=False)
    with open(ru_path, 'w', encoding='utf-8') as f:
        json.dump(ru_data, f, indent=2, ensure_ascii=False)
        
    print(f"Refactored {len(mapping)} keys in {replaced_count} files.")

if __name__ == "__main__":
    main()
