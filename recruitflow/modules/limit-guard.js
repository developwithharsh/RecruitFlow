const STORAGE_KEY = 'recruitflow_usage';
const DEFAULT_LIMIT = 50;

async function getUsage() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || {
      daily_messages_sent: 0,
      daily_limit: DEFAULT_LIMIT,
      last_reset_date: new Date().toDateString(),
      is_pro: false
    };
  } catch (e) {
    console.error('RecruitFlow: limit-guard getUsage failed', e);
    return { daily_messages_sent: 0, daily_limit: DEFAULT_LIMIT, last_reset_date: new Date().toDateString() };
  }
}

async function saveUsage(usage) {
  await chrome.storage.local.set({ [STORAGE_KEY]: usage });
}

export async function checkAndResetIfNewDay() {
  const usage = await getUsage();
  const today = new Date().toDateString();
  if (usage.last_reset_date !== today) {
    usage.daily_messages_sent = 0;
    usage.last_reset_date = today;
    await saveUsage(usage);
  }
  return usage;
}

export async function getTodayCount() {
  const usage = await checkAndResetIfNewDay();
  return usage.daily_messages_sent || 0;
}

export async function incrementCount() {
  const usage = await checkAndResetIfNewDay();
  usage.daily_messages_sent = (usage.daily_messages_sent || 0) + 1;
  await saveUsage(usage);
  return usage.daily_messages_sent;
}

export async function getDailyLimit() {
  const usage = await getUsage();
  return usage.daily_limit || DEFAULT_LIMIT;
}

export async function setDailyLimit(n) {
  const usage = await getUsage();
  usage.daily_limit = Math.max(1, parseInt(n) || DEFAULT_LIMIT);
  await saveUsage(usage);
  return usage.daily_limit;
}

export async function getStatus() {
  const usage = await checkAndResetIfNewDay();
  const count = usage.daily_messages_sent || 0;
  const limit = usage.daily_limit || DEFAULT_LIMIT;
  const percentage = Math.round((count / limit) * 100);

  let level = 'safe';
  if (percentage >= 100) level = 'danger';
  else if (percentage >= 80) level = 'warning';

  return { count, limit, percentage, level };
}
