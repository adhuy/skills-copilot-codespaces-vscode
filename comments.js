// create web server
// node comments.js
// open browser and go to http://localhost:8080
// type in comment and hit submit

// require express
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.urlencoded({extended: true}));
var fs = require('fs');
var comments = [];

// set up static file server
app.use(express.static('public'));

// set up a route for the root of the site
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

// set up a route for posting comments
app.post('/comment', function(req, res) {
  var comment = req.body.comment;
  console.log('comment:', comment);
  comments.push(comment);
  fs.writeFile('comments.json', JSON.stringify(comments), function(err) {
    if (err) {
      console.log('error writing comments to file');
    }
  });
  res.redirect('/');
});

// set up a route for getting all comments
app.get('/comments', function(req, res) {
  res.send(JSON.stringify(comments));
});

// start the server
app.listen(8080, function() {
  console.log('Server running at http://localhost:8080');
});