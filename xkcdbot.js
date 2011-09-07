var https = require('https'),
    irc = require('irc'),
    qs = require('querystring');

var ircClient = new irc.Client('irc.mozilla.org', 'xkcdbot', {
    'channels': ['#webdev', '#sumodev'],
}).addListener('error', function(err) {
    if (err.rawCommand != '421') console.log(err);
}).addListener('message', function(from, to, msg) {
    if (to.indexOf('#') != 0) return;
    var parts = msg.trim().split(/\s+/);
    if (parts[0] != '!xkcd') return;
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
            ircClient.say(to, title + ' ' + url);
        });
    });
});
