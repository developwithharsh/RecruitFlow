const STORAGE_KEY = 'recruitflow_templates';

export const DEFAULT_TEMPLATES = [
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

export async function getTemplates() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const templates = result[STORAGE_KEY];
    if (!templates || templates.length === 0) {
      await chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_TEMPLATES });
      return DEFAULT_TEMPLATES;
    }
    return templates;
  } catch (e) {
    console.error('RecruitFlow: getTemplates failed', e);
    return DEFAULT_TEMPLATES;
  }
}

export async function saveTemplate(tpl) {
  try {
    const templates = await getTemplates();
    if (!tpl.id) {
      tpl.id = 'tpl_' + Date.now();
      tpl.createdAt = new Date().toISOString();
      templates.push(tpl);
    } else {
      const idx = templates.findIndex(t => t.id === tpl.id);
      if (idx >= 0) {
        templates[idx] = { ...templates[idx], ...tpl };
      } else {
        templates.push(tpl);
      }
    }
    await chrome.storage.local.set({ [STORAGE_KEY]: templates });
    return tpl;
  } catch (e) {
    console.error('RecruitFlow: saveTemplate failed', e);
    throw e;
  }
}

export async function deleteTemplate(id) {
  try {
    const templates = await getTemplates();
    const filtered = templates.filter(t => t.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
    return true;
  } catch (e) {
    console.error('RecruitFlow: deleteTemplate failed', e);
    throw e;
  }
}

export function fillTemplate(body, profileData = {}, jdTitle = '', recruiterData = {}) {
  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const nameParts = (profileData.name || '').split(' ');
  const firstName = nameParts[0] || '';

  return body
    .replace(/\{name\}/g, firstName)
    .replace(/\{full_name\}/g, profileData.name || '')
    .replace(/\{role\}/g, profileData.role || '')
    .replace(/\{company\}/g, profileData.company || '')
    .replace(/\{location\}/g, profileData.location || '')
    .replace(/\{jd_title\}/g, jdTitle || '')
    .replace(/\{recruiter_name\}/g, recruiterData.name || '')
    .replace(/\{recruiter_company\}/g, recruiterData.company || '')
    .replace(/\{today\}/g, today);
}

export function getPlaceholderList() {
  return [
    { placeholder: '{name}', description: "Candidate's first name" },
    { placeholder: '{full_name}', description: "Candidate's full name" },
    { placeholder: '{role}', description: "Candidate's current role/headline" },
    { placeholder: '{company}', description: "Candidate's current company" },
    { placeholder: '{location}', description: "Candidate's location" },
    { placeholder: '{jd_title}', description: 'Job title you are hiring for' },
    { placeholder: '{recruiter_name}', description: 'Your name' },
    { placeholder: '{recruiter_company}', description: 'Your company name' },
    { placeholder: '{today}', description: "Today's date" }
  ];
}
