# Provider Integration & Earnings Management System

## 📋 Complete Setup Guide

### Part 1: Provider Management (3rd Party APIs Integration)

#### How Third-Party Providers Work:

```
Your Platform
    ↓
[User Orders Service]
    ↓
[Check Available Providers]
    ↓
[Send Order to Provider API]
    ↓
[Track Order Status]
    ↓
[Calculate Profit]
    ↓
[Update User Order Status]
```

#### Step 1: Add a New Provider

1. Go to **Admin Dashboard → Provider Management**
2. Click **"+ Add Provider"**
3. Fill in provider details:
   - **Name**: Provider company name
   - **API URL**: `https://api.provider.com/api`
   - **API Key**: Your authentication key
   - **API Secret** (optional): Additional security credential
   - **Commission Type**: How you pay them (percentage, fixed, or dynamic)
   - **Commission Value**: Amount or percentage you pay

#### Step 2: Sync Services from Provider

```typescript
// Provider provides these services:
// - Instagram Followers ($0.05 per 1000)
// - TikTok Views ($0.03 per 1000)
// - YouTube Subscribers ($0.10 per 1000)

// You set OUR prices:
// - Instagram Followers ($0.10 per 1000) → 100% markup
// - TikTok Views ($0.06 per 1000) → 100% markup
// - YouTube Subscribers ($0.20 per 1000) → 100% markup
```

**Your Profit = Customer Price - Provider Cost**

#### Step 3: Place Orders Automatically

When a user orders a service:
```typescript
const order = await ordersAPI.createOrder(serviceId, link, quantity);

// System automatically:
// 1. Deducts customer balance
// 2. Finds available provider
// 3. Sends order to provider API
// 4. Saves provider's order ID
// 5. Tracks delivery status
// 6. Calculates your profit
```

#### API Integration Example:

```typescript
// Provider API Response Format (Required)
{
  "order_id": "12345",
  "status": "processing",
  "service": "instagram_followers",
  "quantity": 1000,
  "link": "https://instagram.com/username",
  "start_count": 100,
  "remains": 900,
  "eta": "24 hours"
}
```

---

### Part 2: Earnings Management System

#### Financial Breakdown Example:

```
User pays:           $10.00
  ├─ Platform keeps: $5.00  ← Your profit!
  └─ Provider gets:  $5.00  ← Expense

Customer Charge:     $10.00
Provider Cost:       $5.00
Platform Profit:     $5.00
Profit Margin:       50%
```

#### How Earnings are Tracked:

1. **When Order is Created:**
   - Customer charge recorded
   - Provider cost calculated
   - Platform profit calculated
   - Status set to "pending"

2. **When Order Completes:**
   - Status changed to "completed"
   - Profit locked in
   - Provider balance increased

3. **When Payout is Processed:**
   - Provider balance deducted
   - Payout record created
   - Transaction history logged

---

### Part 3: Database Schema

#### Tables Created:

```sql
-- Provider Services Mapping
CREATE TABLE provider_services (
  provider_id -> providers
  service_id -> services
  provider_service_id -> External provider's ID
  provider_rate -> What we pay provider
  our_rate -> What we charge customer
);

-- Track Platform Earnings
CREATE TABLE platform_earnings (
  customer_charge -> How much user paid
  provider_cost -> How much we paid provider
  platform_profit -> Our profit
  status -> pending/completed/failed
);

-- Provider Payouts
CREATE TABLE provider_payouts (
  provider_id -> Which provider
  total_amount -> Total to pay them
  payout_method -> bank_transfer/paypal/crypto
  status -> pending/processing/completed
);

-- Transaction History
CREATE TABLE provider_transactions (
  type -> earning/payout/refund
  amount -> How much
  description -> What happened
  balance_before/after -> Provider's balance tracking
);

-- Daily Financial Summary
CREATE TABLE platform_summary (
  date -> Specific day
  total_customer_charges -> Total revenue
  total_provider_costs -> Total expenses
  gross_profit -> Before all deductions
  net_profit -> Your actual profit
  total_orders -> Number of orders
);
```

---

### Part 4: Admin Dashboards

#### A. Earnings Dashboard (`/admin/earnings`)

Shows:
- **Total Revenue** - All money from customers
- **Total Expenses** - All money paid to providers
- **Platform Profit** - Your net profit
- **Profit Margin %** - (Profit / Revenue) × 100
- **Daily Financial Summary** - Day-by-day breakdown
- **Trend Analysis** - See if profit growing or shrinking

#### B. Provider Payouts (`/admin/payouts`)

Shows:
- **Provider Balances** - How much each owes you
- **Create Payouts** - Pay providers for their earnings
- **Payout History** - All past payments with status
- **Payout Methods** - Bank, PayPal, Crypto support
- **Track Transactions** - Full audit trail

#### C. Provider Management (`/admin/providers`)

Shows:
- **Active Providers** - List of all third-party APIs
- **API Status** - Are they working?
- **Last Sync** - When did we last get their services?
- **Balance** - How much they have earned
- **Test Connection** - Verify API is working
- **Sync Services** - Import their latest offerings

---

### Part 5: API Functions to Use

#### Creating Orders:

```typescript
// User places an order
const order = await ordersAPI.createOrder(
  serviceId,      // Which service
  'https://...',  // Link to deliver to
  1000,           // Quantity
  24              // Delivery time (hours)
);

// System automatically finds a provider and tracks earnings
```

#### Recording Earnings:

```typescript
// When order is placed, earnings are recorded
await earningsAPI.recordOrderEarning(
  orderId,           // Order ID
  userId,            // Customer ID
  providerId,        // Which provider handling it
  10.00,             // Customer paid this
  5.00,              // Provider costs this
  0.50               // Platform commission (if any)
);
// This auto-calculates: profit = 10 - 5 - 0.5 = $4.50
```

#### Completing Orders:

```typescript
// When provider delivers
await earningsAPI.completeOrderEarning(orderId);
// Marks profit as "locked in" and can't be refunded
```

#### Creating Payouts:

```typescript
// Pay a provider
await earningsAPI.createProviderPayout(
  providerId,       // Which provider
  '2026-01-01',    // Period start
  '2026-01-31',    // Period end
  'bank_transfer',  // How to pay
  'ACCOUNT_DETAILS' // Where to send money
);
// Auto-calculates total from provider_transactions
```

#### Getting Financial Reports:

```typescript
// Get detailed report
const report = await earningsAPI.getFinancialReport(
  '2026-01-01',     // From
  '2026-01-31'      // To
);
// Returns: daily summaries, totals, trends
```

---

### Part 6: Profit Calculation Examples

#### Example 1: Simple Order

```
Customer orders: 1000 Instagram Followers
Our price: $0.10 per 1000 = $100
Provider price: $0.05 per 1000 = $50

Calculation:
├─ Customer pays:       $100
├─ Provider costs:      -$50
└─ Platform profit:     $50 (50% margin)
```

#### Example 2: Multiple Providers

```
Order: 5000 TikTok Views
Split between 2 providers:
├─ Provider A: 2500 @ $0.02 = $50
├─ Provider B: 2500 @ $0.03 = $75
├─ Total provider cost:        $125

Customer pays:         $250
Provider total:       -$125
Your profit:          $125 (50% margin)
```

#### Example 3: With Commission

```
Customer pays:        $100
Provider commission:  -$10 (10% of $100)
Provider cost:        -$50 (actual delivery)
Your profit:          $40 (40% margin)

In platform_earnings:
├─ customer_charge:     $100
├─ provider_cost:       $50
├─ platform_commission: $10
└─ platform_profit:     $40
```

---

### Part 7: Admin Workflow

#### Daily Operations:

1. **Morning**: Check dashboard
   - Are providers delivering?
   - Is profit healthy?
   - Any failed orders?

2. **Mid-day**: Process Payouts
   - Calculate earnings for active providers
   - Create payout requests
   - Schedule transfers

3. **Evening**: Review Reports
   - Revenue trends
   - Profit margins
   - Provider performance

#### Weekly Operations:

1. Review provider performance
2. Adjust markup if needed
3. Sync new services from providers
4. Process all pending payouts
5. Analyze financial trends

#### Monthly Operations:

1. Generate detailed financial report
2. Calculate platform profitability
3. Identify top-performing providers
4. Plan pricing adjustments
5. Create financial summary

---

### Part 8: Important Features

✅ **Real-time Profit Tracking** - Every order tracked
✅ **Automatic Payouts** - Calculate what each provider earned
✅ **Multiple Payment Methods** - Bank, PayPal, Crypto
✅ **Audit Trail** - Every transaction logged
✅ **Daily Summaries** - Automatic end-of-day reports
✅ **Provider Balance Tracking** - How much they've earned
✅ **Profit Margin Analysis** - Know your true profitability
✅ **RLS Security** - Users only see their earnings
✅ **Transaction History** - Full traceability
✅ **Refund Tracking** - If order fails, money back to user

---

### Part 9: Files Created

- `supabase/setup_provider_and_earnings.sql` - Database schema
- `lib/providerAndEarningsAPI.ts` - API functions
- `pages/admin/EarningsDashboard.tsx` - Earnings analytics
- `pages/admin/ProviderPayouts.tsx` - Payout management
- `pages/admin/ProviderManagement.tsx` - Provider integration (updated)

---

### Part 10: Next Steps

1. **Apply Migration**: Run `setup_provider_and_earnings.sql` in Supabase SQL Editor
2. **Test Provider**: Add a test provider and verify API connection
3. **Create Test Order**: Place an order and check earnings are recorded
4. **Generate Report**: View EarningsDashboard with test data
5. **Create Payout**: Test payout creation workflow
6. **Go Live**: Enable for real providers

---

## 🎯 Quick Reference

| Feature | Location | What It Does |
|---------|----------|--------------|
| **Provider List** | Admin → Providers | See all 3rd party APIs |
| **Sync Services** | Admin → Providers | Import their service list |
| **Test Connection** | Admin → Providers | Verify API working |
| **Earnings Report** | Admin → Earnings | Daily profit analysis |
| **Create Payout** | Admin → Payouts | Pay providers their earnings |
| **Transaction History** | Admin → Payouts | See all movements |
| **Profit Margin** | Admin → Earnings | Know true profitability |
| **Daily Summary** | Admin → Earnings | Auto-generated EOD reports |

---

## 💡 Pro Tips

1. **Markup Strategy**: Start with 50% markup, adjust based on competition
2. **Provider Selection**: Use multiple providers for reliability
3. **Price Optimization**: Raise customer prices if profit drops
4. **Monitor Failures**: High failed orders = bad provider, switch them
5. **Regular Payouts**: Pay providers regularly to maintain relationship
6. **Profit Tracking**: Check daily summaries to identify trends

---

## ❓ Troubleshooting

**Q: Order not appearing in earnings?**
A: Make sure provider is set and order reached "completed" status

**Q: Provider payout not calculating correctly?**
A: Check provider_transactions table has all earning records

**Q: Profit margin seems low?**
A: Review provider costs vs your customer prices

**Q: Provider says we owe them money?**
A: Check balance in providers table, create payout if needed
