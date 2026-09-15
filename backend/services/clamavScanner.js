import net from 'node:net';

export class ClamAVScanner {
  constructor({ host = process.env.CLAMAV_HOST || '127.0.0.1', port = Number(process.env.CLAMAV_PORT || 3310), connectionTimeoutMs = Number(process.env.CLAMAV_CONNECTION_TIMEOUT_MS || 3000), scanTimeoutMs = Number(process.env.CLAMAV_SCAN_TIMEOUT_MS || 30000) } = {}) { Object.assign(this, { host, port, connectionTimeoutMs, scanTimeoutMs }); }
  _request(command, payload = null) { return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: this.host, port: this.port }); let response = ''; let connected = false;
    const timer = setTimeout(() => { socket.destroy(); reject(Object.assign(new Error(connected ? 'Scanner timed out' : 'Scanner unavailable'), { code: connected ? 'SCAN_TIMEOUT' : 'SCANNER_UNAVAILABLE' })); }, connected ? this.scanTimeoutMs : this.connectionTimeoutMs);
    socket.once('connect', () => { connected = true; clearTimeout(timer); socket.setTimeout(this.scanTimeoutMs); socket.write(command); if (payload) { for (let i = 0; i < payload.length; i += 65536) { const part = payload.subarray(i, i + 65536); const len = Buffer.alloc(4); len.writeUInt32BE(part.length); socket.write(len); socket.write(part); } const end = Buffer.alloc(4); socket.write(end); } });
    socket.on('data', d => { response += d.toString('utf8'); }); socket.on('timeout', () => { socket.destroy(); reject(Object.assign(new Error('Scanner timed out'), { code: 'SCAN_TIMEOUT' })); });
    socket.on('error', e => { clearTimeout(timer); reject(Object.assign(e, { code: e.code || 'SCANNER_UNAVAILABLE' })); }); socket.on('end', () => { clearTimeout(timer); resolve(response.trim()); });
  }); }
  async scan(bytes) { const result = await this._request('zINSTREAM\0', bytes); if (/\bOK$/.test(result)) return { status: 'CLEAN' }; const found = result.match(/: (.+) FOUND$/); if (found) return { status: 'INFECTED', threatName: found[1] }; throw Object.assign(new Error('Malformed clamd response'), { code: 'SCANNER_MALFORMED' }); }
  async healthCheck() { return (await this._request('zPING\0')) === 'PONG'; }
  async getScannerInfo() { return { scanner: 'ClamAV', version: await this._request('zVERSION\0') }; }
}
