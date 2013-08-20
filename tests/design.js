var _ = require('underscore'),
    follow = require('follow'),
    sinon = require('sinon'),
    changeling = require('../index'),
    design = require('../design');

_.defaults(global, {
    emit: function() {}
});

exports['equalDesigns, returns true when views the same'] = function(test) {
    test.ok(changeling.equalDesigns({
        views: {}
    }, {
        views: {}
    }));

    test.ok(changeling.equalDesigns({
        views: {
            quack: {
                map: 'function() {}'
            }
        }
    }, {
        views: {
            quack: {
                map: 'function() {}'
            }
        }
    }));

    test.done();
}

exports['equalDesigns, returns false when different'] = function(test) {
    test.equals(changeling.equalDesigns({
        views: {
            quack: {
                map: 'function() {}'
            }
        }
    }, {
        views: {
            quack: {
                map: 'function(a) {}'
            }
        }
    }), false);
    test.equals(changeling.equalDesigns({}, {
        views: {}
    }), false);

    test.done();
}

exports['design has stream view'] = function(test) {
    test.ok(_.isObject(design.views));
    test.ok(_.isObject(design.views.stream));
    test.ok(_.isString(design.views.stream.map));
    test.done();
}

exports['stream view does not match blank object'] = function(test) {
    var emit = sinon.stub(global, 'emit'),
        map = eval('(' + design.views.stream.map + ')');

    map({});

    test.equals(emit.called, false);
    emit.restore();
    test.done();
}

exports['stream view matches object with type stream'] = function(test) {
    var call,
        emit = sinon.stub(global, 'emit'),
        map = eval('(' + design.views.stream.map + ')');

    map({
        type: 'stream',
        stream: 'x',
        seq_no: 12
    });

    test.equals(emit.called, true);

    call = emit.getCall(0);

    test.same(call.args[0], ['x', 12]);
    test.same(call.args[1], null);

    emit.restore();
    test.done();
}