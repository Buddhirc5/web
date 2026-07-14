# Pan Asia Bank — Reconciliation & Exhibit Platform (POC)

Frontend-only prototype of the signed-off Reconciliation & Exhibit Platform.

## Run

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Sample logins

Password for all: `demo123`

| Username   | Role              |
|------------|-------------------|
| inputter   | Branch Inputter   |
| approver   | Branch Approver   |
| reviewer   | Branch Reviewer   |
| finance    | Finance Reviewer  |
| inquiry    | Inquiry (view-only) |
| admin      | Administrator     |

## What’s included

- Engine 01 detailed matching (auto / suggested / manual + URR)
- Role workflow queues (submit → approve → review → finance close)
- RAG dashboard, exhibits, audit trail, freeze / override
- Light Bulk Engine 02 cycles
- Mock data persisted in `localStorage` (Reset demo in the header)
