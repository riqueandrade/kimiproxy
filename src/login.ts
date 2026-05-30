/*
 * File: login.ts
 * Project: kimiproxy
 * Author: Henrique de Andrade Reynaud
 * Created: 2026-05-09
 * 
 * Last Modified: Sat May 09 2026
 * Modified By: Henrique de Andrade Reynaud
 */

import { initPlaywright, closePlaywright, activePage, BrowserType } from './services/playwright.ts';
import * as dotenv from 'dotenv';
import pc from 'picocolors';
import ora from 'ora';
import figlet from 'figlet';

dotenv.config();

function showBanner() {
  console.log(
    pc.cyan(
      figlet.textSync('KimiProxy', {
        font: 'Standard',
      })
    )
  );
  console.log(pc.yellow(pc.bold(' --- AUTHENTICATION MODE ---\n')));
}

async function main() {
  showBanner();

  // Parse browser type from args or env
  let browserType: BrowserType = 'chromium';
  const browserArg = process.argv.find(arg => arg.startsWith('--browser='));
  if (browserArg) {
    browserType = browserArg.split('=')[1] as BrowserType;
  } else if (process.env.BROWSER) {
    browserType = process.env.BROWSER as BrowserType;
  }

  const spinner = ora({
    text: `Opening ${pc.bold(pc.yellow(browserType))} for manual login...`,
    color: 'magenta'
  }).start();

  try {
    await initPlaywright(false, browserType); // false = not headless
    if (activePage) {
      await activePage.goto('https://www.kimi.com/', { waitUntil: 'domcontentloaded' });
    } else {
      throw new Error('Failed to get active page');
    }
    spinner.succeed(pc.green('Browser opened successfully!'));

    console.log('\n' + pc.bgMagenta(pc.white(pc.bold(' ATTENTION '))) + ' Please follow these steps:');
    console.log(`${pc.cyan('1.')} Login to ${pc.bold('www.kimi.com')} using your account.`);
    console.log(`${pc.cyan('2.')} Once you see the chat interface, ${pc.bold('CLOSE')} the browser window.`);
    console.log(`${pc.cyan('3.')} This session will be saved automatically.\n`);

    console.log(pc.dim('Waiting for browser to be closed or Ctrl+C to abort...'));

  } catch (err: any) {
    spinner.fail(pc.red('Error during login initialization:'));
    console.error(err);
    process.exit(1);
  }

  // Wait indefinitely until user closes the process
  process.on('SIGINT', async () => {
    console.log(pc.yellow('\nClosing browser and saving session...'));
    await closePlaywright();
    console.log(pc.green('Done! You can now run "npm start".'));
    process.exit(0);
  });
}

main();