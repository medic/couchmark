module.exports = {
    views: {
        stream: {
            map: (function(doc) {
                if (doc.type === 'stream') {
                    emit([doc.stream, doc.seq_no], null);
                }
            }).toString()
        }
    }
};
