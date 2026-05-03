const { spawn } = require('child_process');
const http = require('http');

const server = spawn('npm', ['run', 'dev'], { cwd: __dirname + '/../', env: { ...process.env, PORT: '3005' } });

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('[SERVER]', output);
  
  if (output.includes('Ready in') || output.includes('started server on')) {
    setTimeout(() => {
      http.get('http://localhost:3005/mock', (res) => {
        console.log(`[CURL] Status: ${res.statusCode}`);
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (body.includes('Server Components render')) {
            console.log('[CURL] Found error in HTML');
          } else {
            console.log('[CURL] Success, length:', body.length);
          }
          server.kill();
        });
      }).on('error', (e) => {
        console.error(`[CURL Error] ${e.message}`);
        server.kill();
      });
    }, 2000);
  }
});

server.stderr.on('data', (data) => {
  console.error('[SERVER ERR]', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});
