import json
import os
from pathlib import Path

LOCALES_DIR = Path(__file__).parent.parent / "locales"

_dictionaries = {}

def _load_dictionaries():
    if _dictionaries:
        return
    for lang in ["ru", "en"]:
        file_path = LOCALES_DIR / f"{lang}.json"
        if file_path.exists():
            with open(file_path, "r", encoding="utf-8") as f:
                _dictionaries[lang] = json.load(f)
        else:
            _dictionaries[lang] = {}

def get_text(lang: str, key: str, **kwargs) -> str:
    """Get localized text from backend dictionaries. Fallbacks to ru."""
    _load_dictionaries()
    
    if lang not in _dictionaries:
        lang = "ru" # Default fallback
        
    parts = key.split('.')
    
    # Try specified language
    obj = _dictionaries.get(lang, {})
    for p in parts:
        if isinstance(obj, dict):
            obj = obj.get(p)
        else:
            obj = None
            break
            
    # Try fallback language if not found
    if obj is None and lang != "ru":
        obj = _dictionaries.get("ru", {})
        for p in parts:
            if isinstance(obj, dict):
                obj = obj.get(p)
            else:
                obj = None
                break
                
    if isinstance(obj, str):
        # Format with kwargs if any
        if kwargs:
            try:
                return obj.format(**kwargs)
            except Exception:
                return obj
        return obj
        
    return key
