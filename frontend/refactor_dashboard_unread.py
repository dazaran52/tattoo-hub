import re

path = "frontend/src/app/dashboard/page.tsx"
with open(path, "r") as f:
    content = f.read()

old_fetch = '''    const fetchUnreadCount = async () => {
      const { count } = await supabase.from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('sender_type', 'client')
      if (count !== null) setUnreadMessages(count)
    }'''

new_fetch = '''    const fetchUnreadCount = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`${apiUrl}/api/chat/unread-count`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        })
        if (res.ok) {
          const { count } = await res.json()
          setUnreadMessages(count)
        }
      } catch (e) {
        console.error('Failed to fetch unread count', e)
      }
    }'''

if old_fetch in content:
    content = content.replace(old_fetch, new_fetch)
    print("Updated fetchUnreadCount in dashboard/page.tsx")
else:
    print("Could not find fetchUnreadCount")

with open(path, "w") as f:
    f.write(content)
