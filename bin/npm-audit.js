const exec = require('child_process').exec;
const request = require('request');
const fs = require('fs');

const projectUrl = process.argv[2];
const projectName = process.argv[3];
const slackWebhook = process.argv[4];

exec('npm audit --json', (error, stdout, stderr) => {
  const output = JSON.parse(stdout);

  if (!output.advisories) { return; }

  const excludedAdvisories = getExcludedAdvisories();
  const attachments = [];

  for (const advisoryId in output.advisories) {
    if (excludedAdvisories.includes(advisoryId)) { continue; }

    if (output.advisories.hasOwnProperty(advisoryId)) {
      const advisory = output.advisories[advisoryId];

      const attachment = getSlackAttachment(advisory);

      if (!attachment) { continue; }
      
      attachments.push(attachment);
    }
  }

  if (!attachments.length) { return; }

  sendNotification(attachments);
});

function sendNotification(attachments) {
  request.post(slackWebhook, {
    json: {
      channel: 'i_npm-audit',
      username: `npm audit bot: ${projectName}`,
      icon_emoji: ':rotating_light:',
      text: `I just ran \`npm audit\` on *${projectName}* and found following unknown issues:`,
      attachments: attachments,
    },
  }, (error, res, body) => {
    if (error) {
      console.error(error);

      return;
    }
  });
}

function getSlackAttachment(advisory) {
  const severitiesToNotify = ['high', 'critical'];

  if (!severitiesToNotify.includes(advisory.severity)) { return; }
  
  return {
    title: advisory.title,
    text: `*Module:* ${advisory.module_name}\n\n*Dependencies:*\n${getFindings(advisory)}\n\n*Description:*\n${advisory.overview}\n\n*Advisory:* ${advisory.url}`,
    color: getAttachementColor(advisory.severity),
  };
}

function getAttachementColor(severity) {
  switch (severity) {
    case 'moderate':
      return '#ffc107';

    case 'high':
      return '#f44336';

    case 'critical':
      return '#9c27b0';
  
    default:
      break;
  }
}

function getExcludedAdvisories() {
  return fs.readFileSync('./.auditignore', { encoding: 'utf-8' }).toString().split('\n').map((line) => {
    const parts = line.split('/');

    return parts[parts.length - 1];
  });
}

function getFindings(advisory) {
  const findings = [];

  advisory.findings.forEach((finding) => {
    finding.paths.forEach((path) => {
      findings.push(`${path.split('>')[0]}`);
    });
  });

  return [...new Set(findings)].join('\n');
}
