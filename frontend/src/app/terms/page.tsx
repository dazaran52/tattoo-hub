export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose dark:prose-invert prose-neutral">
        <h1>Terms of Service (Obchodní podmínky)</h1>
        <p className="lead">Last updated: June 2026</p>
        
        <h2>1. Úvodní ustanovení</h2>
        <p>
          Tyto obchodní podmínky (dále jen "Podmínky") upravují vzájemná práva a povinnosti mezi provozovatelem platformy Tattoo HUB (dále jen "Provozovatel") a uživateli této platformy (dále jen "Uživatel"). 
          Uživatelem může být Tattoo Master (dále jen "Master") nebo Klient hledající služby tetování.
        </p>

        <h2>2. Registrace a Uživatelský účet</h2>
        <p>
          Pro využívání plného rozsahu služeb je nutná registrace. Uživatel je povinen uvádět správné a pravdivé údaje. 
          Provozovatel nenese odpovědnost za škody způsobené sdílením přístupových údajů třetím osobám.
        </p>

        <h2>3. Vnitřní měna (Kredity) a Platby</h2>
        <p>
          Na platformě je využíván systém virtuálních kreditů (dále jen "Kredity"). Kredity neslouží jako elektronické peníze a nelze je směnit zpět na reálnou měnu, pokud není výslovně uvedeno jinak v pravidlech pro refundace.
          <ul>
            <li>Zakoupením Kreditů Uživatel získává právo využívat prémiové funkce platformy (např. otevírání kontaktů na leady).</li>
            <li>Provozovatel si vyhrazuje právo měnit ceník Kreditů.</li>
          </ul>
        </p>

        <h2>4. Odpovědnost a vyloučení záruk</h2>
        <p>
          Provozovatel poskytuje platformu jako zprostředkovatelskou službu B2B/B2C a <strong>nenese odpovědnost</strong> za:
        </p>
        <ul>
          <li>Kvalitu odvedené práce ze strany Mastera.</li>
          <li>Nezaplacení služeb ze strany Klienta Masterovi.</li>
          <li>Případné zdravotní komplikace vzniklé aplikací tetování.</li>
        </ul>
        <p>Všechny smlouvy a dohody o samotném tetování vznikají výhradně mezi Klientem a Masterem.</p>

        <h2>5. Ochrana osobních údajů</h2>
        <p>
          Zpracování osobních údajů se řídí samostatným dokumentem <a href="/privacy">Zásady ochrany osobních údajů (Privacy Policy)</a>, který je v souladu s nařízením GDPR.
        </p>

        <h2>6. Závěrečná ustanovení</h2>
        <p>
          Tyto podmínky se řídí právním řádem České republiky. Provozovatel si vyhrazuje právo Podmínky kdykoliv jednostranně změnit.
        </p>

        <hr className="my-8 border-neutral-200 dark:border-neutral-800" />
        <div className="text-sm text-neutral-500">
          <p><strong>Provozovatel:</strong> [ZDE DOPLNIT NÁZEV FIRMY NEBO JMÉNO OSVČ]</p>
          <p><strong>IČO:</strong> [ZDE DOPLNIT IČO]</p>
          <p><strong>Sídlo:</strong> [ZDE DOPLNIT ADRESU]</p>
          <p><strong>Email:</strong> support@tattoo-hub.cz</p>
        </div>
        
        <div className="mt-8">
          <a href="/" className="text-cyan-600 dark:text-cyan-400 hover:underline">← Zpět na hlavní stránku</a>
        </div>
      </div>
    </div>
  )
}
