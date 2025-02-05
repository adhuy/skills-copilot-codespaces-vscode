// create web server
var express = require('express');
var app = express();

// create a route
app.get('/comments', function(req, res){
	res.send('This is the comments page');
});

// start server
app.listen(3000, function(){
	console.log('Server is running on http://localhost:3000');
});