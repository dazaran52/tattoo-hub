# Tattoo HUB 🎨 

Tattoo HUB is a specialized B2B2C SaaS platform designed to bridge the gap between tattoo artists (masters) and their clients. It acts as a full-cycle CRM and marketplace, automating lead generation, client communication, and portfolio management.

## 🚀 The Problem We Solve
Tattoo artists often struggle with managing bookings across multiple platforms (Instagram DMs, WhatsApp, etc.), leading to lost leads and double bookings. Tattoo HUB centralizes this workflow, providing a unified dashboard for lead processing, automated notifications, and a public-facing marketplace for clients to discover artists.

## 🏗 System Architecture
The platform is built with a modern, decoupled architecture focusing on performance, type safety, and real-time capabilities.

- **Frontend**: Next.js 14 (App Router) with React Server Components (RSC) for optimal SEO and Core Web Vitals (CWV). Styled with TailwindCSS and Framer Motion for micro-animations.
- **Backend**: FastAPI (Python 3.11) providing a robust, async REST API. Pydantic v2 is used for strict runtime type validation and OpenAPI schema generation.
- **Database & Auth**: Supabase (PostgreSQL) acts as our primary datastore and authentication provider. We utilize Row Level Security (RLS) policies to ensure data isolation between tenants (artists).
- **Payments**: Stripe integration for subscriptions (VIP/PRO statuses) and credit top-ups.

## ✨ Key Features
- **Smart Lead Generation**: A multi-step lead wizard that captures client ideas (styles, body placement, budget) and routes them to the appropriate artist or the public marketplace.
- **Real-time Bidding**: Artists can view marketplace leads and submit their proposals directly through the platform.
- **Tier-based Access Control**: Automated Stripe webhooks handle tier upgrades (Free, PRO, VIP), granting features like zero-delay lead access and premium badges.
- **Internationalization (i18n)**: Full support for multiple languages (ru, en, cs, uk) seamlessly integrated into the Next.js routing layer.

## 🛠 Local Development Setup

### Prerequisites
- Node.js 18.17+
- Python 3.11+
- Supabase CLI

### 1. Backend (FastAPI)
Navigate to the backend directory and set up the Python environment:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Copy the environment template and configure your Supabase/Stripe keys:
```bash
cp .env.example .env
```

Start the uvicorn development server:
```bash
# Runs on http://localhost:8000
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (Next.js)
In a new terminal, navigate to the frontend directory:

```bash
cd frontend
npm install
```

Set up your local environment variables:
```bash
cp .env.example .env.local
```

Start the development server:
```bash
# Runs on http://localhost:3000
npm run dev
```

## 📦 Environment Variables Reference

| Variable | Location | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | backend/.env | Your Supabase project URL |
| `SUPABASE_KEY` | backend/.env | Supabase Service Role Key (Keep secret!) |
| `STRIPE_SECRET_KEY` | backend/.env | Stripe secret key for backend API calls |
| `NEXT_PUBLIC_SUPABASE_URL` | frontend/.env.local | Public Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| frontend/.env.local | Public Supabase anonymous key |
| `NEXT_PUBLIC_API_URL` | frontend/.env.local | Backend URL (e.g. `http://localhost:8000`) |

## 🛡 Security & Compliance
- All sensitive operations (payments, user management) are handled exclusively on the backend via the Supabase Service Role key.
- Frontend uses the Anonymous Key and strictly relies on RLS policies and JWT validation.
- The repository uses `pre-commit` hooks and GitHub Actions to enforce code quality and type safety.

---
*Built with ❤️ for the global tattoo community.*
