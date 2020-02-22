var path = require('path');
var app = require(path.resolve(__dirname, '..'));

var ds = app.datasources.db;
// By using modelBuilder.models, relations should be created automagically
var models = ds.modelBuilder.models;
var datasources = app.datasources;

if (ds.connected) {
  updateAll();
} else {
  ds.once('connected', updateAll);
}

function updateAll() {
  var updatedItems = 0;
  var modelNames = Object.keys(models);

  modelNames.forEach(function (key) {
    const modelDatasource = models[key].getDataSource();
    if (modelDatasource) {
      modelDatasource.autoupdate(key, function (err) {
        if (err) throw err;
        console.log(`Model ${key} updated`);
        updatedItems++;
        if (updatedItems == modelNames.length) {
          process.exit(0);
        }
      });
    } else {
      updatedItems++;
    }
  });
}

// TODO This is a sketch of only running update if there are indeed changes
// ds.isActual(models, function (err, actual) {
//   if (err) { return console.log(err); }
//   if (actual) { return console.log('is actual', actual); }
//   ds.autoupdate(models, function (err, result) {
//     if (err) { return console.log(err); }
//     console.info(result);
//   });
// });
