import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    watch: {
      // inotify doesn't fire across the WSL2/Windows filesystem boundary.
      // Polling detects changes reliably regardless of where the editor runs.
      usePolling: true,
      interval: 300,
    },
  },
});
