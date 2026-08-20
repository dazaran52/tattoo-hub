import re

with open('frontend/src/components/Header.tsx', 'r') as f:
    content = f.read()

# 1. Show language and theme in the header on all screens, but adjust layout
content = content.replace('className="hidden sm:flex items-center gap-2"', 'className="flex items-center gap-1 sm:gap-2"')

# 2. Remove language and theme from the mobile hamburger menu
mobile_menu_section = """                    {/* Mobile Only Quick Actions */}
                    <div className="sm:hidden">
                      <div className="px-4 py-2">
                        <LanguageSelector />
                      </div>
                      <button onClick={toggleTheme} className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 w-full text-left">
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        {t('theme')}
                      </button>
                      <div className="border-t border-neutral-200 dark:border-neutral-800 my-1"></div>
                    </div>"""
content = content.replace(mobile_menu_section, '')

with open('frontend/src/components/Header.tsx', 'w') as f:
    f.write(content)

