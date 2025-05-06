import { exec } from 'child_process'
import { CronJob } from 'cron'

const debug = require('debug')('app:cron')

const jobs: CronJob[] = []

export function startCron() {
  const job = new CronJob('0 12 * * *', copyDataFromSF)
  job.name = 'copyDataFromSF'
  job.start()
  jobs.push(job)
  debug('[startCron] started job %s, nextDate=%s', job.name, job.nextDate())
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
