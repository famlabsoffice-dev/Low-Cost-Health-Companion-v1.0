const isTermux =
  Boolean(process.env.TERMUX_VERSION) ||
  process.env.PREFIX?.includes('com.termux');

if (isTermux) {
  process.exit(0);
}

const { execSync } = await import('node:child_process');

execSync('playwright test', {
  stdio: 'inherit',
});
