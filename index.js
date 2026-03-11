// ==========================================
// 定数
// ==========================================

const STORAGE_KEY_PROFILES = 'allergyProfiles';
const STORAGE_KEY_ACTIVE   = 'allergyActiveProfile';
const STORAGE_KEY_SETTINGS = 'allergySettings';

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
// データ読み書き
// ==========================================

function loadProfiles() {
  const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
  if (!raw) return [createProfile('自分')];
  return JSON.parse(raw);
}

function saveProfiles(list) {
  localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(list));
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
  if (!raw) return { neverExpire: false, defaultTimer: 15 };
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

let profiles     = [];
let activeId     = null;
let settings     = {};
let selectedTimer = 15;

// ==========================================
// 初期化
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
  profiles      = loadProfiles();
  activeId      = loadActiveId(profiles);
  settings      = loadSettings();
  selectedTimer = settings.defaultTimer || 15;

  // チェックボックス変更時に自動保存
  document.querySelectorAll('.allergens-grid input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', saveCurrentProfile);
  });

  // テキストエリア変更時に自動保存
  document.getElementById('other-input').addEventListener('input', saveCurrentProfile);

  renderTabs();
  renderProfile();
  renderTimerSelector();
  renderSettings();
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
      // アクティブタブ：編集ボタンを表示
      const editBtn = document.createElement('button');
      editBtn.className = 'tab-edit';
      editBtn.textContent = '✏';
      editBtn.title = '名前を変更';
      editBtn.addEventListener('click', e => { e.stopPropagation(); startRename(p.id); });
      tab.appendChild(editBtn);

      // 複数プロフィールがある場合のみ削除ボタンを表示
      if (profiles.length > 1) {
        const delBtn = document.createElement('button');
        delBtn.className = 'tab-delete';
        delBtn.textContent = '×';
        delBtn.title = '削除';
        delBtn.addEventListener('click', e => { e.stopPropagation(); deleteProfile(p.id); });
        tab.appendChild(delBtn);
      }
    } else {
      // 非アクティブタブ：クリックで切り替え
      tab.addEventListener('click', () => switchProfile(p.id));
    }

    container.appendChild(tab);
  });

  // プロフィール追加ボタン
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
  // 追加直後にリネーム開始
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
    const newName  = input.value.trim() || profile.name;
    profile.name   = newName;
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
  const profile    = getActiveProfile();
  profile.allergens = [];
  profile.other     = '';
  saveProfiles(profiles);
  renderProfile();
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
  selectedTimer        = minutes;
  settings.defaultTimer = minutes;
  saveSettings(settings);
  renderTimerSelector();
}

// ==========================================
// 高度な設定
// ==========================================

function renderSettings() {
  document.getElementById('never-expire-toggle').checked = settings.neverExpire || false;
  updateTimerSectionState();
}

function toggleNeverExpire() {
  settings.neverExpire = document.getElementById('never-expire-toggle').checked;
  saveSettings(settings);
  updateTimerSectionState();
}

function updateTimerSectionState() {
  const section = document.getElementById('timer-section');
  section.style.opacity       = settings.neverExpire ? '0.4' : '1';
  section.style.pointerEvents = settings.neverExpire ? 'none' : 'auto';
}

function toggleAdvancedSettings() {
  const panel = document.getElementById('advanced-panel');
  const arrow = document.getElementById('advanced-arrow');
  const isOpen = panel.classList.toggle('open');
  arrow.textContent = isOpen ? '▲' : '▼';
}

// ==========================================
// QRコード生成
// ==========================================

function generateQR() {
  saveCurrentProfile();
  const profile = getActiveProfile();

  if (!profile.allergens.length && !profile.other) {
    document.getElementById('no-sel-msg').style.display = 'block';
    return;
  }
  document.getElementById('no-sel-msg').style.display = 'none';

  // URLパラメータを構築
  const params = new URLSearchParams();
  params.set('sid',  generateId());          // スキャンID（重複防止）
  params.set('name', profile.name);
  if (profile.allergens.length) params.set('data',  profile.allergens.join(','));
  if (profile.other)            params.set('other', encodeURIComponent(profile.other));

  if (settings.neverExpire) {
    params.set('expires', 'never');
  } else {
    params.set('expires', (Date.now() + selectedTimer * 60 * 1000).toString());
  }

  const url = `${BASE_URL}?${params.toString()}`;

  // QR生成
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

  // タイマー表示
  document.getElementById('modal-timer').textContent = settings.neverExpire
    ? '⚙ 消去なし（高度な設定）'
    : `⏱ ${selectedTimer}分後に自動消去`;

  document.getElementById('modal').classList.add('open');
}

function closeModal(e) {
  if (e === null || e.target === document.getElementById('modal')) {
    document.getElementById('modal').classList.remove('open');
  }
}
