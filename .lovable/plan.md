
Goal
- ✅ Ensure members never see withdrawn funds "come back" on the Withdraw page.
- ✅ Ensure the system uses one consistent "paid-out" status so balances update correctly and consistently across member + admin views.
- ✅ Correct historical cases where withdrawals were paid out but balances were not reduced.

## COMPLETED CHANGES

### A) Database fixes (migration) ✅

1) ✅ Removed duplicate trigger
- Dropped `trigger_update_balance_on_withdrawal` 
- Kept only `update_balance_on_withdrawal` trigger on `public.withdrawal_requests`

2) ✅ Normalized historical status values
- Converted all `status = 'paid'` to `status = 'completed'` in `withdrawal_requests` table
- Trigger ran during migration to deduct balances properly

3) ✅ Made DB logic tolerant to "paid" going forward
- Updated `update_member_balance_on_withdrawal()` to treat `NEW.status IN ('completed','paid')` as "paid-out"
- Updated bonus recalculation queries to subtract withdrawals where `status IN ('completed','paid')`
- Updated `recalculate_member_commission_balances()` to also handle both statuses

### B) Frontend fixes ✅

1) ✅ Updated reserved-withdrawal subtraction logic in `src/pages/Withdraw.tsx`
- Changed from: `['pending','approved']`
- To: `['pending', 'approved', 'paid']`
- This prevents "funds coming back" if any row ends up with status 'paid'

2) ✅ Fixed status badge mapping in `src/pages/Withdraw.tsx`
- 'completed' now displays as "Paid" in the UI
- 'paid' (legacy) also displays as "Paid"

3) ✅ Updated `src/pages/Dashboard.tsx` for consistency
- Changed from pending-only subtraction to `['pending', 'approved', 'paid']` for all balance types
- Savings, Capital, Dividends, and Commissions all now consistently reserve funds

## Expected Result

After these fixes:
- ✅ Available balances accurately reflect all reserved funds (pending + approved + paid)
- ✅ Once a withdrawal is paid out, the member's available balance does not "come back" after refresh
- ✅ Historical cases where funds "came back" are corrected by status normalization
- ✅ Both 'completed' and 'paid' statuses are handled consistently

## Testing Checklist

Test these scenarios to verify:

1. **Reserved funds scenario**: Request a withdrawal → available balance should immediately decrease
2. **Approval scenario**: Admin approves → member's balance stays reduced
3. **Paid-out scenario**: Admin marks as completed → balance remains correct, status shows "Paid"
4. **Refresh test**: Refresh the page → withdrawn funds do NOT come back
