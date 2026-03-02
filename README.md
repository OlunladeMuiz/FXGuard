# FXNexus - Multi-Currency Wallet Dashboard

Production-grade financial dashboard for a cross-border finance platform (multi-currency wallet system).

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: CSS Modules with global CSS variables
- **HTTP Client**: Axios (centralized)
- **Validation**: Zod schemas
- **Linting**: ESLint + Prettier

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (redirects to dashboard)
│   ├── dashboard/          # Dashboard page
│   │   ├── page.tsx
│   │   └── page.module.css
│   └── wallet/             # Wallet page
│       ├── page.tsx
│       └── page.module.css
│
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Card/
│   │   └── Loader/
│   ├── currency/           # Currency-specific components
│   │   ├── CurrencySelector/
│   │   ├── CurrencyBalanceCard/
│   │   └── FXRateDisplay/
│   └── layout/             # Layout components
│       ├── Navbar/
│       └── Sidebar/
│
├── lib/
│   ├── api/                # API service layer
│   │   ├── client.ts       # Centralized Axios instance
│   │   ├── wallet.ts       # Wallet API service
│   │   ├── fx.ts           # FX rates API service
│   │   └── transactions.ts # Transactions API service
│   ├── types/              # Domain types with Zod schemas
│   │   ├── currency.ts
│   │   ├── wallet.ts
│   │   └── transaction.ts
│   ├── utils/              # Utility functions
│   │   ├── formatCurrency.ts
│   │   └── calculateConversion.ts
│   └── constants/          # Application constants
│       ├── currencyPairs.ts
│       └── config.ts
│
├── hooks/                  # Custom React hooks
│   ├── useWallet.ts
│   ├── useFXRates.ts
│   └── useTransactions.ts
│
└── styles/
    └── globals.css         # Global styles with CSS variables
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd fxnexus-dashboard

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

### Development

```bash
# Start development server
npm run dev

# Type check
npm run type-check

# Lint code
npm run lint

# Format code
npm run format
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Architecture Principles

### Data Flow

```
UI Component
    ↓
Custom Hook (useWallet, useFXRates, useTransactions)
    ↓
API Service Layer (lib/api/*)
    ↓
Backend (FastAPI)
    ↓
Response Validation (Zod)
    ↓
Typed Return
    ↓
Component Render
```

### Non-Negotiable Rules

1. **Strict TypeScript**: No `any` types allowed
2. **Separation of Concerns**: No business logic in UI components
3. **Service Layer**: All API calls go through the service layer
4. **Type Safety**: All responses validated with Zod schemas
5. **Error Handling**: Loading and error states must be handled
6. **CSS Modules**: No inline styles, no global CSS leakage

### CSS Architecture

- CSS Modules for component-level styling
- Global CSS variables in `:root` (colors, spacing, typography)
- BEM-like naming convention

```css
.currencyCard {}
.currencyCard__balance {}
.currencyCard--highlight {}
```

### Component Design

Components must be:
- Pure and reusable
- Stateless when possible
- Strictly typed via props
- Free of API/business logic
- Styled only via CSS Modules

### Multi-Currency Support

Currency pairs are defined centrally in `lib/constants/currencyPairs.ts`. The frontend dynamically renders based on backend response - adding new pairs won't break the UI.

Supported currencies:
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- NGN (Nigerian Naira)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)
- JPY (Japanese Yen)
- INR (Indian Rupee)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000/api` |

## Future Scalability

The architecture supports expansion to:
- Escrow system
- Fraud risk scoring
- FX analytics
- Transaction history export
- Role-based access control
- Authentication integration

## License

Proprietary - All rights reserved
