/*
 * File: playwright.ts
 * Project: kimiproxy
 * Author: Henrique de Andrade Reynaud
 * Created: 2026-05-09
 * 
 * Last Modified: Sat May 09 2026
 * Modified By: Henrique de Andrade Reynaud
 */

import { chromium, firefox, webkit, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { getProfilePath, loadConfig, saveConfig } from '../utils/config.ts';
import pc from 'picocolors';

export type BrowserType = 'chromium' | 'firefox' | 'webkit' | 'chrome' | 'edge';

/**
 * Common paths for browsers on different operating systems
 */
const BROWSER_PATHS: Record<string, string[]> = {
  win32: [
    // Brave
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    path.join(os.homedir(), 'AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
    // Chrome
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
    // Edge
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
  darwin: [
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  linux: [
    '/usr/bin/brave-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/microsoft-edge',
    '/usr/bin/chromium-browser',
  ]
};

/**
 * Automatically finds an installed browser on the system.
 */
export function discoverBrowser(): { path: string, type: BrowserType } | null {
  const platform = os.platform();
  const paths = BROWSER_PATHS[platform] || [];

  for (const exePath of paths) {
    if (fs.existsSync(exePath)) {
      let type: BrowserType = 'chrome';
      if (exePath.toLowerCase().includes('brave')) type = 'chrome'; // Playwright uses chrome channel for Brave
      if (exePath.toLowerCase().includes('edge') || exePath.toLowerCase().includes('msedge')) type = 'edge';
      
      return { path: exePath, type };
    }
  }

  return null;
}

let context: BrowserContext | null = null;
export let activePage: Page | null = null;
let currentHeaders: Record<string, string> = {};
let cachedKimiHeaders: { headers: Record<string, string>, chatSessionId: string, parentMessageId: string | null } | null = null;
let lastHeadersTime = 0;
const HEADERS_TTL = 10 * 60 * 1000; // 10 minutes

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class Mutex {
  private queue: (() => void)[] = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return () => this.release();
    }
    return new Promise<() => void>(resolve => {
      this.queue.push(() => {
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}

// Lock to prevent concurrent UI interactions
const uiMutex = new Mutex();

export async function getCookies(): Promise<string> {
  if (process.env.TEST_MOCK_PLAYWRIGHT) return 'token=mock';
  if (!activePage) return '';
  const cookies = await activePage.context().cookies();
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

export async function getBasicHeaders(): Promise<{ cookie: string, userAgent: string, authorization: string }> {
  if (process.env.TEST_MOCK_PLAYWRIGHT) return { cookie: 'token=mock', userAgent: 'mock', authorization: 'Bearer MOCK' };
  if (!activePage) throw new Error('Playwright not initialized');
  
  const cookie = await getCookies();
  const userAgent = await activePage.evaluate(() => navigator.userAgent);
  const authorization = currentHeaders['authorization'] || '';
  
  return { cookie, userAgent, authorization };
}

export async function initPlaywright(headless = true, browserType?: BrowserType) {
  if (process.env.TEST_MOCK_PLAYWRIGHT) return;
  if (context) {
    return;
  }

  const config = loadConfig();
  let selectedBrowser = browserType || config.BROWSER || 'chromium';
  let executablePath = config.EXECUTABLE_PATH;
  const profilePath = getProfilePath();
  
  // Auto-discovery logic for better UX
  if (selectedBrowser === 'chromium' && !executablePath) {
    const discovery = discoverBrowser();
    if (discovery) {
      console.log(`[Playwright] Auto-discovered browser: ${discovery.path}`);
      executablePath = discovery.path;
      selectedBrowser = discovery.type;

      // Save discovered settings to global config for next time
      saveConfig({
        BROWSER: selectedBrowser,
        EXECUTABLE_PATH: executablePath
      });
    }
  }

  let browserEngine;
  let channel: string | undefined;

  switch (selectedBrowser) {
    case 'firefox':
      browserEngine = firefox;
      break;
    case 'webkit':
      browserEngine = webkit;
      break;
    case 'chrome':
      browserEngine = chromium;
      channel = 'chrome';
      break;
    case 'edge':
      browserEngine = chromium;
      channel = 'msedge';
      break;
    case 'chromium':
    default:
      browserEngine = chromium;
      break;
  }

  console.log(`[Playwright] Launching ${selectedBrowser}...`);

  const args: string[] = [];
  const ignoreDefaultArgs: string[] = [];

  if (selectedBrowser === 'chromium' || selectedBrowser === 'chrome' || selectedBrowser === 'edge') {
    args.push('--disable-blink-features=AutomationControlled');
    ignoreDefaultArgs.push('--enable-automation');
  }

  try {
    context = await browserEngine.launchPersistentContext(profilePath, {
      headless,
      channel,
      executablePath,
      args,
      ignoreDefaultArgs,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    });
  } catch (err: any) {
    if (err.message.includes('Executable doesn\'t exist') && !executablePath) {
      console.log(pc.yellow('\n[Playwright] Default browser not found. Attempting emergency discovery...'));
      const emergency = discoverBrowser();
      if (emergency) {
        console.log(pc.green(`[Playwright] Found ${emergency.path}! Recovering...`));
        return initPlaywright(headless, emergency.type);
      }
    }
    throw err;
  }

  // Hide webdriver property from navigator
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });

  // Keep an active page to fetch headers on demand
  activePage = await context.newPage();
}

export async function closePlaywright() {
  if (process.env.TEST_MOCK_PLAYWRIGHT) return;
  if (context) {
    await context.close();
    context = null;
    activePage = null;
  }
}

/**
 * Ensures the session is valid and extracts Kimi headers and session ID.
 */
export async function getKimiHeaders(forceNew = false): Promise<{ headers: Record<string, string>, chatSessionId: string, parentMessageId: string | null }> {
  // Use a lock to ensure only one request uses the UI at a time
  const release = await uiMutex.acquire();

  try {
    return await _getKimiHeadersInternal(forceNew);
  } finally {
    release();
  }
}

async function _getKimiHeadersInternal(forceNew = false): Promise<{ headers: Record<string, string>, chatSessionId: string, parentMessageId: string | null }> {
  if (process.env.TEST_MOCK_PLAYWRIGHT) {
    const mockSessionId = process.env.TEST_SESSION_ID || 'mock-session';
    return { 
      headers: { 
        'authorization': 'Bearer MOCK', 
        'cookie': 'token=mock', 
        'user-agent': 'mock',
        'x-msh-device-id': 'mock-device',
        'x-msh-session-id': 'mock-session-header',
        'x-traffic-id': 'mock-traffic'
      }, 
      chatSessionId: mockSessionId, 
      parentMessageId: null 
    };
  }

  if (!forceNew && cachedKimiHeaders && (Date.now() - lastHeadersTime < HEADERS_TTL)) {
    return cachedKimiHeaders;
  }

  if (!activePage) {
    throw new Error('Playwright not initialized');
  }

  const currentUrl = activePage.url();
  const isOnKimi = currentUrl.includes('kimi.com');

  if (!isOnKimi || forceNew) {
    console.log(`[Playwright] Navigating to Kimi home... (Current: ${currentUrl})`);
    await activePage.goto('https://www.kimi.com/', { waitUntil: 'networkidle' });
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.error('[Playwright] Timeout waiting for Kimi headers. Current URL:', activePage!.url());
      reject(new Error('Timeout waiting for Kimi headers'));
    }, 60000);

    console.log('[Playwright] Capturing headers from background traffic...');
    const routeHandler = async (route: any, request: any) => {
      const reqHeaders = request.headers();
      const url = request.url();
      
      // CRITICAL FILTER: Only capture from real API calls, ignore telemetry/analytics
      const isApiCall = url.includes('/apiv2/') && !url.includes('telemetry') && !url.includes('log');
      const hasAuth = !!reqHeaders['authorization'] && reqHeaders['authorization'].length > 20;
      const hasSession = !!reqHeaders['x-msh-session-id'];

      if (isApiCall && hasAuth && hasSession) {
        clearTimeout(timeout);

        let uiSessionId = '';
        let uiParentMessageId: string | null = null;

        // Try to extract session info if this is a Chat request
        if (url.includes('/Chat')) {
            const postData = request.postData();
            if (postData) {
                try {
                    const jsonStart = postData.indexOf('{');
                    if (jsonStart !== -1) {
                        const payload = JSON.parse(postData.slice(jsonStart));
                        if (payload.chat_id) uiSessionId = payload.chat_id;
                        if (payload.message?.parent_id) uiParentMessageId = payload.message.parent_id;
                    }
                } catch (e) {}
            }
        }

        const extractedHeaders = {
          'cookie': reqHeaders['cookie'] || '',
          'authorization': reqHeaders['authorization'] || '',
          'connect-protocol-version': reqHeaders['connect-protocol-version'] || '1',
          'x-msh-device-id': reqHeaders['x-msh-device-id'] || '',
          'x-msh-platform': reqHeaders['x-msh-platform'] || 'web',
          'x-msh-session-id': reqHeaders['x-msh-session-id'] || '',
          'x-msh-version': reqHeaders['x-msh-version'] || '1.0.0',
          'x-traffic-id': reqHeaders['x-traffic-id'] || '',
          'r-timezone': reqHeaders['r-timezone'] || 'America/Maceio',
          'user-agent': reqHeaders['user-agent'] || '',
          'origin': 'https://www.kimi.com',
          'referer': 'https://www.kimi.com/'
        };

        console.log(`[Playwright] Captured valid headers from: ${url.split('/').pop()}`);
        currentHeaders = extractedHeaders;
        cachedKimiHeaders = { headers: extractedHeaders, chatSessionId: uiSessionId, parentMessageId: uiParentMessageId };
        lastHeadersTime = Date.now();

        await activePage!.unroute('**/apiv2/**', routeHandler).catch(() => {});
        await route.continue().catch(() => {});
        resolve(cachedKimiHeaders);
      } else {
        await route.continue().catch(() => {});
      }
    };

    activePage!.route('**/apiv2/**', routeHandler).then(async () => {
      // If we don't have headers yet, refresh or navigate to trigger traffic
      await activePage!.reload({ waitUntil: 'domcontentloaded' });
    });
  });
}
