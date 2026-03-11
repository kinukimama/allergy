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

// タイムスタンプ
const now = new Date();
document.getElementById('timestamp').textContent =
  `${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;

// URLパラメータからデータ取得
const params = new URLSearchParams(location.search);
const name    = params.get('name') || '';
const dataRaw = params.get('data') || '';
const other   = params.get('other') ? decodeURIComponent(params.get('other')) : '';

const allergens = dataRaw ? dataRaw.split(',').filter(Boolean) : [];
const content   = document.getElementById('content');

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

if (!allergens.length && !other) {
  content.innerHTML = `
    <div class="error-state">
      <h2>情報がありません</h2>
      <p>QRコードが正しく読み取れなかったか、<br>情報が登録されていません。</p>
    </div>`;
} else {
  let html = '';

  // 警告バナー
  html += `
    <div class="warning-banner">
      <div class="warning-icon">⚠️</div>
      <div class="warning-text">
        <h2>アレルギーをお持ちのお客様です</h2>
        <p>以下の食材・成分に注意してご対応ください</p>
      </div>
    </div>`;

  // 名前
  if (name) {
    html += `
      <div class="name-card">
        <div class="name-icon">👤</div>
        <div>
          <div class="name-label">お名前</div>
          <div class="name-value">${escHtml(name)} 様</div>
        </div>
      </div>`;
  }

  // アレルゲン
  if (allergens.length) {
    html += `<div class="section-label">アレルゲン（${allergens.length}品目）</div>`;
    html += `<div class="allergen-list">`;
    allergens.forEach((a, i) => {
      const meta = ALLERGEN_META[a] || { icon: '⚠️', desc: 'Allergen' };
      // animation-delayはJS動的生成のためインライン記述
      html += `
        <div class="allergen-card" style="animation-delay:${i * 0.07}s">
          <div class="allergen-emoji">${meta.icon}</div>
          <div>
            <div class="allergen-name">${escHtml(a)}</div>
            <div class="allergen-desc">${meta.desc}</div>
          </div>
        </div>`;
    });
    html += `</div>`;
  }

  // その他
  if (other) {
    html += `<div class="section-label">その他・備考</div>`;
    html += `<div class="other-card"><p class="other-text">${escHtml(other)}</p></div>`;
  }

  content.innerHTML = html;
}
