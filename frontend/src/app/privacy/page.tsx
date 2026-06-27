export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose dark:prose-invert prose-neutral">
        <h1>Privacy Policy (Zásady ochrany osobních údajů)</h1>
        <p className="lead">Last updated: June 2026</p>
        
        <h2>1. Správce osobních údajů</h2>
        <p>
          Správcem osobních údajů je provozovatel platformy Tattoo HUB. Kontaktovat nás můžete na emailu <strong>support@tattoo-hub.cz</strong>.
        </p>

        <h2>2. Jaké údaje shromažďujeme?</h2>
        <p>Při registraci a používání našich služeb zpracováváme následující údaje:</p>
        <ul>
          <li><strong>Identifikační údaje:</strong> Jméno, uživatelské jméno.</li>
          <li><strong>Kontaktní údaje:</strong> E-mailová adresa, telefonní číslo, Instagram, Telegram.</li>
          <li><strong>Technické údaje:</strong> IP adresa, cookies, logy ze serveru.</li>
        </ul>

        <h2>3. Účel zpracování</h2>
        <p>Vaše data používáme výhradně pro:</p>
        <ul>
          <li>Zajištění chodu platformy a funkčnosti uživatelského účtu.</li>
          <li>Zprostředkování komunikace mezi Klienty a Mastery.</li>
          <li>Vyřizování plateb a plnění zákonných povinností (účetnictví).</li>
          <li>Zlepšování našich služeb (analytika).</li>
        </ul>

        <h2>4. Kdo má k údajům přístup?</h2>
        <p>
          Vaše údaje sdílíme s Masterem, u kterého si vytvoříte rezervaci nebo lead. 
          Dále využíváme zpracovatele třetích stran (např. poskytovatele cloudových služeb Supabase, platební brány).
        </p>

        <h2>5. Vaše práva (GDPR)</h2>
        <p>Máte právo na:</p>
        <ul>
          <li>Přístup ke svým osobním údajům.</li>
          <li>Opravu nepřesných údajů.</li>
          <li>Výmaz údajů ("právo být zapomenut"). Chcete-li svůj účet a data smazat, kontaktujte nás na e-mailu.</li>
          <li>Omezení zpracování nebo přenositelnost údajů.</li>
        </ul>

        <hr className="my-8 border-neutral-200 dark:border-neutral-800" />
        
        <div className="mt-8">
          <a href="/" className="text-cyan-600 dark:text-cyan-400 hover:underline">← Zpět na hlavní stránku</a>
        </div>
      </div>
    </div>
  )
}
