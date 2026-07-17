import re

with open('frontend/src/app/book/[username]/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if "import { LeadForm } from '@/components/LeadForm'" not in content:
    content = content.replace("import { PostModal, PortfolioPost } from '@/components/PostModal'", "import { PostModal, PortfolioPost } from '@/components/PostModal'\nimport { LeadForm } from '@/components/LeadForm'")

# Remove form state
content = re.sub(r'// Form State.*?useEffect\(\(\) => \{', 'useEffect(() => {', content, flags=re.DOTALL)

# Remove fetchUnavailableDates and its useEffect call if we are removing it, but wait, 
# is sessionDate still needed? 
# LeadForm does not support sessionDate yet. It doesn't need to, LeadForm replaces it all.
content = re.sub(r'const fetchUnavailableDates = async \(\) => \{.*?\}\s+const fetchMasterProfile', 'const fetchMasterProfile', content, flags=re.DOTALL)
content = content.replace('fetchUnavailableDates()', '')

# Remove handleSubmit
content = re.sub(r'const handleSubmit = async \(e: React.FormEvent\) => \{.*?\}\s+if \(isLoading\) \{', 'if (isLoading) {', content, flags=re.DOTALL)

# Remove isSuccess block
content = re.sub(r'if \(isSuccess\) \{.*?\s+const theme = master', 'const theme = master', content, flags=re.DOTALL)

# Replace the form inside activeTab === 'booking'
form_regex = r'\{\s*activeTab === \'booking\' \? \(\s*<div className=\{`rounded-3xl p-8 transition-colors duration-500 \$\{tClasses\.card\}`\}>\s*<div className="mb-8">.*?</form>\s*</div>\s*\) : activeTab === \'portfolio\''
replacement = """{activeTab === 'booking' ? (
        <div className="mt-2">
          <LeadForm masterId={master.id} source={source === 'platform' ? 'platform' : 'personal'} />
        </div>
        ) : activeTab === 'portfolio'"""

content = re.sub(form_regex, replacement, content, flags=re.DOTALL)

with open('frontend/src/app/book/[username]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
