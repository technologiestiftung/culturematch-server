module.exports = function(Like) {
  Like.getLikeStats = async function(options, req) {
    const entityIds = req.query.entityIds.split(',');

    if (!entityIds || !entityIds.length) {
      req.res.status(422);

      return Promise.reject({ message: 'entityIds[] are required.' });
    }

    try {
      const result = {};
      let ownLikedIds = [];
      let ownLikes = [];

      if (options.accessToken && options.accessToken.userId) {
        ownLikes = await Like.find({ where: { userId: options.accessToken.userId } });
        ownLikedIds = ownLikes.map((like) => like.entityId);
      }

      for (const entityId of entityIds) {
        const liked = ownLikedIds.includes(entityId);
        let likeId;
        let type;

        ownLikes.some((like) => {
          if (like.entityId === entityId) {
            likeId = like.id;
            type = like.type;

            return true;
          }
        });

        result[entityId] = {
          count: await Like.count({ entityId }),
          liked: liked,
          likeId: likeId,
          type: type,
        };
      }

      return Promise.resolve(result);
    } catch (error) {
      return Promise.reject(error);
    }
  };

  Like.remoteMethod('getLikeStats', {
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
      path: '/stats',
    },
    returns: {
      root: true,
    },
  });
};
