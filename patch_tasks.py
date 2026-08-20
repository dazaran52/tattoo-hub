with open('/home/dazaran/.gemini/antigravity/brain/beeb14d9-2fa5-483e-be39-f6d9014098eb/task.md', 'r') as f:
    content = f.read()
content = content.replace('- [ ] Update `BackgroundGlow.tsx` with role-based colors.', '- [x] Update `BackgroundGlow.tsx` with role-based colors.')
content = content.replace('- [ ] Make animations faster and more fluid.', '- [x] Make animations faster and more fluid.')
content = content.replace('- [ ] Pass user role/tier to the layout wrapper.', '- [x] Pass user role/tier to the layout wrapper.')
content = content.replace('- [ ] Create `haptics.ts` utility.', '- [x] Create `haptics.ts` utility.')
content = content.replace('- [ ] Create `sounds.ts` utility (with subtle base64 or local audio files).', '- [x] Create `sounds.ts` utility (with subtle base64 or local audio files).')
content = content.replace('- [ ] Add settings toggles (Haptics, Sounds) to `ClientSettings` and `Settings` (Master).', '- [x] Add settings toggles (Haptics, Sounds) to `ClientSettings` and `Settings` (Master).')
content = content.replace('- [ ] Replace `navigator.vibrate` with `haptics.ts`.', '- [x] Replace `navigator.vibrate` with `haptics.ts`.')
with open('/home/dazaran/.gemini/antigravity/brain/beeb14d9-2fa5-483e-be39-f6d9014098eb/task.md', 'w') as f:
    f.write(content)
