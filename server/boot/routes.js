module.exports = function(app) {
  app.post('/api/request-password-reset', function(req, res, next) {
    const AppUser = app.models.AppUser;

    AppUser.resetPassword({
      email: req.body.email,
    }, function(err) {
      if (err) return res.status(404).send(err);

      res.status(204).send();
    });
  });
};
