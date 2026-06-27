export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose dark:prose-invert prose-neutral">
        <h1>Privacy Policy</h1>
        <p className="lead">Last updated: June 2026</p>
        
        <h2>1. Data Controller</h2>
        <p>
          The data controller is the operator of the Tattoo HUB platform. You can contact us at <strong>support@tattoo-hub.cz</strong>.
        </p>

        <h2>2. What Data Do We Collect?</h2>
        <p>When registering and using our services, we process the following data:</p>
        <ul>
          <li><strong>Identification Data:</strong> Name, username.</li>
          <li><strong>Contact Data:</strong> Email address, phone number, Instagram, Telegram.</li>
          <li><strong>Technical Data:</strong> IP address, cookies, server logs.</li>
        </ul>

        <h2>3. Purpose of Processing</h2>
        <p>We use your data exclusively for:</p>
        <ul>
          <li>Ensuring the operation of the platform and user account functionality.</li>
          <li>Facilitating communication between Clients and Masters.</li>
          <li>Processing payments and fulfilling legal obligations (accounting).</li>
          <li>Improving our services (analytics).</li>
        </ul>

        <h2>4. Who Has Access to the Data?</h2>
        <p>
          We share your data with the Master with whom you create a booking or lead. 
          We also use third-party processors (e.g., cloud service providers like Supabase, payment gateways).
        </p>

        <h2>5. Your Rights (GDPR)</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data.</li>
          <li>Correct inaccurate data.</li>
          <li>Delete your data ("right to be forgotten"). If you wish to delete your account and data, contact us via email.</li>
          <li>Restrict processing or data portability.</li>
        </ul>

        <hr className="my-8 border-neutral-200 dark:border-neutral-800" />
        
        <div className="text-sm text-neutral-500">
          <p><strong>Operator:</strong> Tattoo HUB</p>
          <p><strong>Registered Address:</strong> Na Lysine 772/12, Praha, 147 00</p>
          <p><strong>Email:</strong> support@tattoo-hub.cz</p>
        </div>

        <div className="mt-8">
          <a href="/" className="text-cyan-600 dark:text-cyan-400 hover:underline">← Back to home page</a>
        </div>
      </div>
    </div>
  )
}
