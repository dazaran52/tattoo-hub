import React from 'react';

export default function PrivacyCs() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose dark:prose-invert prose-neutral">
        <h1>Zásady ochrany osobních údajů</h1>
        <p className="lead">Poslední aktualizace: červen 2026</p>
        
        <h2>1. Správce údajů</h2>
        <p>
          Správcem údajů je provozovatel platformy Tattoo HUB. Můžete nás kontaktovat na <strong>podpora@tattoo-hub.xyz</strong>.
        </p>

        <h2>2. Jaká data shromažďujeme?</h2>
        <p>Při registraci a používání našich služeb zpracováváme následující údaje:</p>
        <ul>
          <li><strong>Identifikační údaje:</strong> Jméno, uživatelské jméno.</li>
          <li><strong>Kontaktní údaje:</strong> E-mailová adresa, telefonní číslo, Instagram, Telegram.</li>
          <li><strong>Technické údaje:</strong> IP adresa, soubory cookie, protokoly serveru.</li>
        </ul>

        <h2>3. Účel zpracování</h2>
        <p>Vaše údaje používáme výhradně pro:</p>
        <ul>
          <li>Zajištění provozu platformy a funkčnosti uživatelského účtu.</li>
          <li>Usnadnění komunikace mezi klienty a mistry.</li>
          <li>Zpracování plateb a plnění zákonných povinností (účetnictví).</li>
          <li>Zlepšení našich služeb (analytika).</li>
        </ul>

        <h2>4. Kdo má přístup k údajům?</h2>
        <p>
          Vaše údaje sdílíme s Masterem, se kterým vytvoříte rezervaci nebo potenciálního zákazníka. 
          Používáme také procesory třetích stran (např. poskytovatele cloudových služeb jako Supabase a platební brány jako Stripe).
        </p>

        <h2>5. Vaše práva (GDPR)</h2>
        <p>Máte právo:</p>
        <ul>
          <li>Přístup k vašim osobním údajům.</li>
          <li>Opravte nepřesné údaje.</li>
          <li>Vymažte svá data ("právo být zapomenut"). Pokud si přejete smazat svůj účet a data, kontaktujte nás prostřednictvím e-mailu.</li>
          <li>Omezit zpracování nebo přenositelnost dat.</li>
        </ul>

        <hr className="my-8 border-neutral-200 dark:border-neutral-800" />
        
        <div className="text-sm text-neutral-500">
          <p><strong>Operátor:</strong> Tetovací HUB</p>
          <p><strong>Registrovaná adresa:</strong> Na Lysine 772/12, Praha, 147 00</p>
          <p><strong>E-mail:</strong> podpora@tattoo-hub.xyz</p>
        </div>

        <div className="mt-8">
          <a href="/" className="text-accent-600 dark:text-accent-400 hover:underline">← Zpět na úvodní stránku</a>
        </div>
      </div>
    </div>
  );
}
