# FXGuard - FX Risk Management Dashboard

[![Next.js](https://img.shields.io/badge/Next.js-14.1.0-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.1-38B2AC)](https://tailwindcss.com/)

Production-grade FX risk management dashboard for monitoring currency exposures, live exchange rates, and hedge recommendations.

![Dashboard Preview](https://via.placeholder.com/800x400?text=FXGuard+Dashboard)

## Features

- **Live FX Rates** - Real-time exchange rates with auto-refresh (30s intervals)
- **Exposure Tracking** - Monitor receivables and payables by currency
- **Hedge Recommendations** - AI-powered suggestions for forward contracts, options, and swaps
- **Smart Alerts** - Notifications for overdue exposures, upcoming due dates, and large positions
- **Dark Mode** - Automatic dark/light theme based on system preferences
- **Performance Optimized** - React.memo, useCallback, useMemo for zero unnecessary re-renders

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.1.0 | React framework with App Router |
| React | 18.2.0 | UI library |
| TypeScript | 5.3.3 | Type safety |
| Tailwind CSS | 3.4.1 | Utility-first styling |

## Project Structure

```
src/
├── app/
│   ├── api/                    # API Routes
│   │   ├── fx-rates/
│   │   │   └── route.ts        # GET /api/fx-rates
│   │   └── exposures/
│   │       └── route.ts        # GET /api/exposures
│   ├── dashboard/
│   │   └── page.tsx            # Main dashboard page
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home (redirects to dashboard)
│   └── globals.css             # Global styles
│
├── components/
│   ├── dashboard/              # Dashboard components
│   │   ├── DashboardHeader.tsx
│   │   ├── FXRatesPanel.tsx
│   │   ├── ExposuresPanel.tsx
│   │   ├── HedgeRecommendationsPanel.tsx
│   │   └── AlertsPanel.tsx
│   ├── ui/                     # Reusable UI components
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Card/
│   │   └── Loader/
│   ├── currency/               # Currency-specific components
│   │   ├── CurrencySelector/
│   │   ├── CurrencyBalanceCard/
│   │   └── FXRateDisplay/
│   └── layout/                 # Layout components
│       ├── Navbar/
│       └── Sidebar/
│
├── hooks/                      # Custom React hooks
│   ├── useFXRates.ts           # FX rates with auto-refresh
│   ├── useExposures.ts         # Currency exposures
│   ├── useHedgeRecommendations.ts  # Hedge suggestions
│   ├── useWallet.ts
│   └── useTransactions.ts
│
├── lib/
│   ├── api/                    # API service layer
│   │   ├── client.ts
│   │   ├── wallet.ts
│   │   ├── fx.ts
│   │   └── transactions.ts
│   ├── types/                  # TypeScript types
│   │   ├── currency.ts
│   │   ├── wallet.ts
│   │   └── transaction.ts
│   ├── utils/                  # Utility functions
│   │   ├── formatCurrency.ts
│   │   └── calculateConversion.ts
│   └── constants/
│       ├── currencyPairs.ts
│       └── config.ts
│
└── styles/
    └── globals.css
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/OlunladeMuiz/FXGuard.git
cd FXGuard

# Install dependencies
npm install
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

## API Documentation

### GET `/api/fx-rates`

Fetches live foreign exchange rates.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `base` | string | No | Base currency (default: `USD`) |
| `symbols` | string | Yes | Comma-separated currency codes |

**Request:**
```
GET /api/fx-rates?base=USD&symbols=EUR,GBP,JPY,CHF
```

**Response:**
```json
{
  "base": "USD",
  "timestamp": "2026-03-04T14:30:00.000Z",
  "rates": {
    "EUR": 0.9198,
    "GBP": 0.7902,
    "JPY": 149.4825,
    "CHF": 0.8796
  }
}
```

**Supported Currencies:** USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD, CNY, INR, MXN, BRL, SGD, HKD, KRW, SEK, NOK, DKK, PLN, ZAR

---

### GET `/api/exposures`

Fetches all currency exposures.

**Request:**
```
GET /api/exposures
```

**Response:**
```json
{
  "exposures": [
    {
      "id": "exp-001",
      "currency": "EUR",
      "amount": 500000,
      "type": "receivable",
      "dueDate": "2026-04-15",
      "counterparty": "Acme Corp EU",
      "description": "Q1 2026 Services Invoice"
    }
  ],
  "timestamp": "2026-03-04T14:30:00.000Z"
}
```

## Custom Hooks

### `useFXRates(options)`

Fetches FX rates with auto-refresh and race condition handling.

```typescript
const fxOptions = useMemo(() => ({
  base: "USD",
  symbols: ["EUR", "GBP", "JPY"],
  refreshMs: 30000,
}), []);

const { rates, loading, error, refetch } = useFXRates(fxOptions);
```

### `useExposures()`

Fetches currency exposures with automatic error handling.

```typescript
const { exposures, loading, error, refetch } = useExposures();
```

### `useHedgeRecommendations(exposures, rates)`

Generates hedge recommendations based on exposures and rates.

```typescript
const { recommendations, loading, error } = useHedgeRecommendations(exposures, rates);
```

## Performance Optimizations

### Preventing Infinite Re-renders

The `useFXRates` hook uses stable dependencies to prevent infinite loops:

```typescript
// ❌ Bad - array causes infinite re-renders
useEffect(() => { ... }, [symbols]);

// ✅ Good - stable string key
const symbolsKey = useMemo(() => [...symbols].sort().join(","), [symbols]);
useEffect(() => { ... }, [symbolsKey]);
```

### Memoization Strategy

| Optimization | Usage |
|--------------|-------|
| `useMemo` | FX options, sorted lists, derived data |
| `useCallback` | Event handlers, refetch functions |
| `React.memo` | All dashboard panel components |
| `useRef` | Mount tracking, fetch counting |

### Race Condition Handling

```typescript
const fetchCountRef = useRef(0);

const run = useCallback(async () => {
  const currentFetch = ++fetchCountRef.current;
  const data = await fetchData();
  
  // Ignore stale responses
  if (currentFetch !== fetchCountRef.current) return;
  
  setState(data);
}, []);
```

## Dashboard Components

| Component | Description |
|-----------|-------------|
| `DashboardHeader` | Top navigation with base currency selector and refresh button |
| `FXRatesPanel` | Live exchange rates display with currency flags |
| `ExposuresPanel` | Receivables/payables sorted by due date with urgency indicators |
| `HedgeRecommendationsPanel` | Prioritized hedge suggestions with cost estimates |
| `AlertsPanel` | Critical, warning, and info alerts for exposures |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Dashboard Page                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  DashboardHeader                        ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌──────────────────────┐  ┌──────────────────────────────┐│
│  │    FXRatesPanel      │  │       AlertsPanel            ││
│  │  ┌────────────────┐  │  │  ┌────────────────────────┐  ││
│  │  │ useFXRates()   │  │  │  │ generateAlerts()       │  ││
│  │  └────────────────┘  │  │  └────────────────────────┘  ││
│  └──────────────────────┘  └──────────────────────────────┘│
│  ┌──────────────────────┐  ┌──────────────────────────────┐│
│  │   ExposuresPanel     │  │ HedgeRecommendationsPanel    ││
│  │  ┌────────────────┐  │  │  ┌────────────────────────┐  ││
│  │  │ useExposures() │  │  │  │ useHedgeRecommendations││  ││
│  │  └────────────────┘  │  │  └────────────────────────┘  ││
│  └──────────────────────┘  └──────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Routes                               │
│  ┌─────────────────────┐  ┌─────────────────────────────┐   │
│  │  /api/fx-rates      │  │  /api/exposures             │   │
│  └─────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | External API base URL (optional) | Internal API routes |

## Roadmap

- [x] Live FX rates with auto-refresh
- [x] Exposure tracking (receivables/payables)
- [x] Hedge recommendations engine
- [x] Smart alerts system
- [x] Dark mode support
- [x] Performance optimizations
- [ ] Real FX rate API integration (Open Exchange Rates, Fixer.io)
- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] User authentication
- [ ] Historical rate charts
- [ ] Hedge execution functionality
- [ ] Email/SMS notifications
- [ ] Export reports (PDF/Excel)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ by [OlunladeMuiz](https://github.com/OlunladeMuiz)
