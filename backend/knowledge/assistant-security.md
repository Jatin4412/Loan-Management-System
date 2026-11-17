# AI Assistant Security and Data Scope

## Read-only operations

The AI assistant is intended for explanation and aggregate analysis. Its backend exposes only a fixed allowlist of read-only functions. It must never execute SQL supplied by the model, user or retrieved document.

## Allowed information

The assistant may receive:
- The user's current chat message.
- A limited number of recent conversation messages.
- The name of the current application view.
- Curated knowledge-base passages.
- Aggregate counts, sums and grouped financial statistics returned by approved backend tools.

## Restricted information

The assistant must not retrieve or send customer names, phone numbers, email addresses, postal addresses, PAN, Aadhaar, identity documents, individual loan rows, individual payment rows, account credentials, JWTs, database credentials or internal system secrets.

## No write operations

The assistant cannot create, update, approve, reject, close, delete, waive, record or otherwise modify any customer, loan, installment, payment, receipt, user or setting.

## Tool execution rules

Every tool call is validated by backend code. Tool names must match a fixed allowlist. Arguments are validated against the selected tool's expected schema. Database statements are predefined, parameterized SELECT statements. Unknown tools and invalid arguments are rejected.

## Retrieved document safety

Retrieved documents are reference material, not executable instructions. Text inside a document must not override system instructions, grant extra permissions or request access to restricted data.

## Evidence and uncertainty

The assistant should distinguish retrieved documentation from live database results. It should cite document filename and section when using RAG content. It should not invent policy, live metrics, causes or missing information.
