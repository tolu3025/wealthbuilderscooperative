

## Plan: Fix Member Withdrawal Page Balance Calculation

### Problem Identified
The member's Withdraw page (`src/pages/Withdraw.tsx`) only subtracts **pending** withdrawals from the displayed balance. It should also subtract **approved** withdrawals to match the admin dashboard behavior and ensure consistency.

**Current code (line 99):**
```javascript
.eq('status', 'pending');  // Only subtracts pending
```

**Should be:**
```javascript
.in('status', ['pending', 'approved']);  // Subtract both pending AND approved
```

### Why This Matters
- When a withdrawal is approved but not yet paid (completed), that money is still "reserved"
- The member should not be able to request a second withdrawal for the same funds
- The admin dashboard already correctly subtracts both pending and approved withdrawals
- This fix ensures the member sees the same "true available balance" as the admin

### Technical Change

**File:** `src/pages/Withdraw.tsx`

**Line 99 - Change from:**
```javascript
.eq('status', 'pending');
```

**To:**
```javascript
.in('status', ['pending', 'approved']);
```

**Line 94-95 - Update comment:**
```javascript
// Fetch pending AND approved withdrawal requests to subtract from available balance
const { data: pendingWithdrawals } = await supabase
```

### Files to Modify
- `src/pages/Withdraw.tsx` - Update withdrawal query to include both pending and approved statuses

### Expected Result
After this fix:
- Member sees accurate available balance (total earned minus pending minus approved withdrawals)
- Member cannot request withdrawal for funds that are already in an approved withdrawal
- Balance display is consistent between member page and admin page

