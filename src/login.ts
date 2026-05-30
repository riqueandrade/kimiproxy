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

dotenv.config();

async function main() {
  // Parse browser type from args or env
  let browserType: BrowserType = 'chromium';
  const browserArg = process.argv.find(arg => arg.startsWith('--browser='));
  if (browserArg) {
    browserType = browserArg.split('=')[1] as BrowserType;
  } else if (process.env.BROWSER) {
    browserType = process.env.BROWSER as BrowserType;
  }

  console.log(`Opening ${browserType} to allow manual login on Kimi...`);
  await initPlaywright(false, browserType); // false = not headless
  if (activePage) {
    await activePage.goto('https://www.kimi.com/', { waitUntil: 'domcontentloaded' });
  } else {
    console.error('Failed to get active page');
    process.exit(1);
  }
  console.log('Browser opened. Please login to www.kimi.com.');
  console.log('Once you are fully logged in and can see the chat interface, close the browser window or press Ctrl+C here.');
  
  // Wait indefinitely until user closes the process
  process.on('SIGINT', async () => {
    console.log('Closing browser...');
    await closePlaywright();
    process.exit(0);
  });
}

main();