import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distServerPath = path.join(__dirname, 'dist', 'server.cjs');

if (!fs.existsSync(distServerPath)) {
  console.log('[Hostinger Startup] dist/server.cjs not found. Triggering build...');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
  } catch (err) {
    console.error('[Hostinger Startup] Build failed:', err);
  }
}

if (fs.existsSync(distServerPath)) {
  await import('./dist/server.cjs');
} else {
  console.error(`[Hostinger Startup Error] dist/server.cjs not found at ${distServerPath}.`);
  process.exit(1);
}
