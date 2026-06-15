type Language = 'cs' | 'ru' | 'en';

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
  },
};

export function getTranslation(lang: Language, key: keyof Translations['cs']): string {
  return translations[lang][key] || translations['en'][key] || key;
}

export type { Language, Translations };
