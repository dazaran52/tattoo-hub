import re

with open("src/components/LeadsFeed.tsx", "r") as f:
    content = f.read()

# Replace Lead interface
content = content.replace("price_credits: number", "unlock_price_local?: number\n  master_currency?: string\n  base_unlock_price_eur?: number")

# Replace states
content = content.replace("lowBalanceRequiredCredits, setLowBalanceRequiredCredits] = useState(50)", "lowBalanceRequiredAmount, setLowBalanceRequiredAmount] = useState(0)\n  const [lowBalanceCurrency, setLowBalanceCurrency] = useState('CZK')")
content = content.replace("setLowBalanceRequiredCredits(lead.price_credits)", "setLowBalanceRequiredAmount(lead.unlock_price_local || 0)\n          setLowBalanceCurrency(lead.master_currency || 'CZK')")
content = content.replace("requiredCredits={lowBalanceRequiredCredits}", "requiredAmount={lowBalanceRequiredAmount}\n        currency={lowBalanceCurrency}")

# Replace admin form data
content = content.replace("price_credits: 50,", "base_unlock_price_eur: 5,")
content = content.replace("price_credits: lead.price_credits", "base_unlock_price_eur: lead.base_unlock_price_eur || 5")
content = content.replace("price_credits: 50", "base_unlock_price_eur: 5")

content = content.replace("value={formData.price_credits}", "value={formData.base_unlock_price_eur}")
content = content.replace("price_credits: parseInt(e.target.value) || 0", "base_unlock_price_eur: parseFloat(e.target.value) || 0")

# Replace UI renders
content = content.replace("💎 {lead.price_credits} {t('credits')}", "{lead.unlock_price_local} {lead.master_currency}")
content = content.replace("🔓 {t('unlock')} — 💎 {lead.price_credits}", "🔓 {t('unlock')} — {lead.unlock_price_local} {lead.master_currency}")

with open("src/components/LeadsFeed.tsx", "w") as f:
    f.write(content)
