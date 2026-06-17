import os
import glob

replacements = {
    "credits": "balance",
    "price_credits": "base_unlock_price_eur",
    "amount_credits": "amount",
    "withdrawable_credits": "withdrawable_balance",
    "withdrawableCredits": "withdrawableBalance"
}

for root, _, files in os.walk("src"):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts"):
            path = os.path.join(root, file)
            with open(path, "r") as f:
                content = f.read()
            
            new_content = content
            
            # Types
            new_content = new_content.replace("credits: number", "balance: number")
            new_content = new_content.replace("remaining_credits: number", "remaining_balance: number")
            new_content = new_content.replace("price_credits: number", "base_unlock_price_eur: number")
            new_content = new_content.replace("withdrawable_credits?: number", "withdrawable_balance?: number")
            new_content = new_content.replace("withdrawableCredits?: number", "withdrawableBalance?: number")
            new_content = new_content.replace("withdrawableCredits: number", "withdrawableBalance: number")
            
            # LeadsFeed
            new_content = new_content.replace("onUnlockSuccess: (newCredits: number)", "onUnlockSuccess: (newBalance: number)")
            new_content = new_content.replace("data.current_credits", "data.new_balance")
            new_content = new_content.replace("onUnlockSuccess(data.current_credits)", "onUnlockSuccess(data.new_balance)")
            
            # Header
            new_content = new_content.replace("profile.credits", "profile.balance")
            new_content = new_content.replace("withdrawableCredits={profile.withdrawable_credits}", "withdrawableBalance={profile.withdrawable_balance}")
            
            # AdminChat
            new_content = new_content.replace("user.credits", "user.balance")
            new_content = new_content.replace("setCreditsModalUser", "setBalanceModalUser")
            new_content = new_content.replace("creditsModalUser", "balanceModalUser")
            new_content = new_content.replace("newCreditsValue", "newBalanceValue")
            new_content = new_content.replace("setNewCreditsValue", "setNewBalanceValue")
            new_content = new_content.replace("usersMap[selectedUserId]?.credits", "usersMap[selectedUserId]?.balance")
            
            # AdminDisputes
            new_content = new_content.replace("dispute.leads?.price_credits", "dispute.leads?.base_unlock_price_eur")
            new_content = new_content.replace("selectedDispute.leads?.price_credits", "selectedDispute.leads?.base_unlock_price_eur")
            new_content = new_content.replace("кр.", "EUR")

            if content != new_content:
                with open(path, "w") as f:
                    f.write(new_content)
                print(f"Updated {path}")
