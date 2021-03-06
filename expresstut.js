/*Song Share
 *
 *
 */

var express = require('express');
var request = require('request');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var Db = require('mongodb').Db,
    ObjectID = require('mongodb').ObjectID;

var _ = require('underscore');

var client_id = '4424b4c861ab4ebbba8c5a432253c2eb'; // Your client id
var client_secret = 'bb5ae10bea384cea85639e2a8c4ec7c3'; // Your secret
var redirect_uri = 'http://localhost:3000/callback'; // Your redirect uri

//user specific stuff?
var user_info = {
    id: null,
    access_token: null,
    refresh_token: null,
    name: null,
    country: null,
    email: null,
    href: null,
    images: [],
    product: null,
    type: null,
    user: null,
    most_recent_home_group: null,
    groups: []
};

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended:true }));
app.use(bodyParser.json());


app.disable('x-powered-by');

var handlebars = require('express-handlebars').create({defaultLayout:'main'});

app.engine('handlebars', handlebars.engine);

app.set('view engine', 'handlebars');

var mongodb = require('mongodb');
var mongodbURL = 'mongodb://localhost:27017/SongShare';

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/public'))
     .use(cookieParser());

// START - spotify functions

app.get('/login', function(req, res) {

    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    var scope = 'user-read-private user-read-email playlist-modify-private playlist-modify-public';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});

app.get('/logout', function(req, res) {
    user_info.id = null;
    user_info.access_token = null;
    user_info.refresh_token = null;
    user_info.name = null;
    user_info.most_recent_home_group = null;
    user_info.groups = null;

    res.redirect('/');
});

app.get('/finish_login', function(req, res) {

        var options = {
            url: 'https://api.spotify.com/v1/me',
            headers: { 'Authorization': 'Bearer ' + user_info.access_token },
            json: true
        };

        request.get(options, function(error, response, body) {
            user_info.id = body.id;
            user_info.name = body.display_name;
                user_info.country = body.country;
                user_info.email = body.email;
                user_info.href = body.href;
                user_info.images = body.images;
                user_info.product = body.product;
                user_info.type = body.type;
                user_info.uri = body.uri;

            console.log(body);
            res.redirect('/');
            console.log('done');
        });
});

app.get('/callback', function(req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                        refresh_token = body.refresh_token;

                //not sure if this is best way to do this
                user_info.access_token = access_token;
                user_info.refresh_token = refresh_token;
                console.log(body); 

                // var options = {
                //   url: 'https://api.spotify.com/v1/me',
                //   headers: { 'Authorization': 'Bearer ' + access_token },
                //   json: true
                // };

                // // use the access token to access the Spotify Web API
                // // request.get(options, function(error, response, body) {
                // //   user_info.user_id = body.id;
                // //   user_info.name = body.name;
                // //   console.log(body);
                // //   //res.redirect('/');
                // //   console.log('done');
                // // });

                // we can also pass the token to the browser to make requests from there

                res.redirect('/finish_login');
            console.log('before');
            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

app.get('/created_group', function (req, res) {
        res.render('created_group');
});

app.get('/create_group', function (req, res) {
    if(user_info.id == null) {
            res.redirect('/');
    }
    else {
            var data = {
                user_info: user_info
            };
            res.render('create_group', data);
    }
});

app.post('/create_group', function (req, res) {
    if(user_info.id == null) { //can't create group if not logged in
            res.redirect('/');
    }
    else {
        var group_data = {
                name: req.body.groupname,
                password: req.body.password
        };
        console.log(group_data.name + " - " + group_data.password);

        var MongoClient = mongodb.MongoClient;
        MongoClient.connect(mongodbURL, function (err, db) {
            if(err) {
                console.log('unable to connect to the server', err);
            }
            else {
                console.log('Connection established from create_group');

                var collection = db.collection('groups');

                var newGroup = {
                    creator: user_info.id,
                    name: group_data.name,
                    password: group_data.password,
                    members: [user_info.id]
                };


                var newGroupId = null;
                collection.insertOne(newGroup, function (err, result) {
                    if(err) {
                            res.send(err);
                    }
                    else {
                        var newGroupId = String(result.ops[0]._id);
                        var groupMessages = db.collection('groupMessages');
                        var newGroupMessages = {
                            groupId: newGroupId,
                            messages: []
                        };

                        groupMessages.insertOne(newGroupMessages, function (err, result) {
                            if(err) {
                                res.send(err);
                            }
                            else {
                                res.redirect('/');
                                db.close();
                            }
                        });
                    }

                });
            }
        });
    }
});

app.get('/refresh_token', function(req, res) {

    // requesting access token from refresh token
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});

// END - spotify functions

app.get('/test', function (req, res) {
    res.render('test', user_info);
});


app.get('/', function (req, res) {
        if(user_info.id == null) {
                var data = {
                        user_info: user_info
                };
                res.render('home', data);
        }
        else {
                var MongoClient = mongodb.MongoClient;
                MongoClient.connect(mongodbURL, function (err, db) {
                        if(err) {
                                console.log('unable to connect to server', err);
                        }
                        else {
                                // var collection = db.collection('groups');
                                // collection.find({}).toArray(function (err, result) {
                                //         if(err) {
                                //                 res.send(err);
                                //         }
                                //         else if(result.length) {
                                //                 var data = {
                                //                         user_info: user_info,
                                //                         groups: result
                                //                 };
                                //                 res.render('home', data);
                                //         }
                                //         else {
                                //                 var data = {
                                //                         user_info: user_info
                                //                 };
                                //                 res.render('home', data);
                                //         }
                                // });

                                var collection_users = db.collection('users');
                                collection_users.find({username: user_info.id}).toArray(function (err, result) {
                                    if(err) {
                                        res.send(err);
                                    }
                                    else if(result.length != 1) {
                                        res.send('problem finding user in database');
                                    }
                                    else if(result[0].groups.length == 0) {
                                        var data = {
                                            user_info: user_info
                                        };
                                        res.render('home', data);
                                    }
                                    else {
                                        var groupIds = result[0].groups;
                                        var groups = [];

                                        var finished = _.after(groupIds.length, doRender);
                                        var collection_groups = db.collection('groups');

                                        for(var i = 0; i < groupIds.length; i++) {
                                            collection_groups.findOne({_id: groupIds[i]}, function (err, result) {
                                                if(err) {
                                                    console.log(err);
                                                }
                                                else {
                                                    groups.push(result);
                                                    finished();
                                                }
                                            });
                                        }

                                        function doRender() {
                                            user_info.groups = groups;

                                            var data = {
                                                user_info: user_info,
                                                groups: groups
                                            };

                                            res.render('home', data);
                                        }

                                    }
                                });
                        }
                });
        }

});

app.get('/myprofile', function (req, res) {
        if(user_info.id == null) {
                res.redirect('/');
        }
        else {
                var data = {
                        user_info: user_info
                };
                res.render('myprofile', data);
        }
});

app.get('/search', function (req, res) {
    var data = {
        user_info: user_info,
        access_token: user_info.access_token
    };

    res.render('search', data);
});

app.get('/about', function (req, res) {
    var data = {
        user_info: user_info
    };
    res.render('about', data);
});

app.get('/groupData', function (req, res) {

        var groupName = req.query.groupName;
        var groupId = ObjectID(req.query.groupId);

        user_info.most_recent_home_group = {
            groupName: groupName,
            groupId: groupId
        };

        var MongoClient = mongodb.MongoClient;

        MongoClient.connect(mongodbURL, function (err, db) {
                if(err) {
                        console.log('unable to connect to the server', err);
                }
                else {
                        console.log('Connection established in groupData');

                        //var collection = db.collection('groupMessages');
                        var collection = db.collection('messages');

                        collection.find({groupId: groupId}).toArray(function (err, result) {
                                if(err) {
                                        res.send(err);
                                }
                                res.send(result);
                                // else if (result.length) {
                                //         console.log(result.length);
                                //         // var messages = result[0].messages;
                                //         // console.log(messages);
                                //         // res.send(messages);

                                //         res.send(result);
                                // }
                                // else {
                                //         res.send('no documents found');
                                // }

                                db.close();
                        });
                }
        });

});


app.post('/postSong', function (req, res) {

    var groupId = req.body.groupId;
    var trackId = req.body.trackId;

    console.log('post song' + groupId + ", " + trackId);

    var newTrack = {
        senderId: user_info.id,
        type: "track",
        trackId: trackId,
        upvotes: [],
        date: new Date(),
        groupId: ObjectID(groupId)
    };

    var MongoClient = mongodb.MongoClient;
    MongoClient.connect(mongodbURL, function (err, db) {
        if(err) {
            console.log('error connecting to database');
            res.send('error could not add song');
        }
        else {
            console.log('connection established in postSong');

            var collection = db.collection('messages');
            collection.insert(newTrack, function (err, result) {
                if(err) {
                    console.log('could not add song');
                    res.send('error could not add song');
                }
                else {
                    res.send('song successfully added');
                }

                db.close();
            });
        }

    });

});


app.get('/thelist', function (req, res) {
    var MongoClient = mongodb.MongoClient;
    var url = 'mongodb://localhost:27017/sampsite';

    MongoClient.connect(url, function (err, db) {
        if(err) {
            console.log('unable to connect to the server', err);
        }
        else {
            console.log('Connection established from the list');

            var collection = db.collection('students');

            collection.find({}).toArray(function (err, result) {
                if(err) {
                    res.send(err);
                }
                else if (result.length) {
                    return res.send(result);
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


