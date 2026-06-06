export function getTextWithFallbacks(selectors) {
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el && el.innerText.trim()) return el.innerText.trim();
    } catch (_) {}
  }
  return '';
}

export function getCompanyFromExperience() {
  try {
    const expSection = document.querySelector('#experience');
    if (!expSection) return '';
    const section = expSection.closest('section') || expSection.parentElement;
    const companyEl = section?.querySelector('.t-14.t-normal.t-black--light')
                   || section?.querySelector('.hoverable-link-text.t-bold');
    return companyEl ? companyEl.innerText.trim() : '';
  } catch (_) {
    return '';
  }
}

export function readSkills() {
  try {
    const skillEls = document.querySelectorAll(
      '.skill-categories-taxonomy__item, .pvs-entity__supplementary-info, [data-field="skill_card_skill_topic"]'
    );
    return Array.from(skillEls).slice(0, 8).map(el => el.innerText.trim()).filter(Boolean);
  } catch (_) {
    return [];
  }
}

export function readLinkedInProfile() {
  const name = getTextWithFallbacks([
    'h1.text-heading-xlarge',
    'h1.inline.t-24',
    '.pv-text-details__left-panel h1',
    'h1'
  ]);

  const role = getTextWithFallbacks([
    '.text-body-medium.break-words',
    '.pv-text-details__left-panel .text-body-medium',
    '[data-field="headline"]'
  ]);

  const company = getCompanyFromExperience();

  const location = getTextWithFallbacks([
    '.text-body-small.inline.t-black--light',
    '.pv-text-details__left-panel .text-body-small',
    '[data-field="location"]'
  ]);

  return {
    name,
    role,
    company,
    location,
    profileUrl: window.location.href,
    skills: readSkills()
  };
}
