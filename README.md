# Lead Intake Next.js App

This is a deployable Next.js app for Paradigm Energy Services lead intake.

## What it does

- Manual property entry
- PDF/image upload to extract property data via Anthropic
- Server-side Anthropic API proxy to keep the API key secret
- Immediate append to Google Sheets instead of CSV download
- Google Sheet columns follow the field layout you provided
- `npm run purge-old` removes rows older than 30 days

## Required environment variables

- `ANTHROPIC_API_KEY`
- `SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY`
  - or alternatively `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY`

Optional:

- `PURGE_DAYS` (default: `30`)

## Google Sheets setup

1. Create a Google Cloud project.
2. Enable the Google Sheets API.
3. Create a service account and generate a JSON key.
4. Share the Google Sheet with the service account email.
5. Add the full JSON key content to the `GOOGLE_SERVICE_ACCOUNT_KEY` env var.

If you cannot use `GOOGLE_SERVICE_ACCOUNT_KEY`, set:

- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY` (use `\\n` escapes for newlines if needed)

## Sheet columns

The app appends rows in this order:

1. Contact type
2. Contacts: Tags
3. Properties: Property name
4. Properties: Address
5. Companies: Company
6. Owner
7. City
8. Properties: Units
9. Properties: Heating Fuel
10. Properties: Heating Type
11. Properties: Construction
12. Properties: Roof Type
13. Contacts: First Name
14. Contacts: Last Name
15. Contacts: Email
16. Contacts: Phone
17. Contacts: Address
18. Properties: Tags
19. Source
20. Properties: Track?
21. Sent
22. Employee Name
23. Date Submitted
24. Comment

## Employee dropdown

The employee name field includes the following options:

Aadi, Abby, Adam, Alex, Brian, Brendan, Colln, Jamie, Jim, JD, Kelly, Kendra, Lindsey, Marty, Mike, Naomi, Nicholas, Pat, Phillip, Ryan, Tom C, Tom F, Tom S.

## Install and run

```bash
npm install
npm run dev
```

## Build for production

```bash
npm run build
npm start
```

## Purge old rows

To delete rows older than 30 days from the command line:

```bash
npm run purge-old
```

The app also includes an admin purge button in the UI for the same cleanup task.

You can adjust the purge window by setting `PURGE_DAYS`.
