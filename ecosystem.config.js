module.exports = {
  apps: [
    {
      name: 'meilisearch',
      script: './meilisearch',
      cwd: '/app/main-app',
      args: `--master-key=${process.env.MEILISEARCH_KEY}`,
      interpreter: 'none'
    },
    {
      name: 'main-app',
      script: 'npm',
      args: 'start',
      cwd: '/app/main-app'
    },
    {
      name: 'admin-app',
      script: 'npm',
      args: 'start',
      cwd: '/app/admin-app'
    }
  ]
}
