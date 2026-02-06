#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// --- Config ---
const IMAGE_NAME = 'guardian-tools';
// Unique container name per project to avoid conflicts
const projectSlug = path.basename(process.cwd())
  .replace(/[^a-z0-9]/gi, '-')
  .toLowerCase()
  .slice(0, 20);
const CONTAINER_NAME = `guardian-${projectSlug}`;
const PROMPT_SRC = path.join(__dirname, '..', 'prompt', 'REVIEW.md');
const PROMPT_DEST = path.join(process.cwd(), '.guardian', 'REVIEW.md');
// Dockerfile is copied to bin/ directory for reliable Windows compatibility
const DOCKERFILE = path.join(__dirname, 'Dockerfile');

// --- Colors ---
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const blue = (s) => `\x1b[34m${s}\x1b[0m`;

function run(cmd, { silent = false, timeout = 60000 } = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', timeout }).trim();
  } catch (error) {
    if (!silent) {
      // Only show debug for unexpected failures
      if (error.status !== null) {
        console.error(dim(`  [debug] Command exited with code ${error.status}`));
      }
    }
    return null;
  }
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

  const targetUrl = process.argv[2] && isUrl(process.argv[2]) ? process.argv[2] : null;
  const productionMode = !!targetUrl;

  console.log('');
  console.log(bold(blue('  ╔═══════════════════════════════════════╗')));
  console.log(bold(blue('  ║   ') + bold('Guardian') + blue('                            ║')));
  console.log(bold(blue('  ║   AI-Powered Security Review       ║')));
  console.log(bold(blue('  ╚═══════════════════════════════════════╝')));
  console.log('');
  console.log(dim('  Automated pentesting toolkit for web developers'));
  console.log('');

  // --- Step 1: Check Docker ---
  if (run('docker info', { silent: true }) === null) {
    fail(`Docker is not running.

  Start Docker Desktop (or the Docker daemon) and try again.

  Install Docker: ${cyan('https://docs.docker.com/get-docker/')}`);
  }
  console.log(`  ${green('✓')} Docker is running`);

  // --- Step 2: Build image if missing ---
  const imageExists = run(`docker images -q ${IMAGE_NAME}`);

  if (!imageExists) {
    console.log('');
    console.log(`  ${yellow('◆')} The security toolkit needs to be installed (~800 MB Docker image).`);
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
    try {
      execSync(
        `docker build -t ${IMAGE_NAME} -f "${DOCKERFILE}" "${path.dirname(DOCKERFILE)}"`,
        { stdio: 'inherit', timeout: 600000 } // 10 minutes
      );
    } catch {
      fail(`Failed to build the security toolkit image.

  Try manually:
    ${cyan(`docker build -t ${IMAGE_NAME} -f "${DOCKERFILE}" "${path.dirname(DOCKERFILE)}"`)}`);
    }
    console.log('');
    console.log(`  ${green('✓')} Security toolkit installed`);
  } else {
    console.log(`  ${green('✓')} Security toolkit ready`);
  }

  // --- Step 3: Start container if not running ---
  const containerRunning = run(
    `docker ps --filter "name=^${CONTAINER_NAME}$" --format "{{.Names}}"`
  );

  if (containerRunning === CONTAINER_NAME) {
    console.log(`  ${green('✓')} Toolkit container running (${bold(CONTAINER_NAME)})`);
  } else {
    const containerExists = run(
      `docker ps -a --filter "name=^${CONTAINER_NAME}$" --format "{{.Names}}"`
    );

    if (containerExists === CONTAINER_NAME) {
      process.stdout.write(`  ${yellow('→')} Starting toolkit container...`);
      if (run(`docker start ${CONTAINER_NAME}`, { timeout: 30000 }) === null) {
        console.log('');
        fail(`Failed to start container.

  Try manually:
    ${cyan(`docker start ${CONTAINER_NAME}`)}`);
      }
      console.log(` ${green('done')}`);
    } else {
      const networkFlag = isLinux ? '--network=host' : '';

      process.stdout.write(`  ${yellow('→')} Creating toolkit container (${CONTAINER_NAME})...`);
      const runCmd = `docker run -d --name ${CONTAINER_NAME} ${networkFlag} ${IMAGE_NAME}`.replace(/\s+/g, ' ');
      if (run(runCmd, { timeout: 30000 }) === null) {
        console.log('');
        fail(`Failed to create container.

  Try manually:
    ${cyan(runCmd)}`);
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
