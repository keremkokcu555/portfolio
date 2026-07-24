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

const profileForm = document.getElementById('profile-form');
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
  if (!profileForm) {
    console.warn('Profile form not found');
    return;
  }
  
  const isVisitor = document.body.classList.contains('visitor-mode');
  let profileData = null;
  try {
    const profile = await fetchJson(`${apiBase}/profile`);
    profileData = profile;
    Object.keys(profile).forEach((key) => {
      const input = profileForm.querySelector(`[name="${key}"]`);
      if (input && input.type !== 'file') {
        if (input.type === 'checkbox') input.checked = Boolean(profile[key]);
        else input.value = profile[key] ?? '';
        
        if (isVisitor && input.value && input.value.startsWith('http')) {
          input.style.display = 'none';
          let existingLink = input.parentNode.querySelector(`a.visitor-link[data-for="${key}"]`);
          if (!existingLink) {
            const a = document.createElement('a');
            a.className = 'visitor-link';
            a.dataset.for = key;
            a.href = input.value;
            a.target = '_blank';
            a.textContent = input.value;
            a.style.color = '#a5b4fc';
            a.style.textDecoration = 'underline';
            a.style.display = 'block';
            a.style.wordBreak = 'break-all';
            input.parentNode.insertBefore(a, input.nextSibling);
          } else {
            existingLink.href = input.value;
            existingLink.textContent = input.value;
          }
        }
      }
    });
    updatePreview('preview-profile_photo', profile.profile_photo);
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
  const overview = document.getElementById('portfolio-overview');
  if (!overview) return;
  overview.innerHTML = '';
  
  const safeStr = (val) => (!val || val === 'null' || String(val).trim() === '') ? '' : String(val).trim();
  const safeUrl = (val) => {
    const s = safeStr(val);
    return (s && s !== 'Kullanılmıyor' && s !== '#') ? s : '';
  };

  if (profile) {
    const visitorHero = document.getElementById('visitor-hero');
    if (visitorHero) visitorHero.innerHTML = ''; // Hide hero
    
    // ABOUT SECTION (Profil)
    const hasAboutData = Object.values(profile).some(val => safeStr(val));
    if (hasAboutData) {
      const aboutDiv = document.createElement('div');
      aboutDiv.id = 'about-section';
      aboutDiv.className = 'editorial-section reveal-on-scroll';
      
      let profileHtml = '';
      
      if (profile.profile_photo && profile.profile_photo !== 'null' && profile.profile_photo.trim() !== '') {
        profileHtml += `<img src="${profile.profile_photo}" alt="Profil Fotoğrafı" class="proj-image" style="max-width:250px; margin-bottom:32px;">`;
      }
      
      const addField = (label, val, isLink = false, linkPrefix = '') => {
        const cleanVal = safeStr(val);
        if (!cleanVal || cleanVal === 'Kullanılmıyor' || cleanVal === 'X' || cleanVal === 'YouTube' || cleanVal === 'Website') return '';
        
        let displayVal = cleanVal;
        if (isLink) {
          const href = linkPrefix ? linkPrefix + cleanVal : cleanVal;
          displayVal = `<a href="${href}" target="_blank" class="about-link" style="text-decoration:underline;">${cleanVal}</a>`;
        }
        
        return `
          <div class="timeline-row" style="padding: 16px 0; grid-template-columns: 1fr;">
            <div class="timeline-content">
              <h3 class="timeline-subtitle" style="margin-bottom: 8px; color: var(--accent); font-weight: 600; text-transform: uppercase; font-size: 0.8rem;">${label}</h3>
              <div class="timeline-title" style="font-size: 0.95rem;">${displayVal}</div>
            </div>
          </div>
        `;
      };

      profileHtml += addField('Ad Soyad', profile.name);
      profileHtml += addField('Unvan', profile.title);
      profileHtml += addField('E-posta', profile.email, true, 'mailto:');
      profileHtml += addField('Telefon', profile.phone, true, 'tel:');
      profileHtml += addField('Şehir', profile.city);
      profileHtml += addField('Adres', profile.address);
      profileHtml += addField('Website', profile.website, true);
      profileHtml += addField('GitHub', profile.github, true);
      profileHtml += addField('LinkedIn', profile.linkedin, true);
      profileHtml += addField('Instagram', profile.instagram, true);
      profileHtml += addField('X', profile.x, true);
      profileHtml += addField('YouTube', profile.youtube, true);
      
      const summary = safeStr(profile.summary);
      if (summary) {
        profileHtml += `
          <div class="timeline-row" style="padding: 16px 0; grid-template-columns: 1fr;">
            <div class="timeline-content">
              <h3 class="timeline-subtitle" style="margin-bottom: 8px; color: var(--accent); font-weight: 600; text-transform: uppercase; font-size: 0.8rem;">Hakkımda</h3>
              <div class="timeline-desc" style="font-size: 0.95rem; line-height: 1.6;">${summary}</div>
            </div>
          </div>
        `;
      }

      aboutDiv.innerHTML = `
        <div class="editorial-header">PROFİL</div>
        <div class="profile-details-list">
          ${profileHtml}
        </div>
      `;
      overview.appendChild(aboutDiv);
    }
  }

  const sections = [
    { id: 'education-section', title: 'EĞİTİM', items: data.education, type: 'education' },
    { id: 'courses-section', title: 'KURSLAR', items: data.courses, type: 'courses' },
    { id: 'certificates-section', title: 'SERTİFİKALAR', items: data.certificates, type: 'certificates' },
    { id: 'experience-section', title: 'DENEYİMLER', items: data.experiences, type: 'experience' },
    { id: 'projects-section', title: 'PROJELER', items: data.projects, type: 'projects' },
    { id: 'skills-section', title: 'YETENEKLER', items: data.skills, type: 'skills' },
    { id: 'languages-section', title: 'DİLLER', items: data.languages, type: 'languages' }
  ];
  
  sections.forEach(sec => {
    if (sec.items && sec.items.length > 0) {
      const secDiv = document.createElement('div');
      secDiv.id = sec.id;
      secDiv.className = 'editorial-section reveal-on-scroll';
      secDiv.innerHTML = `<div class="editorial-header">${sec.title}</div>`;
      
      const listDiv = document.createElement('div');
      listDiv.className = `editorial-list list-${sec.type}`;
      
      sec.items.forEach((item, index) => {
        const idx = String(index + 1).padStart(2, '0');
        let cardHtml = '';

        if (sec.type === 'projects') {
          const title = safeStr(item.title);
          const category = safeStr(item.category);
          const desc = safeStr(item.description) || safeStr(item.summary);
          const tech = safeStr(item.technologies);
          const githubLink = safeUrl(item.github_link);
          const demoLink = safeUrl(item.demo_link) || safeUrl(item.live_link);
          const image = safeUrl(item.image);
          const startDate = safeStr(item.start_date);
          const endDate = safeStr(item.end_date);
          const ongoing = item.ongoing;
          
          const addField = (label, val, isLink = false, linkLabel = '') => {
            if (!val) return '';
            let displayVal = val;
            if (isLink) {
              displayVal = `<a href="${val}" target="_blank" class="about-link" style="text-decoration:underline;">${linkLabel} ↗</a>`;
            }
            return `
              <div class="timeline-row" style="padding: 8px 0; grid-template-columns: 1fr;">
                <div class="timeline-content">
                  <h3 class="timeline-subtitle" style="margin-bottom: 4px; color: var(--accent); font-weight: 600; text-transform: uppercase; font-size: 0.8rem;">${label}</h3>
                  <div class="timeline-title" style="font-size: 1rem; line-height: 1.5;">${displayVal}</div>
                </div>
              </div>
            `;
          };

          let detailsHtml = '';
          if (image) detailsHtml += `<img src="${image}" alt="${title}" class="proj-image" style="max-width:400px; margin-bottom:16px;">`;
          if (category) detailsHtml += addField('Kategori', category);
          if (tech) detailsHtml += addField('Teknolojiler', tech);
          if (startDate) detailsHtml += addField('Başlangıç', startDate);
          if (ongoing) detailsHtml += addField('Bitiş', 'Devam Ediyor');
          else if (endDate) detailsHtml += addField('Bitiş', endDate);
          if (desc) detailsHtml += addField('Açıklama', desc);
          if (githubLink) detailsHtml += addField('GitHub', githubLink, true, 'GitHub Reposunu İncele');
          if (demoLink) detailsHtml += addField('Canlı Demo', demoLink, true, 'Projeyi Canlıda Gör');

          cardHtml = `
            <div class="education-card" style="margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <h3 class="proj-title" style="margin-bottom: 20px; font-size: 1.2rem;">${idx}. ${title}</h3>
              <div class="profile-details-list">
                ${detailsHtml}
              </div>
            </div>
          `;
        } 
        else if (sec.type === 'experience') {
          const company = safeStr(item.company);
          const position = safeStr(item.position);
          const department = safeStr(item.department);
          const desc = safeStr(item.description);
          const startDate = safeStr(item.start_date);
          const endDate = safeStr(item.end_date);
          const city = safeStr(item.city) || safeStr(item.location);
          
          const addField = (label, val) => {
            if (!val) return '';
            return `
              <div class="timeline-row" style="padding: 8px 0; grid-template-columns: 1fr;">
                <div class="timeline-content">
                  <h3 class="timeline-subtitle" style="margin-bottom: 4px; color: var(--accent); font-weight: 600; text-transform: uppercase; font-size: 0.8rem;">${label}</h3>
                  <div class="timeline-title" style="font-size: 1rem; line-height: 1.5;">${val}</div>
                </div>
              </div>
            `;
          };

          let detailsHtml = '';
          if (position) detailsHtml += addField('Pozisyon', position);
          if (department) detailsHtml += addField('Departman', department);
          if (startDate) detailsHtml += addField('Başlangıç', startDate);
          if (item.ongoing) detailsHtml += addField('Bitiş', 'Devam Ediyor');
          else if (endDate) detailsHtml += addField('Bitiş', endDate);
          if (city) detailsHtml += addField('Şehir/Lokasyon', city);
          if (desc) detailsHtml += addField('Açıklama', desc);

          cardHtml = `
            <div class="education-card" style="margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <h3 class="proj-title" style="margin-bottom: 20px; font-size: 1.2rem;">${company}</h3>
              <div class="profile-details-list">
                ${detailsHtml}
              </div>
            </div>
          `;
        }
        else if (sec.type === 'education') {
          const school = safeStr(item.school);
          const dept = safeStr(item.department);
          const level = safeStr(item.level);
          const desc = safeStr(item.description);
          const startDate = safeStr(item.start_date);
          const endDate = safeStr(item.end_date);
          const gpa = safeStr(item.gpa);
          const city = safeStr(item.city) || safeStr(item.location);
          
          const addField = (label, val) => {
            if (!val) return '';
            return `
              <div class="timeline-row" style="padding: 8px 0; grid-template-columns: 1fr;">
                <div class="timeline-content">
                  <h3 class="timeline-subtitle" style="margin-bottom: 4px; color: var(--accent); font-weight: 600; text-transform: uppercase; font-size: 0.8rem;">${label}</h3>
                  <div class="timeline-title" style="font-size: 1rem;">${val}</div>
                </div>
              </div>
            `;
          };

          let detailsHtml = '';
          if (dept) detailsHtml += addField('Bölüm', dept);
          if (level) detailsHtml += addField('Seviye/Derece', level);
          if (startDate) detailsHtml += addField('Başlangıç', startDate);
          if (item.ongoing) {
            detailsHtml += addField('Bitiş', 'Devam Ediyor');
          } else if (endDate) {
            detailsHtml += addField('Bitiş', endDate);
          }
          if (gpa) detailsHtml += addField('Ortalama (GPA)', gpa);
          if (city) detailsHtml += addField('Şehir/Lokasyon', city);
          if (desc) detailsHtml += addField('Açıklama', desc);

          cardHtml = `
            <div class="education-card" style="margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <h3 class="proj-title" style="margin-bottom: 20px; font-size: 1.2rem;">${school}</h3>
              <div class="profile-details-list">
                ${detailsHtml}
              </div>
            </div>
          `;
        }
        else if (sec.type === 'skills') {
          const name = safeStr(item.name);
          const category = safeStr(item.category);
          const level = safeStr(item.level);
          
          const addField = (label, val) => {
            if (!val) return '';
            return `
              <div class="timeline-row" style="padding: 8px 0; grid-template-columns: 1fr;">
                <div class="timeline-content">
                  <h3 class="timeline-subtitle" style="margin-bottom: 4px; color: var(--accent); font-weight: 600; text-transform: uppercase; font-size: 0.8rem;">${label}</h3>
                  <div class="timeline-title" style="font-size: 1rem; line-height: 1.5;">${val}</div>
                </div>
              </div>
            `;
          };

          let detailsHtml = '';
          if (category) detailsHtml += addField('Kategori', category);
          if (level) detailsHtml += addField('Seviye', level);
          
          cardHtml = `
            <div class="education-card" style="margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <h3 class="proj-title" style="margin-bottom: 20px; font-size: 1.2rem;">${name}</h3>
              <div class="profile-details-list">
                ${detailsHtml}
              </div>
            </div>
          `;
        }
        else if (sec.type === 'certificates') {
          const name = safeStr(item.name);
          const org = safeStr(item.organization);
          const date = safeStr(item.date);
          const desc = safeStr(item.description);
          const credUrl = safeUrl(item.credential_url) || safeUrl(item.certificate_link);
          const pdf = safeUrl(item.pdf);
          const image = safeUrl(item.image);
          
          const addField = (label, val, isLink = false, linkLabel = '') => {
            if (!val) return '';
            let displayVal = val;
            if (isLink) {
              displayVal = `<a href="${val}" target="_blank" class="about-link" style="text-decoration:underline;">${linkLabel} ↗</a>`;
            }
            return `
              <div class="timeline-row" style="padding: 8px 0; grid-template-columns: 1fr;">
                <div class="timeline-content">
                  <h3 class="timeline-subtitle" style="margin-bottom: 4px; color: var(--accent); font-weight: 600; text-transform: uppercase; font-size: 0.8rem;">${label}</h3>
                  <div class="timeline-title" style="font-size: 1rem; line-height: 1.5;">${displayVal}</div>
                </div>
              </div>
            `;
          };

          let detailsHtml = '';
          if (org) detailsHtml += addField('Kurum', org);
          if (date) detailsHtml += addField('Tarih', date);
          if (desc) detailsHtml += addField('Açıklama', desc);
          
          // Documents and Links
          if (credUrl) detailsHtml += addField('Doğrulama Linki', credUrl, true, 'Bağlantı');
          if (pdf) detailsHtml += addField('Sertifika Belgesi (PDF)', pdf, true, 'PDF Gör');
          if (image) detailsHtml += addField('Sertifika Görseli', image, true, 'Görsel Gör');

          cardHtml = `
            <div class="education-card" style="margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <h3 class="proj-title" style="margin-bottom: 20px; font-size: 1.2rem;">${name}</h3>
              <div class="profile-details-list">
                ${detailsHtml}
              </div>
            </div>
          `;
        }
        else if (sec.type === 'courses') {
          const title = safeStr(item.title);
          const org = safeStr(item.organization);
          const desc = safeStr(item.description);
          const startDate = safeStr(item.start_date);
          const endDate = safeStr(item.end_date);
          const certLink = safeUrl(item.certificate_link);
          
          const addField = (label, val, isLink = false) => {
            if (!val) return '';
            let displayVal = val;
            if (isLink) {
              displayVal = `<a href="${val}" target="_blank" class="about-link" style="text-decoration:underline;">Sertifikayı Gör ↗</a>`;
            }
            return `
              <div class="timeline-row" style="padding: 8px 0; grid-template-columns: 1fr;">
                <div class="timeline-content">
                  <h3 class="timeline-subtitle" style="margin-bottom: 4px; color: var(--accent); font-weight: 600; text-transform: uppercase; font-size: 0.8rem;">${label}</h3>
                  <div class="timeline-title" style="font-size: 1rem; line-height: 1.5;">${displayVal}</div>
                </div>
              </div>
            `;
          };

          let detailsHtml = '';
          if (org) detailsHtml += addField('Kurum', org);
          if (startDate) detailsHtml += addField('Başlangıç', startDate);
          if (endDate) detailsHtml += addField('Bitiş', endDate);
          if (desc) detailsHtml += addField('Açıklama', desc);
          if (certLink) detailsHtml += addField('Sertifika/Belge', certLink, true);

          cardHtml = `
            <div class="education-card" style="margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <h3 class="proj-title" style="margin-bottom: 20px; font-size: 1.2rem;">${title}</h3>
              <div class="profile-details-list">
                ${detailsHtml}
              </div>
            </div>
          `;
        }
        else if (sec.type === 'languages') {
          const name = safeStr(item.name);
          const level = safeStr(item.level);
          
          const addField = (label, val) => {
            if (!val) return '';
            return `
              <div class="timeline-row" style="padding: 8px 0; grid-template-columns: 1fr;">
                <div class="timeline-content">
                  <h3 class="timeline-subtitle" style="margin-bottom: 4px; color: var(--accent); font-weight: 600; text-transform: uppercase; font-size: 0.8rem;">${label}</h3>
                  <div class="timeline-title" style="font-size: 1rem; line-height: 1.5;">${val}</div>
                </div>
              </div>
            `;
          };

          let detailsHtml = '';
          if (level) detailsHtml += addField('Seviye', level);
          
          cardHtml = `
            <div class="education-card" style="margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <h3 class="proj-title" style="margin-bottom: 20px; font-size: 1.2rem;">${name}</h3>
              <div class="profile-details-list">
                ${detailsHtml}
              </div>
            </div>
          `;
        }
        
        const cardWrapper = document.createElement('div');
        cardWrapper.innerHTML = cardHtml;
        listDiv.appendChild(cardWrapper.firstElementChild);
      });
      
      secDiv.appendChild(listDiv);
      overview.appendChild(secDiv);
    }
  });

  // Footer removed as per user request
  
  // Intersection Observer for scroll animations
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

const submitForm = async (form, endpoint, idField = 'id') => {
  const fileInputs = form.querySelectorAll('input[type="file"]');
  for (const fileInput of fileInputs) {
    if (fileInput.files.length > 0) {
      try {
        const url = await uploadFile(fileInput.files[0]);
        const hiddenName = fileInput.name.replace('_file', '');
        const hiddenInput = form.querySelector(`input[name="${hiddenName}"]`);
        if (hiddenInput) hiddenInput.value = url;
      } catch (err) {
        alert(err.message);
        return;
      }
    }
  }

  const formData = new FormData(form);
  const payload = {};
  formData.forEach((value, key) => {
    if (key.endsWith('_file')) return;
    if (key === 'ongoing' || key === 'certificate') {
      const el = form.elements[key];
      payload[key] = el ? (el.checked ? 1 : 0) : 0;
    } else if (key !== idField) {  // ID'yi payload'a ekleme
      payload[key] = value;
    }
  });
  const itemId = form.elements[idField] ? form.elements[idField].value : null;
  if (itemId) {
    await fetchJson(`${apiBase}/${endpoint}/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } else {
    await fetchJson(`${apiBase}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  form.reset();
  await loadData();
};

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const fileInputs = profileForm.querySelectorAll('input[type="file"]');
    for (const fileInput of fileInputs) {
      if (fileInput.files.length > 0) {
        const url = await uploadFile(fileInput.files[0]);
        const hiddenName = fileInput.name.replace('_file', '');
        const hiddenInput = profileForm.querySelector(`input[name="${hiddenName}"]`);
        if (hiddenInput) hiddenInput.value = url;
      }
    }

    const payload = {};
    new FormData(profileForm).forEach((value, key) => {
      if (!key.endsWith('_file')) payload[key] = value;
    });
    await fetchJson(`${apiBase}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    alert('Profil güncellendi');
    updatePreview('preview-profile_photo', payload.profile_photo);
  } catch (error) {
    alert('Hata: ' + error.message);
    console.error(error);
  }
});

  const initForm = (formId, endpoint) => {
    const form = document.getElementById(formId);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      await submitForm(form, endpoint);
      if (document.body.classList.contains('visitor-mode')) {
        window.scrollTo({ top: form.offsetTop - 100 });
      }
    });
  };initForm('education-form', 'education');
initForm('courses-form', 'courses');
initForm('certificates-form', 'certificates');
initForm('experiences-form', 'experiences');
initForm('projects-form', 'projects');
initForm('skills-form', 'skills');
initForm('languages-form', 'languages');

const tableContainer = document.body;
tableContainer.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const entity = button.dataset.entity;
  const id = button.dataset.id;
  if (button.dataset.action === 'delete') {
    if (confirm('Bu kaydı silmek istediğinizden emin misiniz?')) {
      await fetchJson(`${apiBase}/${entity}/${id}`, { method: 'DELETE' });
      await loadData();
    }
  } else if (button.dataset.action === 'edit') {
    const item = await fetchJson(`${apiBase}/${entity}`);
    const selected = item.find((row) => row.id === Number(id));
    const form = document.getElementById(`${entity}-form`);
    Object.keys(selected).forEach((key) => {
      const input = form.querySelector(`[name="${key}"]`);
      if (!input || input.type === 'file') return;
      if (input.type === 'checkbox') input.checked = Boolean(selected[key]);
      else input.value = selected[key] ?? '';
    });
    if (entity === 'certificates') {
      updatePreview('preview-certificates-image', selected.image);
      updatePreview('preview-certificates-pdf', selected.pdf);
    } else if (entity === 'projects') {
      updatePreview('preview-projects-image', selected.image);
    } else if (entity === 'courses') {
      updatePreview('preview-courses-certificate_link', selected.certificate_link);
    }
    window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
  }
});

loadData().catch((error) => console.error(error));

// Dashboard counts
const updateDashboardCounts = async () => {
  try {
    const data = await fetchJson(`${apiBase}/counts`);
    Object.keys(data).forEach((table) => {
      const countElement = document.querySelector(`.card-count[data-table="${table}"]`);
      if (countElement) {
        countElement.textContent = data[table].count;
      }
    });
  } catch (error) {
    console.error('Sayılar yüklenirken hata:', error);
  }
};

updateDashboardCounts();

// Verileri güncelledikten sonra sayıları da güncelle
const originalLoadData = loadData;
window.loadData = async function() {
  const result = await originalLoadData();
  await updateDashboardCounts();
  return result;
};

// Form gönderildikten sonra sayıları güncelle
document.querySelectorAll('.data-form').forEach((form) => {
  const originalSubmit = form.onsubmit;
  form.addEventListener('submit', async (e) => {
    await new Promise(r => setTimeout(r, 300)); // 300ms bekle
    await updateDashboardCounts();
  });
});

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
