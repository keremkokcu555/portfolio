// Tarayıcının otomatik kaydırma (scroll) hafızasını devre dışı bırak
if (history.scrollRestoration) {
  history.scrollRestoration = 'manual';
}

// Sayfa yüklendiğinde kesinlikle en üste gitmesini garantiye al
window.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);
});

const apiBase = '/api';

const showToast = (message, type = 'success') => {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

window.handleGoogleLogin = async (response) => {
  showToast('İşleniyor...', 'info');

  try {
    const res = await fetch(`${apiBase}/like-portfolio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      if (res.status === 200 && data.message.includes('Daha önce')) {
        showToast('Portfolyomu zaten beğenmişsiniz, sonsuz teşekkürler! 🙏', 'success');
      } else {
        showToast('Teşekkürler! Beğeniniz ve desteğiniz kaydedildi ❤️', 'success');
      }
    } else {
      showToast(data.error || 'Bir hata oluştu.', 'error');
    }
  } catch (error) {
    showToast('Bağlantı hatası.', 'error');
  }
};

window.handleVisitorLogout = async () => {
    try {
        const res = await fetch('/api/auth/visitor/logout', { method: 'POST' });
        if (res.ok) {
            showToast('Çıkış yapıldı', 'success');
            checkVisitorStatus();
            if (typeof loadComments === 'function') {
                loadComments();
            }
            if (typeof window.loadBlogLikes === 'function') {
                window.loadBlogLikes();
            }
        }
    } catch (e) {
        console.error('Logout error:', e);
    }
};

const navButtons = document.querySelectorAll('.top-nav .nav-link[data-target]');
const mobileToggle = document.querySelector('.navbar-toggle');
const topNav = document.querySelector('.top-nav');

const activateTab = (target) => {
  navButtons.forEach((button) => button.classList.remove('active'));
  const selectedButtons = document.querySelectorAll(`.top-nav .nav-link[data-target="${target}"]`);
  selectedButtons.forEach((button) => button.classList.add('active'));
  document.querySelectorAll('.tab-content').forEach((section) => section.classList.remove('active'));
  document.getElementById(target).classList.add('active');
  document.body.classList.toggle('home-active', target === 'home');
};

navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.target;
    if (!target) return;
    activateTab(target);
    if (topNav && topNav.classList.contains('mobile-hidden')) {
      topNav.classList.remove('mobile-hidden');
    }
  });
});

const brandLink = document.querySelector('.brand');
if (brandLink) {
  brandLink.addEventListener('click', () => {
    activateTab('home');
  });
}

if (mobileToggle && topNav) {
  mobileToggle.addEventListener('click', () => {
    topNav.classList.toggle('mobile-hidden');
  });
}

const educationList = document.getElementById('education-list');
const coursesList = document.getElementById('courses-list');
const certificatesList = document.getElementById('certificates-list');
const experiencesList = document.getElementById('experiences-list');
const projectsList = document.getElementById('projects-list');
const skillsList = document.getElementById('skills-list');
const languagesList = document.getElementById('languages-list');

const createItemCard = (item, entity, nameField = 'title') => {
  const card = document.createElement('div');
  card.className = 'list-item';
  let mediaHtml = '';
  if (item.image) mediaHtml += `<img src="${item.image}" style="max-height: 40px; border-radius: 4px; margin-right: 5px; vertical-align: middle;">`;
  if (item.pdf) mediaHtml += `<a href="${item.pdf}" target="_blank" style="font-size: 0.8em; color: #a5b4fc; margin-right: 5px; vertical-align: middle;">[PDF Görüntüle]</a>`;
  if (item.certificate_link) {
    const isPdf = item.certificate_link.endsWith('.pdf');
    mediaHtml += `<a href="${item.certificate_link}" target="_blank" style="font-size: 0.8em; color: #a5b4fc; vertical-align: middle;">[${isPdf ? 'Sertifika PDF' : 'Sertifika Görseli'}]</a>`;
  }
  
  let levelText = '';
  if (item.level) {
    levelText = ` <span style="font-weight: normal; font-size: 0.9em; opacity: 0.8;">(${item.level})</span>`;
  }

  let detailsHtml = '<div style="margin-top: 8px; color: #cbd5e1;">';
  const addDetail = (label, value) => {
    if (value && value !== '0' && value !== 0) {
      detailsHtml += `<div style="font-size: 0.95em; margin-bottom: 4px; line-height: 1.4;"><strong>${label}:</strong> ${value}</div>`;
    }
  };

  if (entity === 'education') {
    addDetail('Bölüm', item.department);
    addDetail('Başlangıç', item.start_date);
    addDetail('Bitiş', item.ongoing ? 'Devam ediyor' : item.end_date);
    addDetail('Ortalama', item.gpa);
    addDetail('Açıklama', item.description);
  } else if (entity === 'courses') {
    addDetail('Kurum', item.organization);
    addDetail('Başlangıç', item.start_date);
    addDetail('Bitiş', item.end_date);
    addDetail('Açıklama', item.description);
  } else if (entity === 'experiences') {
    addDetail('Pozisyon', item.position);
    addDetail('Başlangıç', item.start_date);
    addDetail('Bitiş', item.ongoing ? 'Devam ediyor' : item.end_date);
    addDetail('Açıklama', item.description);
  } else if (entity === 'certificates') {
    addDetail('Kurum', item.organization);
    addDetail('Tarih', item.date);
    addDetail('Açıklama', item.description);
  } else if (entity === 'projects') {
    addDetail('Teknolojiler', item.technologies);
    if (item.github_link) detailsHtml += `<div style="font-size: 0.95em; margin-bottom: 4px;"><strong>GitHub:</strong> <a href="${item.github_link}" target="_blank" style="color: #a5b4fc; text-decoration: underline; word-break: break-all;">${item.github_link}</a></div>`;
    if (item.demo_link) detailsHtml += `<div style="font-size: 0.95em; margin-bottom: 4px;"><strong>Canlı Demo:</strong> <a href="${item.demo_link}" target="_blank" style="color: #a5b4fc; text-decoration: underline; word-break: break-all;">${item.demo_link}</a></div>`;
    addDetail('Açıklama', item.description);
  } else if (entity === 'skills') {
    addDetail('Kategori', item.category);
  }
  detailsHtml += '</div>';

  card.innerHTML = `
    <h4>${item[nameField] || item.name || item.company || 'Yeni Kayıt'}${levelText}</h4>
    ${detailsHtml}
    <div style="margin-top: 5px;">${mediaHtml}</div>
    <div class="list-actions">
      <button data-action="edit" data-entity="${entity}" data-id="${item.id}">Düzenle</button>
      <button class="delete" data-action="delete" data-entity="${entity}" data-id="${item.id}">Sil</button>
    </div>
  `;
  return card;
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (response.status === 401) {
    window.location.href = '/admin/login';
    throw new Error('Yetkisiz erişim');
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || response.statusText || 'İşlem başarısız');
  }
  return response.json();
};

const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${apiBase}/upload`, {
    method: 'POST',
    body: formData
  });
  if (response.status === 401) {
    window.location.href = '/admin/login';
    throw new Error('Yetkisiz erişim');
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Dosya yükleme başarısız');
  }
  const data = await response.json();
  return data.url;
};

const updatePreview = (containerId, url) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!url) {
    container.innerHTML = '';
    return;
  }
  if (url.endsWith('.pdf')) {
    container.innerHTML = `<a href="${url}" target="_blank" style="color: #a5b4fc; text-decoration: underline;">Mevcut PDF Dosyasını Görüntüle</a>`;
  } else {
    container.innerHTML = `<img src="${url}" style="max-height: 80px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);" alt="Önizleme">`;
  }
};

const loadData = async () => {
  const isVisitor = document.body.classList.contains('visitor-mode');
  const overview = document.getElementById('portfolio-overview');
  
  if (isVisitor && overview) {
    overview.innerHTML = '<div style="text-align:center; padding: 40px; color: #94a3b8;">Yükleniyor...</div>';
  }

  let profileData = null;
  try {
    const profile = await fetchJson(`${apiBase}/profile`);
    profileData = profile;
  } catch (error) {
    console.error('Profil yüklenirken hata:', error);
  }

  const loadList = async (endpoint, container, entity, nameField = 'title') => {
    if (!container) return [];
    try {
      const items = await fetchJson(`${apiBase}/${endpoint}`);
      container.innerHTML = '';
      items.forEach((item) => container.appendChild(createItemCard(item, entity, nameField)));
      return items;
    } catch (error) {
      console.error(`${endpoint} yüklenirken hata:`, error);
      container.innerHTML = `<p style="color: red;">Veri yüklenemedi: ${error.message}</p>`;
      return [];
    }
  };

  const [education, courses, certificates, experiences, projects, skills, languages] = await Promise.all([
    loadList('education', educationList, 'education', 'school'),
    loadList('courses', coursesList, 'courses', 'title'),
    loadList('certificates', certificatesList, 'certificates', 'name'),
    loadList('experiences', experiencesList, 'experiences', 'company'),
    loadList('projects', projectsList, 'projects', 'title'),
    loadList('skills', skillsList, 'skills', 'name'),
    loadList('languages', languagesList, 'languages', 'name'),
  ]);
  
  if (isVisitor) {
    renderOverview({ education, courses, certificates, experiences, projects, skills, languages }, profileData);
    fetchBlogs();
  }
};

const renderOverview = (data, profile) => {
  if (!document.getElementById('visitor-bg-tracked')) {
    const marker = document.createElement('div');
    marker.id = 'visitor-bg-tracked';
    document.body.prepend(marker);
    
    document.addEventListener('mousemove', (e) => {
      // Sadece masaüstü (768px üzeri) için mouse takibi (performans optimizasyonu)
      if (window.innerWidth >= 768) {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        document.body.style.setProperty('--mouse-x', `${x}%`);
        document.body.style.setProperty('--mouse-y', `${y}%`);
      }
    });
  }

  const overview = document.getElementById('portfolio-overview');
  if (!overview) return;
  overview.innerHTML = '';
  
  const safeStr = (val) => (!val || val === 'null' || String(val).trim() === '') ? '' : String(val).trim();
  const safeUrl = (val) => {
    const s = safeStr(val);
    return (s && s !== 'Kullanılmıyor' && s !== '#') ? s : '';
  };

  const hr = () => `<div class="section-divider reveal-on-scroll"></div>`;
  const sectionTitle = (title) => `<h2 class="editorial-title reveal-on-scroll">${title}</h2>`;

  if (profile) {
    const visitorHero = document.getElementById('visitor-hero');
    if (visitorHero) {
      const heroTechs = data.skills && data.skills.length > 0 
        ? data.skills.slice(0, 4).map(s => safeStr(s.name).toUpperCase()).filter(Boolean).join('  /  ')
        : '';
        
      const projCount = data.projects ? String(data.projects.length).padStart(2, '0') : '00';
      const certCount = data.certificates ? String(data.certificates.length).padStart(2, '0') : '00';
      const expCount = data.experiences ? String(data.experiences.length).padStart(2, '0') : '00';
      const skillCount = data.skills ? String(data.skills.length).padStart(2, '0') : '00';

      visitorHero.innerHTML = `
        <div class="editorial-hero reveal-on-scroll">
          <div class="hero-eyebrow">MERHABA, BEN ${safeStr(profile.name) ? safeStr(profile.name).split(' ')[0].toUpperCase() : ''}.</div>
          ${safeUrl(profile.profile_photo) ? `<img src="${safeUrl(profile.profile_photo)}" onerror="this.style.display='none'" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin-bottom: 20px; border: 2px solid var(--border-color);" alt="Profil Fotoğrafı">` : `<div style="width: 120px; height: 120px; border-radius: 50%; background-color: var(--card-bg); border: 2px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: bold; color: var(--accent); margin-bottom: 20px;">${safeStr(profile.name) ? safeStr(profile.name)[0].toUpperCase() : 'U'}</div>`}
          <h1 class="hero-main-title">
            <span style="color: var(--accent);">Backend</span> odaklı<br>yazılım geliştiriyorum.
          </h1>
          
          ${safeStr(profile.summary) ? `<div class="hero-subtitle">${safeStr(profile.summary).split('\n')[0]}</div>` : ''}

          <div class="hero-tech">${heroTechs}</div>
          
          <div class="hero-cta-row">
            <a class="hero-link" href="#" onclick="document.getElementById('projects-section')?.scrollIntoView({behavior: 'smooth'}); return false;">Projelerimi Gör ↘</a>
            ${safeUrl(profile.github) ? `<a class="hero-link" href="${safeUrl(profile.github)}" target="_blank">GitHub ↗</a>` : ''}
            ${safeUrl(profile.cv_pdf) ? `<a class="hero-link" href="${safeUrl(profile.cv_pdf)}" target="_blank">CV Görüntüle ↗</a>` : ''}
          </div>
          
          <div class="hero-stats-row">
            <div class="hero-stat"><div class="hero-stat-num">${projCount}</div><div class="hero-stat-label">PROJE</div></div>
            <div class="hero-stat"><div class="hero-stat-num">${certCount}</div><div class="hero-stat-label">SERTİFİKA</div></div>
            <div class="hero-stat"><div class="hero-stat-num">${expCount}</div><div class="hero-stat-label">DENEYİM</div></div>
            <div class="hero-stat"><div class="hero-stat-num">${skillCount}</div><div class="hero-stat-label">YETENEK</div></div>
          </div>
        </div>
      `;
    }

    const hasAboutData = profile ? Object.keys(profile).some(k => safeStr(profile[k])) : false;
    if (hasAboutData) {
      overview.innerHTML += hr();
      let aboutHtml = `<div id="about-section" class="editorial-section reveal-on-scroll">`;
      aboutHtml += sectionTitle('HAKKIMDA');
      
      aboutHtml += `<div class="bento-grid">`;
      
      aboutHtml += `<div class="bento-box bento-wide reveal-on-scroll" style="flex-direction: row; gap: 20px; align-items: center; flex-wrap: wrap;">`;
      if (safeUrl(profile.profile_photo)) {
        aboutHtml += `<img src="${safeUrl(profile.profile_photo)}" style="width: 150px; height: 150px; border-radius: 20px; object-fit: cover; border: 2px solid rgba(255,255,255,0.1); box-shadow: 0 4px 15px rgba(0,0,0,0.2);">`;
      }
      aboutHtml += `<div style="flex: 1; min-width: 250px;">`;
      aboutHtml += `<h2 style="margin-bottom: 15px; color: #fff;">${safeStr(profile.name)}</h2>`;
      aboutHtml += `<div class="skills-container" style="margin-bottom: 20px;">
          <span class="badge primary">Backend Developer</span>
          <span class="badge">Clean Code</span>
          ${safeStr(profile.city) ? `<span class="badge">📍 ${safeStr(profile.city)}</span>` : ''}
        </div>`;
      aboutHtml += `<div class="about-text" style="color: #c9d1d9;">${safeStr(profile.summary).split('\n').join('<br><br>')}</div>`;
      aboutHtml += `</div></div>`; // End of about-content bento-box
      
      // Contact Info Bento Box
      aboutHtml += `<div class="bento-box reveal-on-scroll" style="justify-content: flex-start;">`;
      aboutHtml += `<h3 style="margin-bottom: 20px; color: #58a6ff;">İletişim & Sosyal</h3>`;
      aboutHtml += `<div style="display: flex; flex-direction: column; gap: 15px;">`;
      const addContact = (label, val, link='') => {
        if(!safeStr(val)) return '';
        const v = link ? `<a href="${link}" target="_blank" style="color: #fff; text-decoration: none;">${safeStr(val)} ↗</a>` : `<span style="color:#fff;">${safeStr(val)}</span>`;
        return `<div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
            <span style="color: #8b949e; font-size: 0.9rem;">${label}</span>
            <span>${v}</span>
          </div>`;
      };
      aboutHtml += addContact('E-Posta', profile.email, safeStr(profile.email) ? 'mailto:'+profile.email : '');
      aboutHtml += addContact('GitHub', 'github.com', profile.github);
      aboutHtml += addContact('LinkedIn', 'linkedin.com', profile.linkedin);
      aboutHtml += addContact('Web', 'Siteye Git', profile.website);
      aboutHtml += `</div></div>`;
      
      aboutHtml += `</div></div>`;
      overview.innerHTML += aboutHtml;
    }
  }

  // 4. PROJELER
  if (data.projects && data.projects.length > 0) {
    overview.innerHTML += hr();
    let projHtml = `<div id="projects-section" class="editorial-section reveal-on-scroll">`;
    projHtml += sectionTitle('SEÇİLMİŞ PROJELER');
    projHtml += `<div class="projects-bento-grid">`;
    
    data.projects.forEach((p, idx) => {
      let linksHtml = '';
      if(safeUrl(p.github_link)) linksHtml += `<a href="${safeUrl(p.github_link)}" target="_blank" class="badge">GitHub ↗</a>`;
      if(safeUrl(p.demo_link)) linksHtml += `<a href="${safeUrl(p.demo_link)}" target="_blank" class="badge primary">Canlı Demo ↗</a>`;
      
      let techHtml = safeStr(p.technologies).split(',').map(t => t.trim()).filter(Boolean)
        .map(t => `<span class="tech-tag">${t}</span>`).join('');

      projHtml += `
        <div class="bento-box reveal-on-scroll">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <h3 style="font-size: 1.4rem; font-weight: 700; margin-bottom: 10px; color: #fff;">${safeStr(p.title)}</h3>
            <span class="proj-hint" style="color: rgba(255,255,255,0.15); font-size: 1.4rem; font-weight: bold; transition: all 0.3s ease;">↗</span>
          </div>
          ${safeStr(p.category) ? `<div style="color: #58a6ff; font-size: 0.9rem; margin-bottom: 15px; letter-spacing: 0.05em;">${safeStr(p.category).toUpperCase()}</div>` : ''}
          <div style="color: #c9d1d9; line-height: 1.6; margin-bottom: 20px; flex-grow: 1;">${safeStr(p.description)}</div>
          ${safeUrl(p.image) ? `<img src="${safeUrl(p.image)}" onerror="this.style.display='none'" style="width: 100%; height: 180px; object-fit: cover; border-radius: 12px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.05);">` : ''}
          
          <div class="project-tech-stack" style="margin-bottom: 20px;">
            ${techHtml}
          </div>
          
          <div style="display: flex; gap: 10px;">
            ${linksHtml}
          </div>
        </div>
      `;
    });
    projHtml += `</div></div>`;
    overview.innerHTML += projHtml;
  }

  // 5. DENEYİM
  if (data.experiences && data.experiences.length > 0) {
    overview.innerHTML += hr();
    let expHtml = `<div id="experience-section" class="editorial-section reveal-on-scroll">`;
    expHtml += sectionTitle('DENEYİM');
    expHtml += `<div class="bento-grid">`;
    data.experiences.forEach(e => {
      const startYear = safeStr(e.start_date).split('-')[0] || safeStr(e.start_date);
      const endYear = e.ongoing ? 'DEVAM' : (safeStr(e.end_date).split('-')[0] || safeStr(e.end_date));
      const dateStr = `${startYear} — ${endYear}`;
      expHtml += `
        <div class="bento-box reveal-on-scroll">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
            <h3 style="font-size: 1.3rem; font-weight: 700; color: #fff; margin: 0;">${safeStr(e.company)}</h3>
            <span class="pill" style="font-size: 0.8rem;">${dateStr}</span>
          </div>
          <div style="color: #58a6ff; font-weight: 600; margin-bottom: 15px;">${safeStr(e.position)}${safeStr(e.department) ? ` • ${safeStr(e.department)}` : ''}</div>
          <div style="color: #c9d1d9; line-height: 1.6;">${safeStr(e.description)}</div>
          ${safeStr(e.city) ? `<div style="margin-top: 15px; color: #8b949e; font-size: 0.9rem;">📍 ${safeStr(e.city)}</div>` : ''}
        </div>
      `;
    });
    expHtml += `</div></div>`;
    overview.innerHTML += expHtml;
  }

  // 6. YETENEKLER
  if (data.skills && data.skills.length > 0) {
    overview.innerHTML += hr();
    let skHtml = `<div id="skills-section" class="editorial-section reveal-on-scroll">`;
    skHtml += sectionTitle('YETENEKLER');
    // Group skills by category if possible, or just display them as a dense cloud of badges
    skHtml += `<div class="bento-box reveal-on-scroll" style="padding: 40px 30px;">`;
    skHtml += `<div class="skills-container" style="justify-content: center; gap: 12px;">`;
    data.skills.forEach((s) => {
      skHtml += `<span class="tech-tag" style="font-size: 1.1rem; padding: 10px 20px;">${safeStr(s.name)}</span>`;
    });
    skHtml += `</div></div></div>`;
    overview.innerHTML += skHtml;
  }

  // 7. EĞİTİM
  if (data.education && data.education.length > 0) {
    overview.innerHTML += hr();
    let edHtml = `<div id="education-section" class="editorial-section reveal-on-scroll">`;
    edHtml += sectionTitle('EĞİTİM');
    edHtml += `<div class="bento-grid">`;
    data.education.forEach(e => {
      const startYear = safeStr(e.start_date).split('-')[0] || safeStr(e.start_date);
      const endYear = e.ongoing ? 'DEVAM' : (safeStr(e.end_date).split('-')[0] || safeStr(e.end_date));
      const dateStr = `${startYear} — ${endYear}`;
      edHtml += `
        <div class="bento-box reveal-on-scroll">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
            <h3 style="font-size: 1.3rem; font-weight: 700; color: #fff; margin: 0;">${safeStr(e.school)}</h3>
            <span class="pill primary" style="font-size: 0.8rem;">${dateStr}</span>
          </div>
          <div style="color: #58a6ff; font-weight: 600; margin-bottom: 15px;">${safeStr(e.department)}</div>
          ${safeStr(e.description) ? `<div style="color: #c9d1d9; line-height: 1.6; margin-bottom: 15px;">${safeStr(e.description)}</div>` : ''}
          ${safeStr(e.gpa) || safeStr(e.city) ? `<div style="display: flex; gap: 10px; margin-top: auto;">${safeStr(e.city) ? `<span class="badge">📍 ${safeStr(e.city)}</span>` : ''}${safeStr(e.gpa) ? `<span class="badge">GPA: ${safeStr(e.gpa)}</span>` : ''}</div>` : ''}
        </div>
      `;
    });
    edHtml += `</div></div>`;
    overview.innerHTML += edHtml;
  }
  
  // 8. SERTİFİKALAR VE KURSLAR
  if ((data.certificates && data.certificates.length > 0) || (data.courses && data.courses.length > 0)) {
    overview.innerHTML += hr();
    let certHtml = `<div id="certificates-section" class="editorial-section reveal-on-scroll">`;
    certHtml += sectionTitle('SERTİFİKALAR VE KURSLAR');
    certHtml += `<div class="bento-grid">`;
    
    const extractTags = (text) => {
      if (!text) return { tags: [], desc: '' };
      let tags = [];
      let desc = text;
      
      // Extract bracketed tags like [24 Saatlik Eğitim]
      const bracketRegex = /\[(.*?)\]/g;
      let match;
      while ((match = bracketRegex.exec(text)) !== null) {
        tags.push(match[1]);
        desc = desc.replace(match[0], '');
      }
      
      // Auto-extract common tech words
      const kw = ['Python', 'Backend', 'REST API', 'FastAPI', 'SQLite', 'SQL', 'Docker', 'Git', 'Java', 'C#', '.NET', 'React', 'Node.js', 'Linux', 'Javascript', 'HTML', 'CSS', 'Geliştirme', 'Mimarisi'];
      kw.forEach(k => {
        if (desc.toLowerCase().includes(k.toLowerCase()) && !tags.includes(k)) {
          tags.push(k);
        }
      });
      
      return { tags, desc: desc.trim() };
    };

    const renderCard = (title, org, dateStr, desc, link, icon) => {
      const { tags, desc: cleanDesc } = extractTags(desc);
      let tagsHtml = tags.map(t => `<span class="tech-tag">${t}</span>`).join('');
      return `
        <div class="bento-box reveal-on-scroll" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h3 style="font-size: 1.3rem; font-weight: 700; color: #fff; margin-bottom: 5px; display: flex; align-items: center; gap: 8px;">
              <span>${icon}</span> ${safeStr(title)}
            </h3>
            <div style="color: #8b949e; font-size: 0.85rem; margin-bottom: 15px; letter-spacing: 0.05em; text-transform: uppercase;">
              ${safeStr(org)} • ${safeStr(dateStr)}
            </div>
            ${cleanDesc ? `<div style="color: #c9d1d9; line-height: 1.6; font-size: 0.95rem; margin-bottom: 20px;">${cleanDesc}</div>` : ''}
          </div>
          <div style="margin-top: auto;">
            ${tagsHtml ? `<div class="skills-container" style="margin-bottom: 20px;">${tagsHtml}</div>` : ''}
            ${link ? `<div style="display: flex; justify-content: flex-end;"><a href="${link}" target="_blank" class="badge primary" style="text-decoration: none;">Sertifikayı İncele ↗</a></div>` : ''}
          </div>
        </div>
      `;
    };

    if (data.certificates && data.certificates.length > 0) {
      data.certificates.forEach(c => {
        const year = safeStr(c.date).split('-')[0] || safeStr(c.date);
        const credLink = safeUrl(c.credential_url) || safeUrl(c.certificate_link) || safeUrl(c.pdf);
        certHtml += renderCard(c.name, c.organization, year, c.description, credLink, '📜');
      });
    }

    if (data.courses && data.courses.length > 0) {
      data.courses.forEach(c => {
        const year = safeStr(c.end_date).split('-')[0] || safeStr(c.end_date);
        const certLink = safeUrl(c.certificate_link) || safeUrl(c.pdf);
        certHtml += renderCard(c.title, c.organization, year, c.description, certLink, '🏆');
      });
    }

    certHtml += `</div></div>`;
    overview.innerHTML += certHtml;
  }
  
  // 9. DİLLER
  if (data.languages && data.languages.length > 0) {
    overview.innerHTML += hr();
    let langHtml = `<div class="editorial-section reveal-on-scroll">`;
    langHtml += sectionTitle('DİLLER');
    data.languages.forEach(l => {
      langHtml += `
        <div class="lang-row">
          <h3 class="lang-name">${safeStr(l.name).toUpperCase()}</h3>
          ${safeStr(l.level) ? `<p class="lang-level">${safeStr(l.level)}</p>` : ''}
        </div>
      `;
    });
    langHtml += `</div>`;
    overview.innerHTML += langHtml;
  }
  
  // 9.5 DİNAMİK BLOG SİSTEMİ
  overview.innerHTML += hr();
  overview.innerHTML += `<div id="blog-section-container"></div>`;

  // 10. İLETİŞİM FORMU
  overview.innerHTML += hr();
  let contactHtml = `<div id="contact-section" class="editorial-section reveal-on-scroll">`;
  contactHtml += sectionTitle('BANA ULAŞIN');
  contactHtml += `
    <div style="max-width: 600px;">
      <form id="public-contact-form" onsubmit="submitContactForm(event)" style="display: flex; flex-direction: column; gap: 15px;">
        <div style="display: flex; gap: 15px;">
          <input type="text" name="name" aria-label="Ad Soyad" placeholder="Ad Soyad *" required maxlength="100" style="flex: 1; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 4px; font-family: inherit;">
          <input type="email" name="email" aria-label="E-posta" placeholder="E-posta *" required maxlength="254" style="flex: 1; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 4px; font-family: inherit;">
        </div>
        <input type="text" name="subject" aria-label="Konu" placeholder="Konu *" required maxlength="200" style="padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 4px; font-family: inherit;">
        <textarea name="message" aria-label="Mesajınız" placeholder="Mesajınız *" required maxlength="5000" rows="5" style="padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 4px; font-family: inherit; resize: vertical;"></textarea>
        <button type="submit" id="contact-submit-btn" style="align-self: flex-start; padding: 12px 24px; background: var(--accent); color: #0f172a; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; transition: opacity 0.2s;">Mesaj Gönder</button>
        <div id="contact-status-msg" style="margin-top: 10px; font-size: 0.9em;"></div>
      </form>
    </div>
  `;
  contactHtml += `</div>`;
  overview.innerHTML += contactHtml;

  // FOOTER
  if (profile) {
    overview.innerHTML += hr();
    let footerHtml = `<div class="editorial-footer reveal-on-scroll">`;
    footerHtml += `
      <h2 class="footer-cta">Bir proje üzerinde<br>birlikte çalışalım.</h2>
      <div class="footer-links">
        ${safeStr(profile.email) ? `<a href="mailto:${safeStr(profile.email)}" class="footer-link">
          <svg class="footer-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          E-POSTA
          <span class="hover-arrow">&rarr;</span>
        </a>` : ''}
        ${safeUrl(profile.github) ? `<a href="${safeUrl(profile.github)}" target="_blank" class="footer-link">
          <svg class="footer-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
          GITHUB
          <span class="hover-arrow">&rarr;</span>
        </a>` : ''}
        ${safeUrl(profile.linkedin) ? `<a href="${safeUrl(profile.linkedin)}" target="_blank" class="footer-link">
          <svg class="footer-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
          LINKEDIN
          <span class="hover-arrow">&rarr;</span>
        </a>` : ''}
      </div>
      <div class="footer-bottom">
        <div>${safeStr(profile.name).toUpperCase()}</div>
        <div>© 2026</div>
        <div><a href="#" onclick="window.scrollTo({top:0, behavior:'smooth'}); return false;">Yukarı Dön ↑</a></div>
      </div>
    `;
    footerHtml += `</div>`;
    overview.innerHTML += footerHtml;
  }
  
  // Observer for reveal-on-scroll elements
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  
  window.portfolioScrollObserver = observer;
  document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));

  // Stats Counter Animation
  const statsSection = document.getElementById('stats-section');
  if (statsSection) {
    const likesCounter = document.getElementById('likes-counter');
    if (likesCounter) {
      likesCounter.setAttribute('data-target', profile.total_likes || 0);
    }

    const animateCounters = (entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const numbers = entry.target.querySelectorAll('.stat-number');
          numbers.forEach(num => {
            const target = +num.getAttribute('data-target');
            const suffix = num.getAttribute('data-suffix') || '';
            const duration = 2000;
            const startTime = performance.now();
            
            const updateCount = (currentTime) => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const easeOutQuart = 1 - Math.pow(1 - progress, 4);
              const current = Math.floor(target * easeOutQuart);
              
              if (current >= 1000) {
                 num.textContent = (current / 1000).toFixed(current % 1000 === 0 ? 0 : 1) + 'k' + suffix;
              } else {
                 num.textContent = current + suffix;
              }
              
              if (progress < 1) {
                requestAnimationFrame(updateCount);
              } else {
                if (target >= 1000) {
                   num.textContent = (target).toLocaleString('tr-TR') + suffix;
                } else {
                   num.textContent = target + suffix;
                }
              }
            };
            requestAnimationFrame(updateCount);
          });
          obs.unobserve(entry.target);
        }
      });
    };
    
    const statsObserver = new IntersectionObserver(animateCounters, { threshold: 0.5 });
    statsObserver.observe(statsSection);
  }
};

// Contact Form Submit handler
window.submitContactForm = async (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('contact-submit-btn');
  const statusEl = document.getElementById('contact-status-msg');
  
  if (btn.disabled) return;
  btn.disabled = true;
  btn.style.opacity = '0.7';
  btn.textContent = 'Gönderiliyor...';
  statusEl.textContent = '';
  
  const payload = {
    name: form.name.value,
    email: form.email.value,
    subject: form.subject.value,
    message: form.message.value
  };

  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Bir hata oluştu.');
    }
    statusEl.style.color = '#4ade80';
    statusEl.textContent = data.message || 'Mesajınız başarıyla gönderildi.';
    form.reset();
  } catch (err) {
    statusEl.style.color = '#ef4444';
    statusEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.textContent = 'Mesaj Gönder';
  }
};

// Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (e) {
      console.error('Çıkış yapılamadı', e);
    }
  });
}


// BLOG FUNCTIONS FOR VISITOR
window.fetchBlogs = async () => {
    const container = document.getElementById('blog-section-container');
    if (!container) return;
    
    try {
        const res = await fetch('/api/blog');
        const blogs = await res.json();
        
        if (blogs.length === 0) {
            return; // Don't show blog section if no published blogs
        }

        const section = document.createElement('div');
        section.id = 'blog-section';
        section.className = 'editorial-section reveal-on-scroll';
        section.innerHTML = `<h2 class="editorial-title reveal-on-scroll">BLOG</h2>`;
        
        const grid = document.createElement('div');
        grid.className = 'bento-grid';
        grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; width: 100%; margin-top: 20px; padding: 0; box-sizing: border-box;';
        
        const maxBlogs = 4;
        
        const createBlogCard = (blog) => {
            const date = blog.published_at ? new Date(blog.published_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
            
            const card = document.createElement('a');
            card.href = `/blog/${blog.slug}`;
            card.className = 'bento-box reveal-on-scroll';
            card.style.cssText = 'display: flex; flex-direction: column; justify-content: space-between; height: 100%; text-decoration: none; box-sizing: border-box; padding: 24px; min-height: 380px;';
            
            const topContainer = document.createElement('div');
            topContainer.style.cssText = 'display: flex; flex-direction: column; width: 100%;';
            
            if (blog.cover_image) {
                const img = document.createElement('img');
                img.src = blog.cover_image;
                img.alt = 'Blog Cover';
                img.style.cssText = 'width: 100%; height: 180px; object-fit: cover; border-radius: 12px; margin-bottom: 15px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05);';
                img.onerror = () => { img.style.display = 'none'; };
                topContainer.appendChild(img);
            }
            
            const headerRow = document.createElement('div');
            headerRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 10px; flex-wrap: wrap; width: 100%;';
            
            const badge = document.createElement('span');
            badge.className = 'badge secondary';
            const firstTag = blog.tags ? blog.tags.split(',')[0].trim() : 'Genel';
            badge.textContent = firstTag || 'Genel';
            
            const dateSpan = document.createElement('small');
            dateSpan.style.cssText = 'color: #94a3b8; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;';
            dateSpan.innerHTML = `${date} <span style="color: #00c3ff; display: inline-flex; align-items: center; gap: 3px;" aria-label="${blog.like_count || 0} beğeni">♥ ${blog.like_count || 0}</span> <span style="color: #8b949e; display: inline-flex; align-items: center; gap: 3px;" aria-label="${blog.view_count || 0} görüntülenme">👁 ${blog.view_count || 0}</span>`;
            
            headerRow.appendChild(badge);
            headerRow.appendChild(dateSpan);
            topContainer.appendChild(headerRow);
            
            const title = document.createElement('h3');
            title.style.cssText = 'font-size: 1.3rem; margin: 0 0 10px 0; color: #fff; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word; font-weight: 700;';
            title.textContent = blog.title;
            topContainer.appendChild(title);
            
            if (blog.summary) {
                const summary = document.createElement('p');
                summary.style.cssText = 'color: #cbd5e1; font-size: 0.95rem; line-height: 1.6; margin: 0 0 15px 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; word-wrap: break-word;';
                summary.textContent = blog.summary;
                topContainer.appendChild(summary);
            }
            
            card.appendChild(topContainer);
            
            const readMore = document.createElement('div');
            readMore.style.cssText = 'margin-top: auto; color: var(--accent); font-weight: bold; font-size: 0.9rem; display: flex; align-items: center; gap: 5px; padding-top: 10px;';
            readMore.textContent = 'Devamını Oku →';
            card.appendChild(readMore);
            
            return card;
        };

        const blogsToShow = blogs.slice(0, maxBlogs);
        blogsToShow.forEach(blog => {
            grid.appendChild(createBlogCard(blog));
        });
        
        section.appendChild(grid);
        
        if (blogs.length > maxBlogs) {
            const moreBtnContainer = document.createElement('div');
            moreBtnContainer.style.cssText = 'display: flex; justify-content: center; margin-top: 30px;';
            
            const moreBtn = document.createElement('button');
            moreBtn.className = 'badge primary';
            moreBtn.style.cssText = 'padding: 10px 20px; font-size: 1rem; border: none; cursor: pointer; text-decoration: none;';
            moreBtn.textContent = 'Tüm Yazıları Gör';
            moreBtn.onclick = (e) => {
                e.preventDefault();
                moreBtnContainer.style.display = 'none';
                const remainingBlogs = blogs.slice(maxBlogs);
                remainingBlogs.forEach(blog => {
                    grid.appendChild(createBlogCard(blog));
                });
            };
            moreBtnContainer.appendChild(moreBtn);
            section.appendChild(moreBtnContainer);
        }
        
        container.innerHTML = '';
        container.appendChild(section);
        
        // Dinamik eklenen elementleri scroll observer'a kaydet (Aşama 7 Animasyon)
        if (window.portfolioScrollObserver) {
            window.portfolioScrollObserver.observe(section);
            section.querySelectorAll('.reveal-on-scroll').forEach(el => {
                window.portfolioScrollObserver.observe(el);
            });
        }
        
    } catch (err) {
        console.error('Blog verileri çekilirken hata:', err);
    }
};

// Start loading data
loadData().catch((error) => console.error(error));

// ==================================================
// BLOG YORUM SİSTEMİ (AŞAMA 4)
// ==================================================

const loadComments = async () => {
    if (!window.BLOG_SLUG) return;
    try {
        const res = await fetch(`/api/blog/${window.BLOG_SLUG}/comments`);
        if (res.ok) {
            const comments = await res.json();
            const listEl = document.getElementById('comments-list');
            const countEl = document.getElementById('comments-count');
            
            if (countEl) countEl.textContent = comments.length;
            
            if (!listEl) return;
            
            listEl.innerHTML = '';
            
            if (comments.length === 0) {
                listEl.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">Henüz yorum yapılmamış. İlk yorumu siz yapın.</div>';
                return;
            }
            
            comments.forEach(c => {
                const card = document.createElement('div');
                card.style.cssText = 'padding: 20px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 12px;';
                
                const header = document.createElement('div');
                header.style.cssText = 'display: flex; gap: 12px; align-items: center; margin-bottom: 4px;';
                
                const img = document.createElement('img');
                img.src = c.profile_image || '/static/favicon.svg';
                img.style.cssText = 'width: 32px; height: 32px; border-radius: 50%; object-fit: cover;';
                
                const nameInfo = document.createElement('div');
                const nameSpan = document.createElement('div');
                nameSpan.style.cssText = 'color: #fff; font-weight: bold; font-size: 0.95rem;';
                nameSpan.textContent = c.display_name;
                
                const dateSpan = document.createElement('div');
                dateSpan.style.cssText = 'color: #64748b; font-size: 0.8rem; margin-top: 2px;';
                const d = new Date(c.created_at);
                dateSpan.textContent = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                
                nameInfo.appendChild(nameSpan);
                nameInfo.appendChild(dateSpan);
                
                header.appendChild(img);
                header.appendChild(nameInfo);
                
                const content = document.createElement('div');
                content.style.cssText = 'color: #cbd5e1; font-size: 1rem; line-height: 1.6; white-space: pre-wrap; word-break: break-word;';
                content.textContent = c.content;
                
                const likeContainer = document.createElement('div');
                likeContainer.style.cssText = 'display: flex; align-items: center; margin-top: 4px;';
                
                const likeBtn = document.createElement('button');
                likeBtn.className = 'badge';
                likeBtn.style.cssText = 'background: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255, 255, 255, 0.05); color: #94a3b8; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; padding: 6px 12px; border-radius: 20px; transition: all 0.2s ease;';
                likeBtn.setAttribute('aria-label', c.liked ? 'Yorum beğenisini kaldır' : 'Yorumu beğen');
                
                const heart = document.createElement('span');
                heart.textContent = c.liked ? '♥' : '♡';
                heart.style.cssText = 'font-size: 1.1rem; line-height: 1;';
                if (c.liked) heart.style.color = '#00c3ff';
                
                const count = document.createElement('span');
                count.textContent = c.like_count || 0;
                
                likeBtn.appendChild(heart);
                likeBtn.appendChild(count);
                
                likeBtn.onclick = async () => {
                    likeBtn.disabled = true;
                    const method = c.liked ? 'DELETE' : 'POST';
                    try {
                        const lRes = await fetch(`/api/blog/comments/${c.id}/likes`, { method });
                        const lData = await lRes.json();
                        if (lRes.ok) {
                            c.liked = !c.liked;
                            c.like_count = lData.count;
                            heart.textContent = c.liked ? '♥' : '♡';
                            heart.style.color = c.liked ? '#00c3ff' : '';
                            count.textContent = lData.count;
                            likeBtn.setAttribute('aria-label', c.liked ? 'Yorum beğenisini kaldır' : 'Yorumu beğen');
                        } else {
                            showToast(lData.error || 'İşlem gerçekleştirilemedi.', 'error');
                        }
                    } catch (err) {
                        showToast('Bağlantı hatası.', 'error');
                    } finally {
                        likeBtn.disabled = false;
                    }
                };
                
                likeContainer.appendChild(likeBtn);
                
                card.appendChild(header);
                card.appendChild(content);
                card.appendChild(likeContainer);
                listEl.appendChild(card);
            });
        }
    } catch (e) {
        console.error('Yorumlar yüklenirken hata:', e);
        const listEl = document.getElementById('comments-list');
        if (listEl) listEl.innerHTML = '<div style="color: #f87171; text-align: center; padding: 20px;">Yorumlar yüklenemedi.</div>';
    }
};

const checkVisitorStatus = async () => {
    if (!window.BLOG_SLUG) return;
    try {
        const res = await fetch('/api/auth/visitor/status');
        const data = await res.json();
        
        const loginPrompt = document.getElementById('comment-login-prompt');
        const composeSection = document.getElementById('comment-compose-section');
        
        if (data.logged_in) {
            if (loginPrompt) loginPrompt.style.display = 'none';
            if (composeSection) composeSection.style.display = 'block';
            
            const avatar = document.getElementById('current-user-avatar');
            const name = document.getElementById('current-user-name');
            if (avatar) avatar.src = data.user.profile_image || '/static/favicon.svg';
            if (name) name.textContent = data.user.display_name;
        } else {
            if (loginPrompt) loginPrompt.style.display = 'block';
            if (composeSection) composeSection.style.display = 'none';
        }
    } catch (e) {
        console.error('Visitor status error:', e);
    }
};

window.handleCommentGoogleLogin = async (response) => {
    showToast('Giriş yapılıyor...', 'info');
    try {
        const res = await fetch('/api/auth/visitor/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Giriş başarılı!', 'success');
            checkVisitorStatus();
            if (typeof loadComments === 'function') {
                loadComments();
            }
            if (typeof window.loadBlogLikes === 'function') {
                window.loadBlogLikes();
            }
        } else {
            showToast(data.error || 'Giriş başarısız', 'error');
        }
    } catch (e) {
        showToast('Bağlantı hatası', 'error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.BLOG_SLUG) {
        if (window.PREVIEW_MODE) {
            const listEl = document.getElementById('comments-list');
            if (listEl) {
                listEl.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">Yorumlar önizleme modunda gösterilmez.</div>';
            }
            const countEl = document.getElementById('comments-count');
            if (countEl) countEl.textContent = '0';
            
            const blogLikeCount = document.getElementById('blog-like-count');
            if (blogLikeCount) blogLikeCount.textContent = '0';
            return;
        }

        loadComments();
        checkVisitorStatus();
        
        const commentForm = document.getElementById('comment-form');
        const commentInput = document.getElementById('comment-input');
        const charCount = document.getElementById('comment-char-count');
        const submitBtn = document.getElementById('submit-comment-btn');
        
        if (commentInput && charCount) {
            commentInput.addEventListener('input', () => {
                charCount.textContent = `${commentInput.value.length} / 2000`;
            });
        }
        
        if (commentForm) {
            commentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const content = commentInput.value.trim();
                if (!content) return;
                
                submitBtn.disabled = true;
                submitBtn.textContent = 'Gönderiliyor...';
                
                try {
                    const res = await fetch(`/api/blog/${window.BLOG_SLUG}/comments`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content })
                    });
                    const data = await res.json();
                    
                    if (res.ok) {
                        showToast(data.message || 'Yorum eklendi', 'success');
                        commentInput.value = '';
                        if (charCount) charCount.textContent = '0 / 2000';
                        loadComments();
                    } else {
                        showToast(data.error || 'Yorum eklenemedi', 'error');
                    }
                } catch (err) {
                    showToast('Bağlantı hatası', 'error');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Gönder';
                }
            });
        }

        // Setup Blog post likes (Aşama 5)
        const blogLikeBtn = document.getElementById('blog-like-btn');
        const blogLikeIcon = document.getElementById('blog-like-icon');
        const blogLikeText = document.getElementById('blog-like-text');
        const blogLikeCount = document.getElementById('blog-like-count');
        
        let blogLiked = false;
        
        window.loadBlogLikes = async () => {
            if (!blogLikeBtn) return;
            try {
                const lRes = await fetch(`/api/blog/${window.BLOG_SLUG}/likes`);
                if (lRes.ok) {
                    const lData = await lRes.json();
                    blogLiked = lData.liked;
                    if (blogLikeCount) blogLikeCount.textContent = lData.count;
                    
                    if (blogLikeIcon) {
                        blogLikeIcon.textContent = blogLiked ? '♥' : '♡';
                        blogLikeIcon.style.color = blogLiked ? '#00c3ff' : '';
                    }
                    if (blogLikeText) {
                        blogLikeText.textContent = blogLiked ? 'Beğenildi' : 'Beğen';
                    }
                    blogLikeBtn.setAttribute('aria-label', blogLiked ? 'Blog yazısı beğenisini kaldır' : 'Blog yazısını beğen');
                }
            } catch (err) {
                console.error('Blog beğenileri yüklenirken hata:', err);
            }
        };
        
        if (blogLikeBtn) {
            window.loadBlogLikes();
            
            blogLikeBtn.onclick = async () => {
                blogLikeBtn.disabled = true;
                const method = blogLiked ? 'DELETE' : 'POST';
                try {
                    const lRes = await fetch(`/api/blog/${window.BLOG_SLUG}/likes`, { method });
                    const lData = await lRes.json();
                    if (lRes.ok) {
                        blogLiked = !blogLiked;
                        if (blogLikeCount) blogLikeCount.textContent = lData.count;
                        if (blogLikeIcon) {
                            blogLikeIcon.textContent = blogLiked ? '♥' : '♡';
                            blogLikeIcon.style.color = blogLiked ? '#00c3ff' : '';
                        }
                        if (blogLikeText) {
                            blogLikeText.textContent = blogLiked ? 'Beğenildi' : 'Beğen';
                        }
                        blogLikeBtn.setAttribute('aria-label', blogLiked ? 'Blog yazısı beğenisini kaldır' : 'Blog yazısını beğen');
                    } else {
                        showToast(lData.error || 'İşlem gerçekleştirilemedi.', 'error');
                    }
                } catch (err) {
                    showToast('Bağlantı hatası.', 'error');
                } finally {
                    blogLikeBtn.disabled = false;
                }
            };
        }
    }
});
