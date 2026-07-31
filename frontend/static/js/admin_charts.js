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
            if (!maskIpUI) return ip; // Return raw IP if masking is OFF
            const p = ip.split('.');
            if (p.length === 4) return p[0] + '.' + p[1] + '.***.***';
            const p6 = ip.split(':');
            return (p6.length >= 2) ? (p6[0] + ':' + p6[1] + ':***:***') : '***';
        };

        const getNetBadge = (netType) => {
            if (!netType) return '';
            let color = '#64748b', bg = 'rgba(100,116,139,0.1)';
            if (netType === 'Datacenter') { color = '#f87171'; bg = 'rgba(248,113,113,0.1)'; }
            else if (netType === 'Hosting') { color = '#fb923c'; bg = 'rgba(251,146,60,0.1)'; }
            else if (netType === 'Residential') { color = '#4ade80'; bg = 'rgba(74,222,128,0.1)'; }
            return `<span style="color:${color}; background:${bg}; padding:2px 6px; border-radius:4px; font-size:0.8em;">${esc(netType)}</span>`;
        };

        tbody.innerHTML = rows.map(r => {
            const flag = r.country ? `<img src="https://flagcdn.com/16x12/${esc(r.country.toLowerCase())}.png" width="16" height="12" style="border-radius:2px;vertical-align:middle;margin-right:4px;" onerror="this.style.display='none'">` : '';
            const countryCell = r.country ? (flag + esc(r.country)) : '<span style="color:#475569">—</span>';
            const netCell = showNet ? `<td style="padding:5px 8px;">${getNetBadge(r.network_type)}</td>` : '';
            
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
            </tr>`;
        }).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    DashboardCharts.init();
});
