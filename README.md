# Tattoo HUB - B2B SaaS

Автономный B2B Web-SaaS для тату-мастеров с системой лидогенерации.

## Архитектура

```
├── /frontend          # Next.js 14 (App Router, Tailwind CSS, TypeScript)
├── /backend           # FastAPI (Python 3.11+)
└── /migrations        # SQL миграции для Supabase
```

## Быстрый старт

### 1. Supabase настройка

1. Создайте проект в [Supabase](https://supabase.com)
2. Выполните SQL миграцию из `/backend/migrations/001_create_masters_table.sql`
3. Получите `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`

### 2. Бэкенд (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Создайте .env файл
cp .env.example .env
# Заполните переменные окружения

# Запуск
uvicorn main:app --reload
```

### 3. Фронтенд (Next.js)

```bash
cd frontend
npm install

# Создайте .env.local файл
cp .env.example .env.local
# Заполните переменные окружения

# Запуск
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/profile` | Получить профиль мастера (с авто-созданием) |

## Структура базы данных

### Таблица `masters`
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | PK, связь с auth.users |
| `email` | VARCHAR | Уникальный email |
| `credits` | INTEGER | Баланс кредитов (1 = 1 CZK) |
| `created_at` | TIMESTAMPTZ | Дата создания |

## Переменные окружения

### Бэкенд (.env)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
APP_HOST=0.0.0.0
APP_PORT=8000
```

### Фронтенд (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Функционал

- **Авторизация**: Email/пароль через Supabase Auth
- **Middleware**: Автоматический редирект неавторизованных пользователей на /login
- **Профиль**: Автоматическое создание записи в `masters` при первом входе
- **Баланс**: Система кредитов (отображается в хедере дашборда)

## Технологии

- **Frontend**: Next.js 14, Tailwind CSS, Lucide React, TypeScript
- **Backend**: FastAPI, Pydantic v2, python-jose
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (JWT)

