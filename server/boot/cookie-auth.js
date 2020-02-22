module.exports = function (app) {
  app.post('/api/auth/login', async (req, res) => {
    try {
      const email = req.body.email;
      const password = req.body.password;

      if (!email || !password) {
        res.status(422);

        return res.send({ message: 'Email and password are required.' });
      }

      const token = await app.models.AppUser.login({ email, password });

      const user = await app.models.AppUser.findById(token.userId);

      res.cookie('access_token', token.id, { signed: true, maxAge: token.ttl * 1000, httpOnly: true, secure: process.env.NODE_ENV === 'prodcution' });

      if (process.env.NODE_ENV !== 'prodcution') {
        res.set('X-Access-Token', `${token.ttl}___${token.id}`);
      }

      res.send(user);
    } catch (error) {
      console.error(error);

      res.status(error.statusCode || 500);

      res.send(error);
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      const accessToken = req.signedCookies.access_token || req.signedCookies.access_token || null;

      if (!accessToken) {
        res.status(401);

        return res.send();
      }
      
      await app.models.AccessToken.destroyById(accessToken);

      res.clearCookie('access_token');

      res.status(204).send();
    } catch (error) {
      console.error(error);

      res.status(error.statusCode || 500);

      res.send(error);
    }
  });
};
