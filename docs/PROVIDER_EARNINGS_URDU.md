# 📱 Provider Integration اور Earnings Management - اردو Guide

## 🎯 سیکھیں کہ یہ کیسے کام کرتا ہے

### حصہ 1: Third Party Provider کیا ہے؟

آپ کے پاس ایک **SMM Panel** (Social Media Marketing Platform) ہے۔ لیکن آپ سے اپنے آپ followers نہیں دے سکتے۔ تو آپ **دوسری companies** (providers) سے followers لیتے ہو اور اپنے customers کو دیتے ہو۔

```
Provider (Real Service):          Your Platform (Reseller):
├─ Instagram Followers               ├─ Customer pays: $10
├─ TikTok Views                       ├─ You pay provider: $5  
├─ YouTube Subscribers                └─ You profit: $5
└─ Comments & Likes
```

### حصہ 2: Setup کیسے کریں

#### Step 1: Provider Add کریں

```
Admin Dashboard
    ↓
Provider Management
    ↓
+ Add Provider
    ↓
Fill Details:
├─ Name: "SMM Provider XYZ"
├─ API URL: "https://api.provider.com"
├─ API Key: "your_secret_key_12345"
└─ Markup: 50% (یعنی provider $5 دے تو آپ $7.50 میں لیں گے)
```

#### Step 2: ان کی Services Import کریں

```
Provider Management
    ↓
Sync Services
    ↓
Automatically imports:
├─ Instagram Followers
├─ TikTok Views
├─ YouTube Subscribers
├─ Comments
└─ Likes
```

#### Step 3: جب Customer Order کرے

```
Customer:
├─ "مجھے 1000 Instagram Followers دو"
├─ Pays: $10
└─ Gets: Followers in 24 hours

System:
├─ Deducts $10 from their wallet
├─ Sends order to provider
├─ Provider delivers
├─ Tracks status
├─ Updates customer
└─ Profits $5
```

---

### حصہ 3: Earnings Management

#### کہاں سے پیسے آتے ہیں؟

```
آپ کا Profit = (جو Customer دے) - (جو Provider کو دو)

Example:
├─ Customer دیتا ہے: $100
├─ Provider کو دیتے ہو: $50
└─ آپ رکھتے ہو: $50 (50% Profit Margin)
```

#### Earnings Track کریں

```
Admin Dashboard
    ↓
Earnings Dashboard
    ↓
دیکھیں:
├─ Total Revenue: کتنا پیسہ آیا
├─ Total Expenses: کتنا provider کو دیا
├─ Platform Profit: آپ کا منافع
├─ Profit Margin: فیصد میں منافع
└─ Daily Summary: ہر دن کا تفصیل
```

---

### حصہ 4: Provider کو کتنا دینا ہے؟

#### Transaction Tracking

جب آپ provider سے orders دیتے ہو:

```
Provider کے پاس Account بنتا ہے:
├─ Earning: $100 (orders سے)
├─ Payout: -$50 (آپ انہیں دے دیتے ہو)
└─ Balance: $50 (ابھی ان کے پاس باقی)
```

#### Payout کریں

```
Admin Dashboard
    ↓
Provider Payouts
    ↓
+ Create Payout
    ↓
انتخاب کریں:
├─ کون سا Provider؟
├─ کتنا پیسہ؟
├─ کہاں بھیجنا؟ (Bank/PayPal/Crypto)
└─ کب سے کب تک؟ (Period)
```

---

### حصہ 5: مثالیں

#### مثال 1: سادہ Order

```
Customer Order:
├─ Service: Instagram Followers
├─ Quantity: 1000
├─ Customer Price: $0.10 per 1000 = $100
├─ Provider Cost: $0.05 per 1000 = $50
└─ Your Profit: $50

اردو میں:
├─ Customer دیتا: $100
├─ Provider کو دیتے: $50
└─ آپ رکھتے: $50
```

#### مثال 2: ہر دن کا Breakdown

```
Date: Jan 11, 2026

Orders:
├─ Order 1: Customer = $100, Provider = $50, Profit = $50
├─ Order 2: Customer = $50, Provider = $25, Profit = $25
├─ Order 3: Customer = $200, Provider = $100, Profit = $100
└─ Total:   Customer = $350, Provider = $175, Profit = $175

آپ کا Profit Margin = 175/350 = 50%
```

#### مثال 3: Monthly Payout

```
January میں آپ نے Provider کو orders دیے:
├─ Service 1: $500
├─ Service 2: $300
├─ Service 3: $200
└─ Total بقایا: $1000

اب آپ انہیں $1000 دینا ہے!
```

---

### حصہ 6: Admin Pages

#### 1. Provider Management
```
یہاں دیکھیں:
├─ کتنے Providers ہیں؟
├─ کون سے Active ہیں?
├─ ان کا API کام کر رہا ہے؟
├─ آخری بار sync کب ہوا?
└─ ان کے پاس کتنا balance ہے?
```

#### 2. Earnings Dashboard
```
یہاں دیکھیں:
├─ آج کتنا revenue آیا؟
├─ کتنا expense دیا?
├─ کتنا profit رہا?
├─ Profit margin کیا ہے?
└─ Trend دیکھیں (بڑھ رہا یا گھٹ رہا؟)
```

#### 3. Provider Payouts
```
یہاں کریں:
├─ Providers کو پیسے دیں
├─ Payment history دیکھیں
├─ Balance ٹریک کریں
├─ Bank/PayPal/Crypto سے پیسے بھیجیں
└─ Transactions کی فہرست دیکھیں
```

---

### حصہ 7: Database میں کیا ہوتا ہے؟

```
جب Customer Order کرتا ہے:

1. orders table میں entry: Order record
2. platform_earnings میں: Profit calculation
   ├─ customer_charge: $100 (Customer نے دیا)
   ├─ provider_cost: $50 (Provider کو دیتے ہو)
   └─ platform_profit: $50 (آپ رکھتے ہو)

جب Order complete ہوتا ہے:

3. provider_transactions میں:
   ├─ earning: $50 (Provider کی earning)
   └─ balance: $50 (Provider کے پاس balance)

جب آپ Payout دیتے ہو:

4. provider_payouts میں:
   ├─ amount: $50 (دیا ہوا پیسہ)
   ├─ status: completed
   └─ date: payment کی date

5. provider_transactions میں:
   ├─ payout: -$50 (سے کم ہوا)
   └─ balance: $0 (balance zero ہو گیا)
```

---

### حصہ 8: فوائد

✅ **Automatic Tracking** - ہر rupee tracked ہوتا ہے
✅ **Real-time Profit** - فوری پتہ لگتا ہے کتنا profit ہوا
✅ **Provider Balance** - ہر provider کو کتنا دینا ہے، خود calculate
✅ **Daily Reports** - ہر دن کا خلاصہ
✅ **Multiple Payouts** - Bank/PayPal/Crypto سب میں دے سکتے ہو
✅ **Audit Trail** - کون سا پیسہ کہاں گیا, سب لکھا ہوا
✅ **Profit Margin** - جانتے ہو کتنا فیصد منافع ہے
✅ **Security** - RLS سے صرف authorized لوگ دیکھ سکتے ہیں

---

### حصہ 9: عام سوالات

**Q: Customer کی پیسہ واپسی ہو تو؟**
A: پھر `refund` status set کریں, provider کو واپس کریں, customer کو واپس دیں

**Q: Provider غائب ہو جائے؟**
A: Status کو "inactive" کریں, دوسرے provider سے کام لیں

**Q: Profit margin کم کیوں ہے؟**
A: Provider کی cost بہت زیادہ ہے, دوسرا provider ڈھونڈو یا customer price بڑھاؤ

**Q: Provider کتنا ہوا balance؟**
A: ProviderPayouts page میں دیکھ سکتے ہو

**Q: Monthly profit کتنی ہے؟**
A: EarningsDashboard میں date range set کر کے دیکھو

---

### حصہ 10: شروع کریں

1. **پہلا Step**: Providers table میں ایک test provider add کریں
2. **دوسرا Step**: ان کی services sync کریں
3. **تیسرا Step**: ایک test order دیں
4. **چوتھا Step**: EarningsDashboard میں profit دیکھیں
5. **پانچوں Step**: Provider کو payout دیں
6. **چھٹا Step**: ہر دن earnings track کریں

---

## 🎯 خلاصہ

```
آپ کا Business Model:

1. Customer کو High Price میں دیتے ہو
2. Provider سے Low Price میں لیتے ہو
3. فرق آپ رکھتے ہو (Profit)
4. ہر transaction track ہوتی ہے
5. ہر provider کا balance calculate ہوتا ہے
6. جب وقت آئے تو انہیں pay کر دیتے ہو
7. حساب ختم!
```

اب آپ کا SMM Panel مکمل ہے! 🎉
