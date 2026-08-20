import re

with open('frontend/src/app/[locale]/dashboard/page.tsx', 'r') as f:
    content = f.read()

start_replace = """const fetchProfile = async () => {
    try {
      const cachedProfile = localStorage.getItem('tattoo_hub_profile_cache')
      if (cachedProfile) {
        try {
          setProfile(JSON.parse(cachedProfile))
          setIsLoading(false)
        } catch(e) {}
      }
      
      // Get current session"""

content = re.sub(
    r"const fetchProfile = async \(\) => {\n\s*try {\n\s*// Get current session",
    start_replace,
    content
)

end_replace = """// Fallback to session metadata if backend doesn't return role
      if (!profileData.role && session.user.user_metadata?.role) {
        profileData.role = session.user.user_metadata.role
      }
      
      localStorage.setItem('tattoo_hub_profile_cache', JSON.stringify(profileData))
      setProfile(profileData)"""

content = re.sub(
    r"// Fallback to session metadata if backend doesn't return role\n\s*if \(\!profileData\.role && session\.user\.user_metadata\?\.role\) {\n\s*profileData\.role = session\.user\.user_metadata\.role\n\s*}\n\s*setProfile\(profileData\)",
    end_replace,
    content
)

with open('frontend/src/app/[locale]/dashboard/page.tsx', 'w') as f:
    f.write(content)
