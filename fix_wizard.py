with open('frontend/src/components/LeadWizard.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if ") : (" in line and "{source === 'platform' ? (" in lines[i+1]:
        new_lines.append("                        ) : source === 'platform' ? (\n")
        new_lines.append("                          t('leadWizard.step3AccordionDescOnlyEmail') || t('leadWizard.step3AccordionDesc')\n")
        new_lines.append("                        ) : (\n")
        new_lines.append("                          t('leadWizard.step3AccordionDesc')\n")
        new_lines.append("                        )}\n")
        skip = True
        skip_count = 5
    elif skip and skip_count > 0:
        skip_count -= 1
    else:
        new_lines.append(line)

with open('frontend/src/components/LeadWizard.tsx', 'w') as f:
    f.writelines(new_lines)
