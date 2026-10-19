import { requestId } from './request-id';

const tabKey = 'rr.auth.tab';
const accountKey = 'rr.auth.account';

function read(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // The current page still works when the browser disallows storage.
  }
}

const savedTab = read(tabKey);
const tab =
  savedTab && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(savedTab)
    ? savedTab
    : requestId();
write(tabKey, tab);
const savedAccount = read(accountKey) || '';
let selectedAccount = /^[A-Za-z0-9_-]{1,30}$/.test(savedAccount) ? savedAccount : 'anonymous';

export function sessionContext(account = selectedAccount) {
  return `${tab}.${account}`;
}

export function selectSession(account: string) {
  selectedAccount = account;
  write(accountKey, account);
}

export function clearSession() {
  selectSession('anonymous');
}
