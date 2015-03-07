var builder = require('xmlbuilder');
var _ = require('lodash');

exports.buildXMLFromLinks = function (links) {
    var xml = builder.create(baseXML);
    var channel = xml.ele({
        channel: {
            title: 'Торрент трекер Кинозал.ТВ',
            link: 'http://kinozal.tv/',
            description: 'Торрент трекер Кинозал.ТВ - фильмы, новинки кино, скачать фильмы, афиша кино',
            language: 'ru-ru'
        }
    });
    _.forEach(links, function (link) {
        channel.ele({
            item: {
                guid: link.torrent,
                title: link.title[0],
                link: link.torrent,
                pubDate: link.pubDate.length > 0 ? link.pubDate[0] : '',
                category: link.category.length > 0 ? link.category[0] : '-'
            }
        });
    });
    return xml;
};

var baseXML = {
    rss: {
        '@xmlns:atom': 'http://www.w3.org/2005/Atom',
        '@version': '2.0',
    }
};
