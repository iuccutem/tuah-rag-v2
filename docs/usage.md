# Usage Guide

## Sheets (tabs)

Each sheet at the bottom of the dashboard maps to a backend table named `qatest-<slug>`.

- **Create**: click the **+** button on the tab bar.
- **Rename**: open the chevron menu on the tab → **Rename**. The `qatest-` prefix is preserved automatically.
- **Delete**: chevron menu → **Delete**. If the deleted tab was active, the UI switches to the first remaining sheet.

A full-screen loading overlay is shown while the n8n pipeline provisions or mutates the underlying table.

## Adding questions

### Paste
Open **Paste questions**, drop one question per line, click insert. Each line is posted individually through the n8n insert webhook.

### Excel / CSV import
1. Click **Import Excel** in the toolbar.
2. Pick a `.xlsx`, `.xls`, or `.csv` file.
3. The dialog shows the first sheet's headers — pick which **column** contains questions and toggle "skip first row" if needed.
4. The preview lists detected questions, marks duplicates against the current sheet, and inserts the remainder on confirm.

## Generating answers

Select one or more rows (Excel-style range selection works) and choose:

- **Run Web** — fills the `web` column via the Web Chat agent.
- **Run WA/TG** — fills the `telegram_whatsapp` column via the messaging agent.

Buttons exist in both the desktop toolbar and the mobile overflow menu.

## Per-row tools

- **Highlight / Flag** — visual markers stored in the cell's formats map.
- **Email** — sends the row via the `n8n-email` edge function.
- **Delete** — removes the row via the `n8n-delete` edge function.

All `/api/n8n-*` calls in the SPA are routed through `apiFetch` (see
`src/lib/api.ts`), which forwards them to the corresponding Supabase Edge
Function with the caller's Supabase JWT attached.

## RAG JSON export

Click **Export RAG JSON** to send the currently visible rows through the
`n8n-export` edge function, which calls the Lovable AI Gateway. Each row becomes:

```json
{
  "lang": "en",
  "intent": "staff.director",
  "question": "Who is the director of the ACCESS centre?",
  "answer": "The director of UTeM ACCESS is …",
  "metadata": "staff; UTeM ACCESS; administration",
  "url": "https://access.utem.edu.my/..."
}
```

Malay or mixed Malay/English content is translated to natural English; proper nouns, acronyms, and URLs are preserved.

## Auth & user management

- Sign in at `/auth` with an admin-provisioned account.
- Admins can register new users from the dashboard toolbar. The request hits the
  `admin-users` edge function, which uses the service-role key server-side —
  non-admins are rejected before any user is created.
