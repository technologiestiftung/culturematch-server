const DEFAULT_DATASOURCE = 'db';

module.exports = function (Model, options) {
  Model.getApp((_, app) => {
    let globalOptions = app.get('paginator') || {};

    options.dataSource = globalOptions.dataSource || DEFAULT_DATASOURCE;

    const ds = app.datasources[options.dataSource];

    if (!app.models.Report) {
      console.log('Report model not yet created. Creating...');

      const ReportModel = ds.createModel('Report', {
        reportableId: {
          type: 'string',
          required: true,
        },
        reportableType: {
          type: 'string',
          required: true,
        },
        reason: {
          type: 'string',
        },
        userId: {
          type: 'string',
        },
      },
      {
        plural: 'reports',
        base: 'BaseModel',
        idInjection: true,
        options: {
          validateUpsert: true,
        },
        mixins: {
          CascadeDelete: {
            deepDelete: true,
          },
        },
        scope: {},
        validations: [],
        relations: {
          reportable: {
            type: 'belongsTo',
            polymorphic: true,
          },
          user: {
            type: 'belongsTo',
            model: 'AppUser',
            foreignKey: 'userId',
          },
        },
        acls: [],
        methods: {},
      });

      app.model(ReportModel, { datasource: options.dataSource });

      app.models.Report.settings.acls.push({
        accessType: 'READ',
        principalType: 'ROLE',
        principalId: '$everyone',
        permission: 'DENY',
      });
    }

    Model.hasMany(app.models.Report, { as: 'reports', polymorphic: 'reportable' });

    Model.settings.acls.push({
      accessType: 'EXECUTE',
      principalType: 'ROLE',
      principalId: '$everyone',
      permission: 'ALLOW',
      property: 'createReport',
    });

    Model.settings.acls.push({
      accessType: 'READ',
      principalType: 'ROLE',
      principalId: '$everyone',
      permission: 'DENY',
      property: '__get__reports',
    });

    Model.createReport = async function(id, options, req) {
      try {
        const instance = await Model.findById(id);

        if (!instance) {
          req.res(404);

          return Promise.reject({ message: 'Not found.' });
        }

        const userId = options.accessToken ? options.accessToken.userId : null;

        await instance.reports.create({ reportableId: id, reason: 'foo bar', userId });
      } catch (error) {
        return Promise.reject(error);
      }
    };

    Model.remoteMethod('createReport', {
      accepts: [
        {
          arg: 'id',
          type: 'string',
          required: true,
        },
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
        path: '/:id/report',
      },
      returns: {
        root: true,
      },
    });
  });
};
