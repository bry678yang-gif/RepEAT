// Penyimpanan lokal (localStorage). Tidak pernah melempar galat ke layar.
import { seedState, isValidState, migrateState } from './logic.js';

const KEY = 'kk_demo_v1';
const UI_KEY = 'kk_ui_v1';

export function load(now) {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { return { state: seedState(now), status: 'nostorage' }; }
  if (raw === null) { const state = seedState(now); save(state); return { state, status: 'fresh' }; }
  try {
    const state = JSON.parse(raw);
    if (!isValidState(state)) throw new Error('bentuk tidak valid');
    return { state: migrateState(state), status: 'ok' };
  } catch (e) {
    return { state: seedState(now), status: 'corrupt' };
  }
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
}

export function reset(now) {
  const state = seedState(now);
  try { localStorage.removeItem(UI_KEY); } catch (e) { /* abaikan */ }
  save(state);
  return state;
}

export function loadUi() {
  try { const u = JSON.parse(localStorage.getItem(UI_KEY)); if (u && (u.role === 'toko' || u.role === 'pembeli')) return u; } catch (e) { /* abaikan */ }
  return { role: null, storeId: 's1' };
}
export function saveUi(ui) { try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (e) { /* abaikan */ } }
