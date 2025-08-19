import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Expose system environment variables to the client
    'process.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY),
    'process.env.GWDG_API_KEY': JSON.stringify(process.env.GWDG_API_KEY),
  },
  server: {
    port: 3000,
    proxy: {
      '^/api/openai/': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Add OpenAI API key from environment
            if (process.env.VITE_OPENAI_API_KEY) {
              proxyReq.setHeader('Authorization', `Bearer ${process.env.VITE_OPENAI_API_KEY}`);
            }
          });
        }
      },
      '^/api/gwdg/': {
        target: 'https://chat-ai.academiccloud.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gwdg/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Add GWDG API key from environment
            if (process.env.VITE_GWDG_API_KEY) {
              proxyReq.setHeader('Authorization', `Bearer ${process.env.VITE_GWDG_API_KEY}`);
            }
          });
        }
      },
      '^/api/edu-sharing/': {
        target: 'https://redaktion.openeduhub.net/edu-sharing',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/edu-sharing/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Set headers for edu-sharing API
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('Content-Type', 'application/json');
          });
        }
      },
      '^/api/edu-sharing-staging/': {
        target: 'https://repository.staging.openeduhub.net/edu-sharing',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/edu-sharing-staging/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Set headers for edu-sharing staging API
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('Content-Type', 'application/json');
          });
        }
      },
      '^/api/hf/': {
        target: 'https://api-inference.huggingface.co',
        changeOrigin: true,
        // Ensure we keep a single leading slash and remove the exact '/api/hf/' prefix
        rewrite: (path) => path.replace(/^\/api\/hf\//, '/'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Add Hugging Face API key from environment
            if (process.env.VITE_HF_API_KEY) {
              proxyReq.setHeader('Authorization', `Bearer ${process.env.VITE_HF_API_KEY}`);
            }
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('Content-Type', 'application/json');
            // Debug log: verify final URL being requested on the target
            try {
              // req.url here should be the rewritten path
              console.log('[Vite Proxy][HF] ->', req.method, req.url);
            } catch {}
          });
        }
      }
    },
  },
});
