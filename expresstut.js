var express = require('express');

var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended:true }));


app.disable('x-powered-by');

var handlebars = require('express-handlebars').create({defaultLayout:'main'});

app.engine('handlebars', handlebars.engine);

app.set('view engine', 'handlebars');

var mongodb = require('mongodb');

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

app.get('/thelist', function (req, res) {
	var MongoClient = mongodb.MongoClient;
	var url = 'mongodb://localhost:27017/sampsite';

	MongoClient.connect(url, function (err, db) {
		if(err) {
			console.log('unable to connect to the server', err);
		}
		else {
			console.log('Connection established');

			var collection = db.collection('students');

			collection.find({}).toArray(function (err, result) {
				if(err) {
					res.send(err);
				}
				else if (result.length) {
					res.send(result);
				}
				else {
					res.send('no documents found');
				}

				db.close();
			});
		}
	});
});

app.get('/newstudent', function (req, res) {
	res.render('newstudent');
});

app.post('/addstudent', function (req, res) {
	var MongoClient = mongodb.MongoClient;
	var url = 'mongodb://localhost:27017/sampsite';
	MongoClient.connect(url, function (err, db) {
		if(err) {
			console.log('unable to connect to server', err);
		}
		else {
			console.log('connected to server');

			var collection = db.collection('students');

			console.log(req.body);

			var student1 = {student: req.body.name, gpa: req.body.gpa};

			collection.insert([student1], function (err, result) {
				if(err) {
					console.log(err);
				}
				else {
					res.redirect("thelist");
				}
				db.close();
			});
		}

	});

});


app.listen(app.get('port'), function() {
	console.log('Express started press Ctrl-C to terminate');
});