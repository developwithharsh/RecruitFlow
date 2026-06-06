export async function checkUsageLimit() {
  try {
    const usage = await chrome.runtime.sendMessage({ type: 'GET_USAGE' });
    const usesLeft = Math.max(0, 3 - (usage.ai_uses_total || 0));
    return {
      canUse: usage.is_pro || (usage.ai_uses_total || 0) < 3,
      usesLeft,
      isPro: usage.is_pro || false
    };
  } catch (e) {
    console.error('RecruitFlow: checkUsageLimit failed', e);
    return { canUse: false, usesLeft: 0, isPro: false };
  }
}

export async function incrementUsage() {
  try {
    return await chrome.runtime.sendMessage({ type: 'INCREMENT_USAGE' });
  } catch (e) {
    console.error('RecruitFlow: incrementUsage failed', e);
  }
}

export async function generateMessage(profileData, jdText, tone = 'Professional') {
  try {
    const limitCheck = await checkUsageLimit();
    if (!limitCheck.canUse) {
      return { success: false, limitReached: true };
    }

    const result = await chrome.runtime.sendMessage({
      type: 'GENERATE_MESSAGE',
      profileData,
      jdText,
      tone
    });

    return result;
  } catch (e) {
    console.error('RecruitFlow: generateMessage failed', e);
    return { success: false, error: 'AI unavailable. Please try again.' };
  }
}

export async function optimizeJD(jdText) {
  try {
    const limitCheck = await checkUsageLimit();
    if (!limitCheck.canUse) {
      return { success: false, limitReached: true };
    }

    const result = await chrome.runtime.sendMessage({
      type: 'OPTIMIZE_JD',
      jdText
    });

    return result;
  } catch (e) {
    console.error('RecruitFlow: optimizeJD failed', e);
    return { success: false, error: 'AI unavailable. Please try again.' };
  }
}
