// Require the packages we will use:
var http = require("http");
var socketio = require("socket.io");
var fs = require("fs");
var people = {};
 
// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.
 
	fs.readFile("client.html", function(err, data){
		// This callback runs when the client.html file has been read from the filesystem.
		if(err) return resp.writeHead(500);
		resp.writeHead(200);
		resp.end(data);
	});
});
app.listen(3456);
 
// Do the Socket.IO magic:
var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
	// This callback runs when a new Socket.IO connection is established.
	
	 socket.on("join", function(name){
        people[socket.id] = name;
        socket.emit("update", "You have connected to the server.");
        io.sockets.emit("update", name + " has joined the server.");
        io.sockets.emit("update-people", people);
    });
	
	socket.on("send", function(msg){
        io.sockets.emit("chat", people[client.id], msg);
    });
	
	socket.on("disconnect", function(){
        io.sockets.emit("update", people[client.id] + " has left the server.");
        delete people[client.id];
        io.sockets.emit("update-people", people);
    });
	
	
 
	socket.on('message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
		
		//console.log("message: "+data["message"]); // log it to the Node.JS output
		//console.log("username: "+data["username"]);
		
		io.sockets.emit("message_to_client",{message:data["message"], username:data["username"]}) // broadcast the message to other users
	});
});