const config = require('../config.json');

const bundleId = config.apple.bundleId;
const teamId = config.apple.teamId;

module.exports = function(server) {
  console.info('[BOOT] > Serve apple-app-site-association file');

  var router = server.loopback.Router();
  router.get('/apple-app-site-association', (req, res) => {
    res.json({
      applinks: {
        apps: [],
        details: [
          {
            appID: `${teamId}.${bundleId}`,
            paths: ['/a/*'],
          },
        ],
      },
    });
  });
  server.use(router);
};
