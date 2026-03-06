# Quick Reference: Order Placement UI Update

## What Changed?

### Visual Layout

**BEFORE:**
```
Title: "New Order"
│
├─ Buttons Row: [All Services] [Instagram] [TikTok] [YouTube] ...
│  (Category selection as pill buttons)
│
├─ Main Content Area (Left):
│  ├─ Service Selection:
│  │  └─ Multiple card buttons showing all services
│  ├─ Link Input
│  ├─ Quantity Input
│  ├─ Delivery Time Dropdown
│  ├─ Charge Breakdown Box
│  └─ Submit Button
│
└─ Sidebar (Right):
   └─ Service Details Panel (Sticky)
```

**AFTER:**
```
Title: "New Order"
Subtitle: "Select a platform and service..."
│
├─ Platform Icons Section (Grid):
│  │ [📋]  [📷]  [🎵]  [▶️]  [𝕏]  [👍]  [✈️]  [👻]  [🎵]  [📺]  [🌐]
│  └─ (All, Instagram, TikTok, YouTube, Twitter, Facebook, Telegram, Snapchat, Spotify, Twitch, Traffic)
│
├─ Form Section (2-column layout):
│  │
│  ├─ Left Column (Main Form):
│  │  ├─ Category Dropdown (Select category...)
│  │  ├─ Service Dropdown (Select service...)
│  │  ├─ Link Input (https://...)
│  │  ├─ Quantity Input (Min-Max)
│  │  ├─ Delivery Time Dropdown
│  │  ├─ Charge Breakdown (Dynamic)
│  │  └─ Submit Button
│  │
│  └─ Right Column (Sticky Sidebar):
│     └─ Service Details Panel
│        ├─ Service Name
│        ├─ Category
│        ├─ Rate/1000
│        ├─ Quantity Limits
│        ├─ Description
│        └─ Delivery Rate Multipliers (2.0x, 1.5x, 1.0x, 0.8x, 0.7x)
```

## Component Behavior

### 1. Platform Icon Section
```typescript
// Click on icon → Sets category → Filters services
[📷 Instagram] → Loads Instagram-specific services in dropdown
```

**Features:**
- Large emoji icons (3xl)
- Labels below icons (truncated on overflow)
- Hover color change based on platform
- Click to select = scale effect + accent color
- "All" button shows all services from all categories

### 2. Category Dropdown
```
<select>
  <option>Select a category...</option>
  <option>📷 Instagram</option>
  <option>🎵 TikTok</option>
  <option>▶️ YouTube</option>
  ...
</select>
```

**Changes when selected:**
- Service dropdown becomes enabled
- Shows only services from selected category
- Maintains selected service if it matches new category

### 3. Service Dropdown
```
<select>
  <option>Select a service...</option>
  <option>Instagram Page Likes + Followers [L0] • $0.15/1k</option>
  <option>Instagram Followers Cheap [Refill: 30D] • $0.20/1k</option>
  ...
</select>
```

**Shows:**
- Service name
- Rate per 1000
- Only services from selected category

### 4. Link Input
```
<input placeholder="https://www.instagram.com/username" />
```

**Validation:**
- URL format validation
- Required field

### 5. Quantity Input
```
<input type="number" min="100" max="1000000" />
Hint: "Min: 100 - Max: 1,000,000"
```

**Features:**
- Min/Max validation
- Shows limits below field
- Dynamic based on service selection

### 6. Delivery Time Dropdown
```
<select>
  <option value="6">⚡ 6 Hours (2x Price)</option>
  <option value="12">🔥 12 Hours (1.5x Price)</option>
  <option value="24" selected>✓ 24 Hours (Standard)</option>
  <option value="48">💰 48 Hours (0.8x Price)</option>
  <option value="72">💸 72 Hours (0.7x Price)</option>
</select>
```

**Default:** 24 hours (1.0x multiplier)

### 7. Charge Breakdown Box
```
Appears when: Service + Quantity both selected

┌────────────────────────────────┐
│ Service Rate:           $0.15/1k│
│ Quantity:               500     │
│ Time Multiplier:        1.0x    │
├────────────────────────────────┤
│ Charge              $0.075      │
└────────────────────────────────┘
```

**Calculation:**
```
charge = (quantity / 1000) * rate_per_1000 * time_multiplier
```

## File Changes

**Modified:** `pages/dashboard/NewOrder.tsx`

**Key Changes:**
1. Replaced horizontal button layout with vertical icon grid
2. Added dropdown selectors instead of inline service list
3. Removed separate "categories" memoization (now inline)
4. Enhanced platform mapping with icon/color metadata
5. Refactored JSX structure for cleaner layout
6. Improved accessibility with proper labels and hints

## Responsive Behavior

| Screen Size | Platform Icons | Form Layout | Sidebar |
|-----------|---|---|---|
| Mobile (< 768px) | Single row, scrollable horizontally | Full width, stacked | Below form |
| Tablet (768px+) | 2-3 rows, wrapped | 2-column grid | Right sticky |
| Desktop (1024px+) | Full grid, horizontal scroll | 2-column, spacious | Right sticky |

## Form State Flow

```
┌─ User Clicks Platform Icon
│  └─ Set selectedCategory
│     └─ Clear selectedService
│
┌─ Select Category via Dropdown
│  └─ Set selectedCategory
│     └─ Clear selectedService
│     └─ Enable Service dropdown
│
┌─ Select Service
│  └─ Set selectedService
│     └─ Show details in sidebar
│     └─ Update charge calculation
│
┌─ Enter Link & Quantity
│  └─ Calculate charge in real-time
│
┌─ Select Delivery Time
│  └─ Recalculate charge (apply multiplier)
│
┌─ Click Submit
│  └─ Validate all fields
│     └─ Create order via API
│     └─ Show success/error message
```

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Navigate between dropdowns/inputs |
| `Space` / `Enter` | Open dropdown, select option |
| `↓` / `↑` | Navigate dropdown options |
| `Esc` | Close dropdown |
| `Enter` | Submit form (when button focused) |

## CSS Classes Used

- **Tailwind Classes**:
  - `bg-brand-container` - Container background
  - `border-brand-border` - Border color
  - `text-brand-accent` - Accent text color
  - `text-brand-purple` - Purple text
  - `hover:text-*` - Color on hover
  - `shadow-purple-glow-sm` - Glow effect
  - `scale-110` - Scaling animation

## Accessibility Features

✅ Proper label associations (htmlFor)
✅ ARIA-friendly dropdown structure
✅ Color not sole differentiator (icons + text)
✅ Keyboard navigation support
✅ Clear error/success messages
✅ Form validation feedback

## Performance Notes

- Memoized service filtering (`useMemo`)
- Memoized category list
- Lazy load services on mount
- No unnecessary re-renders

## Testing Commands

```bash
# Start development
npm run dev:full

# Navigate to
http://localhost:3000/#/user/dashboard/new-order

# Test scenarios:
1. Click platform icons - should filter services
2. Select category dropdown - should same as icon click
3. Select service - sidebar should update
4. Enter quantity - charge should calculate
5. Change delivery time - charge should recalculate
6. Submit order - should create and show success
```
