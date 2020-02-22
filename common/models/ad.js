module.exports = function(Ad) {
  Ad.beforeRemote('create', async (context) => {
    context.args.data.userId = context.req.accessToken.userId;
  });
  
  Ad.getAdStats = async function(options, req, res) {
    const eventIds = req.query.eventIds.split(',');

    if (!eventIds || !eventIds.length) {
      req.res.status(422);

      return Promise.reject({ message: 'eventIds[] are required.' });
    }

    try {
      const result = {};

      for (const eventId of eventIds) {
        result[eventId] = await Ad.count({ eventId });
      }
      
      return Promise.resolve(result);
    } catch (error) {
      return Promise.reject(error);
    }
  };

  Ad.remoteMethod('getAdStats', {
    accepts: [
      {
        arg: 'options',
        type: 'object',
        http: 'optionsFromRequest',
      },
      {
        arg: 'req',
        type: 'object',
        http: {
          source: 'req',
        },
      },
      {
        arg: 'res',
        type: 'object',
        http: {
          source: 'res',
        },
      },
    ],
    http: {
      verb: 'get',
      path: '/stats',
    },
    returns: {
      root: true,
    },
  });

  Ad.getUniqueEventIds = async function(options, req, res) {
    try {
      const allAds = await Ad.find();
      const eventIds = allAds.map((ad) => ad.eventId);
      const uniqueEventIds = [...new Set(eventIds)];
      
      return Promise.resolve(uniqueEventIds);
    } catch (error) {
      return Promise.reject(error);
    }
  };

  Ad.remoteMethod('getUniqueEventIds', {
    accepts: [
      {
        arg: 'options',
        type: 'object',
        http: 'optionsFromRequest',
      },
      {
        arg: 'req',
        type: 'object',
        http: {
          source: 'req',
        },
      },
    ],
    http: {
      verb: 'get',
      path: '/unique-event-ids',
    },
    returns: {
      root: true,
    },
  });
};
