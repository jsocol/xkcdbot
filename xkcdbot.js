#!/usr/bin/env node

var https = require('https'),
    irc = require('irc'),
    qs = require('querystring'),
    options = require('nomnom').opts({
        host: {
            abbr: 'H',
            help: 'IRC network to connect to.'
        },
        nick: {
            abbr: 'n',
            default: 'xkcdbot',
            help: 'IRC nickname.'
        },
        channels: {
            abbr: 'c',
            help: 'Channels to join. Comma-separated, no #.'
        }
    }).parseArgs();


var channels = options.channels.split(',');
for (var i = 0; i < channels.length; i++) {
    var c = channels[i];
    channels[i] = '#' + c.trim();
}

var nickRe = new RegExp('^' + options.nick + ':?$');

var ircClient = new irc.Client(options.host, options.nick, {
    'channels': channels,
}).addListener('error', function(err) {
    if (err.rawCommand != '421') console.log(err);
}).addListener('message', function(from, to, msg) {
    if (to.indexOf('#') != 0) return;
    var parts = msg.trim().split(/\s+/);
    if (!(parts[0] == '!xkcd' || parts[0].match(nickRe)))
        return;
    parts.shift();
    parts.push('site:xkcd.com');
    var query = {
        'q': parts.join(' '),
        'v': '1.0'
    };
    https.get({
        'host': 'ajax.googleapis.com',
        'path': '/ajax/services/search/web?' + qs.stringify(query)
    }, function(res) {
        if (res.statusCode != 200) return;
        var blob = '';
        res.on('data', function(chunk) {
            blob += chunk;
        }).on('end', function() {
            var data = {};
            try {
                data = JSON.parse(blob);
            } catch (e) {
                return;
            }
            if (data.responseStatus != 200) return;
            var url, title, results = data.responseData.results;
            if (results.length == 0) return;
            for (var i = 0; i < results.length; i++) {
                var u = results[i].url;
                if (u != 'http://xkcd.com/' &&
                    u.indexOf('http://xkcd.com/') == 0) {
                    url = u;
                    title = results[i].titleNoFormatting;
                    break;
                }
            }
            if (title && url) {
                ircClient.say(to, title + ' ' + url);
            }
        });
    });
}).addListener('invite', function(channel, from) {
    ircClient.join(channel, function() {});
});
