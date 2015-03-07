var formidable = require('formidable')
var express = require('express');
var request = require('superagent');
var fs = require('fs');
var xml = require('xml2js');
var q = require('q');
var _ = require('lodash');
var NodeCache = require('node-cache');
var rssBuilder = require('../rss-builder');
var logger = require('winston');

var router = express.Router();
var cache = new NodeCache();
var idRegex = /(?!\?id=)\d+/g;
var torrentBaseUrl = 'http://kinozal.tv/download.php/{0}/[kinozal.tv]id{0}.torrent';

router.get('/link/:cridentials/:movieId/file.torrent', function (req, res) {
    logger.info('got request for torrent file %s, with cridentials %s', req.params.movieId, req.params.cridentials);
    var parts = req.params.cridentials.split(':');
    var cridentials = {
        username: parts[0],
        password: parts[1]
    };

    var authenticationDetails = cache.get(req.params.cridentials);
    if (!_.isEmpty(authenticationDetails)) {
        retrieveTorrentFile(req.params.movieId, authenticationDetails[req.params.cridentials]).then(function (response) {
            logger.info('retrieved file %s', req.params.movieId);
            res.set('Content-Disposition', 'attachment; filename="' + req.params.movieId + '.torrent"').send(response);
            logger.info('sent file to client');
        });
        return;
    }

    login(cridentials)
        .then(retrieveTorrentFile.bind(null, req.params.movieId))
        .then(function (data) {
            //send file
            res.set('Content-Disposition', 'attachment; filename="' + req.params.movieId + '.torrent"').send(data);
        });
});

router.get('/:cridentials/rss.xml', function (req, res) {
    getRSS()
        .end(function (err, response) {
            parseXML(err, response)
                .then(buildLinks.bind(null, req.params.cridentials))
                .then(function (links) {
                    res.set('content-type', 'text/xml');
                    res.send('<?xml version="1.0" encoding="utf-8"?>' + links.toString());
                })
                .catch(function (err) {
                    res.status(500).end(err);
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
            torrent: 'http://localhost:3000/rss/link/' + cridentials + '/' + matches[0] + '/file.torrent',
            pubDate: item.pubDate,
            category: item.category
        }
    });

    return rssBuilder.buildXMLFromLinks(links);
}

function retrieveTorrentFile(movieId, authentication) {
    var deferred = q.defer();
    var torrentUrl = torrentBaseUrl.replace(/\{0\}/g, movieId);

    request.get(torrentUrl)
        .parse(function (rq, callback) {
            var data = '';
            rq.setEncoding('ascii');
            rq.on('data', function (chunk) {
                data += chunk;
            });
            rq.on('end', function () {
                deferred.resolve(data);
            });
        })
        .set('cookie', authentication.uid + ' ' + authentication.pass)
        .end(function (err, res) {
        });

    return deferred.promise;
}

function login(cridentials) {
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
            var authentication = {
                uid: res.headers['set-cookie'][0].match(/uid=\d+;/g)[0],
                pass: res.headers['set-cookie'][1].match(/pass=\w+;/g)[0]
            };
            cache.set(cridentials.username + ':' + cridentials.password, authentication);
            deferred.resolve(authentication);
        });

    return deferred.promise;
}

module.exports = router;
