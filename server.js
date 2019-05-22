var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);


// Serve the index page
/*app.get("/", function (request, response) {
  response.sendFile(__dirname + '/index.html');
});*/

// Serve the game page
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/game.html');
});

//Serve the design page
/*app.get("/", function (request, response) {
  response.sendFile(__dirname + '/design.html');
});

//Serve  the team page
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/team.html');
});*/

// Serve the assets directory
app.use('/assets',express.static('assets'))

// Serve the javascripts directory
app.use('/js',express.static('js'))

// Serve the css directory
app.use('/css',express.static('css'))

// Serve the Images directory
app.use('/Images',express.static('Images'))

// Serve the Fontss directory
app.use('/Fonts',express.static('Fonts'))

// Listen on port 8000
app.set('port', (process.env.PORT || 8000));
http.listen(app.get('port'), function(){
  console.log('listening on port',app.get('port'));
});

var players = {}; //Keeps a table of all players, the key is the socket id
var players_lifes = {}; //Keeps a table of all players lifes, the key is the socket id
var rocks = false; //allowing spawing rocks or not
var indexRocks = 0; //Number of the iteration when spawing rocks in game(s)
var bullet_array = []; // Keeps track of all the bullets to update them on the server

//adding interaction between database and firebase
var admin = require("firebase-admin");
var serviceAccount = require("./webgamedevelopment2-firebase-adminsdk-uydy5-5fc7361bba.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://webgamedevelopment2.firebaseio.com"
});
//Database reference
var db = admin.database();

// Tell Socket.io to start accepting connections
io.on('connection', function(socket){
	// Listen for a new player trying to connect
	socket.on('new-player',function(state){
		console.log("New player joined with state:",state);
		players[socket.id] = state;
    //Setting initial attributes for player in the database
    db.ref(socket.id).set({
      lifes: 3,
      kills: 0,
      powerfullBullet : false
    });
		// Broadcast a signal to everyone containing the updated players list
		io.emit('update-players',players);
	})


  // Listen for a disconnection and update our player table
  socket.on('disconnect',function(){
    delete players[socket.id];
    //Removing player from the database
    admin.database().ref(socket.id).remove();
    io.emit('update-players',players);
  })

  socket.on('manualDisconnect',function(){
    delete players[socket.id];
    //Removing player from the database
    admin.database().ref(socket.id).remove();
    io.emit('update-players',players);
  })

  // Listen for move events and tell all other clients that something has moved
  socket.on('move-player',function(position_data){
    if(players[socket.id] == undefined) return; // Happens if the server restarts and a client is still connected
    players[socket.id].x = position_data.x;
    players[socket.id].y = position_data.y;
    players[socket.id].animation = position_data.animation;
    io.emit('update-players',players);
  })

  // Listen for shoot-bullet events and add it to our bullet array
  socket.on('shoot-bullet',function(data){
    if(players[socket.id] == undefined) return;
    var new_bullet = data;
    data.owner_id = socket.id; // Attach id of the player to the bullet
    bullet_array.push(new_bullet);
  });
})

// Update 60 times per frame and send updates
function ServerGameLoop(){
  //update player lifes reading them from database
  players_lifes = {};
  for(var id in players){
      var reference = db.ref(id + "/lifes");
      reference.on('value', function(snapshot) {
        players_lifes[id] = snapshot.val();
      });
  }
  io.emit("show-lifes", players_lifes);

  for(var i=0;i<bullet_array.length;i++){
    var bullet = bullet_array[i];
    bullet.x += bullet.speed_x;
    // Check if this bullet is close enough to hit any player
    for(var id in players){
      if(bullet.owner_id != id){
        // And your own bullet shouldn't kill you
        var dx = players[id].x - bullet.x;
        var dy = players[id].y - bullet.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if(dist < 20){
          bullet_array.splice(i,1);
          i--;
          io.emit('player-hit',id, bullet.owner_id);
        }
      }
    }

    // Remove if it goes too far off screen
    if(bullet.x < -10 || bullet.x > 1000 || bullet.y < -10 || bullet.y > 1000){
        bullet_array.splice(i,1);
        i--;
    }

  }
  // Tell everyone where all the bullets are by sending the whole array
  io.emit("bullets-update",bullet_array);
}

//Enablin spawing rocks
function SpawnRocks(){
  rocks = true;
}

//Sending rocks to game(s)
function Rocks(){
  if(rocks == true){
      io.emit("spawn-rocks",indexRocks);
      indexRocks++;
      if(indexRocks == 12){
        rocks = false;
        indexRocks = 0;
      }
  }
}

setInterval(ServerGameLoop, 16);
setInterval(Rocks, 80);
setInterval(SpawnRocks,30000);
