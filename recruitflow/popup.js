'use strict';

document.addEventListener('DOMContentLoaded', async () => {

  // ── Load stats from recruitflow storage keys ─────────────────────────────
  try {
    const result = await new Promise(resolve =>
      chrome.storage.local.get(
        ['recruitflow_usage', 'recruitflow_tracker', 'recruitflow_settings'],
        resolve
      )
    );

    const usage    = result.recruitflow_usage   || {};
    const entries  = result.recruitflow_tracker || [];
    const settings = result.recruitflow_settings || {};

    // AI uses left (3 free)
    const aiLeft = usage.is_pro ? '∞' : Math.max(0, 3 - (usage.ai_uses_total || 0));
    const aiEl   = document.getElementById('aiLeft');
    if (aiEl) aiEl.textContent = aiLeft;

    // Today's sent count (with daily reset check)
    const today      = new Date().toDateString();
    const todayCount = usage.last_reset_date === today ? (usage.daily_messages_sent || 0) : 0;
    const todayEl    = document.getElementById('todayCount');
    if (todayEl) todayEl.textContent = todayCount;

    // Total sent (tracker length)
    const totalEl = document.getElementById('totalSent');
    if (totalEl) totalEl.textContent = entries.length;

    // Personalised greeting using saved recruiter name
    const name    = settings.recruiter_name || '';
    const greetEl = document.getElementById('greeting');
    if (greetEl) {
      greetEl.textContent = name
        ? `Welcome back, ${name.split(' ')[0]}! 👋`
        : 'Welcome to RecruitFlow! 👋';
    }

    // Plan badge
    const planEl = document.getElementById('planBadge');
    if (planEl) planEl.textContent = usage.is_pro ? 'Pro ✦' : 'Free';

  } catch (err) {
    console.error('RecruitFlow popup load error:', err);
  }

  // ── Main CTA — Step 4: smart sidebar open ────────────────────────────────
  const mainBtn = document.getElementById('openSidebar');
  if (mainBtn) {
    mainBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url   = tab?.url || '';

      if (url.includes('linkedin.com')) {
        // On any LinkedIn page — show/inject the sidebar directly
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const container = document.getElementById('recruitflow-sidebar-container');
            if (container) {
              // Already injected — just uncollapse
              container.classList.remove('collapsed');
            } else {
              // Content script loaded but sidebar not injected yet — trigger it
              window.dispatchEvent(new CustomEvent('rf-force-inject'));
            }
          }
        });
        window.close();

      } else {
        // Not on LinkedIn — open LinkedIn in current tab (content script will auto-inject)
        await chrome.tabs.update(tab.id, {
          url: 'https://www.linkedin.com/feed/'
        });
        window.close();
      }
    });
  }

  // ── Refresh button ────────────────────────────────────────────────────────
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => location.reload());
  }

  // ── Settings link — switch sidebar to settings tab on LinkedIn ────────────
  const settingsLink = document.getElementById('settingsLink');
  if (settingsLink) {
    settingsLink.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url?.includes('linkedin.com')) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const container = document.getElementById('recruitflow-sidebar-container');
            if (container) {
              container.classList.remove('collapsed');
              const settingsBtn = container.querySelector('.rf-tab-btn[data-tab="settings"]');
              if (settingsBtn) settingsBtn.click();
            }
          }
        });
        window.close();
      }
    });
  }

});
