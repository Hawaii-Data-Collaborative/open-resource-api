module.exports = {
  apps: [
    {
      name: 'main-app',
      script: 'npm',
      args: 'start',
      cwd: __dirname + '/main-app',
      env: {
        PORT: 3001
      }
    },
    {
      name: 'admin-app',
      script: 'npm',
      args: 'start',
      cwd: __dirname + '/admin-app',
      env: {
        PORT: 3002
      }
    }
  ]
}
