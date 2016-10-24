var express = require('express');

var app = express();

app.disable('x-powered-by');

var handlebars = require('express-handlebars').create({defaultLayout:'main'});

app.engine('handlebars', handlebars.engine);

app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);


app.get('/', function (req, res) {
	res.render('home');
});

app.get('/search', function (req, res) {
	res.render('search');
});

app.get('/about', function (req, res) {
	res.render('about');
});


app.listen(app.get('port'), function() {
	console.log('Express started press Ctrl-C to terminate');
});