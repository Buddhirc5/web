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

| Username | Role | Scope |
|----------|------|--------|
| `kol_inputter` | Branch Inputter | Kollupitiya only |
| `kol_approver` | Branch Approver | Kollupitiya only |
| `kol_reviewer` | Branch Reviewer | Kollupitiya only |
| `kandy_inputter` | Branch Inputter | Kandy only |
| `galle_inputter` | Branch Inputter | Galle only |
| `inputter` / `approver` / `reviewer` | Aliases | Kollupitiya |
| `finance` | Finance Reviewer | All branches |
| `inquiry` | Inquiry (view-only) | All branches |
| `admin` | Administrator | All branches |

Branch users only see/edit their own branch. Finance / admin / inquiry see bank-wide.

## Real network data

- **86 branches** from Pan Asia Bank Annual Report 2023 (bank code `7311`)
- **16 departments** aligned to PABC org + DRG
- **Kollupitiya GL chart** (account names + numbers) with **fictional exhibit line items** — no confidential customer data from the bank workbook
- Browse under **Network** in the sidebar

## What’s included

- Branch-scoped Engine 01 + exhibit schedules (schedule / ledger / difference)
- Role workflow queues (submit → approve → review → finance close)
- RAG dashboard, exhibits, audit trail, freeze / override
- Light Bulk Engine 02 cycles
- Mock data in `localStorage` (use **Reset demo** after updates)
