const app = require('../../server/server.js');

const FCM = require('fcm-node');
const fcm = new FCM(process.env.FIREBASE_SERVER_KEY);

const MAX_RECIPIENTS = 500;

module.exports = async function (registrationIds, notification, data) {
  if (!registrationIds.length) { return; }

  const message = {
    registration_ids: registrationIds,
    notification: notification,
    data: data,
  };

  let messages = [message];

  if (registrationIds.length > MAX_RECIPIENTS) {
    messages = [];

    for (let i = 0; i < registrationIds.length; i += MAX_RECIPIENTS) {
      const recipients = registrationIds.slice(i, i + MAX_RECIPIENTS);
      
      messages.push({ registration_ids: recipients, notification: notification, data: data });
    }
  }

  messages.forEach((message) => {
    sendMessage(message);
  });
};

function sendMessage(message) {
  fcm.send(message, (error, response) => {
    if (error) {
      handleErrors(message.registration_ids, JSON.parse(error));
    }
  });
}

async function handleErrors(pushTokens, error) {
  for (let i = 0; i < error.results.length; i++) {
    if (error.results[i].error === 'InvalidRegistration') {
      console.log('delete push token', pushTokens[i]);
      try {
        const token = await app.models.PushToken.findById(pushTokens[i]);
        await token.destroy();
      } catch (error) {
        console.log('Error removing token', error);
      }
    }
  }
}
