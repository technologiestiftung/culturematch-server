const path = require('path');

const mailQueue = require('../../server/queue/mail-queue');

module.exports = function(Message) {
  Message.observe('after save', async (context) => {
    if (!context.isNewInstance) { return; }

    const Conversation = Message.app.models.Conversation;

    const conversationId = context.instance.conversationId;
    const senderId = context.instance.senderId;

    if (!conversationId) { return; }

    try {
      const conversation = await Conversation.findById(conversationId);

      const recipientId = senderId === conversation.ownerId ? conversation.prospectId : conversation.ownerId;

      conversation.updateAttributes({ lastMessageAt: context.instance.createdAt, lastMessageId: context.instance.id });

      notifyRecipient(senderId, recipientId, conversation.id, context.instance);
    } catch (error) {
      console.error(error);
    }
  });

  async function notifyRecipient(senderId, recipientId, conversationId, message) {
    const AppUser = Message.app.models.AppUser;

    try {
      const sender = await AppUser.findById(senderId);
      const recipient = await AppUser.findById(recipientId);

      const messageData = {
        type: 'email_confirmation',
        to: recipient.email,
        from: process.env.SMTP_DEFAULT_SENDER,
        sender: sender,
        recipient: recipient,
        message: message,
        url: `${process.env.API_URL}/conversations/${conversationId}`,
        template: path.resolve('./server/mailer/templates/new-message.html'),
        config: getConfig(),
        subject: `Neue Nachricht von ${sender.displayName}`,
      };

      mailQueue.sendEmail(messageData);
    } catch (error) {
      console.error('Error sending notification');
      console.error(error);
    }
  }

  function getConfig() {
    const baseUrl = process.env.API_URL;

    const viewConfig = Message.app.get('viewConfig');
    const emailConfig = Message.app.get('emailConfig');

    const date = new Date();

    return {
      urls: {
        facebook: viewConfig.urls.facebook,
        instagram: viewConfig.urls.instagram,
        youtube: viewConfig.urls.youtube,
      },
      contact: {
        email: emailConfig.contact.email,
      },
      body: emailConfig.body,
      footer: viewConfig.content.footer,
      baseUrl: baseUrl,
      font: emailConfig.font,
      colors: emailConfig.colors,
      date: {
        day: date.getUTCDate(),
        month: date.getUTCMonth() + 1,
        year: date.getUTCFullYear(),
      },
    };
  }
};
