# EMI and Repayment Reference

## EMI terminology

EMI means Equated Monthly Instalment. It is a periodic repayment amount that normally includes a principal component and an interest component. A repayment schedule can also contain a penalty component.

## Reducing-balance EMI formula

For a positive monthly interest rate, the standard reducing-balance formula is:

EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)

Where:

- P is the principal amount.
- r is the monthly interest rate expressed as a decimal.
- n is the number of monthly instalments.
- Monthly interest rate is annual interest rate divided by 12 and then divided by 100 when the annual rate is expressed as a percentage.

The application loan-schedule generator uses this reducing-balance calculation. Its schedule separates each instalment into principal_component and interest_component.

## Payment allocation fields

The loan_schedule table stores amount, principal_component, interest_component and penalty_component for each instalment. It also stores principal_paid, interest_paid and penalty_paid. Remaining amount for an installment can be calculated as the non-negative difference between the scheduled amount and the sum of the paid components, subject to how the schedule is populated.

## Repayment statuses

PENDING means no payment has been recorded against the installment. PARTIAL means an amount has been applied but an amount remains. OVERDUE is the status used for overdue installment reporting. PAID means the installment has been fully paid.

## Interpretation caution

The AI assistant should explain formula concepts but should use the application's stored values for live loan analytics. It must not invent a customer's EMI or repayment schedule. The application has more than one calculation path, so edge cases such as a zero-interest loan should be verified against the underlying service implementation before being represented as an official calculation rule.

## Financial advice boundary

These notes explain application terminology and calculations. They do not establish a lender's interest policy, penalty policy, collection procedure or legal obligations.
