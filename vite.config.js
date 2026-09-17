import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Actions exposes GITHUB_REPOSITORY as "owner/repository". Locally we
// use the root path; in Pages the generated assets use /repository/ instead.
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : '/';

export default defineConfig({
  base,
  plugins: [react()]
});
