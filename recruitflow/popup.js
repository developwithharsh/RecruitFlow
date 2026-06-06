document.addEventListener('DOMContentLoaded', async () => {
  await loadStats();

  document.getElementById('openSidebar').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('linkedin.com/in/')) {
        window.close();
      } else {
        chrome.tabs.create({ url: 'https://www.linkedin.com' });
        window.close();
      }
    });
  });

  document.getElementById('refreshBtn').addEventListener('click', async () => {
    document.getElementById('refreshBtn').style.transform = 'rotate(360deg)';
    await loadStats();
    setTimeout(() => {
      document.getElementById('refreshBtn').style.transform = '';
    }, 300);
  });

  document.getElementById('settingsLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('linkedin.com/in/')) {
        window.close();
      } else {
        chrome.tabs.create({ url: 'https://www.linkedin.com' });
        window.close();
      }
    });
  });
});

async function loadStats() {
  try {
    const usage = await chrome.runtime.sendMessage({ type: 'GET_USAGE' });
    const trackerResult = await chrome.storage.local.get('recruitflow_tracker');
    const entries = trackerResult.recruitflow_tracker || [];

    const todayCount = usage.daily_messages_sent || 0;
    const aiUsesTotal = usage.ai_uses_total || 0;
    const aiLeft = Math.max(0, 3 - aiUsesTotal);

    document.getElementById('todayCount').textContent = todayCount;
    document.getElementById('aiLeft').textContent = usage.is_pro ? '∞' : aiLeft;
    document.getElementById('totalSent').textContent = entries.length;
  } catch (e) {
    document.getElementById('todayCount').textContent = '–';
    document.getElementById('aiLeft').textContent = '–';
    document.getElementById('totalSent').textContent = '–';
    console.error('RecruitFlow popup: failed to load stats', e);
  }
}
