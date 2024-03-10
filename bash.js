const { spawn } = require('child_process');

const bash = spawn('bash', [], {
  stdio: ['inherit', 'inherit', 'inherit', 'ipc']
});

bash.on('spawn', () => {
  console.log("$ > Bash was ready to use!")
});

bash.on('exit', (code) => {
  console.log(`Child process exited with code ${code}`);
});
