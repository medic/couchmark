var _ = require('underscore'),
    async = require('async'),
    cradle = require('cradle'),
    follow = require('follow'),
    url = require('url'),
    design = require('./design');

module.exports = function(options, callback) {
    var feed = new module.exports.Feed(options);

    feed.on('error', function(err) {
        callback.call(feed, err);
    });
    feed.on('change', function(change) {
        callback.call(feed, null, change);
    });

    // Give the caller a chance to hook into any events.
    process.nextTick(function() {
        feed.follow();
    });

    return feed;
};

_.extend(module.exports, {
    Feed: function(options) {
        var db,
            feed,
            opts = _.omit(options, 'stream', 'changelingDb'),
            queue = async.queue(module.exports.updateSeq, 1);

        feed = new follow.Feed(opts);

        db = module.exports.getChangelingDb(options);

        module.exports.initializeChangelingDb(db, function() {
            db.view('changeling/stream', {
                descending: true,
                limit: 1,
                startkey: [ opts.stream, {} ]
            }, function(err, result) {
                var since,
                    latest;

                if (!err) { // if error, start from 0
                    latest = _.first(result.rows);
                    since = latest && latest.value;
                }

                if (since) {
                    feed.since = since;
                }
            });

            feed.on('change', function(change) {
                queue.push({
                    db: db,
                    stream: opt.stream,
                    seq: change.seq
                });
            });
        });

        return feed;
    },
    getChangelingDb: function(options) {
        var parsedUrl = url.parse(options.db),
            auth = parsedUrl.auth,
            username,
            password,
            opts = {}
            dbName = options.changelingDb || 'changeling';

        username = auth && auth.substring(0, auth.indexOf(':'));
        password = auth && auth.substring(auth.indexOf(':') + 1);

        if (username && password) {
            opts.auth = {
                username: username,
                password: password
            };
        }

        return new cradle.Connection(parsedUrl.protocol + '//' + parsedUrl.hostname, parsedUrl.port, opts).database(dbName);
    },
    equalDesigns: function(db, generated) {
        var a = _.result(db, 'views'),
            b = _.result(generated, 'views');

        return _.isEqual(a, b);
    },
    saveDesign: function(db, callback) {
        db.get('_design/changeling', function(err, doc) {
            if (err) {
                if (err.error === 'not_found') {
                    db.save('_design/changeling', design, callback);
                } else {
                    callback(err);
                }
            } else {
                if (module.exports.equalDesigns(doc, design)) {
                    callback(null);
                } else {
                    db.save('_design/changeling', design, callback);
                }
            }
        });
    },
    initializeChangelingDb: function(db, callback) {
        db.exists(function(err, exists) {
            if (err) {
                callback(err);
            } else if (exists) {
                module.exports.saveDesign(db, callback);
            } else {
                db.create(function(err) {
                    if (err) {
                        callback(err);
                    } else {
                        module.exports.saveDesign(db, callback);
                    }
                });
            }
        });
    },
    updateSeq: function(change, callback) {
        change.db.save({
            stream: change.stream,
            seq_no: change.seq
        }, function(err) {
            callback(); // "optimistic"; ignores errors
        });
    }
});
