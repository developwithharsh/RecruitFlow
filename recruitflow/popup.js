'use strict';

// ── Crypto helpers ────────────────────────────────────────────────────────────
async function hashPassword(password) {
  const encoded = new TextEncoder().encode(password);
  const buffer  = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Storage helpers ───────────────────────────────────────────────────────────
async function getAuth() {
  return new Promise(resolve =>
    chrome.storage.local.get('recruitflow_auth', d => resolve(d.recruitflow_auth || null)));
}

async function setAuth(data) {
  return new Promise(resolve =>
    chrome.storage.local.set({ recruitflow_auth: data }, resolve));
}

// ── View switching ────────────────────────────────────────────────────────────
function showAuthView()  { document.getElementById('auth-view').style.display  = 'flex';  document.getElementById('main-view').style.display  = 'none'; }
function showMainView()  { document.getElementById('auth-view').style.display  = 'none';  document.getElementById('main-view').style.display  = 'flex'; }

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function clearError(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = 'none'; el.textContent = ''; }
}

// ── Stats loader ──────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const usage  = await chrome.runtime.sendMessage({ type: 'GET_USAGE' });
    const result = await new Promise(r => chrome.storage.local.get('recruitflow_tracker', r));
    const entries = result.recruitflow_tracker || [];

    document.getElementById('todayCount').textContent = usage.daily_messages_sent || 0;
    document.getElementById('aiLeft').textContent     = usage.is_pro ? '∞' : Math.max(0, 3 - (usage.ai_uses_total || 0));
    document.getElementById('totalSent').textContent  = entries.length;
  } catch (_) {
    ['todayCount','aiLeft','totalSent'].forEach(id => { document.getElementById(id).textContent = '–'; });
  }
}

// ── Auth tab toggle ───────────────────────────────────────────────────────────
function wireAuthTabs() {
  document.querySelectorAll('.auth-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.auth-toggle-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.style.display = 'none');
      btn.classList.add('active');
      const form = document.getElementById(btn.dataset.form);
      if (form) form.style.display = 'flex';
      clearError('login-error');
      clearError('signup-error');
    });
  });
}

// ── Password visibility toggles ───────────────────────────────────────────────
function wirePasswordToggles() {
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  });
}

// ── Login ─────────────────────────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  clearError('login-error');

  const email    = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const btn      = e.target.querySelector('button[type="submit"]');

  if (!email || !password) { showError('login-error', 'Please fill in all fields.'); return; }

  btn.disabled = true; btn.textContent = 'Signing in…';

  try {
    const auth = await getAuth();
    if (!auth || !auth.accounts || !auth.accounts.length) {
      showError('login-error', 'No account found. Please sign up first.');
      return;
    }

    const hash    = await hashPassword(password);
    const account = auth.accounts.find(a => a.email === email && a.passwordHash === hash);

    if (!account) {
      showError('login-error', 'Incorrect email or password.');
      return;
    }

    await setAuth({ ...auth, currentUser: { email: account.email, name: account.name }, isLoggedIn: true });
    await onLoggedIn({ email: account.email, name: account.name });
  } catch (err) {
    showError('login-error', 'Something went wrong. Please try again.');
  } finally {
    btn.disabled = false; btn.textContent = 'Sign In';
  }
});

// ── Sign up ───────────────────────────────────────────────────────────────────
document.getElementById('signup-form').addEventListener('submit', async e => {
  e.preventDefault();
  clearError('signup-error');

  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim().toLowerCase();
  const password = document.getElementById('signup-password').value;
  const btn      = e.target.querySelector('button[type="submit"]');

  if (!name || !email || !password) { showError('signup-error', 'Please fill in all fields.'); return; }
  if (password.length < 6)          { showError('signup-error', 'Password must be at least 6 characters.'); return; }

  btn.disabled = true; btn.textContent = 'Creating account…';

  try {
    const auth     = (await getAuth()) || { accounts: [] };
    const accounts = auth.accounts || [];

    if (accounts.find(a => a.email === email)) {
      showError('signup-error', 'An account with this email already exists.');
      return;
    }

    const hash = await hashPassword(password);
    accounts.push({ email, name, passwordHash: hash, createdAt: new Date().toISOString() });

    await setAuth({ accounts, currentUser: { email, name }, isLoggedIn: true });

    // Also pre-fill recruiter settings with the signup name
    const existing = await new Promise(r => chrome.storage.local.get('recruitflow_settings', r));
    const settings = existing.recruitflow_settings || {};
    if (!settings.recruiter_name) {
      await new Promise(r => chrome.storage.local.set({ recruitflow_settings: { ...settings, recruiter_name: name } }, r));
    }

    await onLoggedIn({ email, name });
  } catch (err) {
    showError('signup-error', 'Something went wrong. Please try again.');
  } finally {
    btn.disabled = false; btn.textContent = 'Create Account';
  }
});

// ── After login / signup ──────────────────────────────────────────────────────
async function onLoggedIn(user) {
  showMainView();
  const chip = document.getElementById('user-chip');
  const welcome = document.getElementById('welcome-line');
  if (chip)    chip.textContent    = user.name || user.email;
  if (welcome) welcome.textContent = `Welcome back, ${user.name?.split(' ')[0] || 'there'}! 👋`;
  await loadStats();
}

// ── Open sidebar button ───────────────────────────────────────────────────────
document.getElementById('openSidebar').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.url?.includes('linkedin.com')) { window.close(); }
    else { chrome.tabs.create({ url: 'https://www.linkedin.com' }); window.close(); }
  });
});

// ── Refresh button ────────────────────────────────────────────────────────────
document.getElementById('refreshBtn').addEventListener('click', async () => {
  document.getElementById('refreshBtn').style.transform = 'rotate(360deg)';
  await loadStats();
  setTimeout(() => { document.getElementById('refreshBtn').style.transform = ''; }, 350);
});

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', async () => {
  const auth = await getAuth();
  if (auth) await setAuth({ ...auth, isLoggedIn: false, currentUser: null });
  showAuthView();
});

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  wireAuthTabs();
  wirePasswordToggles();

  const auth = await getAuth();
  if (auth?.isLoggedIn && auth?.currentUser) {
    await onLoggedIn(auth.currentUser);
  } else {
    showAuthView();
  }
});
