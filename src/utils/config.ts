import path from 'path';
import os from 'os';
import fs from 'fs';

/**
 * Global Configuration Utility for KimiProxy CLI
 * This handles storage of settings and session data in the user's home directory.
 */

export const APP_DIR = path.join(os.homedir(), '.kimiproxy');
export const CONFIG_FILE = path.join(APP_DIR, 'config.json');
export const PROFILE_DIR = path.join(APP_DIR, 'kimi_profile');

export interface AppConfig {
  PORT: number;
  API_KEY: string;
  BROWSER: 'chromium' | 'firefox' | 'webkit' | 'chrome' | 'edge';
  EXECUTABLE_PATH?: string;
}

const DEFAULT_CONFIG: AppConfig = {
  PORT: 3000,
  API_KEY: 'sk-kimiproxy',
  BROWSER: 'chromium',
};

/**
 * Ensures the application directory exists.
 */
function ensureAppDir() {
  if (!fs.existsSync(APP_DIR)) {
    fs.mkdirSync(APP_DIR, { recursive: true });
  }
}

/**
 * Loads the configuration from the global config file.
 * Falls back to .env or default values if the file doesn't exist.
 */
export function loadConfig(): AppConfig {
  ensureAppDir();

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch (err) {
      console.error('[Config] Failed to read global config, using defaults.');
    }
  }

  // Fallback to current environment variables (from .env)
  return {
    PORT: process.env.PORT ? parseInt(process.env.PORT) : DEFAULT_CONFIG.PORT,
    API_KEY: process.env.API_KEY || DEFAULT_CONFIG.API_KEY,
    BROWSER: (process.env.BROWSER as any) || DEFAULT_CONFIG.BROWSER,
    EXECUTABLE_PATH: process.env.EXECUTABLE_PATH,
  };
}

/**
 * Saves the configuration to the global config file.
 */
export function saveConfig(config: Partial<AppConfig>) {
  ensureAppDir();
  const current = loadConfig();
  const updated = { ...current, ...config };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
  return updated;
}

/**
 * Returns the absolute path for the Playwright profile.
 */
export function getProfilePath(): string {
  ensureAppDir();
  if (!fs.existsSync(PROFILE_DIR)) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
  }
  return PROFILE_DIR;
}
