/**
 * Point Git at .githooks so the pre-commit hook (no .env / dist) runs automatically.
 * Runs on npm install via the "prepare" script.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const hooksDir = path.join(__dirname, '..', '.githooks');
const preCommit = path.join(hooksDir, 'pre-commit');

if (fs.existsSync(preCommit)) {
  try {
    execSync('git config core.hooksPath .githooks', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    console.log('Git hooks installed (.githooks). Commits that add .env or dist/ will be blocked.');
  } catch (_) {
    // Not a git repo or git not available
  }
}
