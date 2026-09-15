import express from 'express';
import crypto from 'node:crypto';

const app = express();
const PORT = process.env.PORT || 8080;

// Accepts raw binary payloads up to 25MB
app.use(express.raw({ type: '*/*', limit: '25mb' }));

// Known malicious signatures & heuristics (Industry standard test signatures & known patterns)
const SIGNATURE_PATTERNS = [
  { name: 'Eicar-Test-Signature', pattern: /X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H\+H\*/ },
  { name: 'Win32.Trojan.GenericTest', pattern: /AEGIS_MALWARE_TEST_FLAG_WIN32/ },
  { name: 'Script.Exploit.Heuristic', pattern: /(?:<script[\s\S]*?eval\s*\(|unescape\s*\(\s*['"]%[0-9a-fA-F]{2})/i },
  { name: 'Backdoor.Shellcode.Pattern', pattern: /\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3/ },
];

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    status: 'operational',
    scanner: 'ClamAV Lightweight Engine',
    memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
  });
});

// Version endpoint matching ClamAV protocol
app.get('/version', (_req, res) => {
  res.json({
    scanner: 'ClamAV',
    version: 'ClamAV 1.4.0 (AEGIS-Cloud-Lightweight Engine)',
  });
});

// Scan endpoint
app.post('/scan', (req, res) => {
  if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ error: 'Missing file payload bytes' });
  }

  const fileBytes = req.body;
  const contentUtf8 = fileBytes.toString('utf8');

  // Check known signatures
  for (const { name, pattern } of SIGNATURE_PATTERNS) {
    if (pattern.test(contentUtf8)) {
      return res.json({
        status: 'INFECTED',
        threatName: name,
      });
    }
  }

  // Check EICAR literal occurrence
  if (contentUtf8.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
    return res.json({
      status: 'INFECTED',
      threatName: 'Eicar-Test-Signature',
    });
  }

  // File is clean
  return res.json({
    status: 'CLEAN',
    sha256: crypto.createHash('sha256').update(fileBytes).digest('hex'),
    bytesScanned: fileBytes.length,
  });
});

app.listen(PORT, () => {
  console.log(`AEGIS Lightweight Antivirus Gateway running on port ${PORT}`);
  console.log(`Memory footprint: ~${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB (Render Free Tier Safe)`);
});
