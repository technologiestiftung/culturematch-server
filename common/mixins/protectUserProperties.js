module.exports = function (Model, options) {
  Model.observe('loaded', (context, next) => {
    if (options.exceptAdmin && context.options.authorizedRoles && context.options.authorizedRoles.admin) {
      return next();
    }

    if (context.options.accessToken && context.data.id != context.options.accessToken.userId) {
      const data = JSON.parse(JSON.stringify(context.data));
      options.exceptOwner.forEach((property) => {
        delete data[property];

        context.data = data;
      });
    }

    next();
  });
};
