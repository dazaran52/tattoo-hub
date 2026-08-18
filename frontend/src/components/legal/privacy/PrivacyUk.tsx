import React from 'react';

export default function PrivacyUk() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose dark:prose-invert prose-neutral">
        <h1>Політика конфіденційності</h1>
        <p className="lead">Останнє оновлення: червень 2026 р</p>
        
        <h2>1. Контролер даних</h2>
        <p>
          Контролер даних є оператором платформи Tattoo HUB. Ви можете зв'язатися з нами за адресою <strong>support@tattoo-hub.xyz</strong>.
        </p>

        <h2>2. Які дані ми збираємо?</h2>
        <p>Під час реєстрації та використання наших послуг ми обробляємо такі дані:</p>
        <ul>
          <li><strong>Ідентифікаційні дані:</strong> Ім'я, ім'я користувача.</li>
          <li><strong>Контактні дані:</strong> Адреса електронної пошти, номер телефону, Instagram, Telegram.</li>
          <li><strong>Технічні дані:</strong> IP-адреса, файли cookie, журнали сервера.</li>
        </ul>

        <h2>3. Мета обробки</h2>
        <p>Ми використовуємо ваші дані виключно для:</p>
        <ul>
          <li>Забезпечення роботи платформи та функціональності облікових записів користувачів.</li>
          <li>Полегшення спілкування між Клієнтами та Майстрами.</li>
          <li>Обробка платежів та виконання юридичних зобов'язань (облік).</li>
          <li>Покращення наших послуг (аналітика).</li>
        </ul>

        <h2>4. Хто має доступ до даних?</h2>
        <p>
          Ми надаємо ваші дані Майстру, з яким ви створюєте бронювання або ведете. 
          Ми також використовуємо сторонні процесори (наприклад, постачальників хмарних послуг, як-от Supabase, і платіжні шлюзи, як-от Stripe).
        </p>

        <h2>5. Ваші права (GDPR)</h2>
        <p>Ви маєте право:</p>
        <ul>
          <li>Доступ до ваших персональних даних.</li>
          <li>Виправте неточні дані.</li>
          <li>Видалити свої дані («право бути забутим»). Якщо ви хочете видалити свій обліковий запис і дані, зв’яжіться з нами електронною поштою.</li>
          <li>Обмежити обробку або перенесення даних.</li>
        </ul>

        <hr className="my-8 border-neutral-200 dark:border-neutral-800" />
        
        <div className="text-sm text-neutral-500">
          <p><strong>Оператор:</strong> ЦЕНТР татуювань</p>
          <p><strong>Юридична адреса:</strong> Na Lysine 772/12, Praha, 147 00</p>
          <p><strong>Електронна пошта:</strong> support@tattoo-hub.xyz</p>
        </div>

        <div className="mt-8">
          <a href="/" className="text-accent-600 dark:text-accent-400 hover:underline">← Повернутися на головну сторінку</a>
        </div>
      </div>
    </div>
  );
}
