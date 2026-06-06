# RecruitFlow — Setup Guide

## 1. Load the Extension in Chrome (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `recruitflow/` folder (the folder containing `manifest.json`)
5. The RecruitFlow extension icon will appear in your Chrome toolbar
6. Pin it by clicking the puzzle icon → pin RecruitFlow

---

## 2. Get a Free Groq API Key

Groq offers a generous free tier (fast Llama 3 inference).

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Click **API Keys** in the left sidebar
4. Click **Create API Key** — name it "RecruitFlow"
5. Copy the key (starts with `gsk_...`)
6. Open `background.js` in a text editor
7. Replace `"YOUR_GROQ_API_KEY_HERE"` with your key:
   ```javascript
   const GROQ_API_KEY = "gsk_your_actual_key_here";
   ```
8. Go back to `chrome://extensions/` and click the **↺ Reload** button on the RecruitFlow card

---

## 3. Get a Free Gemini API Key (Fallback AI)

Gemini is used as a fallback if Groq is unavailable.

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API key**
4. Copy the key (starts with `AIza...`)
5. Open `background.js` and replace `"YOUR_GEMINI_API_KEY_HERE"`:
   ```javascript
   const GEMINI_API_KEY = "AIzaSy_your_actual_key_here";
   ```
6. Reload the extension at `chrome://extensions/`

---

## 4. Test the Extension on LinkedIn

### Step 1 — Open a LinkedIn profile
Navigate to any LinkedIn profile URL, e.g.:
```
https://www.linkedin.com/in/some-person/
```

### Step 2 — Sidebar should appear
The RecruitFlow sidebar will automatically inject on the right side of the screen.
- If it doesn't appear, check the Chrome console (F12) for errors
- Make sure the extension is loaded and enabled

### Step 3 — Set up your info
1. Click the **Settings** tab in the sidebar
2. Enter your name and company (used in template placeholders)
3. Click **Save Settings**

### Step 4 — Add a Job Description
1. Click the **JD** tab
2. Paste a job description OR upload a PDF
3. Add a title (e.g. "Senior React Developer — Mumbai")
4. Click **Save JD**
5. (Optional) Click **Optimize with AI** to improve it

### Step 5 — Send a message
1. Click the **Message** tab
2. The candidate's name, role, and company are auto-read from their profile
3. Choose a **Template** or click **AI Generate**
4. Review the message text
5. Click **Send Message** — it will open LinkedIn's native message composer and send

### Step 6 — Track your outreach
1. Click the **Tracker** tab
2. All sent messages appear here automatically
3. Update status (Sent → Replied → Hired) as conversations progress
4. Use **Export CSV** to download your data

---

## Testing Checklist

- [ ] Sidebar injects on `linkedin.com/in/*` pages
- [ ] Sidebar does NOT inject on other pages (google.com, etc.)
- [ ] Collapse/expand toggle (the left tab) works smoothly
- [ ] Profile name, role, company auto-read correctly
- [ ] Template fills `{name}`, `{role}`, `{company}` correctly
- [ ] AI generation returns a message (requires valid Groq key)
- [ ] Free tier blocks AI after 3 uses and shows upgrade prompt
- [ ] PDF upload extracts text and populates JD area
- [ ] Send button injects message into LinkedIn composer
- [ ] Tracker logs the entry after send
- [ ] Daily limit bar shows warning colour at 80%+
- [ ] Data persists after browser restart
- [ ] Popup shows correct stats (click extension icon)

---

## Troubleshooting

**Sidebar doesn't appear**
- Open F12 → Console tab — look for errors
- Make sure you're on `https://www.linkedin.com/in/...` (must have `/in/`)
- Reload the extension at `chrome://extensions/`

**AI not working**
- Check that you've replaced the API key placeholders in `background.js`
- Check the Chrome extension background console: `chrome://extensions/` → RecruitFlow → "Service Worker" link → Console
- Groq free tier may have rate limits — wait a moment and try again

**Profile data not reading**
- LinkedIn updates its DOM regularly. The sidebar will show empty fields with a "fill manually" message
- Click "↺ Re-read" button to retry reading
- Fill in manually if needed — the template will still work

**Message composer not opening**
- Some LinkedIn profiles have messaging disabled or restricted
- The error toast will explain what happened
- You can copy the message manually and send via LinkedIn directly

---

## File Structure

```
recruitflow/
├── manifest.json          — Extension configuration
├── background.js          — Service worker: AI API calls, storage
├── content.js             — LinkedIn page injection + sidebar logic
├── popup.html/css/js      — Extension popup (toolbar click)
├── sidebar.css            — All sidebar styles
├── modules/
│   ├── profile-reader.js  — LinkedIn DOM reading (standalone module)
│   ├── template-engine.js — Template storage and placeholder filling
│   ├── ai-generator.js    — AI generation interface
│   ├── pdf-extractor.js   — PDF.js text extraction
│   ├── tracker.js         — Outreach log management
│   ├── limit-guard.js     — Daily message count tracking
│   └── jd-optimizer.js    — JD storage + category detection
└── assets/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Privacy Note

All data (templates, tracker entries, settings) is stored locally in Chrome's storage (`chrome.storage.local`). Nothing is sent to any server except AI API calls to Groq/Gemini when you click "Generate". Your LinkedIn credentials are never accessed.
