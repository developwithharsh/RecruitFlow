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
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:8px;">
          <button id="rf-pdf-upload-btn" class="rf-btn-secondary rf-btn-sm">📎 Upload PDF</button>
          <button id="rf-jd-save-btn" class="rf-btn-primary rf-btn-sm">💾 Save JD</button>
          <input id="rf-pdf-input" type="file" accept=".pdf" style="display:none !important;">
          <span id="rf-pdf-status" style="font-size:10px;color:#059669;grid-column:1/-1;"></span>
        </div>
        <button id="rf-jd-optimize-btn" class="rf-btn-ai" style="margin-bottom:0;">
          ✦ Optimize with AI <span class="rf-ai-uses-badge"></span>
        </button>
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
      <!-- Shown on non-profile pages instead of the banner -->
      <div id="rf-no-profile-hint" style="background:#FFF7ED;border:1.5px solid #FED7AA;border-radius:10px;margin:10px 12px 0;padding:10px 12px;font-size:11px;color:#92400E;display:none;">
        <strong>Navigate to a candidate's LinkedIn profile</strong> (/in/username) and click Re-read to load their details.
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
        <div class="rf-settings-row">
          <label class="rf-label">Max messages per day (Pro)</label>
          <input id="rf-settings-limit" class="rf-input" type="number" value="20" min="1" max="200">
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

  <!-- ── SEARCH PANEL ── -->
  <div id="rf-panel-search" class="rf-panel" data-panel="search">
    <div class="rf-panel-scroll">
      <div class="rf-section">
        <label class="rf-label">Describe Your Ideal Candidate</label>
        <textarea id="rf-search-desc" class="rf-textarea" rows="4" placeholder="e.g. Senior React developer with 5+ years, startup experience, based in Bangalore or remote..."></textarea>
      </div>
      <button id="rf-search-ai-btn" class="rf-btn-ai">✦ Generate Search</button>
      <div id="rf-search-result" style="display:none;margin-top:10px;">
        <label class="rf-label">AI-Suggested Search Query</label>
        <div id="rf-search-query-box" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px;font-size:12px;color:#0F172A;line-height:1.6;margin-bottom:8px;white-space:pre-wrap;"></div>
        <label class="rf-label" style="margin-top:8px;">LinkedIn Search URL</label>
        <div id="rf-search-url-box" style="background:#EFF6FF;border:1px solid #DBEAFE;border-radius:8px;padding:8px 10px;font-size:11px;color:#2563EB;line-height:1.5;margin-bottom:10px;word-break:break-all;"></div>
        <button id="rf-search-go-btn" class="rf-btn-primary">🔍 Search on LinkedIn (Automate)</button>
      </div>
    </div>
  </div>

  <!-- Upgrade overlay -->
  <div class="rf-upgrade-overlay" id="rf-upgrade-overlay">
    <div class="rf-upgrade-card">
      <button class="rf-upgrade-close" id="rf-upgrade-dismiss">✕</button>
      <span class="rf-upgrade-icon">⚡</span>
      <div class="rf-upgrade-title">Upgrade RecruitFlow</div>
      <div class="rf-upgrade-sub">You've reached your free daily limit. Pick a plan to continue.</div>

      <!-- Plan cards -->
      <div class="rf-plan-grid">
        <!-- Starter -->
        <div class="rf-plan-card" data-plan="starter">
          <div class="rf-plan-name">Starter</div>
          <div class="rf-plan-price">₹499<span>/mo</span></div>
          <ul class="rf-plan-features">
            <li>✓ 20 messages/day</li>
            <li>✓ 20 AI uses/day</li>
            <li>✓ All templates</li>
            <li>✓ JD Optimizer</li>
          </ul>
          <button class="rf-plan-btn" data-plan="starter">Get Starter</button>
        </div>
        <!-- Pro -->
        <div class="rf-plan-card rf-plan-popular" data-plan="pro">
          <div class="rf-plan-badge">Most Popular</div>
          <div class="rf-plan-name">Pro</div>
          <div class="rf-plan-price">₹999<span>/mo</span></div>
          <ul class="rf-plan-features">
            <li>✓ 50 messages/day</li>
            <li>✓ 50 AI uses/day</li>
            <li>✓ Priority support</li>
            <li>✓ PDF uploads</li>
          </ul>
          <button class="rf-plan-btn rf-plan-btn-primary" data-plan="pro">Get Pro</button>
        </div>
        <!-- Unlimited -->
        <div class="rf-plan-card" data-plan="unlimited">
          <div class="rf-plan-name">Unlimited</div>
          <div class="rf-plan-price">₹1,999<span>/mo</span></div>
          <ul class="rf-plan-features">
            <li>✓ Unlimited messages</li>
            <li>✓ Unlimited AI</li>
            <li>✓ Team features</li>
            <li>✓ Dedicated support</li>
          </ul>
          <button class="rf-plan-btn" data-plan="unlimited">Get Unlimited</button>
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
    const banner  = document.getElementById('rf-profile-banner');
    const hint    = document.getElementById('rf-no-profile-hint');
    const isProfilePage = /linkedin\.com\/in\//.test(window.location.href);

    if (!isProfilePage || !profile || !profile.name) {
      if (banner) banner.style.display = 'none';
      if (hint)   hint.style.display   = isProfilePage ? 'none' : 'block';
      return;
    }

    if (banner) banner.style.display = '';
    if (hint)   hint.style.display   = 'none';

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

  function buildQuickMessage(jd, recruiterName, recruiterCompany) {
    // Read the RECIPIENT name from the chat header (not from message bubbles)
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
      '';

    // Safety check: if we got the recruiter's own name, discard it
    const ownName = recruiterName?.split(' ')[0]?.toLowerCase() || '';
    const candidate = (headerName && headerName.toLowerCase().split(' ')[0] !== ownName)
      ? headerName
      : '';

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
        <button class="rf-send-now-btn" style="width:100%;background:#2563EB;color:#fff;border:none;border-radius:7px;padding:8px 0;font-size:12px;font-weight:600;cursor:pointer;letter-spacing:.2px;">
          ✦ Send Message
        </button>
      `;

      card.addEventListener('mouseenter', () => { card.style.boxShadow = '0 2px 12px rgba(37,99,235,.18)'; card.style.borderColor = '#2563EB'; });
      card.addEventListener('mouseleave', () => { card.style.boxShadow = 'none'; card.style.borderColor = isActive ? '#2563EB' : '#E2E8F0'; });

      const sendBtn = card.querySelector('.rf-send-now-btn');
      sendBtn.addEventListener('mouseenter', () => { sendBtn.style.background = '#1D4ED8'; });
      sendBtn.addEventListener('mouseleave', () => { sendBtn.style.background = '#2563EB'; });

      sendBtn.addEventListener('click', async e => {
        e.stopPropagation();
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
        typeIntoBox(composer, msg);

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
            const profileName = document.querySelector('h1.text-heading-xlarge,h1.inline.t-24,.pv-text-details__left-panel h1')?.innerText?.trim() || '';
            const profileRole = document.querySelector('.text-body-medium.break-words')?.innerText?.trim() || '';
            chrome.runtime.sendMessage({ type: 'LOG_SENT_MESSAGE', data: {
              candidateName: profileName, candidateUrl: window.location.href,
              candidateRole: profileRole, candidateCompany: '',
              jdTitle: jd.title || '', messageSent: msg, sentAt: new Date().toISOString()
            }});
            chrome.runtime.sendMessage({ type: 'INCREMENT_DAILY_COUNT' });
          } catch (_) {}
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
    _rfInjectTimer = setTimeout(_doInjectRFButtons, 200);
  }

  function _doInjectRFButtons() {
    document.querySelectorAll('button').forEach(sendBtn => {
      if (sendBtn.closest('#recruitflow-sidebar-container')) return;

      const ariaLabel   = (sendBtn.getAttribute('aria-label') || '').trim();
      const visibleText = (sendBtn.innerText || '').trim();
      const ariaLower   = ariaLabel.toLowerCase();
      const textLower   = visibleText.toLowerCase();

      const isSend = ariaLower === 'send' || ariaLower === 'send message' ||
                     ariaLower.startsWith('send a message') ||
                     textLower === 'send' || textLower === 'send message' ||
                     // LinkedIn messaging overlay send button (no text, just icon)
                     (sendBtn.classList.contains('msg-form__send-button')) ||
                     (sendBtn.closest('.msg-form__footer') && sendBtn.tagName === 'BUTTON' &&
                       !sendBtn.closest('.msg-form__option-menu'));
      if (!isSend) return;

      const rect = sendBtn.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const prev = sendBtn.previousElementSibling;
      if (prev && prev.classList.contains('rf-toolbar-btn')) return;

      const rfBtn = createRFBtn();
      sendBtn.parentNode.insertBefore(rfBtn, sendBtn);
    });
  }

  new MutationObserver(injectRFButtons).observe(document.body, { subtree: true, childList: true });
  injectRFButtons();

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
