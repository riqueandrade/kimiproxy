import pc from 'picocolors';
import ora from 'ora';
import { initPlaywright, closePlaywright, activePage, BrowserType } from './playwright.ts';
import { loadConfig } from '../utils/config.ts';
import { t } from '../utils/i18n.ts';

export async function runLoginFlow(browserOverride?: BrowserType) {
  const config = loadConfig();
  const browserType = browserOverride || config.BROWSER;

  const spinner = ora({
    text: t('opening_browser', { browser: pc.bold(pc.yellow(browserType)) }),
    color: 'magenta'
  }).start();

  try {
    await initPlaywright(false, browserType); // false = not headless
    if (activePage) {
      await activePage.goto('https://www.kimi.com/', { waitUntil: 'domcontentloaded' });
    } else {
      throw new Error('Failed to get active page');
    }
    spinner.succeed(pc.green(t('browser_opened')));

    console.log('\n' + pc.bgMagenta(pc.white(pc.bold(t('attention')))) + ' ' + t('login_steps'));
    console.log(`${pc.cyan('1.')} ` + t('step_1', { url: pc.bold('www.kimi.com') }));
    console.log(`${pc.cyan('2.')} ` + t('step_2'));
    console.log(`${pc.cyan('3.')} ` + t('step_3') + '\n');
    
    console.log(pc.dim(t('waiting_close')));

    return new Promise<void>((resolve) => {
      process.on('SIGINT', async () => {
        console.log(pc.yellow('\n' + t('closing_save')));
        await closePlaywright();
        console.log(pc.green(t('done_start')));
        resolve();
      });
      
      // Also resolve if browser is closed (handled by Playwright context closure if implemented)
      // For now, SIGINT is the primary way in terminal.
    });

  } catch (err: any) {
    spinner.fail(pc.red(t('error') + ' ' + err.message));
    throw err;
  }
}
