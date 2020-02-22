module.exports = function(Conversation) {
  Conversation.beforeRemote('find', async (context) => {
    // make sure filter exists
    context.args.filter = context.args.filter || {};

    const userId = context.req.accessToken.userId;

    // override where filter so one can only see their own conversations
    context.args.filter.where = { or: [{ ownerId: userId }, { prospectId: userId }] };
  });

  Conversation.beforeRemote('*.__create__messages', async (context) => {
    // make sure senderId is current userId
    context.args.data.senderId = context.req.accessToken.userId;
  });

  Conversation.startNewConversation = async function(options, req) {
    const Ad = Conversation.app.models.Ad;
    const Message = Conversation.app.models.Message;

    const adId = req.body.adId;
    const message = req.body.message;

    if (!adId || !message) {
      req.res.status(422);

      return Promise.reject({ message: 'adId and message are required.' });
    }

    try {
      const ad = await Ad.findById(adId);

      if (!ad) {
        req.res.status(404);

        return Promise.reject({ message: `No ad found with id '${adId}'` });
      }

      if (ad.userId === options.accessToken.userId) {
        req.res.status(422);

        return Promise.reject({ message: 'You can not talk to yourself.' });
      }

      let conversation = await Conversation.findOne({ where: { adId: adId, prospectId: options.accessToken.userId } });

      if (!conversation) {
        conversation = await Conversation.create({ adId: adId, ownerId: ad.userId, prospectId: options.accessToken.userId });
      }

      const newMessage = await Message.create({ conversationId: conversation.id, content: message, senderId: options.accessToken.userId });

      conversation.lastMessageId = newMessage.id;
      conversation.lastMessageAt = newMessage.createdAt;

      return conversation;
    } catch (error) {
      return Promise.reject(error);
    }
  };

  Conversation.remoteMethod('startNewConversation', {
    accepts: [
      {
        arg: 'options',
        type: 'object',
        http: 'optionsFromRequest',
      },
      {
        arg: 'req',
        type: 'object',
        http: {
          source: 'req',
        },
      },
    ],
    http: {
      verb: 'post',
      path: '/start',
    },
    returns: {
      root: true,
    },
  });

  Conversation.afterRemote('*.__get__messages', async (context) => {
    const Message = Conversation.app.models.Message;

    try {
      const totalCount = await Message.count(context.args.filter.where);

      context.res.append('X-Total-Count', totalCount);
    } catch (error) {
      console.error(error);
    }
  });
};
