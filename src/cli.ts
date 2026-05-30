#!/usr/bin/env node
/*
 * File: cli.ts
 * Project: kimiproxy
 * Author: Henrique de Andrade Reynaud
 */

import { Command } from 'commander';
import pc from 'picocolors';
import figlet from 'figlet';
import { startServer } from './server.ts';
import { runLoginFlow } from './services/auth.ts';
import { startRepl } from './repl.ts';
import { loadConfig, saveConfig } from './utils/config.ts';
import { t } from './utils/i18n.ts';

const program = new Command();

function showBanner() {
  console.log(
    pc.cyan(
      figlet.textSync('KimiProxy', {
        font: 'Standard',
      })
    )
  );
  console.log(pc.dim(` ${t('banner_subtitle')}\n`));
}

program
  .name('kimiproxy')
  .description('Kimi.ai API Proxy CLI')
  .version('1.0.0');

// Command: START
program
  .command('start')
  .description(t('cmd_start'))
  .option('-p, --port <number>', 'Port to run the server on')
  .option('-b, --browser <type>', 'Browser to use')
  .action(async (options) => {
    showBanner();
    await startServer(
      options.port ? parseInt(options.port) : undefined,
      options.browser
    );
  });

// Command: LOGIN
program
  .command('login')
  .description(t('cmd_login'))
  .option('-b, --browser <type>', 'Browser to use for login')
  .action(async (options) => {
    showBanner();
    await runLoginFlow(options.browser);
  });

// Command: CONFIG
program
  .command('config')
  .description(t('cmd_config'))
  .option('--api-key <key>', 'Set the API Key for the proxy')
  .option('--port <number>', 'Set default port')
  .option('--browser <type>', 'Set default browser')
  .option('--executable-path <path>', 'Set browser executable path')
  .option('--lang <type>', 'Set language (en, pt-br)')
  .action((options) => {
    const updated = saveConfig({
      API_KEY: options.apiKey,
      PORT: options.port ? parseInt(options.port) : undefined,
      BROWSER: options.browser,
      EXECUTABLE_PATH: options.executablePath,
      LANGUAGE: options.lang
    });
    console.log(pc.green(t('config_updated')));
    console.log(pc.cyan(JSON.stringify(updated, null, 2)));
  });

// If no arguments, start interactive REPL
if (process.argv.length <= 2) {
  startRepl();
} else {
  program.parse(process.argv);
}
