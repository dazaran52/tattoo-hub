export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose dark:prose-invert prose-neutral">
        <h1>Refund Policy (Pravidla pro vrácení peněz)</h1>
        <p className="lead">Last updated: June 2026</p>
        
        <h2>1. Digitální zboží a služby</h2>
        <p>
          Platforma Tattoo HUB poskytuje virtuální kredity, které se považují za digitální obsah nedodávaný na hmotném nosiči. 
          V souladu se směrnicí EU o právech spotřebitelů <strong>souhlasíte, že zakoupením a připsáním kreditů na váš účet ztrácíte právo na odstoupení od smlouvy</strong> do 14 dnů bez udání důvodu, jelikož dodávka digitálního obsahu začala s vaším výslovným souhlasem.
        </p>

        <h2>2. Podmínky pro vrácení peněz</h2>
        <p>Vrácení peněz za zakoupené Kredity neposkytujeme, s výjimkou následujících případů:</p>
        <ul>
          <li><strong>Technická chyba:</strong> Kredity byly z vašeho účtu strženy vícekrát kvůli technické chybě na straně platformy.</li>
          <li><strong>Nedodání kreditů:</strong> Platba proběhla úspěšně, ale Kredity se nepřipsaly na váš účet (po ověření u poskytovatele plateb).</li>
        </ul>

        <h2>3. Řešení sporů ohledně tetování</h2>
        <p>
          Pokud dojde k neshodě mezi Klientem a Masterem ohledně kvality tetování, platby záloh nebo zrušení sezení, platforma Tattoo HUB do těchto sporů nezasahuje a nevrací Kredity, které již byly spotřebovány na propojení (otevření kontaktu).
        </p>

        <h2>4. Jak požádat o refundaci</h2>
        <p>
          Pokud splňujete podmínky uvedené v bodě 2, zašlete nám žádost na e-mail <strong>support@tattoo-hub.cz</strong>. 
          Nezapomeňte uvést:
        </p>
        <ul>
          <li>Váš přihlašovací e-mail.</li>
          <li>Datum a čas transakce.</li>
          <li>Důkaz o platbě (např. výpis z účtu nebo účtenka od Stripe / platební brány).</li>
        </ul>
        <p>Váš požadavek vyřídíme do 14 pracovních dnů.</p>

        <hr className="my-8 border-neutral-200 dark:border-neutral-800" />
        
        <div className="mt-8">
          <a href="/" className="text-cyan-600 dark:text-cyan-400 hover:underline">← Zpět na hlavní stránku</a>
        </div>
      </div>
    </div>
  )
}
