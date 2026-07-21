import re

path = "frontend/src/components/CRMBoard.tsx"
with open(path, "r") as f:
    content = f.read()

old_update = '''  const updateSessionStatus = async (sessionId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('master_sessions')
        .update({ status: newStatus })
        .eq('id', sessionId)
      if (error) throw error'''

new_update = '''  const updateSessionStatus = async (sessionId: string, newStatus: string, reason?: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      
      const res = await fetch(`${apiUrl}/api/crm/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, reject_reason: reason })
      })
      if (!res.ok) throw new Error('Failed to update session status')'''

if old_update in content:
    content = content.replace(old_update, new_update)
    print("Updated updateSessionStatus definition")
else:
    print("Could not find updateSessionStatus definition")

old_reject = '''        onReject={() => {
          if (sessionDetails) updateSessionStatus(sessionDetails.id, 'rejected')
        }}'''

new_reject = '''        onReject={(reason?: string) => {
          if (sessionDetails) updateSessionStatus(sessionDetails.id, 'cancelled', reason)
        }}'''

if old_reject in content:
    content = content.replace(old_reject, new_reject)
    print("Updated onReject call")
else:
    print("Could not find onReject call")

# Fix updateSessionStatus('rejected') -> 'cancelled' if 'rejected' is not used
# Actually, the user's columns use 'cancelled' for "Отмена".
# In handleDrop, we call updateSessionStatus(sessionId, colId) where colId is 'cancelled'.
# That's fine, it doesn't pass a reason there, but the drag-and-drop to cancelled won't have a reason. We can leave it as is or handle it later.

with open(path, "w") as f:
    f.write(content)
