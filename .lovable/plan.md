

## Plan: Update Balance Display to Reflect Pending Withdrawals Immediately

### Problem Summary
When a member requests a withdrawal, the balance shown on dashboard and other pages doesn't change immediately. The user expects the available balance to decrease right away when a withdrawal is requested, showing that amount as "pending."

### Current Behavior
- **Dashboard**: Shows dividend balance without subtracting pending withdrawals
- **Withdraw page**: Shows balances directly from database without accounting for pending withdrawals
- **Dividends page**: Correctly subtracts pending withdrawals from available balance

### Proposed Solution
Update all balance displays to subtract pending withdrawals from the available balance. This gives members accurate feedback that their requested amount is "reserved" and cannot be withdrawn again.

### Changes Required

#### 1. Update Dashboard.tsx Balance Calculation
**File:** `src/pages/Dashboard.tsx`

Update the dividend withdrawal query (around line 177-182) to:
- Fetch ALL pending + approved + completed withdrawals
- Subtract ALL of them from the total earned amount

Also add similar logic for:
- Commission/bonus balance (subtract pending bonus withdrawals)
- Savings balance (subtract pending savings withdrawals)
- Capital balance (subtract pending capital withdrawals)

#### 2. Update Withdraw.tsx Balance Display
**File:** `src/pages/Withdraw.tsx`

After fetching `member_balances`, also fetch pending withdrawal requests by type and subtract them:
- Pending savings withdrawals from total_savings
- Pending capital withdrawals from total_capital  
- Pending dividend withdrawals from total_dividends
- Pending bonus withdrawals from total_commissions

This ensures the form shows accurate "available to withdraw" amounts.

#### 3. Add Pending Amount Display (Optional Enhancement)
Show a small note under each balance card indicating how much is pending, for example:
- "₦50,000 (₦5,000 pending)"

This provides transparency about what's reserved vs. available.

### Technical Details

**Dashboard.tsx changes:**
```javascript
// Fetch all withdrawals including pending
const { data: allWithdrawals } = await supabase
  .from('withdrawal_requests')
  .select('amount, status, withdrawal_type')
  .eq('member_id', profile.id)
  .in('status', ['pending', 'approved', 'completed']);

// Calculate pending and completed separately per type
const pendingDividendWithdrawals = allWithdrawals
  ?.filter(w => w.withdrawal_type === 'dividend' && w.status === 'pending')
  .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
  
const completedDividendWithdrawals = allWithdrawals
  ?.filter(w => w.withdrawal_type === 'dividend' && ['approved', 'completed'].includes(w.status))
  .reduce((sum, w) => sum + Number(w.amount), 0) || 0;

// Available = earned - completed - pending
const availableDividends = totalDividendsEarned - completedDividendWithdrawals - pendingDividendWithdrawals;
```

**Withdraw.tsx changes:**
```javascript
// After fetching member_balances, also fetch pending withdrawals
const { data: pendingWithdrawals } = await supabase
  .from('withdrawal_requests')
  .select('amount, withdrawal_type')
  .eq('member_id', profileData.id)
  .eq('status', 'pending');

// Calculate pending amounts per type
const pendingSavings = pendingWithdrawals
  ?.filter(w => w.withdrawal_type === 'savings')
  .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
  
// Subtract from displayed balances
setTotalSavings(savings - pendingSavings);
```

### Files to Modify
1. `src/pages/Dashboard.tsx` - Update dividend and commission balance calculations
2. `src/pages/Withdraw.tsx` - Subtract pending withdrawals from all balance types

### Expected Result
After implementation:
- When a member requests a withdrawal, the balance will immediately decrease
- The "Pending" card already shown on Dividends page provides visibility into reserved amounts
- Members cannot request more than their true available balance (accounting for pending)

