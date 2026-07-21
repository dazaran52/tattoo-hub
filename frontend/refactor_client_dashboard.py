import re

path = "frontend/src/components/ClientDashboard.tsx"
with open(path, "r") as f:
    content = f.read()

# 1. Add state for unreadMessages
if "const [unreadMessages, setUnreadMessages] = useState(0)" not in content:
    content = content.replace(
        "const [activeTab, setActiveTab] = useState<'leads' | 'favorites' | 'top_masters' | 'messages'>('leads')",
        "const [activeTab, setActiveTab] = useState<'leads' | 'favorites' | 'top_masters' | 'messages'>('leads')\n  const [unreadMessages, setUnreadMessages] = useState(0)"
    )

# 2. Add fetch logic inside useEffect
old_use_effect = '''    async function fetchTopMasters() {
      try {
        setIsLoadingMasters(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/public/masters`)
        if (response.ok) {
          const data = await response.json()
          setTopMasters(data)
        }
      } catch (err) {
        console.error('Error fetching top masters:', err)
      } finally {
        setIsLoadingMasters(false)
      }
    }

    fetchLeads()
    fetchTopMasters()
  }, [])'''

new_use_effect = '''    async function fetchTopMasters() {
      try {
        setIsLoadingMasters(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/public/masters`)
        if (response.ok) {
          const data = await response.json()
          setTopMasters(data)
        }
      } catch (err) {
        console.error('Error fetching top masters:', err)
      } finally {
        setIsLoadingMasters(false)
      }
    }
    
    async function fetchUnread() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/chat/unread-count`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setUnreadMessages(data.count)
        }
      } catch (err) {
        console.error('Error fetching unread:', err)
      }
    }

    fetchLeads()
    fetchTopMasters()
    fetchUnread()
    
    const channel = supabase.channel('client_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        fetchUnread()
      })
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])'''

if old_use_effect in content:
    content = content.replace(old_use_effect, new_use_effect)
    print("Updated ClientDashboard useEffect")
else:
    print("Could not find ClientDashboard useEffect")

# 3. Add badge to messages button
old_button = '''          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'messages'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <MessageCircle className="w-4 h-4 inline-block mr-2" />
            {t('messages') || 'Сообщения'}
          </button>'''

new_button = '''          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative flex items-center ${
              activeTab === 'messages'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <MessageCircle className="w-4 h-4 inline-block mr-2" />
            {t('messages') || 'Сообщения'}
            {unreadMessages > 0 && (
              <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </button>'''

if old_button in content:
    content = content.replace(old_button, new_button)
    print("Updated messages button in ClientDashboard")
else:
    print("Could not find messages button in ClientDashboard")

with open(path, "w") as f:
    f.write(content)
