# Asset Manager Code Review

Date: September 30, 2026

## Review Context

- Detected scene: `repository-audit`
- Review boundary: the local Asset-Manager repository
- Source: existing checkout, including local changes
- Mode: repository snapshot
- Pipeline: General discovery -> ARC Policy Gate
- Reviewed commit: `c613cf7bbdb3b3a284a17031af1f34809010bcee`
- Intended use: a local, single-user personal application
- Routing evidence: a project-wide logic review was requested without a PR or commit range. The apparent working-tree changes were line-ending-only; `git diff --ignore-space-at-eol --stat` was empty.

This is an ARC-calibrated repository audit, not an MR review. Source links and line numbers refer to the reviewed snapshot.

## Code Review Summary

**Demo mode can modify real records, and settlement failures can leave transactions incorrectly marked paid.**

The review found **13 code-confirmed logic flaws**, including issues affecting ordinary single-user use.

- Candidate funnel: **16 generated -> 3 filtered -> 13 reported**
- Filter reasons: one suspected path prevented by current callers; two candidates lacked sufficient evidence about external spreadsheet data or formulas.
- Severity bands: **5 findings at 8-10; 8 findings at 5-7**
- TD/PRD: none supplied
- No application source or live records were changed during the review.

Severity uses ARC's 1-10 scale. For this local application, the highest-priority findings concern stored-record integrity rather than multi-user or production-scale requirements.

## Complete Candidate Ledger

| Candidate | Final Status | Evidence / Code Path | Decision Reason |
|---|---|---|---|
| C1: Conditional-hook crash | Filtered | [AppWorkspace loading branch](components/layout/AppWorkspace.tsx#L186) -> `MoneyManager` | The parent unmounts the manager during loading, and current callers supply a non-null fallback afterward. They prevent the suspected hook-count transition. |
| C2: Recurring entries post late | Code-confirmed | [processAutoDebitOccurrences](app/actions.ts#L383) -> `getDueOccurrences` | The midnight cutoff excludes occurrences represented at noon on the same day. |
| C3: Deleted recurrence returns | Code-confirmed | [Deletion](app/actions.ts#L984) -> refresh -> [recurrence processor](app/actions.ts#L403) | Deletion removes the only occurrence-deduplication marker. |
| C4: Schedule edits duplicate history | Code-confirmed | [Rule update](app/actions.ts#L1241) -> historical occurrence scan | Changed dates create new keys for months that already have posted charges. |
| C5: Partial settlement persists | Code-confirmed | [settleCreditCardBill](app/actions.ts#L1055) | Charges are updated before the payment transfer is appended, without rollback on failure. |
| C6: Payment deletion leaves charges settled | Code-confirmed | [deleteMoneyTransaction](app/actions.ts#L984) | Generic deletion does not reverse settlement metadata on the original charges. |
| C7: Expense assigned to wrong month | Code-confirmed | [MoneyManager monthly filtering](components/MoneyManager.tsx#L152) | The UI filters by purchase date, while the server recognizes settled card expenses by payment date. |
| C8: Demo writes real data | Code-confirmed | [Demo workspace](app/demo/page.tsx#L144) -> [shared forms](components/layout/AppWorkspace.tsx#L197) -> server actions | Demo mode reaches reads but not mutation calls. |
| C9: Failed reads appear as zero balances | Code-confirmed | [Fetch action fallback](app/actions.ts#L949) -> [Home.fetchData](app/page.tsx#L190) | Errors become empty datasets without a visible failed-sync state. |
| C10: Default dates use UTC | Code-confirmed | [Transaction form defaults](components/MoneyManager/AddMoneyModal.tsx#L23) and other date forms | Local early-morning entries default to the previous calendar date in Malaysia. |
| C11: Refresh erases drafts | Code-confirmed | Poll -> new arrays -> [modal initialization effect](components/MoneyManager/AutoDebitModal.tsx#L47) | Fresh data references reset an open auto-debit form. |
| C12: Empty accounts cannot record history | Code-confirmed | [validExpenseAccounts](components/MoneyManager/AddMoneyModal.tsx#L37) | Current balance controls account eligibility even for backdated expense entries. |
| C13: Concurrent refresh duplicates debits | Code-confirmed | [Read/local deduplication](app/actions.ts#L386) -> [append](app/actions.ts#L440) | Two requests can independently append the same occurrence. |
| C14: Default login cannot pass validation | Code-confirmed | [LockScreen](app/page.tsx#L85) | Numeric-only input validation rejects the alphabetic fallback password. |
| C15: Accounting-format negatives misparsed | Filtered | [parseMoney](app/actions.ts#L155) | Actual sheet formatting is unavailable; use of parentheses-format negative values was not established. |
| C16: Portfolio P/L denominator suspect | Filtered | [getPortfolioData](app/actions.ts#L653) -> `Portfolio` sheet | The meaning of the external "Total Invested" formula is unverified; demo arithmetic was excluded as mock data. |

## Findings

| ID | Severity | Confidence | Validation Scope | Category | File and Lines | Summary |
|---|---:|---:|---|---|---|---|
| C8 | 9 | 1.00 | Code-confirmed | Logic Error | [components/layout/AppWorkspace.tsx:197-204](components/layout/AppWorkspace.tsx#L197) | Demo controls mutate live records |
| C5 | 8 | 1.00 | Code-confirmed | Error Handling | [app/actions.ts:1055-1066](app/actions.ts#L1055) | Failed settlement leaves paid charges |
| C6 | 8 | 1.00 | Code-confirmed | Logic Error | [app/actions.ts:984-990](app/actions.ts#L984) | Payment deletion leaves settlement metadata |
| C4 | 8 | 0.99 | Code-confirmed | Logic Error | [app/actions.ts:1241-1248](app/actions.ts#L1241) | Schedule changes duplicate historical charges |
| C13 | 8 | 0.99 | Code-confirmed | Concurrency | [app/actions.ts:386-391](app/actions.ts#L386) | Concurrent refresh duplicates auto-debits |
| C3 | 7 | 1.00 | Code-confirmed | Logic Error | [app/actions.ts:403-411](app/actions.ts#L403) | Deleted recurring entries reappear |
| C7 | 7 | 0.99 | Code-confirmed | Logic Error | [components/MoneyManager.tsx:152-160](components/MoneyManager.tsx#L152) | Card expenses use wrong month |
| C2 | 7 | 1.00 | Code-confirmed | Logic Error | [app/actions.ts:383-384](app/actions.ts#L383) | Auto-debits miss their scheduled day |
| C9 | 7 | 1.00 | Code-confirmed | Error Handling | [app/actions.ts:949](app/actions.ts#L949) | Failed reads become zero balances |
| C14 | 6 | 0.99 | Code-confirmed | Logic Error | [app/page.tsx:85-87](app/page.tsx#L85) | Default login fails input validation |
| C10 | 6 | 1.00 | Code-confirmed | Logic Error | [components/MoneyManager/AddMoneyModal.tsx:23](components/MoneyManager/AddMoneyModal.tsx#L23) | Default dates use UTC |
| C11 | 6 | 0.99 | Code-confirmed | Logic Error | [components/MoneyManager/AutoDebitModal.tsx:54-65](components/MoneyManager/AutoDebitModal.tsx#L54) | Background refresh clears unfinished forms |
| C12 | 6 | 0.98 | Code-confirmed | Logic Error | [components/MoneyManager/AddMoneyModal.tsx:37-42](components/MoneyManager/AddMoneyModal.tsx#L37) | Current balance blocks historical entries |

## Finding Details

### C8: Demo Controls Mutate Live Records

**Severity: 9 | Confidence: 1.00 | Scope: Code-confirmed | Category: Logic Error**

Demo reads pass `true` to the data-fetching actions, but shared forms and controls do not pass demo mode to mutation actions. Calls such as `deleteMoneyTransaction(tx.rowIndex)` use the default `forceDemo = false`.

With credentials configured, deleting the first demo transaction targets the real range `MM_Transactions!A1:N1`, including the header. Other shared create, edit, settlement, and funding controls also lack demo isolation.

**Exact evidence:** the isolated check loaded demo data, passed its first transaction's `rowIndex` to the existing delete action, and captured a clear operation against `MM_Transactions!A1:N1`.

**Correction:** disable mutation controls in the read-only demo, or isolate demo mutations from live actions throughout the component tree. Do not allow fabricated demo row indexes to reach live persistence.

### C5: Failed Settlement Leaves Paid Charges

**Severity: 8 | Confidence: 1.00 | Scope: Code-confirmed | Category: Error Handling**

`settleCreditCardBill` first updates the original charges using `Promise.all`, then separately appends the payment transfer. A failure between those operations leaves partially committed settlement state.

**Exact evidence:** a simulated transfer-append failure left the original charge marked `Settled` with zero payment transfers. Retrying returned `No unpaid credit card charges found for this card.`

**Correction:** commit the charge updates and payment record together, with an operation identifier for safe retries. A failed operation must not leave charges permanently settled without their corresponding payment record.

### C6: Payment Deletion Leaves Settlement Metadata

**Severity: 8 | Confidence: 1.00 | Scope: Code-confirmed | Category: Logic Error**

The activity list permits generic editing and deletion of payment transfers and settled charges. `deleteMoneyTransaction` clears only the selected row; it does not reverse settlement metadata on the original charges. Editing a settled charge can also make its amount differ from the recorded payment.

**Exact evidence:** after a successful settlement, deleting its payment-transfer row left the original charge marked `Settled`, with no remaining payment transfer.

**Correction:** reject generic edits and deletes for settlement entries and settled charges until a linked reversal/update operation is implemented. A proper reversal should update the payment and all associated charge metadata together.

### C4: Schedule Changes Duplicate Historical Charges

**Severity: 8 | Confidence: 0.99 | Scope: Code-confirmed | Category: Logic Error**

Updating a rule's monthly day retains its original `startDate`. The next refresh scans historical months again. Because deduplication uses the exact occurrence date, the revised date is treated as a new charge even when that month has already been posted.

The transaction editor's "future months" synchronization also changes `dayOfMonth` without establishing an effective date for the new schedule.

**Exact evidence:** changing a rule from day 15 to day 20 produced both September 15 and September 20 charges for the same rule and month.

**Correction:** give schedule changes an effective date and preserve historical schedule behavior. Prevent a revised schedule from creating another occurrence for an already-processed month unless the user explicitly requests an additional charge.

### C13: Concurrent Refresh Duplicates Auto-Debits

**Severity: 8 | Confidence: 0.99 | Scope: Code-confirmed | Category: Concurrency**

Each request constructs its own `existingKeys` from a previously read transaction snapshot. Checking that set and appending new rows are separate operations without shared serialization.

**Exact evidence:** two concurrent executions against the same initial snapshot appended two identical recurring charges.

This does not require multiple users. One person opening two browser tabs can create concurrent requests.

**Correction:** serialize the complete read/check/write operation per spreadsheet and reread the transactions inside the protected operation. The lock must cover all relevant request handlers in the local process, not only the final append.

### C3: Deleted Recurring Entries Reappear

**Severity: 7 | Confidence: 1.00 | Scope: Code-confirmed | Category: Logic Error**

The UI offers to delete only one generated occurrence while keeping its rule active. Clearing columns A:N removes `autoRuleId` and `autoOccurrenceDate`, which are the processor's deduplication evidence. The next refresh regenerates that entry even when the rule retains `lastProcessedOccurrence`.

**Exact evidence:** deleting a generated September 15 entry was immediately followed by a new append for September 15 when the recurrence processor ran again.

**Correction:** preserve a cancellation marker containing the rule and occurrence date. The recurrence processor must treat canceled occurrences as already handled rather than infer cancellation from a missing transaction row.

### C7: Card Expenses Use the Wrong Month

**Severity: 7 | Confidence: 0.99 | Scope: Code-confirmed | Category: Logic Error**

The frontend filters transactions into a month using `tx.date`, then includes settled card charges in expenses. The server uses `settledAt` as the recognition date for those charges. The two calculations therefore disagree when purchase and payment occur in different months.

**Exact evidence:** a RM100 purchase dated August 31, 2026, settled September 5, 2026, produced August expenses of RM100 and September expenses of RM0 in the source-extracted UI calculation.

**Correction:** separate activity-date filtering from expense-recognition filtering. Use the same recognition-date rule for monthly totals and spending breakdowns on both client and server.

### C2: Auto-Debits Miss Their Scheduled Day

**Severity: 7 | Confidence: 1.00 | Scope: Code-confirmed | Category: Logic Error**

The processor sets its cutoff to midnight:

```ts
today.setHours(0, 0, 0, 0);
```

Monthly occurrences are constructed at noon. Consequently, an occurrence on the current date fails the `occurrence <= today` comparison throughout that calendar day.

**Exact evidence:** a September 30 rule returned no due occurrences when processed with the September 30 midnight cutoff.

**Correction:** compare calendar dates or normalize the cutoff and occurrence dates to the same time. The scheduled date should become eligible on that date, not the following day.

### C9: Failed Reads Become Zero Balances

**Severity: 7 | Confidence: 1.00 | Scope: Code-confirmed | Category: Error Handling**

`getMoneyManagerData` turns any caught failure into a normal-looking empty dataset:

```ts
catch (error) { return defaultData; }
```

The page also catches individual fetch failures and replaces them with fallback data without setting an error. The result can look like a successful refresh showing empty accounts and zero balances.

**Exact evidence:** a simulated Sheets failure returned zero accounts, `totalBalance: 0`, and no error field.

**Correction:** propagate or explicitly represent fetch failures. Preserve the last successful data and display a failed-sync state instead of replacing valid balances with zeros.

### C14: Default Login Fails Input Validation

**Severity: 6 | Confidence: 0.99 | Scope: Code-confirmed | Category: Logic Error**

The password input uses:

```tsx
pattern="[0-9]*"
```

When `NEXT_PUBLIC_APP_PASSWORD` is absent, the fallback password is alphabetic. The form's numeric-only validation rejects that fallback, while a numeric input cannot equal it.

**Exact evidence:** the fallback value does not match the input's configured pattern.

**Correction:** align input validation with the configured credential and handle missing configuration explicitly. A supported fallback must be accepted by the form that submits it.

### C10: Default Dates Use UTC

**Severity: 6 | Confidence: 1.00 | Scope: Code-confirmed | Category: Logic Error**

Several forms initialize their date using:

```ts
new Date().toISOString().split('T')[0]
```

This uses the UTC date, not the local calendar date. In Malaysia, entries made before 08:00 can default to the previous day and, at a month boundary, the previous month.

**Exact evidence:** October 1, 2026, at 01:00 in Malaysia formats as `2026-09-30` through this expression.

**Correction:** use local calendar-date formatting consistently across transaction, trade, funding, recurrence, and settlement forms.

### C11: Background Refresh Clears Unfinished Forms

**Severity: 6 | Confidence: 0.99 | Scope: Code-confirmed | Category: Logic Error**

The page polls every 60 seconds. Refreshed data supplies new account and category arrays, retriggering the auto-debit form's initialization effect through its dependencies:

```ts
[expenseCategories, initialRule, isOpen, validAccounts]
```

The effect resets the form even while it is open. The settlement modal has a similar reset pattern.

**Exact evidence:** replaying the existing initialization effect after an equal-valued data refresh reset an entered rule name and amount to blank and zero.

**Correction:** initialize the form on opening or when switching the edited rule, not whenever refreshed array identities change. Preserve an active draft across background refreshes.

### C12: Current Balance Blocks Historical Entries

**Severity: 6 | Confidence: 0.98 | Scope: Code-confirmed | Category: Logic Error**

Expense-source eligibility includes:

```ts
const hasBalance = acc.currentBalance > 0;
```

A depleted bank account disappears from the source selector, even when recording an older expense or editing an existing transaction. Current funds do not establish whether a historical bookkeeping entry is valid.

**Exact evidence:** the existing account-filter function returned no eligible expense accounts for a bank account with a current balance of zero.

**Correction:** allow historical entries regardless of present balance and preserve the original account when editing a transaction. Any insufficient-funds warning should be separate from historical record eligibility.

## Coverage and Limitations

### Reviewed Areas

- 35 TS/TSX/JS source files.
- The main page and demo page, shared workspace, navigation, forms, and display components.
- Money-transaction creation, editing, deletion, account selection, totals, and filtering.
- Credit-card statement calculations, settlement, and billing-day changes.
- Auto-debit rule management, occurrence generation, deduplication, and date handling.
- Portfolio reads, trade recording, funding records, and allocation calculations.
- Google Sheets client integration, runtime-relevant configuration, layout, manifest, and service-worker source.

### Entry-Point Trace Coverage

- Both page routes were traced through their shared components and server-action callers.
- All 22 exported server actions were inspected, including initialization and category actions without current UI callers.
- Reads were followed through parsing and aggregation to Google Sheets and, where applicable, Yahoo requests.
- Writes were followed through row construction to Sheets append, update, or clear operations.
- Auto-debit processing was traced as a side effect of loading money-manager data.
- No standalone background scheduler was exercised.

### Unreviewed Areas

- Live spreadsheet formulas, actual sheet data, formatting, and permissions.
- Actual Google Sheets or Yahoo API execution.
- Full browser interaction, rendering, and application startup.
- Styling, documentation quality, generated files, dependency-version changes, and tooling-only configuration.

### Verification

Project dependencies were absent, so no full application build or project test suite ran. Isolated, in-memory checks reproduced the reported behaviors using the existing server-action code and extracted UI calculations/effects. External services were replaced with in-memory stubs; these checks did not read or modify live records.

The review did not apply fixes or modify application source. This Markdown report is a separate deliverable.

## Recommended Fix Order

1. Isolate demo mode from live mutations.
2. Make settlements consistent and protect settled records from generic edits/deletes.
3. Correct recurring-debit cancellation, schedule changes, concurrency, and due-date handling.
4. Align expense recognition and preserve data on failed reads.
5. Fix local-date defaults, draft preservation, historical account selection, and fallback login validation.
