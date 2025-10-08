export interface ConversationMemoryEntry {
  timestamp: number;
  user: string; // user message
  bot: string; // bot response
  intent?: string;
  cartSnapshot?: {
    total: number;
    itemCount: number;
    items: Array<{ name: string; quantity: number; total: number }>
  };
}

interface SessionState {
  history: ConversationMemoryEntry[];
  lastServices?: { id: string; name: string; price?: number }[];
  lastCatalogAt?: number;
  lastAddedItem?: { id: string; name: string; quantity: number };
  lastListedServices?: { id: string; name: string }[];
  pendingAction?: {
    type: 'ADD' | 'REMOVE';
    candidateId: string;
    candidateName: string;
    quantity?: number;
  };
}

const SESSIONS = new Map<string, SessionState>();
const MAX_HISTORY = 20;
const CATALOG_TTL_MS = 3 * 60 * 1000; // 3 minutos

function key(companyId: string, phone: string) {
  return `${companyId}:${phone}`;
}

export function getSession(companyId: string, phone: string): SessionState {
  const k = key(companyId, phone);
  let s = SESSIONS.get(k);
  if (!s) {
    s = { history: [] };
    SESSIONS.set(k, s);
  }
  return s;
}

export function appendHistory(companyId: string, phone: string, entry: ConversationMemoryEntry) {
  const session = getSession(companyId, phone);
  session.history.push(entry);
  if (session.history.length > MAX_HISTORY) session.history.splice(0, session.history.length - MAX_HISTORY);
}

export function setCatalog(companyId: string, phone: string, services: { id: string; name: string; pricePerUnit?: number }[]) {
  const session = getSession(companyId, phone);
  session.lastServices = services.map(s => ({ id: s.id, name: s.name, price: s.pricePerUnit }));
  session.lastCatalogAt = Date.now();
  session.lastListedServices = services.slice(0, 15).map(s => ({ id: s.id, name: s.name }));
}

export function getRecentCatalog(companyId: string, phone: string) {
  const session = getSession(companyId, phone);
  if (!session.lastServices) return null;
  if (!session.lastCatalogAt) return null;
  if (Date.now() - session.lastCatalogAt > CATALOG_TTL_MS) return null;
  return session.lastServices;
}

export function setLastAddedItem(companyId: string, phone: string, item: { id: string; name: string; quantity: number }) {
  const session = getSession(companyId, phone);
  session.lastAddedItem = item;
}

export function setPendingAction(companyId: string, phone: string, action: SessionState['pendingAction']) {
  const session = getSession(companyId, phone);
  session.pendingAction = action || undefined;
}

export function consumePendingAction(companyId: string, phone: string) {
  const session = getSession(companyId, phone);
  const pa = session.pendingAction;
  session.pendingAction = undefined;
  return pa;
}

export function peekPendingAction(companyId: string, phone: string) {
  return getSession(companyId, phone).pendingAction;
}

export function getHistory(companyId: string, phone: string) {
  return getSession(companyId, phone).history;
}

export function summarizeRecentHistory(companyId: string, phone: string, limit = 6) {
  const hist = getHistory(companyId, phone).slice(-limit);
  return hist.map(h => `U: ${h.user}\nB: ${h.bot}`).join('\n');
}
