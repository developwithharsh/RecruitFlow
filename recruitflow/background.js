const GROQ_API_KEY = "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";
const GROQ_MODEL = "llama3-70b-8192";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const GEMINI_API_KEY = "AQ.Ab8RN6JpZ42EF8PbvyTWdNgxEi4-BqFbBk4Vsu2mi4DJhj792Q";
const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const DEFAULT_TEMPLATES = [
  {
    id: "default_1",
    name: "Initial Outreach",
    body: "Hi {name},\n\nI came across your profile and was impressed by your experience as {role} at {company}.\n\nI'm currently hiring for a {jd_title} role that I think could be a great fit for your background.\n\nWould you be open to a quick 10-minute call this week?\n\nBest regards,\n{recruiter_name}\n{recruiter_company}"
  },
  {
    id: "default_2",
    name: "Brief & Direct",
    body: "Hi {name}, exciting {jd_title} opportunity that matches your {role} background at {company}. Interested in learning more? — {recruiter_name}"
  },
  {
    id: "default_3",
    name: "Referral Style",
    body: "Hi {name},\n\nA colleague mentioned your profile and I'm reaching out about a {jd_title} opportunity. Given your experience at {company}, I thought you might be a great fit.\n\nOpen to a brief conversation?\n\n{recruiter_name}, {recruiter_company}"
  }
];

// ── Extension icon click → toggle sidebar ─────────────────────────────────
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url) return;
  if (tab.url.includes('linkedin.com')) {
    // On LinkedIn — toggle (show/hide) the sidebar
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const container = document.getElementById('recruitflow-sidebar-container');
          if (container) {
            container.classList.toggle('collapsed');
          } else {
            window.dispatchEvent(new CustomEvent('rf-force-inject'));
          }
        }
      });
    } catch (e) {
      console.warn('RecruitFlow: could not toggle sidebar', e);
    }
  } else {
    // Not on LinkedIn — navigate there
    await chrome.tabs.update(tab.id, { url: 'https://www.linkedin.com/feed/' });
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    try {
      await chrome.storage.local.set({
        recruitflow_usage: {
          ai_uses_total: 0,
          ai_uses_limit: 3,
          daily_messages_sent: 0,
          daily_limit: 50,
          last_reset_date: new Date().toDateString(),
          is_pro: false
        },
        recruitflow_templates: DEFAULT_TEMPLATES,
        recruitflow_tracker: [],
        recruitflow_jds: [],
        recruitflow_settings: {
          recruiter_name: '',
          recruiter_company: '',
          daily_limit: 50
        }
      });
    } catch (e) {
      console.error('RecruitFlow: install init failed', e);
    }
  }
});

async function callGroq(systemPrompt, userPrompt) {
  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 400,
      temperature: 0.7
    })
  });
  if (!response.ok) throw new Error(`Groq error: ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callGemini(prompt) {
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 400, temperature: 0.7 }
    })
  });
  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function getUsage() {
  try {
    const result = await chrome.storage.local.get('recruitflow_usage');
    return result.recruitflow_usage || {
      ai_uses_total: 0,
      ai_uses_limit: 3,
      daily_messages_sent: 0,
      daily_limit: 50,
      last_reset_date: new Date().toDateString(),
      is_pro: false
    };
  } catch (e) {
    console.error('RecruitFlow: getUsage failed', e);
    return {};
  }
}

async function checkAndResetDaily(usage) {
  const today = new Date().toDateString();
  if (usage.last_reset_date !== today) {
    usage.daily_messages_sent = 0;
    usage.last_reset_date = today;
    await chrome.storage.local.set({ recruitflow_usage: usage });
  }
  return usage;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch(err => {
    sendResponse({ success: false, error: err.message });
  });
  return true;
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'GET_USAGE': {
      let usage = await getUsage();
      usage = await checkAndResetDaily(usage);
      return usage;
    }

    case 'INCREMENT_USAGE': {
      const usage = await getUsage();
      usage.ai_uses_total = (usage.ai_uses_total || 0) + 1;
      await chrome.storage.local.set({ recruitflow_usage: usage });
      return { success: true, ai_uses_total: usage.ai_uses_total };
    }

    case 'INCREMENT_DAILY_COUNT': {
      let usage = await getUsage();
      usage = await checkAndResetDaily(usage);
      usage.daily_messages_sent = (usage.daily_messages_sent || 0) + 1;
      await chrome.storage.local.set({ recruitflow_usage: usage });
      return { success: true, count: usage.daily_messages_sent };
    }

    case 'RESET_DAILY_COUNT': {
      const usage = await getUsage();
      usage.daily_messages_sent = 0;
      usage.last_reset_date = new Date().toDateString();
      await chrome.storage.local.set({ recruitflow_usage: usage });
      return { success: true };
    }

    case 'CHECK_PRO': {
      const usage = await getUsage();
      return { isPro: usage.is_pro || false };
    }

    case 'GENERATE_MESSAGE': {
      const { profileData, jdText, tone } = message;
      let usage = await getUsage();
      usage = await checkAndResetDaily(usage);

      if (!usage.is_pro && (usage.ai_uses_total || 0) >= 3) {
        return { success: false, limitReached: true };
      }

      const systemPrompt = "You are an expert recruiter writing LinkedIn outreach messages. Write short, human, personalised messages. Never sound robotic or generic. Never mention you are AI.";
      const hasDraft = (message.roughDraft || '').trim().length > 0;
      const userPrompt = hasDraft
        ? `Recruiter's rough draft message:\n"${message.roughDraft}"\n\nCandidate: ${profileData.name || 'the candidate'}, currently ${profileData.role || 'in their role'} at ${profileData.company || 'their company'}, located in ${profileData.location || 'their city'}.\nJob opening: ${jdText ? jdText.substring(0, 400) : 'an exciting opportunity'}\nRequested tone: ${tone || 'Professional'}\n\nImprove and personalise the rough draft by:\n1. Fixing grammar, flow, and professionalism\n2. Personalising it to this specific candidate (mention their role/company naturally)\n3. Keeping the recruiter's core message and intent intact\n4. Making it sound human and warm, NOT AI-generated\n5. Keeping it under 180 words\nReturn only the improved message. No explanation.`
        : `Candidate name: ${profileData.name || 'the candidate'}\nCurrent role: ${profileData.role || 'their current role'}\nCurrent company: ${profileData.company || 'their company'}\nLocation: ${profileData.location || ''}\nJob Description: ${jdText || 'an exciting opportunity'}\nTone: ${tone || 'Professional'} (Professional / Friendly / Brief)\n\nWrite a LinkedIn outreach message (max 180 words) that:\n1. Opens with their name\n2. References their current role or company specifically\n3. Briefly explains the opportunity without dumping the full JD\n4. Ends with a simple question or call to action\n5. Sounds like it was written by a human recruiter\nReturn only the message text. No subject line. No extra explanation.`;

      let generatedText = null;
      try {
        generatedText = await callGroq(systemPrompt, userPrompt);
      } catch (groqErr) {
        console.warn('RecruitFlow: Groq failed, trying Gemini', groqErr);
        try {
          generatedText = await callGemini(`${systemPrompt}\n\n${userPrompt}`);
        } catch (geminiErr) {
          console.error('RecruitFlow: Both AI providers failed', geminiErr);
          return { success: false, error: 'AI unavailable. Please try again.' };
        }
      }

      usage.ai_uses_total = (usage.ai_uses_total || 0) + 1;
      await chrome.storage.local.set({ recruitflow_usage: usage });

      return { success: true, message: generatedText };
    }

    case 'OPTIMIZE_JD': {
      const { jdText } = message;
      let usage = await getUsage();
      usage = await checkAndResetDaily(usage);

      if (!usage.is_pro && (usage.ai_uses_total || 0) >= 3) {
        return { success: false, limitReached: true };
      }

      const systemPrompt = "You are an expert HR consultant who improves job descriptions to attract top candidates.";
      const userPrompt = `Original JD:
${jdText}

Improve this job description by:
1. Making the role title clearer
2. Listing 5-7 key responsibilities as bullet points
3. Listing 4-5 must-have skills
4. Removing jargon and corporate speak
5. Adding a brief, compelling company/role intro (2 sentences max)
Return only the improved JD. No explanation.`;

      let optimized = null;
      try {
        optimized = await callGroq(systemPrompt, userPrompt);
      } catch (groqErr) {
        console.warn('RecruitFlow: Groq failed, trying Gemini', groqErr);
        try {
          optimized = await callGemini(`${systemPrompt}\n\n${userPrompt}`);
        } catch (geminiErr) {
          return { success: false, error: 'AI unavailable. Please try again.' };
        }
      }

      usage.ai_uses_total = (usage.ai_uses_total || 0) + 1;
      await chrome.storage.local.set({ recruitflow_usage: usage });

      return { success: true, optimized };
    }

    case 'STORAGE_GET': {
      const result = await chrome.storage.local.get(message.key);
      return { value: result[message.key] };
    }

    case 'STORAGE_SET': {
      await chrome.storage.local.set({ [message.key]: message.value });
      return { success: true };
    }

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}
