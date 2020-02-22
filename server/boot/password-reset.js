var app = require('../server');
var request = require('request');
var viewConfig = app.get('viewConfig');

module.exports = function (server) {
  var router = server.loopback.Router();

  // Render password reset page
  router.get('/password-reset', passwordResetRenderFunction);
  router.get('/password-reset/:token', passwordResetRenderFunction);
  router.get('/a/password-reset', passwordResetRenderFunction);
  router.get('/a/password-reset/:token', passwordResetRenderFunction);
  router.post('/password-reset', passwordResetRenderFunction);

  server.use(router);
};

function passwordResetRenderFunction(req, res) {
  if (req.method === 'POST') {
    if (req.body.password && req.body.token) {
      return setNewPassword(req.body.password, req.body.token, res);
    }

    return renderError(res);
  }

  let token = req.params.token;

  if (!token) {
    return renderNoToken(res);
  }

  let renderOptions = {
    token: token,
    config: viewConfig,
    year: new Date().getFullYear(),
  };

  res.render('password-reset', renderOptions);
}

function setNewPassword(newPassword, token, res) {
  var options = {
    form: { newPassword: newPassword },
    headers: { Authorization: token },
    url: `${process.env.API_URL}/api/users/reset-password`,
  };

  request.post(options, function (error, response, body) {
    if (error) {
      console.log(error);

      return;
    }

    if (response.statusCode == 204) {
      return renderSuccess(res);
    }

    return renderError(res);
  });
}

function renderNoToken(res) {
  let renderOptions = {
    response: {
      noToken: true,
    },
    config: viewConfig,
    year: new Date().getFullYear(),
  };

  res.render('password-reset', renderOptions);
}

function renderSuccess(res) {
  let renderOptions = {
    response: {
      success: true,
    },
    config: viewConfig,
    year: new Date().getFullYear(),
  };

  res.render('password-reset', renderOptions);
}

function renderError(res) {
  let renderOptions = {
    response: {
      error: true,
    },
    config: viewConfig,
    year: new Date().getFullYear(),
  };

  res.render('password-reset', renderOptions);
}
