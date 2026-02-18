const fs = require('fs');
const { config } = require('./config.js');
const { getNetworkHint } = require('./platform.js');
const { printSuccess, bold } = require('./ui/output.js');

function installPrompt(productionMode, targetUrl, platform, hasProjectFiles) {
  const guardianDir = config.GUARDIAN_DIR;
  if (!fs.existsSync(guardianDir)) {
    fs.mkdirSync(guardianDir, { recursive: true });
  }

  let prompt = fs.readFileSync(config.PROMPT_SRC, 'utf-8');

  const networkHint = getNetworkHint(platform);

  let contextBlock;
  if (productionMode) {
    const sourceAvailable = hasProjectFiles;
    contextBlock = [
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
  } else {
    contextBlock = [
      '> **Networking:** ' + networkHint,
      '',
    ].join('\n');
  }

  prompt = contextBlock + prompt;
  fs.writeFileSync(config.PROMPT_DEST, prompt);
  printSuccess(`Prompt installed to ${bold('.guardian/REVIEW.md')}`);
}

module.exports = { installPrompt };
