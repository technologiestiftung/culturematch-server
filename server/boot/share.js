var app = require('../server');
var viewConfig = app.get('viewConfig');

module.exports = function(server) {
  var router = server.loopback.Router();

  router.get('/restaurants/:id', restaurantRenderFunction);

  server.use(router);
};

function restaurantRenderFunction(req, res) {
  let id = req.params.id;

  var renderOptions = {
    url: process.env.API_URL,
    config: viewConfig,
  };

  app.models.Restaurant.findOne({ where: { id: id } }, function (err, restaurant) {
    if (err) { return console.error(err) && res.render('restaurant', renderOptions); }
    if (!restaurant) {
      renderOptions.model = 'Restaurant';
      
      return res.render('404', renderOptions);
    }

    renderOptions.item = restaurant;
    res.render('restaurant', renderOptions);
  });
}
