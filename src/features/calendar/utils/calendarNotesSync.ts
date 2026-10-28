import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureSupabaseBackendSession, normalizeUserKey, type AuthUser } from '../../../lib/auth';

export interface CalendarNoteItem {
  id: string;
  content: string;
  completed: boolean;
  date: string | null;
  created_by?: string | null;
  created_at?: string;
}

export const UNDATED_SENTINEL_DATE = '1970-01-01';
const OWNER_PREFIX_REGEX = /^\[owner:([^\]]+)\]\s*/i;

const OBSOLETE_GLOBAL_NOTE_IDS = new Set([
  'c3a360f7-7945-451e-b534-f2e9df09085c',
  '9193b56e-a5b4-4b2e-8104-e15745e105a1',
  'd550e1c2-55d7-41eb-9499-cd7cba9f8b79',
  'c8266daf-3c0e-43a3-b218-3d46cf4cc6b5',
  '8d1593d8-09d9-4cbb-ad28-31ba73558037',
  '98597b72-8492-4227-bc04-d4e941d7554b',
  '29bc7d9e-4111-45c3-8959-11f23049fda4',
  '95dbfb79-e598-4050-9bea-2fc1a83b4fff',
  '23b0a2f7-9280-41c9-b11d-ad6d577cb873',
  '8210d95f-0d5a-4485-a8f8-a796789a0bc0',
  '416dc471-a2a6-4dfd-b1b0-23e2c29eb039',
  'bc78736e-87f4-4198-a363-4a37ac9345b4',
  '49082f93-9704-41dd-8bb8-27806c6d402f',
  '4c44c50c-a319-4c74-96e7-1424649dc999',
  '7dfc7541-c15f-4e30-b4ec-a04824aa7792',
  '2359702e-63dd-4b31-8ee1-56c39e6eddfc',
  '84ae8024-3746-4856-8c95-59e0febf310a',
  '3adba871-eff7-4b18-910f-c88bed3bbe65',
  '339601a6-04fa-43f8-8375-6d2a8ed854e9',
  '196fa290-6434-406c-ae8f-d0ec3cb469e8',
  '6f57f4c0-4c47-412f-ad99-58caea5a0745',
  '1361d628-04fa-46be-a874-d2e730d1915a',
  '0cf13db2-3dc6-47d5-a97f-c7ef321659ff',
  '0588e14e-43a4-4fe0-8197-1e3fb455b225',
  '5f0aade7-b28e-4468-9e3a-9392f25fa531',
  'cb672a20-d9a9-4085-a1e1-66b4ab5b92d6',
  'ef55b332-5078-4ad1-8f7a-7fb0cf9b6fbc',
  'd0991686-9f14-4bfa-bf00-fa4da3dface4',
  '1a64c2a4-a44e-4a17-bc4d-d1bd7f92e50a'
]);

function isObsoleteSampleNote(text: string): boolean {
  return /^Stres Notu #\d+|Tarih döngüsü test notu|Tıklama ve Event Bubbling Testi|Takvimden Tarihsiz Not|Tarihsiz calendar notu|İleri tarihli teftiş notu|Günlük Rutin Görev|Kritik Vergi Ödemesi|Maaş ödemeleri ve BES kesintisi|Sabah rutini döviz kurlarını kontrol et/i.test(String(text || '').trim());
}

function getEdgeUserNotesEndpoint(userKey: string): string {
  const base =
    typeof window !== 'undefined' &&
    window.location &&
    window.location.hostname &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')
      ? ''
      : 'https://cem.amasyaetas.com';
  return `${base}/api/user-notes?userKey=${encodeURIComponent(userKey || 'default')}`;
}

export interface EdgeUserNotesFetchResult {
  notes: CalendarNoteItem[];
  deletedIds: string[];
}

async function fetchEdgeUserNotes(user?: AuthUser | null): Promise<EdgeUserNotesFetchResult | null> {
  if (typeof fetch === 'undefined') return null;
  const userKey = getCanonicalNoteUserKey(user);
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 3500) : null;
  try {
    const res = await fetch(getEdgeUserNotesEndpoint(userKey), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json) {
      const notes = Array.isArray(json.notes)
        ? json.notes
            .filter((n: any) => n && n.id && !OBSOLETE_GLOBAL_NOTE_IDS.has(String(n.id)))
            .map((n: any) => ({
              id: String(n.id),
              content: extractNoteOwnerAndContent(n.content).cleanContent,
              completed: Boolean(n.completed),
              date: normalizeNoteDate(n.date),
              created_by: n.created_by || user?.id || null,
              created_at: n.created_at
            }))
            .filter((n: CalendarNoteItem) => Boolean(n.content) && !isObsoleteSampleNote(n.content))
        : [];
      const deletedIds = Array.isArray(json.deletedIds)
        ? json.deletedIds.map((id: any) => String(id).replace(/^note-/, ''))
        : [];
      return { notes, deletedIds };
    }
  } catch {
    // Ignore network / offline errors
  } finally {
    if (timer) clearTimeout(timer);
  }
  return null;
}

async function postEdgeUserNotesAction(
  user: AuthUser | null | undefined,
  body: Record<string, any>
): Promise<CalendarNoteItem[] | null> {
  if (typeof fetch === 'undefined') return null;
  const userKey = getCanonicalNoteUserKey(user);
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 3500) : null;
  try {
    const res = await fetch(getEdgeUserNotesEndpoint(userKey), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        userKey,
        userId: user?.id || null,
        ...body
      }),
      signal: controller ? controller.signal : undefined
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && Array.isArray(json.notes)) {
      return json.notes
        .filter((n: any) => n && n.id && !OBSOLETE_GLOBAL_NOTE_IDS.has(String(n.id)))
        .map((n: any) => ({
          id: String(n.id),
          content: extractNoteOwnerAndContent(n.content).cleanContent,
          completed: Boolean(n.completed),
          date: normalizeNoteDate(n.date),
          created_by: n.created_by || user?.id || null,
          created_at: n.created_at
        }))
        .filter((n: CalendarNoteItem) => Boolean(n.content) && !isObsoleteSampleNote(n.content));
    }
  } catch {
    // Ignore network / offline errors
  } finally {
    if (timer) clearTimeout(timer);
  }
  return null;
}

export function isValidUuid(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

export function generateNoteUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getCanonicalNoteUserKey(user?: AuthUser | null): string {
  if (!user) return 'default';
  const byEmail = normalizeUserKey(user.email);
  if (byEmail) return byEmail;
  const byName = normalizeUserKey(user.name);
  if (byName) return byName;
  if (user.id) return user.id.trim().toLowerCase();
  return 'default';
}

export function normalizeNoteDate(rawDate?: string | null): string | null {
  if (!rawDate) return null;
  const sliced = String(rawDate).trim().slice(0, 10);
  if (!sliced || sliced === UNDATED_SENTINEL_DATE || sliced === 'null' || sliced === 'undefined') {
    return null;
  }
  return sliced;
}

export function extractNoteOwnerAndContent(rawContent?: string | null): {
  ownerKey: string | null;
  cleanContent: string;
} {
  const str = String(rawContent || '');
  const match = str.match(OWNER_PREFIX_REGEX);
  if (match) {
    return {
      ownerKey: normalizeUserKey(match[1]),
      cleanContent: str.replace(OWNER_PREFIX_REGEX, '').trim()
    };
  }
  return {
    ownerKey: null,
    cleanContent: str.trim()
  };
}

export function encodeContentWithOwner(cleanContent: string, ownerKey: string): string {
  const clean = cleanContent.replace(OWNER_PREFIX_REGEX, '').trim();
  if (!ownerKey || ownerKey === 'default') return clean;
  return `[owner:${ownerKey}] ${clean}`;
}

export function doesRowBelongToUser(row: any, user?: AuthUser | null): boolean {
  if (!user) return true;
  const userKey = getCanonicalNoteUserKey(user);
  const { ownerKey } = extractNoteOwnerAndContent(row?.content);

  // 1. Explicit owner tag in content always wins
  if (ownerKey) {
    return ownerKey === userKey;
  }

  // 2. Match by created_by UUID
  if (row?.created_by && user.id) {
    if (String(row.created_by).toLowerCase() === String(user.id).toLowerCase()) {
      return true;
    }
    // If created_by is the shared backend session account (admin@ops360.local / berkant@dars.local) and current user is berkant/admin
    const cb = String(row.created_by).toLowerCase();
    if (
      (userKey === 'berkant' || userKey === 'admin') &&
      (cb === '9c242e61-e15f-41b5-b1e6-60a02baed90a' || cb === '291129b0-b5be-447e-97e1-51c613446aa3')
    ) {
      return true;
    }
    return false;
  }

  // 3. Legacy rows with null created_by belong to berkant/admin if logged in as berkant/admin
  if (!row?.created_by && (userKey === 'berkant' || userKey === 'admin')) {
    return true;
  }

  return false;
}

export function normalizeDbNoteRow(row: any): CalendarNoteItem {
  const { cleanContent } = extractNoteOwnerAndContent(row?.content);
  return {
    id: String(row.id),
    content: cleanContent,
    completed: Boolean(row.completed),
    date: normalizeNoteDate(row.date),
    created_by: row.created_by || null,
    created_at: row.created_at
  };
}

function getCandidateCacheKeys(user?: AuthUser | null): string[] {
  const keys = new Set<string>();
  const canonical = getCanonicalNoteUserKey(user);
  if (user?.id) keys.add(`dars_calendar_notes_${user.id}`);
  if (user?.email) keys.add(`dars_calendar_notes_${user.email}`);
  if (canonical) keys.add(`dars_calendar_notes_${canonical}`);
  return Array.from(keys);
}

export function loadCachedUserNotes(user?: AuthUser | null): CalendarNoteItem[] {
  const candidateKeys = getCandidateCacheKeys(user);
  const mergedMap = new Map<string, CalendarNoteItem>();
  const seenSignatures = new Set<string>();
  const deletedSet = loadDeletedNoteIds(user);

  const allKeysToRead = [...candidateKeys];
  if (user && !allKeysToRead.includes('dars_calendar_notes_default')) {
    allKeysToRead.push('dars_calendar_notes_default');
  }

  for (const key of allKeysToRead) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        if (!item || !item.id) continue;
        const idStr = String(item.id);
        if (OBSOLETE_GLOBAL_NOTE_IDS.has(idStr) || deletedSet.has(idStr)) continue;
        const { ownerKey, cleanContent } = extractNoteOwnerAndContent(item.content);
        if (!cleanContent) continue;
        if (ownerKey && user && ownerKey !== getCanonicalNoteUserKey(user)) continue;

        const normDate = normalizeNoteDate(item.date);
        const sig = `${cleanContent.toLocaleLowerCase('tr-TR')}|${normDate || ''}`;
        if (mergedMap.has(idStr) || seenSignatures.has(sig)) continue;

        seenSignatures.add(sig);
        mergedMap.set(idStr, {
          id: idStr,
          content: cleanContent,
          completed: Boolean(item.completed),
          date: normDate,
          created_by: item.created_by || user?.id || null
        });
      }
      if (key === 'dars_calendar_notes_default' && user) {
        localStorage.removeItem('dars_calendar_notes_default');
      }
    } catch {}
  }

  return Array.from(mergedMap.values());
}

export function saveCachedUserNotes(user: AuthUser | null | undefined, notes: CalendarNoteItem[]): void {
  const cleanNotes = notes
    .filter(n => n && n.id && !OBSOLETE_GLOBAL_NOTE_IDS.has(String(n.id)))
    .map(n => ({
      id: String(n.id),
      content: extractNoteOwnerAndContent(n.content).cleanContent,
      completed: Boolean(n.completed),
      date: normalizeNoteDate(n.date),
      created_by: n.created_by || user?.id || null
    }));
  const candidateKeys = getCandidateCacheKeys(user);
  for (const key of candidateKeys) {
    try {
      localStorage.setItem(key, JSON.stringify(cleanNotes));
    } catch {}
  }
  try {
    localStorage.setItem('dars_calendar_notes_last_sync', String(Date.now()));
  } catch {}
}

function getDeletedStorageKey(user?: AuthUser | null): string {
  return `dars_calendar_notes_deleted_${getCanonicalNoteUserKey(user)}`;
}

export function loadDeletedNoteIds(user?: AuthUser | null): Set<string> {
  try {
    const raw = localStorage.getItem(getDeletedStorageKey(user));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

export function markNoteIdDeleted(user: AuthUser | null | undefined, noteId: string): void {
  try {
    const set = loadDeletedNoteIds(user);
    set.add(String(noteId));
    localStorage.setItem(getDeletedStorageKey(user), JSON.stringify(Array.from(set)));
  } catch {}
}

export function clearDeletedNoteId(user: AuthUser | null | undefined, noteId: string): void {
  try {
    const set = loadDeletedNoteIds(user);
    set.delete(String(noteId));
    localStorage.setItem(getDeletedStorageKey(user), JSON.stringify(Array.from(set)));
  } catch {}
}

interface PendingNoteUpdate {
  id: string;
  content?: string;
  completed?: boolean;
  date?: string | null;
}

function getPendingUpdatesKey(user?: AuthUser | null): string {
  return `dars_calendar_notes_pending_updates_${getCanonicalNoteUserKey(user)}`;
}

export function loadPendingNoteUpdates(user?: AuthUser | null): Record<string, PendingNoteUpdate> {
  try {
    const raw = localStorage.getItem(getPendingUpdatesKey(user));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function queuePendingNoteUpdate(user: AuthUser | null | undefined, update: PendingNoteUpdate): void {
  try {
    const map = loadPendingNoteUpdates(user);
    map[update.id] = { ...(map[update.id] || { id: update.id }), ...update };
    localStorage.setItem(getPendingUpdatesKey(user), JSON.stringify(map));
  } catch {}
}

export function removePendingNoteUpdate(user: AuthUser | null | undefined, noteId: string): void {
  try {
    const map = loadPendingNoteUpdates(user);
    delete map[noteId];
    localStorage.setItem(getPendingUpdatesKey(user), JSON.stringify(map));
  } catch {}
}

/**
 * Inserts a note into Edge API (`/api/user-notes`) AND Supabase `calendar_notes` with automatic fallback for:
 * 1) `date: null` vs `NOT NULL` constraint (falls back to '1970-01-01')
 * 2) `created_by` foreign key constraint (falls back to omitting `created_by` and using `[owner:key]` tag)
 */
export async function insertNoteToSupabase(
  supabase: SupabaseClient,
  orgId: string,
  user: AuthUser | null | undefined,
  note: CalendarNoteItem
): Promise<CalendarNoteItem | null> {
  const ownerKey = getCanonicalNoteUserKey(user);
  const cleanText = extractNoteOwnerAndContent(note.content).cleanContent;
  const taggedContent = encodeContentWithOwner(cleanText, ownerKey);
  const normalizedDate = normalizeNoteDate(note.date);
  const noteId = isValidUuid(note.id) ? note.id : generateNoteUuid();
  const userUuid = isValidUuid(user?.id) && !String(user?.id).startsWith('d3de0000-') ? user!.id : undefined;

  const normalizedNote: CalendarNoteItem = {
    id: noteId,
    content: cleanText,
    completed: Boolean(note.completed),
    date: normalizedDate,
    created_by: userUuid || null,
    created_at: note.created_at || new Date().toISOString()
  };

  // Immediately push to Cloudflare Edge API so mobile app sees it in <30ms
  void postEdgeUserNotesAction(user, {
    action: 'upsert',
    note: normalizedNote
  });

  try {
    await ensureSupabaseBackendSession();

    const tryInsert = async (payload: Record<string, any>) => {
      return supabase
        .from('calendar_notes')
        .insert(payload)
        .select('id,content,completed,date,created_by,created_at')
        .single();
    };

    const basePayload: Record<string, any> = {
      id: noteId,
      organization_id: orgId,
      content: taggedContent,
      completed: Boolean(note.completed),
      date: normalizedDate
    };
    if (userUuid) {
      basePayload.created_by = userUuid;
    }

    let res = await tryInsert(basePayload);

    // If already exists by primary key id, return normalized note
    if (res.error && (res.error.code === '23505' || String(res.error.message || '').includes('duplicate key'))) {
      return normalizedNote;
    }

    // Attempt 2: If date=null violated NOT NULL constraint, use UNDATED_SENTINEL_DATE
    if (res.error && normalizedDate === null) {
      res = await tryInsert({
        ...basePayload,
        date: UNDATED_SENTINEL_DATE
      });
    }

    // Attempt 3: If created_by violated FK constraint, omit created_by so DB default auth.uid() is used
    if (res.error && basePayload.created_by) {
      const withoutCreatedBy = { ...basePayload };
      delete withoutCreatedBy.created_by;
      res = await tryInsert(withoutCreatedBy);

      if (res.error && normalizedDate === null) {
        res = await tryInsert({
          ...withoutCreatedBy,
          date: UNDATED_SENTINEL_DATE
        });
      }
    }

    if (!res.error && res.data) {
      return normalizeDbNoteRow(res.data);
    }
  } catch {
    // Fall through to normalizedNote
  }

  return normalizedNote;
}

/**
 * Updates a note in Edge API (`/api/user-notes`) and Supabase `calendar_notes`.
 */
export async function updateNoteInSupabase(
  supabase: SupabaseClient,
  user: AuthUser | null | undefined,
  noteId: string,
  changes: { content?: string; completed?: boolean; date?: string | null }
): Promise<boolean> {
  void postEdgeUserNotesAction(user, {
    action: 'update',
    id: noteId,
    changes: {
      ...(changes.content !== undefined ? { content: extractNoteOwnerAndContent(changes.content).cleanContent } : {}),
      ...(changes.completed !== undefined ? { completed: Boolean(changes.completed) } : {}),
      ...(changes.date !== undefined ? { date: normalizeNoteDate(changes.date) } : {})
    }
  });

  try {
    await ensureSupabaseBackendSession();

    const ownerKey = getCanonicalNoteUserKey(user);
    const payload: Record<string, any> = {};

    if (changes.content !== undefined) {
      const cleanText = extractNoteOwnerAndContent(changes.content).cleanContent;
      payload.content = encodeContentWithOwner(cleanText, ownerKey);
    }
    if (changes.completed !== undefined) {
      payload.completed = Boolean(changes.completed);
    }
    if (changes.date !== undefined) {
      payload.date = normalizeNoteDate(changes.date);
    }

    let { error } = await supabase
      .from('calendar_notes')
      .update(payload)
      .eq('id', noteId);

    if (error && changes.date === null) {
      const retryRes = await supabase
        .from('calendar_notes')
        .update({ ...payload, date: UNDATED_SENTINEL_DATE })
        .eq('id', noteId);
      error = retryRes.error;
    }

    if (!error) {
      removePendingNoteUpdate(user, noteId);
      return true;
    }
  } catch {
    // Queue pending update below
  }

  queuePendingNoteUpdate(user, { id: noteId, ...changes });
  return false;
}

/**
 * Deletes a note from Edge API (`/api/user-notes`) and Supabase `calendar_notes`.
 */
export async function deleteNoteFromSupabase(
  supabase: SupabaseClient,
  user: AuthUser | null | undefined,
  noteId: string
): Promise<boolean> {
  markNoteIdDeleted(user, noteId);
  removePendingNoteUpdate(user, noteId);

  void postEdgeUserNotesAction(user, {
    action: 'delete',
    id: noteId
  });

  try {
    await ensureSupabaseBackendSession();
    const { error } = await supabase
      .from('calendar_notes')
      .delete()
      .eq('id', noteId);

    if (!error) {
      return true;
    }
  } catch {}
  return false;
}

export async function clearAllUserNotesInSupabase(
  supabase: SupabaseClient,
  orgId: string,
  user: AuthUser | null | undefined,
  currentNotes: CalendarNoteItem[]
): Promise<void> {
  for (const n of currentNotes) {
    markNoteIdDeleted(user, n.id);
    removePendingNoteUpdate(user, n.id);
  }
  saveCachedUserNotes(user, []);

  void postEdgeUserNotesAction(user, {
    action: 'clear'
  });

  try {
    await ensureSupabaseBackendSession();
    const ids = currentNotes.map(n => n.id).filter(isValidUuid);
    if (ids.length > 0) {
      await supabase
        .from('calendar_notes')
        .delete()
        .in('id', ids);
    }
    if (user?.id && isValidUuid(user.id)) {
      await supabase
        .from('calendar_notes')
        .delete()
        .eq('organization_id', orgId)
        .eq('created_by', user.id);
    }
  } catch {}
}

/**
 * Full two-way synchronization between browser localStorage, Cloudflare Edge (`/api/user-notes`),
 * and Supabase `calendar_notes` for the current user:
 * 1) Fetches Edge notes (`/api/user-notes`) in <30ms
 * 2) Flushes pending deletes & updates to Supabase (non-blocking if Supabase times out)
 * 3) Merges Edge + Supabase + local notes for this user (respecting deletedIds)
 * 4) Pushes merged list to Edge (`/api/user-notes`) so mobile & computer stay 100% in sync
 */
export async function syncUserCalendarNotes(
  supabase: SupabaseClient,
  orgId: string,
  user: AuthUser | null | undefined
): Promise<CalendarNoteItem[] | null> {
  const localNotes = loadCachedUserNotes(user);
  const currentDeleted = loadDeletedNoteIds(user);
  const currentPending = loadPendingNoteUpdates(user);

  const edgeNotesPromise = fetchEdgeUserNotes(user);

  const supabaseTask = (async (): Promise<any[] | null> => {
    try {
      await ensureSupabaseBackendSession();
      if (currentDeleted.size > 0) {
        const idsToDelete = Array.from(currentDeleted).filter(isValidUuid);
        if (idsToDelete.length > 0) {
          await supabase.from('calendar_notes').delete().in('id', idsToDelete);
        }
      }
      const pendingList = Object.values(currentPending);
      for (const upd of pendingList) {
        if (isValidUuid(upd.id)) {
          await updateNoteInSupabase(supabase, user, upd.id, upd);
        }
      }
      const { data, error } = await supabase
        .from('calendar_notes')
        .select('id,content,completed,date,created_by,created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) return data;
    } catch {}
    return null;
  })();

  const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 4000));
  const [edgeData, dbRows] = await Promise.all([
    edgeNotesPromise,
    Promise.race([supabaseTask, timeoutPromise])
  ]);

  if (edgeData && Array.isArray(edgeData.deletedIds)) {
    for (const dId of edgeData.deletedIds) {
      if (dId) {
        currentDeleted.add(dId);
        markNoteIdDeleted(user, dId);
      }
    }
  }

  const edgeNotes = edgeData?.notes || null;
  const hasServerResponse = Array.isArray(edgeNotes) || Array.isArray(dbRows);
  const serverNoteIds = new Set<string>();
  if (Array.isArray(edgeNotes)) {
    for (const en of edgeNotes) {
      if (en && en.id) serverNoteIds.add(String(en.id).replace(/^note-/, ''));
    }
  }
  if (Array.isArray(dbRows)) {
    for (const row of dbRows) {
      if (row && row.id && doesRowBelongToUser(row, user)) {
        serverNoteIds.add(String(row.id).replace(/^note-/, ''));
      }
    }
  }

  const mergedNotes: CalendarNoteItem[] = [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();

  const addCandidate = (item: CalendarNoteItem) => {
    if (!item || !item.id) return;
    const idStr = String(item.id).replace(/^note-/, '');
    if (OBSOLETE_GLOBAL_NOTE_IDS.has(idStr) || currentDeleted.has(idStr)) return;
    let cleanText = extractNoteOwnerAndContent(item.content).cleanContent;
    let completed = Boolean(item.completed);
    let normDate = normalizeNoteDate(item.date);

    if (currentPending[idStr]) {
      const p = currentPending[idStr];
      if (p.content !== undefined) cleanText = extractNoteOwnerAndContent(p.content).cleanContent;
      if (p.completed !== undefined) completed = Boolean(p.completed);
      if (p.date !== undefined) normDate = normalizeNoteDate(p.date);
    }
    if (!cleanText) return;

    const sig = `${cleanText.toLocaleLowerCase('tr-TR')}|${normDate || ''}`;
    if (seenIds.has(idStr) || seenSignatures.has(sig)) return;

    seenIds.add(idStr);
    seenSignatures.add(sig);
    mergedNotes.push({
      id: idStr,
      content: cleanText,
      completed,
      date: normDate,
      created_by: item.created_by || user?.id || null,
      created_at: item.created_at
    });
  };

  // 1. Add Edge API notes first (most up-to-date cross-device store)
  if (Array.isArray(edgeNotes)) {
    for (const en of edgeNotes) {
      addCandidate(en);
    }
  }

  // 2. Add Supabase rows belonging to this user
  if (Array.isArray(dbRows)) {
    for (const row of dbRows) {
      if (!row || !row.id) continue;
      if (!doesRowBelongToUser(row, user)) continue;
      addCandidate(normalizeDbNoteRow(row));
    }
  }

  // 3. Add local cached notes only if they are not deleted on server
  for (const localNote of localNotes) {
    if (!localNote || !localNote.id) continue;
    const idStr = String(localNote.id).replace(/^note-/, '');
    if (isValidUuid(idStr) && hasServerResponse && !serverNoteIds.has(idStr)) {
      currentDeleted.add(idStr);
      markNoteIdDeleted(user, idStr);
      continue;
    }
    addCandidate(localNote);
  }

  // 4. Sync merged state back to Edge API so iPhone and computer stay identical
  const syncedEdge = await postEdgeUserNotesAction(user, {
    action: 'sync',
    notes: mergedNotes,
    deletedIds: Array.from(currentDeleted)
  });

  const finalNotes = Array.isArray(syncedEdge) ? syncedEdge : mergedNotes;
  saveCachedUserNotes(user, finalNotes);
  return finalNotes;
}
