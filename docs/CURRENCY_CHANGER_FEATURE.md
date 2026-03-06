# Currency Changer Feature

## تفصیل (Description)
ایک مکمل currency changer feature شامل کیا گیا ہے جو user اور admin dashboards دونوں میں کام کرتا ہے۔

A complete currency changer feature has been implemented for both user and admin dashboards.

## Features:
1. **Currency Dropdown** - Top bar میں bell icon کے ساتھ currency selector dropdown
2. **8 Currencies Supported** - USD, EUR, GBP, PKR, INR, AED, CAD, AUD
3. **Live Conversion** - تمام amounts خودکار طور پر convert ہو جاتے ہیں
4. **Local Storage** - User کی پسند محفوظ رہتی ہے
5. **Global Context** - Entire app میں currency state accessible ہے

## فائلوں میں شامل کیے گئے Changes:

### 1. **lib/CurrencyContext.tsx** (نیا)
- `CurrencyProvider` component جو app کو wrap کرتا ہے
- `useCurrency()` hook برائے currency state اور conversion
- 8 currencies کے ساتھ exchange rates
- LocalStorage میں user کی selection محفوظ کرتا ہے

### 2. **components/dashboard/Header.tsx**
- Currency dropdown button شامل کیا
- `useCurrency` hook کو استعمال کیا
- Account balance اب selected currency میں دکھائی دیتا ہے

### 3. **components/admin/Header.tsx**
- Currency dropdown button شامل کیا
- `useCurrency` hook کو استعمال کیا
- Bell icon کے ساتھ currency selector

### 4. **App.tsx**
- `CurrencyProvider` import کیا
- Entire app کو `CurrencyProvider` سے wrap کیا

### 5. **components/CurrencyAmount.tsx** (نیا)
- Reusable component برائے currency amounts
- Props: amount, className, showCode

### 6. **components/dashboard/StatCard.tsx**
- `numericValue` prop شامل کیا
- `useCurrency` hook کو استعمال کیا
- Amounts اب currency-aware ہیں

## استعمال (Usage):

### Dashboard میں amounts دکھانے کے لیے:
```tsx
import { useCurrency } from './lib/CurrencyContext';

function MyComponent() {
    const { formatAmount } = useCurrency();
    
    return <p>{formatAmount(50)}</p>;  // درست currency میں دکھائے گا
}
```

### StatCard کے ساتھ:
```tsx
<StatCard 
    title="Account Balance"
    numericValue={50}  // یہ automatically convert ہو جائے گا
    icon={<DollarIcon />}
    color="green"
/>
```

### CurrencyAmount component کے ساتھ:
```tsx
import CurrencyAmount from './components/CurrencyAmount';

<CurrencyAmount amount={100} className="text-2xl font-bold text-green-400" />
```

## Supported Currencies:
| Code | Symbol | Name |
|------|--------|------|
| USD | $ | US Dollar |
| EUR | € | Euro |
| GBP | £ | British Pound |
| PKR | ₨ | Pakistani Rupee |
| INR | ₹ | Indian Rupee |
| AED | د.إ | UAE Dirham |
| CAD | C$ | Canadian Dollar |
| AUD | A$ | Australian Dollar |

## Next Steps (اگلے قدم):
1. Dashboard pages میں StatCard یا دوسرے amount displays کو `numericValue` prop کے ساتھ update کریں
2. اگر real-time exchange rates چاہیں تو API integrate کریں
3. مزید currencies شامل کریں اگر ضرورت ہو

## Technical Details:
- React Context API برائے state management
- LocalStorage برائے persistence
- Base currency: USD (تمام conversions USD سے ہیں)
- Formatting rules: PKR/INR کے لیے integer، دوسری currencies کے لیے 2 decimal places
