type Language = 'cs' | 'ru' | 'en' | 'uk';

type Translations = {
  [key in Language]: {
    // Common
    back: string;
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    loading: string;
    error: string;
    success: string;
    
    // Profile
    profileAndSettings: string;
    user: string;
    credits: string;
    editProfile: string;
    displayName: string;
    phone: string;
    bio: string;
    aboutMe: string;
    saveChanges: string;
    memberSince: string;
    unlocked: string;
    spent: string;
    
    // Settings
    settings: string;
    language: string;
    languageDescription: string;
    theme: string;
    themeDescription: string;
    dark: string;
    light: string;
    notifications: string;
    emailNotifications: string;
    newLeadAlerts: string;
    lowCreditAlerts: string;
    
    // Password
    changePassword: string;
    newPassword: string;
    confirmPassword: string;
    passwordSuccess: string;
    
    // Account
    dangerZone: string;
    deleteAccount: string;
    deleteWarning: string;
    typeToConfirm: string;
    
    // Navigation
    dashboard: string;
    logout: string;
    allLeads: string;
    myLeads: string;
    auctions: string;
    myCrm: string;
    messages: string;
    
    // Welcome
    welcome: string;
    availableLeads: string;
    howItWorks: string;
    analytics: string;
    enablePushNotifications: string;
    adminPanel: string;
    
    // Dashboard
    yourBalance: string;
    noLeads: string;
    noLeadsDescription: string;
    refresh: string;
    refreshError: string;
    lastRefresh: string;
    justNow: string;
    credit: string;
    credit_plural: string;
    
    // Leads
    leadDetails: string;
    unlock: string;
    processing: string;
    location: string;
    services: string;
    description: string;
    created: string;
    contacts: string;
    filterLeads: string;
    tryAgain: string;
    
    // Errors
    failedToUpdate: string;
    failedToLoad: string;
    passwordMismatch: string;
    // Admin & Dashboard States
    pendingReviewTitle: string;
    pendingReviewDesc: string;
    accessDeniedTitle: string;
    accessDeniedDesc: string;
    rejectedTitle: string;
    rejectedDesc: string;
    
    // Admin Leads Management
    usersManagement: string;
    leadsManagement: string;
    createLead: string;
    editLead: string;
    deleteLead: string;
    title: string;
    price: string;
    priceCredits: string;
    actions: string;
    leadCreated: string;
    leadUpdated: string;
    leadDeleted: string;
    confirmDeleteLead: string;
    noLeadsAdmin: string;
    
    // Auth
    loginTab: string;
    registerTab: string;
    verifyEmailTitle: string;
    verifyEmailDesc: string;
    forgotPassword: string;
    codeSent: string;
    nextBtn: string;
    confirmBtn: string;
    loginWithCode: string;
    loginWithPassword: string;
    loginMasterTitle: string;
    loginClientTitle: string;
    loginMasterDesc: string;
    loginClientDesc: string;
    email: string;
    passwordAuth: string;
    portfolioUrl: string;
    referralCode: string;
    country: string;
    city: string;
    selectCountry: string;
    selectCity: string;
    createAccount: string;
    signIn: string;
    termsAgreement: string;
    termsOfService: string;
    privacyPolicy: string;
    refundPolicy: string;
    exclusivePlatform: string;
    
    // Chat & Top-Up
    emailRegistered: string;
    emailError: string;
    chatStarted: string;
    emailConfirmRequired: string;
    supportService: string;
    enterEmailForAnswer: string;
    yourEmail: string;
    startChat: string;
    cardDetailsManual: string;
    autoCreditComment: string;
    toPay: string;
    typeMessage: string;
    noMessages: string;
    // Client Dashboard
    clientDashboardTitle: string;
    manageYourLeads: string;
    favoriteMasters: string;
    createNewLead: string;
    describeYourIdea: string;
    wantTattoo: string;
    loadingLeads: string;
    statusSearching: string;
    statusAccepted: string;
    statusCompleted: string;
    statusArchived: string;
    tattooStyle: string;
    tattooLead: string;
    noDescription: string;
    budgetUpTo: string;
    notSpecified: string;
    responsesCount: string;
    noFavorites: string;
    saveMastersDesc: string;
    // Dashboard general
    balanceUpdated: string;
    profileLoadError: string;
    profileLoadErrorDesc: string;
    cabinetLocked: string;
    cabinetLockedDesc: string;
    fillProfile: string;
    // New Lead
    fastLead: string;
    describeYourIdeaTitle: string;
    describeYourIdeaDesc: string;
    whatToTattoo: string;
    tattooDescPlaceholder: string;
    approxSize: string;
    priorityQuestion: string;
    referencesOptional: string;
    uploadPhotoSketch: string;
    continue: string;
    greatIdea: string;
    loginToPublish: string;
    register: string;
    alreadyHaveAccount: string;
    sizeMicro: string;
    sizeSmall: string;
    sizeMedium: string;
    sizeLarge: string;
    fastPriority: string;
    qualityPriority: string;
    cheapPriority: string;
  };
};

const translations: Translations = {
  cs: {
    back: 'Zpět',
    save: 'Uložit',
    cancel: 'Zrušit',
    edit: 'Upravit',
    delete: 'Smazat',
    loading: 'Načítání...',
    error: 'Chyba',
    success: 'Úspěch',
    
    profileAndSettings: 'Profil a nastavení',
    user: 'Uživatel',
    credits: 'Kreditů',
    editProfile: 'Upravit profil',
    displayName: 'Zobrazované jméno',
    phone: 'Telefon',
    bio: 'O mně',
    aboutMe: 'Informace o mně',
    saveChanges: 'Uložit změny',
    memberSince: 'Člen od',
    unlocked: 'Odemčeno',
    spent: 'Utraceno',
    
    settings: 'Nastavení',
    language: 'Jazyk',
    languageDescription: 'Vyberte preferovaný jazyk',
    theme: 'Vzhled',
    themeDescription: 'Světlý nebo tmavý režim',
    dark: 'Tmavý',
    light: 'Světlý',
    notifications: 'Notifikace',
    emailNotifications: 'Emailové notifikace',
    newLeadAlerts: 'Nové poptávky',
    lowCreditAlerts: 'Nízký zůstatek kreditů',
    
    changePassword: 'Změna hesla',
    newPassword: 'Nové heslo',
    confirmPassword: 'Potvrdit heslo',
    passwordSuccess: 'Heslo bylo změněno',
    
    dangerZone: 'Nebezpečná zóna',
    deleteAccount: 'Smazat účet',
    deleteWarning: 'Tato akce je nevratná',
    typeToConfirm: 'Napište SMAZAT pro potvrzení',
    
    dashboard: 'Dashboard',
    logout: 'Odhlásit se',
    allLeads: 'Všechny poptávky',
    myLeads: 'Moje poptávky',
    auctions: 'Aukce',
    myCrm: 'Moje CRM',
    messages: 'Zprávy',
    
    welcome: 'Vítejte',
    availableLeads: 'Dostupné poptávky k zakoupení',
    howItWorks: 'Jak to funguje?',
    analytics: 'Analytika',
    enablePushNotifications: 'Povolit Push notifikace',
    adminPanel: 'Admin Panel',
    
    yourBalance: 'Váš zůstatek',
    noLeads: 'Zatím nejsou k dispozici žádné poptávky',
    noLeadsDescription: 'Vraťte se později pro nové poptávky',
    refresh: 'Aktualizovat',
    refreshError: 'Chyba při načítání',
    lastRefresh: 'Poslední aktualizace',
    justNow: 'právě teď',
    credit: 'kredit',
    credit_plural: 'kreditů',
    
    leadDetails: 'Detaily poptávky',
    unlock: 'Odemknout',
    processing: 'Zpracování...',
    location: 'Lokalita',
    services: 'Služby',
    description: 'Popis',
    created: 'Vytvořeno',
    contacts: 'Kontakty',
    filterLeads: 'Filtrovat poptávky...',
    tryAgain: 'Zkusit znovu',
    
    failedToUpdate: 'Nepodařilo se aktualizovat profil',
    failedToLoad: 'Nepodařilo se načíst profil',
    passwordMismatch: 'Hesla se neshodují',
    
    pendingReviewTitle: 'Žádost se vyřizuje',
    pendingReviewDesc: 'Váš profil tatéra je v procesu ručního schvalování. Jakmile administrátor žádost schválí, získáte přístup k databázi poptávek.',
    accessDeniedTitle: 'Přístup odepřen',
    accessDeniedDesc: 'Vaše žádost byla administrátorem zamítnuta. Nemůžete prohlížet ani kupovat poptávky.',
    rejectedTitle: 'Profil zamítnut',
    rejectedDesc: 'Bohužel váš profil byl zamítnut administrátorem.',
    
    usersManagement: 'Uživatelé',
    leadsManagement: 'Poptávky',
    createLead: 'Vytvořit poptávku',
    editLead: 'Upravit poptávku',
    deleteLead: 'Smazat poptávku',
    title: 'Název',
    price: 'Cena',
    priceCredits: 'Cena (kredity)',
    actions: 'Akce',
    leadCreated: 'Poptávka byla úspěšně vytvořena',
    leadUpdated: 'Poptávka byla úspěšně upravenena',
    leadDeleted: 'Poptávka byla smazána',
    confirmDeleteLead: 'Opravdu chcete smazat tuto poptávku?',
    noLeadsAdmin: 'Nenalezeny žádné poptávky. Vytvořte novou.',
    
    // Auth
    loginTab: 'Přihlásit se',
    registerTab: 'Registrace',
    verifyEmailTitle: 'Potvrďte svůj email',
    verifyEmailDesc: 'Na váš email byl odeslán 6místný kód. Zadejte jej níže pro potvrzení.',
    forgotPassword: 'Zapomněli jste heslo?',
    codeSent: 'Odkaz byl odeslán na váš email.',
    nextBtn: 'Další',
    confirmBtn: 'Potvrdit',
    loginWithCode: 'Přihlásit se pomocí kódu (rychle)',
    loginWithPassword: 'Přihlásit se heslem',
    loginMasterTitle: 'Spravujte své podnikání.',
    loginClientTitle: 'Najděte ideálního mistra.',
    loginMasterDesc: 'Prémiová platforma pro tatéry. Získejte klienty, spravujte rezervace a rozšiřujte se.',
    loginClientDesc: 'Stovky ověřených profesionálů, snadné vyhledávání a bezpečná rezervace termínu.',
    email: 'Email',
    passwordAuth: 'Heslo',
    portfolioUrl: 'Odkaz na portfolio (Instagram, web atd.)',
    referralCode: 'Referenční kód (volitelné)',
    country: 'Vaše země',
    city: 'Vaše město',
    selectCountry: 'Vyberte zemi...',
    selectCity: 'Vyberte město...',
    createAccount: 'Vytvořit účet',
    signIn: 'Přihlásit se',
    termsAgreement: 'Přihlášením souhlasíte s exkluzivními podmínkami platformy',
    termsOfService: 'Podmínky použití',
    privacyPolicy: 'Ochrana osobních údajů',
    refundPolicy: 'Zásady vrácení peněz',
    exclusivePlatform: 'Exkluzivní platforma pro top mistry',
    
    // Chat & Top-Up
    emailRegistered: 'Tento email je již zaregistrován. Prosím, přihlaste se.',
    emailError: 'Chyba. Zkuste jiný email.',
    chatStarted: 'Chat zahájen! Nyní můžete psát.',
    emailConfirmRequired: 'Je vyžadováno potvrzení emailu. Registrujte se prosím v hlavním menu.',
    supportService: 'Podpora',
    enterEmailForAnswer: 'Zadejte svůj email, abychom vám mohli odpovědět:',
    yourEmail: 'Váš Email',
    startChat: 'Zahájit chat',
    cardDetailsManual: 'Bude nutné zadat údaje o kartě ručně.',
    autoCreditComment: 'Pro automatické připsání kreditů zkopírujte svůj Email níže a vložte jej do komentáře k platbě.',
    toPay: 'K úhradě',
    typeMessage: 'Napište zprávu...',
    noMessages: 'Zatím nemáte žádné zprávy. Napište nám, pokud potřebujete pomoc!',
    // Client Dashboard
    clientDashboardTitle: 'Klientský portál',
    manageYourLeads: 'Spravujte své poptávky na tetování',
    favoriteMasters: 'Oblíbení tatéři',
    createNewLead: 'Vytvořit novou poptávku',
    describeYourIdea: 'Popište svůj nápad a tatéři vám sami nabídnou návrhy a ceny.',
    wantTattoo: 'Chci tetování',
    loadingLeads: 'Načítání poptávek...',
    statusSearching: 'Hledá se tatér',
    statusAccepted: 'Zpracovává se',
    statusCompleted: 'Dokončeno',
    statusArchived: 'Archiv',
    tattooStyle: 'Tetování ve stylu',
    tattooLead: 'Poptávka na tetování',
    noDescription: 'Bez popisu',
    budgetUpTo: 'do',
    notSpecified: 'neuvedeno',
    responsesCount: 'odpovědí',
    noFavorites: 'Zatím žádní oblíbení tatéři',
    saveMastersDesc: 'Uložte si profily nejlepších tatérů, abyste je neztratili.',
    // Dashboard general
    balanceUpdated: 'Zůstatek aktualizován!',
    profileLoadError: 'Chyba při načítání profilu',
    profileLoadErrorDesc: 'Nepodařilo se načíst data vašeho profilu. Zkontrolujte prosím připojení k internetu a zkuste stránku obnovit.',
    cabinetLocked: 'Kabinet uzamčen',
    cabinetLockedDesc: 'Vytváříme prémiový produkt a dbáme na kvalitu. Přejděte prosím do nastavení profilu, nahrajte své portfolio a certifikáty, abyste získali status ověřeného tatéra a přístup k poptávkám.',
    fillProfile: 'Vyplnit profil',
    // New Lead
    fastLead: 'Rychlá poptávka',
    describeYourIdeaTitle: 'Popiš svůj nápad',
    describeYourIdeaDesc: 'Vyplň krátký formulář a nejlepší tatéři ti sami nabídnou své služby.',
    whatToTattoo: 'Co budeme tetovat?',
    tattooDescPlaceholder: 'Například: Chci černobílého draka omotaného kolem meče...',
    approxSize: 'Přibližná velikost',
    priorityQuestion: 'Co je pro tebe nejdůležitější?',
    referencesOptional: 'Reference (volitelné)',
    uploadPhotoSketch: 'Nahrát fotku nebo nákres',
    continue: 'Pokračovat',
    greatIdea: 'Skvělý nápad!',
    loginToPublish: 'Pro zveřejnění poptávky a získávání nabídek od tatérů se musíš přihlásit.',
    register: 'Zaregistrovat se',
    alreadyHaveAccount: 'Už mám účet',
    sizeMicro: 'Mikro (do 5 cm)',
    sizeSmall: 'Malá (5-10 cm)',
    sizeMedium: 'Střední (10-20 cm)',
    sizeLarge: 'Velká (nad 20 cm)',
    fastPriority: 'Co nejrychleji',
    qualityPriority: 'Maximální kvalita',
    cheapPriority: 'Vejít se do rozpočtu',
  },
  ru: {
    back: 'Назад',
    save: 'Сохранить',
    cancel: 'Отмена',
    edit: 'Редактировать',
    delete: 'Удалить',
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успех',
    
    profileAndSettings: 'Профиль и настройки',
    user: 'Пользователь',
    credits: 'Кредитов',
    editProfile: 'Редактировать профиль',
    displayName: 'Отображаемое имя',
    phone: 'Телефон',
    bio: 'О себе',
    aboutMe: 'Информация обо мне',
    saveChanges: 'Сохранить изменения',
    memberSince: 'Участник с',
    unlocked: 'Разблокировано',
    spent: 'Потрачено',
    
    settings: 'Настройки',
    language: 'Язык',
    languageDescription: 'Выберите предпочитаемый язык',
    theme: 'Тема',
    themeDescription: 'Светлая или темная тема',
    dark: 'Темная',
    light: 'Светлая',
    notifications: 'Уведомления',
    emailNotifications: 'Email уведомления',
    newLeadAlerts: 'Новые заявки',
    lowCreditAlerts: 'Мало кредитов',
    
    changePassword: 'Сменить пароль',
    newPassword: 'Новый пароль',
    confirmPassword: 'Подтвердить пароль',
    passwordSuccess: 'Пароль изменен',
    
    dangerZone: 'Опасная зона',
    deleteAccount: 'Удалить аккаунт',
    deleteWarning: 'Это действие нельзя отменить',
    typeToConfirm: 'Введите УДАЛИТЬ для подтверждения',
    
    dashboard: 'Главная',
    logout: 'Выйти',
    allLeads: 'Все лиды',
    myLeads: 'Мои лиды',
    auctions: 'Аукционы',
    myCrm: 'Моя CRM',
    messages: 'Сообщения',
    
    welcome: 'Добро пожаловать',
    availableLeads: 'Доступные тату-лиды для покупки',
    howItWorks: 'Как это работает?',
    analytics: 'Аналитика',
    enablePushNotifications: 'Включить Push-уведомления',
    adminPanel: 'Админ Панель',
    
    yourBalance: 'Ваш баланс',
    noLeads: 'Пока нет доступных заявок',
    noLeadsDescription: 'Возвращайтесь позже за новыми заявками',
    refresh: 'Обновить',
    refreshError: 'Ошибка при загрузке',
    lastRefresh: 'Последнее обновление',
    justNow: 'только что',
    credit: 'кредит',
    credit_plural: 'кредитов',
    
    leadDetails: 'Детали заявки',
    unlock: 'Разблокировать',
    processing: 'Обработка...',
    location: 'Локация',
    services: 'Услуги',
    description: 'Описание',
    created: 'Создано',
    contacts: 'Контакты',
    filterLeads: 'Фильтровать заявки...',
    tryAgain: 'Попробовать снова',
    
    failedToUpdate: 'Не удалось обновить профиль',
    failedToLoad: 'Не удалось загрузить профиль',
    passwordMismatch: 'Пароли не совпадают',
    
    pendingReviewTitle: 'Заявка на рассмотрении',
    pendingReviewDesc: 'Ваш профиль мастера находится на ручной модерации. Как только администратор одобрит заявку, вы получите доступ к базе лидов.',
    accessDeniedTitle: 'Доступ закрыт',
    accessDeniedDesc: 'Ваша заявка была отклонена администратором. Вы не можете просматривать или покупать заявки.',
    rejectedTitle: 'Профиль отклонён',
    rejectedDesc: 'К сожалению, ваш профиль был отклонён администратором. Доступ закрыт.',
    
    usersManagement: 'Пользователи',
    leadsManagement: 'Лиды',
    createLead: 'Создать лид',
    editLead: 'Редактировать лид',
    deleteLead: 'Удалить лид',
    title: 'Название',
    price: 'Цена',
    priceCredits: 'Цена (кредиты)',
    actions: 'Действия',
    leadCreated: 'Лид успешно создан',
    leadUpdated: 'Лид успешно обновлен',
    leadDeleted: 'Лид удален',
    confirmDeleteLead: 'Вы уверены, что хотите удалить этот лид?',
    noLeadsAdmin: 'Лиды не найдены. Создайте новый.',
    
    // Auth
    loginTab: 'Вход',
    registerTab: 'Регистрация',
    verifyEmailTitle: 'Подтвердите почту',
    verifyEmailDesc: 'Мы отправили 6-значный код на вашу почту. Введите его ниже.',
    forgotPassword: 'Забыли пароль?',
    codeSent: 'Ссылка отправлена на вашу почту.',
    nextBtn: 'Далее',
    confirmBtn: 'Подтвердить',
    loginWithCode: 'Войти по коду (быстро)',
    loginWithPassword: 'Войти по паролю',
    loginMasterTitle: 'Управляйте своим бизнесом.',
    loginClientTitle: 'Найдите идеального мастера.',
    loginMasterDesc: 'Premium платформа для тату-мастеров. Получайте клиентов, ведите запись и масштабируйтесь.',
    loginClientDesc: 'Сотни проверенных профессионалов, удобный поиск и безопасная запись на сеанс.',
    email: 'Email',
    passwordAuth: 'Пароль',
    portfolioUrl: 'Ссылка на портфолио (Instagram, сайт и т.д.)',
    referralCode: 'Реферальный код (если есть)',
    country: 'Ваша страна',
    city: 'Ваш город',
    selectCountry: 'Выберите страну...',
    selectCity: 'Выберите город...',
    createAccount: 'Создать аккаунт',
    signIn: 'Войти в систему',
    termsAgreement: 'Входя в систему, вы соглашаетесь с эксклюзивными условиями платформы',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    refundPolicy: 'Refund Policy',
    exclusivePlatform: 'Эксклюзивная платформа для топ-мастеров',
    
    // Chat & Top-Up
    emailRegistered: 'Этот email уже зарегистрирован. Пожалуйста, войдите в аккаунт.',
    emailError: 'Ошибка. Попробуйте другой email.',
    chatStarted: 'Чат начат! Теперь вы можете писать.',
    emailConfirmRequired: 'Требуется подтверждение email. Пожалуйста, зарегистрируйтесь через основное меню.',
    supportService: 'Служба поддержки',
    enterEmailForAnswer: 'Введите ваш Email, чтобы мы могли ответить вам:',
    yourEmail: 'Ваш Email',
    startChat: 'Начать чат',
    cardDetailsManual: 'Потребуется ввести реквизиты карты вручную.',
    autoCreditComment: 'Для автоматического зачисления кредитов, обязательно скопируйте ваш Email ниже и вставьте в комментарий к платежу.',
    toPay: 'К оплате',
    typeMessage: 'Написать сообщение...',
    noMessages: 'У вас пока нет сообщений. Напишите нам, если нужна помощь!',
    // Client Dashboard
    clientDashboardTitle: 'Кабинет клиента',
    manageYourLeads: 'Управляйте вашими заявками на татуировку',
    favoriteMasters: 'Избранные мастера',
    createNewLead: 'Создать новую заявку',
    describeYourIdea: 'Опишите вашу идею, и мастера сами предложат вам эскизы и цены.',
    wantTattoo: 'Хочу тату',
    loadingLeads: 'Загрузка заявок...',
    statusSearching: 'В поиске мастера',
    statusAccepted: 'В работе',
    statusCompleted: 'Завершена',
    statusArchived: 'Архив',
    tattooStyle: 'Тату в стиле',
    tattooLead: 'Заявка на татуировку',
    noDescription: 'Описание отсутствует',
    budgetUpTo: 'до',
    notSpecified: 'не указан',
    responsesCount: 'отклика',
    noFavorites: 'Пока нет избранных мастеров',
    saveMastersDesc: 'Сохраняйте профили лучших мастеров, чтобы не потерять.',
    // Dashboard general
    balanceUpdated: 'Баланс обновлен!',
    profileLoadError: 'Ошибка загрузки профиля',
    profileLoadErrorDesc: 'Не удалось загрузить данные вашего профиля. Пожалуйста, убедитесь, что соединение с интернетом активно, и попробуйте перезагрузить страницу.',
    cabinetLocked: 'Кабинет заблокирован',
    cabinetLockedDesc: 'Мы создаем премиальный продукт и заботимся о качестве. Пожалуйста, перейдите в настройки профиля, загрузите портфолио и сертификаты. После этого администратор проверит ваш профиль вручную и выдаст статус верифицированного мастера и доступ к горячим заявкам.',
    fillProfile: 'Заполнить профиль',
    // New Lead
    fastLead: 'Быстрая заявка',
    describeYourIdeaTitle: 'Опиши свою идею',
    describeYourIdeaDesc: 'Заполни короткую форму, и лучшие мастера сами предложат тебе свои услуги.',
    whatToTattoo: 'Что будем бить?',
    tattooDescPlaceholder: 'Например: Хочу черно-белого дракона, обвивающего меч...',
    approxSize: 'Примерный размер',
    priorityQuestion: 'Что для вас важнее всего?',
    referencesOptional: 'Референсы (по желанию)',
    uploadPhotoSketch: 'Загрузить фото или скетч',
    continue: 'Продолжить',
    greatIdea: 'Отличная идея!',
    loginToPublish: 'Чтобы опубликовать заявку и начать получать отклики от мастеров, необходимо войти в систему.',
    register: 'Зарегистрироваться',
    alreadyHaveAccount: 'Уже есть аккаунт',
    sizeMicro: 'Микро (до 5 см)',
    sizeSmall: 'Маленькая (5-10 см)',
    sizeMedium: 'Средняя (10-20 см)',
    sizeLarge: 'Большая (от 20 см)',
    fastPriority: 'В кратчайшие сроки',
    qualityPriority: 'Максимальное качество',
    cheapPriority: 'Уложиться в бюджет',
  },
  en: {
    back: 'Back',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    profileAndSettings: 'Profile & Settings',
    user: 'User',
    credits: 'Credits',
    editProfile: 'Edit Profile',
    displayName: 'Display Name',
    phone: 'Phone',
    bio: 'About Me',
    aboutMe: 'About Me',
    saveChanges: 'Save Changes',
    memberSince: 'Member since',
    unlocked: 'Unlocked',
    spent: 'Spent',
    
    settings: 'Settings',
    language: 'Language',
    languageDescription: 'Select your preferred language',
    theme: 'Appearance',
    themeDescription: 'Light or dark mode',
    dark: 'Dark',
    light: 'Light',
    notifications: 'Notifications',
    emailNotifications: 'Email Notifications',
    newLeadAlerts: 'New Lead Alerts',
    lowCreditAlerts: 'Low Credit Alerts',
    
    changePassword: 'Change Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    passwordSuccess: 'Password changed successfully',
    
    dangerZone: 'Danger Zone',
    deleteAccount: 'Delete Account',
    deleteWarning: 'This action cannot be undone',
    typeToConfirm: 'Type DELETE to confirm',
    
    dashboard: 'Dashboard',
    logout: 'Logout',
    allLeads: 'All Leads',
    myLeads: 'My Leads',
    auctions: 'Auctions',
    myCrm: 'My CRM',
    messages: 'Messages',
    
    welcome: 'Welcome',
    availableLeads: 'Available tattoo leads for purchase',
    howItWorks: 'How it works?',
    analytics: 'Analytics',
    enablePushNotifications: 'Enable Push Notifications',
    adminPanel: 'Admin Panel',
    
    yourBalance: 'Your Balance',
    noLeads: 'No leads available yet',
    noLeadsDescription: 'Come back later for new leads',
    refresh: 'Refresh',
    refreshError: 'Error loading',
    lastRefresh: 'Last refresh',
    justNow: 'just now',
    credit: 'credit',
    credit_plural: 'credits',
    
    leadDetails: 'Lead Details',
    unlock: 'Unlock',
    processing: 'Processing...',
    location: 'Location',
    services: 'Services',
    description: 'Description',
    created: 'Created',
    contacts: 'Contacts',
    filterLeads: 'Filter leads...',
    tryAgain: 'Try again',
    
    failedToUpdate: 'Failed to update profile',
    failedToLoad: 'Failed to load profile',
    passwordMismatch: 'Passwords do not match',
    
    pendingReviewTitle: 'Application Pending',
    pendingReviewDesc: 'Your artist profile is currently under manual review. Once approved by an administrator, you will gain access to the leads database.',
    accessDeniedTitle: 'Access Denied',
    accessDeniedDesc: 'Your application was rejected by the administrator. You cannot view or purchase leads.',
    rejectedTitle: 'Profile Rejected',
    rejectedDesc: 'Unfortunately, your profile was rejected by the administrator. Access denied.',
    
    usersManagement: 'Users',
    leadsManagement: 'Leads',
    createLead: 'Create Lead',
    editLead: 'Edit Lead',
    deleteLead: 'Delete Lead',
    title: 'Title',
    price: 'Price',
    priceCredits: 'Price (credits)',
    actions: 'Actions',
    leadCreated: 'Lead created successfully',
    leadUpdated: 'Lead updated successfully',
    leadDeleted: 'Lead deleted',
    confirmDeleteLead: 'Are you sure you want to delete this lead?',
    noLeadsAdmin: 'No leads found. Create a new one.',
    
    // Auth
    loginTab: 'Login',
    registerTab: 'Register',
    verifyEmailTitle: 'Confirm your email',
    verifyEmailDesc: 'We sent a 6-digit code to your email. Enter it below.',
    forgotPassword: 'Forgot password?',
    codeSent: 'Link sent to your email.',
    nextBtn: 'Next',
    confirmBtn: 'Confirm',
    loginWithCode: 'Login with code (fast)',
    loginWithPassword: 'Login with password',
    loginMasterTitle: 'Manage your business.',
    loginClientTitle: 'Find your perfect artist.',
    loginMasterDesc: 'Premium platform for tattoo artists. Get clients, manage bookings, and scale.',
    loginClientDesc: 'Hundreds of verified professionals, easy search and safe bookings.',
    email: 'Email',
    passwordAuth: 'Password',
    portfolioUrl: 'Portfolio URL (Instagram, website, etc.)',
    referralCode: 'Referral Code (optional)',
    country: 'Your Country',
    city: 'Your City',
    selectCountry: 'Select country...',
    selectCity: 'Select city...',
    createAccount: 'Create Account',
    signIn: 'Sign In',
    termsAgreement: 'By signing in, you agree to the exclusive terms of the platform',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    refundPolicy: 'Refund Policy',
    exclusivePlatform: 'Exclusive platform for top artists',
    
    // Chat & Top-Up
    emailRegistered: 'This email is already registered. Please sign in.',
    emailError: 'Error. Try a different email.',
    chatStarted: 'Chat started! You can now type your message.',
    emailConfirmRequired: 'Email confirmation required. Please register via the main menu.',
    supportService: 'Support Service',
    enterEmailForAnswer: 'Enter your email so we can reply:',
    yourEmail: 'Your Email',
    startChat: 'Start Chat',
    cardDetailsManual: 'You will need to enter your card details manually.',
    autoCreditComment: 'For automatic credit processing, please copy your Email below and paste it into the payment comment.',
    toPay: 'To Pay',
    typeMessage: 'Type a message...',
    noMessages: 'You have no messages yet. Write to us if you need help!',
    // Client Dashboard
    clientDashboardTitle: 'Client Dashboard',
    manageYourLeads: 'Manage your tattoo leads',
    favoriteMasters: 'Favorite Artists',
    createNewLead: 'Create a new lead',
    describeYourIdea: 'Describe your idea, and artists will offer you designs and prices.',
    wantTattoo: 'I want a tattoo',
    loadingLeads: 'Loading leads...',
    statusSearching: 'Looking for artist',
    statusAccepted: 'In progress',
    statusCompleted: 'Completed',
    statusArchived: 'Archived',
    tattooStyle: 'Tattoo style',
    tattooLead: 'Tattoo lead',
    noDescription: 'No description',
    budgetUpTo: 'up to',
    notSpecified: 'not specified',
    responsesCount: 'responses',
    noFavorites: 'No favorite artists yet',
    saveMastersDesc: 'Save the profiles of top artists so you don\'t lose them.',
    // Dashboard general
    balanceUpdated: 'Balance updated!',
    profileLoadError: 'Profile load error',
    profileLoadErrorDesc: 'Failed to load your profile data. Please make sure your internet connection is active and try refreshing the page.',
    cabinetLocked: 'Cabinet locked',
    cabinetLockedDesc: 'We build a premium product and care about quality. Please go to your profile settings, upload your portfolio and certificates to get verified artist status and access to hot leads.',
    fillProfile: 'Fill profile',
    // New Lead
    fastLead: 'Fast Lead',
    describeYourIdeaTitle: 'Describe your idea',
    describeYourIdeaDesc: 'Fill out a short form, and top artists will offer you their services.',
    whatToTattoo: 'What are we tattooing?',
    tattooDescPlaceholder: 'For example: I want a black and white dragon wrapped around a sword...',
    approxSize: 'Approximate size',
    priorityQuestion: 'What is most important to you?',
    referencesOptional: 'References (optional)',
    uploadPhotoSketch: 'Upload photo or sketch',
    continue: 'Continue',
    greatIdea: 'Great idea!',
    loginToPublish: 'To publish your request and start receiving offers from artists, you need to log in.',
    register: 'Register',
    alreadyHaveAccount: 'Already have an account',
    sizeMicro: 'Micro (up to 5 cm)',
    sizeSmall: 'Small (5-10 cm)',
    sizeMedium: 'Medium (10-20 cm)',
    sizeLarge: 'Large (20+ cm)',
    fastPriority: 'As fast as possible',
    qualityPriority: 'Maximum quality',
    cheapPriority: 'Fit within budget',
  },
  uk: {
    back: 'Назад',
    save: 'Зберегти',
    cancel: 'Скасувати',
    edit: 'Редагувати',
    delete: 'Видалити',
    loading: 'Завантаження...',
    error: 'Помилка',
    success: 'Успіх',
    
    profileAndSettings: 'Профіль та налаштування',
    user: 'Користувач',
    credits: 'Кредитів',
    editProfile: 'Редагувати профіль',
    displayName: 'Ім\'я для відображення',
    phone: 'Телефон',
    bio: 'Про себе',
    aboutMe: 'Інформація про мене',
    saveChanges: 'Зберегти зміни',
    memberSince: 'Учасник з',
    unlocked: 'Розблоковано',
    spent: 'Витрачено',
    
    settings: 'Налаштування',
    language: 'Мова',
    languageDescription: 'Оберіть бажану мову',
    theme: 'Тема',
    themeDescription: 'Світла або темна тема',
    dark: 'Темна',
    light: 'Світла',
    notifications: 'Сповіщення',
    emailNotifications: 'Email сповіщення',
    newLeadAlerts: 'Нові заявки',
    lowCreditAlerts: 'Мало кредитів',
    
    changePassword: 'Змінити пароль',
    newPassword: 'Новий пароль',
    confirmPassword: 'Підтвердити пароль',
    passwordSuccess: 'Пароль змінено',
    
    dangerZone: 'Небезпечна зона',
    deleteAccount: 'Видалити акаунт',
    deleteWarning: 'Цю дію неможливо скасувати',
    typeToConfirm: 'Введіть УДАЛИТЬ для підтвердження',
    
    dashboard: 'Головна',
    logout: 'Вийти',
    allLeads: 'Всі ліди',
    myLeads: 'Мої ліди',
    auctions: 'Аукціони',
    myCrm: 'Моя CRM',
    messages: 'Повідомлення',
    
    welcome: 'Ласкаво просимо',
    availableLeads: 'Доступні тату-ліди для покупки',
    howItWorks: 'Як це працює?',
    analytics: 'Аналітика',
    enablePushNotifications: 'Увімкнути Push-сповіщення',
    adminPanel: 'Адмін Панель',
    
    yourBalance: 'Ваш баланс',
    noLeads: 'Поки немає доступних заявок',
    noLeadsDescription: 'Повертайтесь пізніше за новими заявками',
    refresh: 'Оновити',
    refreshError: 'Помилка при завантаженні',
    lastRefresh: 'Останнє оновлення',
    justNow: 'щойно',
    credit: 'кредит',
    credit_plural: 'кредитів',
    
    leadDetails: 'Деталі заявки',
    unlock: 'Розблокувати',
    processing: 'Обробка...',
    location: 'Локація',
    services: 'Послуги',
    description: 'Опис',
    created: 'Створено',
    contacts: 'Контакти',
    filterLeads: 'Фільтрувати заявки...',
    tryAgain: 'Спробувати знову',
    
    failedToUpdate: 'Не вдалося оновити профіль',
    failedToLoad: 'Не вдалося завантажити профіль',
    passwordMismatch: 'Паролі не збігаються',
    
    pendingReviewTitle: 'Заявка на розгляді',
    pendingReviewDesc: 'Ваш профіль майстра знаходиться на ручній модерації. Як тільки адміністратор схвалить заявку, ви отримаєте доступ до бази лідів.',
    accessDeniedTitle: 'Доступ закрито',
    accessDeniedDesc: 'Ваша заявка була відхилена адміністратором. Ви не можете переглядати або купувати заявки.',
    rejectedTitle: 'Профіль відхилено',
    rejectedDesc: 'На жаль, ваш профіль був відхилений адміністратором. Доступ закрито.',
    
    usersManagement: 'Користувачі',
    leadsManagement: 'Ліди',
    createLead: 'Створити лід',
    editLead: 'Редагувати лід',
    deleteLead: 'Видалити лід',
    title: 'Назва',
    price: 'Ціна',
    priceCredits: 'Ціна (кредити)',
    actions: 'Дії',
    leadCreated: 'Лід успішно створено',
    leadUpdated: 'Лід успішно оновлено',
    leadDeleted: 'Лід видалено',
    confirmDeleteLead: 'Ви впевнені, що хочете видалити цей лід?',
    noLeadsAdmin: 'Ліди не знайдені. Створіть новий.',
    
    // Auth
    loginTab: 'Вхід',
    registerTab: 'Реєстрация',
    verifyEmailTitle: 'Підтвердіть пошту',
    verifyEmailDesc: 'Ми відправили 6-значний код на вашу пошту. Введіть його нижче.',
    forgotPassword: 'Забули пароль?',
    codeSent: 'Посилання відправлено на вашу пошту.',
    nextBtn: 'Далі',
    confirmBtn: 'Підтвердити',
    loginWithCode: 'Увійти за кодом (швидко)',
    loginWithPassword: 'Увійти за паролем',
    loginMasterTitle: 'Керуйте своїм бізнесом.',
    loginClientTitle: 'Знайдіть ідеального майстра.',
    loginMasterDesc: 'Premium платформа для тату-майстрів. Отримуйте клієнтів, ведіть запис і масштабуйтеся.',
    loginClientDesc: 'Сотні перевірених професіоналів, зручний пошук і безпечний запис на сеанс.',
    email: 'Email',
    passwordAuth: 'Пароль',
    portfolioUrl: 'Посилання на портфоліо (Instagram, сайт і т.д.)',
    referralCode: 'Реферальний код (якщо є)',
    country: 'Ваша країна',
    city: 'Ваше місто',
    selectCountry: 'Оберіть країну...',
    selectCity: 'Оберіть місто...',
    createAccount: 'Створити акаунт',
    signIn: 'Увійти в систему',
    termsAgreement: 'Входячи в систему, ви погоджуєтеся з ексклюзивними умовами платформи',
    termsOfService: 'Умови використання',
    privacyPolicy: 'Політика конфіденційності',
    refundPolicy: 'Політика повернення коштів',
    exclusivePlatform: 'Ексклюзивна платформа для топ-майстрів',
    
    // Chat & Top-Up
    emailRegistered: 'Цей email вже зареєстровано. Будь ласка, увійдіть в акаунт.',
    emailError: 'Помилка. Спробуйте інший email.',
    chatStarted: 'Чат розпочато! Тепер ви можете писати.',
    emailConfirmRequired: 'Потрібне підтвердження email. Будь ласка, зареєструйтесь через основне меню.',
    supportService: 'Служба підтримки',
    enterEmailForAnswer: 'Введіть ваш Email, щоб ми могли відповісти вам:',
    yourEmail: 'Ваш Email',
    startChat: 'Почати чат',
    cardDetailsManual: 'Потрібно ввести реквізити картки вручну.',
    autoCreditComment: 'Для автоматичного зарахування кредитів, обов\'язково скопіюйте ваш Email нижче і вставте в коментар до платежу.',
    toPay: 'До оплати',
    typeMessage: 'Написати повідомлення...',
    noMessages: 'У вас поки немає повідомлень. Напишіть нам, якщо потрібна допомога!',
    // Client Dashboard
    clientDashboardTitle: 'Кабінет клієнта',
    manageYourLeads: 'Керуйте вашими заявками на татуювання',
    favoriteMasters: 'Обрані майстри',
    createNewLead: 'Створити нову заявку',
    describeYourIdea: 'Опишіть вашу ідею, і майстри самі запропонують вам ескізи та ціни.',
    wantTattoo: 'Хочу тату',
    loadingLeads: 'Завантаження заявок...',
    statusSearching: 'У пошуку майстра',
    statusAccepted: 'В роботі',
    statusCompleted: 'Завершена',
    statusArchived: 'Архів',
    tattooStyle: 'Тату в стилі',
    tattooLead: 'Заявка на татуювання',
    noDescription: 'Опис відсутній',
    budgetUpTo: 'до',
    notSpecified: 'не вказано',
    responsesCount: 'відгуків',
    noFavorites: 'Поки немає обраних майстрів',
    saveMastersDesc: 'Зберігайте профілі кращих майстрів, щоб не загубити.',
    // Dashboard general
    balanceUpdated: 'Баланс оновлено!',
    profileLoadError: 'Помилка завантаження профілю',
    profileLoadErrorDesc: 'Не вдалося завантажити дані вашого профілю. Будь ласка, переконайтеся, що з\'єднання з інтернетом активне, і спробуйте перезавантажити сторінку.',
    cabinetLocked: 'Кабінет заблоковано',
    cabinetLockedDesc: 'Ми створюємо преміальний продукт і дбаємо про якість. Будь ласка, перейдіть в налаштування профілю, завантажте портфоліо та сертифікати, щоб отримати статус верифікованого майстра і доступ до гарячих заявок.',
    fillProfile: 'Заповнити профіль',
    // New Lead
    fastLead: 'Швидка заявка',
    describeYourIdeaTitle: 'Опиши свою ідею',
    describeYourIdeaDesc: 'Заповни коротку форму, і кращі майстри самі запропонують тобі свої послуги.',
    whatToTattoo: 'Що будемо бити?',
    tattooDescPlaceholder: 'Наприклад: Хочу чорно-білого дракона, що обвиває меч...',
    approxSize: 'Приблизний розмір',
    priorityQuestion: 'Що для вас найважливіше?',
    referencesOptional: 'Референси (за бажанням)',
    uploadPhotoSketch: 'Завантажити фото або скетч',
    continue: 'Продовжити',
    greatIdea: 'Відмінна ідея!',
    loginToPublish: 'Щоб опублікувати заявку і почати отримувати відгуки від майстрів, необхідно увійти в систему.',
    register: 'Зареєструватися',
    alreadyHaveAccount: 'Вже є акаунт',
    sizeMicro: 'Мікро (до 5 см)',
    sizeSmall: 'Маленька (5-10 см)',
    sizeMedium: 'Середня (10-20 см)',
    sizeLarge: 'Велика (від 20 см)',
    fastPriority: 'В найкоротші терміни',
    qualityPriority: 'Максимальна якість',
    cheapPriority: 'Вкластися в бюджет',
  },
};

export function getTranslation(lang: Language, key: keyof Translations['cs']): string {
  return translations[lang][key] || translations['en'][key] || key;
}

export type { Language, Translations };
