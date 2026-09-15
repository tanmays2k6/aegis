import net from 'node:net';

const HOST = '127.0.0.1';
const PORT = 3310;

const server = net.createServer((socket) => {
  let inStream = false;
  let buffer = Buffer.alloc(0);
  let payloadBytes = [];

  socket.on('data', (data) => {
    buffer = Buffer.concat([buffer, data]);

    while (buffer.length > 0) {
      if (!inStream) {
        const nullIdx = buffer.indexOf(0);
        if (nullIdx === -1) break;
        const cmd = buffer.subarray(0, nullIdx).toString('utf8');
        buffer = buffer.subarray(nullIdx + 1);

        if (cmd === 'zPING') {
          socket.end('PONG\n');
          return;
        }
        if (cmd === 'zVERSION') {
          socket.end('ClamAV 1.4.0/27300/Tue Sep 15 2026\n');
          return;
        }
        if (cmd === 'zINSTREAM') {
          inStream = true;
        }
      } else {
        if (buffer.length < 4) break;
        const chunkLen = buffer.readUInt32BE(0);
        if (chunkLen === 0) {
          // Zero length delimiter indicates end of stream
          buffer = buffer.subarray(4);
          const fullContent = Buffer.concat(payloadBytes).toString('utf8');
          if (fullContent.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
            socket.end('stream: Eicar-Test-Signature FOUND\n');
          } else {
            socket.end('stream: OK\n');
          }
          return;
        }

        if (buffer.length < 4 + chunkLen) {
          // Wait for full chunk payload
          break;
        }

        payloadBytes.push(buffer.subarray(4, 4 + chunkLen));
        buffer = buffer.subarray(4 + chunkLen);
      }
    }
  });

  socket.on('error', (err) => {
    // Ignore aborted connections
  });
});

server.listen(PORT, HOST, () => {
  console.log(`ClamAV Daemon listening on ${HOST}:${PORT}`);
});
