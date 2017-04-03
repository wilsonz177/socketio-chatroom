// Require the packages we will use:
var http = require("http");
var socketio = require("socket.io");
var fs = require("fs");
var people = {};
var rooms = {};
rooms["CSE330"] = { //initial room available
	"admin": "",
	"users": {}, //key = username, value = socketid
	"pub": true,
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
	
	 socket.on("submitinfo", function(data){
		var taken = false; //true if username is taken, false otherwise
		for (var key in people){ //check if username is taken
			if (data.username == people[key].username){
				taken = true;
			}
		}
		if(taken){
			socket.emit("errors", {message:"usernametaken"});
		}else{
			people[socket.id] = {"username" : data.username, "room" : "", "firstname": data.firstname, "lastname": data.lastname, "pic": data.pic, "bio": data.bio, "privatemes": {}};
			socket.emit("loadpage", rooms);
		}
       
    });
	 
	socket.on("getusersinfo", function(username){
			var id;
			var admin = false;
			var room = people[socket.id].room;
			var name = people[socket.id].username;
			if (rooms[room].admin == name){
				admin = true;
			}
			
			for (var key in people){
				if(people[key].username == username){
					id = key;
				}
			}
			var info = people[id];
			socket.emit("moreinfo", {"info": info, "admin": admin, "adminname": name});
    });

	socket.on("kickorblock", function(data){
			
			var r = people[socket.id].room;
			var id = rooms[r].users[data.user];
			
			people[id].room = "";
			delete rooms[r].users[data.user]; //delete kicked/blocked user from room
			
			var allusersinchatroom = rooms[r].users;
			
			for (var a in allusersinchatroom){
				io.to(allusersinchatroom[a]).emit("update", {"users": allusersinchatroom, "room": r}); //updates everyones list of users in the chatroom
			}
			
			//update everyone's screen
			if(data.action == "kick"){
				io.to(id).emit("afterkickedorbanned");
				io.to(id).emit("loadpage", rooms);
				io.to(id).emit("errors", {message: "kicked"});
				io.to(socket.id).emit("clearmoreinfo");

			} else {
				rooms[r].banned.push(data.user);
				io.to(id).emit("afterkickedorbanned");
				io.to(id).emit("loadpage", rooms);
				io.to(id).emit("errors", {message: "banned"});
				io.to(socket.id).emit("clearmoreinfo");
			}
    });
	
	//join room
	 socket.on("join", function(data){
		
		var n = people[socket.id].username; //username
		var inRoom = n in people; //boolean indicating whether user is already in chatroom
		var b = false; //boolean indicating if user is banned from room - false initially
		var switching = false; //boolean indicating if user is switching rooms
		
		var usernames = [];
		var ids = [];
		var allusersinchatroom = rooms[data.room].users;
		for (var key in allusersinchatroom){
			usernames.push(key);
		}

		for (var i = 0; i < rooms[data.room].banned.length; ++i){ //check if user is banned
			if (people[socket.id].username == rooms[data.room].banned[i]){
				b = true;
			}
		}
		
		for (var x in rooms){ //check if user is switching rooms
			for (var y in rooms[x].users){
				if (people[socket.id].username == y){
				switching = true;
				}
			}
		}
		
		if(b){
			socket.emit("clearchatlog"); 
			socket.emit("errors", {message:"banned"}); 
		} else if (inRoom){
			//socket.emit("clearchatlog"); 
			socket.emit("errors", {message:"sameroom"});
		}
		
		else{

		if(switching){
			delete rooms[data.oldroom].users[n]; //deletes user from old room
			var oldusers = [];
			for (var k in rooms[data.oldroom].users){
				oldusers.push(rooms[data.oldroom].users[k]);
			}

			for (i = 0; i < oldusers.length; ++i) {
				io.to(oldusers[i]).emit("update", {"users": rooms[data.oldroom].users, "room": data.oldroom});
			}
		}
		
		if (data.pub == "false"){ //check password for private room
			if (rooms[data.room].pass == data.pass){
				io.to(socket.id).emit("clearchatlog");
				people[socket.id].room = data.room;
				rooms[data.room].users[n] = socket.id; //adds user to room
				for (var un in rooms[data.room].users){
					ids.push(rooms[data.room].users[un]);
				}

				for (i = 0; i < ids.length; ++i) {
					io.to(ids[i]).emit("update", {"users": rooms[data.room].users, "room": data.room}); //update everyone that new user has joined room
				}
				
			} else {
				socket.emit("errors", {message: "wrongpassword"});
			}
		} else{
				io.to(socket.id).emit("clearchatlog");
				people[socket.id].room = data.room;
				rooms[data.room].users[n] = socket.id; //adds user to room
				for (var k in rooms[data.room].users){
					ids.push(rooms[data.room].users[k]);
				}

				for (i = 0; i < ids.length; ++i) {
					io.to(ids[i]).emit("update", {"users": rooms[data.room].users, "room": data.room}); //update everyone that new user has joined room
				}
		}
		}
		
    });
	 
	socket.on("createroom", function(data){
		
		var switching = false;
		for (var x in rooms){ //check if user is switching rooms
			for (var y in rooms[x].users){
				if (people[socket.id].username == y){
				switching = true;
				}
			}
		}
		
		
                var roomAdmin = people[socket.id].username;
		rooms[data.roomname] = {
				"admin": roomAdmin,
				"users": {},
				"pub": data.pub,
				"pass": data.password,
				"banned": []
		};
		
		rooms[data.roomname].users[roomAdmin] = socket.id;

		if(switching){
			delete rooms[data.oldroom].users[roomAdmin]; //deletes user from old room
			var oldusers = [];
			for (var k in rooms[data.oldroom].users){
				oldusers.push(rooms[data.oldroom].users[k]);
			}

			for (i = 0; i < oldusers.length; ++i) {
				io.to(oldusers[i]).emit("update", {"users": rooms[data.oldroom].users, "room": data.oldroom});
			}
		}
		
		socket.emit("clearchatlog"); 
		people[socket.id].room = data.roomname;
		io.sockets.emit("loadpage", rooms);
        socket.emit("update", {"users": rooms[data.roomname].users, "room": data.roomname});
		
    });
	  
	//send private message  	
	socket.on('dm', function(data) {
		var fromwho = people[socket.id].username;
		var tosocketid;
		for (var key in people){
			if (people[key].username == data.towho){
				tosocketid = key;
				people[key].privatemes[fromwho] = data.message;
			}
		}
		
			io.to(tosocketid).emit("updatedms", {"fromwho": fromwho, "message": data.message}); 
	});
	
                //handles disconnecting users
                socket.on("disconnect", function(){
                                var r = people[socket.id].room;
                                var n = people[socket.id].username;
                                delete rooms[r].users[n]; //deletes user from old room
                                delete people[socket.id]; //deletes user
                                var users = [];
		for (var k in rooms[r].users){
			users.push(rooms[r].users[k]);
		}

		for (i = 0; i < users.length; ++i) {
			io.to(users[i]).emit("update", {"users": rooms[r].users, "room": r});
		}
              });
	
	socket.on('message_to_server', function(msg) {
		// This callback runs when the server receives a new message from the client.
		var chatroom = people[socket.id].room;
		var ids = [];
		for (var key in rooms[chatroom].users){
			ids.push(rooms[chatroom].users[key]);
		}

		for (i = 0; i < ids.length; ++i) {
			io.to(ids[i]).emit("message_to_client", people[socket.id].username, msg); // broadcast the message to all users in chatroom
		}
	});
});