// ⚠️ SERVER-SIDE ONLY: This file should only be imported in Server Actions or API Routes.

export const getSheetClient = async () => {
  // Ensure this never runs in the browser
  if (typeof window !== 'undefined') {
    throw new Error('Google Sheets client cannot be used in the browser. It must be called from a Server Action.');
  }

  const keyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!keyString) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not defined in .env.local');
  }

  let credentials;
  try {
    credentials = JSON.parse(keyString);
  } catch (e) {
    console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY", e);
    throw new Error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY. Ensure it is valid JSON in your .env.local file.');
  }

  // Dynamically import googleapis to avoid bundling it in the client
  const { google } = await import('googleapis');

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  const googleSheets = google.sheets({ version: 'v4', auth: client as any });

  return { googleSheets, auth };
};

export const SPREADSHEET_ID = '1nrqU07HDQbRLpWJ3L-AOEEGRIaCOzEBoqjHRS5JYZTk'; 
// NOTE: These must match your Google Sheet tab names EXACTLY (Case Sensitive!)
export const SHEET_NAME = 'Transaction';
export const CASH_FLOW_SHEET_NAME = 'Cash Flow';
export const PORTFOLIO_SHEET_NAME = 'Portfolio';
export const MM_ACCOUNTS_SHEET = 'MM_Accounts';
export const MM_TRANSACTIONS_SHEET = 'MM_Transactions';
export const MM_CATEGORIES_SHEET = 'MM_Categories';