/**
 * Used to seed data
 */
module.exports = function (app) {
  console.info('[BOOT] > Running seed script');

  var ds = app.dataSources.db;

  // Only execute if Admin model is already migrated
  ds.isActual('Admin', function (err, isActual) {
    if (err) {
      return console.error('seed#isActual Admin', err);
    }

    if (isActual) {
      seedRole().then(() => {
        seedAdmin();
      }).catch((error) => {
        console.error('Error seeding role admin', error);
      });
    }
  });

  ds.isActual('Agreement', function (err, isActual) {
    if (err) {
      return console.error('seed#isActual Agreement', err);
    }

    if (isActual) {
      seedAgreements();
      seedAppVersion();
    }
  });

  function seedRole() {
    const Role = app.models.Role;

    var params = {
      name: 'admin',
    };
    var adminRoleModel = {
      name: 'admin',
      description: 'Elevated users that can manage the app',
    };

    return Role.findOrCreate(params, adminRoleModel);
  }

  /**
   * Create admin user and admin role for ACL
   */
  function seedAdmin() {
    const Admin = app.models.Admin;

    const SEED_ADMIN = {
      fullname: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'superadmin',
    };

    Admin.count(function (err, count) {
      if (err) {
        return console.error('seedAdmin#count', err);
      }
      if (count) {
        return;
      }

      console.log('No Admins found, creating');

      Admin.create(SEED_ADMIN, function (err, admin) {
        if (err) {
          return console.error('seedAdmin#create', err);
        }
        // Admin.observe('after save') should add admin to admin role after creation
      });
    });
  }

  function seedAgreements() {
    const Agreement = app.models.Agreement;

    Agreement.count().then((count) => {
      if (count) {
        return;
      }

      console.info('No Agreements found, creating');

      const SEED = [
        {
          title: 'Datenschutz',
          content: 'This should be changed!',
          excerpt: 'This is just a excerpt.',
          changes: 'Only small changes...',
          status: 'published',
          validityStartDate: new Date(),
          type: 'privacy',
        },
        {
          title: 'AGB',
          content: 'This should be changed!',
          excerpt: 'This is just a excerpt.',
          changes: 'Only small changes...',
          status: 'published',
          validityStartDate: new Date(),
          type: 'terms',
        },
      ];

      Agreement.create(SEED).then((agreement) => {
        console.info('Initial agreements seeded. Should be changed in something meaningful!', agreement);
      }).catch((error) => {
        console.error('Error seeding agreements.', error);
      });
    });
  }

  function seedAppVersion() {
    const AppVersion = app.models.AppVersion;

    AppVersion.count().then((count) => {
      if (count) {
        return;
      }

      console.info('No AppVersion found, creating');

      const SEED = {
        versionCode: '0.1.0',
        breakingChanges: false,
      };

      AppVersion.create(SEED).then((agreement) => {
        console.info('Initila app version seeded.', agreement);
      }).catch((error) => {
        console.error('Error seeding app version.', error);
      });
    });
  }
};
