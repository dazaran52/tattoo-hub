import re

with open('frontend/src/app/[locale]/client/settings/page.tsx', 'r') as f:
    content = f.read()

# Add states
states = """
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [hapticsEnabled, setHapticsEnabled] = useState(true)
  const [soundsEnabled, setSoundsEnabled] = useState(true)
"""
content = re.sub(r'const \[emailNotifications, setEmailNotifications\] = useState\(true\)\n\s*const \[pushNotifications, setPushNotifications\] = useState\(false\)', states, content)

# Load settings
load_settings = """
      if (typeof window !== 'undefined') {
        const storedEmail = localStorage.getItem('tattoo_hub_email_notif')
        if (storedEmail !== null) setEmailNotifications(storedEmail === 'true')
        
        const storedPush = localStorage.getItem('tattoo_hub_push_notif')
        if (storedPush !== null) setPushNotifications(storedPush === 'true')
        
        const storedHaptics = localStorage.getItem('tattoo_hub_haptics_enabled')
        if (storedHaptics !== null) setHapticsEnabled(storedHaptics !== 'false')
        
        const storedSounds = localStorage.getItem('tattoo_hub_sounds_enabled')
        if (storedSounds !== null) setSoundsEnabled(storedSounds !== 'false')
      }
"""
content = re.sub(r'if \(typeof window !== \'undefined\'\) \{\n\s*const storedEmail = localStorage\.getItem\(\'tattoo_hub_email_notif\'\)\n\s*if \(storedEmail !== null\) setEmailNotifications\(storedEmail === \'true\'\)\n\s*const storedPush = localStorage\.getItem\(\'tattoo_hub_push_notif\'\)\n\s*if \(storedPush !== null\) setPushNotifications\(storedPush === \'true\'\)\n\s*\}', load_settings, content)


# Add UI toggles
ui_toggles = """
              <div className="flex items-center justify-between">
                <p className="text-neutral-700 dark:text-neutral-300 font-bold">{t('hapticFeedback') || 'Haptic Feedback'}</p>
                <Toggle 
                  checked={hapticsEnabled} 
                  onChange={() => {
                    const newVal = !hapticsEnabled
                    setHapticsEnabled(newVal)
                    localStorage.setItem('tattoo_hub_haptics_enabled', newVal.toString())
                  }} 
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-neutral-700 dark:text-neutral-300 font-bold">{t('soundEffects') || 'Sound Effects'}</p>
                <Toggle 
                  checked={soundsEnabled} 
                  onChange={() => {
                    const newVal = !soundsEnabled
                    setSoundsEnabled(newVal)
                    localStorage.setItem('tattoo_hub_sounds_enabled', newVal.toString())
                  }} 
                />
              </div>
            </div>
"""
content = re.sub(r'</div>\s*</div>\s*<div className="p-6">', ui_toggles + '\n          <div className="p-6">', content)

with open('frontend/src/app/[locale]/client/settings/page.tsx', 'w') as f:
    f.write(content)
