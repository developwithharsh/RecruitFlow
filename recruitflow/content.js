(function () {
  'use strict';

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

  // ── resolveGeoId — asks LinkedIn's typeahead API using the user's session ──
  async function resolveGeoId(cityName) {
    try {
      const m = document.cookie.match(/JSESSIONID="?([^";]+)"?/);
      if (!m) return '';
      const csrf = m[1];
      const apiUrl = `https://www.linkedin.com/voyager/api/typeahead/hitsV2?keywords=${encodeURIComponent(cityName)}&origin=OTHER&q=type&type=GEO`;
      const res = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'csrf-token': csrf,
          'accept': 'application/vnd.linkedin.normalized+json+2.1',
          'x-restli-protocol-version': '2.0.0'
        }
      });
      if (!res.ok) return '';
      const data = await res.json();
      const text = JSON.stringify(data);
      const urnMatch = text.match(/urn:li:(?:fs_geo|geo):(\d+)/);
      return urnMatch ? urnMatch[1] : '';
    } catch (_) { return ''; }
  }

  // ── Runtime message handlers ──────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'REREAD_PROFILE') {
      try {
        const profile = readProfile();
        sendResponse({ profile });
      } catch (e) { sendResponse({ profile: null }); }
      return true;
    }
    if (msg.type === 'GET_PROFILE') {
      sendResponse(readProfile());
      return true;
    }
    if (msg.type === 'GET_RECIPIENT_NAME') {
      sendResponse({ name: getChatRecipientName('') });
      return true;
    }
    if (msg.type === 'RESOLVE_GEO_ID') {
      resolveGeoId(msg.cityName).then(geoId => sendResponse({ geoId })).catch(() => sendResponse({ geoId: '' }));
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
      if (location.href.includes('/in/')) {
        // On a profile page — re-read and broadcast updated profile to side panel
        setTimeout(() => {
          const profile = readProfile();
          try { chrome.runtime.sendMessage({ type: 'PROFILE_UPDATED', profile }); } catch (_) {}
        }, 1600);
      } else {
        // Not a profile — clear the profile banner in side panel
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

        // ── Daily limit check ─────────────────────────────────────────────
        const usageRaw = await new Promise(r => chrome.storage.local.get('recruitflow_usage', d => r(d.recruitflow_usage)));
        const usage = usageRaw || {};
        const isPro = usage.is_pro || false;
        const FREE_MSG_LIMIT = 3;
        const today = new Date().toDateString();
        // Reset count if it's a new day
        const dailySent = (usage.last_reset_date === today) ? (usage.daily_messages_sent || 0) : 0;
        const dailyLimit = isPro ? (usage.daily_limit || 20) : FREE_MSG_LIMIT;
        if (dailySent >= dailyLimit) {
          sendBtn.textContent = isPro ? '✗ Daily limit reached' : '✗ Free limit (3/day) reached';
          sendBtn.style.background = '#DC2626';
          setTimeout(() => {
            sendBtn.textContent = '✦ Send Message';
            sendBtn.style.background = '#2563EB';
            sendBtn.disabled = false;
          }, 2500);
          return;
        }
        // ─────────────────────────────────────────────────────────────────

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

})();
