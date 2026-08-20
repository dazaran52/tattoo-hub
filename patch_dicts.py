import json
import os

dicts = {
    'ru': {
        'hiddenContact': 'Скрыто платформой',
        'antiFraudWarning': 'Внимание! Обмен прямыми контактами (номерами телефонов, соцсетями) строго запрещен правилами платформы и может привести к блокировке аккаунта. Вся переписка должна вестись в этом чате.',
        'leadWizard': {'step3AccordionDescOnlyEmail': 'Для связи мы будем использовать вашу почту.'}
    },
    'uk': {
        'hiddenContact': 'Приховано платформою',
        'antiFraudWarning': 'Увага! Обмін прямими контактами (номерами телефонів, соцмережами) суворо заборонено правилами платформи і може призвести до блокування акаунта. Усе листування має вестися в цьому чаті.',
        'leadWizard': {'step3AccordionDescOnlyEmail': 'Для зв\'язку ми будемо використовувати вашу пошту.'}
    },
    'en': {
        'hiddenContact': 'Hidden by Platform',
        'antiFraudWarning': 'Warning! Sharing direct contacts (phone numbers, social media) is strictly prohibited by platform rules and may result in account suspension. All communication must take place in this chat.',
        'leadWizard': {'step3AccordionDescOnlyEmail': 'We will use your email to contact you.'}
    },
    'cs': {
        'hiddenContact': 'Skryto platformou',
        'antiFraudWarning': 'Pozor! Sdílení přímých kontaktů (telefonní čísla, sociální sítě) je přísně zakázáno pravidly platformy a může vést k zablokování účtu. Veškerá komunikace musí probíhat v tomto chatu.',
        'leadWizard': {'step3AccordionDescOnlyEmail': 'Ke komunikaci použijeme váš e-mail.'}
    }
}

for lang, data in dicts.items():
    path = f'frontend/src/i18n/dictionaries/{lang}.json'
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
        
    d['hiddenContact'] = data['hiddenContact']
    d['antiFraudWarning'] = data['antiFraudWarning']
    
    if 'leadWizard' not in d:
        d['leadWizard'] = {}
    d['leadWizard']['step3AccordionDescOnlyEmail'] = data['leadWizard']['step3AccordionDescOnlyEmail']
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)

