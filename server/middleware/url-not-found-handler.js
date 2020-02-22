const path = require('path');

module.exports = function () {
  return function urlNotFoundHandler(error, req, res, next) {
    if (error.statusCode !== 404) {
      return res.status(error.statusCode || 500).send(error);
    }

    res.sendFile(path.join(__dirname, '../views/404.html'), function (err) {
      if (err) {
        console.error(err);
        res.status(err.status).end();
      }
    });
  };
};
