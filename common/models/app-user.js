var app = require('../../server/server.js');
var viewConfig = app.get('viewConfig');
var emailConfig = app.get('emailConfig');
const path = require('path');

const { createHash } = require('crypto');

const mailQueue = require('../../server/queue/mail-queue');

module.exports = function (AppUser) {
  AppUser.beforeRemote('create', async (context) => {
    const consents = context.args.data.consents;

    try {
      await checkConsentsForErrors(consents);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  function checkConsentsForErrors(consents) {
    if (!consents) {
      let error = new Error();
      error.status = 422;
      error.message = 'No consents present.';

      return Promise.reject(error);
    }

    if (!consents.privacy || !consents.privacy.id || !consents.privacy.content) {
      let error = new Error();
      error.status = 422;
      error.message = 'Privacy consent not valid.';

      return Promise.reject(error);
    }

    if (!consents.terms || !consents.terms.id || !consents.terms.content) {
      let error = new Error();
      error.status = 422;
      error.message = 'Terms consent not valid.';

      return Promise.reject(error);
    }

    return Promise.resolve();
  }

  AppUser.afterRemote('create', async (context, user) => {
    if (user) {
      const ip = context.req.headers['x-real-ip'];

      saveConsents(ip, user.id, context.args.data.consents);

      if (AppUser.definition.settings.customOptions.needsEmailVerification) {
        verifyEmail(user);
      }
    }
  });

  function saveConsents(ip, userId, consents) {
    const Consent = AppUser.app.models.Consent;

    for (let agreementType in consents) {
      Consent.create({
        ip: ip,
        userId: userId,
        agreementType: agreementType,
        agreementId: consents[agreementType].id,
        agreement: consents[agreementType],
      });
    }
  }

  function verifyEmail(userInstance) {
    var options = {
      type: 'email',
      mailer: {
        send(verifyOptions, options, cb) {
          // just do the callback
          // TODO: find better solution?
          cb();
        },
      },
      to: userInstance.email,
      from: process.env.SMTP_DEFAULT_SENDER,
    };

    userInstance.verify(options, function(error, response) {
      if (error) {
        console.error(error);

        return;
      }

      const url = `${process.env.APP_URL}/confirm/${response.uid}/${response.token}`;

      const messageData = {
        type: 'email_confirmation',
        to: options.to,
        from: options.from,
        url: url,
        user: userInstance,
        template: path.resolve('./server/mailer/templates/email-verification.html'),
        config: getConfig('emailPasswordReset'),
        subject: 'Bitte bestätige deine E-Mail-Adresse',
      };

      mailQueue.sendEmail(messageData);
    });
  }

  AppUser.on('resetPasswordRequest', function (info) {
    var url = `${process.env.API_URL}/a/password-reset/${info.accessToken.id}`;

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

  AppUser.afterRemote('setPassword', async (context) => {
    const AccessToken = AppUser.app.models.AccessToken;

    if (!context.req.accessToken && !context.req.accessToken.id) { return; }

    try {
      await AccessToken.destroyById(context.req.accessToken.id);
    } catch (error) {
      console.error(error);
    }
  });

  // This endpoint is used to verify an access token.
  // /api/users/:id/verify-access-token is only accessible for the autheticated user
  // with the corresponding id, a valid access token has to be present in the request.
  // If successful (e.g. the token is valid) the endpoint responds with 204, otherwise with 401.
  AppUser.verifyAccessToken = function () {
    return Promise.resolve();
  };

  AppUser.remoteMethod('verifyAccessToken', {
    accepts: [],
    http: {
      verb: 'get',
      path: '/:id/verify-access-token',
    },
    returns: {
      root: true,
    },
  });

  AppUser.deleteAccount = async function(userId, options, req, res) {
    if (userId !== options.accessToken.userId) {
      res.status(401);

      return Promise.reject({ message: 'You can only delete your own account.' });
    }

    if (!req.body.password || !req.body.email) {
      res.status(422);

      return Promise.reject({ message: 'Email and password are required to delete your own account.' });
    }

    try {
      const user = await AppUser.findById(userId);

      const passwordCorrect = await user.hasPassword(req.body.password);

      if (passwordCorrect && req.body.email === user.email) {
        await user.destroy();

        return;
      }

      res.status(422);

      return Promise.reject({ message: 'Email and password combination does not match.' });
    } catch (error) {
      return Promise.reject(error);
    }
  };

  AppUser.remoteMethod('deleteAccount', {
    accepts: [
      {
        arg: 'userId',
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
      {
        arg: 'res',
        type: 'object',
        http: {
          source: 'res',
        },
      },
    ],
    http: {
      verb: 'post',
      path: '/:userId/delete-account',
    },
    returns: {
      root: true,
    },
  });

  AppUser.afterRemote('logout', async (context) => {
    const PushToken = AppUser.app.models.PushToken;

    const hash = createHash('sha256');
    const accessTokenHash = hash.update(context.args.access_token).digest('hex');

    const pushTokens = await PushToken.find({ where: { accessTokenHash: accessTokenHash } });

    for (const pushToken of pushTokens) {
      await pushToken.destroy();
    }
  });

  AppUser.setPushToken = async function(userId, options, req, res) {
    const PushToken = AppUser.app.models.PushToken;

    const token = req.body.token;

    if (!token) {
      res.status(422);

      return Promise.reject({ message: 'token is required.' });
    }

    try {
      const hash = createHash('sha256');
      const accessTokenHash = hash.update(options.accessToken.id).digest('hex');

      const pushToken = await PushToken.findById(token);

      if (pushToken) {
        await pushToken.updateAttributes({ userId: userId, accessTokenHash: accessTokenHash });

        return Promise.resolve();
      }

      await PushToken.create({ id: token, userId: userId, accessTokenHash: accessTokenHash });
    } catch (error) {
      return Promise.reject(error);
    }
  };

  AppUser.remoteMethod('setPushToken', {
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
      {
        arg: 'res',
        type: 'object',
        http: {
          source: 'res',
        },
      },
    ],
    http: {
      verb: 'post',
      path: '/:id/set-push-token',
    },
    returns: {
      root: true,
    },
  });

  AppUser.getCurrentUser = async function(options, req, res) {
    if (!options.accessToken) {
      res.status(204);

      return Promise.resolve();
    }

    try {
      const user = await AppUser.findById(options.accessToken.userId);

      return Promise.resolve(user);
    } catch (error) {
      return Promise.reject(error);
    }
  };

  AppUser.remoteMethod('getCurrentUser', {
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
      path: '/me',
    },
    returns: {
      root: true,
    },
  });

  AppUser.afterRemote('*.__get__likes', async (context) => {
    const Like = AppUser.app.models.Like;

    try {
      const totalCount = await Like.count(context.args.filter.where);

      context.res.append('X-Total-Count', totalCount);
    } catch (error) {
      console.error(error);
    }
  });

  AppUser.afterRemote('*.__get__offers', async (context) => {
    const Ad = AppUser.app.models.Ad;

    try {
      const totalCount = await Ad.count(context.args.filter.where);

      context.res.append('X-Total-Count', totalCount);
    } catch (error) {
      console.error(error);
    }
  });
};
