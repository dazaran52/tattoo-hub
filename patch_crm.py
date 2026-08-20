import re

with open('frontend/src/components/CRMBoard.tsx', 'r') as f:
    content = f.read()

# Replace the start of fetchData
content = re.sub(
    r"const fetchData = async \(\) => {\n\s*try {\n\s*const apiUrl",
    """const fetchData = async () => {
    try {
      const cached = localStorage.getItem('crm_data_cache')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (parsed.sessions) setSessions(parsed.sessions)
          if (parsed.clients) setClientsForModal(parsed.clients)
          if (parsed.columns) setColumns(parsed.columns)
          setLoading(false)
        } catch (e) {}
      } else {
        setLoading(true)
      }
      const apiUrl""",
    content
)

end_replace = """setSessions([...sessionsData, ...leadSessions])

      let finalClients = []
      const clientsRes = await fetch(`${apiUrl}/api/crm/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (clientsRes.ok) {
        finalClients = await clientsRes.json()
        setClientsForModal(finalClients)
      }
      
      let finalColumns = null
      const profileRes = await fetch(`${apiUrl}/api/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        if (profileData.kanban_columns && profileData.kanban_columns.length > 0) {
          finalColumns = profileData.kanban_columns
          setColumns(finalColumns)
        }
      }
      
      localStorage.setItem('crm_data_cache', JSON.stringify({
        sessions: [...sessionsData, ...leadSessions],
        clients: finalClients,
        columns: finalColumns
      }))"""

content = re.sub(
    r"setSessions\(\[\.\.\.sessionsData, \.\.\.leadSessions\]\).*?setColumns\(profileData\.kanban_columns\)\n\s*}\n\s*}",
    end_replace,
    content,
    flags=re.DOTALL
)

with open('frontend/src/components/CRMBoard.tsx', 'w') as f:
    f.write(content)
