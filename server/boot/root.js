module.exports = function(server) {
  console.info('[BOOT] > Enabling API info route /api');

  // Install a `/api` route that returns server status
  var router = server.loopback.Router();
  router.get('/api', server.loopback.status());
  server.use(router);
};
