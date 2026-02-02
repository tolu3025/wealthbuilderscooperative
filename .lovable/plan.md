
# Fix: Inconsistent Balance Display Between Dashboard and Referrals Page

## Problem Identified
The Dashboard and Referrals page are using **different calculation methods** for the same balance:

| Page | What It Shows | Calculation |
|------|--------------|-------------|
| Dashboard | ₦0 | `member_balances.total_commissions - pending/approved withdrawals` (with Math.max(0)) |
| Referrals | ₦7,480 | `member_balances.total_commissions` (raw, no deductions) |

This creates confusion because users see different numbers on different pages for the same "Available Balance."

## Root Cause
The Referrals page (`src/pages/member/Referrals.tsx`) directly uses the database value without accounting for reserved (pending/approved) withdrawals:

```typescript
// Current code in Referrals.tsx (line 146)
setAvailableBalance(balance?.total_commissions || 0);
```

Meanwhile, the Dashboard correctly subtracts reserved withdrawals:
```typescript
// Dashboard.tsx (lines 194-196, 212)
const reservedBonusWithdrawals = allWithdrawals
  ?.filter(w => w.withdrawal_type === 'bonus' && ['pending', 'approved', 'paid'].includes(w.status))
  .reduce((sum, w) => sum + Number(w.amount), 0) || 0;

const availableCommissions = Math.max(0, totalCommissions - reservedBonusWithdrawals);
```

## Solution

Update the Referrals page to match the Dashboard's calculation by:
1. Fetching pending/approved/paid bonus withdrawals
2. Subtracting them from the raw balance
3. Using `Math.max(0, ...)` to prevent negative display

### File Changes

**File: `src/pages/member/Referrals.tsx`**

Update the `fetchReferralData` function to subtract reserved withdrawals from the available balance:

```typescript
// After getting withdrawalData, update the query to include ALL reserved statuses
const { data: withdrawalData } = await supabase
  .from('withdrawal_requests')
  .select('amount, status')
  .eq('member_id', profile.id)
  .eq('withdrawal_type', 'bonus')
  .in('status', ['pending', 'approved', 'paid', 'completed']);

// Calculate reserved withdrawals (pending + approved + paid - not yet permanently deducted)
const reservedWithdrawals = withdrawalData
  ?.filter(w => ['pending', 'approved', 'paid'].includes(w.status))
  .reduce((sum, w) => sum + Number(w.amount), 0) || 0;

// Get raw balance from database
const { data: balance } = await supabase
  .from('member_balances')
  .select('total_commissions')
  .eq('member_id', profile.id)
  .maybeSingle();

// Calculate available balance = raw balance - reserved withdrawals
const rawBalance = balance?.total_commissions || 0;
setAvailableBalance(Math.max(0, rawBalance - reservedWithdrawals));
```

## Expected Result
After this fix:
- Both the Dashboard and Referrals page will show the same "Available Balance" value
- Reserved funds (pending/approved withdrawals) will be correctly subtracted on both pages
- Users will see consistent information across the application

## Technical Details

### Current Flow (Broken)
```
member_balances.total_commissions = ₦7,480
Reserved bonus withdrawals = ₦7,000 + ₦7,000 = ₦14,000

Dashboard: Math.max(0, 7480 - 14000) = ₦0
Referrals: 7480 (raw) = ₦7,480  ← WRONG
```

### After Fix
```
member_balances.total_commissions = ₦7,480
Reserved bonus withdrawals = ₦14,000

Dashboard: Math.max(0, 7480 - 14000) = ₦0
Referrals: Math.max(0, 7480 - 14000) = ₦0  ← CORRECT
```

## Testing Checklist
After implementation:
1. Verify Dashboard and Referrals page show the same available balance
2. Verify a member with no pending withdrawals sees their full balance on both pages
3. Verify a member with pending withdrawals sees the reduced balance on both pages
