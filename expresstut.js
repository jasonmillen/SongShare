var express = require('express');

var app = express();

app.disable('x-powered-by');

var handlebars = require('express-handlebars').create({defaultLayout:'main'});

app.engine('handlebars', handlebars.engine);

app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/static'));

var SpotifyWebApi = require('spotify-web-api-node');
var spotifyApi = new SpotifyWebApi();

app.get('/', function (req, res) {
	res.render('home');
});

app.get('/home', function (req, res) {
	res.sendFile(__dirname + '/views/test.html');
});

app.get('/search', function (req, res) {
	res.render('search');
});

app.get('/about', function (req, res) {
	res.render('about');
});

app.get('/song-search', function (req, res) {
	res.render('song-search');
});

app.get('/spotify/:track/:artist', function (req, res) {

	var searchString = 'track:' + req.params.track + ' artist:' + req.params.artist;
	spotifyApi.searchTracks(searchString, { limit: 1  })
	  .then(function(data) {
	    console.log('Search tracks by "Love" in the artist name', data.body);

	    var song_ = data.body.tracks.items[0].name;
	    var artist_ = data.body.tracks.items[0].artists[0].name;
	    var uri_ = data.body.tracks.items[0].uri;

	    var resData = {
	    	song: song_,
	    	artist: artist_,
	    	uri: uri_
	    }

	    console.log(resData);
	    res.render('song', {uri: uri_});
	  }, function(err) {
	    console.log('Something went wrong!', err);
	    res.send('bad song');
	  });

});

app.listen(app.get('port'), function() {
	console.log('Express started press Ctrl-C to terminate');
});