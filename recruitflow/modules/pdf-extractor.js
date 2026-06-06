// PDF.js loaded via CDN — worker set inline to avoid separate worker file
// Requires pdfjsLib to be available globally (loaded via <script> in sidebar or content)

const PDF_JS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDF_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

async function ensurePDFJS() {
  if (typeof pdfjsLib !== 'undefined') return;

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDF_JS_CDN;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function extractTextFromPDF(file) {
  try {
    await ensurePDFJS();

    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_CDN;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }

    return cleanPDFText(fullText);
  } catch (e) {
    console.error('RecruitFlow: PDF extraction failed', e);
    throw new Error('Could not extract text from PDF. Please try a different file.');
  }
}

function cleanPDFText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/Page \d+ of \d+/gi, '')
    .trim();
}
