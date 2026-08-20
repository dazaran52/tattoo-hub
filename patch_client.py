import re

with open('frontend/src/components/ClientDashboard.tsx', 'r') as f:
    content = f.read()

start_replace = """async function fetchClientLeads() {
      try {
        const cached = localStorage.getItem('tattoo_client_leads_cache')
        if (cached) {
          try {
            setLeads(JSON.parse(cached))
            setIsLoadingLeads(false)
          } catch(e) {}
        }
        
        const { data: { session } } = await supabase.auth.getSession()"""

content = re.sub(
    r"async function fetchClientLeads\(\) {\n\s*try {\n\s*const { data: { session } } = await supabase\.auth\.getSession\(\)",
    start_replace,
    content
)

end_replace = """const data = await response.json()
        localStorage.setItem('tattoo_client_leads_cache', JSON.stringify(data))
        setLeads(data)"""

content = re.sub(
    r"const data = await response\.json\(\)\n\s*setLeads\(data\)",
    end_replace,
    content
)

with open('frontend/src/components/ClientDashboard.tsx', 'w') as f:
    f.write(content)
