

## Plan: Fix Admin Withdrawal Balance Display and Address Historical Balance Issues

### Problem Analysis

I investigated the database and code and found **two distinct issues**:

**Issue 1: Admin Withdrawal Page Shows Confusing Balances**
- The "Available Balance" column on the admin Withdrawals page shows the raw stored balance from `member_balances` table
- It does NOT subtract pending/approved withdrawals, making it appear that members are trying to withdraw their "entire balance"
- Example: Eniolade Funmi has ₦7,420 stored balance, but has ₦14,000 in approved withdrawals - the admin sees ₦7,420 as "available" which is misleading

**Issue 2: Historical Balance Corrections**
- The system correctly only deducts balances when withdrawals are marked as "completed" (actually paid out)
- Currently, many withdrawals are "approved" but NOT "completed" - meaning balance has not been deducted yet
- This is working as designed - the balance should only decrease when money actually leaves the account
- However, for validation purposes, the admin needs to see the TRUE available balance (after subtracting pending/approved withdrawals)

### Solution Overview

**Fix 1: Update Admin Withdrawals Page Balance Display**
- Modify the admin Withdrawals page to fetch and subtract pending/approved withdrawals when showing "Available Balance"
- This ensures admin sees accurate available funds when approving/processing withdrawals

**Fix 2: No Automatic Historical Corrections Needed**
- The stored balance in `member_balances.total_commissions` is CORRECT - it represents total earnings
- The balance should only be deducted when admin marks a withdrawal as "completed" (paid)
- Once admin clicks "Mark as Paid" on the approved withdrawals, the database trigger will correctly deduct the amounts

### Technical Changes

#### File: `src/pages/admin/Withdrawals.tsx`

**Current Issue (lines 37-60):**
```javascript
// Only fetches raw balance from member_balances
const { data: balance } = await supabase
  .from('member_balances')
  .select('total_savings, total_capital, total_commissions, total_dividends')
  .eq('member_id', memberId)
  .single();
```

**Fix:**
After fetching balances, also fetch pending/approved withdrawals for each member and calculate true available amounts:

```javascript
// Fetch raw balance
const { data: balance } = await supabase
  .from('member_balances')
  .select('...')
  .eq('member_id', memberId)
  .single();

// Fetch pending/approved withdrawals by type
const { data: pendingWithdrawals } = await supabase
  .from('withdrawal_requests')
  .select('amount, withdrawal_type')
  .eq('member_id', memberId)
  .in('status', ['pending', 'approved']);

// Calculate pending amounts per type
const pendingSavings = pendingWithdrawals?.filter(w => w.withdrawal_type === 'savings')...
const pendingCapital = pendingWithdrawals?.filter(w => w.withdrawal_type === 'capital')...
const pendingDividends = pendingWithdrawals?.filter(w => w.withdrawal_type === 'dividend')...
const pendingBonuses = pendingWithdrawals?.filter(w => w.withdrawal_type === 'bonus')...

// Return true available balances
return {
  ...withdrawal,
  balances: {
    savings: (balance?.total_savings || 0) - pendingSavings,
    capital: (balance?.total_capital || 0) - pendingCapital,
    dividend: (balance?.total_dividends || 0) - pendingDividends,
    bonus: (balance?.total_commissions || 0) - pendingBonuses
  }
};
```

### Workflow Clarification

The correct workflow for withdrawals is:
1. Member requests withdrawal - balance display decreases (visual only, stored balance unchanged)
2. Admin approves withdrawal - status changes to "approved" 
3. Admin processes payment externally (bank transfer)
4. Admin clicks "Mark as Paid" - status changes to "completed", database trigger deducts from stored balance

### Files to Modify
- `src/pages/admin/Withdrawals.tsx` - Fix the "Available Balance" calculation to show true available amount

### Expected Result
- Admin will see accurate available balances that account for all pending/approved withdrawals
- The "Insufficient" warning will correctly trigger when a member doesn't have enough funds
- When admin marks withdrawals as "completed", balances will be properly deducted by the existing database trigger

