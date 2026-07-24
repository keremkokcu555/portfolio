const apiBase = '/api';

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
  }
};

const renderOverview = (data, profile) => {
  if (!document.getElementById('visitor-bg')) {
    const bg = document.createElement('div');
    bg.id = 'visitor-bg';
    bg.className = 'visitor-bg-container';
    bg.innerHTML = '<div class="visitor-bg-orb-1"></div><div class="visitor-bg-orb-2"></div><div class="visitor-bg-noise"></div>';
    document.body.prepend(bg);
    
    document.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      bg.style.setProperty('--mouse-x', `${x}%`);
      bg.style.setProperty('--mouse-y', `${y}%`);
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
      
      aboutHtml += `<div class="about-grid">`;
      aboutHtml += `<div class="about-text">${safeStr(profile.summary).split('\n').join('<br><br>')}</div>`;
      
      aboutHtml += `<div class="about-contact">`;
      const addContact = (label, val, link='') => {
        if(!safeStr(val)) return '';
        const v = link ? `<a href="${link}" target="_blank">${safeStr(val)} ↗</a>` : safeStr(val);
        return `<div class="contact-item"><div class="contact-label">${label}</div><div class="contact-val">${v}</div></div>`;
      };
      aboutHtml += addContact('ŞEHİR', profile.city);
      aboutHtml += addContact('TELEFON', profile.phone, safeStr(profile.phone) ? 'tel:'+profile.phone : '');
      aboutHtml += addContact('E-POSTA', profile.email, safeStr(profile.email) ? 'mailto:'+profile.email : '');
      aboutHtml += addContact('GITHUB', profile.github, profile.github);
      aboutHtml += addContact('LİNKEDİN', profile.linkedin, profile.linkedin);
      aboutHtml += addContact('WEBSİTESİ', profile.website, profile.website);
      aboutHtml += addContact('INSTAGRAM', profile.instagram, profile.instagram);
      aboutHtml += addContact('X', profile.x, profile.x);
      aboutHtml += addContact('YOUTUBE', profile.youtube, profile.youtube);
      
      aboutHtml += `</div></div></div>`;
      overview.innerHTML += aboutHtml;
    }
  }

  // 4. PROJELER
  if (data.projects && data.projects.length > 0) {
    overview.innerHTML += hr();
    let projHtml = `<div id="projects-section" class="editorial-section reveal-on-scroll">`;
    projHtml += sectionTitle('SEÇİLMİŞ PROJELER');
    
    data.projects.forEach((p, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      let linksHtml = '';
      if(safeUrl(p.github_link)) linksHtml += `<a href="${safeUrl(p.github_link)}" target="_blank" class="proj-link">GitHub <span class="proj-arrow">↗</span></a>`;
      if(safeUrl(p.demo_link)) linksHtml += `<a href="${safeUrl(p.demo_link)}" target="_blank" class="proj-link">Canlı Site <span class="proj-arrow">↗</span></a>`;
      
      let techHtml = safeStr(p.technologies).split(',').map(t => t.trim()).filter(Boolean).join(' • ');

      projHtml += `
        <div class="proj-row">
          <div class="proj-num">${num}</div>
          <div class="proj-content">
            <h3 class="proj-title">${safeStr(p.title)}</h3>
            ${safeStr(p.category) ? `<div class="proj-cat">${safeStr(p.category)}</div>` : ''}
            <div class="proj-desc">${safeStr(p.description)}</div>
            ${safeUrl(p.image) ? `<img src="${safeUrl(p.image)}" onerror="this.style.display='none'" style="max-width:100%; border-radius:4px; margin-bottom:24px; border:1px solid var(--border-color);">` : ''}
            <div class="proj-tech-row">
              <div class="proj-tech">${techHtml}</div>
              <div class="proj-links">${linksHtml}</div>
            </div>
          </div>
        </div>
      `;
    });
    projHtml += `</div>`;
    overview.innerHTML += projHtml;
  }

  // 5. DENEYİM
  if (data.experiences && data.experiences.length > 0) {
    overview.innerHTML += hr();
    let expHtml = `<div id="experience-section" class="editorial-section reveal-on-scroll">`;
    expHtml += sectionTitle('DENEYİM');
    data.experiences.forEach(e => {
      const startYear = safeStr(e.start_date).split('-')[0] || safeStr(e.start_date);
      const endYear = e.ongoing ? 'DEVAM' : (safeStr(e.end_date).split('-')[0] || safeStr(e.end_date));
      const dateStr = `${startYear} — ${endYear}`;
      expHtml += `
        <div class="timeline-row">
          <div class="timeline-date">${dateStr}</div>
          <div>
            <h3 class="timeline-title">${safeStr(e.company)}</h3>
            <div class="timeline-subtitle">${safeStr(e.position)}${safeStr(e.department) ? ` • ${safeStr(e.department)}` : ''}</div>
            <div class="timeline-desc">${safeStr(e.description)}</div>
            ${safeStr(e.city) ? `<div class="timeline-meta">${safeStr(e.city)}</div>` : ''}
          </div>
        </div>
      `;
    });
    expHtml += `</div>`;
    overview.innerHTML += expHtml;
  }

  // 6. YETENEKLER
  if (data.skills && data.skills.length > 0) {
    overview.innerHTML += hr();
    let skHtml = `<div id="skills-section" class="editorial-section reveal-on-scroll">`;
    skHtml += sectionTitle('YETENEKLER');
    data.skills.forEach(s => {
      skHtml += `
        <div class="skill-row">
          <div>
            <h3 class="skill-name">${safeStr(s.name)}</h3>
            ${(safeStr(s.category) || safeStr(s.level)) ? `<div class="skill-meta">${safeStr(s.category)} ${safeStr(s.category) && safeStr(s.level) ? '•' : ''} ${safeStr(s.level)}</div>` : ''}
          </div>
          ${safeUrl(s.certificate_link) ? `<a href="${safeUrl(s.certificate_link)}" target="_blank" class="skill-arrow" style="text-decoration:none;">↗</a>` : ''}
        </div>
      `;
    });
    skHtml += `</div>`;
    overview.innerHTML += skHtml;
  }

  // 7. EĞİTİM
  if (data.education && data.education.length > 0) {
    overview.innerHTML += hr();
    let edHtml = `<div id="education-section" class="editorial-section reveal-on-scroll">`;
    edHtml += sectionTitle('EĞİTİM');
    data.education.forEach(e => {
      const startYear = safeStr(e.start_date).split('-')[0] || safeStr(e.start_date);
      const endYear = e.ongoing ? 'DEVAM' : (safeStr(e.end_date).split('-')[0] || safeStr(e.end_date));
      const dateStr = `${startYear} — ${endYear}`;
      edHtml += `
        <div class="timeline-row">
          <div class="timeline-date">${dateStr}</div>
          <div>
            <h3 class="timeline-title">${safeStr(e.school)}</h3>
            <div class="timeline-subtitle">${safeStr(e.department)}</div>
            ${safeStr(e.description) ? `<div class="timeline-desc">${safeStr(e.description)}</div>` : ''}
            ${safeStr(e.gpa) || safeStr(e.city) ? `<div class="timeline-meta">${[safeStr(e.city), safeStr(e.gpa) ? `GPA: ${safeStr(e.gpa)}` : ''].filter(Boolean).join(' • ')}</div>` : ''}
          </div>
        </div>
      `;
    });
    edHtml += `</div>`;
    overview.innerHTML += edHtml;
  }
  
  // 8. SERTİFİKALAR VE KURSLAR
  if ((data.certificates && data.certificates.length > 0) || (data.courses && data.courses.length > 0)) {
    overview.innerHTML += hr();
    let certHtml = `<div class="editorial-section reveal-on-scroll">`;
    certHtml += `<div class="two-col-certs">`;
    
    // Left: Certificates
    certHtml += `<div class="cert-col">`;
    if (data.certificates && data.certificates.length > 0) {
      certHtml += `<h2 class="editorial-title" style="font-size:2rem;">SERTİFİKALAR</h2>`;
      data.certificates.forEach(c => {
        const year = safeStr(c.date).split('-')[0] || safeStr(c.date);
        const credLink = safeUrl(c.credential_url) || safeUrl(c.certificate_link) || safeUrl(c.pdf);
        certHtml += `
          <div class="cert-item">
            <h3 class="cert-title">${safeStr(c.name)}</h3>
            <div class="cert-org">${safeStr(c.organization)}</div>
            <div class="cert-date">${year}</div>
            ${safeStr(c.description) ? `<div class="cert-desc">${safeStr(c.description)}</div>` : ''}
            ${credLink ? `<a href="${credLink}" target="_blank" class="cert-link">Sertifikayı Gör <span class="proj-arrow">↗</span></a>` : ''}
          </div>
        `;
      });
    }
    certHtml += `</div>`;
    
    // Right: Courses
    certHtml += `<div class="cert-col">`;
    if (data.courses && data.courses.length > 0) {
      certHtml += `<h2 class="editorial-title" style="font-size:2rem;">KURSLAR</h2>`;
      data.courses.forEach(c => {
        const year = safeStr(c.end_date).split('-')[0] || safeStr(c.end_date);
        const certLink = safeUrl(c.certificate_link) || safeUrl(c.pdf);
        certHtml += `
          <div class="cert-item">
            <h3 class="cert-title">${safeStr(c.title)}</h3>
            <div class="cert-org">${safeStr(c.organization)}</div>
            <div class="cert-date">${year}</div>
            ${safeStr(c.description) ? `<div class="cert-desc">${safeStr(c.description)}</div>` : ''}
            ${certLink ? `<a href="${certLink}" target="_blank" class="cert-link">Sertifikayı Gör <span class="proj-arrow">↗</span></a>` : ''}
          </div>
        `;
      });
    }
    certHtml += `</div>`;
    
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
        ${safeStr(profile.email) ? `<a href="mailto:${safeStr(profile.email)}" class="footer-link">E-POSTA ↗</a>` : ''}
        ${safeUrl(profile.github) ? `<a href="${safeUrl(profile.github)}" target="_blank" class="footer-link">GITHUB ↗</a>` : ''}
        ${safeUrl(profile.linkedin) ? `<a href="${safeUrl(profile.linkedin)}" target="_blank" class="footer-link">LINKEDIN ↗</a>` : ''}
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
  
  // Observer
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  
  document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
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


// Start loading data
loadData().catch((error) => console.error(error));
