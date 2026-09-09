import { spawnSync } from 'node:child_process';

const runner = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(
  runner,
  ['--yes', 'tsx@4.23.13', 'scripts/validate-species-taxonomy-runtime.ts'],
  { stdio: 'inherit' },
);

if (result.error) {
  throw result.error;
}

process.exit(typeof result.status === 'number' ? result.status : 1);
