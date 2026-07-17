import re

with open('frontend/src/app/book/[username]/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add state
state_injection = """  const [isNegotiable, setIsNegotiable] = useState(false)
  const [clientPriority, setClientPriority] = useState('quality')"""
content = content.replace("  const [isNegotiable, setIsNegotiable] = useState(false)", state_injection)

# Add to payload
payload_injection = """        budget: isNegotiable ? 'Договорная цена' : budgetVal ? `${budgetVal} Kč` : null,
        client_priority: clientPriority,"""
content = content.replace("        budget: isNegotiable ? 'Договорная цена' : budgetVal ? `${budgetVal} Kč` : null,", payload_injection)

# Add UI
ui_injection = """            <div>
              <label className="block text-sm font-semibold opacity-90 mb-3">
                Что для вас важнее всего?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {[
                  { id: 'fast', icon: '⚡', label: 'В кратчайшие сроки' },
                  { id: 'quality', icon: '💎', label: 'Максимальное качество' },
                  { id: 'cheap', icon: '💸', label: 'Уложиться в бюджет' }
                ].map(p => (
                  <button 
                    key={p.id}
                    type="button"
                    onClick={() => setClientPriority(p.id)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-2 ${
                      clientPriority === p.id 
                        ? 'border-cyan-500 bg-cyan-500/10' 
                        : 'border-transparent bg-neutral-500/10 hover:bg-neutral-500/20'
                    }`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <span className="font-bold text-sm opacity-90">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold opacity-90 mb-3">
                Бюджет на сеанс
              </label>"""
content = content.replace("""            <div>
              <label className="block text-sm font-semibold opacity-90 mb-3">
                Бюджет на сеанс
              </label>""", ui_injection)

with open('frontend/src/app/book/[username]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch complete")
