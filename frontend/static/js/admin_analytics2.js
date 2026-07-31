
const loadAnalyticsSummary2 = async () => {
  try {
    const data = await fetchJson(`${apiBase}/analytics2/summary`);
    const dashToday = document.getElementById('dash-today-views');
    const dashWeek = document.getElementById('dash-week-views');
    if (dashToday) dashToday.textContent = data.today_views;
    if (dashWeek) dashWeek.textContent = data.week_views;

    const elTodayV = document.getElementById('an2-today-views');
    const elTodayU = document.getElementById('an2-today-unique');
    const elWeekV = document.getElementById('an2-week-views');
    const elMonthV = document.getElementById('an2-month-views');
    const elTotalV = document.getElementById('an2-total-views');

    if (elTodayV) elTodayV.textContent = data.today_views;
    if (elTodayU) elTodayU.textContent = data.today_unique;
    if (elWeekV) elWeekV.textContent = data.week_views;
    if (elMonthV) elMonthV.textContent = data.month_views;
    if (elTotalV) elTotalV.textContent = data.total_views;
  } catch (e) {
    console.error('Analytics summary yüklenemedi:', e);
  }
};

window.loadDailyStats2 = async (days) => {
  const btn7 = document.getElementById('an2-btn-7');
  const btn30 = document.getElementById('an2-btn-30');
  
  if (btn7) {
    btn7.style.background = days === 7 ? '#6366f1' : 'rgba(255,255,255,0.08)';
    btn7.style.border = days === 7 ? 'none' : '1px solid rgba(255,255,255,0.1)';
    btn7.style.color = days === 7 ? '#fff' : '#94a3b8';
  }

  if (btn30) {
    btn30.style.background = days === 30 ? '#6366f1' : 'rgba(255,255,255,0.08)';
    btn30.style.border = days === 30 ? 'none' : '1px solid rgba(255,255,255,0.1)';
    btn30.style.color = days === 30 ? '#fff' : '#94a3b8';
  }

  const tbody = document.getElementById('an2-daily-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:12px; color:#64748b;">Yükleniyor...</td></tr>';

  try {
    const data = await fetchJson(`${apiBase}/analytics2/daily?days=${days}`);
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:12px; color:#64748b;">Henüz kayıt yok.</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(r => `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
        <td style="padding:6px 8px;">${r.date}</td>
        <td style="padding:6px 8px; text-align:right;">${r.views}</td>
        <td style="padding:6px 8px; text-align:right;">${r.unique}</td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:12px; color:#f87171;">Hata oluştu.</td></tr>';
  }
};

const renderBars2 = (containerId, dataArray) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!dataArray || dataArray.length === 0) {
    container.innerHTML = '<div style="color:#64748b; font-size:0.85em;">Veri yok</div>';
    return;
  }
  container.innerHTML = dataArray.map(item => `
    <div style="margin-bottom:8px;">
      <div style="display:flex; justify-content:space-between; font-size:0.82em; margin-bottom:4px; color:#cbd5e1;">
        <span>${item.label}</span>
        <span style="color:#94a3b8;">${item.pct}% (${item.count})</span>
      </div>
      <div style="background:rgba(255,255,255,0.05); height:6px; border-radius:3px; overflow:hidden;">
        <div style="background:#6366f1; width:${item.pct}%; height:100%; border-radius:3px;"></div>
      </div>
    </div>
  `).join('');
};

const loadAnalyticsBreakdown2 = async () => {
  try {
    const data = await fetchJson(`${apiBase}/analytics2/breakdown`);
    renderBars2('an2-device-bars', data.device);
    renderBars2('an2-browser-bars', data.browser);
    renderBars2('an2-os-bars', data.os);
    renderBars2('an2-referrer-bars', data.referrer);
  } catch (e) {
    console.error('Breakdown yüklenemedi:', e);
  }
};

const loadRecentVisits2 = async () => {
  const tbody = document.getElementById('an2-recent-body');
  if (!tbody) return;
  try {
    const data = await fetchJson(`${apiBase}/analytics2/recent?limit=20`);
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:12px; color:#64748b;">Henüz ziyaret yok.</td></tr>';
      return;
    }
    const fmt = (iso) => {
      const d = new Date(iso + 'Z');
      return isNaN(d) ? iso : d.toLocaleString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    };
    const escapeHtml = (unsafe) => (unsafe || '').toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    
    tbody.innerHTML = data.map(r => `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
        <td style="padding:5px 8px; white-space:nowrap;">${fmt(r.visited_at)}</td>
        <td style="padding:5px 8px;">${escapeHtml(r.ip_address || 'Bilinmiyor')}</td>
        <td style="padding:5px 8px;">${escapeHtml(r.device_type)}</td>
        <td style="padding:5px 8px;">${escapeHtml(r.browser)}</td>
        <td style="padding:5px 8px;">${escapeHtml(r.os)}</td>
        <td style="padding:5px 8px; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(r.referrer)}">${escapeHtml(r.referrer)}</td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:12px; color:#f87171;">Hata oluştu.</td></tr>';
  }
};

window.pruneAnalytics2 = async () => {
  const days = document.getElementById('prune-days-select').value;
  if (!confirm(`${days} günden eski ziyaretçi kayıtlarını silmek istediğinize emin misiniz?`)) return;
  
  const btn = document.getElementById('prune-btn');
  const resEl = document.getElementById('prune-result');
  btn.disabled = true;
  btn.textContent = 'Siliniyor...';
  resEl.style.display = 'none';

  try {
    const meta = document.querySelector('meta[name="csrf-token"]');
    const csrfToken = meta ? meta.getAttribute('content') : '';
    const res = await fetch(`${apiBase}/analytics2/prune?days=${days}`, {
      method: 'DELETE',
      headers: { 'X-CSRFToken': csrfToken }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Silme işlemi başarısız');
    
    resEl.style.display = 'block';
    resEl.style.color = '#4ade80';
    resEl.textContent = `✓ ${result.deleted} adet eski kayıt silindi.`;
    
    loadAnalyticsSummary2();
    loadDailyStats2(7);
  } catch (e) {
    resEl.style.display = 'block';
    resEl.style.color = '#f87171';
    resEl.textContent = `Hata: ${e.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sil';
  }
};

const loadLikes = async () => {


document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (document.getElementById("an2-today-views")) {
      loadAnalyticsSummary2();
      loadDailyStats2(7);
      loadAnalyticsBreakdown2();
      loadRecentVisits2();
    }
  }, 500);
});

