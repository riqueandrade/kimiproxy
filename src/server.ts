import { serve } from '@hono/node-server';
import { networkInterfaces } from 'os';
import pc from 'picocolors';
import boxen from 'boxen';
import ora from 'ora';
import { app } from './app.ts';
import { initPlaywright, BrowserType } from './services/playwright.ts';
import { loadConfig } from './utils/config.ts';
import { t } from './utils/i18n.ts';

let serverInstance: any = null;

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

export async function startServer(portOverride?: number, browserOverride?: BrowserType) {
  const config = loadConfig();
  const port = portOverride || config.PORT;
  const browserType = browserOverride || config.BROWSER;

  const spinner = ora({
    text: t('launching', { browser: pc.bold(pc.yellow(browserType)) }),
    color: 'cyan'
  }).start();

  try {
    await initPlaywright(true, browserType);
    spinner.succeed(t('playwright_init', { browser: pc.green(browserType) }));

    const networkIP = getNetworkAddress();
    const localUrl = `http://localhost:${pc.bold(port)}`;
    const networkUrl = networkIP ? `http://${networkIP}:${pc.bold(port)}` : 'Not available';

    const serverInfo = [
      `${pc.bold(t('server_status'))} ${pc.green(t('running'))}`,
      `${pc.bold(t('local'))}         ${pc.cyan(localUrl)}`,
      `${pc.bold(t('network'))}       ${pc.cyan(networkUrl)}`,
      `${pc.bold(t('auth'))}          ${config.API_KEY ? pc.green(t('enabled')) : pc.yellow(t('disabled'))}`
    ].join('\n');

    console.log('\n' + boxen(serverInfo, {
      padding: 1,
      margin: 0,
      borderStyle: 'round',
      borderColor: 'cyan',
      title: 'KimiProxy Info',
      titleAlignment: 'center'
    }));

    console.log(`\n${pc.bold(t('available_routes'))}`);
    app.routes.forEach(route => {
      const methodColor = 
        route.method === 'GET' ? pc.green : 
        route.method === 'POST' ? pc.blue : pc.gray;
      console.log(`${pc.dim('-')} [${methodColor(route.method.padEnd(4))}] ${pc.white(route.path)}`);
    });
    console.log('');

    serverInstance = serve({ fetch: app.fetch, port });
    return serverInstance;

  } catch (err: any) {
    spinner.fail(pc.red(t('playwright_fail')));
    throw err;
  }
}

export function stopServer() {
  if (serverInstance) {
    serverInstance.close();
    serverInstance = null;
    console.log(pc.yellow(t('server_stopped')));
  }
}

export function isServerRunning() {
  return serverInstance !== null;
}
