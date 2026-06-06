const STORAGE_KEY = 'recruitflow_tracker';

export async function getAllEntries() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const entries = result[STORAGE_KEY] || [];
    return entries.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  } catch (e) {
    console.error('RecruitFlow: getAllEntries failed', e);
    return [];
  }
}

export async function addEntry(entryData) {
  try {
    const entries = await getAllEntries();
    const entry = {
      id: 'msg_' + Date.now(),
      candidateName: entryData.candidateName || '',
      candidateUrl: entryData.candidateUrl || '',
      candidateRole: entryData.candidateRole || '',
      candidateCompany: entryData.candidateCompany || '',
      jdTitle: entryData.jdTitle || '',
      messageSent: entryData.messageSent || '',
      sentAt: new Date().toISOString(),
      status: 'Sent',
      notes: ''
    };
    entries.unshift(entry);
    await chrome.storage.local.set({ [STORAGE_KEY]: entries });
    return entry;
  } catch (e) {
    console.error('RecruitFlow: addEntry failed', e);
    throw e;
  }
}

export async function updateStatus(id, status) {
  try {
    const entries = await getAllEntries();
    const idx = entries.findIndex(e => e.id === id);
    if (idx >= 0) {
      entries[idx].status = status;
      await chrome.storage.local.set({ [STORAGE_KEY]: entries });
    }
    return true;
  } catch (e) {
    console.error('RecruitFlow: updateStatus failed', e);
    throw e;
  }
}

export async function updateNotes(id, notes) {
  try {
    const entries = await getAllEntries();
    const idx = entries.findIndex(e => e.id === id);
    if (idx >= 0) {
      entries[idx].notes = notes;
      await chrome.storage.local.set({ [STORAGE_KEY]: entries });
    }
    return true;
  } catch (e) {
    console.error('RecruitFlow: updateNotes failed', e);
    throw e;
  }
}

export async function deleteEntry(id) {
  try {
    const entries = await getAllEntries();
    const filtered = entries.filter(e => e.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
    return true;
  } catch (e) {
    console.error('RecruitFlow: deleteEntry failed', e);
    throw e;
  }
}

export async function searchEntries(query) {
  try {
    const entries = await getAllEntries();
    if (!query || !query.trim()) return entries;
    const q = query.toLowerCase();
    return entries.filter(e =>
      (e.candidateName || '').toLowerCase().includes(q) ||
      (e.candidateCompany || '').toLowerCase().includes(q) ||
      (e.candidateRole || '').toLowerCase().includes(q) ||
      (e.jdTitle || '').toLowerCase().includes(q)
    );
  } catch (e) {
    console.error('RecruitFlow: searchEntries failed', e);
    return [];
  }
}

export async function exportToCSV() {
  try {
    const entries = await getAllEntries();
    const headers = ['Name', 'Role', 'Company', 'LinkedIn URL', 'JD Title', 'Message Sent', 'Sent At', 'Status', 'Notes'];
    const rows = entries.map(e => [
      `"${(e.candidateName || '').replace(/"/g, '""')}"`,
      `"${(e.candidateRole || '').replace(/"/g, '""')}"`,
      `"${(e.candidateCompany || '').replace(/"/g, '""')}"`,
      `"${(e.candidateUrl || '').replace(/"/g, '""')}"`,
      `"${(e.jdTitle || '').replace(/"/g, '""')}"`,
      `"${(e.messageSent || '').replace(/"/g, '""')}"`,
      `"${e.sentAt || ''}"`,
      `"${e.status || ''}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ].join(','));
    return [headers.join(','), ...rows].join('\n');
  } catch (e) {
    console.error('RecruitFlow: exportToCSV failed', e);
    throw e;
  }
}

export async function getTotalCount() {
  try {
    const entries = await getAllEntries();
    return entries.length;
  } catch (e) {
    return 0;
  }
}

export async function getStatusCounts() {
  try {
    const entries = await getAllEntries();
    return {
      total: entries.length,
      sent: entries.filter(e => e.status === 'Sent').length,
      replied: entries.filter(e => e.status === 'Replied').length,
      notInterested: entries.filter(e => e.status === 'Not Interested').length,
      hired: entries.filter(e => e.status === 'Hired').length
    };
  } catch (e) {
    return { total: 0, sent: 0, replied: 0, notInterested: 0, hired: 0 };
  }
}
