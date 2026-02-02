

# Fix: Available Balance Calculation Including Current Request

## Problem Identified

The Admin Withdrawals page is showing **₦0 Insufficient** for all withdrawal requests, causing the Approve button to be disabled. However, these members **do have sufficient funds** - the calculation is wrong.

### What's Happening

| Member | Stored Balance | Current Request | Code Calculates | Should Be |
|--------|---------------|-----------------|-----------------|-----------|
| Eniolade Funmi | ₦7,480 | ₦7,480 | ₦7,480 - ₦7,480 = **₦0** | ₦7,480 |
| Abimbola Afeola | ₦4,150 | ₦4,150 | ₦4,150 - ₦4,150 = **₦0** | ₦4,150 |
| Joshua Dipe | ₦1,180 | ₦1,100 | ₦1,180 - ₦1,100 = **₦80** | ₦1,180 |

### Root Cause

In `src/pages/admin/Withdrawals.tsx` (lines 49-54), when calculating the available balance for each withdrawal request, the code fetches ALL pending/approved withdrawals for the member - **including the current withdrawal request being displayed**.

```typescript
// Current buggy code (line 50-54)
const { data: allMemberWithdrawals } = await supabase
  .from('withdrawal_requests')
  .select('amount, withdrawal_type')
  .eq('member_id', memberId)
  .in('status', ['pending', 'approved']);
// ^ This includes the CURRENT withdrawal, making available = 0
```

The balance should represent what's available **for this specific request**, which means we should exclude the current request from the calculation.

## Solution

Update the query to **exclude the current withdrawal ID** when calculating other reserved withdrawals:

```typescript
// Fixed code - exclude current withdrawal
const { data: allMemberWithdrawals } = await supabase
  .from('withdrawal_requests')
  .select('amount, withdrawal_type')
  .eq('member_id', memberId)
  .in('status', ['pending', 'approved'])
  .neq('id', withdrawal.id);  // <-- ADD THIS LINE
```

This way:
- Eniolade's request (₦7,480) will show Available = ₦7,480 - ₦0 (no OTHER requests) = **₦7,480**
- The Approve button will be enabled

## Implementation

### File: `src/pages/admin/Withdrawals.tsx`

Update the `fetchPendingWithdrawals` function to pass the current withdrawal ID and exclude it from the reserved calculation:

**Lines 49-54** - Add `.neq('id', withdrawal.id)` to exclude the current request:

```typescript
// Fetch ALL pending/approved withdrawals for this member EXCEPT the current one
const { data: allMemberWithdrawals } = await supabase
  .from('withdrawal_requests')
  .select('amount, withdrawal_type')
  .eq('member_id', memberId)
  .in('status', ['pending', 'approved'])
  .neq('id', withdrawal.id);  // Exclude current withdrawal from calculation
```

## Expected Result After Fix

| Member | Stored Balance | Other Reserved | Available Balance | Approve Button |
|--------|---------------|----------------|-------------------|----------------|
| Eniolade Funmi | ₦7,480 | ₦0 | ₦7,480 | ENABLED |
| Abimbola Afeola | ₦4,150 | ₦0 | ₦4,150 | ENABLED |
| Joshua Dipe (WB2538289) | ₦1,180 | ₦0 | ₦1,180 | ENABLED |
| All others | Full Balance | ₦0 | Full Balance | ENABLED |

## Verification

The database confirms these members have actual balances:
- Eniolade Funmi: ₦7,480 stored, ₦7,480 pending request (should be approvable)
- Abimbola Afeola: ₦4,150 stored, ₦4,150 pending request (should be approvable)
- All duplicate requests from before have been correctly rejected

The issue is purely a display/calculation bug - members **do have sufficient funds**.

