/*
 * File: app.ts
 * Project: kimiproxy
 * Author: Henrique de Andrade Reynaud
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { bearerAuth } from 'hono/bearer-auth';
import { chatCompletions } from './routes/chat.ts';
import { fetchKimiModels } from './services/kimi.ts';
import { loadConfig } from './utils/config.ts';

const config = loadConfig();

export const app = new Hono();

app.use('*', cors());
app.use('*', logger());

// API Key protection middleware
app.use('/v1/*', async (c, next) => {
  const apiKey = config.API_KEY;
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
