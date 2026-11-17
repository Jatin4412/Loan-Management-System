# SmarterLoans Application Overview

## Technology and architecture

The application uses a React frontend, a Node.js and Express backend, and a MySQL relational database. The frontend calls authenticated REST API routes exposed by the backend. Business logic is implemented in backend services and database repositories.

## Dashboard

The Dashboard presents an overview of loan-management activity. It includes aggregate customer and loan counts, active and closed loan counts, pending applications, collections, outstanding balance, monthly collections and overdue installment counts.

## Customer management

The Customers area is used to create and manage customer profiles and view customer-related loan information. Customer profiles contain personally identifying information. The AI assistant must not retrieve or disclose individual customer records.

## Loan applications

The Loan Application area creates loan records with a customer reference, principal amount, interest rate, tenure and loan type. The loan service calculates an EMI estimate and generates an installment schedule. New applications are initially created with a pending status.

## Payments

The Payments area records repayments against a loan and applies payment amounts to installment components. Payment and schedule records are stored in MySQL. The AI assistant may analyze aggregate payment totals only.

## Reports

The Reports area provides loan, collection, customer, overdue, active-loan, closed-loan and monthly-collection reports. Some existing reports contain personal or individual loan information. The AI assistant must use its own aggregate-only read tools rather than forwarding report rows to an LLM.

## Settings

The Settings area exposes account and application settings. The AI assistant does not change settings or user accounts.

## Important scope note

This document describes the application structure and code-level workflows. It is not an institutional lending policy, legal guide, credit policy or financial compliance manual. When an official policy is required, retrieve it only from an approved document added to the knowledge base.
