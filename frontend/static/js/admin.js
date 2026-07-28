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
  
  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
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

  if (target === 'analytics') {
    loadAnalyticsSummary();
    loadDailyStats(7);
    loadAnalyticsBreakdown();
    loadRecentVisits();
  } else if (target === 'likes') {
    loadLikes();
  }
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
  if (item.image) mediaHtml += `<img src="${item.image}" onerror="this.style.display='none'" style="max-height: 40px; border-radius: 4px; margin-right: 5px; vertical-align: middle;" alt="Görsel">`;
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
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta && options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase())) {
    options.headers = { ...options.headers, 'X-CSRFToken': meta.getAttribute('content') };
  }
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

const uploadFile = async (file, type = 'misc') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  const meta = document.querySelector('meta[name="csrf-token"]');
  const headers = meta ? { 'X-CSRFToken': meta.getAttribute('content') } : {};
  const response = await fetch(`${apiBase}/upload`, {
    method: 'POST',
    headers: headers,
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

// Map: previewId → delete button ID
const PREVIEW_DELETE_BTN_MAP = {
  'preview-profile_photo':             'delete-profile-photo-btn',
  'preview-cv_pdf':                    'delete-cv-pdf-btn',
  'preview-courses-certificate_link':  'delete-courses-certificate_link-btn',
  'preview-certificates-image':        'delete-certificates-image-btn',
  'preview-certificates-pdf':          'delete-certificates-pdf-btn',
  'preview-projects-image':            'delete-projects-image-btn',
};

const updatePreview = (containerId, url) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  const btnId = PREVIEW_DELETE_BTN_MAP[containerId];
  const deleteBtn = btnId ? document.getElementById(btnId) : null;
  if (!url) {
    container.innerHTML = '';
    if (deleteBtn) deleteBtn.style.display = 'none';
    return;
  }
  if (url.toLowerCase().endsWith('.pdf')) {
    container.innerHTML = `<a href="${url}" target="_blank" style="color: #a5b4fc; text-decoration: underline;">Mevcut PDF Dosyasını Görüntüle</a>`;
  } else {
    container.innerHTML = `<img src="${url}" style="max-height: 80px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);" alt="Önizleme">`;
  }
  if (deleteBtn) deleteBtn.style.display = 'inline-block';
};

// Genel dosya silme fonksiyonu (tüm upload alanları için)
const deleteFile = async (table, itemId, field, previewId, btnId) => {
  if (!confirm('Bu dosyayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
  const btn = btnId ? document.getElementById(btnId) : null;
  const oldText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.textContent = 'Siliniyor...'; }
  try {
    const meta = document.querySelector('meta[name="csrf-token"]');
    const csrfToken = meta ? meta.getAttribute('content') : '';
    const body = { table, field };
    if (itemId) body.id = Number(itemId);
    const res = await fetch('/api/file', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
      body: JSON.stringify(body)
    });
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Silme başarısız');
    }
    // Önizlemeyi temizle, butonu gizle
    updatePreview(previewId, '');
    // İlgili gizli input'u temizle (form yeniden kaydedilirse eski path gitmesin)
    const form = btn ? btn.closest('form') : profileForm;
    if (form) {
      const hiddenInput = form.querySelector(`input[name="${field}"]`);
      if (hiddenInput) hiddenInput.value = '';
    }
    // Başarı bildirimi
    const successMsg = document.createElement('span');
    successMsg.textContent = ' ✓ Silindi';
    successMsg.style.cssText = 'color:#4ade80; font-size:0.82em; margin-left:8px;';
    if (btn && btn.parentNode) {
      btn.parentNode.insertBefore(successMsg, btn.nextSibling);
      setTimeout(() => successMsg.remove(), 3000);
    }
  } catch (error) {
    alert('Hata: ' + error.message);
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = oldText; }
  }
};

// Geriye dönük uyumluluk: profil fotoğrafı sil butonu eski onclick'i desteklemek için
const deleteProfilePhoto = () => deleteFile('profile', null, 'profile_photo', 'preview-profile_photo', 'delete-profile-photo-btn');


// BLOG FONKSİYONLARI (AŞAMA 2)
const loadBlogs = async () => {
  const container = document.getElementById('blogs-list');
  if (!container) return;
  container.innerHTML = '<div style="color: #94a3b8; font-size: 0.9em; text-align: center; padding: 20px;">Yükleniyor...</div>';
  try {
    const res = await fetch('/api/admin/blog');
    const blogs = await res.json();
    if (blogs.length === 0) {
      container.innerHTML = '<div style="color: #94a3b8; font-size: 0.9em; text-align: center; padding: 20px;">Henüz blog yazısı yok.</div>';
      return;
    }
    container.innerHTML = '';
    blogs.forEach(blog => {
      const card = document.createElement('div');
      card.className = 'blog-admin-card';
      
      const titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-weight: bold; font-size: 1.1em; color: #fff; display: flex; align-items: center; gap: 10px;';
      
      const textSpan = document.createElement('span');
      textSpan.textContent = blog.title;
      titleEl.appendChild(textSpan);
      
      const badgeColor = blog.status === 'published' ? '#10b981' : '#f59e0b';
      const badgeText = blog.status === 'published' ? 'Yayında' : 'Taslak';
      const statusBadge = document.createElement('span');
      statusBadge.style.cssText = `background: ${badgeColor}20; color: ${badgeColor}; padding: 3px 8px; border-radius: 4px; font-size: 0.75em; white-space: nowrap;`;
      statusBadge.textContent = badgeText;
      titleEl.appendChild(statusBadge);

      const dateStr = blog.published_at ? new Date(blog.published_at).toLocaleString('tr-TR') : 'Yayınlanmadı';
      
      const actionsEl = document.createElement('div');
      actionsEl.style.cssText = 'display: flex; gap: 8px; margin-top: 5px; flex-wrap: wrap;';
      
      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn secondary';
      btnEdit.style.padding = '4px 10px';
      btnEdit.style.fontSize = '0.85em';
      btnEdit.textContent = 'Düzenle';
      btnEdit.onclick = () => window.editBlog(blog);
      
      const btnToggle = document.createElement('button');
      btnToggle.className = 'btn';
      btnToggle.style.padding = '4px 10px';
      btnToggle.style.fontSize = '0.85em';
      btnToggle.style.background = blog.status === 'published' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)';
      btnToggle.style.color = blog.status === 'published' ? '#f59e0b' : '#10b981';
      btnToggle.style.border = `1px solid ${btnToggle.style.color}`;
      btnToggle.textContent = blog.status === 'published' ? 'Yayından Kaldır' : 'Yayınla';
      btnToggle.onclick = () => window.toggleBlogStatus(blog.id, blog.status);
      
      const btnPreview = document.createElement('a');
      btnPreview.className = 'btn';
      btnPreview.style.cssText = 'padding: 4px 10px; font-size: 0.85em; background: rgba(0, 195, 255, 0.1); color: #00c3ff; border: 1px solid #00c3ff; text-decoration: none; border-radius: 4px; text-align: center; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;';
      btnPreview.href = `/admin/blog/${blog.id}/preview`;
      btnPreview.target = '_blank';
      btnPreview.setAttribute('rel', 'noopener noreferrer');
      btnPreview.textContent = 'Önizle';
      
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn danger';
      btnDelete.style.padding = '4px 10px';
      btnDelete.style.fontSize = '0.85em';
      btnDelete.textContent = 'Sil';
      btnDelete.onclick = () => window.deleteBlog(blog.id);

      actionsEl.appendChild(btnEdit);
      actionsEl.appendChild(btnPreview);
      actionsEl.appendChild(btnToggle);
      actionsEl.appendChild(btnDelete);

      card.appendChild(titleEl);
      const infoEl = document.createElement('div');
      infoEl.style.cssText = 'font-size: 0.85em; color: #94a3b8; line-height: 1.4;';
      infoEl.innerHTML = `<div><strong>Slug:</strong> ${blog.slug}</div><div><strong>Oluşturulma:</strong> ${new Date(blog.created_at).toLocaleString('tr-TR')}</div><div><strong>Yayınlanma:</strong> ${dateStr}</div><div><strong>Beğeni:</strong> <span style="color: #00c3ff;">♥ ${blog.like_count || 0}</span> &nbsp;&nbsp; <strong>Görüntülenme:</strong> <span style="color: #8b949e;">👁 ${blog.view_count || 0}</span></div>`;
      card.appendChild(infoEl);
      card.appendChild(actionsEl);

      container.appendChild(card);
    });
  } catch (error) {
    console.error('Bloglar yüklenirken hata:', error);
    container.innerHTML = '<div style="color: red; text-align: center; padding: 20px;">Hata oluştu.</div>';
  }
};

window.submitBlogForm = async (e) => {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Kaydediliyor...';
  
  try {
    let coverUrl = form.cover_image.value;
    const fileInput = form.cover_image_file;
    if (fileInput.files.length > 0) {
      coverUrl = await uploadFile(fileInput.files[0], 'blog');
    }
    
    const id = form.id.value;
    const payload = {
      title: form.title.value,
      summary: form.summary.value,
      content: form.content.value,
      tags: form.tags.value,
      status: form.status.value,
      cover_image: coverUrl
    };

    const url = id ? `/api/admin/blog/${id}` : '/api/admin/blog';
    const method = id ? 'PUT' : 'POST';

    const meta = document.querySelector('meta[name="csrf-token"]');
    const csrfToken = meta ? meta.getAttribute('content') : '';

    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Başarıyla kaydedildi.', 'success');
      resetBlogForm();
      loadBlogs(); 
    } else {
      showToast(data.error || 'Hata oluştu', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Sunucu hatası', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
};

window.editBlog = (blog) => {
  const form = document.getElementById('blogs-form');
  form.id.value = blog.id;
  form.title.value = blog.title;
  form.summary.value = blog.summary || '';
  form.content.value = blog.content;
  form.tags.value = blog.tags || '';
  form.status.value = blog.status;
  form.cover_image.value = blog.cover_image || '';
  
  updatePreview('preview-blogs-cover_image', blog.cover_image);
  
  document.getElementById('btn-blogs-cancel').style.display = 'block';
  document.getElementById('blogs').scrollIntoView({ behavior: 'smooth' });
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Güncelle';
};

window.resetBlogForm = () => {
  const form = document.getElementById('blogs-form');
  form.reset();
  form.id.value = '';
  form.cover_image.value = '';
  updatePreview('preview-blogs-cover_image', '');
  
  document.getElementById('btn-blogs-cancel').style.display = 'none';
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Kaydet';
};

window.deleteBlog = async (id) => {
  if (!confirm('Bu blog yazısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;

  const meta = document.querySelector('meta[name="csrf-token"]');
  const csrfToken = meta ? meta.getAttribute('content') : '';

  try {
    const res = await fetch(`/api/admin/blog/${id}`, {
      method: 'DELETE',
      headers: { 'X-CSRFToken': csrfToken }
    });
    const data = await res.json();
    
    if (res.ok) {
      showToast(data.message || 'Silindi', 'success');
      loadBlogs();
    } else {
      showToast(data.error || 'Silme işlemi başarısız', 'error');
    }
  } catch (err) {
    showToast('Sunucu hatası', 'error');
  }
};

window.toggleBlogStatus = async (id, currentStatus) => {
  const action = currentStatus === 'published' ? 'unpublish' : 'publish';
  const meta = document.querySelector('meta[name="csrf-token"]');
  const csrfToken = meta ? meta.getAttribute('content') : '';

  try {
    const res = await fetch(`/api/admin/blog/${id}/${action}`, {
      method: 'PATCH',
      headers: { 'X-CSRFToken': csrfToken }
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Durum güncellendi', 'success');
      loadBlogs();
      const form = document.getElementById('blogs-form');
      if (form && form.id.value == id) {
        form.status.value = currentStatus === 'published' ? 'draft' : 'published';
      }
    } else {
      showToast(data.error || 'İşlem başarısız', 'error');
    }
  } catch (err) {
    showToast('Sunucu hatası', 'error');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const blogForm = document.getElementById('blogs-form');
  if (blogForm) {
    blogForm.addEventListener('submit', window.submitBlogForm);
  }
});

const loadData = async () => {
  if (!profileForm) {
    console.warn('Profile form not found');
    return;
  }
  
  
  let profileData = null;
  try {
    const profile = await fetchJson(`${apiBase}/profile`);
    profileData = profile;
    Object.keys(profile).forEach((key) => {
      const input = profileForm.querySelector(`[name="${key}"]`);
      if (input && input.type !== 'file') {
        if (input.type === 'checkbox') input.checked = Boolean(profile[key]);
        else input.value = profile[key] ?? '';

      }
    });
    updatePreview('preview-profile_photo', profile.profile_photo);
    updatePreview('preview-cv_pdf', profile.cv_pdf);
  } catch (error) {
    console.error('Profil yüklenirken hata:', error);
  }

  const loadList = async (endpoint, container, entity, nameField = 'title') => {
    if (!container) return [];
    container.innerHTML = '<p style="color: #94a3b8; padding: 10px;">Yükleniyor...</p>';
    try {
      const items = await fetchJson(`${apiBase}/${endpoint}`);
      container.innerHTML = items.length === 0 ? '<p style="color: #94a3b8; padding: 10px;">Henüz kayıt yok.</p>' : '';
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
  
  await loadMessages();
  await loadBlogs();
};

const loadMessages = async () => {
  const container = document.getElementById('messages-list');
  if (!container) return;
  try {
    const messages = await fetchJson(`${apiBase}/messages`);
    container.innerHTML = messages.length === 0 ? '<p style="color:#94a3b8; padding:10px;">Henüz mesaj yok.</p>' : '';
    messages.forEach(msg => {
      const isReadStyle = msg.is_read ? 'opacity: 0.7;' : 'font-weight: bold; border-left: 4px solid var(--accent);';
      const readStatus = msg.is_read ? 'Okundu' : '<span style="color:#ef4444;">Okunmadı</span>';
      const card = document.createElement('div');
      card.className = 'list-item';
      card.style.cssText = `cursor: pointer; padding-left: 15px; ${isReadStyle}`;
      card.innerHTML = `
        <div style="flex: 1;" onclick="openMessage(${msg.id}, this)">
          <div style="font-size: 1.1em; color: var(--text-color); margin-bottom:4px;">${msg.subject}</div>
          <div style="font-size: 0.9em; color: #94a3b8;">${msg.name} (${msg.email})</div>
          <div style="font-size: 0.85em; color: #64748b; margin-top:5px;">${msg.created_at} &bull; ${readStatus}</div>
        </div>
        <div class="list-actions" style="margin-left:15px; align-self:center;">
          <button class="delete" onclick="deleteMessage(${msg.id}, event)">Sil</button>
        </div>
      `;
      // Store full data for modal
      card.dataset.msg = JSON.stringify(msg);
      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = `<p style="color:red;">Mesajlar yüklenemedi: ${error.message}</p>`;
  }
};

window.openMessage = async (id, element) => {
  const card = element.closest('.list-item');
  const msg = JSON.parse(card.dataset.msg);
  
  document.getElementById('msg-detail-subject').textContent = msg.subject;
  document.getElementById('msg-detail-name').textContent = msg.name;
  document.getElementById('msg-detail-email').textContent = msg.email;
  document.getElementById('msg-detail-date').textContent = msg.created_at;
  document.getElementById('msg-detail-body').textContent = msg.message;
  
  document.getElementById('message-detail-modal').style.display = 'block';
  
  if (!msg.is_read) {
    try {
      const meta = document.querySelector('meta[name="csrf-token"]');
      const csrfToken = meta ? meta.getAttribute('content') : '';
      await fetch(`${apiBase}/messages/${id}/read`, { method: 'PATCH', headers: { 'X-CSRFToken': csrfToken } });
      await loadMessages();
      await updateDashboardCounts();
    } catch (e) { console.error('Okundu isaretlenemedi', e); }
  }
};

window.deleteMessage = async (id, event) => {
  event.stopPropagation();
  if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;
  try {
    await fetchJson(`${apiBase}/messages/${id}`, { method: 'DELETE' });
    await loadMessages();
    await updateDashboardCounts();
  } catch (e) {
    alert('Mesaj silinemedi: ' + e.message);
  }
};

const submitForm = async (form, endpoint, idField = 'id') => {
  const btn = form.querySelector('button[type="submit"]');
  const oldText = btn ? btn.textContent : 'Kaydet';
  if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; btn.textContent = 'Kaydediliyor...'; }
  try {
    const fileInputs = form.querySelectorAll('input[type="file"]');
    for (const fileInput of fileInputs) {
    if (fileInput.files.length > 0) {
      try {
        const url = await uploadFile(fileInput.files[0], endpoint);
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
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = oldText; }
  }
};

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const btn = profileForm.querySelector('button[type="submit"]');
  const oldText = btn ? btn.textContent : 'Kaydet';
  if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; btn.textContent = 'Kaydediliyor...'; }
  try {
    const fileInputs = profileForm.querySelectorAll('input[type="file"]');
    for (const fileInput of fileInputs) {
      if (fileInput.files.length > 0) {
        // Upload type logic: if it's cv_pdf_file, we could still use 'profile' or 'cv'
        const type = fileInput.name === 'cv_pdf_file' ? 'cv' : 'profile';
        const url = await uploadFile(fileInput.files[0], type);
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
    updatePreview('preview-cv_pdf', payload.cv_pdf);
  } catch (error) {
    alert('Hata: ' + error.message);
    console.error(error);
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = oldText; }
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

// ── Dashboard Güncelleme ───────────────────────────────────────
const updateDashboardCounts = async () => {
  try {
    // Tüm endpoint'lerden sayı ve son kayıt çek
    const endpoints = [
      { key: 'projects',     path: 'projects',     label: 'Proje',      nameField: 'title'  },
      { key: 'education',    path: 'education',     label: 'Eğitim',     nameField: 'school' },
      { key: 'experiences',  path: 'experiences',   label: 'Deneyim',    nameField: 'company'},
      { key: 'skills',       path: 'skills',        label: 'Yetenek',    nameField: 'name'   },
      { key: 'certificates', path: 'certificates',  label: 'Sertifika',  nameField: 'name'   },
      { key: 'courses',      path: 'courses',       label: 'Kurs',       nameField: 'title'  },
      { key: 'languages',    path: 'languages',     label: 'Dil',        nameField: 'name'   },
    ];

    const results = await Promise.all(
      endpoints.map(async (ep) => {
        try {
          const items = await fetchJson(`${apiBase}/${ep.path}`);
          return { ...ep, items, count: items.length };
        } catch (e) {
          return { ...ep, items: [], count: 0 };
        }
      })
    );

    // Stat kartları güncelle
    results.forEach(({ key, count }) => {
      document.querySelectorAll(`.db-count[data-key="${key}"]`).forEach(el => {
        el.textContent = count;
      });
      // Eski dashboard-card uyumluluğu
      const oldEl = document.querySelector(`.card-count[data-table="${key}"]`);
      if (oldEl) oldEl.textContent = count;
    });

    // Mesaj sayıları
    try {
      const msgCounts = await fetchJson(`${apiBase}/messages/counts`);
      document.querySelectorAll('.db-count[data-key="messages"]').forEach(el => el.textContent = msgCounts.total);
      
      const dashboardBadge = document.getElementById('dashboard-unread-badge');
      const navBadge = document.getElementById('nav-unread-badge');
      if (msgCounts.unread > 0) {
        if (dashboardBadge) { dashboardBadge.style.display = 'inline-block'; dashboardBadge.textContent = msgCounts.unread; }
        if (navBadge) { navBadge.style.display = 'inline-block'; navBadge.textContent = msgCounts.unread; }
      } else {
        if (dashboardBadge) dashboardBadge.style.display = 'none';
        if (navBadge) navBadge.style.display = 'none';
      }
    } catch (e) { console.error(e); }

    // Portföy Durumu güncelle
    document.querySelectorAll('.db-count-status[data-key]').forEach(el => {
      const key = el.dataset.key;
      const found = results.find(r => r.key === key);
      if (found) {
        el.textContent = found.count > 0 ? `${found.count} kayıt` : 'Henüz yok';
        el.style.color = found.count > 0 ? '#4ade80' : '#94a3b8';
      }
    });

    // Profil durumu
    const profileCheck = document.querySelector('.db-status-check');
    if (profileCheck) {
      try {
        const profile = await fetchJson(`${apiBase}/profile`);
        const filled = profile && profile.name && profile.email;
        profileCheck.textContent = filled ? '✓ Dolu' : 'Eksik';
        profileCheck.style.color = filled ? '#4ade80' : '#f87171';
      } catch {
        profileCheck.textContent = '?';
      }
    }

    // Son Eklenenler
    const recentContainer = document.getElementById('db-recent-list');
    if (recentContainer) {
      const recentItems = [];
      results.forEach(({ label, nameField, items }) => {
        if (items.length > 0) {
          const last = items.reduce((a, b) => (a.id > b.id ? a : b));
          recentItems.push({ label, name: last[nameField] || 'İsimsiz', id: last.id });
        }
      });

      recentItems.sort((a, b) => b.id - a.id);
      const top = recentItems.slice(0, 5);

      if (top.length === 0) {
        recentContainer.innerHTML = '<div class="db-recent-empty">Henüz hiç kayıt eklenmemiş.</div>';
      } else {
        recentContainer.innerHTML = top.map(item => `
          <div class="db-recent-item">
            <span class="db-recent-badge">${item.label}</span>
            <span class="db-recent-name">${item.name}</span>
          </div>
        `).join('');
      }
    }

  } catch (error) {
    console.error('Dashboard güncellenirken hata:', error);
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
      window.location.href = '/admin/login';
    } catch (e) {
      console.error('Çıkış yapılamadı', e);
    }
  });
}

// ── Analytics ──────────────────────────────────────────────────

const loadAnalyticsSummary = async () => {
  try {
    const data = await fetchJson(`${apiBase}/analytics/summary`);
    const dashToday = document.getElementById('dash-today-views');
    const dashWeek = document.getElementById('dash-week-views');
    if (dashToday) dashToday.textContent = data.today_views;
    if (dashWeek) dashWeek.textContent = data.week_views;

    const elTodayV = document.getElementById('an-today-views');
    const elTodayU = document.getElementById('an-today-unique');
    const elWeekV = document.getElementById('an-week-views');
    const elMonthV = document.getElementById('an-month-views');
    const elTotalV = document.getElementById('an-total-views');

    if (elTodayV) elTodayV.textContent = data.today_views;
    if (elTodayU) elTodayU.textContent = data.today_unique;
    if (elWeekV) elWeekV.textContent = data.week_views;
    if (elMonthV) elMonthV.textContent = data.month_views;
    if (elTotalV) elTotalV.textContent = data.total_views;
  } catch (e) {
    console.error('Analytics summary yüklenemedi:', e);
  }
};

window.loadDailyStats = async (days) => {
  const btn7 = document.getElementById('an-btn-7');
  const btn30 = document.getElementById('an-btn-30');
  
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

  const tbody = document.getElementById('an-daily-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:12px; color:#64748b;">Yükleniyor...</td></tr>';

  try {
    const data = await fetchJson(`${apiBase}/analytics/daily?days=${days}`);
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

const renderBars = (containerId, dataArray) => {
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

const loadAnalyticsBreakdown = async () => {
  try {
    const data = await fetchJson(`${apiBase}/analytics/breakdown`);
    renderBars('an-device-bars', data.device);
    renderBars('an-browser-bars', data.browser);
    renderBars('an-os-bars', data.os);
    renderBars('an-referrer-bars', data.referrer);
  } catch (e) {
    console.error('Breakdown yüklenemedi:', e);
  }
};

const loadRecentVisits = async () => {
  const tbody = document.getElementById('an-recent-body');
  if (!tbody) return;
  try {
    const data = await fetchJson(`${apiBase}/analytics/recent?limit=20`);
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

window.pruneAnalytics = async () => {
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
    const res = await fetch(`${apiBase}/analytics/prune?days=${days}`, {
      method: 'DELETE',
      headers: { 'X-CSRFToken': csrfToken }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Silme işlemi başarısız');
    
    resEl.style.display = 'block';
    resEl.style.color = '#4ade80';
    resEl.textContent = `✓ ${result.deleted} adet eski kayıt silindi.`;
    
    loadAnalyticsSummary();
    loadDailyStats(7);
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
  const tbody = document.getElementById('likes-body');
  if (!tbody) return;
  try {
    const data = await fetchJson(`${apiBase}/portfolio-likes`);
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:15px; color:#64748b;">Henüz beğeni yok.</td></tr>';
      return;
    }
    const fmt = (iso) => {
      const d = new Date(iso + 'Z');
      return isNaN(d) ? iso : d.toLocaleString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    };
    const escapeHtml = (unsafe) => (unsafe || '').toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    
    tbody.innerHTML = data.map(r => `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
        <td style="padding:8px; display:flex; align-items:center; gap:10px;">
          <img src="${escapeHtml(r.profile_pic)}" alt="avatar" style="width:32px; height:32px; border-radius:50%; object-fit:cover; background:#1e293b;">
          <span>${escapeHtml(r.name)}</span>
        </td>
        <td style="padding:8px;">${escapeHtml(r.email)}</td>
        <td style="padding:8px;">${fmt(r.liked_at)}</td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:15px; color:#f87171;">Hata oluştu.</td></tr>';
  }
};

initAdmin();


// Removed custom blog methods because they are handled globally now

// ==================================================
// YORUM YÖNETİMİ (AŞAMA 4)
// ==================================================

const loadAdminComments = async () => {
  try {
    const res = await fetch('/api/admin/blog/comments');
    if (res.ok) {
      const comments = await res.json();
      const listEl = document.getElementById('admin-comments-list');
      if (!listEl) return;
      listEl.innerHTML = '';

      if (comments.length === 0) {
        listEl.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">Henüz yorum bulunmuyor.</div>';
        return;
      }

      comments.forEach(c => {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 15px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; margin-bottom: 15px; display: flex; flex-direction: column; gap: 10px;';

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
        
        const info = document.createElement('div');
        info.innerHTML = `<strong style="color: #fff;">${c.display_name}</strong> - <span style="color: #94a3b8; font-size: 0.9em;">Blog: ${c.blog_title}</span>`;
        
        const statusBadge = document.createElement('span');
        statusBadge.className = 'badge';
        if (c.status === 'published') {
          statusBadge.style.cssText = 'background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 4px 8px; font-size: 0.8rem;';
          statusBadge.textContent = 'Yayında';
        } else {
          statusBadge.style.cssText = 'background: rgba(245, 158, 11, 0.1); color: #f59e0b; padding: 4px 8px; font-size: 0.8rem;';
          statusBadge.textContent = 'Gizli';
        }
        
        header.appendChild(info);
        header.appendChild(statusBadge);

        const content = document.createElement('div');
        content.style.cssText = 'color: #cbd5e1; font-size: 0.95rem; white-space: pre-wrap; word-break: break-word; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;';
        content.textContent = c.content;

        const actions = document.createElement('div');
        actions.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 5px;';
        
        if (c.status === 'published') {
          const hideBtn = document.createElement('button');
          hideBtn.className = 'badge secondary';
          hideBtn.style.cursor = 'pointer';
          hideBtn.textContent = 'Gizle';
          hideBtn.onclick = () => updateCommentStatus(c.id, 'hide');
          actions.appendChild(hideBtn);
        } else {
          const pubBtn = document.createElement('button');
          pubBtn.className = 'badge primary';
          pubBtn.style.cursor = 'pointer';
          pubBtn.textContent = 'Yayınla';
          pubBtn.onclick = () => updateCommentStatus(c.id, 'publish');
          actions.appendChild(pubBtn);
        }

        const delBtn = document.createElement('button');
        delBtn.className = 'badge';
        delBtn.style.cssText = 'background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); cursor: pointer;';
        delBtn.textContent = 'Sil';
        delBtn.onclick = () => deleteComment(c.id);
        actions.appendChild(delBtn);

        item.appendChild(header);
        item.appendChild(content);
        item.appendChild(actions);
        listEl.appendChild(item);
      });
    }
  } catch (e) {
    console.error('Yorumları yüklerken hata:', e);
  }
};

const updateCommentStatus = async (id, action) => {
  if (!confirm(`Yorum durumunu ${action === 'hide' ? 'gizli' : 'yayında'} olarak değiştirmek istediğinize emin misiniz?`)) return;
  try {
    const res = await fetch(`/api/admin/blog/comments/${id}/${action}`, { method: 'PATCH' });
    if (res.ok) {
      showToast('Yorum durumu güncellendi', 'success');
      loadAdminComments();
    } else {
      showToast('İşlem başarısız', 'error');
    }
  } catch (e) {
    showToast('Bağlantı hatası', 'error');
  }
};

const deleteComment = async (id) => {
  if (!confirm('Bu yorumu kalıcı olarak silmek istediğinize emin misiniz?')) return;
  try {
    const res = await fetch(`/api/admin/blog/comments/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Yorum silindi', 'success');
      loadAdminComments();
    } else {
      showToast('Silme başarısız', 'error');
    }
  } catch (e) {
    showToast('Bağlantı hatası', 'error');
  }
};

// Add loadAdminComments to the tabs activation
const originalActivateTabComments = activateTab;
activateTab = (target) => {
  originalActivateTabComments(target);
  if (target === 'comments') {
    loadAdminComments();
  }
};
