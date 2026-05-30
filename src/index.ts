/*
 * File: index.ts
 * Project: kimiproxy
 * Author: Henrique de Andrade Reynaud
 * Created: 2026-05-09
 * 
 * Last Modified: Sat May 09 2026
 * Modified By: Henrique de Andrade Reynaud
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { bearerAuth } from 'hono/bearer-auth';
import { chatCompletions } from './routes/chat.ts';
import { fetchKimiModels } from './services/kimi.ts';
import * as dotenv from 'dotenv';
import { initPlaywright, BrowserType } from './services/playwright.ts';
import { networkInterfaces } from 'os';
import pc from 'picocolors';
import boxen from 'boxen';
import ora from 'ora';
import figlet from 'figlet';

dotenv.config();

export const app = new Hono();

app.use('*', cors());
app.use('*', logger());

// Helper to get local network IPs
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
        horizontalLayout: 'default',
        verticalLayout: 'default',
      })
    )
  );
  console.log(pc.dim(` v1.0.0 | OpenAI-Compatible Proxy for Kimi.ai\n`));
}

// API Key protection middleware
app.use('/v1/*', async (c, next) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return await next();
  }
  return bearerAuth({ token: apiKey })(c, next);
});

// Basic health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// OpenAI compatible routes
app.post('/v1/chat/completions', chatCompletions);

app.get('/v1/models', async (c) => {
  try {
    const models = await fetchKimiModels();
    return c.json({
      object: 'list',
      data: models
    });
  } catch (err: any) {
    return c.json({ error: { message: err.message } }, 500);
  }
});

// Initialize playwright when server starts
import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
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
    text: `Launching ${pc.bold(pc.yellow(browserType))}...`,
    color: 'cyan'
  }).start();

  initPlaywright(true, browserType).then(() => {
    spinner.succeed(`Playwright initialized (${pc.green(browserType)}).`);
    
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    const networkIP = getNetworkAddress();
    
    const localUrl = `http://localhost:${pc.bold(port)}`;
    const networkUrl = networkIP ? `http://${networkIP}:${pc.bold(port)}` : 'Not available';

    const serverInfo = [
      `${pc.bold('Server Status:')} ${pc.green('Running')}`,
      `${pc.bold('Local:')}         ${pc.cyan(localUrl)}`,
      `${pc.bold('Network:')}       ${pc.cyan(networkUrl)}`,
      `${pc.bold('Auth:')}          ${process.env.API_KEY ? pc.green('Enabled') : pc.yellow('Disabled')}`
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

    serve({
      fetch: app.fetch,
      port
    });
  }).catch((err: any) => {
    spinner.fail(pc.red('Failed to initialize playwright:'));
    console.error(err);
    process.exit(1);
  });
}
