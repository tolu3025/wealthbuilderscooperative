

# Fix: Admin Withdrawal Approval Validation + Data Cleanup

## Summary of Findings

### 1. Members with Duplicate Approved Withdrawals (6 total)

| Member | Member # | Stored Balance | Request 1 | Request 2 | Total Reserved | Overdraft |
|--------|----------|----------------|-----------|-----------|----------------|-----------|
| Eniolade Funmi | WB2557648 | ₦7,480 | ₦7,000 (Jan 27) | ₦7,000 (Jan 30) | ₦14,000 | **-₦6,520** |
| Abimbola Afeola | WB2594160 | ₦4,150 | ₦4,150 (Jan 27) | ₦4,150 (Jan 30) | ₦8,300 | **-₦4,150** |
| Joshua Dele Dipe | WB2538289 | ₦1,180 | ₦1,100 (Jan 27) | ₦1,180 (Jan 30) | ₦2,280 | **-₦1,100** |
| Oluwafunke Dipe | WB2545551 | ₦1,120 | ₦1,100 (Jan 27) | ₦1,120 (Jan 30) | ₦2,220 | **-₦1,100** |
| Joshua Okiki Adigun | WB2514861 | ₦1,090 | ₦1,000 (Jan 27) | ₦1,090 (Jan 30) | ₦2,090 | **-₦1,000** |
| James Juwon Adigun | WB2531850 | ₦1,060 | ₦1,000 (Jan 27) | ₦1,060 (Jan 30) | ₦2,060 | **-₦1,000** |

### 2. Root Cause in Admin Code

The current `approveWithdrawal` function in `src/pages/admin/Withdrawals.tsx` validates against **raw database balance** without accounting for other pending/approved withdrawals:

```typescript
// Current problematic code (lines 117-138)
if (withdrawalType === 'bonus') {
  if (amount > bonusBalance) {  // bonusBalance = raw total_commissions
    throw new Error('Insufficient bonus balance');
  }
}
```

This allows approving multiple requests that together exceed the balance.

## Solution - Two Parts

### Part A: Fix Admin Validation Logic

Update the `approveWithdrawal` function to check the **true available balance** (raw balance minus already pending/approved withdrawals for that type):

```text
File: src/pages/admin/Withdrawals.tsx

1. Fetch all pending/approved withdrawals for the member (same type)
2. Calculate: trueAvailable = rawBalance - sumOfOtherPendingApproved
3. Validate: if (amount > trueAvailable) throw error
```

This prevents admins from approving a withdrawal if the total would exceed the balance.

### Part B: Manual Data Cleanup

The admin needs to reject the duplicate withdrawal requests. Based on the data, these are the requests that should be rejected (the second/later request for each member):

| Member | Request ID to REJECT | Amount |
|--------|---------------------|--------|
| Eniolade Funmi | `09d0e853-bb0e-42c5-9b3c-c101de7e33be` | ₦7,000 |
| Abimbola Afeola | `6b05778c-8b46-4d5c-9683-62e234bcd706` | ₦4,150 |
| Joshua Dele Dipe | `3ff8bfc1-5460-47a5-9782-76da52c51aee` | ₦1,180 |
| Oluwafunke Dipe | `cb9b2a86-07d8-4a55-b5aa-f4bad12b8b03` | ₦1,120 |
| Joshua Okiki Adigun | `e9d7290f-3a55-47c6-b5ee-a74a07460962` | ₦1,090 |
| James Juwon Adigun | `6e819617-c141-4f6a-81dd-b1710629f516` | ₦1,060 |

I can provide a database migration to reject these duplicate requests (change status from 'approved' to 'rejected'), OR the admin can manually go to the Admin Withdrawals page and use a "Reject" button (if available) or run a query.

## Implementation Details

### File Changes

**File: `src/pages/admin/Withdrawals.tsx`**

Update the `approveWithdrawal` function to validate against true available balance:

```typescript
const approveWithdrawal = async (withdrawalId: string, memberId: string, amount: number, withdrawalType: string = 'savings') => {
  try {
    // ... existing profile fetch ...

    const { data: balance } = await supabase
      .from('member_balances')
      .select('total_savings, total_capital, total_commissions, total_dividends, months_contributed')
      .eq('member_id', memberId)
      .single();

    if (!balance) throw new Error('Member balance not found');

    // NEW: Fetch all OTHER pending/approved withdrawals for this member and type
    // (excluding the current request being approved)
    const { data: otherReservedWithdrawals } = await supabase
      .from('withdrawal_requests')
      .select('amount')
      .eq('member_id', memberId)
      .eq('withdrawal_type', withdrawalType)
      .in('status', ['pending', 'approved', 'paid'])
      .neq('id', withdrawalId);  // Exclude the current request

    const otherReserved = otherReservedWithdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

    // Calculate TRUE available balance
    let rawBalance = 0;
    if (withdrawalType === 'savings') rawBalance = balance.total_savings || 0;
    else if (withdrawalType === 'capital') rawBalance = balance.total_capital || 0;
    else if (withdrawalType === 'dividend') rawBalance = balance.total_dividends || 0;
    else if (withdrawalType === 'bonus') rawBalance = balance.total_commissions || 0;

    const trueAvailable = rawBalance - otherReserved;

    // Validate against TRUE available balance
    if (amount > trueAvailable) {
      throw new Error(`Insufficient ${withdrawalType} balance. Available: ₦${trueAvailable.toLocaleString()}, Requested: ₦${amount.toLocaleString()}`);
    }

    // Additional capital minimum check
    if (withdrawalType === 'capital') {
      if (trueAvailable - amount < 50000) {
        throw new Error('Cannot approve: Withdrawal would drop capital below ₦50,000 minimum');
      }
    }

    // ... rest of approval logic ...
  }
}
```

### Optional: Database Migration to Reject Duplicate Requests

If you prefer to auto-fix the data, I can create a migration that:
1. Sets status = 'rejected' for the duplicate withdrawal requests listed above
2. This will immediately fix the negative balance display

## Expected Results After Fix

1. Dashboard and Referrals page will show correct available balances (not negative)
2. Admins cannot approve withdrawals that would exceed available balance
3. The 6 affected members will see their correct available balance after duplicates are rejected

## Files to Modify

- `src/pages/admin/Withdrawals.tsx` - Update `approveWithdrawal` validation logic

## Optional Database Cleanup

If you want me to include a migration to reject the duplicate requests, let me know. Otherwise, the admin can manually reject them from the Withdrawals page (if a reject option exists) or via Supabase dashboard.

