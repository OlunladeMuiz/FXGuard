# Frontend Styling Index

## Purpose
Use this file to quickly locate the right styling entry point for any major route or shared component.

## How to read it

- `tsx`: markup and class usage
- `css`: module that owns the styling
- `structure hooks`: classes that identify the element itself
- `tone hooks`: classes that change visual state without owning layout

## Route Pages

### Landing
- `tsx`: `src/app/page.tsx`
- `css`: `src/app/page.module.css`
- structure hooks: `hero`, `featureCard`, `volatilityContent`, `faqSection`, `ctaSection`, `footerColumn`
- note: large marketing page with many section-level semantic classes

### Currency Settings
- `tsx`: `src/app/currency-settings/page.tsx`
- `css`: `src/app/currency-settings/page.module.css`
- structure hooks: `headerTitle`, `headerDescription`, `sectionTitle`, `verificationStatus`, `verificationRow`, `verificationError`, `verificationNote`, `currencyTileCode`, `currencyTileMeta`, `integrationTitle`, `integrationDescription`

### Dashboard
- `tsx`: `src/app/dashboard/page.tsx`
- `css`: `src/app/dashboard/page.module.css`
- structure hooks: `commandHeader`, `metricCell`, `terminalSlab`, `rateLane`, `primaryBrief`, `queueRow`, `healthRow`
- note: already mostly block-oriented and semantic

### FX Analytics
- `tsx`: `src/app/fx-analytics/page.tsx`
- `css`: `src/app/fx-analytics/page.module.css`
- structure hooks: `header`, `card`, `chartXAxis`, `alertContent`, `sidebarHeader`, `percentBadge`
- note: section classes are already the best entry points

### FX Deep Analysis
- `tsx`: `src/app/fx-analytics/deep/page.tsx`
- `css`: `src/app/fx-analytics/deep/page.module.css`
- structure hooks: `contextCardLabel`, `contextCardValue`, `contextCardValuePill`, `contextCardSpreadRiskValue`, `contextCardBrentValue`, `contextCardMomentumValue`, `contextCardVolatilityValue`, `metricRowOpportunityValue`
- tone hooks: `good`, `watch`, `risk`, `neutral`

### Invoice Generator
- `tsx`: `src/app/invoice-generator/page.tsx`
- `css`: `src/app/invoice-generator/page.module.css`
- structure hooks: `header`, `lineRow`, `previewHeader`, `previewInvoiceLabel`, `previewAddresses`, `previewDates`, `previewPayment`, `fxInfo`

### Invoice Review
- `tsx`: `src/app/invoice-generator/review/page.tsx`
- `css`: `src/app/invoice-generator/review/page.module.css`
- structure hooks: `header`, `cardHeader`, `metaGrid`, `summaryList`, `audit`, `previewRow`, `recommendationFactor`

### Login
- `tsx`: `src/app/login/page.tsx`
- `css`: `src/app/login/page.module.css`
- structure hooks: `cardTitle`, `formLabel`, `formInput`, `trustContent`, `trustTitle`, `trustDescription`, `badgeLabel`

### Settings
- `tsx`: `src/app/settings/page.tsx`
- `css`: `src/app/settings/page.module.css`
- structure hooks: `headerContent`, `headerTitle`, `headerDescription`, `overviewValue`, `overviewDescription`, `sidebarTitle`, `sidebarFooterDescription`, `sectionTitle`, `sectionDescription`, `securityTitle`, `securityDescription`, `identityHeroTitle`, `identityHeroDescription`, `identityFieldLabel`, `identityFieldValue`, `contextBannerTitle`, `feedTitle`, `feedMessage`, `integrationDescription`

### Signup
- `tsx`: `src/app/signup/page.tsx`
- `css`: `src/app/signup/page.module.css`
- structure hooks: `cardTitle`, `formLabel`, `formInput`, `trustContent`, `trustTitle`, `trustDescription`, `badgeLabel`

### Verify OTP
- `tsx`: `src/app/verify-otp/page.tsx`
- `css`: `src/app/verify-otp/page.module.css`
- structure hooks: `cardTitle`, `formLabel`, `formInput`, `formInputEmail`, `footerLink`

## Shared Layout

### Navbar
- `tsx`: `src/components/layout/Navbar/Navbar.tsx`
- `css`: `src/components/layout/Navbar/Navbar.module.css`
- structure hooks: `navbar`, `brand`, `navLinks`, `tabs`, `search`, `user`, `hamburgerBtn`, `dropdownMenu`
- note: already mostly semantic; prefer these direct classes before descendant selectors

### Sidebar
- `tsx`: `src/components/layout/Sidebar/Sidebar.tsx`
- `css`: `src/components/layout/Sidebar/Sidebar.module.css`
- structure hooks: component-level semantic classes inside the module

## FX Components

### Recommendation Panel
- `tsx`: `src/components/fx/RecommendationPanel/RecommendationPanel.tsx`
- `css`: `src/components/fx/RecommendationPanel/RecommendationPanel.module.css`
- structure hooks: recommendation and empty/error state classes in the module

### Risk Score Badge
- `tsx`: `src/components/fx/RiskScoreBadge/RiskScoreBadge.tsx`
- `css`: `src/components/fx/RiskScoreBadge/RiskScoreBadge.module.css`

### Best Rate Comparison
- `tsx`: `src/components/fx/BestRateComparison/BestRateComparison.tsx`
- `css`: `src/components/fx/BestRateComparison/BestRateComparison.module.css`

### Savings Estimator
- `tsx`: `src/components/fx/SavingsEstimator/SavingsEstimator.tsx`
- `css`: `src/components/fx/SavingsEstimator/SavingsEstimator.module.css`

### FX Volatility Meter
- `tsx`: `src/components/fx/FXVolatilityMeter/FXVolatilityMeter.tsx`
- `css`: `src/components/fx/FXVolatilityMeter/FXVolatilityMeter.module.css`

## Invoice Components

### Invoice Form
- `tsx`: `src/components/invoices/InvoiceForm/InvoiceForm.tsx`
- `css`: `src/components/invoices/InvoiceForm/InvoiceForm.module.css`

### Invoice Table
- `tsx`: `src/components/invoices/InvoiceTable/InvoiceTable.tsx`
- `css`: `src/components/invoices/InvoiceTable/InvoiceTable.module.css`

## Currency Components

### Currency Balance Card
- `tsx`: `src/components/currency/CurrencyBalanceCard/CurrencyBalanceCard.tsx`
- `css`: `src/components/currency/CurrencyBalanceCard/CurrencyBalanceCard.module.css`

### Currency Selector
- `tsx`: `src/components/currency/CurrencySelector/CurrencySelector.tsx`
- `css`: `src/components/currency/CurrencySelector/CurrencySelector.module.css`

### FX Rate Display
- `tsx`: `src/components/currency/FXRateDisplay/FXRateDisplay.tsx`
- `css`: `src/components/currency/FXRateDisplay/FXRateDisplay.module.css`

## UI Components

### Button
- `tsx`: `src/components/ui/Button/Button.tsx`
- `css`: `src/components/ui/Button/Button.module.css`

### Card
- `tsx`: `src/components/ui/Card/Card.tsx`
- `css`: `src/components/ui/Card/Card.module.css`

### Glass Button
- `tsx`: `src/components/ui/GlassButton/GlassButton.tsx`
- `css`: `src/components/ui/GlassButton/GlassButton.module.css`

### Input
- `tsx`: `src/components/ui/Input/Input.tsx`
- `css`: `src/components/ui/Input/Input.module.css`

### Loader
- `tsx`: `src/components/ui/Loader/Loader.tsx`
- `css`: `src/components/ui/Loader/Loader.module.css`

## Team Rule
When styling a screen:

1. Start from the page or component module listed here.
2. Prefer direct semantic classes over descendant selectors.
3. Use tone classes only for color/state, not spacing/layout.
4. If an element is likely to be styled independently later, give it an explicit hook class now.
