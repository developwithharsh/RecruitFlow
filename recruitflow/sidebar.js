/**
 * sidebar.js — RecruitFlow sidebar controller
 * Loaded as a second content script (plain IIFE, no ES imports).
 * All Chrome storage accessed directly; AI calls go through background.js.
 */
(function () {
  'use strict';

  // ── Storage helpers ──────────────────────────────────────────────────────
  async function storageGet(key) {
    return new Promise(resolve => chrome.storage.local.get(key, d => resolve(d[key])));
  }
  async function storageSet(obj) {
    return new Promise(resolve => chrome.storage.local.set(obj, resolve));
  }

  // ── Profile reading (direct DOM — sidebar.js is a content script) ─────────
  function _getFirst(selectors) {
    for (const s of selectors) {
      try { const el = document.querySelector(s); if (el?.innerText?.trim()) return el.innerText.trim(); } catch (_) {}
    }
    return '';
  }

  function _getCompany() {
    try {
      const exp = document.querySelector('#experience');
      if (!exp) return '';
      const sec = exp.closest('section') || exp.parentElement;
      const el  = sec?.querySelector('.t-14.t-normal.t-black--light')
               || sec?.querySelector('.hoverable-link-text.t-bold')
               || sec?.querySelector('.t-bold.inline');
      return el ? el.innerText.trim() : '';
    } catch (_) { return ''; }
  }

  function readProfileFromDOM() {
    return {
      name:       _getFirst(['h1.text-heading-xlarge','h1.inline.t-24','.pv-text-details__left-panel h1','h1']),
      role:       _getFirst(['.text-body-medium.break-words','.pv-text-details__left-panel .text-body-medium','[data-field="headline"]']),
      company:    _getCompany(),
      location:   _getFirst(['.text-body-small.inline.t-black--light','.pv-text-details__left-panel .text-body-small']),
      profileUrl: window.location.href
    };
  }

  // ── LinkedIn message send (direct DOM — no background hop needed) ──────────
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function sendLinkedInMessage(text) {
    const msgBtn =
      document.querySelector('button[aria-label*="Message"]') ||
      document.querySelector('.pvs-profile-actions__action') ||
      Array.from(document.querySelectorAll('button')).find(b => b.innerText?.trim() === 'Message');

    if (!msgBtn) throw new Error('Message button not found on this profile.');
    msgBtn.click();
    await sleep(1400);

    const composer =
      document.querySelector('.msg-form__contenteditable') ||
      document.querySelector('[contenteditable="true"][aria-label]') ||
      document.querySelector('[contenteditable="true"]');

    if (!composer) throw new Error('Composer did not open. Try clicking Message manually.');
    composer.focus();
    document.execCommand('insertText', false, text);
    await sleep(400);

    const sendBtn =
      document.querySelector('.msg-form__send-button') ||
      Array.from(document.querySelectorAll('button')).find(b =>
        b.getAttribute('aria-label')?.toLowerCase().includes('send') ||
        b.classList.contains('msg-form__send-button'));

    if (sendBtn) sendBtn.click();
    return true;
  }

  // ── Template engine (inline) ─────────────────────────────────────────────
  const DEFAULT_TEMPLATES = [
    { id: 'default_1', name: 'Initial Outreach', body: 'Hi {name},\n\nI came across your profile and was impressed by your experience as {role} at {company}.\n\nI\'m currently hiring for a {jd_title} role that I think could be a great fit.\n\nWould you be open to a quick 10-minute call this week?\n\nBest regards,\n{recruiter_name}\n{recruiter_company}' },
    { id: 'default_2', name: 'Brief & Direct',   body: 'Hi {name}, exciting {jd_title} opportunity that matches your {role} background at {company}. Interested? — {recruiter_name}' },
    { id: 'default_3', name: 'Referral Style',   body: 'Hi {name},\n\nA colleague mentioned your profile for a {jd_title} role. Given your experience at {company}, I thought you might be a great fit.\n\nOpen to a brief conversation?\n\n{recruiter_name}, {recruiter_company}' }
  ];

  async function getTemplates() {
    const saved = await storageGet('recruitflow_templates');
    if (!saved || !saved.length) {
      await storageSet({ recruitflow_templates: DEFAULT_TEMPLATES });
      return DEFAULT_TEMPLATES;
    }
    return saved;
  }

  function fillTemplate(body, profile, jdTitle, settings) {
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const firstName = ((profile && profile.name) || '').split(' ')[0];
    return (body || '')
      .replace(/\{name\}/g,             firstName)
      .replace(/\{full_name\}/g,        (profile && profile.name) || '')
      .replace(/\{role\}/g,             (profile && profile.role) || '')
      .replace(/\{company\}/g,          (profile && profile.company) || '')
      .replace(/\{location\}/g,         (profile && profile.location) || '')
      .replace(/\{jd_title\}/g,         jdTitle || '')
      .replace(/\{recruiter_name\}/g,   (settings && (settings.recruiter_name || settings.recruiterName)) || '')
      .replace(/\{recruiter_company\}/g,(settings && (settings.recruiter_company || settings.recruiterCompany)) || '')
      .replace(/\{today\}/g,            today);
  }

  // ── JD helpers ───────────────────────────────────────────────────────────
  function detectRoleCategory(text) {
    const t = (text || '').toLowerCase();
    if (/react|node|python|java|developer|engineer|devops|frontend|backend|fullstack|aws|cloud/.test(t)) return 'tech';
    if (/sales|revenue|business development|account executive|quota|target/.test(t)) return 'sales';
    if (/hr|human resource|talent|recruiter|people ops|culture/.test(t)) return 'hr';
    if (/finance|accounting|cpa|audit|tax|controller|cfo/.test(t)) return 'finance';
    return 'other';
  }

  async function getAllJDs() { return (await storageGet('recruitflow_jds')) || []; }
  async function getActiveJD() {
    const [jds, activeId] = await Promise.all([getAllJDs(), storageGet('recruitflow_active_jd')]);
    return jds.find(j => j.id === activeId) || jds[0] || null;
  }
  async function setActiveJD(id) { await storageSet({ recruitflow_active_jd: id }); }

  async function saveJD(title, text) {
    const jds = await getAllJDs();
    const jd = { id: 'jd_' + Date.now(), title, text, roleCategory: detectRoleCategory(text), createdAt: new Date().toISOString() };
    jds.unshift(jd);
    await storageSet({ recruitflow_jds: jds, recruitflow_active_jd: jd.id });
    return jd;
  }

  // ── Tracker helpers ──────────────────────────────────────────────────────
  async function getAllEntries() {
    const entries = (await storageGet('recruitflow_tracker')) || [];
    return entries.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  }

  async function addEntry(data) {
    const entries = (await storageGet('recruitflow_tracker')) || [];
    const entry = { id: 'msg_' + Date.now(), ...data, status: 'Sent', notes: '' };
    entries.unshift(entry);
    await storageSet({ recruitflow_tracker: entries });
    return entry;
  }

  async function updateEntryStatus(id, status) {
    const entries = (await storageGet('recruitflow_tracker')) || [];
    const idx = entries.findIndex(e => e.id === id);
    if (idx >= 0) { entries[idx].status = status; await storageSet({ recruitflow_tracker: entries }); }
  }

  async function deleteEntry(id) {
    const entries = ((await storageGet('recruitflow_tracker')) || []).filter(e => e.id !== id);
    await storageSet({ recruitflow_tracker: entries });
  }

  async function exportCSV() {
    const entries = await getAllEntries();
    const hdr = ['Name','Role','Company','LinkedIn URL','JD Title','Message','Sent At','Status','Notes'];
    const rows = entries.map(e => [
      e.candidateName, e.candidateRole, e.candidateCompany, e.candidateUrl,
      e.jdTitle, e.messageSent, e.sentAt, e.status, e.notes
    ].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','));
    return [hdr.join(','), ...rows].join('\n');
  }

  // ── Limit guard helpers ──────────────────────────────────────────────────
  async function getUsage() {
    return (await storageGet('recruitflow_usage')) || {
      ai_uses_total: 0, daily_messages_sent: 0, daily_limit: 50,
      last_reset_date: new Date().toDateString(), is_pro: false
    };
  }

  async function checkAndResetDay() {
    const usage = await getUsage();
    if (usage.last_reset_date !== new Date().toDateString()) {
      usage.daily_messages_sent = 0;
      usage.last_reset_date = new Date().toDateString();
      await storageSet({ recruitflow_usage: usage });
    }
    return usage;
  }

  async function getLimitStatus() {
    const usage = await checkAndResetDay();
    const count = usage.daily_messages_sent || 0;
    const limit = usage.daily_limit || 50;
    const pct   = Math.round((count / limit) * 100);
    return { count, limit, pct, level: pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'safe' };
  }

  async function incrementDailyCount() {
    const usage = await checkAndResetDay();
    usage.daily_messages_sent = (usage.daily_messages_sent || 0) + 1;
    await storageSet({ recruitflow_usage: usage });
  }

  async function canUseAI() {
    const usage = await getUsage();
    return usage.is_pro || (usage.ai_uses_total || 0) < 3;
  }

  async function getAIUsesLeft() {
    const usage = await getUsage();
    return usage.is_pro ? '∞' : Math.max(0, 3 - (usage.ai_uses_total || 0));
  }

  // ── Sidebar state ────────────────────────────────────────────────────────
  let currentProfile = null;
  let currentTone    = 'Professional';

  function getSidebarProfile() { return currentProfile; }

  // ── Toast ────────────────────────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    const box = document.getElementById('rf-toast-container');
    if (!box) return;
    const t = document.createElement('div');
    t.className = `rf-toast rf-toast-${type}`;
    t.innerHTML = `<span>${{success:'✓',error:'✕',warning:'⚠'}[type]||'•'}</span><span>${msg}</span>`;
    box.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // ── Upgrade modal ────────────────────────────────────────────────────────
  function showUpgradeOverlay() {
    const el = document.getElementById('rf-upgrade-overlay');
    if (el) el.classList.add('visible');
  }

  // ── AI badge refresh ─────────────────────────────────────────────────────
  async function refreshAIBadge() {
    const left = await getAIUsesLeft();
    document.querySelectorAll('.rf-ai-uses-badge').forEach(b => {
      b.textContent = `${left} left`;
      b.style.background = (left === 0 ? 'rgba(220,38,38,0.3)' : 'rgba(255,255,255,0.25)');
    });
  }

  // ── Limit bar refresh ────────────────────────────────────────────────────
  async function refreshLimitBar() {
    const s = await getLimitStatus();
    const lbl  = document.getElementById('rf-limit-count');
    const max  = document.getElementById('rf-limit-max');
    const fill = document.getElementById('rf-limit-bar-fill');
    if (lbl)  lbl.textContent  = s.count;
    if (max)  max.textContent  = s.limit;
    if (fill) {
      fill.style.width = Math.min(100, s.pct) + '%';
      fill.className   = 'rf-limit-bar-fill' + (s.level === 'danger' ? ' danger' : s.level === 'warning' ? ' warning' : '');
    }
  }

  // ── Profile banner ───────────────────────────────────────────────────────
  function updateProfileBanner(profile) {
    if (!profile) return;
    currentProfile = profile;
    const firstName = (profile.name || '').split(' ')[0];
    const nameEl   = document.getElementById('rf-banner-name');
    const roleEl   = document.getElementById('rf-banner-role');
    const locEl    = document.getElementById('rf-banner-location');
    const hdrEl    = document.getElementById('rf-header-name');
    if (nameEl) nameEl.textContent = profile.name || 'Unknown';
    if (roleEl) roleEl.textContent = profile.role
      ? `${profile.role}${profile.company ? ' @ ' + profile.company : ''}` : '—';
    if (locEl)  locEl.textContent  = profile.location || '';
    if (hdrEl)  hdrEl.textContent  = firstName || '';
  }

  // ── Template / JD selects ────────────────────────────────────────────────
  async function refreshTemplateSelect() {
    const sel = document.getElementById('rf-template-select');
    if (!sel) return;
    const tmpls = await getTemplates();
    sel.innerHTML = tmpls.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    fillAndPreview();
  }

  async function refreshJDSelect() {
    const sel = document.getElementById('rf-jd-select');
    if (!sel) return;
    const [jds, active] = await Promise.all([getAllJDs(), getActiveJD()]);
    sel.innerHTML = `<option value="">— No JD selected —</option>` +
      jds.map(j => `<option value="${j.id}" ${active && active.id === j.id ? 'selected' : ''}>${j.title}</option>`).join('');

    const titleEl = document.getElementById('rf-jd-title');
    const textEl  = document.getElementById('rf-jd-text');
    if (active) {
      if (titleEl) titleEl.value = active.title;
      if (textEl)  textEl.value  = active.text;
      const cont = document.getElementById('recruitflow-sidebar-container');
      if (cont) cont.setAttribute('data-role', active.roleCategory || 'tech');
    }
  }

  async function fillAndPreview() {
    const sel     = document.getElementById('rf-template-select');
    const preview = document.getElementById('rf-message-preview');
    if (!sel || !preview) return;
    const tmpls = await getTemplates();
    const tpl   = tmpls.find(t => t.id === sel.value) || tmpls[0];
    if (!tpl) return;
    const [settings, activeJD] = await Promise.all([
      storageGet('recruitflow_settings'),
      getActiveJD()
    ]);
    preview.value = fillTemplate(tpl.body, currentProfile || {}, activeJD?.title || '', settings || {});
  }

  // ── Tracker render ───────────────────────────────────────────────────────
  async function refreshTrackerStats() {
    const entries = await getAllEntries();
    const statEl  = id => document.getElementById(id);
    if (statEl('rf-stat-total'))   statEl('rf-stat-total').textContent   = entries.length;
    if (statEl('rf-stat-replied')) statEl('rf-stat-replied').textContent = entries.filter(e => e.status === 'Replied').length;
    if (statEl('rf-stat-hired'))   statEl('rf-stat-hired').textContent   = entries.filter(e => e.status === 'Hired').length;
  }

  async function renderTrackerList(search = '', filter = '') {
    const list = document.getElementById('rf-tracker-list');
    if (!list) return;
    let entries = await getAllEntries();
    if (filter) entries = entries.filter(e => e.status === filter);
    if (search) {
      const q = search.toLowerCase();
      entries = entries.filter(e =>
        (e.candidateName || '').toLowerCase().includes(q) ||
        (e.candidateCompany || '').toLowerCase().includes(q) ||
        (e.candidateRole || '').toLowerCase().includes(q)
      );
    }
    if (!entries.length) {
      list.innerHTML = `<div class="rf-empty-state">
        <span class="rf-empty-state-icon">📭</span>
        <div class="rf-empty-state-title">No messages logged yet</div>
        <div class="rf-empty-state-sub">Messages you send will appear here.</div></div>`;
      return;
    }
    list.innerHTML = entries.map(e => {
      const d = e.sentAt ? new Date(e.sentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
      return `<div class="rf-tracker-row" data-id="${e.id}">
        <div class="rf-tracker-info">
          <span class="rf-tracker-name" data-url="${e.candidateUrl || ''}">${e.candidateName || 'Unknown'}</span>
          <div class="rf-tracker-meta">${[e.candidateRole, e.candidateCompany].filter(Boolean).join(' @ ')}${d ? ' · ' + d : ''}</div>
        </div>
        <div class="rf-tracker-actions">
          <select class="rf-tracker-status-select" data-id="${e.id}">
            ${['Sent','Replied','Not Interested','Hired'].map(s =>
              `<option ${e.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <button class="rf-icon-btn rf-del-btn" data-id="${e.id}" title="Delete">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('.rf-tracker-name').forEach(el =>
      el.addEventListener('click', () => { if (el.dataset.url) window.open(el.dataset.url, '_blank'); }));

    list.querySelectorAll('.rf-tracker-status-select').forEach(sel =>
      sel.addEventListener('change', async () => {
        await updateEntryStatus(sel.dataset.id, sel.value);
        await refreshTrackerStats();
        showToast('Status updated', 'success');
      }));

    list.querySelectorAll('.rf-del-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this entry?')) return;
        await deleteEntry(btn.dataset.id);
        await Promise.all([
          renderTrackerList(
            document.getElementById('rf-tracker-search')?.value || '',
            document.getElementById('rf-tracker-filter')?.value || ''
          ),
          refreshTrackerStats()
        ]);
        showToast('Entry deleted', 'success');
      }));
  }

  // ── Settings template list ───────────────────────────────────────────────
  async function renderSettingsTemplateList() {
    const list = document.getElementById('rf-tpl-list-settings');
    if (!list) return;
    const tmpls = await getTemplates();
    if (!tmpls.length) { list.innerHTML = '<p style="font-size:12px;color:#64748B">No templates saved.</p>'; return; }
    list.innerHTML = tmpls.map(t => `
      <div class="rf-template-card" style="cursor:default">
        <div class="rf-template-card-header">
          <span class="rf-template-card-name">${t.name}</span>
          ${!t.id.startsWith('default_') ? `<button class="rf-icon-btn" data-del-tpl="${t.id}">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>` : ''}
        </div>
        <div class="rf-template-card-preview">${t.body.substring(0, 75)}…</div>
      </div>`).join('');

    list.querySelectorAll('[data-del-tpl]').forEach(btn =>
      btn.addEventListener('click', async () => {
        const all = await storageGet('recruitflow_templates') || [];
        await storageSet({ recruitflow_templates: all.filter(t => t.id !== btn.dataset.delTpl) });
        await renderSettingsTemplateList();
        await refreshTemplateSelect();
        showToast('Template deleted', 'success');
      }));
  }

  // ── PDF extraction ───────────────────────────────────────────────────────
  async function extractPDF(file) {
    if (typeof pdfjsLib === 'undefined') {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(it => it.str).join(' ') + '\n';
    }
    return text.replace(/\s+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  }

  // ── Event wiring ─────────────────────────────────────────────────────────
  function wireJDTab() {
    // JD select
    document.getElementById('rf-jd-select')?.addEventListener('change', async e => {
      const id = e.target.value;
      if (!id) return;
      await setActiveJD(id);
      const jds = await getAllJDs();
      const jd  = jds.find(j => j.id === id);
      if (jd) {
        document.getElementById('rf-jd-title').value = jd.title;
        document.getElementById('rf-jd-text').value  = jd.text;
        document.getElementById('rf-optimized-section').style.display = 'none';
        document.getElementById('recruitflow-sidebar-container')
          ?.setAttribute('data-role', jd.roleCategory || 'tech');
      }
    });

    // New JD
    document.getElementById('rf-jd-new-btn')?.addEventListener('click', () => {
      document.getElementById('rf-jd-title').value = '';
      document.getElementById('rf-jd-text').value  = '';
      document.getElementById('rf-jd-select').value = '';
      document.getElementById('rf-optimized-section').style.display = 'none';
      document.getElementById('rf-jd-title').focus();
    });

    // Save JD
    document.getElementById('rf-jd-save-btn')?.addEventListener('click', async () => {
      const title = document.getElementById('rf-jd-title')?.value.trim();
      const text  = document.getElementById('rf-jd-text')?.value.trim();
      if (!title || !text) { showToast('Enter a title and JD text', 'warning'); return; }
      const jd = await saveJD(title, text);
      await refreshJDSelect();
      document.getElementById('recruitflow-sidebar-container')?.setAttribute('data-role', jd.roleCategory);
      showToast('JD saved!', 'success');
    });

    // Optimize JD
    document.getElementById('rf-jd-optimize-btn')?.addEventListener('click', async () => {
      const text = document.getElementById('rf-jd-text')?.value.trim();
      if (!text) { showToast('Paste a JD first', 'warning'); return; }
      if (!await canUseAI()) { showUpgradeOverlay(); return; }
      const btn = document.getElementById('rf-jd-optimize-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="rf-spinner"></span> Optimizing…';
      try {
        const result = await chrome.runtime.sendMessage({ type: 'OPTIMIZE_JD', jdText: text });
        if (result.limitReached) { showUpgradeOverlay(); return; }
        if (!result.success) { showToast(result.error || 'AI unavailable', 'error'); return; }
        document.getElementById('rf-jd-original-preview').textContent  = text.substring(0, 500);
        document.getElementById('rf-jd-optimized-preview').textContent = result.optimized.substring(0, 500);
        document.getElementById('rf-optimized-section').style.display  = 'block';
        document.getElementById('rf-pending-optimized').value = result.optimized;
        await refreshAIBadge();
        showToast('JD optimized!', 'success');
      } catch (e) { showToast('AI unavailable. Try again.', 'error'); }
      finally {
        btn.disabled = false;
        btn.innerHTML = '✦ Optimize with AI <span class="rf-ai-uses-badge"></span>';
        await refreshAIBadge();
      }
    });

    document.getElementById('rf-jd-accept-btn')?.addEventListener('click', () => {
      const opt = document.getElementById('rf-pending-optimized')?.value;
      if (opt) document.getElementById('rf-jd-text').value = opt;
      document.getElementById('rf-optimized-section').style.display = 'none';
      showToast('Optimized JD applied!', 'success');
    });

    document.getElementById('rf-jd-reject-btn')?.addEventListener('click', () => {
      document.getElementById('rf-optimized-section').style.display = 'none';
    });

    // PDF upload
    document.getElementById('rf-pdf-upload-btn')?.addEventListener('click', () =>
      document.getElementById('rf-pdf-input')?.click());

    document.getElementById('rf-pdf-input')?.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      if (!await canUseAI()) { showUpgradeOverlay(); e.target.value = ''; return; }
      const statusEl = document.getElementById('rf-pdf-status');
      if (statusEl) statusEl.textContent = 'Extracting…';
      try {
        const text = await extractPDF(file);
        // Count PDF upload against free AI uses
        const usage = await getUsage();
        usage.ai_uses_total = (usage.ai_uses_total || 0) + 1;
        await storageSet({ recruitflow_usage: usage });
        await refreshAIBadge();
        document.getElementById('rf-jd-text').value = text;
        if (!document.getElementById('rf-jd-title').value)
          document.getElementById('rf-jd-title').value = file.name.replace('.pdf', '').replace(/_/g, ' ');
        if (statusEl) { statusEl.textContent = '✓ PDF loaded'; setTimeout(() => { statusEl.textContent = ''; }, 3000); }
        showToast('PDF extracted!', 'success');
      } catch (_) { showToast('Could not read PDF. Paste text manually.', 'error'); }
      e.target.value = '';
    });
  }

  function wireMessageTab() {
    // Tone buttons
    document.querySelectorAll('.rf-tone-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        document.querySelectorAll('.rf-tone-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTone = btn.dataset.tone;
      }));

    // Sub-tabs
    document.querySelectorAll('.rf-sub-tab-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        document.querySelectorAll('.rf-sub-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.rf-sub-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`rf-sub-${btn.dataset.sub}`)?.classList.add('active');
      }));

    // Template select
    document.getElementById('rf-template-select')?.addEventListener('change', fillAndPreview);

    // Re-read profile — read DOM directly (no background hop)
    document.getElementById('rf-reread-btn')?.addEventListener('click', () => {
      const profile = readProfileFromDOM();
      updateProfileBanner(profile);
      fillAndPreview();
      showToast('Profile refreshed', 'success');
    });

    // AI Generate
    document.getElementById('rf-ai-generate-btn')?.addEventListener('click', async () => {
      if (!currentProfile?.name) { showToast('Visit a LinkedIn profile first', 'error'); return; }
      if (!await canUseAI()) { showUpgradeOverlay(); return; }
      const jd = await getActiveJD();
      if (!jd) { showToast('Save a JD in the JD tab first', 'warning'); return; }
      const btn = document.getElementById('rf-ai-generate-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="rf-spinner"></span> Generating…';
      try {
        const result = await chrome.runtime.sendMessage({
          type: 'GENERATE_MESSAGE', profileData: currentProfile, jdText: jd.text, tone: currentTone
        });
        if (result.limitReached) { showUpgradeOverlay(); return; }
        if (!result.success) { showToast(result.error || 'AI unavailable', 'error'); return; }
        const wrap = document.getElementById('rf-ai-message-wrap');
        const ta   = document.getElementById('rf-ai-message-text');
        if (wrap) wrap.style.display = 'block';
        if (ta)   ta.value = result.message;
        await refreshAIBadge();
        showToast('Message generated!', 'success');
      } catch (_) { showToast('AI unavailable. Try again.', 'error'); }
      finally {
        btn.disabled = false;
        btn.innerHTML = '✦ Generate with AI <span class="rf-ai-uses-badge"></span>';
        await refreshAIBadge();
      }
    });

    // Send message — uses direct DOM manipulation (no background hop)
    document.getElementById('rf-send-btn')?.addEventListener('click', async () => {
      const activeSubTab = document.querySelector('.rf-sub-tab-btn.active')?.dataset.sub || 'template';
      const msgText = activeSubTab === 'ai'
        ? document.getElementById('rf-ai-message-text')?.value?.trim()
        : document.getElementById('rf-message-preview')?.value?.trim();

      if (!msgText) { showToast('Write or generate a message first', 'warning'); return; }

      // Enforce daily limit before sending
      const limitStatus = await getLimitStatus();
      if (limitStatus.level === 'danger') {
        showToast(`Daily limit of ${limitStatus.limit} messages reached. Resume tomorrow to protect your account.`, 'warning');
        return;
      }

      const btn = document.getElementById('rf-send-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="rf-spinner"></span> Sending…';

      try {
        await sendLinkedInMessage(msgText);
        const jd = await getActiveJD();
        await addEntry({
          candidateName: currentProfile?.name || '', candidateUrl: currentProfile?.profileUrl || window.location.href,
          candidateRole: currentProfile?.role || '', candidateCompany: currentProfile?.company || '',
          jdTitle: jd?.title || '', messageSent: msgText, sentAt: new Date().toISOString()
        });
        await incrementDailyCount();
        await refreshLimitBar();
        showToast(`Sent to ${currentProfile?.name || 'candidate'}!`, 'success');
        document.getElementById('rf-message-preview').value  = '';
        document.getElementById('rf-ai-message-text').value  = '';
        document.getElementById('rf-ai-message-wrap').style.display = 'none';
      } catch (e) { showToast(e.message || 'Could not send. Try manually.', 'error'); }
      finally {
        btn.disabled = false;
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg> Send Message`;
      }
    });
  }

  function wireTrackerTab() {
    document.getElementById('rf-tracker-search')?.addEventListener('input', e =>
      renderTrackerList(e.target.value, document.getElementById('rf-tracker-filter')?.value || ''));
    document.getElementById('rf-tracker-filter')?.addEventListener('change', e =>
      renderTrackerList(document.getElementById('rf-tracker-search')?.value || '', e.target.value));
    document.getElementById('rf-export-csv-btn')?.addEventListener('click', async () => {
      try {
        const csv  = await exportCSV();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `recruitflow-${new Date().toISOString().slice(0,10)}.csv`; a.click();
        URL.revokeObjectURL(url);
        showToast('CSV exported!', 'success');
      } catch (_) { showToast('Export failed', 'error'); }
    });
  }

  function wireSettingsTab() {
    document.getElementById('rf-settings-save-btn')?.addEventListener('click', async () => {
      const name    = document.getElementById('rf-settings-name')?.value.trim()    || '';
      const company = document.getElementById('rf-settings-company')?.value.trim() || '';
      const limit   = parseInt(document.getElementById('rf-settings-limit')?.value) || 50;
      const usage   = await getUsage();
      usage.daily_limit = limit;
      await storageSet({
        recruitflow_settings: { recruiter_name: name, recruiter_company: company, daily_limit: limit },
        recruitflow_usage: usage
      });
      await refreshLimitBar();
      showToast('Settings saved!', 'success');
    });

    document.getElementById('rf-settings-name')?.addEventListener('blur', async () => {
      const nameEl    = document.getElementById('rf-settings-name');
      const companyEl = document.getElementById('rf-settings-company');
      const limitEl   = document.getElementById('rf-settings-limit');
      if (!nameEl || !companyEl || !limitEl) return;
      await storageSet({ recruitflow_settings: {
        recruiter_name: nameEl.value.trim(),
        recruiter_company: companyEl.value.trim(),
        daily_limit: parseInt(limitEl.value) || 50
      }});
    });

    document.getElementById('rf-add-template-btn')?.addEventListener('click', () => {
      const modal = document.getElementById('rf-add-tpl-modal');
      if (modal) { modal.classList.add('visible'); document.getElementById('rf-new-tpl-name').value = ''; document.getElementById('rf-new-tpl-body').value = ''; }
    });

    document.getElementById('rf-save-new-tpl')?.addEventListener('click', async () => {
      const name = document.getElementById('rf-new-tpl-name')?.value.trim();
      const body = document.getElementById('rf-new-tpl-body')?.value.trim();
      if (!name || !body) { showToast('Fill in both fields', 'warning'); return; }
      const tmpls = await storageGet('recruitflow_templates') || [];
      const usage = await getUsage();
      const customCount = tmpls.filter(t => !t.id.startsWith('default_')).length;
      if (!usage.is_pro && customCount >= 3) {
        showToast('Free plan: max 3 custom templates. Upgrade to Pro for unlimited.', 'warning');
        return;
      }
      tmpls.push({ id: 'tpl_' + Date.now(), name, body, createdAt: new Date().toISOString() });
      await storageSet({ recruitflow_templates: tmpls });
      document.getElementById('rf-add-tpl-modal').classList.remove('visible');
      await Promise.all([renderSettingsTemplateList(), refreshTemplateSelect()]);
      showToast('Template saved!', 'success');
    });

    document.getElementById('rf-cancel-new-tpl')?.addEventListener('click', () =>
      document.getElementById('rf-add-tpl-modal')?.classList.remove('visible'));

    document.getElementById('rf-clear-data-btn')?.addEventListener('click', async () => {
      if (!confirm('Delete ALL RecruitFlow data? This cannot be undone.')) return;
      await chrome.storage.local.clear();
      showToast('All data cleared. Reloading…', 'warning');
      setTimeout(() => location.reload(), 1500);
    });
  }

  // ── Tab switching ────────────────────────────────────────────────────────
  function switchTab(name) {
    document.querySelectorAll('.rf-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.rf-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`.rf-tab-btn[data-tab="${name}"]`)?.classList.add('active');
    document.getElementById(`rf-panel-${name}`)?.classList.add('active');
    if (name === 'tracker') { renderTrackerList(); refreshTrackerStats(); }
    if (name === 'message') refreshLimitBar();
    if (name === 'settings') {
      storageGet('recruitflow_settings').then(s => {
        if (!s) return;
        const n = document.getElementById('rf-settings-name');
        const c = document.getElementById('rf-settings-company');
        const l = document.getElementById('rf-settings-limit');
        if (n) n.value = s.recruiter_name || '';
        if (c) c.value = s.recruiter_company || '';
        if (l) l.value = s.daily_limit || 50;
      });
      renderSettingsTemplateList();
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  async function init() {
    document.querySelectorAll('.rf-tab-btn').forEach(btn =>
      btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

    const upgradeOverlay = document.getElementById('rf-upgrade-overlay');
    document.getElementById('rf-upgrade-dismiss')?.addEventListener('click', () =>
      upgradeOverlay?.classList.remove('visible'));

    wireJDTab();
    wireMessageTab();
    wireTrackerTab();
    wireSettingsTab();

    await Promise.all([
      refreshJDSelect(),
      refreshTemplateSelect(),
      refreshAIBadge(),
      refreshLimitBar()
    ]);

    // Read profile from DOM on startup so currentProfile is populated immediately
    currentProfile = readProfileFromDOM();
    updateProfileBanner(currentProfile);
    await fillAndPreview();

    switchTab('jd');

    // Daily reset check every 5 minutes
    setInterval(() => checkAndResetDay(), 5 * 60 * 1000);
  }

  // ── Listen for profile updates sent by content.js ─────────────────────────
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'PROFILE_UPDATED') { updateProfileBanner(msg.profile); fillAndPreview(); }
  });

  // ── Boot when DOM is ready ────────────────────────────────────────────────
  function tryInit() {
    if (document.getElementById('rf-send-btn')) { init(); }
    else { setTimeout(tryInit, 200); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();
