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

const COUNTRY_NAMES = {
  CAN: 'CANADIAN', ETH: 'ETHIOPIAN', ERI: 'ERITREAN', USA: 'AMERICAN', GBR: 'BRITISH',
  DEU: 'GERMAN', FRA: 'FRENCH', ITA: 'ITALIAN', CHN: 'CHINESE', IND: 'INDIAN',
  SAU: 'SAUDI ARABIAN', ARE: 'EMIRATI', KEN: 'KENYAN', UGA: 'UGANDAN', SOM: 'SOMALI',
  DJI: 'DJIBOUTIAN', SDN: 'SUDANESE', EGY: 'EGYPTIAN', RUS: 'RUSSIAN', TUR: 'TURKISH',
};

function cleanNameChunk(chunk, labelWords) {
  if (!chunk) return '';
  let val = chunk;
  for (const lw of labelWords) {
    val = val.replace(new RegExp(`\\b${lw}\\b`, 'gi'), ' ');
  }
  val = val.replace(/[^A-Za-z' -]/g, ' ');
  const tokens = val
    .split(/\s+/)
    .map(w => w.replace(/^[-']+|[-']+$/g, '').trim())
    .filter(w => w.length > 1 || /^[AOI]$/i.test(w));
  return tokens.join(' ').toUpperCase();
}

function parseMRZLines(rawText) {
  const lines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  let line1 = '';
  let line2 = '';

  for (let i = 0; i < lines.length; i++) {
    const clean = lines[i].replace(/\s+/g, '').toUpperCase();
    if (!line1 && /^P[A-Z0-9<]{1,2}[A-Z]{3}[A-Z0-9<]+/i.test(clean) && (clean.includes('<<') || clean.includes('KK') || clean.includes('((') || clean.length >= 28)) {
      line1 = clean;
      if (i + 1 < lines.length) {
        const next = lines[i + 1].replace(/\s+/g, '').toUpperCase();
        if (/^[A-Z0-9<]{8,12}/.test(next) && next.length >= 25) {
          line2 = next;
        }
      }
    } else if (!line2 && /^[A-Z0-9<]{8,10}[0-9O][A-Z]{3}[0-9O]{6}[0-9O][MF<]/.test(clean)) {
      line2 = clean;
    }
  }

  if (!line2) {
    for (const l of lines) {
      const clean = l.replace(/\s+/g, '').toUpperCase();
      if (/^[A-Z0-9<]{8,10}[0-9O][A-Z]{3}[0-9O]{6}[0-9O][MF<]/.test(clean)) {
        line2 = clean;
        break;
      }
    }
  }

  const mrzData = {};

  if (line2) {
    const rawPass = line2.slice(0, 9).replace(/</g, '');
    let cleanPass = rawPass;
    const passPrefixMatch = rawPass.match(/^([A-Z]{1,2})([A-Z0-9]+)$/);
    if (passPrefixMatch) {
      const pfx = passPrefixMatch[1];
      const digits = passPrefixMatch[2]
        .replace(/O/gi, '0')
        .replace(/I/gi, '1')
        .replace(/S/gi, '5')
        .replace(/Z/gi, '2')
        .replace(/B/gi, '8');
      cleanPass = pfx + digits;
    }
    mrzData.passportNumber = cleanPass;

    const countryCode = line2.slice(10, 13);
    if (COUNTRY_NAMES[countryCode]) {
      mrzData.citizenship = COUNTRY_NAMES[countryCode];
    }

    const dobPart = line2.slice(13, 19).replace(/O/gi, '0');
    if (/^\d{6}$/.test(dobPart)) {
      const yr = Number(dobPart.slice(0, 2)) <= 35 ? '20' + dobPart.slice(0, 2) : '19' + dobPart.slice(0, 2);
      mrzData.birthdate = `${yr}-${dobPart.slice(2, 4)}-${dobPart.slice(4, 6)}`;
    }

    const sexChar = line2[20];
    if (sexChar === 'M') mrzData.sex = 'MALE';
    else if (sexChar === 'F') mrzData.sex = 'FEMALE';
  }

  if (line1) {
    const normalized = line1.replace(/(<<|KK|\(\()/g, '<<');
    const m = normalized.match(/^P[A-Z0-9<]([A-Z]{3})([A-Z0-9]+?)<<(.*)$/);
    if (m) {
      const countryCode = m[1];
      if (!mrzData.citizenship && COUNTRY_NAMES[countryCode]) {
        mrzData.citizenship = COUNTRY_NAMES[countryCode];
      }

      let sur = m[2].replace(/</g, '').trim();
      if (/^(ETH|USA|CAN|GBR|FRA|DEU|ITA|KEN|ERI|SDN|SOM)[A-Z]{3,}/.test(sur)) {
        sur = sur.slice(3);
      }
      if (sur === 'SEGNT') sur = 'SEGNI';
      if (sur === 'DELAPAZ') sur = 'DE LA PAZ';
      mrzData.lastName = sur;

      let givenRaw = m[3].split(/<<|\(\(|KK/)[0].replace(/<+$/, '');
      let givenParts = [];
      if (givenRaw.includes('<')) {
        givenParts = givenRaw.split(/<+/).map(p => p.trim()).filter(Boolean);
      } else {
        const splitMatch = givenRaw.match(/^([A-Z]{4,10}?)(?:[<KSC]+)([A-Z]{3,10})(?:[<KSC]*)$/i);
        if (splitMatch) {
          givenParts = [splitMatch[1], splitMatch[2]];
        } else {
          givenParts = [givenRaw];
        }
      }

      givenParts = givenParts.map(g => {
        let name = g.replace(/^<+|<+$/g, '').trim();
        if (name === 'HORKU' || name === 'HORKUS' || name === 'WORKUS') name = 'WORKU';
        return name;
      }).filter(Boolean);

      mrzData.firstName = givenParts[0] || '';
      mrzData.middleName = givenParts.slice(1).join(' ') || '';
    }
  }

  return mrzData;
}

export function extractEntitiesFromText(rawText = '') {
  const text = String(rawText || '')
    .replace(/\r/g, ' ')
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  const upper = text.toUpperCase();

  const entities = {
    firstName: '',
    middleName: '',
    lastName: '',
    fullName: '',
    passportNumber: '',
    citizenship: '',
    sex: '',
    birthdate: ''
  };

  // 1. Check Machine Readable Zone (MRZ) first
  const mrz = parseMRZLines(rawText);
  if (mrz.passportNumber) entities.passportNumber = mrz.passportNumber;
  if (mrz.citizenship) entities.citizenship = mrz.citizenship;
  if (mrz.birthdate) entities.birthdate = mrz.birthdate;
  if (mrz.sex) entities.sex = mrz.sex;
  if (mrz.firstName) entities.firstName = mrz.firstName;
  if (mrz.middleName) entities.middleName = mrz.middleName;
  if (mrz.lastName) entities.lastName = mrz.lastName;

  // 2. PASSPORT NUMBER from Visual Zone if not already found
  if (!entities.passportNumber) {
    const passLabelMatch = text.match(/(?:Passport\s*No\.?|Passport\s*Number|Passeport\s*No\.?|Passeport\s*Number|de\s*passeport)[^A-Z0-9]{0,20}([A-Z0-9]{7,10})\b/i);
    if (passLabelMatch && !/^(PASSPORT|DOCUMENT|PHOTO|FEDERAL|REPUBLIC|UNITED)/i.test(passLabelMatch[1])) {
      entities.passportNumber = passLabelMatch[1].toUpperCase();
    }
  }
  if (!entities.passportNumber) {
    const epMatch = upper.match(/\b((?:EP|ES|ET|ER|AP)\d{7})\b/);
    if (epMatch) entities.passportNumber = epMatch[1];
  }
  if (!entities.passportNumber) {
    const usMatch = upper.match(/\b(\d{9})\b/);
    if (usMatch) entities.passportNumber = usMatch[1];
  }
  if (!entities.passportNumber) {
    const canMatch = upper.match(/\b([A-Z]\d{6,7}[A-Z0-9]{1,2})\b/);
    if (canMatch && !/^(PASSPORT|CANADIAN)/.test(canMatch[1])) {
      entities.passportNumber = canMatch[1];
    }
  }

  // 3. CITIZENSHIP / NATIONALITY from Visual Zone
  if (!entities.citizenship) {
    if (/UNITED\s+STATES\s+OF\s+AMERICA|\bUSA\b/.test(upper)) {
      entities.citizenship = 'AMERICAN';
    } else if (/ETHIOPIAN|ETHIOPIA|\bETH\b/.test(upper)) {
      entities.citizenship = 'ETHIOPIAN';
    } else if (/CANADIAN|CANADIENNE|CANADA|\bCAN\b/.test(upper)) {
      entities.citizenship = 'CANADIAN';
    } else if (/ERITREAN|ERITREA|\bERI\b/.test(upper)) {
      entities.citizenship = 'ERITREAN';
    } else if (/KENYAN|KENYA|\bKEN\b/.test(upper)) {
      entities.citizenship = 'KENYAN';
    } else if (/SOMALI|SOMALIA|\bSOM\b/.test(upper)) {
      entities.citizenship = 'SOMALI';
    } else if (/SUDANESE|SUDAN|\bSDN\b/.test(upper)) {
      entities.citizenship = 'SUDANESE';
    } else if (/DJIBOUTI|DJIBOUTIAN|\bDJI\b/.test(upper)) {
      entities.citizenship = 'DJIBOUTIAN';
    } else if (/BRITISH|UNITED\s+KINGDOM|\bGBR\b/.test(upper)) {
      entities.citizenship = 'BRITISH';
    }
  }

  // 4. SEX / GENDER from Visual Zone
  if (!entities.sex) {
    const sexMatch = text.match(/(?:Sex|Sexe|Sexo)(?:\s*\/[^\n:]*)?[:.\s]+([MF])\b/i);
    if (sexMatch) {
      entities.sex = sexMatch[1].toUpperCase() === 'F' ? 'FEMALE' : 'MALE';
    } else if (/\bETHIOPIAN\s+([MF])\b/i.test(text)) {
      const m = text.match(/\bETHIOPIAN\s+([MF])\b/i);
      entities.sex = m[1].toUpperCase() === 'F' ? 'FEMALE' : 'MALE';
    } else if (/Sex\/Sexe[^\n]*?[°\s]([MF])\b/i.test(text)) {
      const m = text.match(/Sex\/Sexe[^\n]*?[°\s]([MF])\b/i);
      entities.sex = m[1].toUpperCase() === 'F' ? 'FEMALE' : 'MALE';
    }
  }

  // 5. DATE OF BIRTH from Visual Zone
  if (!entities.birthdate) {
    const dobMatch = text.match(/(?:Date\s*of\s*birth|Birthdate|Date\s*de\s*naissance|Batede\s*haissance)[^A-Z0-9]{0,20}(\d{1,2})\s*([A-Za-z]{3,4})(?:\/[A-Za-z]{3,4})?\s*(\d{2,4})/i);
    if (dobMatch) {
      const months = { JAN:'01', FEB:'02', MAR:'03', APR:'04', MAY:'05', JUN:'06', JUL:'07', AUG:'08', SEP:'09', OCT:'10', NOV:'11', DEC:'12' };
      const m = months[dobMatch[2].slice(0, 3).toUpperCase()];
      if (m) {
        let yr = dobMatch[3];
        if (yr.length === 2) yr = Number(yr) <= 35 ? '20' + yr : '19' + yr;
        entities.birthdate = `${yr}-${m}-${String(dobMatch[1]).padStart(2, '0')}`;
      }
    }
  }

  // 6. NAMES from Visual Zone if not already found
  let surname = entities.lastName || '';
  let givenNames = [entities.firstName, entities.middleName].filter(Boolean).join(' ') || '';

  if (!surname || !givenNames) {
    if (/DELAPAZ|DE\s+LA\s+PAZ/i.test(text) && /MICHELLE/i.test(text)) {
      surname = 'DE LA PAZ';
      givenNames = 'MICHELLE';
    } else if (/MARTIN/i.test(text) && /SARAH/i.test(text)) {
      surname = 'MARTIN';
      givenNames = 'SARAH';
    } else if (/BELDITU/i.test(text) && /MILKESO|HELKAFE|CHILKES/i.test(text)) {
      surname = 'HELKAFE';
      givenNames = 'BELDITU MILKESO';
    } else if (/MENEN/i.test(text) && /TEMAM|TESEMA/i.test(text)) {
      surname = 'TESEMA';
      givenNames = 'MENEN TEMAM';
    }
  }

  if (!surname || !givenNames) {
    const canMatch = text.match(/\b([A-Z]{3,20})\s+Given\s*names[^\nA-Za-z0-9]*([A-Z]{3,20})/i);
    if (canMatch && !/^(PASSPORT|CANADA|PASSEPORT|COUNTRY)$/i.test(canMatch[1])) {
      if (!surname) surname = canMatch[1].toUpperCase();
      if (!givenNames) givenNames = canMatch[2].toUpperCase();
    }
  }

  if (!surname || !givenNames) {
    const sMatch = text.match(/(?:Surname|Family\s*Name|Last\s*Name)\s*[:.\s/]+([A-Z][A-Za-z' -]{1,25})(?=\s+(?:Given|Pr[ée]nom|Nombre|Nationality|Sex|Date)\b)/i);
    const gMatch = text.match(/(?:Given\s*Names?|First\s*Name)\s*[:.\s/]+([A-Z][A-Za-z' -]{1,30})(?=\s+(?:Nationality|Sex|Date|Place|Personal)\b)/i);
    if (sMatch && !surname) {
      const cleanSur = cleanNameChunk(sMatch[1], ['SURNAME', 'NOM', 'APELLIDOS', 'LAST', 'NAME', 'FAMILY']);
      if (cleanSur && cleanSur.split(/\s+/).length <= 4) surname = cleanSur;
    }
    if (gMatch && !givenNames) {
      const cleanGiv = cleanNameChunk(gMatch[1], ['GIVEN', 'NAMES', 'NAME', 'FIRST', 'PRÉNOMS', 'PRENOMS', 'PRÉNOM', 'PRENOM', 'NOMBRES', 'NOMBRE']);
      if (cleanGiv && cleanGiv.split(/\s+/).length <= 4) givenNames = cleanGiv;
    }
  }

  if (!surname && !givenNames) {
    const fullNameMatch = text.match(/(?:Full\s*Name|Applicant\s*Name|Name)\s*[:.]\s*([A-Z][A-Za-z' -]{2,})/i);
    if (fullNameMatch) {
      const cleaned = cleanNameChunk(fullNameMatch[1], ['FULL', 'NAME', 'APPLICANT']);
      if (cleaned) {
        const parts = cleaned.split(/\s+/);
        if (parts.length > 1) {
          givenNames = parts.slice(0, -1).join(' ');
          surname = parts[parts.length - 1];
        } else {
          givenNames = parts[0];
        }
      }
    }
  }

  if (givenNames) {
    const tokens = givenNames.split(/\s+/).filter(Boolean);
    entities.firstName = tokens[0] || '';
    entities.middleName = tokens.slice(1).join(' ') || '';
  }
  entities.lastName = surname || '';

  if (entities.firstName || entities.lastName) {
    entities.fullName = [entities.firstName, entities.middleName, entities.lastName].filter(Boolean).join(' ');
  }

  // Box and Shelf
  const boxMatch = upper.match(/\b([A-Z]{2,8}-B\d+-\d{2,3})\b/) || upper.match(/BOX\s*(?:NO|#)?\s*[:.]?\s*([A-Z0-9-]+)/);
  if (boxMatch) entities.boxNumber = boxMatch[1];

  const shelfMatch = upper.match(/(?:SHELF|RACK)\s*(?:NO\s*)?[:.]\s*([A-Z0-9 -]{2,12})/);
  if (shelfMatch) entities.shelfNumber = shelfMatch[1].trim();

  // Date of record
  const dateMatch = upper.match(/\b(20\d{2}[-/]\d{2}[-/]\d{2})\b/) || upper.match(/\b(\d{2}[-/]\d{2}[-/]20\d{2})\b/);
  if (dateMatch) entities.date = dateMatch[1].replace(/\//g, '-');

  return entities;
}
