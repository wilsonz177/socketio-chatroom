// Require the packages we will use:
var http = require("http");
var socketio = require("socket.io");
var fs = require("fs");
var people = {};
var rooms = {};
rooms["CSE330"] = {
				"admin": "",
				"users": [],
				"pub": "true",
				"pass": "",
				"banned": []
		};
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
	
	 socket.on("submitusername", function(name){
        people[socket.id] = { "name" : name, "room" : ""};
		socket.emit("loadpage", rooms);
    });

	 socket.on("join", function(data){
		
		var b = false;
		console.log(data);
		console.log(rooms[data.room].banned);
		for (var i = 0; i < rooms[data.room].banned.length; ++i){
			if (people[socket.id].name == rooms[data.room].banned[i]){
				b = true;
			}
		}
		
		if(b){
			socket.emit("banned");
		}else{
		
		
		if (data.pub == "false"){
			if (rooms[data.room].pass == data.pass){
				people[socket.id].room = data.room;
				rooms[data.room].users.push(socket.id);
				io.sockets.emit("update", rooms[data.room].users);
			} else {
				socket.emit("wrongpassword");
			}
		}else{

				people[socket.id].room = data.room;
				rooms[data.room].users.push(socket.id);
				io.sockets.emit("update", rooms[data.room].users);
			
		}
		}
		
    });
	 
	  socket.on("createroom", function(data){
        var roomAdmin = people[socket.id];
		
		rooms[data.roomname] = {
				"admin": roomAdmin,
				"users": [roomAdmin],
				"pub": data.pub,
				"pass": data.password,
				"banned": []
		};
		people[socket.id].room = roomname;
 console.log("about to emit update");
        socket.emit("update", rooms[roomname].users);
    });
	
//	socket.on("disconnect", function(){
//        io.sockets.emit("update", people[client.id] + " has left the server.");
//        delete people[client.id];
//        io.sockets.emit("update-people", people);
//    });
	
	socket.on('message_to_server', function(msg) {
		// This callback runs when the server receives a new message from the client.
		var chatroom = people[socket.id].room;
		var allusersinchatroom = rooms[chatroom].users;
		
		for (i = 0; i < allusersinchatroom.length; ++i) {
			io.to(allusersinchatroom[i]).emit("message_to_client", people[socket.id].name, msg); // broadcast the message to other users
		}
		
	});
});