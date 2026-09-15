import express from 'express';
import net from 'node:net';

const app = express();
const PORT = process.env.PORT || 8080;
const CLAMD_PORT = 3310;
const CLAMD_HOST = '127.0.0.1';

// Receive binary/raw streams up to 25MB
app.use(express.raw({ type: '*/*', limit: '25mb' }));

function queryClamd(command, payload = null, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: CLAMD_HOST, port: CLAMD_PORT });
    let response = '';

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('ClamAV daemon request timeout'));
    }, timeoutMs);

    socket.once('connect', () => {
      socket.write(command);
      if (payload && Buffer.isBuffer(payload)) {
        for (let i = 0; i < payload.length; i += 65536) {
          const chunk = payload.subarray(i, i + 65536);
          const len = Buffer.alloc(4);
          len.writeUInt32BE(chunk.length);
          socket.write(len);
          socket.write(chunk);
        }
        const end = Buffer.alloc(4);
        socket.write(end);
      }
    });

    socket.on('data', (d) => {
      response += d.toString('utf8');
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    socket.on('end', () => {
      clearTimeout(timer);
      resolve(response.trim());
    });
  });
}

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    const reply = await queryClamd('zPING\0', null, 3000);
    res.json({ ok: reply === 'PONG', status: 'operational', clamd: reply });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

// Version endpoint
app.get('/version', async (_req, res) => {
  try {
    const ver = await queryClamd('zVERSION\0', null, 3000);
    res.json({ scanner: 'ClamAV', version: ver });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Scan endpoint (Accepts raw binary body)
app.post('/scan', async (req, res) => {
  if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ error: 'Missing file payload bytes' });
  }

  try {
    const reply = await queryClamd('zINSTREAM\0', req.body, 45000);

    if (/\bOK$/.test(reply)) {
      return res.json({ status: 'CLEAN' });
    }

    const found = reply.match(/: (.+) FOUND$/);
    if (found) {
      return res.json({ status: 'INFECTED', threatName: found[1] });
    }

    return res.status(502).json({ error: 'Malformed scanner response', raw: reply });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`ClamAV HTTP Gateway listening on port ${PORT}`);
});
