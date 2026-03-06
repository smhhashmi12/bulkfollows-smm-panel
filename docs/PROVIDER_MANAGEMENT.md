# Provider Management - Feature Guide

## Overview
The Provider Management section now includes full CRUD operations and advanced API management features to manage your SMM service providers.

## Features & Functionality

### 1. **Add New Provider**
Click the **"+ Add New Provider"** button to open the provider creation modal.

**Required Fields:**
- **Provider Name**: Unique identifier for your provider (e.g., "SMM King", "Instant Followers")
- **API URL**: Base endpoint of provider's API (e.g., `https://api.smmking.com`)
- **API Key**: Authentication key provided by provider

**Optional Fields:**
- **API Secret**: Secondary authentication credential (if required by provider)

**Example:**
```
Name: SMM King
API URL: https://api.smmking.com
API Key: your-api-key-here
Secret: your-secret-here
```

### 2. **Test Provider Connection**
Before saving, test the provider connection:
1. Fill in API credentials
2. Click **"🧪 Test Connection"** button
3. View result:
   - ✅ Success: Shows provider balance
   - ❌ Failed: Check credentials and try again

The test endpoint validates:
- API URL is accessible
- API Key is valid
- Provider returns balance data

**Error Handling:**
- "Connection timeout" = Provider API is slow (>8s)
- "Connection failed" = Invalid credentials or API endpoint

### 3. **Edit Provider**
Click **"✎ Edit"** on any provider to modify:
- Provider name
- API URL
- API Key
- API Secret

Changes are saved instantly without losing balance history.

### 4. **Refresh Balance**
Click **"🔄 Refresh"** to fetch the latest balance from provider:
- Makes live API call to provider
- Updates balance in database
- Timeout after 8 seconds if provider is slow

**When to Use:**
- After adding funds to provider account
- To verify current account status
- Troubleshooting balance discrepancies

### 5. **Sync Services**
Click **"⬇️ Sync"** to import services from provider:
- Fetches all available services from provider API
- Maps provider data to local database format
- Updates `last_sync` timestamp
- Shows count of synced services

**Auto-Maps These Fields:**
| Provider Field | Local Field |
|---|---|
| name, service | Service Name |
| category, service_type | Category |
| description | Description |
| rate, price | Rate Per 1000 |
| min, min_quantity | Min Quantity |
| max, max_quantity | Max Quantity |

**Timeout:** 15 seconds (longer than test due to volume)

### 6. **Delete Provider**
Click **"🗑️ Delete"** to remove provider:
- Confirmation dialog appears
- Action is **permanent** and cannot be undone
- Associated orders remain in database

### 7. **Provider Status Indicators**
Each provider shows a status badge:
- 🟢 **Active** (green) - Provider is operational
- ⚪ **Inactive** (gray) - Provider is disabled
- 🔴 **Error** (red) - Connection or validation failed

### 8. **Balance Tracking**
- Displays current balance in USD format
- Updates when refreshing or syncing
- Color-coded: Green for healthy balance

### 9. **Last Sync Timestamp**
- Shows when services were last synced from provider
- Format: MM/DD/YYYY
- Helps identify stale service data

## API Endpoints (Backend)

### Test Provider Connection
```
POST /api/admin/test-provider
Body: {
  api_url: string,
  api_key: string,
  api_secret?: string
}
Response: {
  success: boolean,
  balance: number,
  status: 'active' | 'error',
  message: string
}
```

### Sync Provider Services
```
POST /api/admin/sync-provider-services
Body: { provider_id: string }
Response: {
  success: boolean,
  synced_count: number,
  message: string
}
```

## Common Provider API Formats

### Standard SMM Panel Format
```
GET https://api.provider.com?action=balance&key=YOUR_KEY
GET https://api.provider.com?action=services&key=YOUR_KEY
```

### Alternative Formats
The sync endpoint auto-detects these response structures:
- Direct array: `[{name, category, rate, min, max}, ...]`
- Services key: `{services: [{...}, ...]}`
- Balance responses: `{balance, Balance, current_balance}`

If your provider uses a different format, update the mapping in:
- `/pages/api/admin/test-provider.ts` (balance parsing)
- `/pages/api/admin/sync-provider-services.ts` (service mapping)

## Troubleshooting

### "Connection Failed"
✓ Verify API URL is correct and includes protocol (https://)
✓ Verify API Key is valid
✓ Check if provider API has IP whitelist (add your server IP)
✓ Test manually: `curl "https://api.provider.com?action=balance&key=YOUR_KEY"`

### "Connection Timeout"
✓ Provider API is slow or unreachable
✓ Wait a moment and try Refresh again
✓ Check provider's status page
✓ Increase timeout in code if provider is consistently slow

### "No Services Found"
✓ Provider may not have active services
✓ Check if API Key has permission to list services
✓ Verify provider returns data in expected format
✓ Enable debugging to see raw API response

### Stale Service Prices
✓ Click "⬇️ Sync" to fetch latest services
✓ Set up scheduled sync: `cron: 0 */4 * * *` (every 4 hours)
✓ Monitor `last_sync` timestamp

## Best Practices

1. **Test Before Saving**
   - Always test connection before creating a provider
   - Ensures credentials are correct upfront

2. **Regular Balance Refresh**
   - Refresh balance daily to monitor spending
   - Set alerts if balance drops below threshold

3. **Sync on Schedule**
   - Sync services daily to keep pricing current
   - Use cron jobs for automated sync

4. **Monitor Status**
   - Check provider status badges regularly
   - Address "Error" status immediately

5. **Document Credentials**
   - Keep provider credentials secure
   - Use password manager or vault
   - Rotate API keys periodically

6. **Test with Real Data**
   - Create a test order after adding provider
   - Verify charges are calculated correctly
   - Monitor delivery status from provider

## Example Workflow

### Setting Up a New Provider
1. Click **"+ Add New Provider"**
2. Enter: Name, API URL, API Key
3. Click **"🧪 Test Connection"**
4. If successful, click **"✓ Create"**
5. Click **"⬇️ Sync"** to import services
6. Services now available for users to order

### Updating Provider Balance
1. Locate provider in list
2. Click **"🔄 Refresh"**
3. Wait for update
4. Check Dashboard stats reflect new balance

### Troubleshooting Failed Connection
1. Click **"✎ Edit"**
2. Verify API URL format: `https://api.provider.com`
3. Copy API Key from provider dashboard and paste
4. Click **"🧪 Test Connection"** again
5. If still failing, check provider API documentation

## Database Schema

### Providers Table
```sql
id: UUID (primary key)
name: STRING (unique)
api_url: STRING
api_key: STRING (encrypted recommended)
api_secret: STRING (nullable, encrypted recommended)
balance: NUMERIC
status: ENUM('active', 'inactive', 'error')
last_sync: TIMESTAMP (nullable)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

## Security Notes

- **Encrypt API Keys**: Store `api_key` and `api_secret` encrypted in database
- **Environment Variables**: Consider moving test credentials to `.env.local`
- **IP Whitelisting**: Some providers support restricting API key to specific IPs
- **Rate Limiting**: Implement rate limits on sync endpoint (every 5 min min)
- **Audit Logs**: Log all provider modifications for compliance

## Performance Optimization

- **Caching**: Services cached in memory for 1 hour after sync
- **Batch Operations**: Sync all providers on schedule (not per request)
- **Async Jobs**: Move long syncs to background job queue
- **Pagination**: Limit sync results if provider returns 1000+ services

## Future Enhancements

- [ ] Provider API documentation auto-parser
- [ ] Automatic balance alert thresholds
- [ ] Scheduled sync with cron jobs
- [ ] Provider uptime monitoring
- [ ] Service price history tracking
- [ ] Multi-provider failover support
- [ ] API response caching
- [ ] Bulk provider import from CSV
