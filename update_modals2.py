import os
import re

dir_path = "/home/dazaran/Загрузки/OUT Tattoo WEB/frontend/src/components"

mappings = {
    "LowBalanceModal.tsx": "onClose",
    "DayOffModal.tsx": "onClose",
    "ManualClientModal.tsx": "onClose",
    "ChatModal.tsx": "onClose",
    "SessionModal.tsx": "onClose",
    "ClientDetailsModal.tsx": "onClose",
    "ConfirmModal.tsx": "onCancel",
    "AdminChat.tsx": "() => setSelectedChat(null)",
    "MasterLeadModal.tsx": "onClose",
    "ProposalModal.tsx": "onClose",
    "TransactionHistoryModal.tsx": "onClose",
    "AdminDisputes.tsx": "() => setSelectedDispute(null)",
    "DisputeModal.tsx": "onClose",
    "WithdrawalModal.tsx": "onClose",
    "CalendarView.tsx": "() => setIsEventModalOpen(false)",
    "ClientDashboard.tsx": "() => setSelectedSession(null)",
    "AuctionModal.tsx": "onClose",
    "LeadsFeed.tsx": {
        608: "() => setSelectedLead(null)", # Just guessing
        996: "() => setSelectedImage(null)"
    },
    "AddClientModal.tsx": "onClose",
    "CompleteSessionModal.tsx": "onClose",
    "LiabilityWaiverModal.tsx": "onClose"
}

def process_file(filename, close_action):
    filepath = os.path.join(dir_path, filename)
    if not os.path.exists(filepath): return
    
    with open(filepath, "r") as f:
        content = f.read()
        
    lines = content.split('\n')
    modified = False
    
    for i in range(len(lines)):
        if 'className="fixed inset-0' in lines[i] or "className='fixed inset-0" in lines[i]:
            if 'onClick' not in lines[i] and '<div' in lines[i]:
                action = close_action
                if isinstance(close_action, dict):
                    # Find closest line number
                    for ln, act in close_action.items():
                        if abs((i+1) - ln) < 50:
                            action = act
                            break
                    if isinstance(action, dict): continue # not found
                
                # Replace <div className="..." 
                # Add onClick={(e) => { if (e.target === e.currentTarget) ACTION() }}
                call_str = f"{action}()" if action in ["onClose", "onCancel"] else action.replace("() => ", "")
                insert_str = f' onClick={{(e) => {{ if (e.target === e.currentTarget) {call_str} }}}}'
                
                # Add it right before the closing >
                lines[i] = re.sub(r'(<div[^>]*className="[^"]*fixed inset-0[^"]*"[^>]*)>', r'\1' + insert_str + '>', lines[i])
                modified = True
                
    if modified:
        with open(filepath, "w") as f:
            f.write('\n'.join(lines))
        print(f"Modified {filename}")

for filename, action in mappings.items():
    process_file(filename, action)

