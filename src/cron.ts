import { exec } from 'child_process'
import { CronJob } from 'cron'

const debug = require('debug')('app:cron')

const jobs: CronJob[] = []

export function startCron() {
  const job1 = new CronJob('0 12 * * *', copyDataFromSF)
  job1.name = 'copyDataFromSF'
  job1.start()
  jobs.push(job1)
  debug('[startCron] started job %s, nextDate=%s', job1.name, job1.nextDate())

  const job2 = new CronJob('1 13 * * *', sendAnalyticsToSF)
  job2.name = 'sendAnalyticsToSF'
  job2.start()
  jobs.push(job2)
  debug('[startCron] started job %s, nextDate=%s', job2.name, job2.nextDate())
}

export function stopCron() {
  for (const job of jobs) {
    job.stop()
    debug('[stopCron] stopped job %s, lastDate=%s', job.name, job.lastDate())
  }
}

function copyDataFromSF() {
  debug('[copyDataFromSF] copying data from SF')
  exec('./scripts/copyDataFromSF.sh', (error, stdout, stderr) => {
    if (error) {
      debug('[copyDataFromSF] error: %s', error)
      return
    }
    if (stderr) {
      debug('[copyDataFromSF] stderr: %s', stderr)
    }
    if (stdout) {
      debug('[copyDataFromSF] stdout: %s', stdout)
    }
  })
}

function sendAnalyticsToSF() {
  debug('[sendAnalyticsToSF] begin')
  const cmd = 'cd /app/admin-app && npm run sfSync'
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      debug('[sendAnalyticsToSF] error: %s', error)
      return
    }
    if (stderr) {
      debug('[sendAnalyticsToSF] stderr: %s', stderr)
    }
    if (stdout) {
      debug('[sendAnalyticsToSF] stdout: %s', stdout)
    }
  })
}
