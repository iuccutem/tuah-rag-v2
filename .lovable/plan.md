## Fix editable cell placeholder text

The `EditableCell` component inside `QATable.tsx` hardcodes `placeholder="Enter question…"` for every textarea field. This placeholder incorrectly appears in the **Expected Answer** column (and any other textarea-editable column).

### Change
Update `EditableCell` to set the placeholder dynamically based on the column being edited:

| Column key | Placeholder |
|---|---|
| `question` | `Enter question…` |
| `telegram_whatsapp` | `Enter expected answer…` |
| other / fallback | `Enter value…` |

The single-line `url` input already has the correct `https://…` placeholder and stays unchanged.

### File touched
- `src/components/qa-dashboard/QATable.tsx` — one-line change inside `EditableCell`.
