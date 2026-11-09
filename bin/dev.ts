import { execSync, spawn } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as p from '@clack/prompts';
import chalk from 'chalk';

const ROOT_DIR = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ENV_FILE = resolve(ROOT_DIR, 'apps/medusa/.env');
const ENV_TEMPLATE = resolve(ROOT_DIR, 'apps/medusa/.env.template');

const ensureEnvFile = (): void => {
  if (existsSync(ENV_FILE)) {
    return;
  }
  if (existsSync(ENV_TEMPLATE)) {
    copyFileSync(ENV_TEMPLATE, ENV_FILE);
  }
};

const waitForCommand = async (cmd: string, maxAttempts = 60, intervalMs = 1000): Promise<boolean> => {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      execSync(cmd, { cwd: ROOT_DIR, stdio: 'ignore' });
      return true;
    } catch {
      attempts += 1;
      await new Promise((res) => setTimeout(res, intervalMs));
    }
  }
  return false;
};

const run = async (): Promise<void> => {
  console.clear();
  p.intro(chalk.bgCyan.black(' ship-medusa-os '));

  ensureEnvFile();

  const spinner = p.spinner();

  spinner.start('Starting infrastructure containers (PostgreSQL, Redis)...');
  try {
    execSync('docker compose up -d postgres redis', { cwd: ROOT_DIR, stdio: 'ignore' });
  } catch {
    try {
      execSync('docker compose down', { cwd: ROOT_DIR, stdio: 'ignore' });
      execSync('docker compose up -d postgres redis', { cwd: ROOT_DIR, stdio: 'ignore' });
    } catch {
      spinner.stop(chalk.red('Failed to start Docker containers'));
      p.cancel('Please make sure Docker is running.');
      process.exit(1);
    }
  }

  spinner.message('Waiting for PostgreSQL to be healthy...');
  const isPostgresReady = await waitForCommand(
    'docker compose exec -T postgres pg_isready -U postgres -d medusa-store',
  );
  if (!isPostgresReady) {
    spinner.stop(chalk.red('PostgreSQL did not become healthy in time'));
    process.exit(1);
  }

  spinner.message('Waiting for Redis to be healthy...');
  const isRedisReady = await waitForCommand('docker compose exec -T redis redis-cli ping');
  if (!isRedisReady) {
    spinner.stop(chalk.red('Redis did not become healthy in time'));
    process.exit(1);
  }

  spinner.stop(chalk.green('PostgreSQL and Redis are healthy'));

  spinner.start('Applying database migrations...');
  try {
    execSync('pnpm --filter medusa migrate', { cwd: ROOT_DIR, stdio: 'pipe' });
    spinner.stop(chalk.green('Database migrations up to date'));
  } catch {
    spinner.stop(chalk.red('Database migrations failed'));
    process.exit(1);
  }

  p.note(
    `${chalk.bold('Medusa API:')}   ${chalk.cyan('http://localhost:9000')}\n${chalk.bold('Medusa Admin:')} ${chalk.cyan('http://localhost:9000/app')}`,
    'Available Endpoints',
  );

  p.outro(chalk.bold('Starting development servers via Turborepo...'));

  let isCleaningUp = false;

  const turbo = spawn('pnpm', ['turbo', 'run', 'dev'], {
    cwd: ROOT_DIR,
    stdio: ['inherit', 'inherit', 'pipe'],
    env: process.env,
  });

  turbo.stderr?.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    if (isCleaningUp && text.includes('run failed')) {
      return;
    }
    process.stderr.write(chunk);
  });

  const cleanup = async (): Promise<void> => {
    if (isCleaningUp) {
      return;
    }
    isCleaningUp = true;
    p.outro(chalk.yellow('Gracefully shutting down services...'));
    turbo.kill('SIGINT');
    await new Promise<void>((resolveClose) => {
      turbo.once('close', () => resolveClose());
    });
    try {
      execSync('docker compose down', { cwd: ROOT_DIR, stdio: 'ignore' });
    } catch {
      // Ignore errors on teardown
    }
    p.outro(chalk.green('All development servers and infrastructure stopped cleanly.'));
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void cleanup();
  });
  process.once('SIGTERM', () => {
    void cleanup();
  });
};

run();
