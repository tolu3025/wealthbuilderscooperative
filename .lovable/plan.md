
# Fix: Negative Balance Display Issue

## Problem Identified
The negative balances are **NOT caused by the migration**. They're caused by **duplicate bonus withdrawal requests** that were approved by admin even though the totals exceed the member's actual balance.

### Evidence from Database Analysis

| Member | Stored Balance | Reserved Withdrawals | Displayed Balance |
|--------|---------------|---------------------|-------------------|
| Eniolade Funmi | ₦7,480 | ₦14,000 (2×₦7,000) | **₦-6,520** |
| Abimbola Afeola | ₦4,150 | ₦8,300 (2×₦4,150) | **₦-4,150** |
| Joshua Dele Dipe | ₦1,180 | ₦2,280 | **₦-1,100** |
| Oluwafunke Dipe | ₦1,120 | ₦2,220 | **₦-1,100** |
| Joshua Okiki Adigun | ₦1,090 | ₦2,090 | **₦-1,000** |
| James Juwon Adigun | ₦1,060 | ₦2,060 | **₦-1,000** |

### Root Cause
Each of these members submitted **two withdrawal requests** for roughly the same amount, and the admin approved both. Since neither has been marked as "completed" (paid out), the system correctly treats both as "reserved" funds, causing the negative display.

## Solution - Two Parts

### Part A: Immediate Data Fix (Database)
Delete or reject the **duplicate withdrawal requests** that were approved in error. For each affected member, one of the duplicate requests needs to be:
- Either marked as "rejected" (if not yet paid)
- Or deleted entirely

### Part B: Prevent Future Occurrences (Code Change)
1. **Member Withdrawal Page**: Add a check that prevents submitting a new request if it would result in a negative available balance
2. **Admin Approval Page**: Add a warning/blocker when approving a request that would exceed the member's actual balance
3. **Display Fix**: Use `Math.max(0, balance)` to prevent negative values from displaying (cosmetic fix while data is being cleaned)

## Implementation Details

### Database Fix (Manual Admin Action)
The admin needs to review and clean up the duplicate approved requests. Here are the duplicates:

```text
Eniolade Funmi:
- Request 1: ₦7,000 (Jan 27) - status: approved
- Request 2: ₦7,000 (Jan 30) - status: approved ← REJECT THIS ONE

Similar duplicates exist for the other 5 members listed above.
```

### Code Changes

**File: `src/pages/Withdraw.tsx`**
- Add validation to prevent new requests if pending+approved would exceed balance
- Show `Math.max(0, balance)` for display to avoid confusing users with negative numbers

**File: `src/pages/admin/Withdrawals.tsx`**
- Add a warning when approving a request that would cause overdraft
- Show the member's actual available balance (accounting for other pending/approved requests)

### Summary
The migration did NOT cause this issue. The duplicate approved withdrawals existed before. The code changes we made earlier (subtracting pending AND approved withdrawals) actually **revealed** the data problem that was always there. The fix is to clean up the bad data and add safeguards to prevent it from happening again.
