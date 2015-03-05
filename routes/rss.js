var express = require('express');
var request = require('superagent');
var xml = require('xml2js');
var q = require('q');
var _ = require('lodash');
var NodeCache = require('node-cache');

var router = express.Router();
var cache = new NodeCache();
var idRegex = /(?!\?id=)\d+/g;
var torrentBaseUrl = 'http://kinozal.tv/download.php/{0}/[kinozal.tv]id{0}.torrent';


/* GET users listing. */
router.post('/test', function (req, res) {
    console.log(req.headers);
    console.log(req.body);
    res.send('');
});

router.get('/link/:cridentials/:movieId/file.torrent', function (req, res) {
    var parts = req.params.cridentials.split(':');
    var cridentials = {
        username: parts[0],
        password: parts[1]
    };

    var authenticationDetails = cache.get(req.params.cridentials);
    console.log(authenticationDetails);
    if (!_.isEmpty(authenticationDetails)) {
        retrieveTorrentFile(req.params.movieId).then(function (torrentFile) {
            //send file
            res.send(torrentFile);
        });
        return;
    }

    login(cridentials, req.params.movieId)
        .then(retrieveTorrentFile)
        .then(function (torrentFile) {
            //send file
            res.send(torrentFile);
        });
});

router.get('/:cridentials/rss.xml', function (req, res) {
    getRSS()
        .end(function (err, response) {
            parseXML(err, response)
                .then(buildLinks.bind(null, req.params.cridentials))
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

function buildLinks(cridentials, obj) {
    var links = _.map(obj.rss.channel[0].item, function (item) {
        var matches = item.link[0].match(idRegex);
        if (matches.length === 0) {
            return null;
        }
        return {
            title: item.title,
            pageLink: 'http://localhost:3000/rss/link/' + cridentials + '/' + matches[0] + '/file.torrent'
        }
    });

    return links;
}

function retrieveTorrentFile(movieId) {
    var deferred = q.defer();

    var torrentUrl = torrentBaseUrl.replace(/\{0\}/g, movieId);
    //request.get(torrentUrl)
    //    .set
    deferred.resolve(torrentUrl);

    return deferred.promise;
}

function login(cridentials, movieId) {
    var deferred = q.defer();

    request.post('http://kinozal.tv/takelogin.php')
        .send(cridentials)
        .type('form')
        .redirects(0)
        .end(function (err, res) {
            if (err) {
                deferred.reject(err);
                return;
            }
            console.log(res.headers);
            var authentication = {
                uid: res.headers['set-cookie'][0].match(/uid=\d+;/g)[0],
                pass: res.headers['set-cookie'][1].match(/pass=\w+;/g)[0]
            };
            console.log(authentication);
            cache.set(cridentials.username + ':' + cridentials.password, authentication);
            deferred.resolve(movieId);
        });

    return deferred.promise;
}

module.exports = router;
