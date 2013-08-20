var _ = require('underscore'),
    cradle = require('cradle'),
    follow = require('follow'),
    url = require('url'),
    design = require('./design');

module.exports = function(options, callback) {
    var db,
        feed,
        opts = _.omit(options, 'immediate', 'changelingDb');

    feed = new follow.Feed(opts);

    db = module.exports.getChangelingDb(options);

    if (options.immediate) {
        feed.follow();
    }
    return feed;
};

_.extend(module.exports, {
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
    }
});
