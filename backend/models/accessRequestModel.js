import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../../data/access_requests.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

export function getAllRequests() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveRequests(requests) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(requests, null, 2), 'utf8');
}

export function findPendingByEmail(email) {
  const all = getAllRequests();
  return all.find((r) => r.official_email.toLowerCase() === email.toLowerCase() && r.status === 'pending');
}

export function createRequest({ fullName, officialEmail, badgeNumber, department, designation, jurisdiction, requestedRole, reason }) {
  const all = getAllRequests();
  const newRecord = {
    id: crypto.randomUUID(),
    full_name: fullName,
    official_email: officialEmail,
    badge_number: badgeNumber || null,
    department,
    designation,
    jurisdiction,
    requested_role: requestedRole,
    reason,
    status: 'pending',
    reviewed_by: null,
    reviewed_at: null,
    review_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  all.unshift(newRecord);
  saveRequests(all);
  return newRecord;
}

export function updateRequest(id, updates) {
  const all = getAllRequests();
  const index = all.findIndex((r) => r.id === id);
  if (index === -1) return null;
  all[index] = {
    ...all[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  saveRequests(all);
  return all[index];
}
