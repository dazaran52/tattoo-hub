export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose dark:prose-invert prose-neutral">
        <h1>Refund Policy</h1>
        <p className="lead">Last updated: June 2026</p>
        
        <h2>1. Digital Goods and Services</h2>
        <p>
          The Tattoo HUB platform provides virtual credits, which are considered digital content not supplied on a tangible medium. 
          In accordance with the EU Consumer Rights Directive, <strong>you agree that by purchasing and having credits added to your account, you lose the right of withdrawal</strong> within 14 days without giving any reason, as the supply of digital content has begun with your explicit consent.
        </p>

        <h2>2. Conditions for Refunds</h2>
        <p>We do not provide refunds for purchased Credits, with the exception of the following cases:</p>
        <ul>
          <li><strong>Technical Error:</strong> Credits were deducted from your account multiple times due to a technical error on the platform's side.</li>
          <li><strong>Non-delivery of Credits:</strong> The payment was successful, but the Credits were not added to your account (after verification with the payment provider).</li>
        </ul>

        <h2>3. Resolving Tattoo Disputes</h2>
        <p>
          If there is a disagreement between a Client and a Master regarding the quality of the tattoo, deposit payments, or session cancellations, the Tattoo HUB platform does not intervene in these disputes and does not refund Credits that have already been consumed to establish a connection (reveal a contact).
        </p>

        <h2>4. How to Request a Refund</h2>
        <p>
          If you meet the conditions stated in point 2, send us a request at <strong>contact@tattoo-hub.xyz</strong>. 
          Be sure to include:
        </p>
        <ul>
          <li>Your login email.</li>
          <li>Date and time of the transaction.</li>
          <li>Proof of payment (e.g., bank statement or receipt from Stripe / payment gateway).</li>
        </ul>
        <p>We will process your request within 14 business days.</p>

        <hr className="my-8 border-neutral-200 dark:border-neutral-800" />
        
        <div className="text-sm text-neutral-500">
          <p><strong>Operator:</strong> Tattoo HUB</p>
          <p><strong>Registered Address:</strong> Na Lysine 772/12, Praha, 147 00</p>
          <p><strong>Email:</strong> contact@tattoo-hub.xyz</p>
        </div>

        <div className="mt-8">
          <a href="/" className="text-cyan-600 dark:text-cyan-400 hover:underline">← Back to home page</a>
        </div>
      </div>
    </div>
  )
}
