const passport = require('passport');
const password = require('../../common/helpers/random-password.js');

const providers = require('../passport-providers.js');

module.exports = function(app) {
  for (const key in providers) {
    if (providers.hasOwnProperty(key)) {
      const providerConfig = providers[key];
      providerConfig.name = key;

      configureProvider(app, providerConfig);
    }
  }
};

function configureProvider(app, config) {
  const Strategy = config.strategy ? require(config.module)[config.strategy] : require(config.module);

  const router = app.loopback.Router();

  const authEndpoint = config.authURL;
  const callbackEndpoint = config.callbackURL;
  const failureEndpoint = config.failureURL;

  config.callbackURL = process.env.API_URL + config.callbackURL;

  passport.use(config.name, new Strategy(config, async function(accessToken, secondaryToken, profile, done) {
    try {
      const credentials = {
        accessToken: accessToken,
      };

      switch (config.provider) {
        case 'facebook':
          credentials.refreshToken = secondaryToken;
          break;

        case 'twitter':
        case 'google':
          credentials.tokenSecret = secondaryToken;
          break;
      
        default:
          credentials.secondaryToken = secondaryToken;
          break;
      }

      const identity = await app.models.AppUserIdentity.findOne({ where: { externalId: profile.id, provider: config.provider } });
      let user = identity ? await app.models.AppUser.findById(identity.userId) : await createUser(config.provider, profile, credentials, app);

      if (!user) {
        await identity.destroy();
        identity = null;
        user = await createUser(config.provider, profile, credentials, app);
      }

      if (identity) {
        await identity.updateAttributes({
          profile: profile,
          credentials: credentials,
        });
      }

      const userAccessToken = user ? await user.createAccessToken() : null;
      
      return done(null, user, { accessToken: userAccessToken });
    } catch (error) {
      console.error(error);
      
      return done(error, false);
    }
  }));

  router.get(authEndpoint, passport.authenticate(config.name));

  router.get(callbackEndpoint, passport.authenticate(config.name, { failureRedirect: config.failureURL }), function(req, res) {
    res.render('login-callback', { success: true, data: encodeURIComponent(JSON.stringify({ success: true, accessToken: req.authInfo.accessToken })) });
  });

  router.get(failureEndpoint, failureRenderFunction);

  app.use(router);
}

function failureRenderFunction(req, res) {
  res.render('login-callback', { success: false, data: encodeURIComponent(JSON.stringify({ success: false, accessToken: null })) });
}

async function createUser(provider, profile, credentials, app) {
  const AppUser = app.models.AppUser;
  const AppUserIdentity = app.models.AppUserIdentity;

  try {
    const user = await AppUser.create({
      email: `${profile.id}@${provider}.passport`,
      username: `${provider}.${profile.id}`,
      password: password(64),
    });

    await AppUserIdentity.create({
      externalId: profile.id,
      profile: profile,
      credentials: credentials,
      provider: provider,
      userId: user.id,
    });

    return Promise.resolve(user);
  } catch (error) {
    return Promise.reject(error);
  }
}
