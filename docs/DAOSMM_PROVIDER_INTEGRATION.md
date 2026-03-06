# 🔗 DaoSMM Provider Integration - Complete Workflow

## 📋 Overview

یہ document DaoSMM provider کے ساتھ complete integration کی تفصیل دیتا ہے۔

---

## 🎯 STEP 1: Provider Services Sync

### API Call (DaoSMM)
```bash
POST https://daosmm.com/api/v2
action=services
key=YOUR_API_KEY
```

### Expected Response
```json
[
  {
    "service": 1,
    "name": "Instagram Followers",
    "rate": "0.50",
    "min": "100",
    "max": "10000",
    "category": "Instagram"
  },
  {
    "service": 2,
    "name": "Instagram Likes",
    "rate": "0.05",
    "min": "10",
    "max": "5000",
    "category": "Instagram"
  }
]
```

### Admin Panel میں
```
Provider Management → [Provider Name] → "Sync Services" Button
    ↓
Services fetched from DaoSMM
    ↓
Saved to local database:
  provider_services table
    ├─ provider_id
    ├─ provider_service_id (1, 2, etc)
    ├─ name
    ├─ category
    ├─ provider_rate (0.50, 0.05)
    ├─ our_rate (0.80, 0.10) ← Admin sets this
    ├─ min/max
    └─ status (active/inactive)
```

---

## 💰 STEP 2: Service Mapping & Pricing

### Admin کے لیے
```
Provider Rate = 0.50
Your Markup = 60%
Your Rate = 0.50 * 1.6 = 0.80

Profit per 1000 = 0.80 - 0.50 = 0.30
```

### Database Structure
```typescript
provider_services {
  id: UUID
  provider_id: UUID
  provider_service_id: string (1, 2, 3 - DaoSMM کے service IDs)
  name: string
  category: string
  provider_rate: decimal
  our_rate: decimal
  min_quantity: integer
  max_quantity: integer
  status: 'active' | 'inactive'
}
```

---

## 🛒 STEP 3: User Order Flow

### User Dashboard میں
```
1. Select Service (Instagram Followers)
2. Enter Quantity (1000)
3. Paste Link (instagram.com/user)
4. Click "Place Order"
```

### Backend Logic
```
1. User validation ✓
2. Check balance ✓
3. Calculate cost:
   - our_rate × quantity / 1000
   - 1000 × 0.80 / 1000 = $0.80
4. Deduct from wallet
5. Create local order in orders table
6. Send to DaoSMM API
7. Save provider_order_id
8. Update order status → "processing"
```

### API Call to DaoSMM
```bash
POST https://daosmm.com/api/v2
action=add
key=YOUR_API_KEY
service=1
link=https://instagram.com/user
quantity=1000
```

### DaoSMM Response
```json
{
  "order": 123456,
  "status": "Pending"
}
```

### Save in Local DB
```typescript
orders {
  id: UUID
  user_id: UUID
  service_id: UUID
  quantity: 1000
  link: "https://instagram.com/user"
  charge: 0.80
  status: "processing"
  provider_id: UUID
  provider_order_id: "123456"
  created_at: timestamp
  updated_at: timestamp
}
```

---

## 🔄 STEP 4: Order Status Sync (CRON JOB)

### Problem
- DaoSMM real-time updates نہیں دیتا
- ہمیں خود check کرنا پڑتا ہے

### Solution: Background Job
```bash
Every 5-10 minutes:
1. Fetch all pending orders
2. Check status from DaoSMM
3. Update local order status
4. Update user in real-time
```

### API Call to DaoSMM
```bash
POST https://daosmm.com/api/v2
action=status
key=YOUR_API_KEY
order=123456
```

### Response
```json
{
  "order": 123456,
  "status": "Completed",
  "remains": 0,
  "delivered": 1000
}
```

### Status Mapping
```
DaoSMM Status    →    Local Status
"Pending"        →    "processing"
"Processing"     →    "processing"
"Partial"        →    "partial"
"Completed"      →    "completed"
"Refunded"       →    "refunded"
"Canceled"       →    "failed"
```

---

## 🔁 STEP 5: Partial Delivery & Refunds

### Scenario 1: Partial Delivery
```
Provider دے سکا:        800 followers
User نے مانگا:         1000 followers
باقی:                   200 followers

کیا کرنا ہے:
1. Calculate refund = (200 / 1000) × 0.80 = $0.16
2. Add $0.16 to user wallet
3. Update order status = "partial"
4. Create refund transaction
5. Notify user
```

### Scenario 2: Order Canceled
```
Provider cancel کر دے

کیا کرنا ہے:
1. Full refund = $0.80
2. Add to user wallet
3. Update order status = "refunded"
4. Create credit transaction
```

### Database
```typescript
refunds {
  id: UUID
  order_id: UUID
  user_id: UUID
  amount: decimal
  reason: string
  status: 'pending' | 'completed'
  created_at: timestamp
}
```

---

## 💳 STEP 6: Wallet & Transactions

### Debit (Order Placement)
```typescript
transactions {
  id: UUID
  user_id: UUID
  type: 'debit'
  amount: 0.80
  description: 'Order #123 - Instagram Followers'
  order_id: UUID
  balance_before: 10.00
  balance_after: 9.20
  created_at: timestamp
}

user_profiles.balance: 9.20
```

### Credit (Refund)
```typescript
transactions {
  id: UUID
  user_id: UUID
  type: 'credit'
  amount: 0.16
  description: 'Refund for Order #123 - Partial'
  order_id: UUID
  balance_before: 9.20
  balance_after: 9.36
  created_at: timestamp
}

user_profiles.balance: 9.36
```

---

## 👨‍💼 STEP 7: Admin Monitoring

### Admin Dashboard
```
Provider Balance:
├─ DaoSMM: $500.00
├─ SMM Panel XYZ: $250.00

Daily Orders:
├─ Total: 150
├─ Completed: 130
├─ Pending: 15
├─ Failed: 5

Profit Report:
├─ Revenue: $500.00
├─ Expenses: $250.00
├─ Profit: $250.00
├─ Margin: 50%
```

### Balance API
```bash
POST https://daosmm.com/api/v2
action=balance
key=YOUR_API_KEY

Response:
{
  "balance": "500.00"
}
```

---

## 🔗 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPLETE WORKFLOW                         │
└─────────────────────────────────────────────────────────────┘

SETUP:
  Provider Connected ✅
         ↓
  Sync Services (Get list from DaoSMM)
         ↓
  Admin Set Pricing (our_rate for each service)
         ↓

USER ORDER:
  User Places Order
         ↓
  Check Balance
         ↓
  Deduct from Wallet
         ↓
  Create Local Order
         ↓
  Send to DaoSMM API ← (POST /api/v2?action=add)
         ↓
  Save provider_order_id
         ↓
  Order Status = "processing"
         ↓

STATUS TRACKING (Cron Job Every 5-10 min):
  Check DaoSMM Status ← (POST /api/v2?action=status)
         ↓
  ┌──────────────────────────────┐
  │   Update Order Status        │
  │  ┌──────────────────────┐   │
  │  │ Completed? → Notify  │   │
  │  │ Partial? → Refund    │   │
  │  │ Failed? → Full refund│   │
  │  └──────────────────────┘   │
  └──────────────────────────────┘
         ↓
  User Gets Notification
         ↓
  Order Complete ✅
```

---

## 📊 Database Tables (Summary)

```typescript
// Services from provider
provider_services {
  id, provider_id, provider_service_id, name, category, 
  provider_rate, our_rate, min/max, status
}

// User orders
orders {
  id, user_id, service_id, quantity, link, charge, status,
  provider_id, provider_order_id, created_at
}

// Financial tracking
transactions {
  id, user_id, type (debit/credit), amount, description,
  order_id, balance_before, balance_after
}

// Refunds
refunds {
  id, order_id, user_id, amount, reason, status
}

// User wallet
user_profiles {
  id, balance, ...
}
```

---

## 🎯 Next Steps (Implementation Order)

1. ✅ Provider Test Connection (Done)
2. ⏳ Sync Services Endpoint
3. ⏳ Place Order to Provider
4. ⏳ Cron Job for Status Updates
5. ⏳ Refund Logic
6. ⏳ Admin Dashboard Integration

---

## 🚨 Important Notes

- **Balance نہیں دیکھائی دے رہا؟** → Sync Services کریں پہلے
- **Orders fail ہو رہے ہیں؟** → Provider API format check کریں
- **Status update نہیں ہو رہا؟** → Cron job check کریں
- **Refund logic?** → Order status = "partial" یا "refunded" پر trigger ہوتا ہے

---

## 📞 DaoSMM API Reference

### Base URL
```
https://daosmm.com/api/v2
```

### Authentication
```
key=YOUR_API_KEY (in query params or POST body)
```

### Main Actions
- `action=services` → List all services
- `action=balance` → Check balance
- `action=add` → Place order
- `action=status` → Check order status
- `action=refill` → Refill order (optional)

---

**اب implementation شروع کریں! 🚀**
