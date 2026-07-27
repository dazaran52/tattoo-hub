import re

with open('frontend/src/components/LeadForm.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the shared Navigation Buttons block
nav_block_regex = re.compile(r'\{\/\* Navigation Buttons \*\/\}.*?<\/div>\s*<\/form>', re.DOTALL)
content = nav_block_regex.sub('</form>', content)

# Find all 4 </motion.section> occurrences
sections = [m.start() for m in re.finditer(r'</motion.section>', content)]

if len(sections) != 4:
    print(f"Error: Found {len(sections)} sections, expected 4")
    exit(1)

# Fix the bug with budget CZK parenthesis
content = content.replace("if (!formData.budget || !formData.budget.includes('CZK') {", "if (!formData.budget || !formData.budget.includes('CZK')) {")

# We have to replace from the back to not mess up indices
step4_buttons = """
              <div className="flex gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 mt-8">
                <button 
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 py-4 px-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white font-bold rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all shadow-sm"
                >
                  Назад
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 px-6 bg-violet-600 hover:bg-violet-700 disabled:bg-neutral-300 disabled:dark:bg-neutral-800 text-white font-bold rounded-2xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:transform-none disabled:shadow-none flex items-center justify-center relative overflow-hidden group"
                >
                  {isSubmitting ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="relative z-10">{t('submitRequestBtn') || 'Оставить заявку'}</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                    </>
                  )}
                </button>
              </div>
            </motion.section>"""

step3_buttons = """
              <div className="flex gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 mt-8">
                <button 
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 py-4 px-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white font-bold rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all shadow-sm"
                >
                  Назад
                </button>
                <button 
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="flex-1 py-4 px-6 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  Далее
                </button>
              </div>
            </motion.section>"""

step2_buttons = """
              <div className="flex gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 mt-8">
                <button 
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 py-4 px-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white font-bold rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all shadow-sm"
                >
                  Назад
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (!formData.description || formData.description.length < 10) {
                      toast.error('Описание должно быть не менее 10 символов')
                      return
                    }
                    if (!selectedCountry || !formData.city) {
                      toast.error('Выберите страну и город')
                      return
                    }
                    setCurrentStep(3)
                  }}
                  className="flex-1 py-4 px-6 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  Далее
                </button>
              </div>
            </motion.section>"""

step1_buttons = """
              <div className="flex gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 mt-8">
                <button 
                  type="button"
                  onClick={() => {
                    if (!formData.name || !formData.contact) {
                      toast.error('Заполните обязательные поля')
                      return
                    }
                    setCurrentStep(2)
                  }}
                  className="flex-1 py-4 px-6 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  Далее
                </button>
              </div>
            </motion.section>"""

content = content[:sections[3]] + step4_buttons + content[sections[3]+17:]
content = content[:sections[2]] + step3_buttons + content[sections[2]+17:]
content = content[:sections[1]] + step2_buttons + content[sections[1]+17:]
content = content[:sections[0]] + step1_buttons + content[sections[0]+17:]

with open('frontend/src/components/LeadForm.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fix applied")
