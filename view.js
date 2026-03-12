// ==========================================
// 定数
// ==========================================

const STORAGE_KEY_SCANS = 'allergyScans';

const ALLERGEN_META = {
  '卵':    { icon: '🥚', desc: 'Egg' },
  '乳':    { icon: '🥛', desc: 'Dairy / Milk' },
  '小麦':  { icon: '🌾', desc: 'Wheat / Gluten' },
  'えび':  { icon: '🦐', desc: 'Shrimp / Prawn' },
  'かに':  { icon: '🦀', desc: 'Crab' },
  'そば':  { icon: '🍜', desc: 'Soba / Buckwheat' },
  '落花生': { icon: '🥜', desc: 'Peanut' },
  'くるみ': { icon: '🌰', desc: 'Walnut' },
};

// ==========================================
// ユーティリティ
// ==========================================

function escHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==========================================
// スキャンデータ管理
// ==========================================

function loadScans() {
  const raw = localStorage.getItem(STORAGE_KEY_SCANS);
  if (!raw) return [];
  return JSON.parse(raw);
}

function saveScans(list) {
  localStorage.setItem(STORAGE_KEY_SCANS, JSON.stringify(list));
}

// ==========================================
// URLパラメータからスキャンデータを取得・保存
// ==========================================

const params    = new URLSearchParams(location.search);
const scanId    = params.get('sid')   || '';
const name      = params.get('name')  || '';
const dataRaw   = params.get('data')  || '';
const other     = params.get('other') ? decodeURIComponent(params.get('other')) : '';
const expiresParam = params.get('expires') || '';

const allergens = dataRaw ? dataRaw.split(',').filter(Boolean) : [];

// URLにスキャンデータがある場合のみ保存処理を行う
if (scanId && (allergens.length || other)) {
  let scans = loadScans();

  // 同じsidは重複して追加しない（リロード対策）
  const alreadyExists = scans.find(s => s.id === scanId);

  if (!alreadyExists) {
    // 同じ名前の古いデータは上書き
    scans = scans.filter(s => s.name !== name);

    const expiresAt = expiresParam === 'never'
      ? null
      : (parseInt(expiresParam) || Date.now() + 15 * 60 * 1000);

    scans.push({
      id:        scanId,
      name,
      allergens,
      other,
      expiresAt,
      scannedAt: Date.now()
    });

    saveScans(scans);
  }
  history.replaceState(null, '', location.pathname);
}


// ==========================================
// タイムスタンプ表示
// ==========================================

const now = new Date();
document.getElementById('timestamp').textContent =
  `${now.getMonth() + 1}/${now.getDate()} ` +
  `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

// ==========================================
// 画面描画
// ==========================================

function render() {
  let scans  = loadScans();
  const nowMs = Date.now();

  // 期限切れを削除
  const filtered = scans.filter(s => s.expiresAt === null || s.expiresAt > nowMs);
  if (filtered.length !== scans.length) {
    saveScans(filtered);
    scans = filtered;
  }

  const content = document.getElementById('content');

  if (!scans.length) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✓</div>
        <h2>アクティブなアレルギー情報はありません</h2>
        <p>QRコードをスキャンすると<br>ここに情報が表示されます</p>
      </div>`;
    return;
  }

  let html = `
    <div class="warning-banner">
      <div class="warning-icon">🌿</div>
      <div class="warning-text">
        <h2>以下の食物にアレルギーがあります。</h2>
        <p>ご配慮のほどお願い致します。</p>
      </div>
    </div>
    <div class="privacy-note">
      📋 この画面は本人が登録した情報を表示しています。<br>あなたの端末情報・位置情報・個人情報は一切取得していません。<br>この情報は設定時間経過後自動的に消去されます。
    </div>`;

  scans.forEach(scan => {
    const remaining = scan.expiresAt ? scan.expiresAt - nowMs : null;
    const timerHtml = formatTimer(scan.id, remaining);

    html += `
      <div class="person-card" id="card-${scan.id}">
        <div class="person-header">
          <div class="person-name">👤 ${escHtml(scan.name)}</div>
          ${timerHtml}
        </div>
        <div class="allergen-list">`;

    scan.allergens.forEach(a => {
      const meta = ALLERGEN_META[a] || { icon: '⚠️', desc: 'Allergen' };
      html += `
          <div class="allergen-row">
            <span class="allergen-emoji">${meta.icon}</span>
            <span class="allergen-name">${escHtml(a)}</span>
            <span class="allergen-desc">${meta.desc}</span>
          </div>`;
    });

    html += `</div>`;

    if (scan.other) {
      html += `<div class="other-note">${escHtml(scan.other)}</div>`;
    }

    html += `</div>`;
  });

  content.innerHTML = html;
}

function formatTimer(id, remaining) {
  if (remaining === null) {
    return `<div class="person-timer never" id="timer-${id}">∞</div>`;
  }
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const urgent  = remaining < 60000 ? ' urgent' : '';
  return `<div class="person-timer${urgent}" id="timer-${id}">${minutes}:${String(seconds).padStart(2, '0')}</div>`;
}

// ==========================================
// タイマー更新（1秒ごと・DOM再描画なし）
// ==========================================

function updateTimers() {
  const scans  = loadScans();
  const nowMs   = Date.now();
  let needsRender = false;

  scans.forEach(scan => {
    if (scan.expiresAt === null) return;

    const remaining = scan.expiresAt - nowMs;

    if (remaining <= 0) {
      needsRender = true;
      return;
    }

    const timerEl = document.getElementById(`timer-${scan.id}`);
    if (!timerEl) return;

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    timerEl.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;

    if (remaining < 60000) timerEl.classList.add('urgent');
  });

  // 期限切れが発生した場合は再描画
  if (needsRender) render();
}

// ==========================================
// 全消去
// ==========================================

function clearAll() {
  if (!confirm('表示中のアレルギー情報をすべて消去しますか？')) return;
  saveScans([]);
  render();
}

// ==========================================
// 別タブからのスキャン検知（localStorage変更イベント）
// ==========================================

window.addEventListener('storage', e => {
  if (e.key === STORAGE_KEY_SCANS) render();
});

// ==========================================
// 起動
// ==========================================

render();
setInterval(updateTimers, 1000);
