export const metadata = {
  title: 'Refund Policy | Tattoo HUB',
}

export default function RefundsPage() {
  return (
    <>
      <h1>Refund Policy</h1>
      <p>Last updated: June 2, 2026</p>

      <h2>1. Balance Top-up Refunds</h2>
      <p>Funds credited to the balance in the form of internal currency (credits/crystals) are non-refundable and cannot be exchanged for real money. Internal currency can only be used for services within the platform.</p>

      <h2>2. Credit Refunds for Low-Quality Leads (Disputes)</h2>
      <p>If you purchased a lead but it turned out to be of low quality (e.g., incorrect phone number, the client denies submitting a request), you have the right to open a "Dispute" within 48 hours of purchase.</p>
      
      <h3>Conditions for dispute approval:</h3>
      <ul>
        <li>Contact details are invalid.</li>
        <li>The client is located in another city and is looking for an artist there.</li>
        <li>The client is under 18 years of age and cannot receive the service.</li>
      </ul>

      <p>The administration reviews disputes within 1-3 business days. If approved, the credits will be returned to your balance.</p>

      <h2>3. Exceptions</h2>
      <p>Credits are not refunded if: the client simply read the message and did not respond, the client changed their mind about getting a tattoo after your response, or you could not agree on a price. In these cases, the service of providing the contact is considered rendered.</p>
    </>
  )
}
