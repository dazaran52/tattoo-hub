import json
import os
import re
import glob

FRONTEND_DIR = "frontend/src"
I18N_DIR = os.path.join(FRONTEND_DIR, "i18n/dictionaries")

def to_camel_case(text):
    # Remove HTML tags if any
    text = re.sub(r'<[^>]+>', '', text)
    # Remove special characters, keep only alphanumeric and spaces
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    words = text.strip().split()
    if not words:
        return "unknownKey"
    
    # Take up to 5 words to keep the key reasonable
    words = words[:5]
    
    # Camel case
    camel = words[0].lower() + ''.join(w.capitalize() for w in words[1:])
    return camel

def main():
    en_path = os.path.join(I18N_DIR, "en.json")
    ru_path = os.path.join(I18N_DIR, "ru.json")
    
    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
        
    with open(ru_path, 'r', encoding='utf-8') as f:
        ru_data = json.load(f)
        
    if "Auto" not in en_data:
        print("No Auto object found in en.json")
        return
        
    auto_keys = en_data["Auto"]
    
    # Generate mapping Auto.text_XXXX -> semanticKey
    mapping = {}
    used_keys = set(en_data.keys())
    
    for auto_key, en_value in auto_keys.items():
        if not isinstance(en_value, str):
            continue
            
        semantic_key = to_camel_case(en_value)
        if not semantic_key or semantic_key == "unknownKey":
            semantic_key = f"key_{auto_key.split('_')[-1]}"
            
        original_semantic = semantic_key
        counter = 2
        while semantic_key in used_keys:
            semantic_key = f"{original_semantic}{counter}"
            counter += 1
            
        used_keys.add(semantic_key)
        mapping[f"Auto.{auto_key}"] = semantic_key
        
        # Move to root
        en_data[semantic_key] = en_value
        if "Auto" in ru_data and auto_key in ru_data["Auto"]:
            ru_data[semantic_key] = ru_data["Auto"][auto_key]
        else:
            ru_data[semantic_key] = en_value # Fallback
            
    # Remove Auto object
    del en_data["Auto"]
    if "Auto" in ru_data:
        del ru_data["Auto"]
        
    # Replace in all ts/tsx files
    ts_files = glob.glob(f"{FRONTEND_DIR}/**/*.ts", recursive=True)
    tsx_files = glob.glob(f"{FRONTEND_DIR}/**/*.tsx", recursive=True)
    all_files = ts_files + tsx_files
    
    replaced_count = 0
    for file_path in all_files:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = content
        for old_key, new_key in mapping.items():
            new_content = new_content.replace(f"'{old_key}'", f"'{new_key}'")
            new_content = new_content.replace(f'"{old_key}"', f'"{new_key}"')
            new_content = new_content.replace(f"`{old_key}`", f"`{new_key}`")
            
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            replaced_count += 1
            print(f"Updated {file_path}")
            
    # Save JSON files
    with open(en_path, 'w', encoding='utf-8') as f:
        json.dump(en_data, f, indent=2, ensure_ascii=False)
        
    with open(ru_path, 'w', encoding='utf-8') as f:
        json.dump(ru_data, f, indent=2, ensure_ascii=False)
        
    print(f"Refactored {len(mapping)} keys in {replaced_count} files.")

if __name__ == "__main__":
    main()
