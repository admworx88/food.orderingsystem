# 🏨 OrderFlow — Hotel Restaurant Web Ordering System

A full-stack web ordering system for hotel restaurants, inspired by QSR kiosk experiences (McDonald's, Jollibee). Guests order from touch-screen kiosks, kitchen staff see orders in real-time, and cashiers handle payments — all from a single Next.js application.

---

## Architecture

| Module | Route Group | Purpose |
|--------|-------------|---------|
| **Kiosk** | `/(kiosk)` | Guest-facing touch ordering |
| **Kitchen** | `/(kitchen)` | Real-time Kitchen Display System (KDS) |
| **Cashier** | `/(cashier)` | Payment processing & POS |
| **Admin** | `/(admin)` | Menu management, analytics, settings |

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript, Turbopack)
- **Database**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Styling**: Tailwind CSS 4.1 + shadcn/ui
- **State**: Zustand (client state)
- **Payments**: PayMongo (GCash, Credit/Debit Card)
- **Validation**: Zod

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm (recommended) or npm
- Supabase account (free tier works for development)
- PayMongo account (for payment testing)

### 1. Clone & Install
```bash
git clone <repo-url>
cd hotel-restaurant-ordering
npm install
```

### 2. Environment Setup
```bash
cp .env.local.example .env.local
```

Fill in your Supabase and PayMongo credentials:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# PayMongo
PAYMONGO_SECRET_KEY=sk_test_...
PAYMONGO_PUBLIC_KEY=pk_test_...
PAYMONGO_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Database Setup
```bash
# Link to your Supabase project
npm supabase link --project-ref your-project-ref

# Run migrations
npm supabase db push

# Generate TypeScript types
npm supabase gen types typescript --linked > src/lib/supabase/types.ts
```

### 4. Run Development
```bash
npm dev
```

### 5. Access Points
| Interface | URL | Auth |
|-----------|-----|------|
| Kiosk | http://localhost:3000 | None (public) |
| Kitchen KDS | http://localhost:3000/orders | Staff PIN |
| Cashier POS | http://localhost:3000/payments | Staff login |
| Admin | http://localhost:3000/admin | Admin login |

---

## Project Structure

```
├── docs/                   # Documentation
│   ├── prd/PRD.md         # Product Requirements
│   ├── architecture/      # System architecture
│   └── agents/            # Agent guides per module
│       ├── AGENT-KIOSK.md
│       ├── AGENT-KITCHEN.md
│       ├── AGENT-CASHIER.md
│       ├── AGENT-ADMIN.md
│       ├── AGENT-DATABASE.md
│       └── AGENT-PAYMENTS.md
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (kiosk)/       # Guest ordering
│   │   ├── (kitchen)/     # Kitchen display
│   │   ├── (cashier)/     # Payment processing
│   │   ├── (admin)/       # Management dashboard
│   │   └── api/           # Webhooks
│   ├── components/        # UI components per module
│   ├── lib/               # Utilities, Supabase clients
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # Zustand stores
│   ├── types/             # TypeScript types
│   └── services/          # Server actions
├── supabase/              # Database migrations
└── public/                # Static assets
```

---

## Agent-Based Development

This project uses **agent documents** to define clear ownership of each module.
Each agent file in `docs/agents/` contains:

- **Mission**: What this module does and its success criteria
- **Owned files**: Exactly which files this agent creates and maintains
- **UI/UX specs**: Wireframes and interaction patterns
- **Data patterns**: Queries, mutations, and real-time subscriptions
- **Implementation notes**: Edge cases and gotchas

When working with AI assistants or delegating to team members, point them to
the relevant agent document for complete context on their scope.

---

## Development Commands

```bash
npm dev          # Start dev server
npm build        # Production build
npm lint         # Run ESLint
npm type-check   # TypeScript check
npm db:push      # Push migrations to Supabase
npm db:types     # Regenerate DB types
npm db:seed      # Run seed data
```

---

## License

Private — Hotel Restaurant Internal Use