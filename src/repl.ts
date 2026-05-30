import * as readline from 'node:readline';
import pc from 'picocolors';
import figlet from 'figlet';
import prompts from 'prompts';
import { app } from './app.ts';
import { startServer, stopServer, isServerRunning } from './server.ts';
import { runLoginFlow } from './services/auth.ts';
import { loadConfig, saveConfig } from './utils/config.ts';
import { t } from './utils/i18n.ts';
import { initPlaywright } from './services/playwright.ts';

const cliCommands = [
  { title: `🚀 ${t('cmd_start')}`, value: '/start' },
  { title: `🛑 ${t('cmd_stop')}`, value: '/stop' },
  { title: `🔑 ${t('cmd_login')}`, value: '/login' },
  { title: `🌐 ${t('cmd_lang')}`, value: '/lang' },
  { title: `❓ ${t('cmd_help')}`, value: '/help' },
  { title: `❌ ${t('cmd_exit')}`, value: '/exit' },
];

async function showCommandMenu() {
  try {
    const response = await prompts({
      type: 'select',
      name: 'command',
      message: t('repl_hint'),
      choices: cliCommands,
      initial: 0
    });
    return response.command;
  } catch (e) {
    return null;
  }
}

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

export async function startRepl() {
  showBanner();
  console.log(pc.green(pc.bold(`>>> ${t('repl_welcome')}`)));
  console.log(pc.dim(`${t('repl_hint')} (Aperte '/' para menu de comandos)\n`));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: pc.magenta(pc.bold('Kimi > ')),
  });

  rl.prompt();

  // Enable real-time keypress events
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  let isMenuOpen = false;

  process.stdin.on('keypress', async (char, key) => {
    // If user types '/' and menu isn't open, open it
    if (char === '/' && rl.line === '' && !isMenuOpen) {
      isMenuOpen = true;
      
      // Forcefully clean and stop readline to avoid interference
      process.stdout.write('\r');
      readline.clearLine(process.stdout, 0);
      
      const command = await showCommandMenu();
      
      isMenuOpen = false;
      
      if (command) {
        if (command === '/lang') {
            const { lang } = await prompts({
                type: 'select',
                name: 'lang',
                message: 'Select language:',
                choices: [
                    { title: 'English', value: 'en' },
                    { title: 'Português', value: 'pt-br' }
                ]
            });
            await handleCommand(`/lang ${lang}`, rl);
        } else {
            await handleCommand(command, rl);
        }
      }
      
      // Resume readline
      rl.prompt(true);
      return;
    }
    
    // Handle Ctrl+C manually in raw mode
    if (key && key.ctrl && key.name === 'c') {
      console.log('\n' + pc.yellow(t('repl_exit')));
      process.exit(0);
    }
  });

  rl.on('line', async (line) => {
    const input = line.trim();

    if (input === '/') {
        await handleCommand('/', rl);
    } else if (input.startsWith('/')) {
        await handleCommand(input, rl);
    } else if (input) {
        await handleChat(input, rl);
    }

    rl.prompt();
  });

  rl.on('SIGINT', () => {
    console.log('\n' + pc.yellow(t('repl_exit')));
    process.exit(0);
  });
}

async function handleCommand(input: string, rl: any) {
  const [cmd, ...args] = input.split(' ');

  switch (cmd) {
    case '/':
      const command = await showCommandMenu();
      if (command) await handleCommand(command, rl);
      break;

    case '/help':
      console.log(`\n${pc.bold('Available Commands:')}`);
      console.log(`${pc.cyan('/start [port]')} - ${t('cmd_start')}`);
      console.log(`${pc.cyan('/stop')}         - ${t('cmd_stop')}`);
      console.log(`${pc.cyan('/login')}        - ${t('cmd_login')}`);
      console.log(`${pc.cyan('/lang [en|pt]')} - ${t('cmd_lang')}`);
      console.log(`${pc.cyan('/help')}         - ${t('cmd_help')}`);
      console.log(`${pc.cyan('/exit')}         - ${t('cmd_exit')}\n`);
      break;

    case '/start':
      if (isServerRunning()) {
        console.log(pc.yellow('Server is already running.'));
      } else {
        const port = args[0] ? parseInt(args[0]) : undefined;
        await startServer(port);
      }
      break;

    case '/stop':
      stopServer();
      break;

    case '/login':
      await runLoginFlow();
      break;

    case '/lang':
      const newLang = args[0] === 'pt' || args[0] === 'pt-br' ? 'pt-br' : 'en';
      saveConfig({ LANGUAGE: newLang });
      console.log(pc.green(t('lang_switched', { lang: newLang })));
      break;

    case '/exit':
    case '/quit':
      console.log(pc.yellow(t('repl_exit')));
      process.exit(0);
      break;

    default:
      console.log(pc.red(t('unknown_cmd')));
  }
}

async function handleChat(message: string, rl: any) {
  const config = loadConfig();
  
  process.stdout.write(`\n${pc.cyan(pc.bold(t('thinking')))}\n`);

  try {
    // Ensure playwright is ready for the chat interaction
    await initPlaywright(true);

    const payload = {
      model: 'k2d6-thinking',
      messages: [{ role: 'user', content: message }],
      stream: true
    };

    const req = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const res = await app.fetch(req);
    
    if (!res.ok) {
      const err = await res.json();
      console.log(pc.red(`${t('error')} ${err.error?.message || res.statusText}`));
      return;
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    
    process.stdout.write(`${pc.green(pc.bold('AI > '))}`);

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            const delta = data.choices[0]?.delta;
            if (!delta) continue;
            
            if (delta.reasoning_content) {
              process.stdout.write(pc.dim(delta.reasoning_content));
            }
            if (delta.content) {
              process.stdout.write(delta.content);
            }
          } catch (e) {}
        }
      }
    }
    console.log('\n');

  } catch (err: any) {
    console.log(pc.red(`\n${t('error')} ${err.message}`));
  }
}
