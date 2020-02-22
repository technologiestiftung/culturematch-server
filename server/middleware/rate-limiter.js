const Redis = require('ioredis');
const redisClient = new Redis({ enableOfflineQueue: false });

const { RateLimiterRedis } = require('rate-limiter-flexible');

module.exports = function (options) {
  const limiter = new RateLimiterRedis({
    keyPrefix: 'rate-limiter',
    storeClient: redisClient,
    points: parseInt(process.env.RATE_LIMITER_POINTS || 5),
    duration: parseInt(process.env.RATE_LIMITER_DURATION || 10),
    blockDuration: parseInt(process.env.RATE_LIMITER_BLOCK_DURATION || 30),
  });

  redisClient.on('error', (error) => {
    console.log('redis error', error);
  });

  return function rateLimiter(req, res, next) {
    if (options.endpoints.indexOf(req._parsedUrl.pathname) === -1) {
      return next();
    }

    limiter.consume(req.headers['x-real-ip'])
      .then(() => {
        next();
      })
      .catch(() => {
        res.status(429).send({ error: 'Too many requests.' });
      });
  };
};
