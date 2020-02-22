var app = require('../../server/server.js');
var viewConfig = app.get('viewConfig');
var emailConfig = app.get('emailConfig');
const path = require('path');
const nunjucks = require('nunjucks');

const mailQueue = require('../../server/queue/mail-queue');

module.exports = function(Admin) {
  Admin.observe('after save', function setRoleMapping(ctx, next) {
    if (ctx.instance) {
      if (ctx.isNewInstance) {
        var Role = Admin.app.models.Role;
        var RoleMapping = Admin.app.models.RoleMapping;

        Role.findOrCreate({ name: 'admin' }, { name: 'admin' }, function (err, role) {
          if (err) { return console.error('admin.after save findOrCreate Role', err); }
          console.log(role);
          role.principals.create({
            principalType: RoleMapping.USER,
            principalId: ctx.instance.id,
          }, function (err, principal) {
            if (err) { return console.error('admin.after save #principal.create', err); }
          });
        });
      }
    }
    next();
  });

  Admin.on('resetPasswordRequest', function (info) {
    var url = `${process.env.API_URL}/password-reset/${info.accessToken.id}`;

    var config = getConfig('emailPasswordReset');

    const messageData = {
      type: 'email_confirmation',
      to: info.email,
      from: process.env.SMTP_DEFAULT_SENDER,
      url: url,
      user: info.user,
      template: path.resolve('./server/mailer/templates/password-reset.html'),
      config: config,
      subject: 'Passwort zurücksetzen',
    };

    mailQueue.sendEmail(messageData);
  });

  function getConfig(template) {
    var baseUrl = process.env.API_URL;

    if (template === 'emailPasswordReset') {
      var date = new Date();

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

    return viewConfig;
  }

  Admin.getAdminConfig = async function(res) {
    try {
      const modelConfig = require('../../server/proto-admin-config.json');

      res.send(modelConfig);
    } catch (error) {
      return Promise.reject(error);
    }
  };

  Admin.remoteMethod('getAdminConfig', {
    accepts: [
      {
        arg: 'res',
        type: 'object',
        http: {
          source: 'res',
        },
      },
    ],
    http: {
      verb: 'get',
      path: '/admin-config',
    },
    returns: {
      root: true,
    },
  });
};

