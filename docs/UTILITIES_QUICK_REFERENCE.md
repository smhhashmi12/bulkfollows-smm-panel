# Quick Reference: New Utilities & Hooks

## 🎯 Validation Layer

### Installation
```bash
npm install zod
```

### Using Request Validation
```javascript
import express from 'express';
import { validateRequest, schemas } from '../lib/validation.js';

const router = express.Router();

// Apply validation middleware
router.post('/create-order', 
  validateRequest(schemas.createOrderSchema),
  async (req, res) => {
    // req.validatedBody is guaranteed valid
    const { paymentId, amount, customerEmail, customerName, returnUrl, cancelUrl } = req.validatedBody;
    // ... rest of logic
  }
);
```

### Creating Custom Schemas
```javascript
import { z } from 'zod';
import { validateRequest } from '../lib/validation.js';

// Define schema
const myCustomSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
  tags: z.array(z.string()).optional(),
});

// Add to schemas export
export const schemas = {
  // ... existing schemas
  myCustomSchema,
};

// Use in routes
router.post('/endpoint', validateRequest(schemas.myCustomSchema), async (req, res) => {
  const { userId, email, age, tags } = req.validatedBody;
  // ... logic
});
```

---

## 📤 API Response Wrapper

### Standard Response Usage
```javascript
import { 
  successResponse, 
  errorResponse, 
  asyncHandler,
  paginatedResponse 
} from '../lib/apiResponse.js';

// Success response
router.get('/data', async (req, res) => {
  const data = await fetchData();
  return res.json(successResponse(data));
});

// Error response
router.post('/operation', async (req, res) => {
  try {
    // ... logic
  } catch (error) {
    return res.status(500).json(
      errorResponse('OPERATION_FAILED', 'Failed to complete operation', error.message)
    );
  }
});

// Paginated response
router.get('/users', async (req, res) => {
  const page = parseInt(req.query.page || '1');
  const pageSize = 20;
  const { data, total } = await getUsersPaginated(page, pageSize);
  return res.json(paginatedResponse(data, page, pageSize, total));
});

// Async handler wraps try-catch automatically
router.post('/endpoint', asyncHandler(async (req, res) => {
  // Errors automatically caught and passed to error handler
  throw new Error('Something went wrong');
}));
```

### Global Error Handler Setup
```javascript
// In server/index.js (after all routes)
import { errorHandler } from './lib/apiResponse.js';

// ... all route definitions ...

// Global error handler MUST be last
app.use(errorHandler);
```

---

## 🪝 Custom Hooks

### useChat Hook
```typescript
import { useChat } from '../hooks/useChat';

const MyComponent: React.FC = () => {
  const user = useSessionUser();
  const chat = useChat(user?.id);

  return (
    <div>
      {/* Display platforms */}
      {chat.channels && Object.keys(chat.channels).map(platformId => (
        <button 
          key={platformId}
          onClick={() => chat.setActivePlatform(platformId)}
          disabled={chat.loadingChannels}
        >
          {platformId}
        </button>
      ))}

      {/* Show loading state */}
      {chat.loadingMessages && <LoadingSpinner />}

      {/* Display messages */}
      {chat.messages.map(msg => (
        <MessageItem key={msg.id} message={msg} />
      ))}

      {/* Error display */}
      {chat.error && <ErrorAlert message={chat.error} />}

      {/* Input form */}
      <textarea 
        value={chat.draft} 
        onChange={e => chat.setDraft(e.target.value)}
        placeholder="Type message..."
      />
      <button 
        onClick={() => chat.sendMessage(chat.draft)}
        disabled={chat.sending || chat.isClosed}
      >
        {chat.sending ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
};
```

### useChatSocket Hook
```typescript
import { useChatSocket } from '../hooks/useChatSocket';

const WebSocketComponent: React.FC = () => {
  const socket = useChatSocket('channel-123');

  useEffect(() => {
    if (!socket.isConnected) return;

    // Listen for messages
    if (socket.socket) {
      socket.socket.addEventListener('message', (event) => {
        console.log('Received:', event.data);
      });
    }
  }, [socket.isConnected, socket.socket]);

  const handleSend = () => {
    const sent = socket.send(JSON.stringify({ type: 'message', text: 'Hello' }));
    if (!sent) {
      console.error('Failed to send message - not connected');
    }
  };

  return (
    <div>
      <div>Connected: {socket.isConnected ? '✓' : '✗'}</div>
      {socket.connectionError && <div>Error: {socket.connectionError}</div>}
      <button onClick={handleSend} disabled={!socket.isConnected}>Send</button>
    </div>
  );
};
```

---

## 🎨 Error Boundary Component

### Basic Usage
```typescript
import ErrorBoundary from '../components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        {/* Your routes */}
      </Router>
    </ErrorBoundary>
  );
}
```

### Custom Fallback UI
```typescript
const CustomErrorFallback = () => (
  <div className="error-container">
    <h1>Oops! Something went wrong</h1>
    <p>Our team has been notified. Please try again.</p>
  </div>
);

function App() {
  return (
    <ErrorBoundary fallback={<CustomErrorFallback />}>
      <Dashboard />
    </ErrorBoundary>
  );
}
```

### With Error Tracking
```typescript
import ErrorBoundary from '../components/ErrorBoundary';
import { reportErrorToSentry } from '../lib/errorTracking';

function App() {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    reportErrorToSentry(error, errorInfo);
  };

  return (
    <ErrorBoundary onError={handleError}>
      <YourApp />
    </ErrorBoundary>
  );
}
```

---

## ⏳ Skeleton Screens

### Individual Skeleton Loader
```typescript
import { SkeletonLoader } from '../components/Skeletons';

<SkeletonLoader width="w-full" height="h-6" rounded />
<SkeletonLoader width="w-1/2" height="h-4" rounded className="mt-2" />
```

### Pre-made Skeletons with Suspense
```typescript
import { DashboardSkeleton, ServicesSkeleton, ProfileSkeleton } from '../components/Skeletons';

// Dashboard loading
<Suspense fallback={<DashboardSkeleton />}>
  <DashboardContent />
</Suspense>

// Services loading
<Suspense fallback={<ServicesSkeleton />}>
  <ServicesList />
</Suspense>

// Profile loading
<Suspense fallback={<ProfileSkeleton />}>
  <UserProfile />
</Suspense>
```

### Custom Skeleton
```typescript
import { SkeletonLoader } from '../components/Skeletons';

const LoginFormSkeleton = () => (
  <div className="space-y-4">
    <SkeletonLoader width="w-full" height="h-10" rounded />
    <SkeletonLoader width="w-full" height="h-10" rounded />
    <SkeletonLoader width="w-full" height="h-12" rounded />
  </div>
);

<Suspense fallback={<LoginFormSkeleton />}>
  <LoginForm />
</Suspense>
```

---

## 🔌 Common Patterns

### Creating a Validating API Endpoint
```javascript
import { validateRequest, schemas } from '../lib/validation.js';
import { successResponse, errorResponse, asyncHandler } from '../lib/apiResponse.js';

router.post('/api/orders/create',
  validateRequest(schemas.createOrderSchema),
  asyncHandler(async (req, res) => {
    const { paymentId, amount, customerEmail } = req.validatedBody;

    // Create order
    const order = await createOrder({
      paymentId,
      amount,
      customerEmail,
    });

    return res.json(successResponse(order, { orderId: order.id }));
  })
);
```

### Handling Paginated Lists
```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [page, setPage] = useState(1);
const [total, setTotal] = useState(0);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    const response = await fetch(`/api/items?page=${page}`);
    const json = await response.json();
    
    if (json.success) {
      setData(json.data);
      setTotal(json.meta?.total || 0);
    }
    setLoading(false);
  };
  
  fetchData();
}, [page]);

return (
  <div>
    {loading && <TableSkeleton rows={10} />}
    {!loading && data.map(item => <ItemRow key={item.id} item={item} />)}
    <Pagination 
      page={page} 
      total={total} 
      onPageChange={setPage} 
    />
  </div>
);
```

### Multi-Form Validation
```typescript
import { z } from 'zod';
import { validateRequest } from '../lib/validation.js';

const schemas = {
  step1: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  step2: z.object({
    company: z.string().min(1),
    role: z.string().min(1),
  }),
  step3: z.object({
    terms: z.boolean().refine(v => v === true, 'Must accept terms'),
  }),
};

// Apply different validation per route
router.post('/register/step1', validateRequest(schemas.step1), async (req, res) => {
  // step1 fields guaranteed valid
});

router.post('/register/step2', validateRequest(schemas.step2), async (req, res) => {
  // step2 fields guaranteed valid
});
```

---

## 🧪 Testing Utilities

### Testing Hooks
```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '../hooks/useChat';

describe('useChat', () => {
  it('loads channels on mount', async () => {
    const { result } = renderHook(() => useChat('user-123'));

    await waitFor(() => {
      expect(result.current.channels).toBeDefined();
    });
  });

  it('sends message correctly', async () => {
    const { result } = renderHook(() => useChat('user-123'));

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.draft).toBe('');
  });
});
```

### Testing Validation
```typescript
import { schemas } from '../lib/validation';

describe('Validation Schemas', () => {
  it('validates create order', () => {
    const valid = {
      paymentId: 'uuid-string',
      amount: 100,
      customerEmail: 'test@example.com',
      customerName: 'John Doe',
      returnUrl: 'https://example.com/return',
      cancelUrl: 'https://example.com/cancel',
    };

    expect(() => schemas.createOrderSchema.parse(valid)).not.toThrow();
  });

  it('rejects invalid email', () => {
    const invalid = { ...valid, customerEmail: 'not-an-email' };
    expect(() => schemas.createOrderSchema.parse(invalid)).toThrow();
  });
});
```

---

## 📋 Checklist for Integrating All Utilities

- [ ] Install Zod: `npm install zod`
- [ ] Add new files:
  - [ ] `server/lib/validation.js`
  - [ ] `server/lib/apiResponse.js`
  - [ ] `src/hooks/useChat.ts`
  - [ ] `src/hooks/useChatSocket.ts`
  - [ ] `src/components/ErrorBoundary.tsx`
  - [ ] `src/components/Skeletons.tsx`
- [ ] Update routes to use validation + asyncHandler
- [ ] Add global error handler to Express app
- [ ] Wrap App with ErrorBoundary
- [ ] Update tests for new hooks
- [ ] Update LiveChatWidget to use useChat hook
- [ ] Add skeleton screens to Suspense boundaries
- [ ] Test all flows end-to-end

---

**Last Updated**: March 11, 2026
