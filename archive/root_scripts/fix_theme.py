import re
import os

replacements = {
    r'\bbg-neutral-950\b': 'bg-neutral-50 dark:bg-neutral-950',
    r'\bbg-neutral-900\b': 'bg-white dark:bg-neutral-900',
    r'\bbg-neutral-800\b': 'bg-neutral-100 dark:bg-neutral-800',
    r'\bbg-neutral-50\b': 'bg-neutral-900 dark:bg-neutral-50',
    r'\bborder-neutral-800\b': 'border-neutral-200 dark:border-neutral-800',
    r'\bborder-neutral-700\b': 'border-neutral-300 dark:border-neutral-700',
    r'\btext-neutral-50\b': 'text-neutral-900 dark:text-neutral-50',
    r'\btext-white\b': 'text-neutral-900 dark:text-white',
    r'\btext-neutral-300\b': 'text-neutral-700 dark:text-neutral-300',
    r'\btext-neutral-400\b': 'text-neutral-600 dark:text-neutral-400',
    r'\btext-neutral-500\b': 'text-neutral-500 dark:text-neutral-400',
}

# Special ones for gradients or hover
replacements[r'\bhover:bg-neutral-800\b'] = 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
replacements[r'\bhover:bg-neutral-700\b'] = 'hover:bg-neutral-300 dark:hover:bg-neutral-700'
replacements[r'\bhover:bg-neutral-200\b'] = 'hover:bg-neutral-800 dark:hover:bg-neutral-200'
replacements[r'\bfrom-neutral-700\b'] = 'from-neutral-300 dark:from-neutral-700'
replacements[r'\bto-neutral-600\b'] = 'to-neutral-400 dark:to-neutral-600'
replacements[r'\btext-neutral-950\b'] = 'text-white dark:text-neutral-950'

files_to_fix = [
    'frontend/src/app/profile/page.tsx',
    'frontend/src/components/LeadsFeed.tsx',
    'frontend/src/components/SkeletonCard.tsx',
    'frontend/src/app/error.tsx',
]

for filename in files_to_fix:
    if not os.path.exists(filename):
        continue
    with open(filename, 'r') as f:
        content = f.read()
    
    # Process replacements
    for pattern, replacement in replacements.items():
        # Avoid replacing already replaced ones
        if replacement in content:
            # Simplistic approach: if we already replaced some, don't break. 
            # Actually, regex with word boundaries works well.
            pass
        content = re.sub(pattern, replacement, content)
    
    with open(filename, 'w') as f:
        f.write(content)

print("Done")
