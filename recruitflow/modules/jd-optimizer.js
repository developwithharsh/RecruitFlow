export { optimizeJD } from './ai-generator.js';

const STORAGE_KEY = 'recruitflow_jds';
const ACTIVE_KEY = 'recruitflow_active_jd';

export function detectRoleCategory(text) {
  const t = (text || '').toLowerCase();
  if (/react|node|python|java|developer|engineer|devops|frontend|backend|fullstack|aws|cloud/.test(t)) return 'tech';
  if (/sales|revenue|business development|account executive|quota|target/.test(t)) return 'sales';
  if (/hr|human resource|talent|recruiter|people ops|culture/.test(t)) return 'hr';
  if (/finance|accounting|cpa|audit|tax|controller|cfo/.test(t)) return 'finance';
  return 'other';
}

export async function getAllJDs() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || [];
  } catch (e) {
    console.error('RecruitFlow: getAllJDs failed', e);
    return [];
  }
}

export async function saveJD(title, text) {
  try {
    const jds = await getAllJDs();
    const jd = {
      id: 'jd_' + Date.now(),
      title: title || 'Untitled JD',
      text,
      roleCategory: detectRoleCategory(text),
      createdAt: new Date().toISOString()
    };
    jds.unshift(jd);
    await chrome.storage.local.set({ [STORAGE_KEY]: jds });
    await setActiveJD(jd.id);
    return jd;
  } catch (e) {
    console.error('RecruitFlow: saveJD failed', e);
    throw e;
  }
}

export async function getActiveJD() {
  try {
    const [activeResult, jdsResult] = await Promise.all([
      chrome.storage.local.get(ACTIVE_KEY),
      chrome.storage.local.get(STORAGE_KEY)
    ]);
    const activeId = activeResult[ACTIVE_KEY];
    const jds = jdsResult[STORAGE_KEY] || [];
    if (!activeId || jds.length === 0) return jds[0] || null;
    return jds.find(j => j.id === activeId) || jds[0] || null;
  } catch (e) {
    console.error('RecruitFlow: getActiveJD failed', e);
    return null;
  }
}

export async function setActiveJD(id) {
  try {
    await chrome.storage.local.set({ [ACTIVE_KEY]: id });
    return true;
  } catch (e) {
    console.error('RecruitFlow: setActiveJD failed', e);
    throw e;
  }
}

export async function deleteJD(id) {
  try {
    const jds = await getAllJDs();
    const filtered = jds.filter(j => j.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered });

    const activeResult = await chrome.storage.local.get(ACTIVE_KEY);
    if (activeResult[ACTIVE_KEY] === id) {
      await chrome.storage.local.set({ [ACTIVE_KEY]: filtered[0]?.id || null });
    }
    return true;
  } catch (e) {
    console.error('RecruitFlow: deleteJD failed', e);
    throw e;
  }
}
