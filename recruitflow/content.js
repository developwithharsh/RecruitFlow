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
    <div id="rf-login-form" class="rf-auth-form rf-form-visible">
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
    <div id="rf-signup-form" class="rf-auth-form">
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
    <div id="rf-otp-form" class="rf-auth-form">
      <div class="rf-otp-sent-msg" id="rf-otp-sent-msg">
        <span>📧</span>
        <p>A 6-digit code was sent to<br><strong id="rf-otp-email-display"></strong></p>
      </div>
      <!-- Verification code shown inline when email is not configured -->
      <div id="rf-otp-inline-box" style="display:none;background:#F0FDF4;border:2px solid #86EFAC;border-radius:12px;padding:14px;text-align:center;margin-bottom:8px;">
        <p style="font-size:10px;color:#059669;margin:0 0 8px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Verification Code</p>
        <div id="rf-otp-inline-code" style="font-size:30px;font-weight:800;letter-spacing:10px;color:#065F46;font-family:monospace;background:#DCFCE7;border-radius:8px;padding:8px 0;margin-bottom:6px;"></div>
        <p style="font-size:11px;color:#374151;margin:0;">Enter this code below to verify your account</p>
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
    <button class="rf-tab-btn" data-tab="search">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>
      Search
    </button>
  </div>

  <!-- ── JD PANEL ── -->
  <div class="rf-panel" id="rf-panel-jd">
    <div class="rf-panel-scroll">

      <!-- Add / Edit form -->
      <div id="rf-jd-form-section" style="background:#F8FAFC;border-bottom:1px solid #E2E8F0;padding:14px 14px 12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <label class="rf-label" style="margin:0;">New Job Description</label>
          <button id="rf-jd-form-cancel" class="rf-btn-secondary rf-btn-sm" style="display:none;padding:3px 10px;font-size:10px;">✕ Cancel</button>
        </div>
        <div style="margin-bottom:8px;">
          <input id="rf-jd-title" class="rf-input" type="text" placeholder="Job Title  e.g. Senior React Developer">
        </div>
        <div style="margin-bottom:8px;">
          <textarea id="rf-jd-text" class="rf-textarea" rows="5" placeholder="Paste your job description here…"></textarea>
        </div>
        <!-- Primary action row: Generate or Upload -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:8px;">
          <button id="rf-jd-generate-btn" class="rf-btn-ai" style="font-size:11px;padding:0 6px;height:36px;">
            ✦ Generate with AI <span class="rf-ai-uses-badge" id="rf-jd-gen-badge"></span>
          </button>
          <button id="rf-pdf-upload-btn" class="rf-btn-secondary rf-btn-sm" style="height:36px;">📎 Upload PDF</button>
          <input id="rf-pdf-input" type="file" accept=".pdf" style="display:none !important;">
          <span id="rf-pdf-status" style="font-size:10px;color:#059669;grid-column:1/-1;margin-top:-4px;"></span>
        </div>
        <!-- Secondary row: Optimize + Save -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:0;">
          <button id="rf-jd-optimize-btn" class="rf-btn-ai" style="font-size:11px;padding:0 6px;height:36px;">
            ✦ Optimize <span class="rf-ai-uses-badge"></span>
          </button>
          <button id="rf-jd-save-btn" class="rf-btn-primary rf-btn-sm" style="height:36px;">💾 Save JD</button>
        </div>
        <div id="rf-optimized-section" style="display:none;margin-top:10px;">
          <div class="rf-divider"></div>
          <label class="rf-label">AI-optimized version</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:8px;">
            <div>
              <div style="font-size:9px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">Original</div>
              <div id="rf-jd-original-preview" style="font-size:11px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:7px;padding:7px;max-height:90px;overflow-y:auto;white-space:pre-wrap;line-height:1.4;color:#0F172A;"></div>
            </div>
            <div>
              <div style="font-size:9px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">Optimized ✦</div>
              <div id="rf-jd-optimized-preview" style="font-size:11px;background:#F5F3FF;border:1px solid #C4B5FD;border-radius:7px;padding:7px;max-height:90px;overflow-y:auto;white-space:pre-wrap;line-height:1.4;color:#0F172A;"></div>
            </div>
          </div>
          <input type="hidden" id="rf-pending-optimized">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;">
            <button id="rf-jd-accept-btn" class="rf-btn-primary rf-btn-sm">✓ Accept</button>
            <button id="rf-jd-reject-btn" class="rf-btn-secondary rf-btn-sm">✕ Reject</button>
          </div>
        </div>
      </div>

      <!-- Saved JD Cards -->
      <div style="padding:12px 12px 6px;display:flex;align-items:center;justify-content:space-between;">
        <label class="rf-label" style="margin:0;">Saved Jobs</label>
        <button id="rf-jd-new-btn" class="rf-btn-primary rf-btn-sm" style="padding:4px 12px;font-size:11px;">+ New JD</button>
      </div>
      <div id="rf-jd-cards" style="padding:0 12px 12px;"></div>

    </div>
  </div>

  <!-- ── MESSAGE PANEL ── -->
  <div class="rf-panel" id="rf-panel-message">
    <div class="rf-panel-scroll">
      <div class="rf-profile-banner" id="rf-profile-banner" style="display:none;">
        <div class="rf-profile-banner-top">
          <div>
            <div class="rf-profile-name" id="rf-banner-name"></div>
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
    <!-- Action panel pinned to bottom -->
    <div class="rf-send-panel">
      <button id="rf-save-to-jd-btn" class="rf-btn-secondary" style="width:100%;margin-bottom:6px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
        </svg>
        Save Message to JD
      </button>
      <div id="rf-rf-hint" style="background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:9px;padding:9px 12px;display:flex;align-items:center;gap:9px;">
        <div style="background:#2563EB;color:#fff;width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10px;flex-shrink:0;">RF</div>
        <div style="font-size:11px;color:#1E40AF;line-height:1.4;">Open a LinkedIn chat, click the <strong>RF</strong> button next to Send, pick your JD and send instantly.</div>
      </div>
      <div class="rf-limit-bar-wrap" style="margin-top:8px;">
        <div class="rf-limit-bar-label">
          <span><span id="rf-limit-count">0</span> / <span id="rf-limit-max">3</span> messages today</span>
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
        <div class="rf-settings-row" style="display:flex;align-items:center;justify-content:space-between;">
          <label class="rf-label" style="margin:0;">Messages per day</label>
          <span id="rf-settings-limit-display" style="font-size:13px;font-weight:700;color:#2563EB;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:4px 12px;">3</span>
        </div>
        <div style="font-size:10px;color:#94A3B8;margin-top:6px;">Set by your plan — upgrade to increase your daily limit.</div>
      </div>
      <button id="rf-settings-save-btn" class="rf-btn-primary" style="margin-bottom:12px;">Save Settings</button>
      <div class="rf-settings-group">
        <div class="rf-settings-group-title">Templates</div>
        <div id="rf-tpl-list-settings"></div>
        <button id="rf-add-template-btn" class="rf-btn-secondary rf-btn-sm" style="margin-top:8px;">+ Add Template</button>
      </div>
      <div class="rf-settings-group">
        <div class="rf-settings-group-title">Plan</div>
        <div id="rf-plan-status-text" style="font-size:12px;color:#64748B;margin-bottom:10px;">You are on the <strong>Free plan</strong> — 3 messages &amp; 3 AI uses per day.</div>
        <button id="rf-open-upgrade-btn" class="rf-btn-ai" style="margin-bottom:8px;">✦ Upgrade to Pro</button>
        <div id="rf-license-section" style="display:none;">
          <div class="rf-activation-label" style="margin-top:8px;">Enter activation key to upgrade:</div>
          <div class="rf-activation-row">
            <input id="rf-settings-activation-key" class="rf-input" type="text" placeholder="XXXX-XXXX-XXXX-XXXX">
            <button id="rf-settings-activation-submit" class="rf-btn-primary">Activate</button>
          </div>
          <div id="rf-settings-activation-msg" class="rf-activation-msg"></div>
        </div>
      </div>
      <div class="rf-version-line">RecruitFlow v1.0.0</div>
    </div>
  </div>

  <!-- ── SEARCH PANEL ── -->
  <div id="rf-panel-search" class="rf-panel" data-panel="search">
    <div class="rf-panel-scroll">
      <div class="rf-section">
        <label class="rf-label">Describe Your Ideal Candidate</label>
        <textarea id="rf-search-desc" class="rf-textarea" rows="4" placeholder="e.g. Ecommerce Executive with 3+ years, Shopify experience, based in Mumbai…"></textarea>
        <div style="font-size:10px;color:#94A3B8;margin-top:4px;">Just describe in plain English — AI will build the Boolean search string.</div>
      </div>
      <button id="rf-search-ai-btn" class="rf-btn-ai">✦ Generate Boolean Search <span id="rf-search-uses-badge" class="rf-ai-uses-badge"></span></button>
      <div id="rf-search-result" style="display:none;margin-top:10px;">
        <label class="rf-label">Search Keywords</label>
        <div id="rf-search-query-box" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px;font-size:11px;color:#0F172A;line-height:1.7;margin-bottom:8px;white-space:pre-wrap;word-break:break-all;font-family:monospace;"></div>

        <!-- Location instruction — shown only when location was detected -->
        <div id="rf-search-loc-hint" style="display:none;background:#FFF7ED;border:1.5px solid #FED7AA;border-radius:8px;padding:10px 12px;margin-bottom:10px;">
          <div style="font-size:11px;font-weight:700;color:#92400E;margin-bottom:4px;">📍 Set location filter manually</div>
          <div style="font-size:11px;color:#78350F;line-height:1.5;">After LinkedIn opens, click <strong>All filters → Locations</strong> and type <strong id="rf-search-loc-name"></strong> to filter by city.</div>
        </div>

        <button id="rf-search-go-btn" class="rf-btn-primary">🔍 Search on LinkedIn</button>
      </div>
    </div>
  </div>

  <!-- Upgrade overlay -->
  <div class="rf-upgrade-overlay" id="rf-upgrade-overlay">
    <div class="rf-upgrade-card">

      <!-- ── STEP 1: Plan selection ── -->
      <div id="rf-upi-step-plans">
        <button class="rf-upgrade-close" id="rf-upgrade-dismiss">✕</button>
        <span class="rf-upgrade-icon">🚀</span>
        <div class="rf-upgrade-title">Supercharge Your Recruiting</div>
        <div class="rf-upgrade-sub">Recruiters on paid plans reach <strong>10× more candidates</strong> and fill roles faster. Pick the plan that fits your hiring pace.</div>

        <div class="rf-plan-stack">
          <!-- Starter -->
          <div class="rf-plan-row" data-plan="starter">
            <div class="rf-plan-row-head">
              <span class="rf-plan-emoji">🌱</span>
              <div class="rf-plan-row-title">
                <div class="rf-plan-name">Starter</div>
                <div class="rf-plan-tagline">For recruiters hiring 1–2 roles</div>
              </div>
              <div class="rf-plan-price">₹99<span>/mo</span></div>
            </div>
            <ul class="rf-plan-features">
              <li><strong>20 personalised messages daily</strong> — 6× more outreach than free</li>
              <li><strong>20 AI generations daily</strong> — every message tailored to the candidate</li>
              <li>JD Optimizer & unlimited templates</li>
            </ul>
            <button class="rf-plan-btn" data-plan="starter" data-amount="99">Get Starter — ₹99/mo →</button>
          </div>
          <!-- Pro -->
          <div class="rf-plan-row rf-plan-popular" data-plan="pro">
            <div class="rf-plan-badge">⭐ Most Popular</div>
            <div class="rf-plan-row-head">
              <span class="rf-plan-emoji">⚡</span>
              <div class="rf-plan-row-title">
                <div class="rf-plan-name">Pro</div>
                <div class="rf-plan-tagline">For agency & in-house recruiters</div>
              </div>
              <div class="rf-plan-price">₹199<span>/mo</span></div>
            </div>
            <ul class="rf-plan-features">
              <li><strong>50 messages daily</strong> — fill your pipeline every single day</li>
              <li><strong>50 AI generations daily</strong> + PDF JD uploads</li>
              <li>Full outreach tracker with CSV export</li>
              <li>Priority support on WhatsApp</li>
            </ul>
            <button class="rf-plan-btn rf-plan-btn-primary" data-plan="pro" data-amount="199">Go Pro — Recruit Faster →</button>
          </div>
          <!-- Unlimited -->
          <div class="rf-plan-row" data-plan="unlimited">
            <div class="rf-plan-row-head">
              <span class="rf-plan-emoji">👑</span>
              <div class="rf-plan-row-title">
                <div class="rf-plan-name">Unlimited</div>
                <div class="rf-plan-tagline">For hiring teams that never stop</div>
              </div>
              <div class="rf-plan-price">₹399<span>/mo</span></div>
            </div>
            <ul class="rf-plan-features">
              <li><strong>Unlimited messages & AI</strong> — zero caps, zero friction</li>
              <li>Everything in Pro, plus team features</li>
              <li>Dedicated support — we answer in hours, not days</li>
            </ul>
            <button class="rf-plan-btn" data-plan="unlimited" data-amount="399">Go Unlimited →</button>
          </div>
        </div>

        <!-- Activation key entry -->
        <div class="rf-activation-section">
          <div class="rf-activation-label">Already paid? Enter your activation key:</div>
          <div class="rf-activation-row">
            <input id="rf-activation-key" class="rf-input" type="text" placeholder="XXXX-XXXX-XXXX-XXXX">
            <button id="rf-activation-submit" class="rf-btn-primary">Activate</button>
          </div>
          <div id="rf-activation-msg" class="rf-activation-msg"></div>
        </div>

        <button class="rf-btn-secondary" id="rf-upgrade-dismiss-2" style="margin-top:8px;width:100%;">Maybe Later</button>
      </div>

      <!-- ── STEP 2: UPI Payment screen ── -->
      <div id="rf-upi-step-pay" style="display:none;text-align:center;">
        <button class="rf-upgrade-close" id="rf-upi-back-btn" title="Back">←</button>
        <div style="font-size:13px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Pay via UPI</div>
        <div id="rf-upi-plan-label" style="font-size:18px;font-weight:800;color:#0F172A;margin-bottom:2px;"></div>
        <div id="rf-upi-amount-label" style="font-size:28px;font-weight:900;color:#2563EB;margin-bottom:14px;"></div>

        <!-- QR Code -->
        <div style="display:inline-block;background:#fff;border:2px solid #E2E8F0;border-radius:16px;padding:10px;margin-bottom:12px;">
          <img id="rf-upi-qr" src="" alt="UPI QR Code" width="160" height="160" style="display:block;border-radius:8px;">
        </div>
        <div style="font-size:11px;color:#64748B;margin-bottom:12px;">Scan with Google Pay, PhonePe, Paytm or any UPI app</div>

        <!-- UPI ID copy row -->
        <div style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:10px;padding:10px 12px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div>
            <div style="font-size:9px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">UPI ID</div>
            <div style="font-size:12px;font-weight:700;color:#0F172A;font-family:monospace;">harsh.thakor1965@okicici</div>
          </div>
          <button id="rf-upi-copy-btn" style="background:#2563EB;color:#fff;border:none;border-radius:7px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">Copy</button>
        </div>

        <!-- Open in UPI app button -->
        <a id="rf-upi-open-app" href="#" style="display:block;background:linear-gradient(90deg,#059669,#10B981);color:#fff;border-radius:10px;padding:11px;font-size:13px;font-weight:700;text-decoration:none;margin-bottom:8px;">📱 Open in UPI App</a>

        <button id="rf-upi-paid-btn" style="width:100%;background:#2563EB;color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:6px;">✓ I've Paid — Enter UTR</button>
        <button id="rf-upi-cancel-btn" class="rf-btn-secondary" style="width:100%;font-size:12px;">← Choose Different Plan</button>
      </div>

      <!-- ── STEP 3: UTR entry & activation ── -->
      <div id="rf-upi-step-utr" style="display:none;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">🔑</div>
        <div style="font-size:16px;font-weight:800;color:#0F172A;margin-bottom:4px;">Enter Your UTR Number</div>
        <div style="font-size:11px;color:#64748B;line-height:1.5;margin-bottom:16px;">After payment, your UPI app shows a 12-digit UTR / Transaction ID. Enter it below to activate your plan instantly.</div>

        <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:8px 10px;margin-bottom:14px;font-size:10px;color:#92400E;text-align:left;line-height:1.5;">
          📍 Find UTR: Open Google Pay / PhonePe → Transactions → tap the payment → copy the <strong>UTR / Transaction ID</strong> (12 digits)
        </div>

        <input id="rf-utr-input" type="text" class="rf-input" placeholder="e.g. 123456789012" maxlength="20" style="text-align:center;font-size:16px;font-weight:700;letter-spacing:2px;margin-bottom:10px;">
        <div id="rf-utr-error" style="font-size:11px;color:#DC2626;margin-bottom:8px;display:none;"></div>
        <button id="rf-utr-submit-btn" class="rf-btn-primary" style="width:100%;font-size:14px;padding:12px;margin-bottom:6px;">⚡ Activate Now</button>
        <button id="rf-utr-back-btn" class="rf-btn-secondary" style="width:100%;font-size:12px;">← Back to Payment</button>
      </div>

      <!-- ── STEP 4: Success ── -->
      <div id="rf-upi-step-success" style="display:none;text-align:center;padding:20px 0;">
        <div style="font-size:52px;margin-bottom:12px;">🎉</div>
        <div style="font-size:20px;font-weight:800;color:#059669;margin-bottom:6px;">You're Live!</div>
        <div id="rf-success-plan-label" style="font-size:13px;color:#64748B;margin-bottom:16px;"></div>
        <div style="background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:12px;padding:12px;font-size:11px;color:#065F46;line-height:1.6;margin-bottom:16px;">
          Your plan is active. We'll verify your payment within 24 hours. If anything is wrong we'll reach out on WhatsApp.
        </div>
        <button id="rf-success-close-btn" class="rf-btn-primary" style="width:100%;">Start Recruiting →</button>
      </div>

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
        <div style="font-size:10px;color:#94A3B8;margin-top:4px;">Variables: {name} {role} {company} {jd_title} {recruiter_name} {recruiter_company}</div>
      </div>
      <button id="rf-ai-tpl-btn" class="rf-btn-ai" style="margin-top:9px;width:100%;">✦ Generate with AI</button>
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
    const banner  = document.getElementById('rf-profile-banner');
    const isProfilePage = /linkedin\.com\/in\//.test(window.location.href);

    if (!isProfilePage || !profile || !profile.name) {
      if (banner) banner.style.display = 'none';
      return;
    }

    if (banner) banner.style.display = '';

    const n = document.getElementById('rf-banner-name');
    const r = document.getElementById('rf-banner-role');
    const l = document.getElementById('rf-banner-location');
    const h = document.getElementById('rf-header-name');
    if (n) n.textContent = profile.name;
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
      // Only re-inject on SPA navigation if sidebar was already open
      // (never auto-open on page load — user must click the extension icon)
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

  // ── RF Quick-Send floating button (always visible in LinkedIn messaging) ───

  // Find the active compose box — broadest possible search
  function getActiveComposer() {
    // Exact known LinkedIn classes
    const known = document.querySelector('.msg-form__contenteditable');
    if (known) return known;

    // Any contenteditable with messaging placeholder text
    const byPH = Array.from(document.querySelectorAll('[contenteditable="true"]')).find(el => {
      const ph = (el.getAttribute('data-placeholder') || el.getAttribute('aria-placeholder') || el.getAttribute('placeholder') || '').toLowerCase();
      return ph.includes('write a message') || ph.includes('write a msg') || ph.includes('message');
    });
    if (byPH) return byPH;

    // Any large visible contenteditable in the bottom half of the screen
    const byPos = Array.from(document.querySelectorAll('[contenteditable="true"]')).find(el => {
      const r = el.getBoundingClientRect();
      return r.width > 100 && r.height > 20 && r.top > window.innerHeight * 0.45;
    });
    return byPos || null;
  }

  function typeIntoBox(box, text) {
    box.focus();
    // Clear existing content
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    // Insert text — triggers React synthetic events
    const inserted = document.execCommand('insertText', false, text);
    if (!inserted || !box.innerText?.trim()) {
      // Fallback: set innerHTML and fire all relevant events
      box.innerHTML = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
      box.dispatchEvent(new InputEvent('input',  { bubbles: true, composed: true, inputType: 'insertText', data: text }));
      box.dispatchEvent(new Event('change', { bubbles: true }));
      box.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    }
  }

  function clickLinkedInSend() {
    const btn =
      document.querySelector('.msg-form__send-button:not([disabled])') ||
      document.querySelector('[data-control-name="send"]:not([disabled])') ||
      Array.from(document.querySelectorAll('button:not([disabled])')).find(b => {
        const label = (b.getAttribute('aria-label') || b.textContent || '').toLowerCase().trim();
        return (label === 'send' || label === 'send message') && b.offsetParent !== null;
      });
    if (btn) { btn.click(); return true; }
    return false;
  }

  // Read the RECIPIENT name from the chat header (not from message bubbles)
  function getChatRecipientName(recruiterName) {
    const headerName =
      // Overlay chat bubble header (bottom-right pop-up chat)
      document.querySelector('.msg-overlay-bubble-header__title')?.innerText?.trim() ||
      // Full messaging page — conversation heading
      document.querySelector('.msg-thread-heading__name')?.innerText?.trim() ||
      // Full messaging page — entity lockup in header
      document.querySelector('.msg-entity-lockup__entity-title')?.innerText?.trim() ||
      // Conversation list item participant names (visible in header area)
      document.querySelector('.msg-conversation-listitem__participant-names span')?.innerText?.trim() ||
      // Fallback: aria-label on the header link
      document.querySelector('[class*="msg"][class*="header"] a[href*="/in/"]')?.getAttribute('aria-label')?.trim() ||
      // Last resort: first link in the thread heading that goes to a profile
      document.querySelector('.msg-thread__link-to-profile')?.innerText?.trim() ||
      // Profile page h1 (when chatting from a profile page overlay)
      document.querySelector('h1.text-heading-xlarge,h1.inline.t-24,.pv-text-details__left-panel h1')?.innerText?.trim() ||
      '';

    // Safety check: if we got the recruiter's own name, discard it
    const ownName = recruiterName?.split(' ')[0]?.toLowerCase() || '';
    return (headerName && headerName.toLowerCase().split(' ')[0] !== ownName) ? headerName : '';
  }

  function buildQuickMessage(jd, recruiterName, recruiterCompany) {
    const candidate = getChatRecipientName(recruiterName);
    const firstName = (candidate || 'there').split(' ')[0];
    const jdTitle   = jd.title || 'an exciting opportunity';
    return `Hi ${firstName},\n\nI came across your profile and wanted to reach out about a ${jdTitle} role that I think could be a great fit for you.\n\nWould you be open to a quick 10-minute call this week?\n\nBest regards,\n${recruiterName}${recruiterCompany ? ', ' + recruiterCompany : ''}`;
  }

  async function buildCardPopup(anchorBtn) {
    document.getElementById('rf-card-popup')?.remove();

    const [jdsRaw, activeIdRaw, settingsRaw, templatesRaw] = await Promise.all([
      new Promise(r => chrome.storage.local.get('recruitflow_jds',        d => r(d.recruitflow_jds))),
      new Promise(r => chrome.storage.local.get('recruitflow_active_jd',  d => r(d.recruitflow_active_jd))),
      new Promise(r => chrome.storage.local.get('recruitflow_settings',   d => r(d.recruitflow_settings))),
      new Promise(r => chrome.storage.local.get('recruitflow_templates',  d => r(d.recruitflow_templates)))
    ]);

    const jds      = jdsRaw      || [];
    const activeId = activeIdRaw || null;
    const settings = settingsRaw || {};
    const templates = templatesRaw || [];
    const recruiterName    = settings.recruiter_name    || 'Recruiter';
    const recruiterCompany = settings.recruiter_company || '';

    const popup = document.createElement('div');
    popup.id = 'rf-card-popup';
    popup.style.cssText = [
      'position:fixed', 'z-index:2147483647',
      'background:#fff', 'border-radius:16px',
      'box-shadow:0 12px 40px rgba(0,0,0,0.22)',
      'width:300px', 'max-height:440px',
      'display:flex', 'flex-direction:column',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'border:1px solid #E2E8F0', 'overflow:hidden'
    ].join(';');

    // Position above the anchor button, clamped to viewport
    const r    = anchorBtn.getBoundingClientRect();
    const popH = 460;
    const popW = 300;
    let top  = r.top - popH - 8;
    let left = r.left;
    if (top < 8) top = r.bottom + 8;               // flip below if no room above
    if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
    if (left < 8) left = 8;
    popup.style.top  = top  + 'px';
    popup.style.left = left + 'px';

    popup.innerHTML = `
      <div style="padding:12px 14px 10px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:#F8FAFC;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="background:#2563EB;color:#fff;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;letter-spacing:-.5px;">RF</div>
          <div>
            <div style="font-weight:700;font-size:13px;color:#0F172A;line-height:1.2;">Quick Send</div>
            <div style="font-size:10px;color:#64748B;">Pick a JD — message sends instantly</div>
          </div>
        </div>
        <button id="rf-popup-close" style="background:none;border:none;font-size:18px;cursor:pointer;color:#94A3B8;line-height:1;padding:0 2px;">✕</button>
      </div>
      <div id="rf-card-list" style="overflow-y:auto;flex:1;padding:8px;"></div>
    `;
    document.body.appendChild(popup);

    popup.querySelector('#rf-popup-close').addEventListener('click', () => popup.remove());

    // Close when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function outsideClick(e) {
        if (!popup.contains(e.target) && e.target !== anchorBtn) {
          popup.remove();
          document.removeEventListener('click', outsideClick);
        }
      }, true);
    }, 100);

    const list = popup.querySelector('#rf-card-list');

    if (!jds.length) {
      list.innerHTML = `
        <div style="text-align:center;padding:28px 16px;color:#64748B;">
          <div style="font-size:28px;margin-bottom:8px;">📋</div>
          <div style="font-size:12px;font-weight:600;color:#0F172A;margin-bottom:4px;">No JDs saved yet</div>
          <div style="font-size:11px;">Add a Job Description in the RecruitFlow sidebar (JD tab) first.</div>
        </div>`;
      return;
    }

    jds.forEach(jd => {
      const isActive = jd.id === activeId;
      const jdSnippet = (jd.text || '').replace(/\s+/g, ' ').trim().slice(0, 70);
      // Build the quick message for preview
      const quickMsg = buildQuickMessage(jd, recruiterName, recruiterCompany);
      const msgPreview = quickMsg.replace(/\s+/g, ' ').trim().slice(0, 100);
      // Find a matching saved template name if any
      const templateLabel = templates.length
        ? (templates[0].name || 'Template')
        : 'Quick Message';

      const card = document.createElement('div');
      card.style.cssText = [
        'background:' + (isActive ? '#EFF6FF' : '#F8FAFC'),
        'border:2px solid ' + (isActive ? '#2563EB' : '#E2E8F0'),
        'border-radius:10px', 'padding:11px 12px 10px', 'margin-bottom:6px'
      ].join(';');

      const hasJDText = (jd.text || '').trim().length > 0;
      card.innerHTML = `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:4px;">
          <span style="font-weight:700;font-size:12px;color:#0F172A;line-height:1.3;flex:1;">${jd.title || 'Untitled JD'}</span>
          ${isActive ? '<span style="font-size:9px;background:#2563EB;color:#fff;padding:2px 6px;border-radius:8px;flex-shrink:0;font-weight:600;">ACTIVE</span>' : ''}
        </div>
        ${jdSnippet ? `<div style="font-size:10px;color:#94A3B8;line-height:1.4;margin-bottom:6px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;">${jdSnippet}…</div>` : ''}
        <div style="background:#fff;border:1px solid #E2E8F0;border-radius:7px;padding:8px 10px;margin-bottom:8px;">
          <div style="font-size:9px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">${templateLabel}</div>
          <div style="font-size:11px;color:#475569;line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${msgPreview}…</div>
        </div>
        ${hasJDText ? `
        <div style="font-size:9px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;">What to send — tap to select</div>
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <button type="button" class="rf-send-msg-toggle" data-on="1" style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:8px 6px;background:#2563EB;border:2px solid #2563EB;border-radius:8px;font-size:11.5px;font-weight:700;color:#fff;cursor:pointer;transition:all .12s;">✓ Message</button>
          <button type="button" class="rf-send-jd-toggle" data-on="0" style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:8px 6px;background:#fff;border:2px solid #CBD5E1;border-radius:8px;font-size:11.5px;font-weight:700;color:#64748B;cursor:pointer;transition:all .12s;">JD</button>
        </div>` : ''}
        <button class="rf-send-now-btn" style="width:100%;background:#2563EB;color:#fff;border:none;border-radius:7px;padding:8px 0;font-size:12px;font-weight:600;cursor:pointer;letter-spacing:.2px;">
          ✦ Send Message
        </button>
      `;

      card.addEventListener('mouseenter', () => { card.style.boxShadow = '0 2px 12px rgba(37,99,235,.18)'; card.style.borderColor = '#2563EB'; });
      card.addEventListener('mouseleave', () => { card.style.boxShadow = 'none'; card.style.borderColor = isActive ? '#2563EB' : '#E2E8F0'; });

      // Wire the Message / JD toggle pills
      function styleToggle(btn, on, color) {
        btn.dataset.on = on ? '1' : '0';
        btn.style.background  = on ? color : '#fff';
        btn.style.borderColor = on ? color : '#CBD5E1';
        btn.style.color       = on ? '#fff' : '#64748B';
        btn.textContent       = (on ? '✓ ' : '') + (btn.classList.contains('rf-send-msg-toggle') ? 'Message' : 'JD');
      }
      const msgToggle = card.querySelector('.rf-send-msg-toggle');
      const jdToggle  = card.querySelector('.rf-send-jd-toggle');
      msgToggle?.addEventListener('click', e => {
        e.stopPropagation();
        styleToggle(msgToggle, msgToggle.dataset.on !== '1', '#2563EB');
      });
      jdToggle?.addEventListener('click', e => {
        e.stopPropagation();
        styleToggle(jdToggle, jdToggle.dataset.on !== '1', '#059669');
      });

      const sendBtn = card.querySelector('.rf-send-now-btn');
      sendBtn.addEventListener('mouseenter', () => { sendBtn.style.background = '#1D4ED8'; });
      sendBtn.addEventListener('mouseleave', () => { sendBtn.style.background = '#2563EB'; });

      sendBtn.addEventListener('click', async e => {
        e.stopPropagation();
        const sendMsg   = msgToggle ? msgToggle.dataset.on === '1' : true;  // no toggles → message only
        const sendJDToo = jdToggle ? jdToggle.dataset.on === '1' : false;

        if (!sendMsg && !sendJDToo) {
          sendBtn.textContent = 'Select Message or JD first';
          sendBtn.style.background = '#DC2626';
          setTimeout(() => {
            sendBtn.textContent = '✦ Send Message';
            sendBtn.style.background = '#2563EB';
          }, 2000);
          return;
        }

        sendBtn.textContent = 'Sending…';
        sendBtn.disabled    = true;

        const composer = getActiveComposer();
        if (!composer) {
          sendBtn.textContent = 'Click message box first';
          sendBtn.style.background = '#DC2626';
          setTimeout(() => {
            sendBtn.textContent = '✦ Send Message';
            sendBtn.style.background = '#2563EB';
            sendBtn.disabled = false;
          }, 2500);
          return;
        }

        const msg = buildQuickMessage(jd, recruiterName, recruiterCompany);
        const firstText = sendMsg ? msg : jd.text.trim();
        typeIntoBox(composer, firstText);

        // Retry clicking Send until LinkedIn's React state enables the button (up to 3s)
        let sent = false;
        for (let i = 0; i < 15; i++) {
          await new Promise(r => setTimeout(r, 200));
          sent = clickLinkedInSend();
          if (sent) break;
        }

        if (sent) {
          // Log to tracker + increment daily count via background
          try {
            const candidateName = getChatRecipientName(recruiterName) || 'LinkedIn contact';
            const profileRole = /linkedin\.com\/in\//.test(window.location.href)
              ? (document.querySelector('.text-body-medium.break-words')?.innerText?.trim() || '')
              : '';
            chrome.runtime.sendMessage({ type: 'LOG_SENT_MESSAGE', data: {
              candidateName, candidateUrl: window.location.href,
              candidateRole: profileRole, candidateCompany: '',
              jdTitle: jd.title || '', messageSent: firstText, sentAt: new Date().toISOString()
            }});
            chrome.runtime.sendMessage({ type: 'INCREMENT_DAILY_COUNT' });
          } catch (_) {}

          // If both ticked: JD goes out as a second follow-up message
          if (sendMsg && sendJDToo && (jd.text || '').trim()) {
            sendBtn.textContent = 'Sending JD…';
            await new Promise(r => setTimeout(r, 1500));
            const composer2 = getActiveComposer();
            if (composer2) {
              typeIntoBox(composer2, jd.text.trim());
              for (let i = 0; i < 15; i++) {
                await new Promise(r => setTimeout(r, 200));
                if (clickLinkedInSend()) break;
              }
            }
          }
        }

        sendBtn.textContent      = sent ? '✓ Sent!' : '✓ Typed — press Enter';
        sendBtn.style.background = '#059669';
        setTimeout(() => popup.remove(), 1400);
      });

      list.appendChild(card);
    });
  }

  // ── Inject RF button next to LinkedIn's Send button ──────────────────────
  function createRFBtn() {
    const btn = document.createElement('button');
    btn.className = 'rf-toolbar-btn';
    btn.title = 'RecruitFlow Quick Send';
    btn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style="margin-right:3px;vertical-align:middle;">
        <path d="M22 2L11 13" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M22 2L15 22 11 13 2 9l20-7z" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span style="font-weight:700;font-size:11px;color:#2563EB;letter-spacing:-.3px;vertical-align:middle;">RF</span>
    `;
    btn.style.cssText = [
      'display:inline-flex', 'align-items:center', 'justify-content:center',
      'background:#EFF6FF', 'border:1.5px solid #2563EB', 'border-radius:7px',
      'padding:0 8px', 'height:32px', 'cursor:pointer',
      'font-family:-apple-system,BlinkMacSystemFont,sans-serif',
      'transition:background .15s', 'flex-shrink:0', 'margin-right:6px',
      'vertical-align:middle'
    ].join(';');
    btn.addEventListener('mouseenter', () => { btn.style.background = '#DBEAFE'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = '#EFF6FF'; });
    btn.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); buildCardPopup(btn); });
    return btn;
  }

  let _rfInjectTimer = null;
  function injectRFButtons() {
    clearTimeout(_rfInjectTimer);
    _rfInjectTimer = setTimeout(_doInjectRFButtons, 300);
  }

  function _doInjectRFButtons() {
    // Remove stale RF buttons whose Send sibling has been removed by LinkedIn re-renders
    document.querySelectorAll('.rf-toolbar-btn').forEach(rfBtn => {
      if (rfBtn.closest('#recruitflow-sidebar-container')) return;
      const parent = rfBtn.parentNode;
      if (!parent) { rfBtn.remove(); return; }
      const hasSend = Array.from(parent.querySelectorAll('button')).some(b => {
        if (b === rfBtn) return false;
        const a = (b.getAttribute('aria-label') || '').toLowerCase();
        const t = (b.innerText || '').toLowerCase().trim();
        return a.includes('send') || t === 'send' || t === 'send message' ||
               b.classList.contains('msg-form__send-button');
      });
      if (!hasSend) rfBtn.remove();
    });

    document.querySelectorAll('button').forEach(sendBtn => {
      if (sendBtn.closest('#recruitflow-sidebar-container')) return;
      if (sendBtn.classList.contains('rf-toolbar-btn')) return;

      const ariaLower = (sendBtn.getAttribute('aria-label') || '').toLowerCase().trim();
      const textLower = (sendBtn.innerText || '').toLowerCase().trim();

      // Broad match: LinkedIn uses several patterns across overlay, full-page, and InMail
      const isSend = ariaLower === 'send' || ariaLower === 'send message' ||
                     ariaLower.includes('send message') ||
                     textLower === 'send' || textLower === 'send message' ||
                     sendBtn.classList.contains('msg-form__send-button') ||
                     sendBtn.getAttribute('data-control-name') === 'send';
      if (!isSend) return;

      // Skip genuinely hidden nodes (not yet in layout)
      const rect = sendBtn.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      // Dedup: one RF button per the closest messaging form container
      const container = sendBtn.closest('.msg-form__footer')
                     || sendBtn.closest('.msg-form__actions')
                     || sendBtn.closest('[class*="msg-form"]')
                     || sendBtn.closest('form')
                     || sendBtn.parentNode;
      if (container && container.querySelector('.rf-toolbar-btn')) return;

      const rfBtn = createRFBtn();
      sendBtn.parentNode.insertBefore(rfBtn, sendBtn);
    });
  }

  // MutationObserver catches dynamic chat windows opening/closing
  new MutationObserver(injectRFButtons).observe(document.body, { subtree: true, childList: true });
  injectRFButtons();

  // Periodic fallback — catches cases where LinkedIn re-renders and removes the RF button
  setInterval(_doInjectRFButtons, 2500);

  // Also trigger on compose box focus — most reliable signal that a chat is open
  document.addEventListener('focusin', e => {
    const el = e.target;
    if (!el) return;
    const isCompose = el.classList.contains('msg-form__contenteditable') ||
      (el.contentEditable === 'true' && (
        (el.getAttribute('data-placeholder') || '').toLowerCase().includes('message') ||
        (el.getAttribute('aria-placeholder') || '').toLowerCase().includes('message') ||
        (el.getAttribute('aria-label') || '').toLowerCase().includes('message')
      ));
    if (isCompose) injectRFButtons();
  }, true);

  // ── Force inject from popup (Step 4) ─────────────────────────────────────
  window.addEventListener('rf-force-inject', () => {
    if (!document.getElementById('recruitflow-sidebar-container')) {
      injectSidebar();
    }
    document.getElementById('recruitflow-sidebar-container')?.classList.remove('collapsed');
  });

  // ── Boot ──────────────────────────────────────────────────────────────────
  // If user has ever activated the extension, show toggle tab (collapsed) on load.
  chrome.storage.local.get('recruitflow_active', (result) => {
    if (result.recruitflow_active) {
      if (!document.getElementById('recruitflow-sidebar-container')) {
        injectSidebar();
        document.getElementById('recruitflow-sidebar-container')?.classList.add('collapsed');
      }
    }
  });
})();
