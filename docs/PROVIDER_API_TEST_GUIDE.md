# Provider API Test Guide - اردو میں

## 🔧 مسئلہ اور حل

### مسئلہ کیا تھا؟
جب آپ admin panel میں provider add کر رہے تھے اور "Test Connection" بٹن دبا رہے تھے تو `500 Internal Server Error` آ رہا تھا۔

### وجہ:
Backend میں `/api/admin/test-provider` endpoint implement نہیں تھا۔ صرف frontend code تھا۔

### حل:
✅ Server route شامل کر دیا: `server/routes/admin.js` میں `POST /api/admin/test-provider` endpoint

---

## 🎯 اب کیسے کام کرتا ہے?

### Step 1: Provider Management میں جائیں
```
Admin Dashboard → Provider Management
```

### Step 2: "Add New Provider" بٹن دبائیں
یہ form کھلے گا:
- **Provider Name:** مثال: "DaoSMM", "SMM Panel XYZ"
- **API URL:** Provider کا API base URL مثال: `https://daosmm.com/api/v2`
- **API Key:** Provider سے ملنے والی key
- **API Secret:** (Optional) Extra security کے لیے

### Step 3: Test Connection
```
"Test Connection" بٹن دبائیں
     ↓
Server provider کے API سے رابطہ کرے گا
     ↓
Balance واپس آئے گا
     ↓
✓ Connection successful. Balance: $500.00
```

---

## 📡 Backend Endpoint کی تفصیل

### Endpoint: POST /api/admin/test-provider

**Request:**
```json
{
  "api_url": "https://provider.com/api",
  "api_key": "your_api_key_here",
  "api_secret": "optional_secret"
}
```

**Response (کامیاب):**
```json
{
  "success": true,
  "balance": 500.00,
  "status": "active",
  "message": "Connection successful",
  "raw_response": { ... provider کا response ... }
}
```

**Response (ناکام):**
```json
{
  "success": false,
  "balance": 0,
  "message": "Provider API connection timeout"
}
```

---

## 🛠️ کیسے کام کرتا ہے؟

### Process:
1. Frontend سے API URL, Key, Secret بھیجا جاتا ہے
2. Backend یہ format میں provider کو request بھیجتا ہے:
   ```
   https://provider.com/api?action=balance&key=xxx&secret=yyy
   ```
3. Provider اپنا response دیتا ہے (عام طور پر JSON میں balance کے ساتھ)
4. Backend response parse کرتا ہے اور balance نکالتا ہے
5. Frontend کو واپس کرتا ہے

### Supported Balance Formats:
Backend یہ سب formats کو سمجھتا ہے:
- `balance` (سب سے عام)
- `Balance` (capital B)
- `current_balance`
- `CurrentBalance`

---

## ⚠️ Timeout کا معاملہ

اگر provider API 8 سیکنڈ میں response نہ دے تو:
```json
{
  "success": false,
  "message": "Provider API connection timeout (8s)",
  "balance": 0
}
```

یہ timeout 8000ms (8 سیکنڈ) ہے اور آپ `server/routes/admin.js` میں بدل سکتے ہو۔

---

## 🔍 اگر Test کے بعد بھی Error آے تو:

### 1. API URL check کریں
```
✓ صحیح: https://daosmm.com/api/v2
✗ غلط: https://daosmm.com/api/ (trailing slash)
```

### 2. API Key صحیح ہو
```
Provider کے dashboard میں جا کر دوبارہ check کریں
```

### 3. Server logs دیکھیں
```bash
# Terminal میں جہاں npm run dev چل رہا ہے
# وہاں error message ہوگا
```

### 4. Browser Console دیکھیں
```
F12 → Console tab → آپ کو error دکھے گی
```

---

## 📋 مکمل Workflow

```
1. Add Provider
   ↓
2. Test Connection (API تیار ہے اب)
   ↓
3. If Success → Create button دبائیں
   ↓
4. Provider اب database میں save ہوگا
   ↓
5. Sync Services (اگر سروسیں لانا ہوں)
   ↓
6. ہو گیا! اب یہ provider استعمال ہو سکتا ہے
```

---

## 🎓 مثال: DaoSMM کے ساتھ

```
Provider Name: DaoSMM
API URL: https://daosmm.com/api/v2
API Key: [آپ کی key]
API Secret: [optional]

جب Test دبائیں گے تو:
Request: https://daosmm.com/api/v2?action=balance&key=xxx

DaoSMM واپس دے گا کچھ یوں:
{
  "balance": 500,
  "status": "success"
}

Backend اسے parse کرتا ہے:
{
  "success": true,
  "balance": 500
}
```

---

## ✅ اب سب کام کر رہا ہے!

اب آپ:
- ✅ Provider add کر سکتے ہو
- ✅ API connection test کر سکتے ہو
- ✅ Balance دیکھ سکتے ہو
- ✅ Services sync کر سکتے ہو
- ✅ Orders place کر سکتے ہو

کوئی مسئلہ ہو تو server console میں error دیکھیں!
