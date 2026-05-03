const { spawn } = require('child_process');
const http = require('http');

const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const server = spawn(cmd, ['run', 'dev'], { cwd: __dirname + '/../', env: { ...process.env, PORT: '3006' } });

let errorLogs = '';

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('[SERVER]', output);
  
  if (output.includes('Ready in') || output.includes('started server on') || output.includes('Ready')) {
    setTimeout(() => {
      http.get('http://localhost:3006/mock', (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          require('fs').writeFileSync(__dirname + '/test_output.txt', body);
          require('fs').writeFileSync(__dirname + '/test_error.txt', errorLogs);
          server.kill();
        });
      }).on('error', (e) => {
        console.error(`[CURL Error] ${e.message}`);
        server.kill();
      });
    }, 4000); // give it more time to compile
  }
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  console.error('[SERVER ERR]', output);
  errorLogs += output + '\n';
});
