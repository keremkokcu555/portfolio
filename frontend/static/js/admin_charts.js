const ChartTheme = {
    colors: {
        primary: '#6366f1',
        secondary: '#10b981',
        danger: '#f43f5e',
        warning: '#f59e0b',
        info: '#0ea5e9',
        grid: 'rgba(255, 255, 255, 0.05)',
        text: '#94a3b8',
        textMuted: '#64748b',
        background: 'rgba(99, 102, 241, 0.1)',
        palette: [
            '#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', 
            '#ec4899', '#f43f5e', '#14b8a6', '#f97316', '#84cc16'
        ]
    }
};

const DashboardCharts = {
    charts: {},
    
    init() {
        Chart.defaults.color = ChartTheme.colors.text;
        Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
        Chart.defaults.plugins.tooltip.titleColor = '#fff';
        Chart.defaults.plugins.tooltip.bodyColor = '#cbd5e1';
        Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
        Chart.defaults.plugins.tooltip.borderWidth = 1;
        
        const filter = document.getElementById('analytics-filter');
        if (filter) {
            filter.addEventListener('change', (e) => {
                this.load(e.target.value);
            });
        }
    },

    destroy() {
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key]) {
                this.charts[key].destroy();
                this.charts[key] = null;
            }
        });
    },

    formatTrend(trend) {
        if (trend > 0) return `<span class="trend-up">▲ +${trend}</span>`;
        if (trend < 0) return `<span class="trend-down">▼ ${trend}</span>`;
        return `<span class="trend-neutral">● 0</span>`;
    },

    async load(range = '30days') {
        const grid = document.getElementById('analytics-summary-grid');
        if (grid) grid.style.opacity = '0.5';

        try {
            const res = await fetch(`/api/analytics/dashboard?range=${range}`);
            if (!res.ok) throw new Error('Data load failed');
            const data = await res.json();
            
            this.updateSummary(data.summary, data.trends);
            this.updateMetadata(data.metadata);
            
            this.destroy(); // Clear existing charts to prevent memory leak
            this.renderAllCharts(data.charts);
            this.updateTable(data.tables.recent, data.settings);

        } catch (e) {
            console.error('Dashboard load error:', e);
        } finally {
            if (grid) grid.style.opacity = '1';
        }
    },

    updateSummary(summary, trends) {
        const container = document.getElementById('v3-overview');
        if (!container) return;

        const createKpi = (icon, title, val, trendClass, trendText) => {
            return `
            <div class="an-v3-card an-v3-kpi">
                <div class="an-v3-kpi-top">
                    <div class="an-v3-kpi-icon">${icon}</div>
                    <span class="an-v3-trend ${trendClass}">${trendText}</span>
                </div>
                <div class="an-v3-kpi-val">${val !== null && val !== undefined ? val : '—'}</div>
                <div class="an-v3-kpi-label">${title}</div>
            </div>`;
        };

        const getTrendClass = (trendStr) => {
            if (!trendStr || trendStr === '—' || trendStr.includes('0%')) return 'neutral';
            return trendStr.includes('▲') || trendStr.includes('+') ? 'up' : 'down';
        };
        
        const formatTrend = (t) => {
            if (!t) return '—';
            if (t > 0) return `▲ +${t.toFixed(1)}%`;
            if (t < 0) return `▼ ${t.toFixed(1)}%`;
            return '0%';
        };

        const viewsTrend = formatTrend(summary.views.trend);
        const uniqueTrend = formatTrend(summary.unique.trend);
        const countriesTrend = formatTrend(summary.countries.trend);
        const citiesTrend = formatTrend(summary.cities.trend);
        const orgsTrend = formatTrend(summary.orgs.trend);

        container.innerHTML = 
            createKpi('👁️', 'Filtrelenmiş Ziyaret', summary.views.val, getTrendClass(viewsTrend), viewsTrend) +
            createKpi('👥', 'Tekil Ziyaretçi', summary.unique.val, getTrendClass(uniqueTrend), uniqueTrend) +
            createKpi('🌍', 'Ülke Sayısı', summary.countries.val, getTrendClass(countriesTrend), countriesTrend) +
            createKpi('🏙️', 'Şehir Sayısı', summary.cities.val, getTrendClass(citiesTrend), citiesTrend) +
            createKpi('🏢', 'Farklı İSS', summary.orgs.val, getTrendClass(orgsTrend), orgsTrend) +
            createKpi('📈', 'Toplam Kayıtlı Veri', summary.total_all, 'neutral', 'Tümü');
    },

    updateMetadata(meta) {
        const el = document.getElementById('an-last-updated');
        if (el && meta) {
            const d = new Date(meta.generated_at);
            const ts = d.toLocaleString('tr-TR');
            el.textContent = `Son güncelleme: ${ts}`;
        }
    },

    checkEmptyState(id, dataObj) {
        const emptyEl = document.getElementById(`empty-${id}`);
        const isEmpty = !dataObj || !dataObj.data || dataObj.data.length === 0 || dataObj.data.every(v => v === 0);
        if (emptyEl) {
            emptyEl.style.display = isEmpty ? 'flex' : 'none';
        }
        return isEmpty;
    },

    renderAllCharts(chartsData) {
        if (!this.checkEmptyState('dailyChart', chartsData.daily)) {
            this.charts.daily = new Chart(document.getElementById('dailyChart'), {
                type: 'line',
                data: {
                    labels: chartsData.daily.labels,
                    datasets: [{
                        label: 'Görüntüleme',
                        data: chartsData.daily.data,
                        borderColor: ChartTheme.colors.primary,
                        backgroundColor: ChartTheme.colors.background,
                        tension: 0.3,
                        fill: true,
                        borderWidth: 2,
                        pointRadius: 2,
                        pointHoverRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: ChartTheme.colors.grid }, border: { dash: [4, 4] } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        if (!this.checkEmptyState('browserChart', chartsData.browser)) {
            this.charts.browser = new Chart(document.getElementById('browserChart'), {
                type: 'doughnut',
                data: {
                    labels: chartsData.browser.labels,
                    datasets: [{
                        data: chartsData.browser.data,
                        backgroundColor: ChartTheme.colors.palette,
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } }
                    }
                }
            });
        }

        if (!this.checkEmptyState('osChart', chartsData.os)) {
            this.charts.os = new Chart(document.getElementById('osChart'), {
                type: 'pie',
                data: {
                    labels: chartsData.os.labels,
                    datasets: [{
                        data: chartsData.os.data,
                        backgroundColor: ChartTheme.colors.palette,
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } }
                    }
                }
            });
        }

        if (!this.checkEmptyState('countryChart', chartsData.country)) {
            this.charts.country = new Chart(document.getElementById('countryChart'), {
                type: 'bar',
                data: {
                    labels: chartsData.country.labels,
                    datasets: [{
                        label: 'Ziyaret',
                        data: chartsData.country.data,
                        backgroundColor: ChartTheme.colors.secondary,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: ChartTheme.colors.grid } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        if (!this.checkEmptyState('cityChart', chartsData.city)) {
            this.charts.city = new Chart(document.getElementById('cityChart'), {
                type: 'bar',
                data: {
                    labels: chartsData.city.labels,
                    datasets: [{
                        label: 'Ziyaret',
                        data: chartsData.city.data,
                        backgroundColor: ChartTheme.colors.info,
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { beginAtZero: true, grid: { color: ChartTheme.colors.grid } },
                        y: { grid: { display: false } }
                    }
                }
            });
        }
    },

    updateTable(rows, settings = {}) {
        const tbody = document.getElementById('an-recent-body');
        if (!tbody) return;
        
        const showNet = settings.show_network_type === 1;
        const maskIpUI = settings.mask_ips_ui !== 0; // default to true if undefined
        
        const COLS = showNet ? 8 : 7;
        
        // Hide/Show network column header
        const thead = document.querySelector('#an-recent-table thead tr');
        if (thead) {
            const netHeader = thead.querySelector('th:nth-child(8)');
            if (netHeader) netHeader.style.display = showNet ? '' : 'none';
        }

        const EMPTY = `<tr><td colspan="${COLS}" style="text-align:center;padding:18px;color:#64748b;">Henüz ziyaretçi verisi bulunmuyor.</td></tr>`;
        
        if (!rows || rows.length === 0) { 
            tbody.innerHTML = EMPTY; 
            return; 
        }

        const fmt = (iso) => {
            if (!iso) return '—';
            const d = new Date(iso + 'Z');
            return isNaN(d) ? iso : d.toLocaleString('tr-TR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
        };

        const esc = (s) => (s || '').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

        const maskIpStr = (ip) => {
            if (!ip) return '—';
            return ip; // Masking disabled — show raw IP
        };

        const getNetBadge = (netType) => {
            if (!netType) return '';
            let color = '#64748b', bg = 'rgba(100,116,139,0.1)';
            if (netType === 'Datacenter') { color = '#f87171'; bg = 'rgba(248,113,113,0.1)'; }
            else if (netType === 'Hosting') { color = '#fb923c'; bg = 'rgba(251,146,60,0.1)'; }
            else if (netType === 'Residential') { color = '#4ade80'; bg = 'rgba(74,222,128,0.1)'; }
            return `<span style="color:${color}; background:${bg}; padding:2px 6px; border-radius:4px; font-size:0.8em;">${esc(netType)}</span>`;
        };
        
        const getSourceBadge = (ref) => {
            if (!ref || ref.trim() === '' || ref === 'Doğrudan' || ref === 'Direct') {
                return `<span style="display:inline-flex; align-items:center; gap:4px; color:#94a3b8; background:rgba(148,163,184,0.1); padding:3px 8px; border-radius:12px; font-size:0.85em; border:1px solid rgba(148,163,184,0.2);">
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                    Direct
                </span>`;
            }
            const lowerRef = ref.toLowerCase();
            
            if (lowerRef.includes('instagram')) {
                return `<span style="display:inline-flex; align-items:center; gap:4px; color:#fff; background:linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); padding:3px 8px; border-radius:12px; font-size:0.85em; font-weight:500;">
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    Instagram
                </span>`;
            }
            if (lowerRef.includes('linkedin')) {
                return `<span style="display:inline-flex; align-items:center; gap:4px; color:#fff; background:#0077b5; padding:3px 8px; border-radius:12px; font-size:0.85em; font-weight:500;">
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"/></svg>
                    LinkedIn
                </span>`;
            }
            if (lowerRef.includes('google')) {
                return `<span style="display:inline-flex; align-items:center; gap:4px; color:#4285F4; background:rgba(66,133,244,0.1); padding:3px 8px; border-radius:12px; font-size:0.85em; font-weight:500; border:1px solid rgba(66,133,244,0.2);">
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/></svg>
                    Google
                </span>`;
            }
            if (lowerRef.includes('t.co') || lowerRef.includes('twitter')) {
                return `<span style="display:inline-flex; align-items:center; gap:4px; color:#fff; background:#1DA1F2; padding:3px 8px; border-radius:12px; font-size:0.85em; font-weight:500;">
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.054 10.054 0 01-3.127 1.184 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                    Twitter
                </span>`;
            }
            if (lowerRef.includes('facebook.com') || lowerRef.includes('fb://')) {
                return `<span style="display:inline-flex; align-items:center; gap:4px; color:#fff; background:#1877F2; padding:3px 8px; border-radius:12px; font-size:0.85em; font-weight:500;">
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Facebook
                </span>`;
            }
            
            // Standard badge for other websites
            const shortRef = ref.length > 20 ? ref.substring(0, 18) + '...' : ref;
            return `<span style="display:inline-flex; align-items:center; gap:4px; color:#c084fc; background:rgba(192,132,252,0.1); padding:3px 8px; border-radius:12px; font-size:0.85em; border:1px solid rgba(192,132,252,0.2);" title="${esc(ref)}">
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                ${esc(shortRef)}
            </span>`;
        };

        tbody.innerHTML = rows.map(r => {
            const flag = r.country ? `<img src="https://flagcdn.com/16x12/${esc(r.country.toLowerCase())}.png" width="16" height="12" style="border-radius:2px;vertical-align:middle;margin-right:4px;" onerror="this.style.display='none'">` : '';
            const countryCell = r.country ? (flag + esc(r.country)) : '<span style="color:#475569">—</span>';
            const netCell = showNet ? `<td style="padding:5px 8px;">${getNetBadge(r.network_type)}</td>` : '';
            const sourceBadge = getSourceBadge(r.referrer);
            
            return `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:5px 8px;white-space:nowrap;color:#94a3b8;font-size:0.8em;">${fmt(r.visited_at)}</td>
                <td style="padding:5px 8px;font-family:monospace;font-size:0.82em;color:#7dd3fc;">${esc(maskIpStr(r.ip_address))}</td>
                <td style="padding:5px 8px;">${countryCell}</td>
                <td style="padding:5px 8px;">${esc(r.city) || '<span style="color:#475569">—</span>'}</td>
                <td style="padding:5px 8px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(r.org)}">${esc(r.org) || '<span style="color:#475569">—</span>'}</td>
                <td style="padding:5px 8px;">${esc(r.browser) || '—'}</td>
                <td style="padding:5px 8px;">${esc(r.os) || '—'}</td>
                ${netCell}
                <td style="padding:5px 8px;white-space:nowrap;">${sourceBadge}</td>
            </tr>`;
        }).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    DashboardCharts.init();
});
