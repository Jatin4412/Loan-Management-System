# Loan Portfolio Analytics Glossary

## Total customers

The count of records in the customers table. The assistant must return only the count and must not retrieve customer names, contact details, identity numbers or addresses.

## Total loans

The count of records in the loans table.

## Active loans

The assistant's portfolio summary groups loans with status APPROVED or ACTIVE as active. Some other existing dashboard code uses APPROVED alone. When reporting the assistant tool result, describe the exact grouping used by that tool.

## Pending loans

The count of loans whose status is PENDING.

## Rejected loans

The count of loans whose status is REJECTED.

## Closed loans

The count of loans whose status is CLOSED.

## Outstanding balance

The assistant's portfolio summary adds loans.balance for loans whose status is APPROVED or ACTIVE. This is a stored remaining balance total, not the original total principal disbursed.

## Collections

Collections are calculated by summing payments.amount over a selected date range. Monthly collection results group payment records by calendar month. The AI must state the requested date range and must not confuse collections with loan principal or outstanding balance.

## Overdue installments and overdue amount

The overdue summary counts loan_schedule rows whose status is OVERDUE. The outstanding amount is calculated as the sum of the non-negative difference between amount and the paid principal, interest and penalty components for those rows.

## Loan type distribution

Loan type distribution counts loans grouped by loan_type. It is a count of loan records, not a distribution of currency value unless a separate amount-based metric is explicitly calculated.

## Reporting rules

Use database tool results for current numerical values. Explain the date range and metric definition where relevant. Do not infer why a metric changed unless additional evidence is available. Do not expose individual customer or loan records.
