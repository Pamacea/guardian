const { spawn } = require('child_process');
const { config } = require('./config.js');
const { printSuccess, fail } = require('./ui/output.js');
const { dim } = require('./ui/colors.js');

function runCommand(cmd, args, options = {}) {
  return new Promise((resolve) => {
    const { silent = false, timeout = 60000 } = options;
    let stdout = '';

    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout
    });

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', () => {
      // Silently collect stderr
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        if (!silent) {
          console.error(dim(`  [debug] Command exited with code ${code}`));
        }
        resolve(null);
      }
    });

    child.on('error', (err) => {
      if (!silent) {
        console.error(dim(`  [debug] Command error: ${err.message}`));
      }
      resolve(null);
    });
  });
}

async function checkDocker() {
  const result = await runCommand('docker', ['info'], { silent: true });
  return result !== null;
}

async function imageExists() {
  const result = await runCommand('docker', ['images', '-q', config.IMAGE_NAME]);
  return result !== null && result.length > 0;
}

async function buildImage() {
  return new Promise((resolve) => {
    const args = [
      'build',
      '-t', config.IMAGE_NAME,
      '-f', config.DOCKERFILE,
      config.DOCKERFILE_DIR
    ];

    const child = spawn('docker', args, { stdio: 'inherit', timeout: 600000 });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

async function containerRunning() {
  const result = await runCommand('docker', [
    'ps',
    '--filter', `name=^${config.CONTAINER_NAME}$`,
    '--format', '{{.Names}}'
  ]);
  return result === config.CONTAINER_NAME;
}

async function containerExists() {
  const result = await runCommand('docker', [
    'ps', '-a',
    '--filter', `name=^${config.CONTAINER_NAME}$`,
    '--format', '{{.Names}}'
  ]);
  return result === config.CONTAINER_NAME;
}

async function startContainer() {
  const result = await runCommand('docker', ['start', config.CONTAINER_NAME], { timeout: 30000 });
  return result !== null;
}

async function createContainer(networkFlag) {
  const args = [
    'run', '-d',
    '--name', config.CONTAINER_NAME
  ];

  if (networkFlag) {
    args.push(networkFlag);
  }

  args.push(config.IMAGE_NAME);

  const result = await runCommand('docker', args, { timeout: 30000 });
  return result !== null;
}

async function ensureDocker(fail) {
  const isRunning = await checkDocker();
  if (!isRunning) {
    fail(`Docker is not running.

  Start Docker Desktop (or the Docker daemon) and try again.

  Install Docker: https://docs.docker.com/get-docker/`);
  }
  printSuccess('Docker is running');
}

async function ensureImage(ask) {
  const exists = await imageExists();

  if (!exists) {
    const { printStep, printInfo } = require('./ui/output.js');
    console.log('');
    console.log(`  ${printStep('The security toolkit needs to be installed (~550-650 MB Docker image).')}`);
    printInfo('This only happens once.');
    console.log('');
    const answer = await ask(`  Install it now? (Y/n) `);
    if (answer === 'n' || answer === 'no') {
      console.log('');
      printInfo('No problem. Run npx @oalacea/guardian again when you\'re ready.');
      console.log('');
      process.exit(0);
    }
    console.log('');
    printStep('Building security toolkit...');
    printInfo('This may take 2-3 minutes on first run...');
    console.log('');

    const success = await buildImage();
    if (!success) {
      fail(`Failed to build the security toolkit image.

  Try manually:
    docker build -t ${config.IMAGE_NAME} -f "${config.DOCKERFILE}" "${config.DOCKERFILE_DIR}"`);
    }
    console.log('');
    printSuccess('Security toolkit installed');
  } else {
    printSuccess('Security toolkit ready');
  }
}

async function ensureContainer(platform, fail) {
  const { getNetworkFlag } = require('./platform.js');
  const { printStep, cyan, green } = require('./ui/colors.js');

  const running = await containerRunning();

  if (running) {
    printSuccess(`Toolkit container running (${config.CONTAINER_NAME})`);
  } else {
    const exists = await containerExists();

    if (exists) {
      process.stdout.write(`  ${printStep('Starting toolkit container...')}`);
      const started = await startContainer();
      if (!started) {
        console.log('');
        fail(`Failed to start container.

  Try manually:
    docker start ${config.CONTAINER_NAME}`);
      }
      console.log(` ${green('done')}`);
    } else {
      const networkFlag = getNetworkFlag(platform);
      process.stdout.write(`  ${printStep(`Creating toolkit container (${config.CONTAINER_NAME})...`)}`);
      const created = await createContainer(networkFlag);
      if (!created) {
        console.log('');
        const runCmd = `docker run -d --name ${config.CONTAINER_NAME} ${networkFlag} ${config.IMAGE_NAME}`.replace(/\s+/g, ' ');
        fail(`Failed to create container.

  Try manually:
    ${cyan(runCmd)}`);
      }
      console.log(` ${green('done')}`);
    }
    printSuccess(`Toolkit container running (${config.CONTAINER_NAME})`);
  }
}

module.exports = {
  ensureDocker,
  ensureImage,
  ensureContainer
};
