import re

with open('frontend/src/components/LeadWizard.tsx', 'r') as f:
    content = f.read()

# We want to hide phone, telegram, instagram inputs if source === 'platform'
# Wait, it's easier to check if source === 'platform', we don't render them.
# The user wants to hide them ONLY for marketplace leads (which have source = 'platform')

# 1. Let's find where they are rendered.
# "LeadWizard.step3AccordionDesc"
accordion_desc_replace = """{source === 'platform' ? (
                          t('leadWizard.step3AccordionDescOnlyEmail') || t('leadWizard.step3AccordionDesc')
                        ) : (
                          t('leadWizard.step3AccordionDesc')
                        )}"""
content = re.sub(r"t\('leadWizard\.step3AccordionDesc'\)", accordion_desc_replace, content, count=1)

# 2. Hide phone input
# Find: <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
#                              {t('leadWizard.phoneLabel')}
# This is a bit tricky, let's just do a string replace for the inputs by wrapping them in `{source !== 'platform' && (...) }`

# Phone input block
content = content.replace(
    '''<div>
                          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                            {t('leadWizard.phoneLabel')}
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="+420 123 456 789"
                              className={`${baseInputClass} pl-12 text-base font-medium`}
                            />
                          </div>
                        </div>''',
    '''{source !== 'platform' && (
                        <div>
                          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                            {t('leadWizard.phoneLabel')}
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="+420 123 456 789"
                              className={`${baseInputClass} pl-12 text-base font-medium`}
                            />
                          </div>
                        </div>
                        )}'''
)

# Telegram and Instagram
content = content.replace(
    '''<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                            Telegram
                          </label>
                          <div className="relative">
                            <Send className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                            <input
                              type="text"
                              value={telegram}
                              onChange={(e) => setTelegram(e.target.value)}
                              placeholder="@username"
                              className={`${baseInputClass} pl-12 text-base font-medium`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                            Instagram
                          </label>
                          <div className="relative">
                            <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                            <input
                              type="text"
                              value={instagram}
                              onChange={(e) => setInstagram(e.target.value)}
                              placeholder="@username"
                              className={`${baseInputClass} pl-12 text-base font-medium`}
                            />
                          </div>
                        </div>
                      </div>''',
    '''{source !== 'platform' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                            Telegram
                          </label>
                          <div className="relative">
                            <Send className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                            <input
                              type="text"
                              value={telegram}
                              onChange={(e) => setTelegram(e.target.value)}
                              placeholder="@username"
                              className={`${baseInputClass} pl-12 text-base font-medium`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                            Instagram
                          </label>
                          <div className="relative">
                            <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                            <input
                              type="text"
                              value={instagram}
                              onChange={(e) => setInstagram(e.target.value)}
                              placeholder="@username"
                              className={`${baseInputClass} pl-12 text-base font-medium`}
                            />
                          </div>
                        </div>
                      </div>
                      )}'''
)

with open('frontend/src/components/LeadWizard.tsx', 'w') as f:
    f.write(content)

