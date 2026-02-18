const path = require('path');
const { yellow } = require('./ui/colors.js');

function isUrl(str) {
  return /^https?:\/\/.+/i.test(str);
}

function getPlatform() {
  return {
    isLinux: process.platform === 'linux',
    isMac: process.platform === 'darwin',
    isWindows: process.platform === 'win32',
    platform: process.platform
  };
}

function getNetworkHint(platform) {
  if (platform.isLinux) {
    return '→ Platform: Linux — use `localhost` directly (container uses host network)';
  } else if (platform.isMac) {
    return '→ Platform: macOS — use `host.docker.internal` instead of `localhost`';
  } else if (platform.isWindows) {
    return '→ Platform: Windows — use `host.docker.internal` instead of `localhost`';
  }
  return `→ Platform: ${platform.platform} — use \`host.docker.internal\` or test networking`;
}

function getNetworkFlag(platform) {
  return platform.isLinux ? '--network=host' : '';
}

function hasProjectFiles(projectMarkers, fs) {
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
  return projectMarkers.some((f) => fs.existsSync(path.join(cwd, f)));
}

function validateWorkingDirectory(fail) {
  const cwd = path.resolve(process.cwd());
  const normalizedCwd = path.normalize(cwd);
  if (cwd !== normalizedCwd) {
    fail('Path contains symbolic links or unusual characters. Please run from a normal directory.');
  }
}

module.exports = {
  isUrl,
  getPlatform,
  getNetworkHint,
  getNetworkFlag,
  hasProjectFiles,
  validateWorkingDirectory
};
