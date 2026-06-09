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

  // ── Crypto helpers ────────────────────────────────────────────────────────
  async function hashPassword(password) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  // ── EmailJS OTP sender (uses REST API — no SDK needed) ────────────────────
  // Setup: create free account at emailjs.com → Email Services → connect Gmail
  // Create a template with variables: {{to_email}}, {{otp_code}}, {{user_name}}
  // Fill in your credentials below:
  const EMAILJS_SERVICE_ID  = 'service_dgjqxrr';
  const EMAILJS_TEMPLATE_ID = 'template_4p8rmnm';
  const EMAILJS_PUBLIC_KEY  = 'jMlu45Z3SUqn9daiI';        // replace with your Public Key

  async function sendOTPEmail(toEmail, otpCode, userName) {
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id:    EMAILJS_SERVICE_ID,
          template_id:   EMAILJS_TEMPLATE_ID,
          user_id:       EMAILJS_PUBLIC_KEY,
          template_params: { to_email: toEmail, otp_code: otpCode, user_name: userName }
        })
      });
      return res.ok;
    } catch (_) { return false; }
  }

  function generateOTP() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  // ── Auth helpers ──────────────────────────────────────────────────────────
  async function getAuth()       { return (await storageGet('recruitflow_auth')) || { accounts: [], isLoggedIn: false }; }
  async function setAuth(data)   { await storageSet({ recruitflow_auth: data }); }
  function getCurrentUser(auth)  { return auth?.isLoggedIn ? auth.currentUser : null; }

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

  function isOnLinkedInProfile() {
    return /linkedin\.com\/in\//.test(window.location.href);
  }

  // Snapshot all contenteditable/textarea elements currently in DOM
  function snapshotInputs() {
    return new Set(document.querySelectorAll('[contenteditable], textarea, input[type="text"]'));
  }

  // After clicking Message, poll for any NEW input element that wasn't there before
  async function waitForNewComposer(beforeSnapshot, ms = 10000) {
    const start = Date.now();
    while (Date.now() - start < ms) {
      // 1. Check for new elements not in the snapshot
      const all = document.querySelectorAll('[contenteditable="true"], textarea');
      for (const el of all) {
        if (beforeSnapshot.has(el)) continue;          // existed before — skip
        const r = el.getBoundingClientRect();
        if (r.width > 50 && r.height > 10) return el; // new visible element
      }

      // 2. Also try well-known LinkedIn composer selectors (in case snapshot missed them)
      const known =
        document.querySelector('.msg-form__contenteditable') ||
        document.querySelector('[class*="msg-form"][contenteditable="true"]') ||
        document.querySelector('[class*="compose"][contenteditable="true"]') ||
        document.querySelector('[class*="message"][contenteditable="true"]') ||
        document.querySelector('.msg-overlay-conversation-bubble [contenteditable]') ||
        document.querySelector('[role="dialog"] [contenteditable="true"]') ||
        document.querySelector('[role="dialog"] textarea');
      if (known) return known;

      await sleep(250);
    }
    return null;
  }

  function typeIntoElement(el, text) {
    el.focus();
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      el.value = text;
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // contenteditable
      el.innerHTML = '';
      const ok = document.execCommand('insertText', false, text);
      if (!ok || !el.innerText?.trim()) {
        el.innerHTML = text.replace(/\n/g, '<br>');
        el.dispatchEvent(new Event('input',  { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  function findSendButton() {
    return (
      document.querySelector('.msg-form__send-button:not([disabled])') ||
      document.querySelector('button[type="submit"]:not([disabled])') ||
      Array.from(document.querySelectorAll('button:not([disabled])')).find(b => {
        const t = (b.getAttribute('aria-label') || b.innerText || '').toLowerCase().trim();
        return t === 'send' || t === 'send message' || t === 'send now';
      })
    );
  }

  // Copy text to clipboard as a guaranteed fallback
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }
  }

  async function sendLinkedInMessage(text) {
    if (!isOnLinkedInProfile()) {
      throw new Error('Open the candidate\'s LinkedIn profile page first, then click Send Message.');
    }

    // Snapshot current inputs BEFORE any click
    const before = snapshotInputs();

    // Find Message / InMail button
    const actionBtn =
      document.querySelector('button[aria-label^="Message"]') ||
      document.querySelector('button[aria-label*="Message "]') ||
      document.querySelector('button[aria-label*="InMail"]') ||
      document.querySelector('.pvs-profile-actions button[aria-label*="Message"]') ||
      Array.from(document.querySelectorAll('button')).find(b => {
        const label = (b.innerText?.trim() || b.getAttribute('aria-label') || '').toLowerCase();
        return label === 'message' || label.startsWith('message ') || label.includes('inmail');
      });

    if (!actionBtn) {
      // Fallback: copy to clipboard
      await copyToClipboard(text);
      showToast('Message copied to clipboard! Click the Message button on LinkedIn and paste (Ctrl+V).', 'warning');
      return true;
    }

    // Scroll button into view and click it
    actionBtn.scrollIntoView({ block: 'center' });
    await sleep(400);
    actionBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    // Wait for a new input to appear
    const composer = await waitForNewComposer(before, 10000);

    if (!composer) {
      // Hard fallback: copy to clipboard and guide user
      await copyToClipboard(text);
      showToast('Message copied! Click Message on LinkedIn, then press Ctrl+V to paste and send.', 'warning');
      return true;
    }

    typeIntoElement(composer, text);
    await sleep(700);

    const sendBtn = findSendButton();
    if (sendBtn) {
      sendBtn.click();
    } else {
      showToast('Message typed — press Enter or click Send to deliver it.', 'warning');
    }
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

  async function renderJDCards() {
    const cardsEl = document.getElementById('rf-jd-cards');
    if (!cardsEl) return;
    const [jds, activeId] = await Promise.all([getAllJDs(), storageGet('recruitflow_active_jd')]);

    if (!jds.length) {
      cardsEl.innerHTML = `
        <div style="text-align:center;padding:20px 12px;color:#94A3B8;font-size:12px;">
          <div style="font-size:26px;margin-bottom:6px;">📋</div>
          No JDs saved yet. Fill the form above and click Save JD.
        </div>`;
      return;
    }

    cardsEl.innerHTML = '';
    jds.forEach(jd => {
      const isActive = jd.id === activeId;
      const snippet  = (jd.text || '').replace(/\s+/g, ' ').trim().slice(0, 80);

      const card = document.createElement('div');
      card.style.cssText = [
        'background:' + (isActive ? '#EFF6FF' : '#FFFFFF'),
        'border:2px solid ' + (isActive ? '#2563EB' : '#E2E8F0'),
        'border-radius:12px', 'padding:12px', 'margin-bottom:8px',
        'cursor:pointer', 'transition:box-shadow .15s,border-color .15s'
      ].join(';');

      card.innerHTML = `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:5px;">
          <span style="font-weight:700;font-size:13px;color:#0F172A;line-height:1.3;flex:1;">${jd.title || 'Untitled JD'}</span>
          ${isActive
            ? '<span style="font-size:9px;background:#2563EB;color:#fff;padding:2px 8px;border-radius:10px;flex-shrink:0;font-weight:600;letter-spacing:.3px;">ACTIVE</span>'
            : '<span class="rf-jd-set-active" style="font-size:10px;color:#2563EB;cursor:pointer;flex-shrink:0;font-weight:600;text-decoration:underline;">Set Active</span>'
          }
        </div>
        ${snippet ? `<div style="font-size:11px;color:#64748B;line-height:1.5;margin-bottom:10px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${snippet}…</div>` : ''}
        <div style="display:flex;gap:6px;">
          <button class="rf-jd-edit-btn rf-btn-secondary rf-btn-sm" style="flex:1;font-size:11px;">✏ Edit</button>
          <button class="rf-jd-del-btn rf-btn-secondary rf-btn-sm" style="flex:1;font-size:11px;color:#DC2626;border-color:#FCA5A5;">🗑 Delete</button>
        </div>
      `;

      card.addEventListener('mouseenter', () => { if (!isActive) card.style.borderColor = '#93C5FD'; card.style.boxShadow = '0 2px 10px rgba(0,0,0,.08)'; });
      card.addEventListener('mouseleave', () => { card.style.borderColor = isActive ? '#2563EB' : '#E2E8F0'; card.style.boxShadow = 'none'; });

      // Set active
      card.querySelector('.rf-jd-set-active')?.addEventListener('click', async e => {
        e.stopPropagation();
        await storageSet({ recruitflow_active_jd: jd.id });
        await renderJDCards();
        fillAndPreview();
        showToast(`"${jd.title}" set as active JD`, 'success');
      });

      // Edit — load into form
      card.querySelector('.rf-jd-edit-btn').addEventListener('click', e => {
        e.stopPropagation();
        document.getElementById('rf-jd-title').value = jd.title;
        document.getElementById('rf-jd-text').value  = jd.text;
        document.getElementById('rf-jd-save-btn').dataset.editId = jd.id;
        document.getElementById('rf-jd-form-cancel').style.display = '';
        document.querySelector('#rf-jd-form-section label.rf-label').textContent = 'Edit Job Description';
        document.getElementById('rf-jd-title').focus();
        document.getElementById('rf-jd-form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      // Delete
      card.querySelector('.rf-jd-del-btn').addEventListener('click', async e => {
        e.stopPropagation();
        if (!confirm(`Delete "${jd.title}"?`)) return;
        let jdList = await getAllJDs();
        jdList = jdList.filter(j => j.id !== jd.id);
        await storageSet({ recruitflow_jds: jdList });
        if (isActive && jdList.length) await storageSet({ recruitflow_active_jd: jdList[0].id });
        await renderJDCards();
        showToast('JD deleted', 'success');
      });

      cardsEl.appendChild(card);
    });

    // Update role colour for active JD
    const active = jds.find(j => j.id === activeId);
    if (active) {
      document.getElementById('recruitflow-sidebar-container')?.setAttribute('data-role', active.roleCategory || 'tech');
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
  function resetJDForm() {
    document.getElementById('rf-jd-title').value = '';
    document.getElementById('rf-jd-text').value  = '';
    delete document.getElementById('rf-jd-save-btn').dataset.editId;
    document.getElementById('rf-jd-form-cancel').style.display = 'none';
    document.getElementById('rf-optimized-section').style.display = 'none';
    const lbl = document.querySelector('#rf-jd-form-section label.rf-label');
    if (lbl) lbl.textContent = 'New Job Description';
  }

  function wireJDTab() {
    // New JD button — scroll to form and clear it
    document.getElementById('rf-jd-new-btn')?.addEventListener('click', () => {
      resetJDForm();
      document.getElementById('rf-jd-title').focus();
      document.getElementById('rf-jd-form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Cancel edit
    document.getElementById('rf-jd-form-cancel')?.addEventListener('click', resetJDForm);

    // Save JD (handles both new + edit)
    document.getElementById('rf-jd-save-btn')?.addEventListener('click', async () => {
      const title  = document.getElementById('rf-jd-title')?.value.trim();
      const text   = document.getElementById('rf-jd-text')?.value.trim();
      const editId = document.getElementById('rf-jd-save-btn').dataset.editId;
      if (!title || !text) { showToast('Enter a title and JD text', 'warning'); return; }

      if (editId) {
        // Update existing JD
        let jdList = await getAllJDs();
        const idx  = jdList.findIndex(j => j.id === editId);
        if (idx > -1) {
          jdList[idx] = { ...jdList[idx], title, text, roleCategory: detectRoleCategory(text) };
          await storageSet({ recruitflow_jds: jdList });
        }
        showToast('JD updated!', 'success');
      } else {
        // New JD
        const jd = await saveJD(title, text);
        document.getElementById('recruitflow-sidebar-container')?.setAttribute('data-role', jd.roleCategory);
        showToast('JD saved!', 'success');
      }
      resetJDForm();
      await renderJDCards();
      fillAndPreview();
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
      } catch (e) { console.error('[RecruitFlow] AI error:', e); showToast('AI unavailable. Check F12 console for details.', 'error'); }
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
      if (!currentProfile?.name) { showToast('No profile loaded — AI will generate a generic message', 'warning'); }
      if (!await canUseAI()) { showUpgradeOverlay(); return; }
      const jd = await getActiveJD();
      if (!jd) { showToast('Save a JD in the JD tab first', 'warning'); return; }
      const btn = document.getElementById('rf-ai-generate-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="rf-spinner"></span> Generating…';
      try {
        const roughDraft = document.getElementById('rf-rough-draft')?.value?.trim() || '';
        const result = await chrome.runtime.sendMessage({
          type: 'GENERATE_MESSAGE', profileData: currentProfile, jdText: jd.text, tone: currentTone, roughDraft
        });
        if (result.limitReached) { showUpgradeOverlay(); return; }
        if (!result.success) { showToast(result.error || 'AI unavailable', 'error'); return; }
        const wrap = document.getElementById('rf-ai-message-wrap');
        const ta   = document.getElementById('rf-ai-message-text');
        if (wrap) wrap.style.display = 'block';
        if (ta)   ta.value = result.message;
        await refreshAIBadge();
        showToast('Message generated!', 'success');
      } catch (e) { console.error('[RecruitFlow] AI error:', e); showToast('AI unavailable. Check F12 console for details.', 'error'); }
      finally {
        btn.disabled = false;
        btn.innerHTML = '✦ Refine &amp; Generate with AI <span class="rf-ai-uses-badge"></span>';
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
        if (!isOnLinkedInProfile()) {
          showToast('Go to the candidate\'s LinkedIn profile page first (/in/username), then click Send.', 'warning');
          btn.disabled = false;
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Message`;
          return;
        }
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

    // DEV ONLY: reset onboarding — remove before publishing to Chrome Web Store
    document.getElementById('rf-reset-onboard')?.addEventListener('click', async () => {
      const s = (await storageGet('recruitflow_settings')) || {};
      s.onboarding_complete = false;
      await storageSet({ recruitflow_settings: s });
      showToast('Onboarding reset. Reloading…', 'success');
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

  // ── Onboarding (Step 5) ──────────────────────────────────────────────────
  async function showOnboarding() {
    const container = document.getElementById('recruitflow-sidebar-container');
    const sidebar   = container?.querySelector('.rf-sidebar');
    if (!sidebar) return;

    // Hide tabs and all panels while onboarding is shown
    const tabsEl  = sidebar.querySelector('.rf-tabs');
    const panels  = sidebar.querySelectorAll('.rf-panel');
    const header  = sidebar.querySelector('.rf-header');
    if (tabsEl) tabsEl.style.display = 'none';
    panels.forEach(p => { p.style.display = 'none'; });

    const card = document.createElement('div');
    card.id = 'rf-onboarding';
    card.innerHTML = `
      <div class="rf-onboard-wrap">
        <div class="rf-onboard-hero">
          <div class="rf-onboard-icon-ring">
            <div class="rf-onboard-icon">RF</div>
          </div>
          <h2 class="rf-onboard-title">Welcome to RecruitFlow</h2>
          <p class="rf-onboard-sub">Send personalised LinkedIn messages in 1 click.<br>Let's set you up in 30 seconds.</p>
        </div>
        <div class="rf-step-dots">
          <span class="rf-dot rf-dot-active"></span>
          <span class="rf-dot"></span>
          <span class="rf-dot"></span>
        </div>
        <div class="rf-onboard-form">
          <div class="rf-field-group">
            <label class="rf-label">Your full name <span class="rf-required">*</span></label>
            <input id="rf-ob-name" type="text" class="rf-input" placeholder="e.g. Rahul Sharma" autocomplete="name">
          </div>
          <div class="rf-field-group">
            <label class="rf-label">Your company name <span class="rf-required">*</span></label>
            <input id="rf-ob-company" type="text" class="rf-input" placeholder="e.g. TechHire Solutions" autocomplete="organization">
          </div>
          <div class="rf-field-group">
            <label class="rf-label">Daily message limit</label>
            <div class="rf-limit-options" id="rf-ob-limit-options">
              <button class="rf-limit-opt" data-val="20">20 / day<br><span>Conservative</span></button>
              <button class="rf-limit-opt rf-limit-opt-active" data-val="50">50 / day<br><span>Recommended</span></button>
              <button class="rf-limit-opt" data-val="80">80 / day<br><span>Aggressive</span></button>
            </div>
            <p class="rf-hint">LinkedIn's safe limit is ~50–60 messages/day</p>
          </div>
        </div>
        <div class="rf-onboard-perks">
          <div class="rf-perk">
            <span class="rf-perk-icon">✦</span>
            <div>
              <p class="rf-perk-title">3 free AI messages included</p>
              <p class="rf-perk-desc">AI writes personalised messages for each candidate</p>
            </div>
          </div>
          <div class="rf-perk">
            <span class="rf-perk-icon">↗</span>
            <div>
              <p class="rf-perk-title">Unlimited template sending</p>
              <p class="rf-perk-desc">Save templates, auto-fill names and roles forever</p>
            </div>
          </div>
          <div class="rf-perk">
            <span class="rf-perk-icon">◎</span>
            <div>
              <p class="rf-perk-title">Outreach tracker built in</p>
              <p class="rf-perk-desc">Logs every message automatically</p>
            </div>
          </div>
        </div>
        <button id="rf-ob-submit" class="rf-btn-ai rf-ob-cta">✦ Get Started — It's Free</button>
        <p class="rf-onboard-note">No account needed · All data stays on your device</p>
      </div>
    `;

    if (header && header.nextSibling) {
      sidebar.insertBefore(card, header.nextSibling);
    } else {
      sidebar.appendChild(card);
    }

    // Limit option buttons
    let selectedLimit = 50;
    card.querySelectorAll('.rf-limit-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        card.querySelectorAll('.rf-limit-opt').forEach(b => b.classList.remove('rf-limit-opt-active'));
        btn.classList.add('rf-limit-opt-active');
        selectedLimit = parseInt(btn.dataset.val);
      });
    });

    // Get Started submission
    card.querySelector('#rf-ob-submit').addEventListener('click', async () => {
      const nameInput    = document.getElementById('rf-ob-name');
      const companyInput = document.getElementById('rf-ob-company');
      const name    = nameInput?.value?.trim();
      const company = companyInput?.value?.trim();

      if (!name) {
        nameInput.style.borderColor = '#EF4444';
        nameInput.focus();
        setTimeout(() => { nameInput.style.borderColor = ''; }, 2000);
        return;
      }
      if (!company) {
        companyInput.style.borderColor = '#EF4444';
        companyInput.focus();
        setTimeout(() => { companyInput.style.borderColor = ''; }, 2000);
        return;
      }

      // Save settings + mark onboarding done
      const existing = (await storageGet('recruitflow_settings')) || {};
      await storageSet({
        recruitflow_settings: {
          ...existing,
          recruiter_name:      name,
          recruiter_company:   company,
          daily_limit:         selectedLimit,
          onboarding_complete: true
        }
      });

      // Also update usage daily limit
      const usage = await getUsage();
      usage.daily_limit = selectedLimit;
      await storageSet({ recruitflow_usage: usage });

      // Pre-load default templates if none exist yet
      const existingTemplates = await storageGet('recruitflow_templates');
      if (!existingTemplates || !existingTemplates.length) {
        await storageSet({ recruitflow_templates: DEFAULT_TEMPLATES });
      }

      // Animate card out then show main UI
      card.style.transition = 'opacity 0.4s, transform 0.4s';
      card.style.opacity    = '0';
      card.style.transform  = 'translateY(-12px)';

      setTimeout(async () => {
        card.remove();
        if (tabsEl) tabsEl.style.display = '';
        await initMain();
        showToast(`Welcome, ${name.split(' ')[0]}! Let's start recruiting 🚀`, 'success');
      }, 400);
    });
  }

  // ── Main sidebar initialisation ──────────────────────────────────────────
  async function initMain() {
    // Wire close button
    document.getElementById('rf-close-btn')?.addEventListener('click', () => {
      document.getElementById('recruitflow-sidebar-container')?.classList.add('collapsed');
    });

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
      renderJDCards(),
      refreshTemplateSelect(),
      refreshAIBadge(),
      refreshLimitBar()
    ]);

    // Read profile from DOM immediately so templates fill correctly
    currentProfile = readProfileFromDOM();
    updateProfileBanner(currentProfile);
    await fillAndPreview();

    // Show JD tab first if no JDs saved yet, otherwise Message tab
    const jds = (await storageGet('recruitflow_jds')) || [];
    switchTab(jds.length === 0 ? 'jd' : 'message');

    // Daily reset check every 5 minutes
    setInterval(() => checkAndResetDay(), 5 * 60 * 1000);
  }

  // ── Auth screen wiring ────────────────────────────────────────────────────
  function wireAuthScreen() {
    // Tab switching (Sign In / Sign Up)
    document.querySelectorAll('.rf-auth-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.rf-auth-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.authTab;
        document.getElementById('rf-login-form').classList.toggle('rf-form-visible',  tab === 'login');
        document.getElementById('rf-signup-form').classList.toggle('rf-form-visible', tab === 'signup');
        document.getElementById('rf-otp-form').classList.remove('rf-form-visible');
        document.getElementById('rf-login-error').style.display  = 'none';
        document.getElementById('rf-signup-error').style.display = 'none';
      });
    });

    // Password toggles
    document.querySelectorAll('.rf-pw-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.textContent = input.type === 'password' ? '👁' : '🙈';
      });
    });

    // Login
    document.getElementById('rf-login-btn')?.addEventListener('click', async () => {
      const email    = document.getElementById('rf-login-email')?.value.trim().toLowerCase();
      const password = document.getElementById('rf-login-password')?.value;
      const errEl    = document.getElementById('rf-login-error');
      errEl.style.display = 'none';

      if (!email || !password) { errEl.textContent = 'Please fill in all fields.'; errEl.style.display = 'block'; return; }

      const btn = document.getElementById('rf-login-btn');
      btn.disabled = true; btn.textContent = 'Signing in…';

      try {
        const auth = await getAuth();
        const hash = await hashPassword(password);
        const account = (auth.accounts || []).find(a => a.email === email && a.passwordHash === hash);
        if (!account) { errEl.textContent = 'Incorrect email or password.'; errEl.style.display = 'block'; return; }
        await setAuth({ ...auth, currentUser: { email: account.email, name: account.name }, isLoggedIn: true });
        await onAuthSuccess(account.name);
      } catch (e) { errEl.textContent = 'Something went wrong. Try again.'; errEl.style.display = 'block'; }
      finally { btn.disabled = false; btn.textContent = 'Sign In'; }
    });

    // Signup
    let pendingOTP = null;
    let pendingSignupData = null;

    document.getElementById('rf-signup-btn')?.addEventListener('click', async () => {
      const name     = document.getElementById('rf-signup-name')?.value.trim();
      const email    = document.getElementById('rf-signup-email')?.value.trim().toLowerCase();
      const password = document.getElementById('rf-signup-password')?.value;
      const errEl    = document.getElementById('rf-signup-error');
      errEl.style.display = 'none';

      if (!name || !email || !password) { errEl.textContent = 'Please fill in all fields.'; errEl.style.display = 'block'; return; }
      if (password.length < 6)          { errEl.textContent = 'Password must be at least 6 characters.'; errEl.style.display = 'block'; return; }

      const auth = await getAuth();
      if ((auth.accounts || []).find(a => a.email === email)) {
        errEl.textContent = 'An account with this email already exists.'; errEl.style.display = 'block'; return;
      }

      const btn = document.getElementById('rf-signup-btn');
      btn.disabled = true; btn.textContent = 'Sending OTP…';

      try {
        const otp  = generateOTP();
        const sent = await sendOTPEmail(email, otp, name);
        pendingOTP        = otp;
        pendingSignupData = { name, email, password };

        document.getElementById('rf-otp-email-display').textContent = email;
        document.getElementById('rf-signup-form').classList.remove('rf-form-visible');
        document.getElementById('rf-otp-form').classList.add('rf-form-visible');

        if (sent) {
          // Email sent — show normal "sent to email" message
          document.getElementById('rf-otp-sent-msg').style.display  = '';
          document.getElementById('rf-otp-inline-box').style.display = 'none';
        } else {
          // Email not configured — show OTP directly in the sidebar so user can sign up
          console.info('[RecruitFlow] EmailJS not configured — OTP:', otp);
          document.getElementById('rf-otp-sent-msg').style.display   = 'none';
          document.getElementById('rf-otp-inline-box').style.display  = 'block';
          document.getElementById('rf-otp-inline-code').textContent   = otp;
        }
      } catch (e) { errEl.textContent = 'Failed to send OTP. Try again.'; errEl.style.display = 'block'; }
      finally { btn.disabled = false; btn.textContent = 'Create Account & Send OTP'; }
    });

    // OTP Verify
    document.getElementById('rf-otp-verify-btn')?.addEventListener('click', async () => {
      const entered = document.getElementById('rf-otp-input')?.value.trim();
      const errEl   = document.getElementById('rf-otp-error');
      errEl.style.display = 'none';

      if (!entered) { errEl.textContent = 'Enter the OTP code.'; errEl.style.display = 'block'; return; }
      if (entered !== pendingOTP) { errEl.textContent = 'Incorrect OTP. Please try again.'; errEl.style.display = 'block'; return; }

      const btn = document.getElementById('rf-otp-verify-btn');
      btn.disabled = true; btn.textContent = 'Creating account…';

      try {
        const auth = await getAuth();
        const hash = await hashPassword(pendingSignupData.password);
        const accounts = auth.accounts || [];
        accounts.push({ email: pendingSignupData.email, name: pendingSignupData.name, passwordHash: hash, createdAt: new Date().toISOString() });
        await setAuth({ accounts, currentUser: { email: pendingSignupData.email, name: pendingSignupData.name }, isLoggedIn: true });
        pendingOTP = null; pendingSignupData = null;
        await onAuthSuccess(accounts[accounts.length - 1].name);
      } catch (e) { errEl.textContent = 'Something went wrong. Try again.'; errEl.style.display = 'block'; }
      finally { btn.disabled = false; btn.textContent = 'Verify & Create Account'; }
    });

    // OTP Resend
    document.getElementById('rf-otp-resend-btn')?.addEventListener('click', async () => {
      if (!pendingSignupData) return;
      const otp  = generateOTP();
      pendingOTP = otp;
      const sent = await sendOTPEmail(pendingSignupData.email, otp, pendingSignupData.name);
      if (sent) {
        showToast('OTP resent to your email!', 'success');
      } else {
        console.info('[RecruitFlow] Resent OTP:', otp);
        document.getElementById('rf-otp-inline-code').textContent  = otp;
        document.getElementById('rf-otp-inline-box').style.display = 'block';
        document.getElementById('rf-otp-sent-msg').style.display   = 'none';
        showToast('New OTP shown above', 'success');
      }
    });

    // OTP Back
    document.getElementById('rf-otp-back-btn')?.addEventListener('click', () => {
      document.getElementById('rf-otp-form').classList.remove('rf-form-visible');
      document.getElementById('rf-signup-form').classList.add('rf-form-visible');
      pendingOTP = null; pendingSignupData = null;
    });

    // Sign out
    document.getElementById('rf-signout-btn')?.addEventListener('click', async () => {
      const auth = await getAuth();
      await setAuth({ ...auth, isLoggedIn: false, currentUser: null });
      location.reload();
    });
  }

  async function showAuthScreen() {
    const tabsEl  = document.querySelector('#recruitflow-sidebar-container .rf-tabs');
    const panels  = document.querySelectorAll('#recruitflow-sidebar-container .rf-panel');
    const authEl  = document.getElementById('rf-auth-screen');
    if (tabsEl) tabsEl.style.display = 'none';
    panels.forEach(p => { p.style.display = 'none'; });
    if (authEl) authEl.style.display = 'flex';
    wireAuthScreen();
  }

  async function onAuthSuccess(userName) {
    // Hide auth screen
    const authEl = document.getElementById('rf-auth-screen');
    if (authEl) authEl.style.display = 'none';

    // Show user bar in header
    const nameEl = document.getElementById('rf-header-name');
    if (nameEl) nameEl.textContent = (userName || '').split(' ')[0];

    // Show onboarding or main
    const settings = (await storageGet('recruitflow_settings')) || {};
    if (!settings.onboarding_complete) {
      await showOnboarding();
    } else {
      // Show tabs again
      const tabsEl = document.querySelector('#recruitflow-sidebar-container .rf-tabs');
      if (tabsEl) tabsEl.style.display = '';
      await initMain();
    }
  }

  // ── Entry point: check auth → check onboarding → main ───────────────────
  async function init() {
    const auth = await getAuth();
    const user = getCurrentUser(auth);
    if (!user) {
      await showAuthScreen();
      return;
    }
    // Update header name
    const nameEl = document.getElementById('rf-header-name');
    if (nameEl) nameEl.textContent = (user.name || '').split(' ')[0];

    const settings = (await storageGet('recruitflow_settings')) || {};
    if (!settings.onboarding_complete) {
      await showOnboarding();
    } else {
      await initMain();
    }
  }

  // ── Listen for profile updates from content.js SPA navigation ────────────
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'PROFILE_UPDATED') { updateProfileBanner(msg.profile); fillAndPreview(); }
  });

  // ── Boot when sidebar HTML is in the DOM ─────────────────────────────────
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
