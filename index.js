// ==========================================
// 定数
// ==========================================

const STORAGE_KEY_PROFILES = 'allergyProfiles';
const STORAGE_KEY_ACTIVE   = 'allergyActiveProfile';
const STORAGE_KEY_SETTINGS = 'allergySettings';
const SUPABASE_URL = 'https://dswnnjcpnhqocknzhsfe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzd25uamNwbmhxb2Nrbnpoc2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODYyNjIsImV4cCI6MjA4ODg2MjI2Mn0.ixlQd3T7QzXBxJifCHscyrjmo9Q_ArYpV46ZA4aG7_o';

const BASE_URL = (() => {
  const u = location.href;
  return u.substring(0, u.lastIndexOf('/') + 1) + 'view.html';
})();

// ==========================================
// ユーティリティ
// ==========================================

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ==========================================
// Supabaseプロフィール同期
// ==========================================

async function syncProfileToSupabase(profile) {
  await fetch(`${SUPABASE_URL}/rest/v1/scans?on_conflict=short_id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation,resolution=merge-duplicates'
    },
    body: JSON.stringify({
      short_id: profile.id,
      data: JSON.stringify({
        name: profile.name,
        allergens: profile.allergens,
        other: profile.other
      }),
      expires_at: null
    })
  });
}
// ==========================================
// データ読み書き
// ==========================================

function loadProfiles() {
  const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
  if (!raw) return [createProfile('自分')];
  return JSON.parse(raw);
}

function saveProfiles(list) {
  localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(list));
  list.forEach(p => syncProfileToSupabase(p));
}

function loadActiveId(list) {
  const saved = localStorage.getItem(STORAGE_KEY_ACTIVE);
  if (saved && list.find(p => p.id === saved)) return saved;
  return list[0].id;
}

function saveActiveId(id) {
  localStorage.setItem(STORAGE_KEY_ACTIVE, id);
}

function loadSettings() {
  const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
  if (!raw) return { defaultTimer: 15, destination: 'restaurant' };
  return JSON.parse(raw);
}

function saveSettings(s) {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(s));
}

function createProfile(name) {
  return { id: generateId(), name, allergens: [], other: '' };
}

// ==========================================
// 状態
// ==========================================

let profiles      = [];
let activeId      = null;
let settings      = {};
let selectedTimer = 15;
let destination   = 'restaurant'; // 'restaurant' | 'friend'

// ==========================================
// 初期化
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
  profiles      = loadProfiles();
  activeId      = loadActiveId(profiles);
  settings      = loadSettings();
  selectedTimer = settings.defaultTimer  || 15;
  destination   = settings.destination   || 'restaurant';

  document.querySelectorAll('.allergens-grid input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', saveCurrentProfile);
  });

  document.getElementById('other-input').addEventListener('input', saveCurrentProfile);

  renderTabs();
  renderProfile();
  renderTimerSelector();
  renderDestination();
});

// ==========================================
// タブ管理
// ==========================================

function renderTabs() {
  const container = document.getElementById('tabs');
  container.innerHTML = '';

  profiles.forEach(p => {
    const tab = document.createElement('div');
    tab.className = 'tab' + (p.id === activeId ? ' active' : '');
    tab.dataset.id = p.id;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'tab-name';
    nameSpan.textContent = p.name;
    tab.appendChild(nameSpan);

    if (p.id === activeId) {
      const editBtn = document.createElement('button');
      editBtn.className = 'tab-edit';
      editBtn.textContent = '✏';
      editBtn.title = '名前を変更';
      editBtn.addEventListener('click', e => { e.stopPropagation(); startRename(p.id); });
      tab.appendChild(editBtn);

      if (profiles.length > 1) {
        const delBtn = document.createElement('button');
        delBtn.className = 'tab-delete';
        delBtn.textContent = '×';
        delBtn.title = '削除';
        delBtn.addEventListener('click', e => { e.stopPropagation(); deleteProfile(p.id); });
        tab.appendChild(delBtn);
      }
    } else {
      tab.addEventListener('click', () => switchProfile(p.id));
    }

    container.appendChild(tab);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'tab-add';
  addBtn.textContent = '＋';
  addBtn.title = 'プロフィール追加';
  addBtn.addEventListener('click', addProfile);
  container.appendChild(addBtn);
}

function switchProfile(id) {
  saveCurrentProfile();
  activeId = id;
  saveActiveId(id);
  renderTabs();
  renderProfile();
}

function addProfile() {
  saveCurrentProfile();
  const newProfile = createProfile(`プロフィール${profiles.length + 1}`);
  profiles.push(newProfile);
  saveProfiles(profiles);
  activeId = newProfile.id;
  saveActiveId(activeId);
  renderTabs();
  renderProfile();
  setTimeout(() => startRename(newProfile.id), 50);
}

function deleteProfile(id) {
  if (!confirm('このプロフィールを削除しますか？')) return;
  profiles = profiles.filter(p => p.id !== id);
  saveProfiles(profiles);
  if (activeId === id) {
    activeId = profiles[0].id;
    saveActiveId(activeId);
  }
  renderTabs();
  renderProfile();
}

function startRename(id) {
  const tab = document.querySelector(`.tab[data-id="${id}"]`);
  if (!tab) return;

  const nameSpan = tab.querySelector('.tab-name');
  const editBtn  = tab.querySelector('.tab-edit');
  const profile  = profiles.find(p => p.id === id);

  if (editBtn) editBtn.style.display = 'none';
  nameSpan.style.display = 'none';

  const input = document.createElement('input');
  input.className = 'tab-rename-input';
  input.value     = profile.name;
  input.maxLength = 10;
  tab.insertBefore(input, nameSpan);
  input.focus();
  input.select();

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    const newName = input.value.trim() || profile.name;
    profile.name  = newName;
    saveProfiles(profiles);
    renderTabs();
  };

  input.addEventListener('blur', finish);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  input.blur();
    if (e.key === 'Escape') { input.value = profile.name; input.blur(); }
  });
}

// ==========================================
// プロフィール表示・保存
// ==========================================

function getActiveProfile() {
  return profiles.find(p => p.id === activeId);
}

function renderProfile() {
  const profile = getActiveProfile();
  if (!profile) return;

  document.querySelectorAll('.allergens-grid input[type="checkbox"]').forEach(cb => {
    cb.checked = profile.allergens.includes(cb.value);
  });

  document.getElementById('other-input').value = profile.other || '';
}

function saveCurrentProfile() {
  const profile = getActiveProfile();
  if (!profile) return;

  profile.allergens = [...document.querySelectorAll('.allergens-grid input:checked')].map(e => e.value);
  profile.other     = document.getElementById('other-input').value.trim();
  saveProfiles(profiles);
}

// ==========================================
// リセット
// ==========================================

function resetCurrentProfile() {
  if (!confirm('現在のプロフィールの選択内容をリセットしますか？')) return;
  const profile     = getActiveProfile();
  profile.allergens = [];
  profile.other     = '';
  saveProfiles(profiles);
  renderProfile();
}

// ==========================================
// 用途選択
// ==========================================

function selectDestination(dest) {
  destination          = dest;
  settings.destination = dest;
  saveSettings(settings);
  renderDestination();
}

function renderDestination() {
  document.getElementById('dest-restaurant').classList.toggle('active', destination === 'restaurant');
  document.getElementById('dest-friend').classList.toggle('active', destination === 'friend');

  // 飲食店用のときだけタイマー選択を表示
  const timerSection = document.getElementById('timer-section');
  timerSection.classList.toggle('hidden', destination === 'friend');
}

// ==========================================
// タイマー選択
// ==========================================

function renderTimerSelector() {
  document.querySelectorAll('.timer-option').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.minutes) === selectedTimer);
  });
}

function selectTimer(minutes) {
  selectedTimer         = minutes;
  settings.defaultTimer = minutes;
  saveSettings(settings);
  renderTimerSelector();
}

// ==========================================
// QRコード生成
// ==========================================

async function generateQR() {
  saveCurrentProfile();
  const profile = getActiveProfile();

  if (!profile.allergens.length && !profile.other) {
    document.getElementById('no-sel-msg').style.display = 'block';
    return;
  }
  document.getElementById('no-sel-msg').style.display = 'none';

  let url;

  if (destination === 'restaurant') {
    const params = new URLSearchParams();
    params.set('sid',  generateId());
    params.set('name', profile.name);
    if (profile.allergens.length) params.set('data', profile.allergens.join(','));
    if (profile.other) params.set('other', encodeURIComponent(profile.other));
    params.set('expires', (Date.now() + selectedTimer * 60 * 1000).toString());
    url = `${BASE_URL}?${params.toString()}`;
  } else {
    url = `${BASE_URL}?id=${profile.id}`;
  }

  const container = document.getElementById('qr-container');
  container.innerHTML = '';
  new QRCode(container, {
    text: url,
    width: 200,
    height: 200,
    colorDark: '#1A1A1A',
    colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.M
  });

  // タグ表示
  const tagsEl = document.getElementById('modal-tags');
  tagsEl.innerHTML = '';

  const nameTag = document.createElement('div');
  nameTag.className   = 'modal-tag';
  nameTag.textContent = '👤 ' + profile.name;
  tagsEl.appendChild(nameTag);

  profile.allergens.forEach(item => {
    const t = document.createElement('div');
    t.className   = 'modal-tag';
    t.textContent = item;
    tagsEl.appendChild(t);
  });

  if (profile.other) {
    const t = document.createElement('div');
    t.className   = 'modal-tag';
    t.textContent = profile.other;
    tagsEl.appendChild(t);
  }

  document.getElementById('modal-timer').textContent = destination === 'friend'
    ? '👥 消去なし（知人・幹事用）'
    : `⏱ ${selectedTimer}分後に自動消去`;
  const shareButtons = document.getElementById('share-buttons');
  const lineBtn = document.getElementById('btn-line');
  if (destination === 'friend') {
    shareButtons.classList.add('visible');
    lineBtn.href = 'https://line.me/R/msg/text/?' + encodeURIComponent(url);
  } else {
    shareButtons.classList.remove('visible');
  }
  document.getElementById('allergen-list-text').classList.remove('open');
  document.querySelector('.btn-list').textContent = '一覧を表示 ▼';
  document.getElementById('modal').classList.add('open');
}

function closeModal(e) {
  if (e === null || e.target === document.getElementById('modal')) {
    document.getElementById('modal').classList.remove('open');
  }
}
function copyURL() {
  const lineBtn = document.getElementById('btn-line');
  const url = decodeURIComponent(lineBtn.href.replace('https://line.me/R/msg/text/?', ''));
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.querySelector('.btn-copy');
    btn.textContent = 'コピーしました！';
    setTimeout(() => { btn.textContent = 'URLをコピー'; }, 2000);
  });
}
function toggleList() {
  const profile = getActiveProfile();
  const listEl  = document.getElementById('allergen-list-text');
  const btn     = document.querySelector('.btn-list');
  const isOpen  = listEl.classList.toggle('open');

  btn.textContent = isOpen ? '一覧を閉じる ▲' : '一覧を表示 ▼';

  if (isOpen) {
    const lines = [];
    if (profile.allergens.length) {
      lines.push('【アレルゲン】');
      profile.allergens.forEach(a => lines.push('・' + a));
    }
    if (profile.other) {
      lines.push('');
      lines.push('【その他・備考】');
      lines.push(profile.other);
    }
    listEl.textContent = lines.join('\n');
  }
}
