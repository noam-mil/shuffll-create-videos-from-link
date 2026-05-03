// Direct Google Sheets API writes via Service Account JWT

function base64urlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function strToUint8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function makeJwt(saEmail: string, pemKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header  = base64urlEncode(strToUint8(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = base64urlEncode(strToUint8(JSON.stringify({
    iss: saEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(pemKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    strToUint8(`${header}.${payload}`),
  );

  return `${header}.${payload}.${base64urlEncode(new Uint8Array(sig))}`;
}

let cachedToken: { value: string; exp: number } | null = null;

export async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.value;

  const saEmail  = import.meta.env.VITE_SA_EMAIL as string | undefined;
  const saKeyB64 = import.meta.env.VITE_SA_PRIVATE_KEY_B64 as string | undefined;
  const saKeyRaw = import.meta.env.VITE_SA_PRIVATE_KEY as string | undefined;

  if (!saEmail || (!saKeyB64 && !saKeyRaw)) {
    throw new Error(
      'Missing environment variables: VITE_SA_EMAIL and VITE_SA_PRIVATE_KEY_B64 are not set. ' +
      'Add them in Vercel → Project Settings → Environment Variables.',
    );
  }

  // Prefer base64-encoded key (avoids all newline/escaping issues with Vercel env vars)
  // Fall back to raw key with literal \n conversion
  const saKey = saKeyB64
    ? atob(saKeyB64)
    : saKeyRaw!.replace(/\\n/g, '\n');

  const jwt = await makeJwt(saEmail, saKey);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Token request failed: ${res.status} ${errBody}`);
  }
  const data = await res.json() as { access_token: string; expires_in: number };

  cachedToken = { value: data.access_token, exp: now + data.expires_in };
  return data.access_token;
}

// Returns the 1-indexed number of the last row that has any content in column A
async function getLastRowNumber(spreadsheetId: string, token: string): Promise<number> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:A`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Sheets read failed: ${res.status}`);
  const data = await res.json() as { values?: string[][] };
  return (data.values ?? []).length;
}

// Fetch a specific row's values (columns A–AZ)
async function getRowValues(spreadsheetId: string, rowIndex: number, token: string): Promise<string[]> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A${rowIndex}:AZ${rowIndex}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Sheets read failed: ${res.status}`);
  const data = await res.json() as { values?: string[][] };
  return data.values?.[0] ?? [];
}

/**
 * Duplicates the last data row, inserts it directly below, then:
 * - Sets column A = url
 * - Clears C, D, V, W, X, Y, Z, AA
 * - Sets S, T, U = "No"
 * Returns the 1-indexed row number of the new row.
 */
export async function insertDuplicatedRow(
  spreadsheetId: string,
  url: string,
  tabGid = 0,
): Promise<number> {
  const token = await getAccessToken();

  // 1. Find true last row via column A length, then fetch its full values
  const lastRowIndex  = await getLastRowNumber(spreadsheetId, token);
  if (lastRowIndex === 0) throw new Error('Sheet appears empty');
  const lastRowValues = [...await getRowValues(spreadsheetId, lastRowIndex, token)];

  // 2. Insert a blank row after the last row (batchUpdate → insertDimension)
  const insertRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          insertDimension: {
            range: { sheetId: tabGid, dimension: 'ROWS', startIndex: lastRowIndex, endIndex: lastRowIndex + 1 },
            inheritFromBefore: true,
          },
        }],
      }),
    },
  );
  if (!insertRes.ok) throw new Error(`Row insert failed: ${insertRes.status}`);

  const newRow = lastRowIndex + 1; // 1-indexed

  // 3. Build the new row: copy last row then apply overrides
  while (lastRowValues.length < 27) lastRowValues.push('');
  const newValues = [...lastRowValues];

  // Column A (idx 0) = new URL
  newValues[0] = url;

  // Clear C (2), D (3)
  newValues[2] = '';
  newValues[3] = '';

  // Set O (14) = TRUE
  newValues[14] = 'TRUE';

  // Set S (18), T (19), U (20) = "No"
  newValues[18] = 'No';
  newValues[19] = 'No';
  newValues[20] = 'No';

  // Clear V (21), W (22), X (23), Y (24), Z (25), AA (26)
  newValues[21] = '';
  newValues[22] = '';
  newValues[23] = '';
  newValues[24] = '';
  newValues[25] = '';
  newValues[26] = '';

  // 4. Write the new row values
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A${newRow}:AA${newRow}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [newValues.slice(0, 27)] }),
    },
  );
  if (!writeRes.ok) throw new Error(`Row write failed: ${writeRes.status}`);

  // Trigger n8n workflow immediately after row is written
  fetch('https://n8n.shuffll.cloud/webhook/82192db3-7c08-4e86-8f49-d57e0302d393', {
    method: 'POST',
    mode: 'no-cors',
  }).catch(err => console.warn('n8n webhook failed:', err));

  return newRow;
}

// Read column AB of a row, merge all provided emails into the stored array, write back once
export async function addEmailToRow(spreadsheetId: string, rowIndex: number, newEmails: string[]): Promise<void> {
  const token = await getAccessToken();

  // Read current AB value
  const readRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/AB${rowIndex}:AB${rowIndex}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const readData = await readRes.json() as { values?: string[][] };
  const raw = readData.values?.[0]?.[0] ?? '';

  // Parse existing array (stored as JSON) or start fresh
  let existing: string[] = [];
  if (raw) {
    try { existing = JSON.parse(raw); } catch { existing = [raw]; }
  }

  // Merge, deduplicate
  const merged = [...existing];
  for (const e of newEmails) {
    if (!merged.includes(e)) merged.push(e);
  }

  // Write back in one call
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/AB${rowIndex}:AB${rowIndex}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [[JSON.stringify(merged)]] }),
    },
  );
  if (!writeRes.ok) throw new Error(`Email write failed: ${writeRes.status}`);
}

// Poll column C (index 2, exportUrl) of a given row for an MP4 URL
export async function fetchMp4FromSheetById(spreadsheetId: string, rowIndex: number): Promise<string | null> {
  const token = await getAccessToken();
  const range = encodeURIComponent(`C${rowIndex}:C${rowIndex}`);
  const res   = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data  = await res.json() as { values?: string[][] };
  const val   = data.values?.[0]?.[0] ?? '';
  return val || null;
}
