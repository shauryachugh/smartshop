import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

/**
 * Custom Vite plugin to emulate Netlify Serverless Functions in local development.
 * Automatically intercepts requests to `/.netlify/functions/:name` and routes them
 * to the corresponding handler in `netlify/functions/:name.mjs` or `.js`.
 */
function netlifyFunctionsPlugin() {
  return {
    name: 'netlify-functions-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url.startsWith('/.netlify/functions/') || req.url.startsWith('/api/'))) {
          const fnUrl = req.url.split('?')[0];
          const fnName = fnUrl.replace('/.netlify/functions/', '').replace('/api/', '');

          try {
            // Buffer request body chunks for POST/PUT
            let body = '';
            for await (const chunk of req) {
              body += chunk;
            }

            // Resolve file path safely
            const mjsPath = path.resolve(process.cwd(), `netlify/functions/${fnName}.mjs`);
            const jsPath = path.resolve(process.cwd(), `netlify/functions/${fnName}.js`);
            let targetPath = null;

            if (fs.existsSync(mjsPath)) {
              targetPath = mjsPath;
            } else if (fs.existsSync(jsPath)) {
              targetPath = jsPath;
            } else {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `Function ${fnName} not found.` }));
              return;
            }

            // Dynamically import via file URL with cache-busting timestamp
            const fileUrl = `${pathToFileURL(targetPath).href}?t=${Date.now()}`;
            const handlerModule = await import(fileUrl);
            const handler = handlerModule.handler || handlerModule.default;

            if (!handler) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `Handler not found in function ${fnName}` }));
              return;
            }

            const host = req.headers.host || 'localhost:5173';
            const urlObj = new URL(req.url, `http://${host}`);
            const queryStringParameters = Object.fromEntries(urlObj.searchParams.entries());

            const event = {
              httpMethod: req.method,
              headers: req.headers,
              path: req.url,
              queryStringParameters,
              body: body || null,
            };

            const response = await handler(event, {});

            res.statusCode = response.statusCode || 200;
            if (response.headers) {
              for (const [key, val] of Object.entries(response.headers)) {
                res.setHeader(key, val);
              }
            }
            res.end(response.body);
          } catch (err) {
            console.error(`[netlify-functions-dev] Error running ${fnName}:`, err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables and assign to process.env for serverless handlers
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [react(), netlifyFunctionsPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      open: false,
      host: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-icons': ['lucide-react'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
});
