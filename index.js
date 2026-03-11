const BASE_URL = (() => {
  const u = location.href;
  return u.substring(0, u.lastIndexOf('/') + 1) + 'view.html';
})();

// ページ読み込み時にlocalStorageから復元
window.addEventListener('DOMContentLoaded', () => {
  const saved = JSON.parse(localStorage.getItem('allergyData') || '{}');
  if (saved.name) document.getElementById('name-input').value = saved.name;
  if (saved.allergens) {
    saved.allergens.forEach(v => {
      const el = document.querySelector(`input[value="${v}"]`);
      if (el) el.checked = true;
    });
  }
  if (saved.other) document.getElementById('other-input').value = saved.other;
});

function generateQR() {
  const name = document.getElementById('name-input').value.trim();
  const checked = [...document.querySelectorAll('.allergens-grid input:checked')].map(e => e.value);
  const other = document.getElementById('other-input').value.trim();

  if (checked.length === 0 && !other) {
    document.getElementById('no-sel-msg').style.display = 'block';
    return;
  }
  document.getElementById('no-sel-msg').style.display = 'none';

  // localStorageに保存
  localStorage.setItem('allergyData', JSON.stringify({ name, allergens: checked, other }));

  // URLを構築
  const params = new URLSearchParams();
  if (name) params.set('name', name);
  if (checked.length) params.set('data', checked.join(','));
  if (other) params.set('other', encodeURIComponent(other));
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
  const allItems = [...checked, ...(other ? [other] : [])];
  if (name) {
    const t = document.createElement('div');
    t.className = 'modal-tag';
    t.textContent = '👤 ' + name;
    tagsEl.appendChild(t);
  }
  allItems.forEach(item => {
    const t = document.createElement('div');
    t.className = 'modal-tag';
    t.textContent = item;
    tagsEl.appendChild(t);
  });

  document.getElementById('modal').classList.add('open');
}

function closeModal(e) {
  if (e === null || e.target === document.getElementById('modal')) {
    document.getElementById('modal').classList.remove('open');
  }
}
