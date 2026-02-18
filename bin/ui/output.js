const { green, red, yellow, bold, dim, cyan, blue } = require('./colors.js');

function printHeader() {
  console.log('');
  console.log(bold(blue('  ╔═══════════════════════════════════════╗')));
  console.log(bold(blue('  ║   ') + bold('Guardian') + blue('                            ║')));
  console.log(bold(blue('  ║   AI-Powered Security Review       ║')));
  console.log(bold(blue('  ╚═══════════════════════════════════════╝')));
  console.log('');
  console.log(dim('  Automated pentesting toolkit for web developers'));
  console.log('');
}

function printSuccess(message) {
  console.log(`  ${green('✓')} ${message}`);
}

function printError(message) {
  console.error(`\n  ${red('✗')} ${message}\n`);
}

function printWarning(message) {
  console.log(`  ${yellow('⚠')}  ${message}`);
}

function printStep(message) {
  console.log(`  ${yellow('→')} ${message}`);
}

function printInfo(message) {
  console.log(`  ${dim(message)}`);
}

function fail(message) {
  printError(message);
  process.exit(1);
}

function printReady(productionMode) {
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

module.exports = {
  printHeader,
  printSuccess,
  printError,
  printWarning,
  printStep,
  printInfo,
  fail,
  printReady
};
