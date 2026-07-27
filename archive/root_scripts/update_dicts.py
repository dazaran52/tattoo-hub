import json
import os

keys = {
    'step1Title': {'ru': 'Опиши свою идею', 'en': 'Describe your idea', 'cs': 'Popište svůj nápad'},
    'step2Title': {'ru': 'Детали татуировки', 'en': 'Tattoo details', 'cs': 'Detaily tetování'},
    'step3Title': {'ru': 'Бюджет и референсы', 'en': 'Budget and references', 'cs': 'Rozpočet a reference'},
    'step4Title': {'ru': 'Твои контакты', 'en': 'Your contacts', 'cs': 'Vaše kontakty'},
    
    'describeIdeaTitle': {'ru': 'Расскажи, что хочешь набить', 'en': 'Tell us what you want to get', 'cs': 'Řekněte nám, co chcete vytetovat'},
    'describeIdeaPlaceholder': {'ru': 'Например: Хочу черно-белого дракона, обвивающего меч...', 'en': 'E.g.: I want a black and white dragon wrapped around a sword...', 'cs': 'Např.: Chci černobílého draka omotaného kolem meče...'},
    'styleOptional': {'ru': 'Стиль (опционально)', 'en': 'Style (optional)', 'cs': 'Styl (volitelně)'},
    
    'style_notSure': {'ru': 'Пока не знаю', 'en': 'Not sure yet', 'cs': 'Zatím nevím'},
    'style_realism': {'ru': 'Реализм', 'en': 'Realism', 'cs': 'Realismus'},
    'style_traditional': {'ru': 'Олдскул', 'en': 'Traditional', 'cs': 'Tradiční'},
    'style_minimalism': {'ru': 'Минимализм', 'en': 'Minimalism', 'cs': 'Minimalismus'},
    'style_japanese': {'ru': 'Япония', 'en': 'Japanese', 'cs': 'Japonský'},
    'style_blackwork': {'ru': 'Блэкворк', 'en': 'Blackwork', 'cs': 'Blackwork'},
    'style_linework': {'ru': 'Лайнворк', 'en': 'Linework', 'cs': 'Linework'},
    'style_neotraditional': {'ru': 'Неотрад', 'en': 'Neotraditional', 'cs': 'Neotradiční'},
    'style_lettering': {'ru': 'Леттеринг', 'en': 'Lettering', 'cs': 'Písmo'},
    'style_watercolor': {'ru': 'Акварель', 'en': 'Watercolor', 'cs': 'Akvarel'},
    'style_anime': {'ru': 'Аниме', 'en': 'Anime', 'cs': 'Anime'},
    'style_otherStyle': {'ru': 'Другое', 'en': 'Other', 'cs': 'Jiné'},
    
    'tattooPlacement': {'ru': 'Место нанесения', 'en': 'Placement', 'cs': 'Umístění'},
    'placementPlaceholder': {'ru': 'Например: Предплечье, спина, бедро...', 'en': 'E.g.: Forearm, back, thigh...', 'cs': 'Např.: Předloktí, záda, stehno...'},
    'approximateSize': {'ru': 'Примерный размер', 'en': 'Approximate size', 'cs': 'Přibližná velikost'},
    'sizePlaceholder': {'ru': "Например: 15х10 см, или просто 'большая'", 'en': "E.g.: 15x10 cm, or just 'large'", 'cs': "Např.: 15x10 cm, nebo prostě 'velké'"},
    
    'budgetLabel': {'ru': 'Бюджет', 'en': 'Budget', 'cs': 'Rozpočet'},
    'budgetDescription': {'ru': 'Точная или примерная сумма', 'en': 'Exact or approximate amount', 'cs': 'Přesná nebo přibližná částka'},
    'exactBudget': {'ru': 'Точный бюджет', 'en': 'Exact budget', 'cs': 'Přesný rozpočet'},
    'negotiableBudget': {'ru': 'Договорная цена', 'en': 'Negotiable price', 'cs': 'Cena dohodou'},
    
    'referencesTitle': {'ru': 'Фотографии и референсы', 'en': 'Photos and references', 'cs': 'Fotografie a reference'},
    'referencesDesc': {'ru': 'Прикрепи примеры работ, которые тебе нравятся', 'en': 'Attach examples of work you like', 'cs': 'Připojte příklady prací, které se vám líbí'},
    'uploadPhoto': {'ru': 'Загрузить фото', 'en': 'Upload photo', 'cs': 'Nahrát fotku'},
    'referencesOptionalText': {'ru': 'Необязательно, но очень поможет мастерам понять идею', 'en': 'Optional, but will help masters understand your idea', 'cs': 'Volitelné, ale pomůže mistrům pochopit váš nápad'},
    
    'howToAddressYou': {'ru': 'Как к тебе обращаться', 'en': 'How to address you', 'cs': 'Jak vás oslovovat'},
    'yourName': {'ru': 'Твое имя', 'en': 'Your name', 'cs': 'Vaše jméno'},
    'contactForCommunication': {'ru': 'Контакт для связи', 'en': 'Contact for communication', 'cs': 'Kontakt pro komunikaci'},
    'contactPlaceholder': {'ru': 'Удобнее в Telegram / Instagram / Телефон', 'en': 'Telegram / Instagram / Phone', 'cs': 'Telegram / Instagram / Telefon'},
    
    'masterPriority': {'ru': 'Приоритет в выборе мастера', 'en': 'Priority in choosing a master', 'cs': 'Priorita při výběru mistra'},
    'qualityPriority': {'ru': 'Качество важнее', 'en': 'Quality matters most', 'cs': 'Na kvalitě záleží nejvíce'},
    'cheaperPriority': {'ru': 'Дешевле', 'en': 'Cheaper', 'cs': 'Levnější'},
    'fasterPriority': {'ru': 'Быстрее', 'en': 'Faster', 'cs': 'Rychleji'},
    
    'backBtn': {'ru': 'Назад', 'en': 'Back', 'cs': 'Zpět'},
    'nextBtn': {'ru': 'Далее', 'en': 'Next', 'cs': 'Dále'},
    'publishLeadBtn': {'ru': 'Опубликовать заявку', 'en': 'Publish lead', 'cs': 'Zveřejnit poptávku'},
    
    'leadSentTitle': {'ru': 'Заявка отправлена!', 'en': 'Lead sent!', 'cs': 'Poptávka odeslána!'},
    'leadSentDesc': {'ru': 'Лучшие мастера твоего города скоро увидят твою идею и свяжутся с тобой, чтобы обсудить детали и предложить свои эскизы.', 'en': 'Top masters in your city will soon see your idea and contact you to discuss details and offer their designs.', 'cs': 'Nejlepší mistři ve vašem městě brzy uvidí váš nápad a budou vás kontaktovat, aby projednali detaily a nabídli své návrhy.'},
    'newLeadBtn': {'ru': 'Новая заявка', 'en': 'New lead', 'cs': 'Nová poptávka'},
    
    'styleLabel': {'ru': 'Стиль:', 'en': 'Style:', 'cs': 'Styl:'},
    'sizeLabel': {'ru': 'Размер:', 'en': 'Size:', 'cs': 'Velikost:'},
    'locationLabel': {'ru': 'Место:', 'en': 'Location:', 'cs': 'Místo:'},
    'referencesCount': {'ru': 'Референсов:', 'en': 'References:', 'cs': 'Reference:'},
}

langs = ['ru', 'en', 'cs']
for lang in langs:
    filepath = f'frontend/src/i18n/dictionaries/{lang}.json'
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for k, v in keys.items():
            if k not in data:
                data[k] = v[lang]
                
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

