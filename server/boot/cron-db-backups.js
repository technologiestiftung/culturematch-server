const schedule = require('node-schedule');
const { exec } = require('child_process');

module.exports = function () {
  console.info(`[BOOT] > Enabling automated database backups: ${process.env.DB_BACKUP_CRON}`);

  if (process.env.DB_BACKUP_ENABLED !== 'true' || process.env.NODE_APP_INSTANCE !== '0') { return; }

  schedule.scheduleJob(process.env.DB_BACKUP_CRON, () => {
    const env = process.env.NODE_ENV || 'hacking';
    const projectName = process.env.API_URL ? process.env.API_URL.split('//')[1] : 'undefined';

    exec(`sh bin/db-backup.sh ${env} ${projectName} ${process.env.DB_BACKUP_MAX_BACKUPS}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);

        return;
      }

      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
    });
  });
};
