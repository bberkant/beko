// Cloudflare Pages Function: /api/user-notes
// Provides instant (<30ms) per-user note synchronization between Web Panel (cem.amasyaetas.com)
// and iOS Mobile App (ios_prototype.html) using Cloudflare Edge Cache API + Isolate Memory.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate'
};

const DEFAULT_BERKANT_NOTES = [
  {
    id: '3eb3aecd-4d4e-4670-9271-ad9a770b7569',
    content: 'Önemli Etkinlikleri Kaydetme Portala Ekle',
    completed: false,
    date: null,
    created_by: '9c242e61-e15f-41b5-b1e6-60a02baed90a',
    updated_at: '2026-10-26T10:00:00.000Z'
  },
  {
    id: 'aac301fb-9d07-4a61-b5c6-30713ab3fdcc',
    content: 'Halk 5 tane etik pos parası aldı kontrol et fazlaları iptal et',
    completed: false,
    date: null,
    created_by: '9c242e61-e15f-41b5-b1e6-60a02baed90a',
    updated_at: '2026-10-26T10:01:00.000Z'
  }
];

const OBSOLETE_GLOBAL_NOTE_IDS = new Set([
  'c3a360f7-7945-451e-b534-f2e9df09085c',
  '9193b56e-a5b4-4b2e-8104-e15745e105a1',
  'd550e1c2-55d7-41eb-9499-cd7cba9f8b79',
  'c8266daf-3c0e-43a3-b218-3d46cf4cc6b5',
  '9bdb418a-612b-4283-ba19-e93924342dc4',
  'a74a1819-6adb-4db0-9078-1dc78c6b54f1',
  'c1404e87-a5f7-4078-a663-0d674a88cbce',
  '5ce63124-9268-48c4-8d1b-5dfb25e2b737',
  'e5a9f279-e39c-4dae-8fd8-7227a51aa5bd',
  '15b5c2c7-559e-4a03-a8e9-1b804e254b62',
  'ffe8f046-5882-4a49-b6f7-787ab0fdeb58',
  '8dd7b42c-a6e3-43c4-8905-a6afb763452b'
]);

function normalizeUserKey(raw) {
  if (!raw) return 'berkant';
  const s = String(raw)
    .trim()
    .toLowerCase()
    .replace(/@(dars|ops360|ets360)\.local$/i, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, '');
  if (s === '9c242e61-e15f-41b5-b1e6-60a02baed90a' || s === '291129b0-b5be-447e-97e1-51c613446aa3' || s === 'admin') {
    return 'berkant';
  }
  return s || 'berkant';
}

function stripOwnerTag(raw) {
  return String(raw || '').replace(/^\[owner:[^\]]+\]\s*/i, '').trim();
}

function normalizeDate(rawDate) {
  if (!rawDate) return null;
  const s = String(rawDate).trim().slice(0, 10);
  if (!s || s === '1970-01-01' || s === 'null' || s === 'undefined') return null;
  return s;
}

function getMemoryStore() {
  if (!globalThis.__DARS_EDGE_USER_NOTES__) {
    globalThis.__DARS_EDGE_USER_NOTES__ = new Map();
  }
  return globalThis.__DARS_EDGE_USER_NOTES__;
}

async function readUserState(userKey) {
  const mem = getMemoryStore();
  let state = mem.get(userKey);

  try {
    const cacheKey = new Request(`https://edge-notes.amasyaetas.local/v2/user-notes/${encodeURIComponent(userKey)}`, { method: 'GET' });
    const cachedRes = await caches.default.match(cacheKey);
    if (cachedRes) {
      const parsed = await cachedRes.json();
      if (parsed && Array.isArray(parsed.notes)) {
        if (!state || (parsed.updatedAt || 0) >= (state.updatedAt || 0)) {
          state = parsed;
          mem.set(userKey, state);
        }
      }
    }
  } catch (e) {}

  if (!state) {
    state = {
      user: userKey,
      notes: userKey === 'berkant' ? DEFAULT_BERKANT_NOTES.map(n => ({ ...n })) : [],
      deletedIds: [],
      updatedAt: Date.now()
    };
    mem.set(userKey, state);
  }

  return state;
}

async function writeUserState(userKey, state) {
  const mem = getMemoryStore();
  const nextState = {
    user: userKey,
    notes: Array.isArray(state.notes) ? state.notes : [],
    deletedIds: Array.isArray(state.deletedIds) ? state.deletedIds.slice(-300) : [],
    updatedAt: Date.now()
  };
  mem.set(userKey, nextState);

  try {
    const cacheKey = new Request(`https://edge-notes.amasyaetas.local/v2/user-notes/${encodeURIComponent(userKey)}`, { method: 'GET' });
    const cacheRes = new Response(JSON.stringify(nextState), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=2592000'
      }
    });
    await caches.default.put(cacheKey, cacheRes);
  } catch (e) {}

  return nextState;
}

function deduplicateAndFilterNotes(notesList, deletedSet) {
  const result = [];
  const seenIds = new Set();
  const seenSigs = new Set();

  for (const item of notesList) {
    if (!item || !item.id) continue;
    const idStr = String(item.id).replace(/^note-/, '');
    if (OBSOLETE_GLOBAL_NOTE_IDS.has(idStr)) continue;
    if (deletedSet.has(idStr)) continue;

    const cleanContent = stripOwnerTag(item.content);
    if (!cleanContent) continue;

    const normDate = normalizeDate(item.rawDate !== undefined ? item.rawDate : item.date);
    const sig = `${cleanContent.toLowerCase()}|${normDate || ''}`;

    if (seenIds.has(idStr) || seenSigs.has(sig)) continue;
    seenIds.add(idStr);
    seenSigs.add(sig);

    result.push({
      id: idStr,
      content: cleanContent,
      completed: Boolean(item.completed),
      date: normDate,
      created_by: item.created_by || null,
      updated_at: item.updated_at || new Date().toISOString()
    });
  }

  return result;
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const queryUser = url.searchParams.get('user');

  if (request.method === 'GET') {
    const userKey = normalizeUserKey(queryUser);
    const state = await readUserState(userKey);
    const deletedSet = new Set(state.deletedIds || []);
    const cleanNotes = deduplicateAndFilterNotes(state.notes || [], deletedSet);
    return new Response(
      JSON.stringify({
        ok: true,
        user: userKey,
        notes: cleanNotes,
        deletedIds: Array.from(deletedSet),
        updatedAt: state.updatedAt
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  }

  if (request.method === 'POST') {
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers: CORS_HEADERS });
    }

    const userKey = normalizeUserKey(body.user || queryUser);
    const action = body.action || 'sync';
    const state = await readUserState(userKey);
    const deletedSet = new Set(state.deletedIds || []);

    if (Array.isArray(body.deletedIds)) {
      body.deletedIds.forEach(id => {
        if (id) deletedSet.add(String(id).replace(/^note-/, ''));
      });
    }

    if (action === 'delete' && body.noteId) {
      const targetId = String(body.noteId).replace(/^note-/, '');
      deletedSet.add(targetId);
      const filtered = (state.notes || []).filter(n => String(n.id).replace(/^note-/, '') !== targetId);
      const saved = await writeUserState(userKey, {
        notes: deduplicateAndFilterNotes(filtered, deletedSet),
        deletedIds: Array.from(deletedSet)
      });
      return new Response(JSON.stringify({ ok: true, user: userKey, notes: saved.notes, deletedIds: saved.deletedIds }), {
        status: 200,
        headers: CORS_HEADERS
      });
    }

    if (action === 'clear') {
      (state.notes || []).forEach(n => {
        if (n && n.id) deletedSet.add(String(n.id).replace(/^note-/, ''));
      });
      if (Array.isArray(body.noteIds)) {
        body.noteIds.forEach(id => {
          if (id) deletedSet.add(String(id).replace(/^note-/, ''));
        });
      }
      const saved = await writeUserState(userKey, {
        notes: [],
        deletedIds: Array.from(deletedSet)
      });
      return new Response(JSON.stringify({ ok: true, user: userKey, notes: saved.notes, deletedIds: saved.deletedIds }), {
        status: 200,
        headers: CORS_HEADERS
      });
    }

    if (action === 'upsert' && body.note) {
      const incoming = body.note;
      const targetId = String(incoming.id || '').replace(/^note-/, '');
      if (targetId) {
        deletedSet.delete(targetId);
      }
      const cleanIncoming = {
        id: targetId || crypto.randomUUID(),
        content: stripOwnerTag(incoming.content),
        completed: Boolean(incoming.completed),
        date: normalizeDate(incoming.rawDate !== undefined ? incoming.rawDate : incoming.date),
        created_by: incoming.created_by || null,
        updated_at: new Date().toISOString()
      };

      const existingList = [...(state.notes || [])];
      const idx = existingList.findIndex(n => String(n.id).replace(/^note-/, '') === cleanIncoming.id);
      if (idx !== -1) {
        existingList[idx] = { ...existingList[idx], ...cleanIncoming };
      } else {
        existingList.push(cleanIncoming);
      }

      const saved = await writeUserState(userKey, {
        notes: deduplicateAndFilterNotes(existingList, deletedSet),
        deletedIds: Array.from(deletedSet)
      });
      return new Response(JSON.stringify({ ok: true, user: userKey, notes: saved.notes, deletedIds: saved.deletedIds }), {
        status: 200,
        headers: CORS_HEADERS
      });
    }

    // Default action === 'sync': merge client notes with edge notes
    // Client notes take precedence for existing IDs (so completion/content edits from client win)
    const incomingNotes = Array.isArray(body.notes) ? body.notes : [];
    const byId = new Map();

    for (const existing of (state.notes || [])) {
      if (!existing || !existing.id) continue;
      const idStr = String(existing.id).replace(/^note-/, '');
      if (deletedSet.has(idStr) || OBSOLETE_GLOBAL_NOTE_IDS.has(idStr)) continue;
      byId.set(idStr, existing);
    }

    for (const inc of incomingNotes) {
      if (!inc || !inc.id) continue;
      const idStr = String(inc.id).replace(/^note-/, '');
      if (deletedSet.has(idStr) || OBSOLETE_GLOBAL_NOTE_IDS.has(idStr)) continue;
      const prev = byId.get(idStr);
      byId.set(idStr, {
        ...(prev || {}),
        id: idStr,
        content: stripOwnerTag(inc.content !== undefined ? inc.content : (prev && prev.content)),
        completed: inc.completed !== undefined ? Boolean(inc.completed) : Boolean(prev && prev.completed),
        date: normalizeDate(inc.rawDate !== undefined ? inc.rawDate : (inc.date !== undefined ? inc.date : (prev && prev.date))),
        created_by: inc.created_by || (prev && prev.created_by) || null,
        updated_at: new Date().toISOString()
      });
    }

    const mergedList = deduplicateAndFilterNotes(Array.from(byId.values()), deletedSet);
    const saved = await writeUserState(userKey, {
      notes: mergedList,
      deletedIds: Array.from(deletedSet)
    });

    return new Response(JSON.stringify({ ok: true, user: userKey, notes: saved.notes, deletedIds: saved.deletedIds }), {
      status: 200,
      headers: CORS_HEADERS
    });
  }

  return new Response(JSON.stringify({ ok: false, error: 'Method Not Allowed' }), { status: 405, headers: CORS_HEADERS });
}
