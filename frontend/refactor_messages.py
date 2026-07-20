import re

path = "frontend/src/components/MessagesList.tsx"
with open(path, "r") as f:
    content = f.read()

# Add import
import_code = "import { ChatSessionsModal } from './ChatSessionsModal'"
if "ChatSessionsModal" not in content:
    content = content.replace("import { LeadAcceptWizardModal } from './LeadAcceptWizardModal'", 
                              "import { LeadAcceptWizardModal } from './LeadAcceptWizardModal'\n" + import_code)

# Add state
state_code = "const [showSessionsModal, setShowSessionsModal] = useState(false)"
if "showSessionsModal" not in content:
    content = content.replace("const [viewerImage, setViewerImage] = useState<string | null>(null)",
                              "const [viewerImage, setViewerImage] = useState<string | null>(null)\n  " + state_code)

# Update header buttons
old_header = '''              {userRole === 'master' && (
                <div className="hidden sm:flex shrink-0">
                  <span className="text-xs font-semibold px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-lg whitespace-nowrap">
                    {selectedChat.kanban_status === 'new' ? 'Посмотреть заявку' : 'Открыть CRM'}
                  </span>
                </div>
              )}'''

new_header = '''              <div className="hidden sm:flex shrink-0 cursor-pointer" onClick={() => setShowSessionsModal(true)}>
                <span className="text-xs font-semibold px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-lg whitespace-nowrap hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors">
                  Сеансы ({selectedChat.sessions_count || 1})
                </span>
              </div>'''

content = content.replace(old_header, new_header)

# Render modal
old_modal = '''      {viewerImage && (
        <ImageViewerModal
          imageUrl={viewerImage}
          onClose={() => setViewerImage(null)}
        />
      )}'''

new_modal = '''      {viewerImage && (
        <ImageViewerModal
          imageUrl={viewerImage}
          onClose={() => setViewerImage(null)}
        />
      )}
      
      {showSessionsModal && selectedChat && (
        <ChatSessionsModal
          chatId={selectedChat.id}
          clientInfo={selectedChat.client_info}
          userRole={userRole}
          onClose={() => setShowSessionsModal(false)}
          onUpdate={fetchChats}
        />
      )}'''

if "showSessionsModal &&" not in content:
    content = content.replace(old_modal, new_modal)

with open(path, "w") as f:
    f.write(content)
print("Updated MessagesList.tsx")
