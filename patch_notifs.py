import re

with open('frontend/src/components/NotificationsMenu.tsx', 'r') as f:
    content = f.read()

# Add imports
content = content.replace("import { toast } from 'react-hot-toast'", "import { toast } from 'react-hot-toast'\nimport { playSound } from '@/lib/sounds'\nimport { vibrate } from '@/lib/haptics'")

# Add haptics and sounds
trigger = """        (payload) => {
          if (activeTab === 'active') {
            setNotifications(prev => [payload.new as Notification, ...prev])
          }
          setUnreadCount(prev => prev + 1)
          playSound('notification')
          vibrate('success')
        }"""
content = re.sub(r"\(\s*payload\s*\)\s*=>\s*\{\s*if\s*\(activeTab === 'active'\)\s*\{\s*setNotifications\(prev => \[payload\.new as Notification, \.\.\.prev\]\)\s*\}\s*setUnreadCount\(prev => prev \+ 1\)\s*\}", trigger, content)

with open('frontend/src/components/NotificationsMenu.tsx', 'w') as f:
    f.write(content)
