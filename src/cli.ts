#!/usr/bin/env node
/*
 * File: cli.ts
 * Project: kimiproxy
 * Author: Henrique de Andrade Reynaud
 */

import { Command } from 'commander';
import { serve } from '@hono/node-server';
import { networkInterfaces } from 'os';
import pc from 'picocolors';
import boxen from 'boxen';
import ora from 'ora';
import figlet from 'figlet';
import { app } from './app.ts';
import { initPlaywright, closePlaywright, BrowserType, activePage } from './services/playwright.ts';
import { loadConfig, saveConfig } from './utils/config.ts';

const program = new Command();

function getNetworkAddress() {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

function showBanner() {
  console.log(
    pc.cyan(
      figlet.textSync('KimiProxy', {
        font: 'Standard',
      })
    )
  );
  console.log(pc.dim(` v1.0.0 | OpenAI-Compatible Proxy for Kimi.ai\n`));
}

program
  .name('kimiproxy')
  .description('Kimi.ai API Proxy CLI')
  .version('1.0.0');

// Command: START
program
  .command('start')
  .description('Start the proxy server')
  .option('-p, --port <number>', 'Port to run the server on')
  .option('-b, --browser <type>', 'Browser to use (chromium, firefox, webkit, chrome, edge)')
  .action(async (options) => {
    showBanner();
    const config = loadConfig();
    
    const port = options.port ? parseInt(options.port) : config.PORT;
    const browserType = (options.browser || config.BROWSER) as BrowserType;

    const spinner = ora({
      text: `Launching ${pc.bold(pc.yellow(browserType))}...`,
      color: 'cyan'
    }).start();

    try {
      await initPlaywright(true, browserType);
      spinner.succeed(`Playwright initialized (${pc.green(browserType)}).`);

      const networkIP = getNetworkAddress();
      const localUrl = `http://localhost:${pc.bold(port)}`;
      const networkUrl = networkIP ? `http://${networkIP}:${pc.bold(port)}` : 'Not available';

      const serverInfo = [
        `${pc.bold('Server Status:')} ${pc.green('Running')}`,
        `${pc.bold('Local:')}         ${pc.cyan(localUrl)}`,
        `${pc.bold('Network:')}       ${pc.cyan(networkUrl)}`,
        `${pc.bold('Auth:')}          ${config.API_KEY ? pc.green('Enabled') : pc.yellow('Disabled')}`
      ].join('\n');

      console.log('\n' + boxen(serverInfo, {
        padding: 1,
        margin: 0,
        borderStyle: 'round',
        borderColor: 'cyan',
        title: 'KimiProxy Info',
        titleAlignment: 'center'
      }));

      console.log(`\n${pc.bold('Available Routes:')}`);
      app.routes.forEach(route => {
        const methodColor = 
          route.method === 'GET' ? pc.green : 
          route.method === 'POST' ? pc.blue : pc.gray;
        console.log(`${pc.dim('-')} [${methodColor(route.method.padEnd(4))}] ${pc.white(route.path)}`);
      });
      console.log('');

      serve({ fetch: app.fetch, port });

    } catch (err: any) {
      spinner.fail(pc.red('Failed to initialize proxy:'));
      console.error(err);
      process.exit(1);
    }
  });

// Command: LOGIN
program
  .command('login')
  .description('Interactive login to Kimi.ai')
  .option('-b, --browser <type>', 'Browser to use for login')
  .action(async (options) => {
    showBanner();
    console.log(pc.yellow(pc.bold(' --- AUTHENTICATION MODE ---\n')));
    
    const config = loadConfig();
    const browserType = (options.browser || config.BROWSER) as BrowserType;

    const spinner = ora({
      text: `Opening ${pc.bold(pc.yellow(browserType))} for manual login...`,
      color: 'magenta'
    }).start();

    try {
      await initPlaywright(false, browserType);
      if (activePage) {
        await activePage.goto('https://www.kimi.com/', { waitUntil: 'domcontentloaded' });
      }
      spinner.succeed(pc.green('Browser opened successfully!'));

      console.log('\n' + pc.bgMagenta(pc.white(pc.bold(' ATTENTION '))) + ' Please follow these steps:');
      console.log(`${pc.cyan('1.')} Login to ${pc.bold('www.kimi.com')} using your account.`);
      console.log(`${pc.cyan('2.')} Once you see the chat interface, ${pc.bold('CLOSE')} the browser window.`);
      console.log(`${pc.cyan('3.')} This session will be saved automatically.\n`);
      
      console.log(pc.dim('Waiting for browser to be closed or Ctrl+C to abort...'));

      process.on('SIGINT', async () => {
        console.log(pc.yellow('\nClosing browser and saving session...'));
        await closePlaywright();
        console.log(pc.green('Done! You can now run "kimiproxy start".'));
        process.exit(0);
      });

    } catch (err: any) {
      spinner.fail(pc.red('Error during login initialization:'));
      console.error(err);
      process.exit(1);
    }
  });

// Command: CONFIG
program
  .command('config')
  .description('Configure KimiProxy settings')
  .option('--api-key <key>', 'Set the API Key for the proxy')
  .option('--port <number>', 'Set default port')
  .option('--browser <type>', 'Set default browser')
  .option('--executable-path <path>', 'Set browser executable path')
  .action((options) => {
    const updated = saveConfig({
      API_KEY: options.apiKey,
      PORT: options.port ? parseInt(options.port) : undefined,
      BROWSER: options.browser,
      EXECUTABLE_PATH: options.executablePath
    });
    console.log(pc.green('Configuration updated successfully!'));
    console.log(pc.cyan(JSON.stringify(updated, null, 2)));
  });

program.parse(process.argv);
