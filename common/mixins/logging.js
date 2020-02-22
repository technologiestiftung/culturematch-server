module.exports = function (Model, options) {
  if (options.only && !options.only.includes(Model.definition.name)) { return; }

  Model.observe('after save', log);
  Model.observe('before delete', log);

  async function log(context) {
    const LogEntry = Model.app.models.LogEntry;

    if (context.Model.modelName === 'LogEntry') { return; }

    const action = context.hasOwnProperty('isNewInstance') ? context.isNewInstance ? 'created' : 'updated' : 'deleted';
    const params = extractParams(context);

    if (params.userType == 'admin') {
      try {
        const id = params.id || context.where.id;

        const admin = await Model.app.models.Admin.findById(params.userId);
        const instance = context.instance || await context.Model.findById(id);

        const logData = {
          adminId: params.userId,
          adminEmail: admin.email,
          action: action,
          modelName: context.Model.definition.name,
          instanceId: id,
          instance: JSON.stringify(instance),
        };

        LogEntry.create(logData);
      } catch (error) {
        console.error(error);
      }
    }
  }

  function extractParams(context) {
    return {
      id: context.instance && context.instance.id,
      model: context.Model.definition.name,
      userId: context.options && context.options.accessToken && context.options.accessToken.userId,
      userType: context.options && context.options.authorizedRoles && context.options.authorizedRoles.admin ? 'admin' : 'user',
    };
  }
};
