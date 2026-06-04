import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { handleChatRequest, resetSupabaseServerClient } from './api/chat';
import { handleStagingRequest } from './api/staging';
import { handleUsageRequest } from './api/usage';

function readAuthorizationHeader(req: IncomingMessage): string | undefined {
  const raw = req.headers.authorization;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim();
  }
  if (Array.isArray(raw)) {
    const first = raw.find((value) => typeof value === 'string' && value.trim());
    return first?.trim();
  }
  return undefined;
}

async function withServerEnv<T>(
  server: ViteDevServer,
  run: () => Promise<T>,
): Promise<T> {
  const env = loadEnv(server.config.mode, server.config.root, '');
  const apiKey = process.env.OPENAI_API_KEY?.trim() || env.OPENAI_API_KEY?.trim();

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    env.SUPABASE_URL?.trim() ||
    env.VITE_SUPABASE_URL?.trim();
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY?.trim() ||
    env.SUPABASE_ANON_KEY?.trim() ||
    env.VITE_SUPABASE_ANON_KEY?.trim();
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const previousOpenAiKey = process.env.OPENAI_API_KEY;
  const previousSupabaseUrl = process.env.SUPABASE_URL;
  const previousViteSupabaseUrl = process.env.VITE_SUPABASE_URL;
  const previousSupabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const previousViteSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const previousSupabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (apiKey) {
    process.env.OPENAI_API_KEY = apiKey;
  }

  if (supabaseUrl) {
    process.env.SUPABASE_URL = supabaseUrl;
    process.env.VITE_SUPABASE_URL = supabaseUrl;
  }

  if (supabaseAnonKey) {
    process.env.SUPABASE_ANON_KEY = supabaseAnonKey;
    process.env.VITE_SUPABASE_ANON_KEY = supabaseAnonKey;
  }

  if (supabaseServiceRoleKey) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseServiceRoleKey;
  }

  resetSupabaseServerClient();

  try {
    return await run();
  } finally {
    if (previousOpenAiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previousOpenAiKey;
    }

    if (previousSupabaseUrl === undefined) {
      delete process.env.SUPABASE_URL;
    } else {
      process.env.SUPABASE_URL = previousSupabaseUrl;
    }

    if (previousViteSupabaseUrl === undefined) {
      delete process.env.VITE_SUPABASE_URL;
    } else {
      process.env.VITE_SUPABASE_URL = previousViteSupabaseUrl;
    }

    if (previousSupabaseAnonKey === undefined) {
      delete process.env.SUPABASE_ANON_KEY;
    } else {
      process.env.SUPABASE_ANON_KEY = previousSupabaseAnonKey;
    }

    if (previousViteSupabaseAnonKey === undefined) {
      delete process.env.VITE_SUPABASE_ANON_KEY;
    } else {
      process.env.VITE_SUPABASE_ANON_KEY = previousViteSupabaseAnonKey;
    }

    if (previousSupabaseServiceRoleKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousSupabaseServiceRoleKey;
    }
  }
}

async function handleLocalApiRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
  server: ViteDevServer,
): Promise<void> {
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (pathname !== '/api/chat' && pathname !== '/api/usage' && pathname !== '/api/staging') {
    next();
    return;
  }

  const authorization = readAuthorizationHeader(req);
  if (authorization) {
    req.headers.authorization = authorization;
  }

  try {
    await withServerEnv(server, async () => {
      if (pathname === '/api/usage') {
        await handleUsageRequest(req, res);
        return;
      }

      if (pathname === '/api/staging') {
        await handleStagingRequest(req, res);
        return;
      }

      await handleChatRequest(req, res);
    });
  } catch (error) {
    if (!res.headersSent) {
      const message = error instanceof Error ? error.message : 'Local API route failed';
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: message }));
      return;
    }

    res.end();
  }
}

function localApiPlugin(): Plugin {
  return {
    name: 'vite-plugin-local-api-routes',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handleLocalApiRoutes(req, res, next, server);
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApiPlugin()],
});
