import { exec } from 'child_process'
import { CronJob } from 'cron'

const debug = require('debug')('app:cron')

type JobName = 'copyDataFromSF' | 'sendAnalyticsToSF' | 'ALL'

const jobs: Map<string, CronJob> = new Map()

let job = new CronJob('0 12 * * *', copyDataFromSF)
job.name = 'copyDataFromSF'
jobs.set(job.name, job)

job = new CronJob('1 13 * * *', sendAnalyticsToSF)
job.name = 'sendAnalyticsToSF'
jobs.set(job.name, job)

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

export const cron = {
  start(jobName: JobName) {
    if (['ALL', 'copyDataFromSF'].includes(jobName)) {
      const job = jobs.get('copyDataFromSF')
      if (job) {
        job.start()
        debug('[startCron] started job %s, nextDate=%s', job.name, job.nextDate())
      }
    }

    if (['ALL', 'sendAnalyticsToSF'].includes(jobName)) {
      const job = jobs.get('sendAnalyticsToSF')
      if (job) {
        job.start()
        debug('[startCron] started job %s, nextDate=%s', job.name, job.nextDate())
      }
    }
  },

  stop(jobName: JobName) {
    if (['ALL', 'copyDataFromSF'].includes(jobName)) {
      const job = jobs.get('copyDataFromSF')
      if (job) {
        job.stop()
        debug('[stopCron] stopped job %s, lastDate=%s', job.name, job.lastDate())
      }
    }

    if (['ALL', 'sendAnalyticsToSF'].includes(jobName)) {
      const job = jobs.get('sendAnalyticsToSF')
      if (job) {
        job.stop()
        debug('[stopCron] stopped job %s, lastDate=%s', job.name, job.lastDate())
      }
    }
  },

  getStatus() {
    return Array.from(jobs.values()).map((job) => ({
      name: job.name,
      nextDate: job.nextDate(),
      lastDate: job.lastDate(),
      active: job.isActive
    }))
  }
}
