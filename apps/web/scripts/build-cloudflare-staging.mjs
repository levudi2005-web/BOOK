import { spawnSync } from 'node:child_process';

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const result = spawnSync(command, ['run', 'build:cloudflare'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_API_URL: 'https://freedombook.duckdns.org/staging-api',
    NEXT_PUBLIC_APP_URL: 'https://bookforfreedom-web-staging.levudi2005.workers.dev',
  },
});

if (result.error) {
  console.error('Cloudflare staging build could not start:', result.error.message);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
