import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ? `${process.env.VITE_BASE_PATH}/` : '/',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 7010,
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
    ],
    environmentOptions: {
      happyDOM: {
        settings: {
          disableErrorCapturing: false,
          enableFileSystemHttpRequests: false,
        }
      }
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      }
    },
    silent: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e/**',
        '**/*.config.*',
        '**/test/**',
        '**/*.test.*',
        '**/*.spec.*',
        // QuickVoiceAdd excluded: Native browser APIs (MediaRecorder, FileReader, getUserMedia)
        // are difficult to test comprehensively in unit tests. E2E tests recommended.
        '**/pages/QuickVoiceAdd.tsx',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        // Branch coverage threshold set to 85% to account for:
        // - Event handlers (swipe gestures, touch interactions) better tested in E2E
        // - Edge case error handling paths that are difficult to trigger in unit tests
        // - UI conditional rendering based on device capabilities
        branches: 85,
        statements: 90,
      },
    },
  },
})
