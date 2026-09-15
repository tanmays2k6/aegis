import path from 'node:path';
const allowed = { '.pdf': ['application/pdf'], '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'], '.png': ['image/png'], '.txt': ['text/plain'], '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'], '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] };
export function validateUpload({ fileName, fileType, bytes }) {
  if (typeof fileName !== 'string' || !fileName || fileName.length > 180 || /[\\/\0\p{C}]/u.test(fileName) || fileName.includes('..')) throw Object.assign(new Error('Unsafe filename.'), { status: 400, code: 'INVALID_FILENAME' });
  const ext = path.extname(fileName.normalize('NFC')).toLowerCase(); if (!allowed[ext]) throw Object.assign(new Error('Unsupported file type.'), { status: 415, code: 'UNSUPPORTED_FILE_TYPE' });
  const max = Number(process.env.MAX_UPLOAD_SIZE_MB || 10) * 1024 * 1024; if (!bytes.length || bytes.length > max) throw Object.assign(new Error('Invalid file size.'), { status: 413, code: 'INVALID_FILE_SIZE' });
  let detected; if (bytes.subarray(0, 5).toString() === '%PDF-') detected = '.pdf'; else if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) detected = '.png'; else if (bytes.subarray(0, 3).equals(Buffer.from([255,216,255]))) detected = '.jpg'; else if (bytes.subarray(0, 4).toString() === 'PK\x03\x04') detected = bytes.includes(Buffer.from('word/')) ? '.docx' : bytes.includes(Buffer.from('xl/')) ? '.xlsx' : null; else if (!bytes.includes(0) && Buffer.from(bytes.toString('utf8'), 'utf8').equals(bytes)) detected = '.txt';
  if (!detected || (ext === '.jpeg' ? '.jpg' : ext) !== detected || !allowed[ext].includes(fileType || '')) throw Object.assign(new Error('Filename, MIME type, and file signature must agree.'), { status: 415, code: 'FILE_TYPE_MISMATCH' });
  return { extension: ext, detectedMimeType: allowed[ext][0], displayName: fileName.normalize('NFC') };
}
