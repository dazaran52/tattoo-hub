import React from 'react';

export default function RefundsCs() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose dark:prose-invert prose-neutral">
        <h1>Zásady vrácení peněz</h1>
        <p className="lead">Poslední aktualizace: červen 2026</p>
        
        <h2>1. Digitální zboží a služby</h2>
        <p>
          Platforma Tattoo HUB poskytuje virtuální kredity, které jsou považovány za digitální obsah nedodaný na hmotném médiu. 
          V souladu se směrnicí EU o právech spotřebitelů <strong>souhlasíte s tím, že nákupem a přidáním kreditů na váš účet ztrácíte právo na odstoupení od smlouvy</strong> do 14 dnů bez udání důvodu, protože poskytování digitálního obsahu začalo s vaším výslovným souhlasem.
        </p>

        <h2>2. Podmínky pro vrácení peněz</h2>
        <p>Nevracíme peníze za zakoupené kredity, s výjimkou následujících případů:</p>
        <ul>
          <li><strong>Technická chyba:</strong> Kredity byly z vašeho účtu několikrát odečteny kvůli technické chybě na straně platformy.</li>
          <li><strong>Nedoručení kreditů:</strong> Platba proběhla úspěšně, ale kredity nebyly přidány na váš účet (po ověření u poskytovatele platby).</li>
        </ul>

        <h2>3. Řešení sporů o tetování</h2>
        <p>
          Pokud mezi Klientem a Masterem dojde k neshodě ohledně kvality tetování, zálohových plateb nebo zrušení relace, platforma Tattoo HUB do těchto sporů nezasahuje a nevrací kredity, které již byly spotřebovány k navázání spojení (odhalení kontaktu).
        </p>

        <h2>4. Jak požádat o vrácení peněz</h2>
        <p>
          Pokud splňujete podmínky uvedené v bodě 2, zašlete nám poptávku na <strong>podpora@tattoo-hub.xyz</strong>. 
          Nezapomeňte uvést:
        </p>
        <ul>
          <li>Váš přihlašovací email.</li>
          <li>Datum a čas transakce.</li>
          <li>Doklad o platbě (např. výpis z účtu nebo účtenka ze Stripe / platební brány).</li>
        </ul>
        <p>Vaši žádost zpracujeme do 14 pracovních dnů.</p>

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
