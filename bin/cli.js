#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { validateUrl, validateDockerName } = require('./validation');

// --- Config ---
const IMAGE_NAME = 'guardian-tools';
const CONTAINER_NAME = 'guardian-tools';
const PROMPT_SRC = path.join(__dirname, '..', 'prompt', 'REVIEW.md');
const PROMPT_DEST = path.join(process.cwd(), '.guardian', 'REVIEW.md');
// Use docker/Dockerfile for security
const DOCKERFILE = path.join(__dirname, '..', 'docker', 'Dockerfile');
const DOCKERFILE_DIR = path.dirname(DOCKERFILE);

// --- Colors ---
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const blue = (s) => `\x1b[34m${s}\x1b[0m`;

/**
 * Safely execute a command using spawn with array arguments.
 * This prevents command injection by avoiding shell interpretation.
 *
 * @param {string[]} args - Command and arguments as array (e.g., ['docker', 'ps'])
 * @param {object} options - Options object
 * @param {boolean} options.silent - Suppress error output
 * @param {number} options.timeout - Timeout in milliseconds (default: 60000)
 * @returns {string|null} Command output or null on failure
 */
function run(args, { silent = false, timeout = 60000 } = {}) {
  return new Promise((resolve) => {
    if (!Array.isArray(args) || args.length === 0) {
      if (!silent) console.error(dim('  [debug] Invalid command arguments'));
      resolve(null);
      return;
    }

    const [command, ...cmdArgs] = args;
    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
    }, timeout);

    const child = spawn(command, cmdArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false, // Critical: never use shell to prevent injection
      windowsHide: true,
    });

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) {
        if (!silent) console.error(dim('  [debug] Command timed out'));
        resolve(null);
        return;
      }
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        if (!silent && stderr) {
          console.error(dim(`  [debug] Command exited with code ${code}`));
        }
        resolve(null);
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (!silent) {
        console.error(dim(`  [debug] Command error: ${err.message}`));
      }
      resolve(null);
    });
  });
}

/**
 * Run a command with inherited stdio (for interactive operations like build)
 * Uses spawn with array arguments to prevent command injection.
 *
 * @param {string[]} args - Command and arguments as array
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function runInherit(args, timeout = 600000) {
  const [command, ...cmdArgs] = args;

  return new Promise((resolve) => {
    const child = spawn(command, cmdArgs, {
      stdio: 'inherit',
      shell: false, // Critical: never use shell to prevent injection
      windowsHide: true,
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });

    child.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

function fail(msg) {
  console.error(`\n  ${red('✗')} ${msg}\n`);
  process.exit(1);
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// --- Helpers ---
const PROJECT_MARKERS = [
  'package.json', 'requirements.txt', 'pyproject.toml', 'Pipfile',
  'go.mod', 'pom.xml', 'build.gradle', 'Gemfile', 'composer.json', 'Cargo.toml'
];

function isUrl(str) {
  return /^https?:\/\/.+/i.test(str);
}

function hasProjectFiles() {
  const cwd = path.resolve(process.cwd());
  // Detect symlink shenanigans
  try {
    const realCwd = fs.realpathSync(cwd);
    if (realCwd !== cwd) {
      console.warn(yellow('  ⚠ Symbolic link detected in path, using real path'));
    }
  } catch {
    // realpathSync failed, continue with cwd
  }
  return PROJECT_MARKERS.some((f) => fs.existsSync(path.join(cwd, f)));
}

async function main() {
  // Validate working directory
  const cwd = path.resolve(process.cwd());
  const normalizedCwd = path.normalize(cwd);
  if (cwd !== normalizedCwd) {
    fail('Path contains symbolic links or unusual characters. Please run from a normal directory.');
  }

  // Detect platform once for consistency
  const isLinux = process.platform === 'linux';
  const isMac = process.platform === 'darwin';
  const isWindows = process.platform === 'win32';

  // Validate and parse target URL if provided
  let targetUrl = null;
  const urlArg = process.argv[2];
  if (urlArg && isUrl(urlArg)) {
    const validation = validateUrl(urlArg);
    if (!validation.valid) {
      fail(`Invalid target URL: ${validation.error}`);
    }
    targetUrl = urlArg;
  }
  const productionMode = !!targetUrl;

  // Validate Docker names (defensive programming)
  const imageNameValidation = validateDockerName(IMAGE_NAME);
  const containerNameValidation = validateDockerName(CONTAINER_NAME);
  if (!imageNameValidation.valid || !containerNameValidation.valid) {
    fail('Internal error: Invalid Docker name configuration');
  }

  console.log('');
  console.log(bold(blue('  ╔═══════════════════════════════════════╗')));
  console.log(bold(blue('  ║   ') + bold('Guardian') + blue('                            ║')));
  console.log(bold(blue('  ║   AI-Powered Security Review       ║')));
  console.log(bold(blue('  ╚═══════════════════════════════════════╝')));
  console.log('');
  console.log(dim('  Automated pentesting toolkit for web developers'));
  console.log('');

  // --- Step 1: Check Docker ---
  const dockerInfo = await run(['docker', 'info'], { silent: true });
  if (dockerInfo === null) {
    fail(`Docker is not running.

  Start Docker Desktop (or the Docker daemon) and try again.

  Install Docker: ${cyan('https://docs.docker.com/get-docker/')}`);
  }
  console.log(`  ${green('✓')} Docker is running`);

  // --- Step 2: Build image if missing ---
  const imageExists = await run(['docker', 'images', '-q', IMAGE_NAME]);

  if (!imageExists) {
    console.log('');
    console.log(`  ${yellow('◆')} The security toolkit needs to be installed (~550-650 MB Docker image).`);
    console.log(`  ${dim('This only happens once.')}`);
    console.log('');
    const answer = await ask(`  Install it now? ${dim('(Y/n)')} `);
    if (answer === 'n' || answer === 'no') {
      console.log('');
      console.log(dim('  No problem. Run npx @oalacea/guardian again when you\'re ready.'));
      console.log('');
      process.exit(0);
    }
    console.log('');
    console.log(`  ${yellow('→')} Building security toolkit...`);
    console.log(dim('  This may take 2-3 minutes on first run...'));
    console.log('');

    // Secure docker build command using spawn with array arguments
    const buildSuccess = await runInherit([
      'docker',
      'build',
      '-t', IMAGE_NAME,
      '-f', DOCKERFILE,
      DOCKERFILE_DIR
    ], 600000);

    if (!buildSuccess) {
      fail(`Failed to build the security toolkit image.

  Try manually:
    ${cyan(`docker build -t ${IMAGE_NAME} -f "${DOCKERFILE}" "${DOCKERFILE_DIR}"`)}`);
    }
    console.log('');
    console.log(`  ${green('✓')} Security toolkit installed`);
  } else {
    console.log(`  ${green('✓')} Security toolkit ready`);
  }

  // --- Step 3: Start container if not running ---
  const containerRunning = await run([
    'docker', 'ps',
    '--filter', `name=^${CONTAINER_NAME}$`,
    '--format', '{{.Names}}'
  ]);

  if (containerRunning === CONTAINER_NAME) {
    console.log(`  ${green('✓')} Toolkit container running (${bold(CONTAINER_NAME)})`);
  } else {
    const containerExists = await run([
      'docker', 'ps', '-a',
      '--filter', `name=^${CONTAINER_NAME}$`,
      '--format', '{{.Names}}'
    ]);

    if (containerExists === CONTAINER_NAME) {
      process.stdout.write(`  ${yellow('→')} Starting toolkit container...`);
      const startResult = await run(['docker', 'start', CONTAINER_NAME], { timeout: 30000 });
      if (startResult === null) {
        console.log('');
        fail(`Failed to start container.

  Try manually:
    ${cyan(`docker start ${CONTAINER_NAME}`)}`);
      }
      console.log(` ${green('done')}`);
    } else {
      process.stdout.write(`  ${yellow('→')} Creating toolkit container (${CONTAINER_NAME})...`);

      // Build docker run command with array arguments for security
      const dockerRunArgs = [
        'docker', 'run', '-d',
        '--name', CONTAINER_NAME
      ];

      // Add network flag for Linux (host networking)
      if (isLinux) {
        dockerRunArgs.push('--network=host');
      }

      dockerRunArgs.push(IMAGE_NAME);

      const runResult = await run(dockerRunArgs, { timeout: 30000 });
      if (runResult === null) {
        console.log('');
        fail(`Failed to create container.

  Try manually:
    ${cyan(`docker run -d --name ${CONTAINER_NAME} ${isLinux ? '--network=host ' : ''}${IMAGE_NAME}`)}`);
      }
      console.log(` ${green('done')}`);
    }
    console.log(`  ${green('✓')} Toolkit container running (${bold(CONTAINER_NAME)})`);
  }

  // --- Step 4: Install prompt to .guardian/ in current directory ---
  const guardianDir = path.join(process.cwd(), '.guardian');
  if (!fs.existsSync(guardianDir)) {
    fs.mkdirSync(guardianDir, { recursive: true });
  }

  let prompt = fs.readFileSync(PROMPT_SRC, 'utf-8');

  // Platform-specific networking hints
  let networkHint;
  if (isLinux) {
    networkHint = '→ Platform: Linux — use `localhost` directly (container uses host network)';
  } else if (isMac) {
    networkHint = '→ Platform: macOS — use `host.docker.internal` instead of `localhost`';
  } else if (isWindows) {
    networkHint = '→ Platform: Windows — use `host.docker.internal` instead of `localhost`';
  } else {
    networkHint = `→ Platform: ${process.platform} — use \`host.docker.internal\` or test networking`;
  }

  if (productionMode) {
    const sourceAvailable = hasProjectFiles();
    const contextBlock = [
      '> **Target:** ' + targetUrl,
      '> **Mode:** production — non-destructive scanning only',
      '> **Networking:** ' + networkHint,
      '> **Source code:** ' + (sourceAvailable
        ? 'available — read code to understand the app, apply fixes locally'
        : 'not available — document recommended fixes only'),
      '',
      '> **IMPORTANT:** Confirm with the user that they have authorization to test this target.',
      '',
    ].join('\n');
    prompt = contextBlock + prompt;
  } else {
    // Add networking hint for dev mode too
    const contextBlock = [
      '> **Networking:** ' + networkHint,
      '',
    ].join('\n');
    prompt = contextBlock + prompt;
  }

  fs.writeFileSync(PROMPT_DEST, prompt);
  console.log(`  ${green('✓')} Prompt installed to ${bold('.guardian/REVIEW.md')}`);

  // --- Step 5: Authorization warning (production only) ---
  if (productionMode) {
    console.log('');
    console.log(`  ${yellow('⚠')}  ${bold('Production mode:')} ${targetUrl}`);
    console.log(`  ${yellow('⚠')}  Ensure you have ${bold('written authorization')} to test this target.`);
    const answer = await ask(`\n  Continue? ${dim('(Y/n)')} `);
    const approved = answer === '' || answer === 'y' || answer === 'yes';
    if (!approved) {
      console.log('');
      console.log(dim('  Aborted.'));
      console.log('');
      process.exit(0);
    }
  }

  // --- Step 6: Print instructions ---
  console.log('');
  if (productionMode) {
    console.log(`  ${bold('Ready!')} Open your AI agent and paste:`);
  } else {
    console.log(`  ${bold('Ready!')} Open your AI agent from your project directory and paste:`);
  }
  console.log('');
  console.log(`    ${cyan(`Read .guardian/REVIEW.md and start the security review`)}`);
  console.log('');
  console.log(dim('  Works with Claude Code, Cursor, Windsurf, Aider, Codex...'));
  console.log('');
}

main();
