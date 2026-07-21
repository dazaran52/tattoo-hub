import re

path = "frontend/src/components/ClientDashboard.tsx"
with open(path, "r") as f:
    content = f.read()

# 1. Fix activeTab state
if "const [activeTab, setActiveTab] = useState<'leads' | 'top_masters' | 'messages'>('leads')" not in content:
    content = content.replace(
        "const [activeTab, setActiveTab] = useState<'leads' | 'favorites' | 'top_masters' | 'messages'>('leads')",
        "const [activeTab, setActiveTab] = useState<'leads' | 'top_masters' | 'messages'>('leads')\n  const [masterTab, setMasterTab] = useState<'rating' | 'favorites'>('rating')\n  const [favoriteMasterIds, setFavoriteMasterIds] = useState<Set<string>>(new Set())"
    )
    
# 2. Add fetchFavorites function
old_fetch = '''    async function fetchUnread() {'''
new_fetch = '''    async function fetchFavorites() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/favorites`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setFavoriteMasterIds(new Set(data))
        }
      } catch (err) {
        console.error('Error fetching favorites:', err)
      }
    }
    
    async function fetchUnread() {'''
if old_fetch in content:
    content = content.replace(old_fetch, new_fetch)
    
# call fetchFavorites
content = content.replace("fetchTopMasters()\n    fetchUnread()", "fetchTopMasters()\n    fetchUnread()\n    fetchFavorites()")

# 3. Add toggleFavorite logic
old_logic = '''  const [isClientModalOpen, setIsClientModalOpen] = useState(false)'''
new_logic = '''  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  
  const toggleFavorite = async (masterId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const isFav = favoriteMasterIds.has(masterId)
      
      // Optimistic update
      setFavoriteMasterIds(prev => {
        const next = new Set(prev)
        if (isFav) next.delete(masterId)
        else next.add(masterId)
        return next
      })
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/favorites/${masterId}`, {
        method: isFav ? 'DELETE' : 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      
      if (!response.ok) {
        // Revert on error
        setFavoriteMasterIds(prev => {
          const next = new Set(prev)
          if (!isFav) next.delete(masterId)
          else next.add(masterId)
          return next
        })
      }
    } catch (err) {
      console.error('Error toggling favorite:', err)
    }
  }'''
if old_logic in content:
    content = content.replace(old_logic, new_logic)
    
# 4. Remove the favorite masters button from navigation
nav_btn = '''          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Heart className="w-4 h-4 inline-block mr-2" />
            {t('favoriteMasters')}
          </button>'''
content = content.replace(nav_btn, "")

# 5. Remove the old activeTab === 'favorites' block entirely
import re
content = re.sub(r"\) : activeTab === 'favorites' \? \([\s\S]*?\) : activeTab === 'messages' \? \(", ") : activeTab === 'messages' ? (", content)

# 6. Change top masters header to include the toggle
old_header = '''          <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mt-12 mb-6">Рейтинг мастеров</h3>'''
new_header = '''          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-12 mb-6 gap-4">
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">Мастера</h3>
            <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-fit">
              <button 
                onClick={() => setMasterTab('rating')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${masterTab === 'rating' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
              >
                Рейтинг мастеров
              </button>
              <button 
                onClick={() => setMasterTab('favorites')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${masterTab === 'favorites' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
              >
                <Heart className={`w-4 h-4 ${masterTab === 'favorites' ? 'fill-red-500 text-red-500' : ''}`} />
                Избранные
              </button>
            </div>
          </div>'''
content = content.replace(old_header, new_header)

# 7. Apply filtering and add heart button to master card
old_list = '''          ) : topMasters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topMasters.map(master => ('''

new_list = '''          ) : topMasters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topMasters.filter(m => masterTab === 'rating' || favoriteMasterIds.has(m.id)).map(master => ('''
content = content.replace(old_list, new_list)

old_card = '''                  <div className="p-6 pb-4 flex items-start gap-4">'''
new_card = '''                  <div className="p-6 pb-4 flex items-start gap-4 relative">
                    <button 
                      onClick={(e) => toggleFavorite(master.id, e)}
                      className="absolute top-4 right-4 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                      <Heart className={`w-5 h-5 transition-colors ${favoriteMasterIds.has(master.id) ? 'fill-red-500 text-red-500' : 'text-neutral-400'}`} />
                    </button>'''
content = content.replace(old_card, new_card)

with open(path, "w") as f:
    f.write(content)

print("Updated ClientDashboard")
