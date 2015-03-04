var express = require('express');
var request = require('superagent');
var xml = require('xml2js');
var q = require('q');
var _ = require('lodash');

var router = express.Router();
var idRegex = /(?!\?id=)\d+/g;

/* GET users listing. */
router.get('/:cridentials', function (req, res) {
    var parts = req.params.cridentials.split(':');
    var cridentials = {
        username: parts[0],
        password: parts[1]
    };

    getRSS()
        .end(function (err, response) {
            parseXML(err, response)
                .then(buildLinks)
                .then(function (links) {
                    res.json(links);
                })
                .catch(function (err) {
                    res.status(500).end();
                })
        })

});

function getRSS() {
    return request.get('http://kinozal.tv/rss.xml');
}

function parseXML(err, res) {
    var deferred = q.defer();
    if (err) {
        deferred.reject(err);
        return;
    }

    xml.parseString(res.text, function (err, obj) {
        console.log('parsed');
        if (err) {
            deferred.reject(err);
            return;
        }

        deferred.resolve(obj);
    });

    return deferred.promise;
}

function buildLinks(obj) {
    var links = _.map(obj.rss.channel[0].item, function (item) {
        var matches = item.link[0].match(idRegex);
        if (matches.length === 0) {
            return null;
        }
        return {
            title: item.title,
            pageLink: 'http://localhost:3000/rss/link/' + matches[0]
        }
    });

    return links;
}

module.exports = router;
