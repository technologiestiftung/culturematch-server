const Queue = require('bull');
const debug = require('debug')('loopback:mail');
const schedule = require('node-schedule');
const nodemailer = require('nodemailer');
const nunjucks = require('nunjucks');

var exports = module.exports = {};

let app;
let mailer;

exports.initialize = (application) => {
  app = application;

  app.emailQueue = new Queue('mail_queue', { redis: { db: 4, port: process.env.REDIS_PORT, host: process.env.REDIS_HOST, password: process.env.REDIS_PASSWORD } });

  app.emailQueue.process('*', (job, done) => {
    handleEmailJob(job, done);
  });

  createTransporter();

  initQueueCleanup();
};

exports.sendEmail = (data) => {
  app.emailQueue.add(data.type, data, { attempts: 20, backoff: { type: 'exponential', delay: 5000 } }).then((job) => {
    debug(`Job added for email type ${data.type}`);
  });
};

async function handleEmailJob(job, done) {
  if (!app.models) { return done(); }

  debug(`Process email of type ${job.data.type}`);

  debug(job.data);

  try {
    const parts = job.data.template.split('/');
    const file = parts.pop();
    const templatePath = parts.join('/');

    const n = nunjucks.configure(templatePath, { noCache: true });
    job.data.html = n.render(file, job.data);

    await mailer.sendMail(job.data);

    done();
  } catch (error) {
    console.error(`attemptsMade: ${job.attemptsMade}`);
    console.error(error);
    done(new Error(error));
  }
}

function createTransporter() {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    secure: JSON.parse(process.env.SMTP_SECURE),
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: JSON.parse(process.env.SMTP_REJECT_UNAUTHORIZED),
    },
    debug: JSON.parse(process.env.SMTP_DEBUG),
  });

  mailer.verify(function(error, success) {
    if (error) {
      debug(error);

      return;
    }
      
    debug('Mailserver is ready to take messages!');
  });
}

function initQueueCleanup() {
  if (process.env.NODE_APP_INSTANCE !== '0') { return; }

  schedule.scheduleJob('*/5 * * * *', () => {
    app.emailQueue.clean(10000, 'completed').then((deletedJobs) => {
      debug('delete completed jobs');
      debug(deletedJobs);
    });
  });
}
