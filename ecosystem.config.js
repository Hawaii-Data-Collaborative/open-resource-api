module.exports = {
  apps: [
    {
      name: 'meilisearch',
      script: './meilisearch',
      cwd: '/app/main-app',
      args: '--master-key=dY2amaK4QVUabL4NfDcqC',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'main-app',
      script: 'npm',
      args: 'start',
      cwd: '/app/main-app',
      env: {
        PORT: 3001
      }
    },
    {
      name: 'admin-app',
      script: 'npm',
      args: 'start',
      cwd: '/app/admin-app',
      env: {
        PORT: 3002
      }
    }
  ]
}
