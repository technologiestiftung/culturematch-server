require('dotenv').config();

// NODE_APP_INSTANCE ist set by pm2, see https://pm2.keymetrics.io/docs/usage/environment/
// this fixes missing NODE_APP_INSTANCE when not using pm2, within a vagrant box for example
if (!process.env.NODE_APP_INSTANCE) {
  process.env.NODE_APP_INSTANCE = 0;
}

const passport = require('passport');
const loopback = require('loopback');
const boot = require('loopback-boot');
const consolidate = require('consolidate');
const multer = require('multer');
const basicAuth = require('express-basic-auth');
const session = require('express-session');
const Redis = require('ioredis');
const redisStore = require('connect-redis')(session);
const cookieParser = require('cookie-parser');

const mailQueue = require('./queue/mail-queue');

var app = module.exports = loopback();

app.use(cookieParser(process.env.SESSION_SECRET));

// Use redis store for sessions so app works on multiple cores
const sessionStoreClient = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.SESSION_REDIS_DB || 0),
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 86400,
  },
  store: new redisStore({ client: sessionStoreClient, ttl: 86400 }),
}));

app.engine('html', consolidate.nunjucks);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');

app.use(multer().any()); // for parsing multipart/form-data
app.use(passport.initialize());

app.get('/explorer', basicAuth({
  users: {
    explorer: process.env.EXPLORER_PASSWORD,
  },
  challenge: true,
}));

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');

    console.log('NODE_ENV : ', process.env.NODE_ENV || 'hacking');
    console.log('Web server listening at: %s', process.env.API_URL);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', process.env.API_URL, explorerPath);
    }
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module) {
    mailQueue.initialize(app);

    app.io = require('socket.io')(app.start());

    const redisAdapter = require('socket.io-redis');

    const options = {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.SOCKETIO_REDIS_DB || 0),
    };

    app.io.adapter(redisAdapter({
      pubClient: new Redis(options),
      subClient: new Redis(options),
    }));

    require('socketio-auth')(app.io, {
      authenticate: function (socket, value, callback) {
        const AccessToken = app.models.AccessToken;

        AccessToken.find({
          where: {
            and: [
              {
                userId: value.userId,
              }, {
                id: value.accessToken,
              },
            ],
          },
        }, function (err, tokenDetail) {
          if (err) throw err;

          if (tokenDetail.length) {
            callback(null, true);
          } else {
            callback(null, false);
          }
        });
      },
      postAuthenticate: function (socket, data) {
        // add user to their private user channel and the channel with all connected users
        socket.join(data.userId);
        socket.join('all');
      },
    });
  }
});

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  done(null, { foo: 'bar' });
});
