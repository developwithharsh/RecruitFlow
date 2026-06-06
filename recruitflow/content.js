(function () {
  'use strict';

  if (document.getElementById('recruitflow-sidebar-container')) return;

  // ─── Profile reading ──────────────────────────────────────────────────────

  function getTextWithFallbacks(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim()) return el.innerText.trim();
      } catch (_) {}
    }
    return '';
  }

  function getCompanyFromExperience() {
    try {
      const expSection = document.querySelector('#experience');
      if (!expSection) return '';
      const section = expSection.closest('section') || expSection.parentElement;
      const el = section?.querySelector('.t-14.t-normal.t-black--light')
               || section?.querySelector('.hoverable-link-text.t-bold');
      return el ? el.innerText.trim() : '';
    } catch (_) { return ''; }
  }

  function readSkills() {
    try {
      const els = document.querySelectorAll(
        '.skill-categories-taxonomy__item, .pvs-entity__supplementary-info'
      );
      return Array.from(els).slice(0, 8).map(e => e.innerText.trim()).filter(Boolean);
    } catch (_) { return []; }
  }

  function readLinkedInProfile() {
    return {
      name: getTextWithFallbacks(['h1.text-heading-xlarge', 'h1.inline.t-24', '.pv-text-details__left-panel h1', 'h1']),
      role: getTextWithFallbacks(['.text-body-medium.break-words', '.pv-text-details__left-panel .text-body-medium']),
      company: getCompanyFromExperience(),
      location: getTextWithFallbacks(['.text-body-small.inline.t-black--light', '.pv-text-details__left-panel .text-body-small']),
      profileUrl: window.location.href,
      skills: readSkills()
    };
  }

  // ─── Sleep helper ─────────────────────────────────────────────────────────

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ─── LinkedIn message sending ─────────────────────────────────────────────

  async function sendLinkedInMessage(messageText) {
    const msgBtn = document.querySelector('button[aria-label*="Message"]')
                || document.querySelector('.pvs-profile-actions__action')
                || Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Message');

    if (!msgBtn) throw new Error('Message button not found on this profile.');
    msgBtn.click();

    await sleep(1200);

    const composer = document.querySelector('.msg-form__contenteditable')
                  || document.querySelector('[data-artdeco-is-focused]')
                  || document.querySelector('[contenteditable="true"]');

    if (!composer) throw new Error('LinkedIn message composer did not open. Try clicking the Message button manually.');

    composer.focus();
    document.execCommand('insertText', false, messageText);

    await sleep(400);

    const sendBtn = document.querySelector('.msg-form__send-button')
                 || document.querySelector('button[type="submit"].msg-form__send-button')
                 || Array.from(document.querySelectorAll('button')).find(b =>
                      b.getAttribute('aria-label')?.toLowerCase().includes('send'));

    if (sendBtn) sendBtn.click();
    return true;
  }

  // ─── Sidebar HTML builder ─────────────────────────────────────────────────

  function buildSidebarHTML() {
    return `
<div class="rf-toggle-tab" id="rf-toggle-tab" title="Toggle RecruitFlow">
  <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
</div>
<div class="rf-sidebar">
  <div class="rf-header">
    <div class="rf-logo-icon">RF</div>
    <span class="rf-logo-text">RecruitFlow</span>
    <div class="rf-header-spacer"></div>
    <span class="rf-profile-mini">
      <span class="rf-profile-mini-name" id="rf-header-name">Loading…</span>
    </span>
  </div>

  <div class="rf-tabs">
    <button class="rf-tab-btn active" data-tab="jd">
      <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      JD
    </button>
    <button class="rf-tab-btn" data-tab="message">
      <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      Message
    </button>
    <button class="rf-tab-btn" data-tab="tracker">
      <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      Tracker
    </button>
    <button class="rf-tab-btn" data-tab="settings">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      Settings
    </button>
  </div>

  <!-- JD PANEL -->
  <div class="rf-panel active" id="rf-panel-jd">
    <div class="rf-panel-scroll">
      <div class="rf-section">
        <label class="rf-label">Active Job Description</label>
        <select class="rf-select" id="rf-jd-select">
          <option value="">No JD saved — paste one below</option>
        </select>
      </div>
      <div class="rf-section">
        <label class="rf-label">JD Title</label>
        <input type="text" class="rf-input" id="rf-jd-title" placeholder="e.g. Senior React Developer — Pune">
      </div>
      <div class="rf-section">
        <label class="rf-label">Job Description Text</label>
        <textarea class="rf-textarea" id="rf-jd-text" rows="7" placeholder="Paste your job description here…"></textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <button class="rf-btn-secondary rf-btn-sm" id="rf-jd-upload-btn">📎 Upload PDF</button>
        <input type="file" id="rf-jd-pdf-input" accept=".pdf" style="display:none">
        <button class="rf-btn-secondary rf-btn-sm" id="rf-jd-save-btn">💾 Save JD</button>
      </div>
      <button class="rf-btn-ai" id="rf-jd-optimize-btn">✦ Optimize with AI</button>
      <div class="rf-ai-uses-badge" id="rf-jd-ai-uses"></div>
      <div id="rf-jd-optimized-section" style="display:none;margin-top:14px;">
        <div class="rf-divider"></div>
        <label class="rf-label">Optimization Result</label>
        <div class="rf-jd-compare">
          <div>
            <div class="rf-jd-compare-col-title">Original</div>
            <div class="rf-jd-compare-text" id="rf-jd-original-preview"></div>
          </div>
          <div>
            <div class="rf-jd-compare-col-title">Optimized ✦</div>
            <div class="rf-jd-compare-text" id="rf-jd-optimized-preview"></div>
          </div>
        </div>
        <div class="rf-optimized-actions">
          <button class="rf-btn-primary rf-btn-sm" id="rf-jd-accept-btn">✓ Accept</button>
          <button class="rf-btn-secondary rf-btn-sm" id="rf-jd-reject-btn">✕ Reject</button>
        </div>
      </div>
    </div>
  </div>

  <!-- MESSAGE PANEL -->
  <div class="rf-panel" id="rf-panel-message">
    <div class="rf-panel-scroll">
      <div class="rf-profile-banner" id="rf-profile-banner">
        <div class="rf-profile-banner-top">
          <div>
            <div class="rf-profile-name" id="rf-banner-name">Reading profile…</div>
            <div class="rf-profile-role" id="rf-banner-role"></div>
            <div class="rf-profile-location" id="rf-banner-location"></div>
          </div>
          <button class="rf-reread-btn" id="rf-reread-btn">↺ Re-read</button>
        </div>
      </div>

      <div class="rf-section">
        <label class="rf-label">Tone</label>
        <div class="rf-tone-group">
          <button class="rf-tone-btn active" data-tone="Professional">Professional</button>
          <button class="rf-tone-btn" data-tone="Friendly">Friendly</button>
          <button class="rf-tone-btn" data-tone="Brief">Brief</button>
        </div>
      </div>

      <div class="rf-sub-tabs">
        <button class="rf-sub-tab-btn active" data-sub="template">📋 Template</button>
        <button class="rf-sub-tab-btn" data-sub="ai">✦ AI Generate</button>
      </div>

      <!-- Template sub-panel -->
      <div class="rf-sub-panel active" id="rf-sub-template">
        <div class="rf-section">
          <label class="rf-label">Select Template</label>
          <select class="rf-select" id="rf-template-select"></select>
        </div>
        <div class="rf-section">
          <label class="rf-label">Message Preview</label>
          <textarea class="rf-textarea" id="rf-message-preview" rows="8" placeholder="Select a template to preview the filled message…"></textarea>
        </div>
      </div>

      <!-- AI sub-panel -->
      <div class="rf-sub-panel" id="rf-sub-ai">
        <button class="rf-btn-ai" id="rf-ai-generate-btn">✦ Generate with AI</button>
        <div class="rf-ai-uses-badge" id="rf-msg-ai-uses" style="margin-bottom:10px;"></div>
        <div id="rf-ai-message-wrap" style="display:none;margin-top:10px;">
          <label class="rf-label">Generated Message</label>
          <textarea class="rf-textarea" id="rf-ai-message-text" rows="8"></textarea>
        </div>
      </div>
    </div>

    <div class="rf-send-panel">
      <button class="rf-btn-primary" id="rf-send-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        Send Message
      </button>
      <div class="rf-limit-bar-wrap">
        <div class="rf-limit-bar-label">
          <span id="rf-limit-count">0</span> / <span id="rf-limit-max">50</span> messages today
          <span id="rf-limit-pct"></span>
        </div>
        <div class="rf-limit-bar-track">
          <div class="rf-limit-bar-fill" id="rf-limit-bar-fill" style="width:0%"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- TRACKER PANEL -->
  <div class="rf-panel" id="rf-panel-tracker">
    <div class="rf-panel-scroll">
      <div class="rf-stats-row" id="rf-tracker-stats">
        <div class="rf-stat-mini"><div class="rf-stat-mini-val" id="rf-stat-total">0</div><div class="rf-stat-mini-label">Total</div></div>
        <div class="rf-stat-mini"><div class="rf-stat-mini-val" id="rf-stat-replied">0</div><div class="rf-stat-mini-label">Replied</div></div>
        <div class="rf-stat-mini"><div class="rf-stat-mini-val" id="rf-stat-hired">0</div><div class="rf-stat-mini-label">Hired</div></div>
      </div>
      <div class="rf-filter-row">
        <input type="text" class="rf-input" id="rf-tracker-search" placeholder="Search by name or company…">
        <select class="rf-select" id="rf-tracker-filter" style="width:auto;padding-right:28px;">
          <option value="">All</option>
          <option value="Sent">Sent</option>
          <option value="Replied">Replied</option>
          <option value="Not Interested">Not Interested</option>
          <option value="Hired">Hired</option>
        </select>
      </div>
      <div id="rf-tracker-list"></div>
      <div class="rf-divider"></div>
      <button class="rf-btn-secondary" id="rf-export-csv-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export CSV
      </button>
    </div>
  </div>

  <!-- SETTINGS PANEL -->
  <div class="rf-panel" id="rf-panel-settings">
    <div class="rf-panel-scroll">
      <div class="rf-settings-group">
        <div class="rf-settings-group-title">Your Info</div>
        <div class="rf-settings-row">
          <label class="rf-label">Your Name</label>
          <input type="text" class="rf-input" id="rf-settings-name" placeholder="Your full name">
        </div>
        <div class="rf-settings-row">
          <label class="rf-label">Your Company</label>
          <input type="text" class="rf-input" id="rf-settings-company" placeholder="Company name">
        </div>
      </div>

      <div class="rf-settings-group">
        <div class="rf-settings-group-title">Daily Limit Guard</div>
        <div class="rf-settings-row">
          <label class="rf-label">Max messages per day</label>
          <input type="number" class="rf-input" id="rf-settings-limit" min="1" max="200" value="50">
        </div>
      </div>

      <button class="rf-btn-primary" id="rf-settings-save-btn" style="margin-bottom:12px;">Save Settings</button>

      <div class="rf-settings-group">
        <div class="rf-settings-group-title">Templates</div>
        <div id="rf-template-list-settings"></div>
        <button class="rf-btn-secondary rf-btn-sm" id="rf-add-template-btn" style="margin-top:8px;">+ Add Template</button>
      </div>

      <div class="rf-settings-group">
        <div class="rf-settings-group-title">Upgrade</div>
        <div style="font-size:12px;color:var(--rf-text-muted);margin-bottom:12px;">
          You are on the <strong>Free plan</strong> — 3 AI generations included.
        </div>
        <button class="rf-btn-ai" disabled style="opacity:0.6;cursor:not-allowed;">
          ✦ Upgrade to Pro — Coming Soon
        </button>
      </div>

      <div class="rf-settings-group" style="border-color:var(--rf-danger)">
        <div class="rf-settings-group-title" style="color:var(--rf-danger)">Danger Zone</div>
        <button class="rf-btn-danger" id="rf-clear-data-btn" style="width:100%;">Clear All Data</button>
      </div>

      <div class="rf-version-line">RecruitFlow v1.0.0 — Free Tier</div>
    </div>
  </div>

  <!-- UPGRADE OVERLAY -->
  <div class="rf-upgrade-overlay" id="rf-upgrade-overlay">
    <div class="rf-upgrade-card">
      <span class="rf-upgrade-icon">🔒</span>
      <div class="rf-upgrade-title">You've used all 3 free AI generations</div>
      <div class="rf-upgrade-sub">Upgrade to RecruitFlow Pro for unlimited access</div>
      <div class="rf-upgrade-price">₹999<span style="font-size:14px;font-weight:400;color:var(--rf-text-muted)">/month</span></div>
      <ul class="rf-upgrade-features">
        <li>Unlimited AI messages</li>
        <li>Unlimited templates</li>
        <li>Unlimited tracking</li>
        <li>PDF uploads</li>
        <li>JD Optimizer</li>
      </ul>
      <button class="rf-btn-ai" disabled style="opacity:0.6;margin-bottom:8px;">Upgrade to Pro — Coming Soon</button>
      <button class="rf-btn-secondary" id="rf-upgrade-dismiss">Maybe Later</button>
    </div>
  </div>

  <!-- NOTES MODAL -->
  <div class="rf-notes-modal" id="rf-notes-modal">
    <div class="rf-notes-inner">
      <div class="rf-notes-title">Notes</div>
      <textarea class="rf-textarea" id="rf-notes-text" rows="5" placeholder="Add notes about this candidate…"></textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
        <button class="rf-btn-primary rf-btn-sm" id="rf-notes-save">Save</button>
        <button class="rf-btn-secondary rf-btn-sm" id="rf-notes-cancel">Cancel</button>
      </div>
    </div>
  </div>

  <!-- TOAST CONTAINER -->
  <div class="rf-toast-container" id="rf-toast-container"></div>

  <!-- ADD TEMPLATE MODAL -->
  <div class="rf-notes-modal" id="rf-add-template-modal">
    <div class="rf-notes-inner">
      <div class="rf-notes-title">New Template</div>
      <div style="margin-bottom:8px;">
        <label class="rf-label">Template Name</label>
        <input type="text" class="rf-input" id="rf-new-tpl-name" placeholder="e.g. Tech Outreach">
      </div>
      <div>
        <label class="rf-label">Message Body</label>
        <textarea class="rf-textarea" id="rf-new-tpl-body" rows="6" placeholder="Use {name}, {role}, {company} etc."></textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
        <button class="rf-btn-primary rf-btn-sm" id="rf-save-new-tpl">Save</button>
        <button class="rf-btn-secondary rf-btn-sm" id="rf-cancel-new-tpl">Cancel</button>
      </div>
    </div>
  </div>
</div>
`;
  }

  // ─── Sidebar injection ────────────────────────────────────────────────────

  function injectSidebar() {
    const container = document.createElement('div');
    container.id = 'recruitflow-sidebar-container';
    container.setAttribute('data-role', 'tech');
    container.innerHTML = buildSidebarHTML();
    document.body.appendChild(container);
    initSidebarLogic(container);
  }

  // ─── Sidebar logic ────────────────────────────────────────────────────────

  function initSidebarLogic(container) {
    let currentProfile = readLinkedInProfile();
    let currentTone = 'Professional';
    let activeSubTab = 'template';
    let currentNoteEntryId = null;
    let trackerEntries = [];

    // State for optimized JD
    let pendingOptimizedJD = null;

    // ── Helper: show toast ───────────────────────────────────────────────
    function showToast(message, type = 'success') {
      const container = document.getElementById('rf-toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = `rf-toast rf-toast-${type}`;
      const icons = { success: '✓', error: '✕', warning: '⚠' };
      toast.innerHTML = `<span>${icons[type] || '•'}</span><span>${message}</span>`;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 3500);
    }

    // ── Helper: update AI uses badge ─────────────────────────────────────
    async function refreshAIUsesBadge() {
      try {
        const usage = await chrome.runtime.sendMessage({ type: 'GET_USAGE' });
        const left = Math.max(0, 3 - (usage.ai_uses_total || 0));
        const isPro = usage.is_pro;
        const text = isPro ? 'Pro: unlimited' : `${left} free AI use${left !== 1 ? 's' : ''} remaining`;
        const jdBadge = document.getElementById('rf-jd-ai-uses');
        const msgBadge = document.getElementById('rf-msg-ai-uses');
        if (jdBadge) jdBadge.textContent = text;
        if (msgBadge) msgBadge.textContent = text;
      } catch (_) {}
    }

    // ── Helper: update limit bar ─────────────────────────────────────────
    async function refreshLimitBar() {
      try {
        const usage = await chrome.runtime.sendMessage({ type: 'GET_USAGE' });
        const count = usage.daily_messages_sent || 0;
        const limit = usage.daily_limit || 50;
        const pct = Math.min(100, Math.round((count / limit) * 100));

        const countEl = document.getElementById('rf-limit-count');
        const maxEl = document.getElementById('rf-limit-max');
        const pctEl = document.getElementById('rf-limit-pct');
        const fill = document.getElementById('rf-limit-bar-fill');

        if (countEl) countEl.textContent = count;
        if (maxEl) maxEl.textContent = limit;
        if (pctEl) pctEl.textContent = pct + '%';
        if (fill) {
          fill.style.width = pct + '%';
          fill.className = 'rf-limit-bar-fill' + (pct >= 100 ? ' danger' : pct >= 80 ? ' warning' : '');
        }
      } catch (_) {}
    }

    // ── Profile banner ───────────────────────────────────────────────────
    function updateProfileBanner(profile) {
      currentProfile = profile;
      const nameEl = document.getElementById('rf-banner-name');
      const roleEl = document.getElementById('rf-banner-role');
      const locEl = document.getElementById('rf-banner-location');
      const headerName = document.getElementById('rf-header-name');

      if (nameEl) nameEl.textContent = profile.name || 'Unknown';
      if (roleEl) roleEl.textContent = profile.role ? `${profile.role}${profile.company ? ' @ ' + profile.company : ''}` : '';
      if (locEl) locEl.textContent = profile.location || '';
      if (headerName) headerName.textContent = profile.name ? profile.name.split(' ')[0] : '';

      fillActiveTemplate();
    }

    // ── Template filling ─────────────────────────────────────────────────
    async function fillActiveTemplate() {
      try {
        const select = document.getElementById('rf-template-select');
        const preview = document.getElementById('rf-message-preview');
        if (!select || !preview) return;

        const selectedId = select.value;
        const result = await chrome.storage.local.get('recruitflow_templates');
        const templates = result.recruitflow_templates || [];
        const tpl = templates.find(t => t.id === selectedId) || templates[0];
        if (!tpl) return;

        const settingsResult = await chrome.storage.local.get('recruitflow_settings');
        const settings = settingsResult.recruitflow_settings || {};

        const jdResult = await chrome.storage.local.get(['recruitflow_jds', 'recruitflow_active_jd']);
        const jds = jdResult.recruitflow_jds || [];
        const activeId = jdResult.recruitflow_active_jd;
        const activeJD = jds.find(j => j.id === activeId) || jds[0];
        const jdTitle = activeJD?.title || '';

        const filled = fillTemplateLocal(tpl.body, currentProfile, jdTitle, settings);
        preview.value = filled;
      } catch (e) {
        console.error('RecruitFlow: fillActiveTemplate error', e);
      }
    }

    function fillTemplateLocal(body, profileData = {}, jdTitle = '', recruiterData = {}) {
      const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      const firstName = (profileData.name || '').split(' ')[0];
      return body
        .replace(/\{name\}/g, firstName)
        .replace(/\{full_name\}/g, profileData.name || '')
        .replace(/\{role\}/g, profileData.role || '')
        .replace(/\{company\}/g, profileData.company || '')
        .replace(/\{location\}/g, profileData.location || '')
        .replace(/\{jd_title\}/g, jdTitle)
        .replace(/\{recruiter_name\}/g, recruiterData.recruiter_name || '')
        .replace(/\{recruiter_company\}/g, recruiterData.recruiter_company || '')
        .replace(/\{today\}/g, today);
    }

    // ── Load templates into select ───────────────────────────────────────
    async function loadTemplateSelect() {
      try {
        const result = await chrome.storage.local.get('recruitflow_templates');
        const templates = result.recruitflow_templates || [];
        const select = document.getElementById('rf-template-select');
        if (!select) return;
        select.innerHTML = templates.map(t =>
          `<option value="${t.id}">${t.name}</option>`
        ).join('');
        fillActiveTemplate();
        renderTemplateSettings(templates);
      } catch (e) {
        console.error('RecruitFlow: loadTemplateSelect error', e);
      }
    }

    function renderTemplateSettings(templates) {
      const list = document.getElementById('rf-template-list-settings');
      if (!list) return;
      if (templates.length === 0) {
        list.innerHTML = '<div style="font-size:12px;color:var(--rf-text-muted);">No templates saved.</div>';
        return;
      }
      list.innerHTML = templates.map(t => `
        <div class="rf-template-card" style="cursor:default;">
          <div class="rf-template-card-header">
            <span class="rf-template-card-name">${t.name}</span>
            ${!t.id.startsWith('default_') ? `<button class="rf-icon-btn" data-delete-tpl="${t.id}" title="Delete"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg></button>` : ''}
          </div>
          <div class="rf-template-card-preview">${t.body.substring(0, 80)}…</div>
        </div>
      `).join('');

      list.querySelectorAll('[data-delete-tpl]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-delete-tpl');
          try {
            const result = await chrome.storage.local.get('recruitflow_templates');
            const templates = (result.recruitflow_templates || []).filter(t => t.id !== id);
            await chrome.storage.local.set({ recruitflow_templates: templates });
            await loadTemplateSelect();
            showToast('Template deleted.', 'success');
          } catch (e) {
            showToast('Failed to delete template.', 'error');
          }
        });
      });
    }

    // ── Load JD select ───────────────────────────────────────────────────
    async function loadJDSelect() {
      try {
        const result = await chrome.storage.local.get(['recruitflow_jds', 'recruitflow_active_jd']);
        const jds = result.recruitflow_jds || [];
        const activeId = result.recruitflow_active_jd;

        const select = document.getElementById('rf-jd-select');
        const titleInput = document.getElementById('rf-jd-title');
        const textArea = document.getElementById('rf-jd-text');

        if (select) {
          select.innerHTML = `<option value="">No JD selected — paste one below</option>` +
            jds.map(j => `<option value="${j.id}" ${j.id === activeId ? 'selected' : ''}>${j.title}</option>`).join('');
        }

        const active = jds.find(j => j.id === activeId) || jds[0];
        if (active) {
          if (titleInput) titleInput.value = active.title;
          if (textArea) textArea.value = active.text;
          container.setAttribute('data-role', active.roleCategory || 'tech');
        }
      } catch (e) {
        console.error('RecruitFlow: loadJDSelect error', e);
      }
    }

    // ── Load tracker ─────────────────────────────────────────────────────
    async function loadTracker(searchQ = '', filterStatus = '') {
      try {
        const result = await chrome.storage.local.get('recruitflow_tracker');
        let entries = result.recruitflow_tracker || [];
        entries = entries.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
        trackerEntries = entries;

        const statsResult = await chrome.storage.local.get('recruitflow_tracker');
        const all = statsResult.recruitflow_tracker || [];
        document.getElementById('rf-stat-total').textContent = all.length;
        document.getElementById('rf-stat-replied').textContent = all.filter(e => e.status === 'Replied').length;
        document.getElementById('rf-stat-hired').textContent = all.filter(e => e.status === 'Hired').length;

        let filtered = entries;
        if (searchQ) {
          const q = searchQ.toLowerCase();
          filtered = filtered.filter(e =>
            (e.candidateName || '').toLowerCase().includes(q) ||
            (e.candidateCompany || '').toLowerCase().includes(q) ||
            (e.candidateRole || '').toLowerCase().includes(q)
          );
        }
        if (filterStatus) {
          filtered = filtered.filter(e => e.status === filterStatus);
        }

        renderTrackerList(filtered);
      } catch (e) {
        console.error('RecruitFlow: loadTracker error', e);
      }
    }

    function renderTrackerList(entries) {
      const list = document.getElementById('rf-tracker-list');
      if (!list) return;

      if (entries.length === 0) {
        list.innerHTML = `
          <div class="rf-empty-state">
            <span class="rf-empty-state-icon">📭</span>
            <div class="rf-empty-state-title">No messages logged yet</div>
            <div class="rf-empty-state-sub">Messages you send will appear here automatically.</div>
          </div>`;
        return;
      }

      list.innerHTML = entries.map(e => {
        const statusBadgeClass = {
          'Sent': 'rf-badge-sent',
          'Replied': 'rf-badge-replied',
          'Not Interested': 'rf-badge-notinterested',
          'Hired': 'rf-badge-hired'
        }[e.status] || 'rf-badge-sent';

        const date = e.sentAt ? new Date(e.sentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

        return `<div class="rf-tracker-row" data-id="${e.id}">
          <div class="rf-tracker-info">
            <div class="rf-tracker-name" data-url="${e.candidateUrl || ''}">${e.candidateName || 'Unknown'}</div>
            <div class="rf-tracker-meta">${e.candidateRole || ''}${e.candidateRole && e.jdTitle ? ' · ' : ''}${e.jdTitle || ''} ${date ? '· ' + date : ''}</div>
          </div>
          <select class="rf-tracker-status-select" data-id="${e.id}">
            <option ${e.status === 'Sent' ? 'selected' : ''}>Sent</option>
            <option ${e.status === 'Replied' ? 'selected' : ''}>Replied</option>
            <option ${e.status === 'Not Interested' ? 'selected' : ''}>Not Interested</option>
            <option ${e.status === 'Hired' ? 'selected' : ''}>Hired</option>
          </select>
          <div class="rf-tracker-actions">
            <button class="rf-icon-btn" data-notes-id="${e.id}" title="Notes">
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="rf-icon-btn" data-del-id="${e.id}" title="Delete">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        </div>`;
      }).join('');

      // Bind events
      list.querySelectorAll('.rf-tracker-name[data-url]').forEach(el => {
        el.addEventListener('click', () => {
          const url = el.getAttribute('data-url');
          if (url) window.open(url, '_blank');
        });
      });

      list.querySelectorAll('.rf-tracker-status-select').forEach(sel => {
        sel.addEventListener('change', async () => {
          const id = sel.getAttribute('data-id');
          try {
            const result = await chrome.storage.local.get('recruitflow_tracker');
            const entries = result.recruitflow_tracker || [];
            const idx = entries.findIndex(e => e.id === id);
            if (idx >= 0) { entries[idx].status = sel.value; }
            await chrome.storage.local.set({ recruitflow_tracker: entries });
            showToast('Status updated.', 'success');
            loadTracker(
              document.getElementById('rf-tracker-search')?.value || '',
              document.getElementById('rf-tracker-filter')?.value || ''
            );
          } catch (e) { showToast('Failed to update status.', 'error'); }
        });
      });

      list.querySelectorAll('[data-notes-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-notes-id');
          const entry = trackerEntries.find(e => e.id === id);
          currentNoteEntryId = id;
          const notesText = document.getElementById('rf-notes-text');
          if (notesText) notesText.value = entry?.notes || '';
          document.getElementById('rf-notes-modal').classList.add('visible');
        });
      });

      list.querySelectorAll('[data-del-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-del-id');
          if (!confirm('Delete this entry?')) return;
          try {
            const result = await chrome.storage.local.get('recruitflow_tracker');
            const entries = (result.recruitflow_tracker || []).filter(e => e.id !== id);
            await chrome.storage.local.set({ recruitflow_tracker: entries });
            showToast('Entry deleted.', 'success');
            loadTracker();
          } catch (e) { showToast('Failed to delete.', 'error'); }
        });
      });
    }

    // ── Load settings ────────────────────────────────────────────────────
    async function loadSettings() {
      try {
        const result = await chrome.storage.local.get(['recruitflow_settings', 'recruitflow_usage']);
        const settings = result.recruitflow_settings || {};
        const usage = result.recruitflow_usage || {};

        const nameEl = document.getElementById('rf-settings-name');
        const companyEl = document.getElementById('rf-settings-company');
        const limitEl = document.getElementById('rf-settings-limit');

        if (nameEl) nameEl.value = settings.recruiter_name || '';
        if (companyEl) companyEl.value = settings.recruiter_company || '';
        if (limitEl) limitEl.value = settings.daily_limit || usage.daily_limit || 50;
      } catch (e) {
        console.error('RecruitFlow: loadSettings error', e);
      }
    }

    // ── Tab switching ────────────────────────────────────────────────────
    container.querySelectorAll('.rf-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        container.querySelectorAll('.rf-tab-btn').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.rf-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`rf-panel-${tab}`)?.classList.add('active');
        if (tab === 'tracker') loadTracker();
        if (tab === 'settings') loadSettings();
        if (tab === 'message') refreshLimitBar();
      });
    });

    // ── Sub-tab switching ────────────────────────────────────────────────
    container.querySelectorAll('.rf-sub-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSubTab = btn.getAttribute('data-sub');
        container.querySelectorAll('.rf-sub-tab-btn').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.rf-sub-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`rf-sub-${activeSubTab}`)?.classList.add('active');
      });
    });

    // ── Tone buttons ─────────────────────────────────────────────────────
    container.querySelectorAll('.rf-tone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.rf-tone-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTone = btn.getAttribute('data-tone');
      });
    });

    // ── Template select change ───────────────────────────────────────────
    document.getElementById('rf-template-select')?.addEventListener('change', () => {
      fillActiveTemplate();
    });

    // ── Toggle sidebar ───────────────────────────────────────────────────
    document.getElementById('rf-toggle-tab')?.addEventListener('click', () => {
      container.classList.toggle('collapsed');
    });

    // ── Re-read profile ──────────────────────────────────────────────────
    document.getElementById('rf-reread-btn')?.addEventListener('click', () => {
      currentProfile = readLinkedInProfile();
      updateProfileBanner(currentProfile);
      showToast('Profile re-read.', 'success');
    });

    // ── JD select change ─────────────────────────────────────────────────
    document.getElementById('rf-jd-select')?.addEventListener('change', async () => {
      const id = document.getElementById('rf-jd-select').value;
      if (!id) return;
      try {
        const result = await chrome.storage.local.get('recruitflow_jds');
        const jds = result.recruitflow_jds || [];
        const jd = jds.find(j => j.id === id);
        if (jd) {
          document.getElementById('rf-jd-title').value = jd.title;
          document.getElementById('rf-jd-text').value = jd.text;
          await chrome.storage.local.set({ recruitflow_active_jd: id });
          container.setAttribute('data-role', jd.roleCategory || 'tech');
        }
      } catch (e) { showToast('Failed to load JD.', 'error'); }
    });

    // ── Save JD ──────────────────────────────────────────────────────────
    document.getElementById('rf-jd-save-btn')?.addEventListener('click', async () => {
      const title = document.getElementById('rf-jd-title')?.value?.trim();
      const text = document.getElementById('rf-jd-text')?.value?.trim();
      if (!title || !text) { showToast('Please enter a title and JD text.', 'warning'); return; }

      try {
        const result = await chrome.storage.local.get('recruitflow_jds');
        const jds = result.recruitflow_jds || [];
        const category = detectRoleCategory(text);
        const jd = { id: 'jd_' + Date.now(), title, text, roleCategory: category, createdAt: new Date().toISOString() };
        jds.unshift(jd);
        await chrome.storage.local.set({ recruitflow_jds: jds, recruitflow_active_jd: jd.id });
        container.setAttribute('data-role', category);
        await loadJDSelect();
        showToast('JD saved!', 'success');
      } catch (e) { showToast('Failed to save JD.', 'error'); }
    });

    // ── Upload PDF ───────────────────────────────────────────────────────
    document.getElementById('rf-jd-upload-btn')?.addEventListener('click', () => {
      document.getElementById('rf-jd-pdf-input')?.click();
    });

    document.getElementById('rf-jd-pdf-input')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        // Load PDF.js dynamically
        if (typeof pdfjsLib === 'undefined') {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map(item => item.str).join(' ') + '\n';
        }
        const cleaned = fullText.replace(/\s+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
        document.getElementById('rf-jd-text').value = cleaned;
        if (!document.getElementById('rf-jd-title').value) {
          document.getElementById('rf-jd-title').value = file.name.replace('.pdf', '').replace(/_/g, ' ');
        }
        showToast('PDF extracted!', 'success');
      } catch (e) {
        showToast('Could not read PDF. Please paste the text manually.', 'error');
      }
      e.target.value = '';
    });

    // ── Optimize JD with AI ──────────────────────────────────────────────
    document.getElementById('rf-jd-optimize-btn')?.addEventListener('click', async () => {
      const jdText = document.getElementById('rf-jd-text')?.value?.trim();
      if (!jdText) { showToast('Please paste a JD first.', 'warning'); return; }

      const btn = document.getElementById('rf-jd-optimize-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="rf-spinner"></span> Optimizing…';

      try {
        const result = await chrome.runtime.sendMessage({ type: 'OPTIMIZE_JD', jdText });

        if (result.limitReached) {
          document.getElementById('rf-upgrade-overlay').classList.add('visible');
          return;
        }

        if (!result.success) {
          showToast(result.error || 'AI unavailable. Please try again.', 'error');
          return;
        }

        pendingOptimizedJD = result.optimized;
        document.getElementById('rf-jd-original-preview').textContent = jdText.substring(0, 400) + '…';
        document.getElementById('rf-jd-optimized-preview').textContent = result.optimized.substring(0, 400) + '…';
        document.getElementById('rf-jd-optimized-section').style.display = 'block';
        await refreshAIUsesBadge();
        showToast('JD optimized!', 'success');
      } catch (e) {
        showToast('AI unavailable. Please try again.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '✦ Optimize with AI';
      }
    });

    document.getElementById('rf-jd-accept-btn')?.addEventListener('click', () => {
      if (pendingOptimizedJD) {
        document.getElementById('rf-jd-text').value = pendingOptimizedJD;
        document.getElementById('rf-jd-optimized-section').style.display = 'none';
        pendingOptimizedJD = null;
        showToast('Optimized JD applied!', 'success');
      }
    });

    document.getElementById('rf-jd-reject-btn')?.addEventListener('click', () => {
      document.getElementById('rf-jd-optimized-section').style.display = 'none';
      pendingOptimizedJD = null;
    });

    // ── AI Generate message ──────────────────────────────────────────────
    document.getElementById('rf-ai-generate-btn')?.addEventListener('click', async () => {
      const jdResult = await chrome.storage.local.get(['recruitflow_jds', 'recruitflow_active_jd']);
      const jds = jdResult.recruitflow_jds || [];
      const activeId = jdResult.recruitflow_active_jd;
      const activeJD = jds.find(j => j.id === activeId) || jds[0];
      const jdText = activeJD?.text || '';

      const btn = document.getElementById('rf-ai-generate-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="rf-spinner"></span> Generating…';

      try {
        const result = await chrome.runtime.sendMessage({
          type: 'GENERATE_MESSAGE',
          profileData: currentProfile,
          jdText,
          tone: currentTone
        });

        if (result.limitReached) {
          document.getElementById('rf-upgrade-overlay').classList.add('visible');
          return;
        }

        if (!result.success) {
          showToast(result.error || 'AI unavailable. Please try again.', 'error');
          return;
        }

        const aiMsgWrap = document.getElementById('rf-ai-message-wrap');
        const aiMsgText = document.getElementById('rf-ai-message-text');
        if (aiMsgWrap) aiMsgWrap.style.display = 'block';
        if (aiMsgText) aiMsgText.value = result.message;
        await refreshAIUsesBadge();
        showToast('Message generated!', 'success');
      } catch (e) {
        showToast('AI unavailable. Please try again.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '✦ Generate with AI';
      }
    });

    // ── Send message ─────────────────────────────────────────────────────
    document.getElementById('rf-send-btn')?.addEventListener('click', async () => {
      let messageText = '';

      if (activeSubTab === 'template') {
        messageText = document.getElementById('rf-message-preview')?.value?.trim();
      } else {
        messageText = document.getElementById('rf-ai-message-text')?.value?.trim();
      }

      if (!messageText) {
        showToast('No message to send. Write or generate one first.', 'warning');
        return;
      }

      const btn = document.getElementById('rf-send-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="rf-spinner"></span> Sending…';

      try {
        await sendLinkedInMessage(messageText);

        // Log to tracker
        const jdResult = await chrome.storage.local.get(['recruitflow_jds', 'recruitflow_active_jd']);
        const jds = jdResult.recruitflow_jds || [];
        const activeId = jdResult.recruitflow_active_jd;
        const activeJD = jds.find(j => j.id === activeId) || jds[0];

        const trackerResult = await chrome.storage.local.get('recruitflow_tracker');
        const tracker = trackerResult.recruitflow_tracker || [];
        const entry = {
          id: 'msg_' + Date.now(),
          candidateName: currentProfile.name || '',
          candidateUrl: currentProfile.profileUrl || '',
          candidateRole: currentProfile.role || '',
          candidateCompany: currentProfile.company || '',
          jdTitle: activeJD?.title || '',
          messageSent: messageText,
          sentAt: new Date().toISOString(),
          status: 'Sent',
          notes: ''
        };
        tracker.unshift(entry);
        await chrome.storage.local.set({ recruitflow_tracker: tracker });

        // Increment daily count
        await chrome.runtime.sendMessage({ type: 'INCREMENT_DAILY_COUNT' });
        await refreshLimitBar();

        showToast('Message sent and logged!', 'success');
      } catch (e) {
        showToast(`Send failed: ${e.message}`, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Message';
      }
    });

    // ── Tracker search & filter ──────────────────────────────────────────
    document.getElementById('rf-tracker-search')?.addEventListener('input', () => {
      loadTracker(
        document.getElementById('rf-tracker-search').value,
        document.getElementById('rf-tracker-filter').value
      );
    });

    document.getElementById('rf-tracker-filter')?.addEventListener('change', () => {
      loadTracker(
        document.getElementById('rf-tracker-search').value,
        document.getElementById('rf-tracker-filter').value
      );
    });

    // ── Export CSV ───────────────────────────────────────────────────────
    document.getElementById('rf-export-csv-btn')?.addEventListener('click', async () => {
      try {
        const result = await chrome.storage.local.get('recruitflow_tracker');
        const entries = result.recruitflow_tracker || [];
        const headers = ['Name', 'Role', 'Company', 'LinkedIn URL', 'JD Title', 'Message Sent', 'Sent At', 'Status', 'Notes'];
        const rows = entries.map(e => [
          `"${(e.candidateName || '').replace(/"/g, '""')}"`,
          `"${(e.candidateRole || '').replace(/"/g, '""')}"`,
          `"${(e.candidateCompany || '').replace(/"/g, '""')}"`,
          `"${(e.candidateUrl || '').replace(/"/g, '""')}"`,
          `"${(e.jdTitle || '').replace(/"/g, '""')}"`,
          `"${(e.messageSent || '').replace(/"/g, '""')}"`,
          `"${e.sentAt || ''}"`,
          `"${e.status || ''}"`,
          `"${(e.notes || '').replace(/"/g, '""')}"`
        ].join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recruitflow-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('CSV exported!', 'success');
      } catch (e) { showToast('Export failed.', 'error'); }
    });

    // ── Notes modal ──────────────────────────────────────────────────────
    document.getElementById('rf-notes-save')?.addEventListener('click', async () => {
      const notesText = document.getElementById('rf-notes-text')?.value || '';
      if (!currentNoteEntryId) return;
      try {
        const result = await chrome.storage.local.get('recruitflow_tracker');
        const entries = result.recruitflow_tracker || [];
        const idx = entries.findIndex(e => e.id === currentNoteEntryId);
        if (idx >= 0) entries[idx].notes = notesText;
        await chrome.storage.local.set({ recruitflow_tracker: entries });
        document.getElementById('rf-notes-modal').classList.remove('visible');
        showToast('Notes saved.', 'success');
        loadTracker();
      } catch (e) { showToast('Failed to save notes.', 'error'); }
    });

    document.getElementById('rf-notes-cancel')?.addEventListener('click', () => {
      document.getElementById('rf-notes-modal').classList.remove('visible');
    });

    // ── Settings save ────────────────────────────────────────────────────
    document.getElementById('rf-settings-save-btn')?.addEventListener('click', async () => {
      const name = document.getElementById('rf-settings-name')?.value?.trim() || '';
      const company = document.getElementById('rf-settings-company')?.value?.trim() || '';
      const limit = parseInt(document.getElementById('rf-settings-limit')?.value) || 50;

      try {
        const usageResult = await chrome.storage.local.get('recruitflow_usage');
        const usage = usageResult.recruitflow_usage || {};
        usage.daily_limit = limit;
        await chrome.storage.local.set({
          recruitflow_settings: { recruiter_name: name, recruiter_company: company, daily_limit: limit },
          recruitflow_usage: usage
        });
        showToast('Settings saved!', 'success');
        await refreshLimitBar();
        fillActiveTemplate();
      } catch (e) { showToast('Failed to save settings.', 'error'); }
    });

    // ── Clear all data ───────────────────────────────────────────────────
    document.getElementById('rf-clear-data-btn')?.addEventListener('click', async () => {
      if (!confirm('Clear ALL RecruitFlow data? This cannot be undone.')) return;
      try {
        await chrome.storage.local.clear();
        showToast('All data cleared. Reloading…', 'warning');
        setTimeout(() => window.location.reload(), 1500);
      } catch (e) { showToast('Failed to clear data.', 'error'); }
    });

    // ── Add template ─────────────────────────────────────────────────────
    document.getElementById('rf-add-template-btn')?.addEventListener('click', () => {
      document.getElementById('rf-new-tpl-name').value = '';
      document.getElementById('rf-new-tpl-body').value = '';
      document.getElementById('rf-add-template-modal').classList.add('visible');
    });

    document.getElementById('rf-save-new-tpl')?.addEventListener('click', async () => {
      const name = document.getElementById('rf-new-tpl-name')?.value?.trim();
      const body = document.getElementById('rf-new-tpl-body')?.value?.trim();
      if (!name || !body) { showToast('Please fill in both fields.', 'warning'); return; }
      try {
        const result = await chrome.storage.local.get('recruitflow_templates');
        const templates = result.recruitflow_templates || [];
        templates.push({ id: 'tpl_' + Date.now(), name, body, createdAt: new Date().toISOString() });
        await chrome.storage.local.set({ recruitflow_templates: templates });
        document.getElementById('rf-add-template-modal').classList.remove('visible');
        await loadTemplateSelect();
        showToast('Template saved!', 'success');
      } catch (e) { showToast('Failed to save template.', 'error'); }
    });

    document.getElementById('rf-cancel-new-tpl')?.addEventListener('click', () => {
      document.getElementById('rf-add-template-modal').classList.remove('visible');
    });

    // ── Upgrade overlay dismiss ──────────────────────────────────────────
    document.getElementById('rf-upgrade-dismiss')?.addEventListener('click', () => {
      document.getElementById('rf-upgrade-overlay').classList.remove('visible');
    });

    // ── Role category detection ──────────────────────────────────────────
    function detectRoleCategory(text) {
      const t = (text || '').toLowerCase();
      if (/react|node|python|java|developer|engineer|devops|frontend|backend|fullstack|aws|cloud/.test(t)) return 'tech';
      if (/sales|revenue|business development|account executive|quota|target/.test(t)) return 'sales';
      if (/hr|human resource|talent|recruiter|people ops|culture/.test(t)) return 'hr';
      if (/finance|accounting|cpa|audit|tax|controller|cfo/.test(t)) return 'finance';
      return 'other';
    }

    // ── Listen for profile updates from MutationObserver ────────────────
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'PROFILE_UPDATED') {
        updateProfileBanner(msg.profile);
      }
    });

    // ── INIT ─────────────────────────────────────────────────────────────
    updateProfileBanner(currentProfile);
    loadTemplateSelect();
    loadJDSelect();
    refreshAIUsesBadge();
    refreshLimitBar();
  }

  // ─── Runtime message handler (for sidebar.js requests) ───────────────────────

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'REREAD_PROFILE') {
      try {
        const profile = readLinkedInProfile();
        sendResponse({ profile });
        // Also dispatch custom event so sidebar.js updateProfileBanner runs
        window.dispatchEvent(new CustomEvent('rf-profile-updated', { detail: profile }));
      } catch (e) {
        sendResponse({ profile: null, error: e.message });
      }
      return true;
    }

    if (message.type === 'SEND_LINKEDIN_MESSAGE') {
      sendLinkedInMessage(message.message)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }
  });

  // ─── SPA URL change observer ──────────────────────────────────────────────

  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (location.href.includes('/in/')) {
        setTimeout(() => {
          const profile = readLinkedInProfile();
          try {
            chrome.runtime.sendMessage({ type: 'PROFILE_UPDATED', profile });
          } catch (_) {}
          const nameEl = document.getElementById('rf-banner-name');
          const roleEl = document.getElementById('rf-banner-role');
          const locEl = document.getElementById('rf-banner-location');
          const headerName = document.getElementById('rf-header-name');
          if (nameEl) nameEl.textContent = profile.name || 'Unknown';
          if (roleEl) roleEl.textContent = profile.role ? `${profile.role}${profile.company ? ' @ ' + profile.company : ''}` : '';
          if (locEl) locEl.textContent = profile.location || '';
          if (headerName) headerName.textContent = profile.name ? profile.name.split(' ')[0] : '';
        }, 1500);
      }
    }
  }).observe(document, { subtree: true, childList: true });

  // ─── Boot ─────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSidebar);
  } else {
    injectSidebar();
  }
})();
