module.exports = function(Consent) {
  Consent.beforeRemote('create', async (context) => {
    context.req.body.ip = context.req.headers['x-real-ip'];
    context.req.body.userId = context.args.options.accessToken.userId;
  });
};
