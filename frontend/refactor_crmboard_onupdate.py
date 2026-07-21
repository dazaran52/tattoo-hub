import re

path = "frontend/src/components/CRMBoard.tsx"
with open(path, "r") as f:
    content = f.read()

old_details = '''      <LeadDetailsModal
        isOpen={!!sessionDetails}
        onClose={() => setSessionDetails(null)}
        session={sessionDetails}
        chatId={clientsForModal.find(c => c.id === sessionDetails?.master_clients?.id)?.chat_id}'''

new_details = '''      <LeadDetailsModal
        isOpen={!!sessionDetails}
        onClose={() => setSessionDetails(null)}
        session={sessionDetails}
        onUpdate={fetchData}
        chatId={clientsForModal.find(c => c.id === sessionDetails?.master_clients?.id)?.chat_id}'''

if old_details in content:
    content = content.replace(old_details, new_details)
    print("Updated LeadDetailsModal props in CRMBoard")
else:
    print("Could not find LeadDetailsModal props in CRMBoard")

with open(path, "w") as f:
    f.write(content)
