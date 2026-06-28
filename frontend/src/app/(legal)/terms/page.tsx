export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose dark:prose-invert prose-neutral">
        <h1>Terms of Service</h1>
        <p className="lead">Last updated: June 2026</p>
        
        <h2>1. Introduction</h2>
        <p>
          These Terms of Service (hereinafter referred to as the "Terms") govern the mutual rights and obligations between the operator of the Tattoo HUB platform (hereinafter referred to as the "Operator") and the users of this platform (hereinafter referred to as the "User"). 
          A User can be a Tattoo Master (hereinafter referred to as the "Master") or a Client seeking tattoo services.
        </p>

        <h2>2. Registration and User Account</h2>
        <p>
          Registration is required to use the full scope of services. The User is obliged to provide correct and truthful information. 
          The Operator bears no responsibility for damages caused by sharing access credentials with third parties.
        </p>

        <h2>3. Internal Currency (Credits) and Payments</h2>
        <p>
          The platform utilizes a system of virtual credits (hereinafter referred to as "Credits"). Credits do not serve as electronic money and cannot be exchanged back into real currency unless expressly stated otherwise in the refund rules.
          <ul>
            <li>By purchasing Credits, the User gains the right to use premium platform features (e.g., revealing contact details for leads).</li>
            <li>The Operator reserves the right to change the pricing of Credits at any time.</li>
          </ul>
        </p>

        <h2>4. Liability and Disclaimer of Warranties</h2>
        <p>
          The Operator provides the platform as a B2B/B2C intermediary service and <strong>bears no responsibility</strong> for:
        </p>
        <ul>
          <li>The quality of the work performed by the Master.</li>
          <li>Failure of the Client to pay for services rendered by the Master.</li>
          <li>Any health complications arising from the tattoo application.</li>
        </ul>
        <p>All contracts and agreements regarding the tattoo itself are formed exclusively between the Client and the Master.</p>

        <h2>5. Privacy Policy</h2>
        <p>
          The processing of personal data is governed by a separate document, the <a href="/privacy">Privacy Policy</a>, which complies with GDPR regulations.
        </p>

        <h2>6. Final Provisions</h2>
        <p>
          These Terms are governed by the laws of the Czech Republic. The Operator reserves the right to unilaterally change the Terms at any time.
        </p>

        <hr className="my-8 border-neutral-200 dark:border-neutral-800" />
        <div className="text-sm text-neutral-500">
          <p><strong>Operator:</strong> Tattoo HUB</p>
          <p><strong>Registered Address:</strong> Na Lysine 772/12, Praha, 147 00</p>
          <p><strong>Email:</strong> support@tattoo-hub.xyz</p>
        </div>
        
        <div className="mt-8">
          <a href="/" className="text-cyan-600 dark:text-cyan-400 hover:underline">← Back to home page</a>
        </div>
      </div>
    </div>
  )
}
