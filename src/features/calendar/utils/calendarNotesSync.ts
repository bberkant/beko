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
        if (deletedSet.has(idStr)) continue;
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
  const cleanNotes = notes.map(n => ({
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
 * Inserts a note into Supabase `calendar_notes` with automatic fallback for:
 * 1) `date: null` vs `NOT NULL` constraint (falls back to '1970-01-01')
 * 2) `created_by` foreign key constraint (falls back to omitting `created_by` and using `[owner:key]` tag)
 */
export async function insertNoteToSupabase(
  supabase: SupabaseClient,
  orgId: string,
  user: AuthUser | null | undefined,
  note: CalendarNoteItem
): Promise<CalendarNoteItem | null> {
  await ensureSupabaseBackendSession();

  const ownerKey = getCanonicalNoteUserKey(user);
  const cleanText = extractNoteOwnerAndContent(note.content).cleanContent;
  const taggedContent = encodeContentWithOwner(cleanText, ownerKey);
  const normalizedDate = normalizeNoteDate(note.date);
  const noteId = isValidUuid(note.id) ? note.id : generateNoteUuid();
  const userUuid = isValidUuid(user?.id) && !String(user?.id).startsWith('d3de0000-') ? user!.id : undefined;

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
    return {
      id: noteId,
      content: cleanText,
      completed: Boolean(note.completed),
      date: normalizedDate,
      created_by: userUuid || null
    };
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

  return null;
}

/**
 * Updates a note in Supabase `calendar_notes` with automatic fallback for sentinel date and owner tag.
 */
export async function updateNoteInSupabase(
  supabase: SupabaseClient,
  user: AuthUser | null | undefined,
  noteId: string,
  changes: { content?: string; completed?: boolean; date?: string | null }
): Promise<boolean> {
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

  queuePendingNoteUpdate(user, { id: noteId, ...changes });
  return false;
}

/**
 * Deletes a note from Supabase `calendar_notes` and records it in deleted set until confirmed.
 */
export async function deleteNoteFromSupabase(
  supabase: SupabaseClient,
  user: AuthUser | null | undefined,
  noteId: string
): Promise<boolean> {
  markNoteIdDeleted(user, noteId);
  removePendingNoteUpdate(user, noteId);
  await ensureSupabaseBackendSession();

  const { error } = await supabase
    .from('calendar_notes')
    .delete()
    .eq('id', noteId);

  if (!error) {
    clearDeletedNoteId(user, noteId);
    return true;
  }
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
  await ensureSupabaseBackendSession();

  const ids = currentNotes.map(n => n.id).filter(isValidUuid);
  if (ids.length > 0) {
    const { error } = await supabase
      .from('calendar_notes')
      .delete()
      .in('id', ids);
    if (!error) {
      ids.forEach(id => clearDeletedNoteId(user, id));
    }
  }
  if (user?.id && isValidUuid(user.id)) {
    await supabase
      .from('calendar_notes')
      .delete()
      .eq('organization_id', orgId)
      .eq('created_by', user.id);
  }
}

/**
 * Full two-way synchronization between browser localStorage and Supabase `calendar_notes` for the current user:
 * 1) Flushes pending deletes & updates
 * 2) Fetches all remote notes belonging to this user
 * 3) Automatically uploads any local notes in localStorage that haven't been synced to Supabase yet
 * 4) Returns the merged, deduplicated list of notes for this user
 */
export async function syncUserCalendarNotes(
  supabase: SupabaseClient,
  orgId: string,
  user: AuthUser | null | undefined
): Promise<CalendarNoteItem[] | null> {
  await ensureSupabaseBackendSession();

  const localNotes = loadCachedUserNotes(user);
  const deletedIds = loadDeletedNoteIds(user);
  const pendingUpdates = loadPendingNoteUpdates(user);

  // 1. Flush any pending deletes
  if (deletedIds.size > 0) {
    const idsToDelete = Array.from(deletedIds).filter(isValidUuid);
    if (idsToDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('calendar_notes')
        .delete()
        .in('id', idsToDelete);
      if (!delErr) {
        idsToDelete.forEach(id => clearDeletedNoteId(user, id));
      }
    }
  }

  // 2. Flush any pending updates
  const pendingList = Object.values(pendingUpdates);
  for (const upd of pendingList) {
    if (isValidUuid(upd.id)) {
      await updateNoteInSupabase(supabase, user, upd.id, upd);
    }
  }

  // 3. Fetch all notes for this organization from Supabase and filter to this user
  const { data, error } = await supabase
    .from('calendar_notes')
    .select('id,content,completed,date,created_by,created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true });

  if (error || !Array.isArray(data)) {
    return null;
  }

  // Filter rows belonging to this user and not marked deleted locally
  const currentDeleted = loadDeletedNoteIds(user);
  const currentPending = loadPendingNoteUpdates(user);
  const remoteUserNotes: CalendarNoteItem[] = [];
  const remoteIds = new Set<string>();
  const remoteSignatures = new Set<string>();

  for (const row of data) {
    if (!row || !row.id) continue;
    const idStr = String(row.id);
    if (currentDeleted.has(idStr)) continue;
    if (!doesRowBelongToUser(row, user)) continue;

    let normalized = normalizeDbNoteRow(row);
    if (currentPending[idStr]) {
      const p = currentPending[idStr];
      normalized = {
        ...normalized,
        content: p.content !== undefined ? extractNoteOwnerAndContent(p.content).cleanContent : normalized.content,
        completed: p.completed !== undefined ? Boolean(p.completed) : normalized.completed,
        date: p.date !== undefined ? normalizeNoteDate(p.date) : normalized.date
      };
    }
    if (!normalized.content) continue;

    const sig = `${normalized.content.toLocaleLowerCase('tr-TR')}|${normalized.date || ''}`;
    if (remoteIds.has(idStr) || remoteSignatures.has(sig)) continue;

    remoteIds.add(idStr);
    remoteSignatures.add(sig);
    remoteUserNotes.push(normalized);
  }

  // 4. Auto-backfill: Any local note in this browser's localStorage that is not yet in Supabase gets uploaded!
  const mergedNotes = [...remoteUserNotes];

  for (const localNote of localNotes) {
    const localId = String(localNote.id);
    if (currentDeleted.has(localId)) continue;
    const cleanText = extractNoteOwnerAndContent(localNote.content).cleanContent;
    if (!cleanText) continue;

    const normDate = normalizeNoteDate(localNote.date);
    const sig = `${cleanText.toLocaleLowerCase('tr-TR')}|${normDate || ''}`;

    if (remoteIds.has(localId) || remoteSignatures.has(sig)) {
      continue;
    }

    // Upload this unsynced local note to Supabase so all other browsers & mobile app receive it!
    const inserted = await insertNoteToSupabase(supabase, orgId, user, {
      ...localNote,
      content: cleanText,
      date: normDate
    });

    if (inserted) {
      remoteIds.add(inserted.id);
      remoteSignatures.add(sig);
      mergedNotes.push(inserted);
    } else {
      // Keep locally until next sync cycle succeeds
      remoteIds.add(localId);
      remoteSignatures.add(sig);
      mergedNotes.push({
        ...localNote,
        content: cleanText,
        date: normDate
      });
    }
  }

  saveCachedUserNotes(user, mergedNotes);
  return mergedNotes;
}
