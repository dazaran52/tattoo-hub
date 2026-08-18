import React from 'react';

export default function TermsCs() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose dark:prose-invert prose-neutral">
        <h1>Podmínky služby</h1>
        <p className="lead">Poslední aktualizace: červen 2026</p>
        
        <h2>1. Úvod</h2>
        <p>
          Tyto Podmínky služby (dále jen „Podmínky“) upravují vzájemná práva a povinnosti mezi provozovatelem platformy Tattoo HUB (dále jen „Provozovatel“) a uživateli této platformy (dále jen „Uživatel“). 
          Uživatelem může být Tattoo Master (dále jen „Mistr“) nebo Klient hledající tetovací služby.
        </p>

        <h2>2. Registrace a Uživatelský účet</h2>
        <p>
          Pro využití plného rozsahu služeb je nutná registrace. Uživatel je povinen uvádět správné a pravdivé údaje. 
          Provozovatel nenese žádnou odpovědnost za škody způsobené sdílením přístupových údajů třetím osobám.
        </p>

        <h2>3. Vnitřní měna (kredity) a platby</h2>
        <p>
          Platforma využívá systém virtuálních kreditů (dále jen „kredity“). Kredity neslouží jako elektronické peníze a nelze je směnit zpět za skutečnou měnu, pokud není v pravidlech pro vrácení peněz výslovně uvedeno jinak.
          <ul>
            <li>Zakoupením kreditů získává uživatel právo používat prémiové funkce platformy (např. odhalení kontaktních údajů pro potenciální zákazníky).</li>
            <li>Provozovatel si vyhrazuje právo kdykoliv změnit ceník Kreditů.</li>
          </ul>
        </p>

        <h2>4. Odpovědnost a vyloučení záruk</h2>
        <p>
          Provozovatel poskytuje platformu jako B2B/B2C zprostředkovatelskou službu a <strong>nenese žádnou odpovědnost</strong> pro:
        </p>
        <ul>
          <li>Kvalita práce odvedené Mistrem.</li>
          <li>Neplacení Klientem za služby poskytnuté Mistrem.</li>
          <li>Jakékoli zdravotní komplikace vyplývající z aplikace tetování.</li>
        </ul>
        <p>Veškeré smlouvy a dohody týkající se samotného tetování vznikají výhradně mezi Klientem a Mistrem.</p>

        <h2>5. Zásady ochrany osobních údajů</h2>
        <p>
          Zpracování osobních údajů se řídí samostatným dokumentem, tzv <a href="/privacy">Zásady ochrany osobních údajů</a>, která je v souladu s nařízením GDPR.
        </p>

        <h2>6. Závěrečná ustanovení</h2>
        <p>
          Tyto Podmínky se řídí právním řádem České republiky. Provozovatel si vyhrazuje právo Podmínky kdykoliv jednostranně změnit.
        </p>

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
