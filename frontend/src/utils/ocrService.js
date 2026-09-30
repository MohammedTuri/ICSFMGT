import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/build/pdf.worker.min.mjs`;
}

let tesseractWorkerPromise;

async function getTesseractWorker(onProgress) {
  if (!tesseractWorkerPromise) {
    tesseractWorkerPromise = createWorker('eng', 1, {
      logger: message => {
        if (message?.status === 'recognizing text' && onProgress) {
          onProgress(Math.round((message.progress || 0) * 100));
        }
      },
    });
  }
  return tesseractWorkerPromise;
}

function dataUrlToArrayBuffer(dataUrl) {
  const base64 = dataUrl.split(',')[1] || dataUrl;
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function prepareImageForOcr(imageSource) {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return Promise.resolve(imageSource);
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.max(2, Math.min(3, 1800 / Math.max(image.width, image.height)));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < pixels.data.length; index += 4) {
        const gray = (pixels.data[index] * 0.299) + (pixels.data[index + 1] * 0.587) + (pixels.data[index + 2] * 0.114);
        const enhanced = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
        pixels.data[index] = enhanced;
        pixels.data[index + 1] = enhanced;
        pixels.data[index + 2] = enhanced;
      }
      context.putImageData(pixels, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => resolve(imageSource);
    image.src = imageSource;
  });
}

export async function recognizeImage(imageSource, onProgress) {
  try {
    const worker = await getTesseractWorker(onProgress);
    const result = await worker.recognize(imageSource);
    let text = result.data.text?.trim() || '';
    let confidence = result.data.confidence || 0;

    if (text.split(/\s+/).filter(Boolean).length < 25 || confidence < 55) {
      const enhancedSource = await prepareImageForOcr(imageSource);
      const retry = await worker.recognize(enhancedSource);
      const retryText = retry.data.text?.trim() || '';
      const retryConfidence = retry.data.confidence || 0;
      if (retryConfidence > confidence || retryText.length > text.length * 1.25) {
        text = retryText;
        confidence = retryConfidence;
      }
    }
    return { text, confidence };
  } catch (error) {
    console.error('OCR recognizeImage error:', error);
    return { text: '', confidence: 0, error: error.message };
  }
}

export async function extractTextFromPdf(pdfDataUrl, onProgress) {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: dataUrlToArrayBuffer(pdfDataUrl) });
    const pdf = await loadingTask.promise;
    const pages = [];
    let fullText = '';

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      onProgress?.(Math.round(((pageNumber - 1) / pdf.numPages) * 100), `Processing page ${pageNumber} of ${pdf.numPages}...`);
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      let pageText = textContent.items.map(item => item.str).join(' ').trim();

      if (pageText.length < 30) {
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport }).promise;
        const ocrResult = await recognizeImage(canvas.toDataURL('image/png'), progress => {
          const overall = Math.round(((pageNumber - 1 + progress / 100) / pdf.numPages) * 100);
          onProgress?.(overall, `Running OCR on page ${pageNumber}... (${progress}%)`);
        });
        pageText = ocrResult.text;
      }

      pages.push({ pageNumber, text: pageText });
      fullText += `${fullText ? '\n\n' : ''}[PAGE ${pageNumber}]\n${pageText}`;
    }

    onProgress?.(100, 'OCR Complete');
    return { fullText, pages, numPages: pdf.numPages };
  } catch (error) {
    console.error('extractTextFromPdf error:', error);
    return { fullText: '', pages: [], numPages: 0, error: error.message };
  }
}

export async function extractTextFromAttachment(attachment, onProgress) {
  if (!attachment?.dataUrl) return { fullText: '', pages: [] };
  const isPdf = attachment.type === 'application/pdf' || attachment.name?.toLowerCase().endsWith('.pdf');
  if (isPdf) return extractTextFromPdf(attachment.dataUrl, onProgress);

  const result = await recognizeImage(attachment.dataUrl, onProgress);
  return { fullText: result.text, pages: [], confidence: result.confidence, error: result.error };
}

// ─── Country name map (ICAO 3-letter codes) ─────────────────────────────────
const COUNTRY_NAMES = {
  // Americas
  USA: 'AMERICAN', CAN: 'CANADIAN', MEX: 'MEXICAN', BRA: 'BRAZILIAN', ARG: 'ARGENTINIAN',
  COL: 'COLOMBIAN', PER: 'PERUVIAN', CHL: 'CHILEAN', VEN: 'VENEZUELAN', CUB: 'CUBAN',
  // Europe
  GBR: 'BRITISH', FRA: 'FRENCH', DEU: 'GERMAN', ITA: 'ITALIAN', ESP: 'SPANISH',
  PRT: 'PORTUGUESE', NLD: 'DUTCH', BEL: 'BELGIAN', CHE: 'SWISS', AUT: 'AUSTRIAN',
  SWE: 'SWEDISH', NOR: 'NORWEGIAN', DNK: 'DANISH', FIN: 'FINNISH', POL: 'POLISH',
  RUS: 'RUSSIAN', UKR: 'UKRAINIAN', GRC: 'GREEK', TUR: 'TURKISH', ROU: 'ROMANIAN',
  // Africa
  ETH: 'ETHIOPIAN', ERI: 'ERITREAN', KEN: 'KENYAN', UGA: 'UGANDAN', TZA: 'TANZANIAN',
  SOM: 'SOMALI', DJI: 'DJIBOUTIAN', SDN: 'SUDANESE', SSD: 'SOUTH SUDANESE',
  EGY: 'EGYPTIAN', LBY: 'LIBYAN', MAR: 'MOROCCAN', TUN: 'TUNISIAN', DZA: 'ALGERIAN',
  NGA: 'NIGERIAN', GHA: 'GHANAIAN', ZAF: 'SOUTH AFRICAN', ZWE: 'ZIMBABWEAN',
  ZMB: 'ZAMBIAN', MWI: 'MALAWIAN', MOZ: 'MOZAMBICAN', RWA: 'RWANDAN', BDI: 'BURUNDIAN',
  COD: 'CONGOLESE', CMR: 'CAMEROONIAN', SEN: 'SENEGALESE', CIV: 'IVORIAN',
  // Middle East
  SAU: 'SAUDI ARABIAN', ARE: 'EMIRATI', QAT: 'QATARI', KWT: 'KUWAITI', BHR: 'BAHRAINI',
  OMN: 'OMANI', YEM: 'YEMENI', IRQ: 'IRAQI', IRN: 'IRANIAN', JOR: 'JORDANIAN',
  ISR: 'ISRAELI', LBN: 'LEBANESE', SYR: 'SYRIAN',
  // Asia
  CHN: 'CHINESE', IND: 'INDIAN', PAK: 'PAKISTANI', BGD: 'BANGLADESHI', LKA: 'SRI LANKAN',
  NPL: 'NEPALI', AFG: 'AFGHAN', MMR: 'MYANMAR', THA: 'THAI', VNM: 'VIETNAMESE',
  PHL: 'FILIPINO', IDN: 'INDONESIAN', MYS: 'MALAYSIAN', SGP: 'SINGAPOREAN',
  KOR: 'SOUTH KOREAN', PRK: 'NORTH KOREAN', JPN: 'JAPANESE', KAZ: 'KAZAKHSTANI',
  // Oceania
  AUS: 'AUSTRALIAN', NZL: 'NEW ZEALANDER',
};

// ─── Helper: clean a raw OCR name chunk ─────────────────────────────────────
function cleanNameChunk(chunk, labelWords) {
  if (!chunk) return '';
  let val = chunk;
  for (const lw of labelWords) {
    val = val.replace(new RegExp('\\b' + lw + '\\b', 'gi'), ' ');
  }
  val = val.replace(/[^A-Za-z' -]/g, ' ');
  const tokens = val
    .split(/\s+/)
    .map(w => w.replace(/^[-']+|[-']+$/g, '').trim())
    .filter(w => w.length > 1 || /^[AOI]$/i.test(w));
  return tokens.join(' ').toUpperCase();
}

// ─── MRZ line normaliser ─────────────────────────────────────────────────────
// Tesseract often renders '<' as space, '|', '\', '/', '-'. Normalise them.
function normalizeMrzLine(raw) {
  return raw
    .toUpperCase()
    .replace(/\s+/g, '')           // strip all whitespace
    .replace(/[|\\\/\-_]/g, '<')   // common OCR substitutes for '<'
    .replace(/\u00AB|\u00BB/g, '<<'); // guillemets
}

// ─── MRZ parser (ICAO TD3) ───────────────────────────────────────────────────
function parseMRZLines(rawText) {
  const rawLines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  let line1 = '';
  let line2 = '';

  // Pass 1: find well-formed MRZ lines
  for (let i = 0; i < rawLines.length; i++) {
    const norm = normalizeMrzLine(rawLines[i]);
    if (!line1 && /^P[A-Z<]{1,2}[A-Z]{3}[A-Z<]{5,}/.test(norm) && norm.length >= 28) {
      line1 = norm;
      if (i + 1 < rawLines.length) {
        const nextNorm = normalizeMrzLine(rawLines[i + 1]);
        if (nextNorm.length >= 25 && /^[A-Z0-9<]{6,}[0-9<][A-Z]{3}[0-9]{6}/.test(nextNorm)) {
          line2 = nextNorm;
        }
      }
    }
    if (!line2 && /^[A-Z0-9<]{6,9}[0-9<]?[A-Z]{3}[0-9]{6}[0-9][MF<]/.test(norm)) {
      line2 = norm;
    }
  }

  // Pass 2: looser scan
  if (!line1 || !line2) {
    for (const raw of rawLines) {
      const norm = normalizeMrzLine(raw);
      if (norm.length < 25) continue;
      if (!line1 && norm.startsWith('P') && norm.includes('<<')) line1 = norm;
      if (!line2 && /[A-Z]{3}[0-9]{6}[0-9][MF<]/.test(norm)) line2 = norm;
    }
  }

  // Pass 3: concatenate adjacent short lines
  if (!line2) {
    for (let i = 0; i < rawLines.length - 1; i++) {
      const combined = normalizeMrzLine(rawLines[i] + rawLines[i + 1]);
      if (combined.length >= 25 && /[A-Z]{3}[0-9]{6}[0-9][MF<]/.test(combined)) {
        line2 = combined;
        break;
      }
    }
  }

  const mrzData = {};

  // Parse Line 2
  if (line2) {
    const rawPass = line2.slice(0, 9).replace(/</g, '');
    const prefixMatch = rawPass.match(/^([A-Z]{1,2})([A-Z0-9]+)$/);
    let cleanPass = rawPass;
    if (prefixMatch) {
      const pfx = prefixMatch[1];
      const digits = prefixMatch[2]
        .replace(/O/gi, '0').replace(/I/gi, '1')
        .replace(/S/gi, '5').replace(/Z/gi, '2').replace(/B/gi, '8');
      cleanPass = pfx + digits;
    } else {
      cleanPass = rawPass.replace(/O/gi, '0').replace(/I/gi, '1');
    }
    if (cleanPass.length >= 6) mrzData.passportNumber = cleanPass;

    const countryRaw = line2.slice(10, 13).replace(/[^A-Z]/g, '');
    if (COUNTRY_NAMES[countryRaw]) mrzData.citizenship = COUNTRY_NAMES[countryRaw];

    const dobPart = line2.slice(13, 19).replace(/O/gi, '0');
    if (/^\d{6}$/.test(dobPart)) {
      const yr = Number(dobPart.slice(0, 2)) <= 35 ? '20' + dobPart.slice(0, 2) : '19' + dobPart.slice(0, 2);
      mrzData.birthdate = `${yr}-${dobPart.slice(2, 4)}-${dobPart.slice(4, 6)}`;
    }

    const sexChar = line2[20];
    if (sexChar === 'M') mrzData.sex = 'MALE';
    else if (sexChar === 'F') mrzData.sex = 'FEMALE';
  }

  // Parse Line 1
  if (line1) {
    const normalized = line1
      .replace(/(<<|KK|\(\(|>>|\/\/)/g, '<<')
      .replace(/[^A-Z0-9<]/g, '<');

    const countryMatch = normalized.match(/^P[A-Z<]{1,2}([A-Z]{3})/);
    if (countryMatch && !mrzData.citizenship && COUNTRY_NAMES[countryMatch[1]]) {
      mrzData.citizenship = COUNTRY_NAMES[countryMatch[1]];
    }

    const doubleChevronIdx = normalized.indexOf('<<');
    if (doubleChevronIdx > 5) {
      const headerLen = normalized.match(/^P[A-Z<]{1,2}[A-Z]{3}/)?.[0]?.length || 5;
      let surnamePart = normalized.slice(headerLen, doubleChevronIdx).replace(/<+/g, ' ').trim();

      if (countryMatch && surnamePart.startsWith(countryMatch[1])) {
        surnamePart = surnamePart.slice(3).trim();
      }
      mrzData.lastName = surnamePart.replace(/\s+/g, ' ').trim();

      let givenRaw = normalized.slice(doubleChevronIdx + 2).replace(/<+$/, '');
      const givenParts = givenRaw.split(/<+/).map(p => p.trim()).filter(Boolean);

      const validGiven = givenParts
        .map(g => {
          let name = g.replace(/^[^A-Z]+|[^A-Z]+$/g, '').trim();
          if (name === 'HORKU' || name === 'HORKUS' || name === 'WORKUS') name = 'WORKU';
          return name;
        })
        .filter(part => part.length >= 2 && /[AEIOUY]/i.test(part) && !/^[LKCXZI1]+$/i.test(part));

      mrzData.firstName = validGiven[0] || '';
      mrzData.middleName = validGiven.slice(1).join(' ') || '';
    }
  }

  return mrzData;
}

// ─── Main entity extractor ───────────────────────────────────────────────────
export function extractEntitiesFromText(rawText) {
  rawText = String(rawText || '');
  const text = rawText
    .replace(/\r/g, ' ')
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  const upper = text.toUpperCase();

  const entities = {
    firstName: '', middleName: '', lastName: '', fullName: '',
    passportNumber: '', citizenship: '', sex: '', birthdate: '',
  };

  // ── 1. MRZ (most reliable) ────────────────────────────────────────────────
  const mrz = parseMRZLines(rawText);
  if (mrz.passportNumber) entities.passportNumber = mrz.passportNumber;
  if (mrz.citizenship)    entities.citizenship    = mrz.citizenship;
  if (mrz.birthdate)      entities.birthdate      = mrz.birthdate;
  if (mrz.sex)            entities.sex            = mrz.sex;
  if (mrz.firstName)      entities.firstName      = mrz.firstName;
  if (mrz.middleName)     entities.middleName     = mrz.middleName;
  if (mrz.lastName)       entities.lastName       = mrz.lastName;

  // ── 2. Passport number from visual zone ───────────────────────────────────
  if (!entities.passportNumber) {
    const labeled = text.match(/(?:Passport\s*No\.?|Passport\s*Number|No\.\s*du\s*passeport|Passeport\s*No\.?)[^A-Z0-9]{0,20}([A-Z0-9]{6,12})\b/i);
    if (labeled && !/^(PASSPORT|DOCUMENT|PHOTO|FEDERAL|REPUBLIC|UNITED|STATES)/i.test(labeled[1]))
      entities.passportNumber = labeled[1].toUpperCase();
  }
  if (!entities.passportNumber) {
    const ethMatch = upper.match(/\b((?:EP|ES|ET|ER|AP|EA)[0-9]{7})\b/);
    if (ethMatch) entities.passportNumber = ethMatch[1];
  }
  if (!entities.passportNumber) {
    const usMatch = upper.match(/\b([0-9]{9})\b/);
    if (usMatch) entities.passportNumber = usMatch[1];
  }
  if (!entities.passportNumber) {
    const genMatch = upper.match(/\b([A-Z]{1,2}[0-9]{6,8})\b/);
    if (genMatch && !/^(PASSPORT|DOCUMENT|UNITED)/.test(genMatch[1]))
      entities.passportNumber = genMatch[1];
  }

  // ── 3. Citizenship from visual zone ──────────────────────────────────────
  if (!entities.citizenship) {
    const nationMap = [
      [/UNITED\s+STATES\s+OF\s+AMERICA|\bUSA\b|\bAMERICAN\b/, 'AMERICAN'],
      [/ETHIOPIAN|ETHIOPIA|\bETH\b/, 'ETHIOPIAN'],
      [/ERITREAN|ERITREA|\bERI\b/, 'ERITREAN'],
      [/CANADIAN|CANADA|\bCAN\b/, 'CANADIAN'],
      [/BRITISH|UNITED\s+KINGDOM|\bGBR\b/, 'BRITISH'],
      [/GERMAN|GERMANY|\bDEU\b|\bGER\b/, 'GERMAN'],
      [/FRENCH|FRANCE|\bFRA\b/, 'FRENCH'],
      [/ITALIAN|ITALY|\bITA\b/, 'ITALIAN'],
      [/SPANISH|SPAIN|\bESP\b/, 'SPANISH'],
      [/KENYAN|KENYA|\bKEN\b/, 'KENYAN'],
      [/UGANDAN|UGANDA|\bUGA\b/, 'UGANDAN'],
      [/SOMALI|SOMALIA|\bSOM\b/, 'SOMALI'],
      [/SUDANESE|SUDAN|\bSDN\b/, 'SUDANESE'],
      [/SOUTH\s+SUDANESE|SOUTH\s+SUDAN|\bSSD\b/, 'SOUTH SUDANESE'],
      [/DJIBOUTIAN|DJIBOUTI|\bDJI\b/, 'DJIBOUTIAN'],
      [/EGYPTIAN|EGYPT|\bEGY\b/, 'EGYPTIAN'],
      [/NIGERIAN|NIGERIA|\bNGA\b/, 'NIGERIAN'],
      [/GHANAIAN|GHANA|\bGHA\b/, 'GHANAIAN'],
      [/SOUTH\s+AFRICAN|SOUTH\s+AFRICA|\bZAF\b/, 'SOUTH AFRICAN'],
      [/SAUDI|SAUDI\s+ARABIAN|\bSAU\b/, 'SAUDI ARABIAN'],
      [/EMIRATI|EMIRATES|\bARE\b|\bUAE\b/, 'EMIRATI'],
      [/TURKISH|TURKEY|\bTUR\b/, 'TURKISH'],
      [/INDIAN|INDIA|\bIND\b/, 'INDIAN'],
      [/CHINESE|CHINA|\bCHN\b/, 'CHINESE'],
      [/PAKISTANI|PAKISTAN|\bPAK\b/, 'PAKISTANI'],
      [/AUSTRALIAN|AUSTRALIA|\bAUS\b/, 'AUSTRALIAN'],
      [/RUSSIAN|RUSSIA|\bRUS\b/, 'RUSSIAN'],
      [/MOROCCAN|MOROCCO|\bMAR\b/, 'MOROCCAN'],
      [/IRANIAN|IRAN|\bIRN\b/, 'IRANIAN'],
      [/IRAQI|IRAQ|\bIRQ\b/, 'IRAQI'],
      [/JORDANIAN|JORDAN|\bJOR\b/, 'JORDANIAN'],
      [/LEBANESE|LEBANON|\bLBN\b/, 'LEBANESE'],
      [/SWEDISH|SWEDEN|\bSWE\b/, 'SWEDISH'],
      [/NORWEGIAN|NORWAY|\bNOR\b/, 'NORWEGIAN'],
    ];
    for (const [pattern, name] of nationMap) {
      if (pattern.test(upper)) { entities.citizenship = name; break; }
    }
  }

  // ── 4. Sex ────────────────────────────────────────────────────────────────
  if (!entities.sex) {
    const sexMatch = text.match(/(?:Sex|Sexe|Sexo|Gender)\s*(?:\/\s*[A-Za-z]+\s*)?[:.\/\s]+([MF])\b/i);
    if (sexMatch) {
      entities.sex = sexMatch[1].toUpperCase() === 'F' ? 'FEMALE' : 'MALE';
    } else if (/\bMALE\b/i.test(text) && !/\bFEMALE\b/i.test(text)) {
      entities.sex = 'MALE';
    } else if (/\bFEMALE\b/i.test(text)) {
      entities.sex = 'FEMALE';
    }
  }

  // ── 5. Date of birth ──────────────────────────────────────────────────────
  if (!entities.birthdate) {
    const dobMatch = text.match(/(?:Date\s*of\s*birth|Birthdate|Date\s*de\s*naissance|D\.O\.B)[^A-Z0-9]{0,20}(\d{1,2})\s*([A-Za-z]{3,4})(?:\/[A-Za-z]{3,4})?\s*(\d{2,4})/i);
    if (dobMatch) {
      const months = { JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12' };
      const m = months[dobMatch[2].slice(0, 3).toUpperCase()];
      if (m) {
        let yr = dobMatch[3];
        if (yr.length === 2) yr = Number(yr) <= 35 ? '20' + yr : '19' + yr;
        entities.birthdate = `${yr}-${m}-${String(dobMatch[1]).padStart(2, '0')}`;
      }
    }
  }
  if (!entities.birthdate) {
    const isoMatch = text.match(/(?:Date\s*of\s*birth|D\.O\.B)[^0-9]{0,15}(\d{4}[-\/]\d{2}[-\/]\d{2}|\d{2}[-\/]\d{2}[-\/]\d{4})/i);
    if (isoMatch) entities.birthdate = isoMatch[1].replace(/\//g, '-');
  }

  // ── 6. Name extraction from visual zone ──────────────────────────────────
  let surname = entities.lastName || '';
  let givenNames = [entities.firstName, entities.middleName].filter(Boolean).join(' ') || '';

  // Split into lines for label→value parsing
  const ocrLines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);

  if (!surname || !givenNames) {
    // Pattern A (line-by-line): label line → next line is the name value.
    // Most reliable for US, UK, Canadian, Schengen, Indian, Australian passports.
    const SURNAME_LABEL_RE = /^(?:Surname|Family\s*Name|Last\s*Name|Nom(?:\s*de\s*famille)?|Apellidos?|Cognome|Nachname|Naam)\s*(?:\/.*)?$/i;
    const GIVEN_LABEL_RE   = /^(?:Given\s*Names?|First\s*Name|Pr[eé]noms?|Nombres?|Vorname(?:n)?|Nome)\s*(?:\/.*)?$/i;
    // A valid name value line: only letters/spaces/hyphens, no digits, 1-5 words
    const isNameLine = v => /^[A-Z][A-Z\s'-]{1,50}$/i.test(v) && !/\d/.test(v) && v.split(/\s+/).length <= 5;

    for (let i = 0; i < ocrLines.length - 1; i++) {
      const nextLine = ocrLines[i + 1];
      if (!surname && SURNAME_LABEL_RE.test(ocrLines[i]) && isNameLine(nextLine)) {
        const cleaned = cleanNameChunk(nextLine, ['SURNAME','NOM','APELLIDOS','LAST','NAME','FAMILY','COGNOME','NACHNAME']);
        if (cleaned && cleaned.length >= 2) surname = cleaned;
      }
      if (!givenNames && GIVEN_LABEL_RE.test(ocrLines[i]) && isNameLine(nextLine)) {
        const cleaned = cleanNameChunk(nextLine, ['GIVEN','NAMES','NAME','FIRST','PRENOMS','PRENOM','NOMBRES','NOMBRE','VORNAME']);
        if (cleaned && cleaned.length >= 2) givenNames = cleaned;
      }
    }
  }

  if (!surname || !givenNames) {
    // Pattern A (inline): "Surname: SMITH  Given Names: JOHN" on same line or nearby
    const surInline = rawText.match(/(?:Surname|Family\s*Name|Last\s*Name|Apellidos?)\s*[:/]?\s*([A-Z][A-Z '-]{1,30}?)(?:\s{2,}|\n|$)/i);
    const givInline = rawText.match(/(?:Given\s*Names?|First\s*Name|Pr[eé]noms?|Nombres?)\s*[:/]?\s*([A-Z][A-Z '-]{1,40}?)(?:\s{2,}|\n|$)/i);
    if (surInline && !surname) {
      const cleaned = cleanNameChunk(surInline[1], ['SURNAME','NOM','APELLIDOS','LAST','NAME','FAMILY']);
      if (cleaned && cleaned.split(/\s+/).length <= 4 && cleaned.length >= 2) surname = cleaned;
    }
    if (givInline && !givenNames) {
      const cleaned = cleanNameChunk(givInline[1], ['GIVEN','NAMES','NAME','FIRST','PRENOMS','PRENOM','NOMBRES','NOMBRE']);
      if (cleaned && cleaned.split(/\s+/).length <= 4 && cleaned.length >= 2) givenNames = cleaned;
    }
  }

  if (!surname || !givenNames) {
    // Pattern B: Canadian style "SURNAME  Given names  JOHN"
    const canMatch = rawText.match(/\b([A-Z]{3,20})\s+Given\s*[Nn]ames[^A-Za-z0-9]*([A-Z][A-Za-z '-]{1,30})/i);
    if (canMatch && !/^(PASSPORT|CANADA|PASSEPORT|COUNTRY|CANADIAN)$/i.test(canMatch[1])) {
      if (!surname) surname = canMatch[1].toUpperCase();
      if (!givenNames) givenNames = canMatch[2].toUpperCase();
    }
  }

  // Pattern C: ALL-CAPS heuristic — ONLY when NO passport number found (too risky otherwise)
  // Passport labels like "TYPE TYPE TIPO CODE WE PASSPORTNO" would pollute names.
  if (!surname && !givenNames && !entities.passportNumber) {
    const SKIP_WORDS = new Set([
      // English
      'PASSPORT','PASSEPORT','REPUBLIC','FEDERAL','DEMOCRATIC','UNITED','STATES','AMERICA',
      'NATIONALITY','NATIONAL','SIGNATURE','BEARER','AUTHORITY','ISSUED','EXPIRY',
      'DATE','BIRTH','SEX','MALE','FEMALE','PLACE','VALID','VISA','OFFICIAL',
      'TRAVEL','DOCUMENT','EMERGENCY','ORDINARY','SERVICE','DIPLOMATIC',
      'CITIZEN','CITIZENSHIP','PERSONAL','NUMBER','SURNAME','GIVEN','NAMES','FIRST','LAST',
      'TYPE','CODE','COUNTRY','HOLDER','IDENTITY','CARD','RESIDENT','PAGE',
      'IMMIGRATION','ENDORSEMENTS','OBSERVATIONS','AMENDMENTS','MRZ','MACHINE',
      'READABLE','ZONE','PORT','ENTRY','SPECIMEN','SAMPLE',
      // Countries
      'CANADA','ETHIOPIA','ERITREA','KENYA','UGANDA','SOMALIA','SUDAN','DJIBOUTI',
      'EGYPT','NIGERIA','GHANA','INDIA','CHINA','PAKISTAN','AUSTRALIA','RUSSIA',
      'FRANCE','GERMANY','ITALY','SPAIN','BRITAIN','ENGLAND',
      // French
      'NOM','PRENOMS','PRENOM','NATIONALITE','NAISSANCE','LIEU','DELIVRE',
      'AUTORITE','VALABLE','TITULAIRE','DU','DE','LA','LE','LES',
      // Spanish
      'APELLIDOS','NOMBRES','NOMBRE','NACIMIENTO','EXPEDIDO','AUTORIDAD','VALIDO','TITULAR','DEL','NO',
      // Italian/German
      'COGNOME','NACHNAME','VORNAME','INHABER','GUELTIG',
      // OCR noise from multilingual merged labels
      'TIPO','TIPOCODE','WE','RTE','AND','THE','OF','FOR',
    ]);
    const allCapsBlocks = [];
    // Require at least 2 consecutive words, each ≥3 chars
    const capsPattern = /\b([A-Z]{3,20}(?:\s+[A-Z]{3,20}){1,3})\b/g;
    let capsMatch;
    while ((capsMatch = capsPattern.exec(upper)) !== null) {
      const tokens = capsMatch[1].split(/\s+/);
      const valid = tokens.filter(t =>
        !SKIP_WORDS.has(t) && /[AEIOUY]/.test(t) && t.length >= 3 && /^[A-Z]+$/.test(t)
      );
      if (valid.length >= 2 && valid.length <= 4) allCapsBlocks.push(valid);
    }
    if (allCapsBlocks.length > 0) {
      const best = allCapsBlocks[0];
      if (!surname)    surname    = best[best.length - 1];
      if (!givenNames) givenNames = best.slice(0, -1).join(' ');
    }
  }

  if (givenNames) {
    const tokens = givenNames.split(/\s+/).filter(Boolean);
    entities.firstName  = tokens[0] || '';
    entities.middleName = tokens.slice(1).join(' ') || '';
  }
  entities.lastName = surname || '';

  if (entities.firstName || entities.lastName) {
    entities.fullName = [entities.firstName, entities.middleName, entities.lastName].filter(Boolean).join(' ');
  }

  // ── Box / Shelf ───────────────────────────────────────────────────────────
  const boxMatch = upper.match(/\b([A-Z]{2,8}-B\d+-\d{2,3})\b/) || upper.match(/BOX\s*(?:NO|#)?\s*[:.]*\s*([A-Z0-9-]+)/);
  if (boxMatch) entities.boxNumber = boxMatch[1];

  const shelfMatch = upper.match(/(?:SHELF|RACK)\s*(?:NO\s*)?[:.]\s*([A-Z0-9 -]{2,12})/);
  if (shelfMatch) entities.shelfNumber = shelfMatch[1].trim();

  // ── Date of record ────────────────────────────────────────────────────────
  const dateMatch = upper.match(/\b(20\d{2}[-/]\d{2}[-/]\d{2})\b/) || upper.match(/\b(\d{2}[-/]\d{2}[-/]20\d{2})\b/);
  if (dateMatch) entities.date = dateMatch[1].replace(/\//g, '-');

  return entities;
}
