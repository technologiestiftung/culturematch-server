/**
 * Sets headers used for client-side pagination
 */
module.exports = function (app) {
  console.info('[BOOT] > Enabling pagination headers');

  var remotes = app.remotes();

  // Set X-Total-Count for all search requests
  remotes.after('*.find', function (ctx, next) {
    var filter;
    if (ctx.args && ctx.args.filter) {
      try {
        filter = JSON.parse(ctx.args.filter).where;
      } catch (e) {
        filter = ctx.args.filter.where;
      }
    }

    if (!ctx.res._headerSent) {
      this.count(filter, function (err, count) {
        ctx.res.set('X-Total-Count', count);
        next();
      });
    } else {
      next();
    }
  });
};

