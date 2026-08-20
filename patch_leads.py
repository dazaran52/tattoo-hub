import re

with open('frontend/src/components/LeadsFeed.tsx', 'r') as f:
    content = f.read()

start_replace = """const fetchLeads = async (background = false, pageNum = 1) => {
    try {
      let endpoint = '';
      if (!background && pageNum === 1) {
        // Find endpoint before setting loading so we can check cache
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          endpoint = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads?offset=0&limit=20`
          if (isAdmin && !isMarketplace) {
            endpoint = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/leads?offset=0&limit=20`
          } else if (isMarketplace) {
            endpoint = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/marketplace${viewMode === 'my-shared' ? '/my-shared' : ''}?offset=0&limit=20`
          }
          
          const cached = localStorage.getItem(`leads_cache_${endpoint}`)
          if (cached) {
            try {
              const parsed = JSON.parse(cached)
              setLeads(parsed)
              setHasMore(parsed.length === 20)
              setIsLoading(false)
            } catch(e) {}
          } else {
            setIsLoading(true)
          }
        } else {
          setIsLoading(true)
        }
      }
      
      if (pageNum > 1) setIsLoadingMore(true)"""

content = re.sub(
    r"const fetchLeads = async \(background = false, pageNum = 1\) => {\n\s*try {\n\s*if \(\!background && pageNum === 1\) setIsLoading\(true\)\n\s*if \(pageNum > 1\) setIsLoadingMore\(true\)",
    start_replace,
    content
)

end_replace = """const data = await response.json()
      
      if (pageNum === 1) {
        localStorage.setItem(`leads_cache_${endpoint}`, JSON.stringify(data))
      }"""

content = re.sub(
    r"const data = await response\.json\(\)",
    end_replace,
    content
)

with open('frontend/src/components/LeadsFeed.tsx', 'w') as f:
    f.write(content)
