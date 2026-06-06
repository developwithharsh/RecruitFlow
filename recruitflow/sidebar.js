import { getTemplates, fillTemplate } from './modules/template-engine.js';
import { generateMessage, checkUsageLimit, incrementUsage } from './modules/ai-generator.js';
import { extractTextFromPDF } from './modules/pdf-extractor.js';
import { addEntry, getAllEntries, updateStatus, deleteEntry, exportToCSV } from './modules/tracker.js';
import { getStatus, incrementCount, setDailyLimit, checkAndResetIfNewDay } from './modules/limit-guard.js';
import { saveJD, getAllJDs, getActiveJD, setActiveJD, detectRoleCategory, optimizeJD } from './modules/jd-optimizer.js';

// ─── State ────────────────────────────────────────────────────────────────────
let currentProfile = null;
let currentTone = 'Professional';

async function checkPro() {
  try {
    const result = await chrome.runtime.sendMessage({ type: 'CHECK_PRO' });
    return result?.isPro || false;
  } catch (_) { return false; }
}

// ─── Entry point ──────────────────────────────────────────────────────────────
window.initRecruitFlowSidebar = async function () {
  await renderJDPanel();
  await renderMessagePanel();
  await renderTrackerPanel();
  await renderSettingsPanel();
  attachTabListeners();
  attachToggleListener();
  startDailyResetCheck();

  window.addEventListener('rf-profile-updated', async (e) => {
    currentProfile = e.detail;
    updateProfileBanner(e.detail);
    await fillActiveTemplate(e.detail);
  });

  switchTab('jd');
};

// ─── Tab switching ────────────────────────────────────────────────────────────
function switchTab(tabName) {
  document.querySelectorAll('.rf-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.rf-panel').forEach(panel => {
    panel.style.display = 'none';
    panel.classList.remove('active');
  });
  document.querySelector(`.rf-tab-btn[data-tab="${tabName}"]`)?.classList.add('active');
  const panel = document.getElementById(`rf-panel-${tabName}`);
  if (panel) {
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.classList.add('active');
  }
  if (tabName === 'tracker') { renderTrackerEntries(); refreshTrackerStats(); }
  if (tabName === 'settings') { loadSettingsValues(); }
  if (tabName === 'message') { updateLimitBar(); }
}

function attachTabListeners() {
  document.querySelectorAll('.rf-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

// ─── Collapse/expand toggle ───────────────────────────────────────────────────
function attachToggleListener() {
  const toggle = document.getElementById('rf-toggle-tab');
  const container = document.getElementById('recruitflow-sidebar-container');
  if (!toggle || !container) return;
  let isCollapsed = false;

  toggle.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    container.classList.toggle('collapsed', isCollapsed);
    const chevron = toggle.querySelector('svg');
    if (chevron) chevron.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
  });
}

// ─── JD PANEL ─────────────────────────────────────────────────────────────────
async function renderJDPanel() {
  const panel = document.getElementById('rf-panel-jd');
  if (!panel) return;
  panel.innerHTML = `
<div class="rf-panel-scroll">
  <div class="rf-section">
    <label class="rf-label">Active Job Description</label>
    <div style="display:flex;gap:6px;align-items:center;">
      <select id="rf-jd-selector" class="rf-select" style="flex:1;"></select>
      <button id="rf-jd-new-btn" class="rf-icon-btn" title="New JD" style="flex-shrink:0;width:32px;height:36px;font-size:18px;border-radius:8px;">+</button>
    </div>
  </div>

  <div class="rf-section">
    <label class="rf-label">JD Title</label>
    <input type="text" id="rf-jd-title" class="rf-input"
      placeholder="e.g. Senior React Developer — Pune" />
  </div>

  <div class="rf-section">
    <label class="rf-label">Job Description Text</label>
    <textarea id="rf-jd-text" class="rf-textarea" rows="8"
      placeholder="Paste your Job Description here..."></textarea>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
    <button id="rf-jd-save-btn" class="rf-btn-primary rf-btn-sm">💾 Save JD</button>
    <button id="rf-jd-optimize-btn" class="rf-btn-ai rf-btn-sm">
      ✦ Optimize <span id="rf-ai-uses-badge" class="rf-ai-uses-badge">3 left</span>
    </button>
  </div>

  <div class="rf-upload-row" style="margin-bottom:14px;">
    <button id="rf-pdf-upload-btn" class="rf-btn-secondary rf-btn-sm">📎 Upload PDF JD</button>
    <input type="file" id="rf-pdf-input" accept=".pdf" style="display:none" />
    <span id="rf-pdf-status" style="font-size:11px;color:var(--rf-success);margin-left:8px;"></span>
  </div>

  <div id="rf-optimized-section" style="display:none;">
    <div class="rf-divider"></div>
    <label class="rf-label">AI-optimized version</label>
    <textarea id="rf-optimized-text" class="rf-textarea" rows="6" readonly
      style="background:var(--rf-bg-secondary);border-color:#C4B5FD;"></textarea>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
      <button id="rf-optimize-accept" class="rf-btn-primary rf-btn-sm">✓ Use This</button>
      <button id="rf-optimize-reject" class="rf-btn-secondary rf-btn-sm">✗ Keep Original</button>
    </div>
  </div>
</div>`;

  attachJDHandlers();
  await refreshJDSelector();
  await updateAIBadge();
}

function attachJDHandlers() {
  document.getElementById('rf-jd-save-btn')?.addEventListener('click', async () => {
    const title = document.getElementById('rf-jd-title').value.trim();
    const text = document.getElementById('rf-jd-text').value.trim();
    if (!title || !text) { showToast('Please enter both a title and JD text', 'error'); return; }
    try {
      await saveJD(title, text);
      await refreshJDSelector();
      const category = detectRoleCategory(text);
      document.getElementById('recruitflow-sidebar-container')?.setAttribute('data-role', category);
      showToast('JD saved successfully', 'success');
    } catch (e) { showToast('Failed to save JD', 'error'); }
  });

  document.getElementById('rf-jd-optimize-btn')?.addEventListener('click', async () => {
    const text = document.getElementById('rf-jd-text').value.trim();
    if (!text) { showToast('Paste a JD first', 'error'); return; }

    const usage = await checkUsageLimit();
    if (!usage.canUse) { showUpgradeModal(); return; }

    const btn = document.getElementById('rf-jd-optimize-btn');
    btn.innerHTML = '<span class="rf-spinner"></span> Optimizing…';
    btn.disabled = true;

    try {
      const result = await optimizeJD(text);
      if (result.success) {
        document.getElementById('rf-optimized-text').value = result.optimized;
        document.getElementById('rf-optimized-section').style.display = 'block';
        await updateAIBadge();
        showToast('JD optimized!', 'success');
      } else if (result.limitReached) {
        showUpgradeModal();
      } else {
        showToast(result.error || 'AI unavailable. Please try again.', 'error');
      }
    } catch (e) {
      showToast('AI unavailable. Please try again.', 'error');
    } finally {
      btn.innerHTML = '✦ Optimize <span id="rf-ai-uses-badge" class="rf-ai-uses-badge"></span>';
      btn.disabled = false;
      await updateAIBadge();
    }
  });

  document.getElementById('rf-optimize-accept')?.addEventListener('click', () => {
    const optimized = document.getElementById('rf-optimized-text').value;
    document.getElementById('rf-jd-text').value = optimized;
    document.getElementById('rf-optimized-section').style.display = 'none';
    showToast('Optimized JD applied', 'success');
  });

  document.getElementById('rf-optimize-reject')?.addEventListener('click', () => {
    document.getElementById('rf-optimized-section').style.display = 'none';
  });

  document.getElementById('rf-pdf-upload-btn')?.addEventListener('click', () => {
    document.getElementById('rf-pdf-input')?.click();
  });

  document.getElementById('rf-pdf-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const status = document.getElementById('rf-pdf-status');
    status.textContent = 'Extracting…';
    try {
      const text = await extractTextFromPDF(file);
      document.getElementById('rf-jd-text').value = text;
      if (!document.getElementById('rf-jd-title').value) {
        document.getElementById('rf-jd-title').value = file.name.replace('.pdf', '').replace(/_/g, ' ');
      }
      status.textContent = '✓ PDF loaded';
      setTimeout(() => { status.textContent = ''; }, 3000);
      showToast('PDF extracted successfully', 'success');
    } catch (err) {
      status.textContent = 'Failed';
      showToast('Could not read PDF. Try copying the text manually.', 'error');
    }
    e.target.value = '';
  });

  document.getElementById('rf-jd-selector')?.addEventListener('change', async (e) => {
    const jdId = e.target.value;
    if (!jdId) return;
    try {
      await setActiveJD(jdId);
      const jds = await getAllJDs();
      const selected = jds.find(j => j.id === jdId);
      if (selected) {
        document.getElementById('rf-jd-title').value = selected.title;
        document.getElementById('rf-jd-text').value = selected.text;
        document.getElementById('rf-optimized-section').style.display = 'none';
        const category = detectRoleCategory(selected.text);
        document.getElementById('recruitflow-sidebar-container')?.setAttribute('data-role', category);
      }
    } catch (e) { showToast('Failed to load JD', 'error'); }
  });

  document.getElementById('rf-jd-new-btn')?.addEventListener('click', () => {
    document.getElementById('rf-jd-title').value = '';
    document.getElementById('rf-jd-text').value = '';
    document.getElementById('rf-jd-selector').value = '';
    document.getElementById('rf-optimized-section').style.display = 'none';
    document.getElementById('rf-jd-title').focus();
  });
}

// ─── MESSAGE PANEL ────────────────────────────────────────────────────────────
async function renderMessagePanel() {
  const panel = document.getElementById('rf-panel-message');
  if (!panel) return;
  panel.innerHTML = `
<div class="rf-panel-scroll">
  <div class="rf-profile-banner" id="rf-profile-banner">
    <div class="rf-profile-banner-top">
      <div>
        <div class="rf-profile-name" id="rf-profile-name">Reading profile…</div>
        <div class="rf-profile-role" id="rf-profile-role">—</div>
        <div class="rf-profile-location" id="rf-profile-location">—</div>
      </div>
      <button id="rf-reread-btn" class="rf-reread-btn" title="Re-read profile">↺ Re-read</button>
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
    <button class="rf-sub-tab-btn active" data-subtab="template">📋 Template</button>
    <button class="rf-sub-tab-btn" data-subtab="ai">✦ AI Generate</button>
  </div>

  <div id="rf-subtab-template" class="rf-sub-panel active">
    <div class="rf-section">
      <label class="rf-label">Select Template</label>
      <select id="rf-template-selector" class="rf-select">
        <option value="">Select a template…</option>
      </select>
    </div>
    <div class="rf-section">
      <label class="rf-label">Message</label>
      <textarea id="rf-message-preview" class="rf-textarea" rows="8"
        placeholder="Select a template to preview the filled message…"></textarea>
    </div>
  </div>

  <div id="rf-subtab-ai" class="rf-sub-panel" style="display:none;">
    <button id="rf-generate-btn" class="rf-btn-ai" style="margin-bottom:10px;">
      ✦ Generate Message
      <span id="rf-ai-msg-badge" class="rf-ai-uses-badge">3 left</span>
    </button>
    <div class="rf-section">
      <label class="rf-label">Generated Message</label>
      <textarea id="rf-ai-message-preview" class="rf-textarea" rows="8"
        placeholder="AI message will appear here…"></textarea>
    </div>
  </div>

  <div class="rf-limit-bar-wrap" style="margin-bottom:10px;">
    <div class="rf-limit-bar-label">
      <span id="rf-limit-label">Today: 0 / 50</span>
    </div>
    <div class="rf-limit-bar-track">
      <div class="rf-limit-bar-fill" id="rf-limit-fill" style="width:0%"></div>
    </div>
  </div>
</div>

<div class="rf-send-panel">
  <button id="rf-send-btn" class="rf-btn-primary">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" stroke-linejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
    Send Message
  </button>
</div>`;

  attachMessageHandlers();
  await refreshTemplateSelector();
  await updateLimitBar();
  await updateAIBadge();
}

function attachMessageHandlers() {
  document.querySelectorAll('.rf-tone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rf-tone-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTone = btn.dataset.tone;
    });
  });

  document.querySelectorAll('.rf-sub-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rf-sub-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.rf-sub-panel').forEach(p => p.style.display = 'none');
      btn.classList.add('active');
      const target = document.getElementById(`rf-subtab-${btn.dataset.subtab}`);
      if (target) { target.style.display = 'block'; target.classList.add('active'); }
    });
  });

  document.getElementById('rf-template-selector')?.addEventListener('change', async (e) => {
    const tplId = e.target.value;
    if (!tplId) return;
    try {
      const templates = await getTemplates();
      const tpl = templates.find(t => t.id === tplId);
      if (!tpl) return;
      const settingsResult = await chrome.storage.local.get('recruitflow_settings');
      const settings = settingsResult.recruitflow_settings || {};
      const jd = await getActiveJD();
      const filled = fillTemplate(tpl.body, currentProfile || {}, jd?.title || '', settings);
      document.getElementById('rf-message-preview').value = filled;
    } catch (e) { showToast('Failed to load template', 'error'); }
  });

  document.getElementById('rf-generate-btn')?.addEventListener('click', async () => {
    if (!currentProfile?.name) {
      showToast('No profile loaded. Visit a LinkedIn profile first.', 'error');
      return;
    }
    const usage = await checkUsageLimit();
    if (!usage.canUse) { showUpgradeModal(); return; }

    const jd = await getActiveJD();
    if (!jd) { showToast('Please save a JD first in the JD tab', 'error'); return; }

    const btn = document.getElementById('rf-generate-btn');
    btn.innerHTML = '<span class="rf-spinner"></span> Generating…';
    btn.disabled = true;

    try {
      const result = await generateMessage(currentProfile, jd.text, currentTone);
      if (result.success) {
        document.getElementById('rf-ai-message-preview').value = result.message;
        await updateAIBadge();
        showToast('Message generated!', 'success');
      } else if (result.limitReached) {
        showUpgradeModal();
      } else {
        showToast(result.error || 'AI unavailable. Please try again.', 'error');
      }
    } catch (e) {
      showToast('AI unavailable. Please try again.', 'error');
    } finally {
      btn.innerHTML = '✦ Generate Message <span id="rf-ai-msg-badge" class="rf-ai-uses-badge"></span>';
      btn.disabled = false;
      await updateAIBadge();
    }
  });

  document.getElementById('rf-send-btn')?.addEventListener('click', async () => {
    const activeSubtab = document.querySelector('.rf-sub-tab-btn.active')?.dataset.subtab;
    const messageText = activeSubtab === 'ai'
      ? document.getElementById('rf-ai-message-preview')?.value?.trim()
      : document.getElementById('rf-message-preview')?.value?.trim();

    if (!messageText) {
      showToast('No message to send. Use a template or generate with AI.', 'error');
      return;
    }

    const sendBtn = document.getElementById('rf-send-btn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="rf-spinner"></span> Sending…';

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'SEND_LINKEDIN_MESSAGE',
        message: messageText
      });

      if (result?.success) {
        const jd = await getActiveJD();
        await addEntry({
          candidateName: currentProfile?.name || '',
          candidateUrl: currentProfile?.profileUrl || window.location.href,
          candidateRole: currentProfile?.role || '',
          candidateCompany: currentProfile?.company || '',
          jdTitle: jd?.title || '',
          messageSent: messageText,
          sentAt: new Date().toISOString(),
          status: 'Sent',
          notes: ''
        });
        await incrementCount();
        await updateLimitBar();
        showToast(`Message sent to ${currentProfile?.name || 'candidate'}!`, 'success');
        document.getElementById('rf-message-preview').value = '';
        document.getElementById('rf-ai-message-preview').value = '';
      } else {
        showToast(result?.error || 'Could not send. LinkedIn composer may not be available.', 'error');
      }
    } catch (e) {
      showToast('Send failed. Please try manually.', 'error');
    } finally {
      sendBtn.disabled = false;
      sendBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Message`;
    }
  });

  document.getElementById('rf-reread-btn')?.addEventListener('click', async () => {
    try {
      const result = await chrome.runtime.sendMessage({ type: 'REREAD_PROFILE' });
      if (result?.profile) {
        currentProfile = result.profile;
        updateProfileBanner(result.profile);
        showToast('Profile refreshed', 'success');
      } else {
        showToast('Could not re-read profile. Try scrolling the page first.', 'warning');
      }
    } catch (e) { showToast('Re-read failed', 'error'); }
  });
}

// ─── TRACKER PANEL ────────────────────────────────────────────────────────────
async function renderTrackerPanel() {
  const panel = document.getElementById('rf-panel-tracker');
  if (!panel) return;
  panel.innerHTML = `
<div class="rf-panel-scroll">
  <div class="rf-stats-row" style="margin-bottom:12px;">
    <div class="rf-stat-mini">
      <div class="rf-stat-mini-val" id="rf-stat-sent">0</div>
      <div class="rf-stat-mini-label">Total</div>
    </div>
    <div class="rf-stat-mini">
      <div class="rf-stat-mini-val" id="rf-stat-replied" style="color:var(--rf-success)">0</div>
      <div class="rf-stat-mini-label">Replied</div>
    </div>
    <div class="rf-stat-mini">
      <div class="rf-stat-mini-val" id="rf-stat-hired" style="color:var(--rf-warning)">0</div>
      <div class="rf-stat-mini-label">Hired</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:10px;">
    <input type="text" id="rf-tracker-search" class="rf-input"
      placeholder="Search by name or company…" />
    <select id="rf-tracker-filter" class="rf-select" style="width:auto;min-width:90px;">
      <option value="">All</option>
      <option value="Sent">Sent</option>
      <option value="Replied">Replied</option>
      <option value="Not Interested">Not Interested</option>
      <option value="Hired">Hired</option>
    </select>
  </div>

  <div id="rf-tracker-list"></div>

  <div class="rf-divider"></div>
  <button id="rf-export-btn" class="rf-btn-secondary">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    Export CSV
  </button>
</div>`;

  attachTrackerHandlers();
  await renderTrackerEntries();
  await refreshTrackerStats();
}

function attachTrackerHandlers() {
  document.getElementById('rf-tracker-search')?.addEventListener('input', (e) => {
    const filter = document.getElementById('rf-tracker-filter')?.value || '';
    renderTrackerEntries(filter, e.target.value);
  });

  document.getElementById('rf-tracker-filter')?.addEventListener('change', (e) => {
    const search = document.getElementById('rf-tracker-search')?.value || '';
    renderTrackerEntries(e.target.value, search);
  });

  document.getElementById('rf-export-btn')?.addEventListener('click', async () => {
    try {
      const csv = await exportToCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recruitflow-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('CSV exported!', 'success');
    } catch (e) { showToast('Export failed.', 'error'); }
  });
}

async function renderTrackerEntries(filter = '', search = '') {
  try {
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

    list.innerHTML = entries.map(entry => {
      const statusClass = {
        'Sent': 'rf-badge-sent',
        'Replied': 'rf-badge-replied',
        'Not Interested': 'rf-badge-notinterested',
        'Hired': 'rf-badge-hired'
      }[entry.status] || 'rf-badge-sent';

      return `<div class="rf-tracker-row" data-id="${entry.id}">
        <div class="rf-tracker-info">
          <div class="rf-tracker-name" data-url="${entry.candidateUrl || ''}"
            style="cursor:pointer;">${entry.candidateName || 'Unknown'}</div>
          <div class="rf-tracker-meta">
            ${[entry.candidateRole, entry.candidateCompany].filter(Boolean).join(' @ ')}
            ${entry.sentAt ? '· ' + formatDate(entry.sentAt) : ''}
          </div>
        </div>
        <div class="rf-tracker-actions">
          <select class="rf-tracker-status-select ${statusClass}" data-id="${entry.id}">
            <option ${entry.status === 'Sent' ? 'selected' : ''}>Sent</option>
            <option ${entry.status === 'Replied' ? 'selected' : ''}>Replied</option>
            <option ${entry.status === 'Not Interested' ? 'selected' : ''}>Not Interested</option>
            <option ${entry.status === 'Hired' ? 'selected' : ''}>Hired</option>
          </select>
          <button class="rf-icon-btn rf-delete-btn" data-id="${entry.id}" title="Delete">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
              stroke-width="2"><polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
            </svg>
          </button>
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('.rf-tracker-name[data-url]').forEach(el => {
      el.addEventListener('click', () => {
        const url = el.getAttribute('data-url');
        if (url) window.open(url, '_blank');
      });
    });

    list.querySelectorAll('.rf-tracker-status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await updateStatus(sel.dataset.id, sel.value);
          await refreshTrackerStats();
          showToast('Status updated', 'success');
        } catch (e) { showToast('Failed to update status', 'error'); }
      });
    });

    list.querySelectorAll('.rf-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this entry?')) return;
        try {
          await deleteEntry(btn.dataset.id);
          const filter = document.getElementById('rf-tracker-filter')?.value || '';
          const search = document.getElementById('rf-tracker-search')?.value || '';
          await renderTrackerEntries(filter, search);
          await refreshTrackerStats();
          showToast('Entry deleted', 'success');
        } catch (e) { showToast('Failed to delete', 'error'); }
      });
    });
  } catch (e) {
    console.error('RecruitFlow: renderTrackerEntries error', e);
  }
}

async function refreshTrackerStats() {
  try {
    const entries = await getAllEntries();
    const sentEl = document.getElementById('rf-stat-sent');
    const repliedEl = document.getElementById('rf-stat-replied');
    const hiredEl = document.getElementById('rf-stat-hired');
    if (sentEl) sentEl.textContent = entries.length;
    if (repliedEl) repliedEl.textContent = entries.filter(e => e.status === 'Replied').length;
    if (hiredEl) hiredEl.textContent = entries.filter(e => e.status === 'Hired').length;
  } catch (e) { console.error('RecruitFlow: refreshTrackerStats error', e); }
}

function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch (_) { return ''; }
}

// ─── SETTINGS PANEL ───────────────────────────────────────────────────────────
async function renderSettingsPanel() {
  const panel = document.getElementById('rf-panel-settings');
  if (!panel) return;
  panel.innerHTML = `
<div class="rf-panel-scroll">
  <div class="rf-settings-group">
    <div class="rf-settings-group-title">Your Info</div>
    <div class="rf-settings-row">
      <label class="rf-label">Your Name</label>
      <input type="text" id="rf-setting-name" class="rf-input"
        placeholder="e.g. Rahul Sharma" />
    </div>
    <div class="rf-settings-row">
      <label class="rf-label">Your Company</label>
      <input type="text" id="rf-setting-company" class="rf-input"
        placeholder="e.g. TechHire Solutions" />
    </div>
  </div>

  <div class="rf-settings-group">
    <div class="rf-settings-group-title">Daily Limit Guard</div>
    <div class="rf-settings-row">
      <label class="rf-label">Max messages per day</label>
      <input type="number" id="rf-setting-limit" class="rf-input"
        value="50" min="10" max="150" />
    </div>
    <p style="font-size:11px;color:var(--rf-text-muted);margin-top:4px;">
      LinkedIn's safe limit is ~50/day. We recommend 40–50.
    </p>
  </div>

  <button id="rf-settings-save" class="rf-btn-primary" style="margin-bottom:14px;">
    Save Settings
  </button>

  <div class="rf-settings-group">
    <div class="rf-settings-group-title">Templates</div>
    <div id="rf-template-manage-list"></div>
    <button id="rf-add-template-btn" class="rf-btn-secondary rf-btn-sm" style="margin-top:8px;">
      + Add Template
    </button>
  </div>

  <div id="rf-add-template-form" style="display:none;" class="rf-settings-group">
    <div class="rf-settings-group-title">New Template</div>
    <div class="rf-settings-row">
      <label class="rf-label">Name</label>
      <input type="text" id="rf-new-tpl-name" class="rf-input" placeholder="e.g. Tech Outreach" />
    </div>
    <div class="rf-settings-row">
      <label class="rf-label">Body</label>
      <textarea id="rf-new-tpl-body" class="rf-textarea" rows="5"
        placeholder="Hi {name}, …"></textarea>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
      <button id="rf-save-tpl-btn" class="rf-btn-primary rf-btn-sm">Save</button>
      <button id="rf-cancel-tpl-btn" class="rf-btn-secondary rf-btn-sm">Cancel</button>
    </div>
  </div>

  <div class="rf-settings-group">
    <div class="rf-settings-group-title">Plan</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <span class="rf-badge rf-badge-sent">Free</span>
      <span style="font-size:12px;color:var(--rf-text-muted);">3 AI uses included</span>
    </div>
    <button id="rf-upgrade-btn" class="rf-btn-ai" disabled style="opacity:0.6;cursor:not-allowed;">
      ✦ Upgrade to Pro — ₹999/month
    </button>
    <p style="font-size:11px;color:var(--rf-text-muted);text-align:center;margin-top:6px;">
      Payment coming soon
    </p>
  </div>

  <div class="rf-settings-group" style="border-color:var(--rf-danger)">
    <div class="rf-settings-group-title" style="color:var(--rf-danger)">Danger Zone</div>
    <button id="rf-clear-data-btn" class="rf-btn-danger" style="width:100%;">
      Clear All Data
    </button>
  </div>

  <div class="rf-version-line">RecruitFlow v1.0.0 — Free Tier</div>
</div>`;

  attachSettingsHandlers();
  await loadSettingsValues();
  await renderTemplateManageList();
}

function attachSettingsHandlers() {
  document.getElementById('rf-settings-save')?.addEventListener('click', async () => {
    const settings = {
      recruiter_name: document.getElementById('rf-setting-name')?.value.trim() || '',
      recruiter_company: document.getElementById('rf-setting-company')?.value.trim() || '',
      daily_limit: parseInt(document.getElementById('rf-setting-limit')?.value) || 50
    };
    try {
      const usageResult = await chrome.storage.local.get('recruitflow_usage');
      const usage = usageResult.recruitflow_usage || {};
      usage.daily_limit = settings.daily_limit;
      await chrome.storage.local.set({
        recruitflow_settings: settings,
        recruitflow_usage: usage
      });
      await setDailyLimit(settings.daily_limit);
      await updateLimitBar();
      showToast('Settings saved', 'success');
    } catch (e) { showToast('Failed to save settings', 'error'); }
  });

  document.getElementById('rf-clear-data-btn')?.addEventListener('click', async () => {
    if (!confirm('This will delete ALL your templates, JDs, and outreach history. Are you sure?')) return;
    try {
      await chrome.storage.local.clear();
      showToast('All data cleared. Reloading…', 'warning');
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) { showToast('Failed to clear data', 'error'); }
  });

  document.getElementById('rf-add-template-btn')?.addEventListener('click', () => {
    document.getElementById('rf-add-template-form').style.display = 'block';
    document.getElementById('rf-new-tpl-name').value = '';
    document.getElementById('rf-new-tpl-body').value = '';
    document.getElementById('rf-new-tpl-name').focus();
  });

  document.getElementById('rf-cancel-tpl-btn')?.addEventListener('click', () => {
    document.getElementById('rf-add-template-form').style.display = 'none';
  });

  document.getElementById('rf-save-tpl-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('rf-new-tpl-name')?.value.trim();
    const body = document.getElementById('rf-new-tpl-body')?.value.trim();
    if (!name || !body) { showToast('Please fill in both fields', 'warning'); return; }
    try {
      const result = await chrome.storage.local.get('recruitflow_templates');
      const templates = result.recruitflow_templates || [];
      templates.push({ id: 'tpl_' + Date.now(), name, body, createdAt: new Date().toISOString() });
      await chrome.storage.local.set({ recruitflow_templates: templates });
      document.getElementById('rf-add-template-form').style.display = 'none';
      await renderTemplateManageList();
      await refreshTemplateSelector();
      showToast('Template saved!', 'success');
    } catch (e) { showToast('Failed to save template', 'error'); }
  });
}

async function loadSettingsValues() {
  try {
    const result = await chrome.storage.local.get(['recruitflow_settings', 'recruitflow_usage']);
    const settings = result.recruitflow_settings || {};
    const usage = result.recruitflow_usage || {};
    const nameEl = document.getElementById('rf-setting-name');
    const companyEl = document.getElementById('rf-setting-company');
    const limitEl = document.getElementById('rf-setting-limit');
    if (nameEl) nameEl.value = settings.recruiter_name || '';
    if (companyEl) companyEl.value = settings.recruiter_company || '';
    if (limitEl) limitEl.value = settings.daily_limit || usage.daily_limit || 50;
    return settings;
  } catch (e) { return {}; }
}

async function renderTemplateManageList() {
  const list = document.getElementById('rf-template-manage-list');
  if (!list) return;
  try {
    const result = await chrome.storage.local.get('recruitflow_templates');
    const templates = result.recruitflow_templates || [];
    if (templates.length === 0) {
      list.innerHTML = '<p style="font-size:12px;color:var(--rf-text-muted);">No templates saved.</p>';
      return;
    }
    list.innerHTML = templates.map(t => `
      <div class="rf-template-card" style="cursor:default;margin-bottom:6px;">
        <div class="rf-template-card-header">
          <span class="rf-template-card-name">${t.name}</span>
          ${!t.id.startsWith('default_') ? `
            <button class="rf-icon-btn" data-del-tpl="${t.id}" title="Delete template">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
                stroke-width="2"><polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/></svg>
            </button>` : ''}
        </div>
        <div class="rf-template-card-preview">${t.body.substring(0, 70)}…</div>
      </div>`).join('');

    list.querySelectorAll('[data-del-tpl]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del-tpl');
        const r = await chrome.storage.local.get('recruitflow_templates');
        const filtered = (r.recruitflow_templates || []).filter(t => t.id !== id);
        await chrome.storage.local.set({ recruitflow_templates: filtered });
        await renderTemplateManageList();
        await refreshTemplateSelector();
        showToast('Template deleted', 'success');
      });
    });
  } catch (e) { console.error('RecruitFlow: renderTemplateManageList error', e); }
}

// ─── SHARED UTILITIES ─────────────────────────────────────────────────────────
function updateProfileBanner(profile) {
  if (!profile) return;
  const firstName = (profile.name || '').split(' ')[0];
  const nameEl = document.getElementById('rf-profile-name');
  const roleEl = document.getElementById('rf-profile-role');
  const locEl = document.getElementById('rf-profile-location');
  if (nameEl) nameEl.textContent = profile.name || 'Unknown';
  if (roleEl) roleEl.textContent = profile.role
    ? `${profile.role}${profile.company ? ' @ ' + profile.company : ''}`
    : '—';
  if (locEl) locEl.textContent = profile.location || '—';
  const headerName = document.getElementById('rf-header-name');
  if (headerName) headerName.textContent = firstName || '';
}

async function fillActiveTemplate(profile) {
  try {
    const select = document.getElementById('rf-template-selector');
    if (!select || !select.value) return;
    const result = await chrome.storage.local.get('recruitflow_templates');
    const templates = result.recruitflow_templates || [];
    const tpl = templates.find(t => t.id === select.value);
    if (!tpl) return;
    const settingsResult = await chrome.storage.local.get('recruitflow_settings');
    const settings = settingsResult.recruitflow_settings || {};
    const jd = await getActiveJD();
    const filled = fillTemplate(tpl.body, profile || currentProfile || {}, jd?.title || '', settings);
    const preview = document.getElementById('rf-message-preview');
    if (preview) preview.value = filled;
  } catch (e) { console.error('RecruitFlow: fillActiveTemplate error', e); }
}

async function updateAIBadge() {
  try {
    const usage = await checkUsageLimit();
    const usesLeft = Math.max(0, 3 - ((await chrome.runtime.sendMessage({ type: 'GET_USAGE' })).ai_uses_total || 0));
    const text = usage.isPro ? '∞' : `${usesLeft} left`;
    document.querySelectorAll('.rf-ai-uses-badge, #rf-ai-uses-badge, #rf-ai-msg-badge').forEach(badge => {
      if (badge) {
        badge.textContent = text;
        badge.style.background = usesLeft === 0 && !usage.isPro ? '#FEE2E2' : '';
        badge.style.color = usesLeft === 0 && !usage.isPro ? '#991B1B' : '';
      }
    });
  } catch (e) { console.error('RecruitFlow: updateAIBadge error', e); }
}

async function updateLimitBar() {
  try {
    const status = await getStatus();
    const label = document.getElementById('rf-limit-label');
    const fill = document.getElementById('rf-limit-fill');
    if (!label || !fill) return;
    label.textContent = `Today: ${status.count} / ${status.limit}`;
    fill.style.width = `${Math.min(100, status.percentage)}%`;
    fill.className = 'rf-limit-bar-fill';
    if (status.level === 'warning') fill.classList.add('warning');
    if (status.level === 'danger') fill.classList.add('danger');
  } catch (e) { console.error('RecruitFlow: updateLimitBar error', e); }
}

function showToast(message, type = 'success') {
  const existing = document.getElementById('rf-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'rf-toast';
  toast.className = `rf-toast rf-toast-${type}`;
  const icons = { success: '✓', error: '✕', warning: '⚠' };
  toast.innerHTML = `<span>${icons[type] || '•'}</span><span>${message}</span>`;
  const toastContainer = document.getElementById('rf-toast-container');
  if (toastContainer) {
    toastContainer.appendChild(toast);
  } else {
    const sidebar = document.querySelector('.rf-sidebar');
    if (sidebar) sidebar.appendChild(toast);
  }
  setTimeout(() => toast.remove(), 3500);
}

function showUpgradeModal() {
  const existing = document.getElementById('rf-upgrade-overlay');
  if (existing) { existing.classList.add('visible'); return; }

  const modal = document.createElement('div');
  modal.id = 'rf-upgrade-overlay-dynamic';
  modal.className = 'rf-upgrade-overlay visible';
  modal.innerHTML = `
    <div class="rf-upgrade-card">
      <span class="rf-upgrade-icon">🔒</span>
      <div class="rf-upgrade-title">Free limit reached</div>
      <div class="rf-upgrade-sub">You've used all 3 free AI generations.</div>
      <div class="rf-upgrade-price">₹999<span style="font-size:14px;font-weight:400;color:var(--rf-text-muted)">/month</span></div>
      <ul class="rf-upgrade-features">
        <li>Unlimited AI messages</li>
        <li>Unlimited templates</li>
        <li>Unlimited tracking</li>
        <li>PDF uploads</li>
        <li>JD Optimizer</li>
        <li>CSV export</li>
      </ul>
      <button class="rf-btn-ai" disabled style="opacity:0.6;margin-bottom:8px;">
        ✦ Upgrade to Pro — Coming Soon
      </button>
      <button class="rf-btn-secondary" id="rf-dynamic-upgrade-dismiss">Maybe Later</button>
    </div>`;
  const sidebar = document.querySelector('.rf-sidebar');
  if (sidebar) sidebar.appendChild(modal);
  document.getElementById('rf-dynamic-upgrade-dismiss')?.addEventListener('click', () => modal.remove());
}

async function refreshJDSelector() {
  try {
    const jds = await getAllJDs();
    const selector = document.getElementById('rf-jd-selector');
    if (!selector) return;
    const activeJD = await getActiveJD();
    selector.innerHTML = '<option value="">Select a JD…</option>' +
      jds.map(jd => `<option value="${jd.id}" ${activeJD?.id === jd.id ? 'selected' : ''}>${jd.title}</option>`).join('');
    if (activeJD) {
      document.getElementById('rf-jd-title').value = activeJD.title;
      document.getElementById('rf-jd-text').value = activeJD.text;
    }
  } catch (e) { console.error('RecruitFlow: refreshJDSelector error', e); }
}

async function refreshTemplateSelector() {
  try {
    const templates = await getTemplates();
    const selector = document.getElementById('rf-template-selector');
    if (!selector) return;
    selector.innerHTML = '<option value="">Select a template…</option>' +
      templates.map(tpl => `<option value="${tpl.id}">${tpl.name}</option>`).join('');
  } catch (e) { console.error('RecruitFlow: refreshTemplateSelector error', e); }
}

function startDailyResetCheck() {
  checkAndResetIfNewDay().catch(console.error);
  setInterval(() => checkAndResetIfNewDay().catch(console.error), 5 * 60 * 1000);
}
