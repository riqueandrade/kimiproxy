import { loadConfig } from './config.ts';

const translations = {
  en: {
    banner_subtitle: 'OpenAI-Compatible Proxy for Kimi.ai',
    launching: 'Launching {browser}...',
    playwright_init: 'Playwright initialized ({browser}).',
    playwright_fail: 'Failed to initialize proxy:',
    server_status: 'Server Status:',
    running: 'Running',
    local: 'Local:',
    network: 'Network:',
    auth: 'Auth:',
    enabled: 'Enabled',
    disabled: 'Disabled',
    available_routes: 'Available Routes:',
    config_updated: 'Configuration updated successfully!',
    auth_mode: 'AUTHENTICATION MODE',
    opening_browser: 'Opening {browser} for manual login...',
    browser_opened: 'Browser opened successfully!',
    attention: ' ATTENTION ',
    login_steps: 'Please follow these steps:',
    step_1: '1. Login to {url} using your account.',
    step_2: '2. Once you see the chat interface, CLOSE the browser window.',
    step_3: '3. This session will be saved automatically.',
    waiting_close: 'Waiting for browser to be closed or Ctrl+C to abort...',
    closing_save: 'Closing browser and saving session...',
    done_start: 'Done! You can now run "kimiproxy start".',
    repl_welcome: 'Interactive Kimi Chat Mode',
    repl_hint: 'Type your message to chat, or /help for commands.',
    repl_exit: 'Goodbye!',
    cmd_help: 'Show available commands',
    cmd_start: 'Start the proxy server',
    cmd_stop: 'Stop the proxy server',
    cmd_login: 'Login to Kimi.ai',
    cmd_config: 'Configure KimiProxy settings',
    cmd_lang: 'Change language (en, pt-br)',
    cmd_exit: 'Exit interactive mode',
    unknown_cmd: 'Unknown command. Type /help for available commands.',
    thinking: 'Thinking...',
    server_started: 'Server started on port {port}.',
    server_stopped: 'Server stopped.',
    lang_switched: 'Language switched to {lang}.',
    error: 'Error:',
  },
  'pt-br': {
    banner_subtitle: 'Proxy compatível com OpenAI para o Kimi.ai',
    launching: 'Iniciando {browser}...',
    playwright_init: 'Playwright inicializado ({browser}).',
    playwright_fail: 'Falha ao inicializar o proxy:',
    server_status: 'Status do Servidor:',
    running: 'Rodando',
    local: 'Local:',
    network: 'Rede:',
    auth: 'Autenticação:',
    enabled: 'Ativada',
    disabled: 'Desativada',
    available_routes: 'Rotas Disponíveis:',
    config_updated: 'Configuração atualizada com sucesso!',
    auth_mode: 'MODO DE AUTENTICAÇÃO',
    opening_browser: 'Abrindo o {browser} para login manual...',
    browser_opened: 'Navegador aberto com sucesso!',
    attention: ' ATENÇÃO ',
    login_steps: 'Por favor, siga estes passos:',
    step_1: '1. Faça login em {url} usando sua conta.',
    step_2: '2. Assim que vir a interface de chat, FECHE a janela do navegador.',
    step_3: '3. Esta sessão será salva automaticamente.',
    waiting_close: 'Aguardando o fechamento do navegador ou Ctrl+C para abortar...',
    closing_save: 'Fechando o navegador e salvando a sessão...',
    done_start: 'Pronto! Agora você pode rodar "kimiproxy start".',
    repl_welcome: 'Modo de Chat Interativo Kimi',
    repl_hint: 'Digite sua mensagem para conversar, ou /help para comandos.',
    repl_exit: 'Até logo!',
    cmd_help: 'Mostra os comandos disponíveis',
    cmd_start: 'Inicia o servidor proxy',
    cmd_stop: 'Para o servidor proxy',
    cmd_login: 'Fazer login no Kimi.ai',
    cmd_config: 'Configura as opções do KimiProxy',
    cmd_lang: 'Mudar o idioma (en, pt-br)',
    cmd_exit: 'Sair do modo interativo',
    unknown_cmd: 'Comando desconhecido. Digite /help para ver os comandos disponíveis.',
    thinking: 'Pensando...',
    server_started: 'Servidor iniciado na porta {port}.',
    server_stopped: 'Servidor parado.',
    lang_switched: 'Idioma alterado para {lang}.',
    error: 'Erro:',
  }
};

export type TranslationKeys = keyof typeof translations.en;

export function t(key: TranslationKeys, params: Record<string, string | number> = {}): string {
  const config = loadConfig();
  const lang = config.LANGUAGE || 'en';
  const dict = translations[lang] || translations.en;
  let text = (dict as any)[key] || (translations.en as any)[key] || key;

  for (const [param, value] of Object.entries(params)) {
    text = text.replace(`{${param}}`, String(value));
  }

  return text;
}
