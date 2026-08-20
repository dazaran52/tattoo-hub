import re

with open('frontend/src/components/ClientDashboard.tsx', 'r') as f:
    content = f.read()

start_replace = """async function fetchTopMasters() {
      try {
        const cached = localStorage.getItem('tattoo_top_masters_cache')
        if (cached) {
          try {
            setTopMasters(JSON.parse(cached))
            setIsLoadingMasters(false)
          } catch(e) {}
        } else {
          setIsLoadingMasters(true)
        }
        
        const response = await fetch"""

content = re.sub(
    r"async function fetchTopMasters\(\) {\n\s*try {\n\s*setIsLoadingMasters\(true\)\n\s*const response = await fetch",
    start_replace,
    content
)

end_replace = """if (response.ok) {
          const data = await response.json()
          localStorage.setItem('tattoo_top_masters_cache', JSON.stringify(data))
          setTopMasters(data)
        }"""

content = re.sub(
    r"if \(response\.ok\) {\n\s*const data = await response\.json\(\)\n\s*setTopMasters\(data\)\n\s*}",
    end_replace,
    content
)

with open('frontend/src/components/ClientDashboard.tsx', 'w') as f:
    f.write(content)
