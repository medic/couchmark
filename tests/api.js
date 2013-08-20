var _ = require('underscore'),
    follow = require('follow'),
    sinon = require('sinon'),
    cradle = require('cradle'),
    changeling = require('../index'),
    feedStub;

exports['api is a function'] = function(test) {
    test.ok(_.isFunction(changeling));
    test.equals(changeling.length, 2);
    test.done();
};

exports["returns follow's Feed object"] = function(test) {
    var feed = changeling({
        db: 'http://localhost:5984'
    }, function() {});

    test.ok(_.isObject(feed));
    test.ok(_.isFunction(feed.follow));
    test.ok(_.isFunction(feed.on));
    test.done();
};

exports['does not call follow on feed if immediate: false'] = function(test) {
    var opts,
        feed,
        feedFn,
        followFn;

    feed = {
        follow: function() {}
    };

    followFn = sinon.stub(feed, 'follow');

    feedFn = sinon.stub(follow, 'Feed').returns(feed);

    changeling({
        db: 'http://localhost:5984',
        immediate: false
    }, function() {});
    test.equals(followFn.called, false);

    // immediate filtered from args to `follow`
    opts = feedFn.getCall(0).args[0];
    test.equals(opts.immediate, undefined);

    feedFn.restore();

    test.done();
};

exports['calls follow on feed if immediate: true'] = function(test) {
    var feed,
        followFn;

    feed = {
        follow: function() {}
    };

    followFn = sinon.stub(feed, 'follow');

    sinon.stub(follow, 'Feed').returns(feed);

    changeling({
        db: 'http://localhost:5984',
        immediate: true
    }, function() {});
    test.equals(followFn.called, true);

    follow.Feed.restore();

    test.done();
};

exports['establishes cradle connection to changeling db'] = function(test) {
    var call,
        cradleConn,
        databaseFn,
        conn;

    cradleConn = {
        database: function() {}
    };
    databaseFn = sinon.stub(cradleConn, 'database').returns({});
    conn = sinon.stub(cradle, 'Connection').returns(cradleConn);

    changeling({
        db: 'http://admin:admin@localhost:1234/wumpus',
        changelingDb: 'what'
    });

    test.ok(conn.called);

    call = conn.getCall(0);
    test.equals(call.args[0], 'http://localhost');
    test.equals(call.args[1], 1234);
    test.same(call.args[2], {
        auth: {
            username: 'admin',
            password: 'admin'
        }
    });
    test.equals(databaseFn.getCall(0).args[0], 'what');

    conn.restore();

    test.done();
}

exports['calls create, saveDesign if exists is false'] = function(test) {
    var db,
        create,
        exists,
        saveDesign;

    db = {
        create: function() {},
        exists: function() {}
    };
    create = sinon.stub(db, 'create').callsArgWithAsync(0, null);
    exists = sinon.stub(db, 'exists').callsArgWithAsync(0, null, false);

    saveDesign = sinon.stub(changeling, 'saveDesign').callsArgWithAsync(1, null);

    test.ok(_.isFunction(changeling.initializeChangelingDb));

    changeling.initializeChangelingDb(db, function(err) {
        test.equals(err, null);
        test.equals(exists.called, true);
        test.equals(create.called, true);
        test.equals(saveDesign.called, true);

        saveDesign.restore();

        test.done();
    });
};


exports['does not call create, does call saveDesign if exists is true'] = function(test) {
    var db,
        create,
        exists,
        saveDesign;

    db = {
        create: function() {},
        exists: function() {}
    };
    create = sinon.stub(db, 'create').callsArgWithAsync(0, null);
    exists = sinon.stub(db, 'exists').callsArgWithAsync(0, null, true);

    saveDesign = sinon.stub(changeling, 'saveDesign').callsArgWithAsync(1, null);

    test.ok(_.isFunction(changeling.initializeChangelingDb));

    changeling.initializeChangelingDb(db, function(err) {
        test.equals(err, null);
        test.equals(exists.called, true);
        test.equals(create.called, false);
        test.equals(saveDesign.called, true);

        saveDesign.restore();

        test.done();
    });
};

exports['saveDesign gets the existing design doc, saves because not found'] = function(test) {
    var db,
        get,
        save;

    db = {
        get: function() {},
        save: function() {}
    };

    get = sinon.stub(db, 'get').callsArgWithAsync(1, {
        error: 'not_found'
    });
    save = sinon.stub(db, 'save').callsArgWithAsync(2, null, {});

    changeling.saveDesign(db, function(err) {
        test.equals(err, null);
        test.ok(get.called);
        test.ok(save.called);

        test.done();
    });
};

exports['saveDesign gets the existing design doc, saves because different'] = function(test) {
    var db,
        get,
        save;

    db = {
        get: function() {},
        save: function() {}
    };

    get = sinon.stub(db, 'get').callsArgWithAsync(1, null, {});
    save = sinon.stub(db, 'save').callsArgWithAsync(2, null, {});
    sinon.stub(changeling, 'compareDesigns').returns(true);

    changeling.saveDesign(db, function(err) {
        test.equals(err, null);
        test.ok(get.called);
        test.ok(save.called);

        changeling.compareDesigns.restore();
        test.done();
    });
};

exports['saveDesign gets the existing design doc, does not save because same'] = function(test) {
    var db,
        get,
        save;

    db = {
        get: function() {},
        save: function() {}
    };

    get = sinon.stub(db, 'get').callsArgWithAsync(1, null, {});
    save = sinon.stub(db, 'save').callsArgWithAsync(2, null, {});
    sinon.stub(changeling, 'compareDesigns').returns(false);

    changeling.saveDesign(db, function(err) {
        test.equals(err, null);
        test.ok(get.called);
        test.equals(save.called, false);

        changeling.compareDesigns.restore();
        test.done();
    });
};

