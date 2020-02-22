module.exports = function(app) {
  var Role = app.models.Role;

  Role.registerResolver('$conversationParticipant', async (role, context, cb) => {
    if (context.modelName !== 'Conversation') { return false; }

    const accessToken = context.accessToken;

    if (!accessToken && !accessToken.id) { return false; }

    const instance = context.remotingContext.instance;

    if (instance.ownerId !== accessToken.userId && instance.prospectId !== accessToken.userId) { return false; }

    return true;
  });
};
