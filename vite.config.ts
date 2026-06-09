import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * 拦截 CopilotKit v4 自带的 Tailwind v4 CSS，避免与项目 Tailwind v3 冲突。
 * CopilotKit 1.59.x 在 dist/v2/index.mjs 中通过 side-effect import 加载 index.css，
 * 其中包含 @layer base/components/utilities 指令，Tailwind v3 无法处理。
 * 我们的 CopilotChatPanel 组件使用完全自定义的 Tailwind v3 样式，无需默认 CSS。
 */
function copilotKitCssStub(): Plugin {
  return {
    name: 'copilotkit-css-stub',
    enforce: 'pre',
    transform(code, id) {
      const normalized = id.replace(/\\/g, '/');
      if (
        normalized.includes('node_modules/@copilotkit/') &&
        /\.css($|\?)/.test(normalized)
      ) {
        return {
          code: '/* stubbed by vite — replaced with empty stylesheet to avoid @layer conflict with Tailwind v3 */',
          map: null,
        };
      }
      return null;
    },
  };
}

export default defineConfig(async () => ({
  plugins: [copilotKitCssStub(), react()],
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, './src'),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: false,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
}));
