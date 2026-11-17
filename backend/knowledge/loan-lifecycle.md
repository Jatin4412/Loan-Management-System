# Loan Lifecycle and Status Reference

## Loan creation

A loan application is associated with a customer and stores the principal amount, annual interest rate, tenure in months, calculated EMI amount, total payable amount, remaining balance, loan category and status. The current loan creation service initially inserts a loan with its default status, which is PENDING in the database schema.

## Loan status values

The application commonly uses these loan statuses:

- PENDING: the application is awaiting a decision.
- APPROVED: the application has been approved. Current services and dashboard logic treat APPROVED as the active loan state.
- REJECTED: the application has been rejected.
- CLOSED: the loan has been closed.
- ACTIVE: this value also appears in some older or alternate application code paths. Interpret it carefully and do not assume it is always used consistently with APPROVED.

The AI assistant may report aggregate counts by status. It must not approve, reject, close or otherwise modify any loan.

## Installment status values

The loan schedule stores installment rows and their payment components. Status values used by the application include:

- PENDING: an installment is not yet paid.
- PARTIAL: some amount has been paid but an amount remains.
- OVERDUE: the installment is marked overdue.
- PAID: the installment has been fully paid.

An OVERDUE status is the value currently used by the aggregate overdue query. The assistant should report what is stored in the database and should not infer a status from a customer's identity or other private records.

## Loan categories

The application stores a loan_type category for each loan. The current UI and data examples use categories such as PERSONAL, HOME, VEHICLE and BUSINESS. Other values should be reported as stored or grouped as OTHER in aggregate assistant responses.

## No formal lending policy is defined here

Loan approval criteria, legal eligibility, interest-rate policy, penalty rules, recovery actions and regulatory requirements must not be inferred from these software status descriptions. Consult an approved institutional policy document for those matters.
