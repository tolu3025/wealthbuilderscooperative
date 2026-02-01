
Goal
- Ensure members never see withdrawn funds “come back” on the Withdraw page.
- Ensure the system uses one consistent “paid-out” status so balances update correctly and consistently across member + admin views.
- Correct historical cases where withdrawals were paid out but balances were not reduced.

What’s happening (most likely root cause)
1) Status mismatch: “paid” vs “completed”
- Your member Withdraw page UI already checks for a “paid” status when rendering the badge, which strongly suggests that at some point withdrawals were being marked as "paid".
- But your database deduction logic (trigger function update_member_balance_on_withdrawal) only deducts when status becomes 'completed'.
- If a withdrawal is set to 'paid' (instead of 'completed'):
  - The balance-deduction trigger will not run (so member_balances won’t reduce).
  - Your Withdraw page currently subtracts only statuses ['pending','approved'] when calculating available balance.
  - Result: once a withdrawal moves to 'paid', it is no longer subtracted as “reserved”, and since member_balances didn’t reduce, the money appears to “come back”.

2) Duplicate DB triggers (high risk)
- Your database currently has TWO triggers on public.withdrawal_requests that both call update_member_balance_on_withdrawal().
- For non-bonus withdrawals (savings/capital/dividend), this can cause double-deductions when status changes to completed.
- Even if this isn’t the exact issue you’re seeing today, it is a correctness risk and should be fixed.

Plan of changes (implementation)

A) Database fixes (migration)
Purpose: normalize statuses, make deductions reliable, and remove duplicate triggers.

1) Remove the duplicate trigger
- Keep only one trigger on public.withdrawal_requests that calls update_member_balance_on_withdrawal().
- In the migration:
  - Drop one of:
    - trigger_update_balance_on_withdrawal
    - update_balance_on_withdrawal
  - Verify only one remains afterward.

2) Normalize historical status values
- Convert any existing withdrawal_requests.status = 'paid' to 'completed'.
- Important ordering:
  - Drop duplicate trigger first (to avoid double-deduction during normalization).
  - Then run the UPDATE status conversion.
- Benefit:
  - When rows change from 'paid' → 'completed', the remaining trigger will run and deduct balances properly (or recalc correctly for bonus).

3) (Optional but recommended) Make DB logic tolerant to “paid” going forward
Even after normalization, it’s safer to tolerate both values in case any legacy UI/ops still writes "paid".
- Update update_member_balance_on_withdrawal() to treat NEW.status IN ('completed','paid') as “paid-out”.
- Also update bonus recalculation queries inside it to subtract withdrawals where status IN ('completed','paid').

B) Frontend fixes (member Withdraw page + consistency)
Purpose: ensure the Withdraw page always reserves funds correctly even if the status differs.

1) Update reserved-withdrawal subtraction logic in src/pages/Withdraw.tsx
- Change the reserved withdrawals query from:
  - statuses: ['pending','approved']
- To:
  - statuses: ['pending','approved','paid']  (or if you decide to fully standardize, use only pending+approved but also update the UI + DB to never create 'paid' again)
- This prevents “funds coming back” if any row ends up with status 'paid'.

2) Fix the status badge mapping in src/pages/Withdraw.tsx
- Right now the member UI specifically highlights request.status === 'paid' but not 'completed'.
- Update so that:
  - 'completed' displays as “Paid” (or “Completed”) in the UI
  - 'paid' (if it exists) also displays as “Paid”
- This avoids confusion for members and makes it obvious when a withdrawal is truly paid out.

3) (Quick consistency sweep) Ensure other member balance displays won’t reintroduce confusion
- Dashboard.tsx currently subtracts pending-only for savings/capital/commissions, and uses a mixed logic for dividends.
- This isn’t your current complaint, but after we fix Withdraw.tsx, members may still report “balance didn’t reduce” on Dashboard.
- We will align Dashboard’s reserved subtraction to include pending + approved (and optionally paid) for all relevant balance types, so member-facing pages agree.

C) Verification / testing checklist (end-to-end)
We will test these exact scenarios:

1) “Reserved funds” scenario
- Member has ₦4,000 available (pick any balance type you use for testing, e.g., bonus).
- Member requests ₦2,000 withdrawal.
Expected:
- Member Withdraw page immediately shows available reduced by ₦2,000.
- Admin Withdrawals list shows Requested Amount = ₦2,000.
- Member cannot request more than the remaining available amount.

2) Approval scenario
- Admin approves that ₦2,000 request.
Expected:
- Member Withdraw page still shows the ₦2,000 reserved (still reduced).
- No “come back”.

3) Paid-out scenario
- Admin marks the withdrawal as paid (status should become 'completed' after our standardization).
Expected:
- member_balances is reduced (or total_commissions recalculated for bonus).
- Member Withdraw page remains correct after refresh.
- Member history shows status “Paid/Completed” correctly.

4) Historical correction scenario
- Identify a member who previously got paid out but balance stayed intact.
- After migration runs:
  - Their withdrawal rows should be normalized (paid → completed).
  - Their balance should reflect deductions accordingly.

Notes / risks
- The duplicate trigger is a serious hidden risk: it can double-deduct for savings/capital/dividend. Fixing it is a prerequisite before any status-normalization update that would fire triggers in bulk.
- Because you said the issue happens on “Published (live)” too, after we implement in Test, you’ll need to publish for Live to pick up frontend changes. The DB migration will apply to the connected Supabase project; we’ll be careful with ordering.

Files / resources impacted
- Frontend
  - src/pages/Withdraw.tsx (reserved balance query + status badge mapping)
  - src/pages/Dashboard.tsx (recommended consistency alignment)
- Database (Supabase migration)
  - Drop duplicate trigger on public.withdrawal_requests
  - Normalize status values ('paid' → 'completed')
  - Update function update_member_balance_on_withdrawal to treat 'paid' as completed (optional but recommended)

Acceptance criteria
- A withdrawal of ₦2,000 never displays as if ₦4,000 was withdrawn on the member Withdraw page.
- Once a withdrawal is paid out, the member’s available balance does not “come back” after refresh.
- Historical “paid but not deducted” members are corrected by the migration.
