import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATUS_FILE = path.join(__dirname, '../../data/user_statuses.json');

function ensureStatusFile() {
  const dir = path.dirname(STATUS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STATUS_FILE)) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify({}, null, 2), 'utf8');
  }
}

export function getUserStatuses() {
  ensureStatusFile();
  try {
    const raw = fs.readFileSync(STATUS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function setUserStatus(userId, status) {
  ensureStatusFile();
  const statuses = getUserStatuses();
  statuses[userId] = status;
  fs.writeFileSync(STATUS_FILE, JSON.stringify(statuses, null, 2), 'utf8');
  return status;
}

export function getUserStatus(userId, defaultStatus = 'active') {
  ensureStatusFile();
  const statuses = getUserStatuses();
  return statuses[userId] || defaultStatus;
}
