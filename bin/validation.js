/**
 * Security validation utilities for Guardian CLI
 *
 * This module provides validation functions to prevent:
 * - Command Injection via sanitization of user inputs
 * - Path Traversal attacks
 * - SSRF (Server-Side Request Forgery) via URL validation
 */

const path = require('path');

/**
 * Blocklist of private/internal network ranges to prevent SSRF attacks
 * These patterns should NOT be accessible in production mode
 */
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  '169.254.169.254', // AWS metadata endpoint
  'metadata.google.internal', // GCP metadata
];

/**
 * Blocked private CIDR ranges (simplified check)
 */
const BLOCKED_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
];

/**
 * Validates a URL to prevent SSRF attacks
 *
 * @param {string} urlString - The URL string to validate
 * @returns {{valid: boolean, error: string|null}}
 */
function validateUrl(urlString) {
  if (typeof urlString !== 'string') {
    return { valid: false, error: 'URL must be a string' };
  }

  const trimmed = urlString.trim();

  // Basic format check
  if (!trimmed) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  // Must start with http:// or https://
  if (!/^https?:\/\//i.test(trimmed)) {
    return { valid: false, error: 'URL must start with http:// or https://' };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Check hostname against blocklist
  const hostname = parsed.hostname.toLowerCase();

  for (const blocked of BLOCKED_HOSTS) {
    if (hostname === blocked || hostname.endsWith('.' + blocked)) {
      return { valid: false, error: `Access to ${blocked} is not allowed (SSRF protection)` };
    }
  }

  // Check against CIDR-like patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, error: `Access to private IP range ${hostname} is not allowed` };
    }
  }

  // Ensure we have a valid TLD (basic check)
  if (!hostname.includes('.')) {
    return { valid: false, error: 'Invalid hostname' };
  }

  return { valid: true, error: null };
}

/**
 * Validates a file system path to prevent path traversal attacks
 *
 * @param {string} inputPath - The path string to validate
 * @param {string} [basePath] - Optional base path to validate against
 * @returns {{valid: boolean, error: string|null, resolved?: string}}
 */
function validatePath(inputPath, basePath) {
  if (typeof inputPath !== 'string') {
    return { valid: false, error: 'Path must be a string' };
  }

  const trimmed = inputPath.trim();

  if (!trimmed) {
    return { valid: false, error: 'Path cannot be empty' };
  }

  // Block null bytes
  if (trimmed.includes('\0')) {
    return { valid: false, error: 'Null bytes not allowed in path' };
  }

  // Block obvious path traversal attempts
  if (trimmed.includes('..') || trimmed.includes('~')) {
    return { valid: false, error: 'Path traversal characters not allowed' };
  }

  let resolved;

  try {
    if (basePath) {
      resolved = path.resolve(basePath, trimmed);
    } else {
      resolved = path.resolve(trimmed);
    }
  } catch {
    return { valid: false, error: 'Invalid path' };
  }

  // If basePath provided, ensure resolved path is within it
  if (basePath) {
    const normalizedBase = path.normalize(basePath);
    const normalizedResolved = path.normalize(resolved);

    if (!normalizedResolved.startsWith(normalizedBase)) {
      return { valid: false, error: 'Path escapes base directory' };
    }
  }

  return { valid: true, error: null, resolved };
}

/**
 * Validates a Docker container or image name
 *
 * @param {string} name - The name to validate
 * @returns {{valid: boolean, error: string|null}}
 */
function validateDockerName(name) {
  if (typeof name !== 'string') {
    return { valid: false, error: 'Name must be a string' };
  }

  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: 'Name cannot be empty' };
  }

  // Docker name regex (simplified)
  // Matches: [a-zA-Z0-9][a-zA-Z0-9_.-]*
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(trimmed)) {
    return { valid: false, error: 'Invalid Docker name format' };
  }

  // Prevent command injection via shell metacharacters
  const dangerousChars = ['$', '`', ';', '|', '&', '(', ')', '<', '>', '\n', '\r'];
  for (const char of dangerousChars) {
    if (trimmed.includes(char)) {
      return { valid: false, error: `Dangerous character '${char}' not allowed in name` };
    }
  }

  return { valid: true, error: null };
}

module.exports = {
  validateUrl,
  validatePath,
  validateDockerName,
};
