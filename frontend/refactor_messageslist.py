import re

path = "frontend/src/components/MessagesList.tsx"
with open(path, "r") as f:
    content = f.read()

old_card = '''                             <h4 className="font-bold text-neutral-900 dark:text-white mb-2">
                               {cardData.type === 'session_created' ? 'Сеанс назначен' : 'Системное уведомление'}
                             </h4>
                             {cardData.type === 'session_created' && (
                               <>
                                 <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                                   {new Date(cardData.date).toLocaleDateString('ru-RU')} в {cardData.time}
                                 </p>
                                 <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-xl py-2 px-4 text-sm font-medium text-neutral-900 dark:text-white border border-neutral-100 dark:border-white/5">
                                   Стоимость: {cardData.price} CZK
                                 </div>
                               </>
                             )}'''

new_card = '''                             <h4 className="font-bold text-neutral-900 dark:text-white mb-2">
                               {cardData.type === 'session_created' ? 'Сеанс назначен' : cardData.type === 'master_rejected' ? 'Отказ' : 'Системное уведомление'}
                             </h4>
                             {cardData.type === 'session_created' && (
                               <>
                                 <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                                   {new Date(cardData.date).toLocaleDateString('ru-RU')} в {cardData.time}
                                 </p>
                                 <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-xl py-2 px-4 text-sm font-medium text-neutral-900 dark:text-white border border-neutral-100 dark:border-white/5">
                                   Стоимость: {cardData.price} CZK
                                 </div>
                               </>
                             )}
                             {cardData.type === 'master_rejected' && (
                               <>
                                 <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 whitespace-pre-wrap">
                                   Мастер отклонил заявку.<br/><br/>
                                   <strong>Причина:</strong> {cardData.reason}
                                 </p>
                               </>
                             )}'''

if old_card in content:
    content = content.replace(old_card, new_card)
    print("Updated MessagesList system card")
else:
    print("Could not find MessagesList system card")

with open(path, "w") as f:
    f.write(content)
