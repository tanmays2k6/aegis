import net from 'node:net';

export class ClamAVScanner {
  constructor({
    host = process.env.CLAMAV_HOST || '127.0.0.1',
    port = Number(process.env.CLAMAV_PORT || 3310),
    httpUrl = process.env.CLAMAV_HTTP_URL || null,
    connectionTimeoutMs = Number(process.env.CLAMAV_CONNECTION_TIMEOUT_MS || 5000),
    scanTimeoutMs = Number(process.env.CLAMAV_SCAN_TIMEOUT_MS || 45000),
  } = {}) {
    Object.assign(this, { host, port, httpUrl, connectionTimeoutMs, scanTimeoutMs });
  }

  // TCP mode (local daemon / fly.io / internal network)
  _requestTcp(command, payload = null) {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port });
      let response = '';
      let connected = false;

      const timer = setTimeout(() => {
        socket.destroy();
        reject(
          Object.assign(new Error(connected ? 'Scanner timed out' : 'Scanner unavailable'), {
            code: connected ? 'SCAN_TIMEOUT' : 'SCANNER_UNAVAILABLE',
          })
        );
      }, connected ? this.scanTimeoutMs : this.connectionTimeoutMs);

      socket.once('connect', () => {
        connected = true;
        clearTimeout(timer);
        socket.setTimeout(this.scanTimeoutMs);
        socket.write(command);
        if (payload) {
          for (let i = 0; i < payload.length; i += 65536) {
            const part = payload.subarray(i, i + 65536);
            const len = Buffer.alloc(4);
            len.writeUInt32BE(part.length);
            socket.write(len);
            socket.write(part);
          }
          const end = Buffer.alloc(4);
          socket.write(end);
        }
      });

      socket.on('data', (d) => {
        response += d.toString('utf8');
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(Object.assign(new Error('Scanner timed out'), { code: 'SCAN_TIMEOUT' }));
      });

      socket.on('error', (e) => {
        clearTimeout(timer);
        reject(Object.assign(e, { code: e.code || 'SCANNER_UNAVAILABLE' }));
      });

      socket.on('end', () => {
        clearTimeout(timer);
        resolve(response.trim());
      });
    });
  }

  // HTTP mode (Render Web Service or external HTTP proxy)
  async _requestHttp(endpoint, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || this.scanTimeoutMs);

    try {
      const url = `${this.httpUrl.replace(/\/+$/, '')}${endpoint}`;
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw Object.assign(new Error(`HTTP Scanner returned ${res.status}: ${errorText}`), {
          code: 'SCANNER_UNAVAILABLE',
        });
      }

      return await res.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        throw Object.assign(new Error('Scanner timed out'), { code: 'SCAN_TIMEOUT' });
      }
      throw Object.assign(err, { code: err.code || 'SCANNER_UNAVAILABLE' });
    } finally {
      clearTimeout(timeout);
    }
  }

  async scan(bytes) {
    if (this.httpUrl) {
      const data = await this._requestHttp('/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: bytes,
        timeoutMs: this.scanTimeoutMs,
      });
      return data;
    }

    const result = await this._requestTcp('zINSTREAM\0', bytes);
    if (/\bOK$/.test(result)) return { status: 'CLEAN' };
    const found = result.match(/: (.+) FOUND$/);
    if (found) return { status: 'INFECTED', threatName: found[1] };
    throw Object.assign(new Error('Malformed clamd response'), { code: 'SCANNER_MALFORMED' });
  }

  async healthCheck() {
    try {
      if (this.httpUrl) {
        const res = await this._requestHttp('/health', { method: 'GET', timeoutMs: 5000 });
        return Boolean(res.ok);
      }
      return (await this._requestTcp('zPING\0')) === 'PONG';
    } catch {
      return false;
    }
  }

  async getScannerInfo() {
    if (this.httpUrl) {
      return await this._requestHttp('/version', { method: 'GET', timeoutMs: 5000 });
    }
    return { scanner: 'ClamAV', version: await this._requestTcp('zVERSION\0') };
  }
}
