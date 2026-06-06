(function () {
  'use strict';

  if (document.getElementById('recruitflow-sidebar-container')) return;

  // ── Profile reading ───────────────────────────────────────────────────────
  function getFirst(selectors) {
    for (const s of selectors) {
      try { const el = document.querySelector(s); if (el?.innerText?.trim()) return el.innerText.trim(); } catch (_) {}
    }
    return '';
  }

  function getCompany() {
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

  function readProfile() {
    return {
      name:       getFirst(['h1.text-heading-xlarge','h1.inline.t-24','.pv-text-details__left-panel h1','h1']),
      role:       getFirst(['.text-body-medium.break-words','.pv-text-details__left-panel .text-body-medium','[data-field="headline"]']),
      company:    getCompany(),
      location:   getFirst(['.text-body-small.inline.t-black--light','.pv-text-details__left-panel .text-body-small']),
      profileUrl: window.location.href
    };
  }

  // ── LinkedIn message send ─────────────────────────────────────────────────
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

  // ── Sidebar HTML ──────────────────────────────────────────────────────────
  function buildHTML() {
    return `
<div class="rf-toggle-tab" id="rf-toggle-tab" title="Toggle RecruitFlow">
  <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
</div>
<div class="rf-sidebar">

  <!-- Header -->
  <div class="rf-header">
    <div class="rf-logo-icon">RF</div>
    <span class="rf-logo-text">RecruitFlow</span>
    <div class="rf-header-spacer"></div>
    <span class="rf-profile-mini-name" id="rf-header-name"></span>
    <button class="rf-close-btn" id="rf-close-btn" title="Close sidebar">✕</button>
  </div>

  <!-- ── AUTH SCREEN (shown when not logged in) ── -->
  <div id="rf-auth-screen" class="rf-auth-screen" style="display:none;">
    <div class="rf-auth-hero">
      <svg width="80" height="60" viewBox="0 0 80 60" fill="none">
        <ellipse cx="40" cy="30" rx="36" ry="26" fill="url(#ag2)"/>
        <radialGradient id="ag2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#2563EB" stop-opacity=".15"/>
          <stop offset="100%" stop-color="#2563EB" stop-opacity="0"/>
        </radialGradient>
        <circle cx="40" cy="26" r="13" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.5"/>
        <circle cx="40" cy="22" r="4.5" fill="#2563EB"/>
        <path d="M30 34 Q40 28 50 34" stroke="#2563EB" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      </svg>
      <p class="rf-auth-tagline">AI-powered LinkedIn outreach</p>
    </div>
    <!-- Tab toggle -->
    <div class="rf-auth-toggle">
      <button class="rf-auth-tab active" data-auth-tab="login">Sign In</button>
      <button class="rf-auth-tab" data-auth-tab="signup">Sign Up</button>
    </div>
    <!-- LOGIN -->
    <div id="rf-login-form" class="rf-auth-form">
      <div class="rf-field-group">
        <label class="rf-label">Email</label>
        <input id="rf-login-email" type="email" class="rf-input" placeholder="you@company.com" autocomplete="email">
      </div>
      <div class="rf-field-group">
        <label class="rf-label">Password</label>
        <div class="rf-pw-wrap">
          <input id="rf-login-password" type="password" class="rf-input" placeholder="Your password" autocomplete="current-password">
          <button type="button" class="rf-pw-toggle" data-target="rf-login-password">👁</button>
        </div>
      </div>
      <div id="rf-login-error" class="rf-auth-error" style="display:none;"></div>
      <button id="rf-login-btn" class="rf-btn-primary">Sign In</button>
    </div>
    <!-- SIGNUP -->
    <div id="rf-signup-form" class="rf-auth-form" style="display:none;">
      <div class="rf-field-group">
        <label class="rf-label">Full Name</label>
        <input id="rf-signup-name" type="text" class="rf-input" placeholder="Rahul Sharma">
      </div>
      <div class="rf-field-group">
        <label class="rf-label">Email</label>
        <input id="rf-signup-email" type="email" class="rf-input" placeholder="you@company.com" autocomplete="email">
      </div>
      <div class="rf-field-group">
        <label class="rf-label">Password <span style="font-weight:400;color:#94A3B8;font-size:10px;">(min 6 chars)</span></label>
        <div class="rf-pw-wrap">
          <input id="rf-signup-password" type="password" class="rf-input" placeholder="Create a password" autocomplete="new-password">
          <button type="button" class="rf-pw-toggle" data-target="rf-signup-password">👁</button>
        </div>
      </div>
      <div id="rf-signup-error" class="rf-auth-error" style="display:none;"></div>
      <button id="rf-signup-btn" class="rf-btn-primary">Create Account & Send OTP</button>
    </div>
    <!-- OTP VERIFY -->
    <div id="rf-otp-form" class="rf-auth-form" style="display:none;">
      <div class="rf-otp-sent-msg">
        <span>📧</span>
        <p>A 6-digit code was sent to<br><strong id="rf-otp-email-display"></strong></p>
      </div>
      <div class="rf-field-group">
        <label class="rf-label">Enter OTP</label>
        <input id="rf-otp-input" type="text" class="rf-input rf-otp-input" placeholder="000000" maxlength="6" inputmode="numeric" autocomplete="one-time-code">
      </div>
      <div id="rf-otp-error" class="rf-auth-error" style="display:none;"></div>
      <button id="rf-otp-verify-btn" class="rf-btn-primary">Verify & Create Account</button>
      <button id="rf-otp-resend-btn" class="rf-btn-secondary rf-btn-sm" style="margin-top:6px;">↺ Resend OTP</button>
      <button id="rf-otp-back-btn" class="rf-btn-secondary rf-btn-sm" style="margin-top:4px;">← Back</button>
    </div>
    <!-- Logged-in user display (shown when user is signed in, with sign-out option) -->
    <div id="rf-auth-user-bar" style="display:none;padding:8px 14px;background:#F8FAFC;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;justify-content:space-between;">
      <span id="rf-auth-user-name" style="font-size:12px;font-weight:600;color:#0F172A;"></span>
      <button id="rf-signout-btn" style="font-size:11px;color:#64748B;background:none;border:none;cursor:pointer;">Sign out</button>
    </div>
  </div>

  <!-- Tabs -->
  <div class="rf-tabs">
    <button class="rf-tab-btn" data-tab="jd">
      <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
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

  <!-- ── JD PANEL ── -->
  <div class="rf-panel" id="rf-panel-jd">
    <div class="rf-panel-scroll">
      <div class="rf-section">
        <label class="rf-label">Active JD</label>
        <div style="display:flex;gap:6px;">
          <select id="rf-jd-select" class="rf-select" style="flex:1;"></select>
          <button id="rf-jd-new-btn" class="rf-icon-btn" style="width:34px;height:36px;font-size:18px;border-radius:8px !important;flex-shrink:0;">+</button>
        </div>
      </div>
      <div class="rf-section">
        <label class="rf-label">JD Title</label>
        <input id="rf-jd-title" class="rf-input" type="text" placeholder="e.g. Senior React Developer — Pune">
      </div>
      <div class="rf-section">
        <label class="rf-label">Job Description</label>
        <textarea id="rf-jd-text" class="rf-textarea" rows="7" placeholder="Paste your job description here…"></textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:9px;">
        <button id="rf-pdf-upload-btn" class="rf-btn-secondary rf-btn-sm">📎 Upload PDF</button>
        <button id="rf-jd-save-btn"    class="rf-btn-secondary rf-btn-sm">💾 Save JD</button>
        <input id="rf-pdf-input" type="file" accept=".pdf" style="display:none !important;">
        <span id="rf-pdf-status" style="font-size:10px;color:#059669;grid-column:1/-1;"></span>
      </div>
      <button id="rf-jd-optimize-btn" class="rf-btn-ai">
        ✦ Optimize with AI <span class="rf-ai-uses-badge"></span>
      </button>
      <div id="rf-optimized-section" style="display:none;margin-top:12px;">
        <div class="rf-divider"></div>
        <label class="rf-label">AI-optimized version</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:8px;">
          <div>
            <div style="font-size:9px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">Original</div>
            <div id="rf-jd-original-preview" style="font-size:11px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:7px;padding:7px;max-height:110px;overflow-y:auto;white-space:pre-wrap;line-height:1.4;color:#0F172A;"></div>
          </div>
          <div>
            <div style="font-size:9px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">Optimized ✦</div>
            <div id="rf-jd-optimized-preview" style="font-size:11px;background:#F5F3FF;border:1px solid #C4B5FD;border-radius:7px;padding:7px;max-height:110px;overflow-y:auto;white-space:pre-wrap;line-height:1.4;color:#0F172A;"></div>
          </div>
        </div>
        <input type="hidden" id="rf-pending-optimized">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;">
          <button id="rf-jd-accept-btn" class="rf-btn-primary rf-btn-sm">✓ Accept</button>
          <button id="rf-jd-reject-btn" class="rf-btn-secondary rf-btn-sm">✕ Reject</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ── MESSAGE PANEL ── -->
  <div class="rf-panel" id="rf-panel-message">
    <div class="rf-panel-scroll">
      <div class="rf-profile-banner" id="rf-profile-banner">
        <div class="rf-profile-banner-top">
          <div>
            <div class="rf-profile-name" id="rf-banner-name">Reading profile…</div>
            <div class="rf-profile-role" id="rf-banner-role"></div>
            <div class="rf-profile-location" id="rf-banner-location"></div>
          </div>
          <button id="rf-reread-btn" class="rf-reread-btn">↺ Re-read</button>
        </div>
      </div>
      <div class="rf-section">
        <label class="rf-label">Tone</label>
        <div class="rf-tone-group">
          <button class="rf-tone-btn active" data-tone="Professional">Professional</button>
          <button class="rf-tone-btn"        data-tone="Friendly">Friendly</button>
          <button class="rf-tone-btn"        data-tone="Brief">Brief</button>
        </div>
      </div>
      <div class="rf-sub-tabs">
        <button class="rf-sub-tab-btn active" data-sub="template">📋 Template</button>
        <button class="rf-sub-tab-btn"        data-sub="ai">✦ AI Generate</button>
      </div>
      <!-- Template sub-panel -->
      <div class="rf-sub-panel active" id="rf-sub-template">
        <div class="rf-section">
          <label class="rf-label">Template</label>
          <select id="rf-template-select" class="rf-select"></select>
        </div>
        <div class="rf-section">
          <label class="rf-label">Message</label>
          <textarea id="rf-message-preview" class="rf-textarea" rows="8" placeholder="Select a template…"></textarea>
        </div>
      </div>
      <!-- AI sub-panel -->
      <div class="rf-sub-panel" id="rf-sub-ai">
        <div class="rf-section">
          <label class="rf-label">Your rough draft <span style="font-weight:400;font-size:10px;color:#94A3B8;">(optional)</span></label>
          <textarea id="rf-rough-draft" class="rf-textarea" rows="4" placeholder="Type your rough message here and AI will refine + personalise it to the candidate. Leave blank to generate from scratch."></textarea>
        </div>
        <button id="rf-ai-generate-btn" class="rf-btn-ai" style="margin-bottom:10px;">
          ✦ Refine &amp; Generate with AI <span class="rf-ai-uses-badge"></span>
        </button>
        <div id="rf-ai-message-wrap" style="display:none;">
          <label class="rf-label">AI-refined message</label>
          <textarea id="rf-ai-message-text" class="rf-textarea" rows="7"></textarea>
        </div>
      </div>
    </div>
    <!-- Send panel pinned to bottom -->
    <div class="rf-send-panel">
      <button id="rf-send-btn" class="rf-btn-primary">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
        Send Message
      </button>
      <div class="rf-limit-bar-wrap">
        <div class="rf-limit-bar-label">
          <span><span id="rf-limit-count">0</span> / <span id="rf-limit-max">50</span> messages today</span>
        </div>
        <div class="rf-limit-bar-track">
          <div class="rf-limit-bar-fill" id="rf-limit-bar-fill" style="width:0%"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── TRACKER PANEL ── -->
  <div class="rf-panel" id="rf-panel-tracker">
    <div class="rf-panel-scroll">
      <div class="rf-stats-row">
        <div class="rf-stat-mini"><div class="rf-stat-mini-val" id="rf-stat-total">0</div><div class="rf-stat-mini-label">Total</div></div>
        <div class="rf-stat-mini"><div class="rf-stat-mini-val" id="rf-stat-replied" style="color:#059669">0</div><div class="rf-stat-mini-label">Replied</div></div>
        <div class="rf-stat-mini"><div class="rf-stat-mini-val" id="rf-stat-hired"   style="color:#D97706">0</div><div class="rf-stat-mini-label">Hired</div></div>
      </div>
      <div class="rf-filter-row">
        <input id="rf-tracker-search" class="rf-input" type="text" placeholder="Search name, company…">
        <select id="rf-tracker-filter" class="rf-select" style="width:auto;min-width:88px;">
          <option value="">All</option>
          <option value="Sent">Sent</option>
          <option value="Replied">Replied</option>
          <option value="Not Interested">Not Interested</option>
          <option value="Hired">Hired</option>
        </select>
      </div>
      <div id="rf-tracker-list"></div>
      <div class="rf-divider"></div>
      <button id="rf-export-csv-btn" class="rf-btn-secondary">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export CSV
      </button>
    </div>
  </div>

  <!-- ── SETTINGS PANEL ── -->
  <div class="rf-panel" id="rf-panel-settings">
    <div class="rf-panel-scroll">
      <div class="rf-settings-group">
        <div class="rf-settings-group-title">Your Info</div>
        <div class="rf-settings-row">
          <label class="rf-label">Your Name</label>
          <input id="rf-settings-name" class="rf-input" type="text" placeholder="Your full name">
        </div>
        <div class="rf-settings-row">
          <label class="rf-label">Your Company</label>
          <input id="rf-settings-company" class="rf-input" type="text" placeholder="Company name">
        </div>
      </div>
      <div class="rf-settings-group">
        <div class="rf-settings-group-title">Daily Limit Guard</div>
        <div class="rf-settings-row">
          <label class="rf-label">Max messages per day</label>
          <input id="rf-settings-limit" class="rf-input" type="number" value="50" min="1" max="200">
        </div>
      </div>
      <button id="rf-settings-save-btn" class="rf-btn-primary" style="margin-bottom:12px;">Save Settings</button>
      <div class="rf-settings-group">
        <div class="rf-settings-group-title">Templates</div>
        <div id="rf-tpl-list-settings"></div>
        <button id="rf-add-template-btn" class="rf-btn-secondary rf-btn-sm" style="margin-top:8px;">+ Add Template</button>
      </div>
      <div class="rf-settings-group">
        <div class="rf-settings-group-title">Plan</div>
        <div style="font-size:12px;color:#64748B;margin-bottom:10px;">You are on the <strong>Free plan</strong> — 3 AI uses included.</div>
        <button class="rf-btn-ai" disabled style="opacity:.6;cursor:not-allowed;">✦ Upgrade to Pro — Coming Soon</button>
      </div>
      <div class="rf-settings-group" style="border-color:#DC2626 !important;">
        <div class="rf-settings-group-title" style="color:#DC2626 !important;">Danger Zone</div>
        <button id="rf-clear-data-btn" class="rf-btn-danger">Clear All Data</button>
      </div>
      <div class="rf-version-line">RecruitFlow v1.0.0 — Free Tier</div>
      <!-- DEV ONLY: remove before publishing to Chrome Web Store -->
      <button id="rf-reset-onboard" class="rf-btn-secondary rf-btn-sm" style="margin-top:8px;font-size:11px;color:#94A3B8 !important;border-color:#E2E8F0 !important;width:100% !important;">
        ↺ Reset onboarding (dev only)
      </button>
    </div>
  </div>

  <!-- Upgrade overlay -->
  <div class="rf-upgrade-overlay" id="rf-upgrade-overlay">
    <div class="rf-upgrade-card">
      <span class="rf-upgrade-icon">🔒</span>
      <div class="rf-upgrade-title">Free limit reached</div>
      <div class="rf-upgrade-sub">You've used all 3 free AI generations</div>
      <div class="rf-upgrade-price">₹999<span style="font-size:13px;font-weight:400;color:#64748B;">/month</span></div>
      <ul class="rf-upgrade-features">
        <li>Unlimited AI messages</li><li>Unlimited templates</li>
        <li>Unlimited tracking</li><li>PDF uploads</li><li>JD Optimizer</li>
      </ul>
      <button class="rf-btn-ai" disabled style="opacity:.6;margin-bottom:8px;">✦ Upgrade to Pro — Coming Soon</button>
      <button class="rf-btn-secondary" id="rf-upgrade-dismiss">Maybe Later</button>
    </div>
  </div>

  <!-- Add template modal -->
  <div class="rf-notes-modal" id="rf-add-tpl-modal">
    <div class="rf-notes-inner">
      <div class="rf-notes-title">New Template</div>
      <div style="margin-bottom:8px;">
        <label class="rf-label">Name</label>
        <input id="rf-new-tpl-name" class="rf-input" type="text" placeholder="e.g. Tech Outreach">
      </div>
      <div>
        <label class="rf-label">Body</label>
        <textarea id="rf-new-tpl-body" class="rf-textarea" rows="6" placeholder="Hi {name}, …"></textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px;">
        <button id="rf-save-new-tpl"   class="rf-btn-primary rf-btn-sm">Save</button>
        <button id="rf-cancel-new-tpl" class="rf-btn-secondary rf-btn-sm">Cancel</button>
      </div>
    </div>
  </div>

  <!-- Toast container -->
  <div class="rf-toast-container" id="rf-toast-container"></div>
</div>`;
  }

  // ── Toggle sidebar ────────────────────────────────────────────────────────
  function wireToggle(container) {
    const toggle = document.getElementById('rf-toggle-tab');
    if (!toggle) return;
    let collapsed = false;
    toggle.addEventListener('click', () => {
      collapsed = !collapsed;
      container.classList.toggle('collapsed', collapsed);
    });
  }

  // ── Inject sidebar + load sidebar.js as second content script ─────────────
  function injectSidebar() {
    const container = document.createElement('div');
    container.id = 'recruitflow-sidebar-container';
    container.setAttribute('data-role', 'tech');
    container.innerHTML = buildHTML();
    document.body.appendChild(container);
    wireToggle(container);

    // Read profile and update banner immediately
    const profile = readProfile();
    updateBanner(profile);
  }

  function updateBanner(profile) {
    if (!profile) return;
    const n = document.getElementById('rf-banner-name');
    const r = document.getElementById('rf-banner-role');
    const l = document.getElementById('rf-banner-location');
    const h = document.getElementById('rf-header-name');
    if (n) n.textContent = profile.name || 'Unknown';
    if (r) r.textContent = profile.role ? `${profile.role}${profile.company ? ' @ '+profile.company:''}` : '';
    if (l) l.textContent = profile.location || '';
    if (h) h.textContent = (profile.name || '').split(' ')[0];
  }

  // ── Runtime message handlers ──────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'REREAD_PROFILE') {
      try {
        const profile = readProfile();
        updateBanner(profile);
        sendResponse({ profile });
      } catch (e) { sendResponse({ profile: null }); }
      return true;
    }
    if (msg.type === 'SEND_LINKEDIN_MESSAGE') {
      sendLinkedInMessage(msg.message)
        .then(() => sendResponse({ success: true }))
        .catch(e => sendResponse({ success: false, error: e.message }));
      return true;
    }
  });

  // ── SPA navigation observer ───────────────────────────────────────────────
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Ensure sidebar exists on every LinkedIn SPA navigation
      if (!document.getElementById('recruitflow-sidebar-container')) {
        injectSidebar();
      }
      if (location.href.includes('/in/')) {
        // On a profile page — re-read and broadcast updated profile
        setTimeout(() => {
          const profile = readProfile();
          updateBanner(profile);
          try { chrome.runtime.sendMessage({ type: 'PROFILE_UPDATED', profile }); } catch (_) {}
        }, 1600);
      } else {
        // Not a profile — clear the profile banner so stale data isn't shown
        updateBanner({ name: 'Visit a LinkedIn profile', role: '', company: '', location: '', profileUrl: '' });
        try { chrome.runtime.sendMessage({ type: 'PROFILE_UPDATED', profile: null }); } catch (_) {}
      }
    }
  }).observe(document, { subtree: true, childList: true });

  // ── Force inject from popup (Step 4) ─────────────────────────────────────
  window.addEventListener('rf-force-inject', () => {
    if (!document.getElementById('recruitflow-sidebar-container')) {
      injectSidebar();
    } else {
      document.getElementById('recruitflow-sidebar-container')?.classList.remove('collapsed');
    }
  });

  // ── Boot ──────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSidebar);
  } else {
    injectSidebar();
  }
})();
