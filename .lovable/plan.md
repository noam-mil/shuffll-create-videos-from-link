

## Download Button for Daily View Rows

### What will change
Each row in the Daily View table gets a download button. Clicking it fetches detailed message data from the backend and generates a CSV file for download.

### How it works
1. Click the download button on a row (e.g. company "Haifa Port", status "delivered")
2. The button shows a loading spinner while fetching data
3. A GET request goes to `/messages/company/{company}/day-status?date=YYYY-MM-DD&status=STATUS` via the existing n8n-proxy
4. The response (array of `to_number`, `first_name`, `html_link`) is converted to a CSV and downloaded
5. On error, a toast notification is shown

### Technical Details

**1. `src/hooks/useMessagingHub.ts`**
- Export `callN8nProxy` so it can be used imperatively (not just via hooks)
- Add a `DayStatusEntry` interface: `{ to_number: string; first_name: string; html_link: string }`

**2. `src/components/messaging/DailyViewTable.tsx`**
- Add a 4th column header for the download action
- Add `metaOrgId` and `date` props to the component
- For each row, render a download `Button` (icon-sized, with a `Download` icon from lucide)
- On click, call `callN8nProxy` with path `/messages/company/${company}/day-status?date=${date}&status=${status}`
- While loading, replace the download icon with a `Loader2` spinner
- On success, convert the array to CSV (`to_number,first_name,html_link`) and trigger a browser download with filename `{company}_{status}_{date}.csv`
- On error, show a toast via `sonner`

**3. `src/pages/org/OrgMessagingHub.tsx`**
- Pass `metaOrgId` and `selectedDateStr` as new props to `DailyViewTable`

**4. Translations**
- Add `messagingHub.dailyView.download` key to all 5 locale files (en, he, es, ar, de) for the column header / tooltip

