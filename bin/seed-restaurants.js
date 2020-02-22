var path = require('path');
var app = require(path.resolve(__dirname, '..'));

const Chance = require('chance');

var ds = app.datasources.db;

const numberOfRestaurants = 50;

if (ds.connected) {
  seedRestaurants();
} else {
  ds.once('connected', seedRestaurants);
}

async function seedRestaurants() {
  var chance = new Chance();

  const Restaurant = app.models.Restaurant;
  const RestaurantCategory = app.models.RestaurantCategory;
  const CustomFile = app.models.CustomFile;

  try {
    const categories = await RestaurantCategory.find();
    const categoryIds = categories.map((category) => category.id);

    const files = await CustomFile.find();
    const fileIds = files.map((file) => file.id);

    for (let i = 0; i < numberOfRestaurants; i++) {
      const newRestaurant = {
        title: `${chance.word()} ${chance.word()}`,
        canonicalAddress: `${chance.street()} ${chance.integer({ min: 1, max: 100 })}, ${chance.zip()} ${chance.city()}, ${chance.country({ full: true })}`,
        location: {
          lat: chance.latitude({ min: 52.452595, max: 52.513647 }),
          lng: chance.longitude({ min: 13.398093, max: 13.404959 }),
        },
        priceRange: chance.pickone(['low', 'mid', 'high']),
        restaurantCategoryId: chance.pickone(categoryIds),
        image: chance.pickone(fileIds),
        numberOfSeats: chance.integer({ min: 15, max: 299 }),
        content: [{ 'type': 'wysiwyg', 'content': '<p>Posuere condimentum dignissim morbi faucibus gravida pretium sociosqu, aptent feugiat cum facilisis class at non, dui dolor lacus mauris porttitor torquent. Porta dapibus natoque ad luctus eget lacus accumsan inceptos, nunc mauris pellentesque tortor porttitor tellus platea placerat, potenti torquent nam neque laoreet sed cubilia. Sodales adipiscing lacus nisi feugiat donec nisl sit aptent, velit at eget viverra urna amet maecenas mauris habitant, est risus mus malesuada aliquam massa a.</p><p>Habitasse magnis sit mi platea non ligula, sagittis proin lobortis urna taciti montes ridiculus, hendrerit nibh feugiat porta donec. Ac arcu non conubia massa luctus nec, hendrerit sagittis nascetur volutpat parturient, habitant fames fringilla velit consequat.</p><p>Nec ridiculus augue interdum mollis eros tempus mauris inceptos lectus felis, hendrerit massa penatibus aenean porta sem congue proin etiam parturient erat, tempor pulvinar est torquent habitant convallis laoreet varius metus. Cubilia quisque sem commodo suspendisse praesent sagittis pulvinar ut fermentum, tortor malesuada inceptos mauris fames laoreet nullam parturient sed, rhoncus hac elit purus eu cum eget sapien.</p>' }], // eslint-disable-line max-len
      };
      
      await Restaurant.create(newRestaurant);
    }

    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}
