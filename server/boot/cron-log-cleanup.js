const schedule = require('node-schedule');

const LOG_ENTRY_TTL_IN_DAYS = 90;

module.exports = function (app) {
  console.info('[BOOT] > Start log cleanup cron');

  if (process.env.NODE_APP_INSTANCE !== '0') { return; }

  const LogEntry = app.models.LogEntry;

  schedule.scheduleJob('2 * * *', async () => {
    try {
      const d = new Date();
      d.setDate(d.getDate() - LOG_ENTRY_TTL_IN_DAYS);

      const entries = await LogEntry.find({ where: { createdAt: { lt: d.getTime() } } });

      console.log(`Found ${entries.length} outdated log entries.`);

      for (const entry of entries) {
        await entry.destroy();
      }
    } catch (error) {
      console.error(error);
    }
  });
};
