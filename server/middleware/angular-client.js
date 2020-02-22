const path = require('path');
const fs = require('fs');

module.exports = function () {
  return function urlNotFound(req, res, next) {
    let indexHtml = path.resolve('client/index.html');

    if (!fs.existsSync(indexHtml)) { return next(); }

    res.sendFile(indexHtml, function (err) {
      if (err) {
        console.error(err);
        res.status(err.status).end();
      }
    });
  };
};
