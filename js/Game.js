var Game = Game || {};


Game.GameState=function(){};

var ASSET_URL = "assets/"

var WORLD_SIZE = {w:800,h:580};

var bullet_array = [];

var socket; //Declare it in this scope, initialize in the `create` function
var other_players = {};
var textPowerfullBulletMode = false;

var database = firebase.database();

var gameRef = null;

var player = {
    sprite:null,//Will hold the sprite when it's created
    shot:false,
    oldX:0,
    oldX:0,
    facing:"right",
    lifes:null,
    lifesOponentsText: [],
    lifesOponentsSprite: [],
    rocksArray: [],
    powerfullBullet: false,
    kills: null,
    animation: null,
    animationName: null,
    update: function(game){

        if(this.sprite.body != null){
          this.sprite.body.velocity.x = 0;
          this.sprite.body.velocity.y = 0;

          //checking movement for the player and sending to the server to update its position

          if(game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
            this.sprite.body.velocity.y -= 450;
            if(this.facing == 'left'){
              this.animation = this.sprite.play('jumpL');
              this.animationName= 'jumpL'
            }else{
              this.animation = this.sprite.play('jumpR');
              this.animationName= 'jumpR'
            }
          }

          if(game.input.keyboard.isDown(Phaser.Keyboard.DOWN)){
            this.sprite.body.velocity.y += 150;
            if(this.facing == 'left'){
              this.animation = this.sprite.play('fallL');
              this.animationName = 'fallL';
            }else{
              this.animation = this.sprite.play('fallL');
              this.animationName = 'fallL';
            }
          }

          if (game.input.keyboard.isDown(Phaser.Keyboard.LEFT)) {
            this.sprite.body.velocity.x -= 150;
            this.facing="left";
            this.animation = this.sprite.play('walkL');
            this.animationName= 'walkL'
          } else if(game.input.keyboard.isDown(Phaser.Keyboard.RIGHT)) {
            this.sprite.body.velocity.x += 150;
            this.facing="right";
            this.animation = this.sprite.play('walkR');
            this.animationName= 'walkR'
          }

          // Shoot bullet
          if(game.input.keyboard.isDown(Phaser.Keyboard.X) && !this.shot){
            if(this.facing=="left"){
              var speed_x =  -15;
              this.animation = this.sprite.play('attackL');
              this.animationName= 'attackL'
            }else{
              var speed_x =  15;
              this.animation = this.sprite.play('attackR');
              this.animationName= 'attackR'
            }
            var speed_y = 0
            this.shot = true;
            Shoot.play();
            socket.emit('shoot-bullet',{x:this.sprite.position.x,y:this.sprite.position.y + 10,orientation:this.facing,speed_x:speed_x,speed_y:speed_y})
          }

          //stop shooting
          if(!game.input.keyboard.isDown(Phaser.Keyboard.X)){
            this.shot = false;
          }

          //gravity
          if(this.oldX == 0 || this.oldY == 0){
             this.oldX = this.sprite.x;
             this.oldY = this.sprite.y;
             animation = this.sprite.play('idleR')
             this.animatioName = 'idleR'
           } else {
             if(this.oldX != this.sprite.x || this.oldY != this.sprite.y){
               if(this.sprite.body.onFloor() == false){
                  if(this.animation == null || !this.animation.isPlaying){
                    if(this.facing == 'left'){
                      this.animation = this.sprite.play('fallL');
                      this.animationName= 'fallL'
                    }else{
                      this.animation = this.sprite.play('fallR');
                      this.animationName= 'fallR'
                    }
                  }
                  this.sprite.body.velocity.y += 300;
                  this.oldX = this.sprite.x;
                  this.oldY = this.sprite.y;
               }
             }else {
               if(this.shot == false)
               if(this.facing == 'left'){
                 this.animation = this.sprite.play('idleL');
                 this.animationName= 'idleL'
               }else{
                 this.animation = this.sprite.play('idleR');
                 this.animationName= 'idleR'
               }
             }
           }
          //sending player position and animation to the server
          socket.emit('move-player',{x:this.sprite.position.x,y:this.sprite.position.y,animation:this.animationName})
        }
    }

  };

Game.GameState.prototype={
    create:function(){
      //Creating the map
      this.map = this.game.add.tilemap('map1');
      this.map.addTilesetImage('Level1','gameTiles');
      this.blockedLayer = this.map.createLayer('Tile Layer 1');
      this.map.setCollisionByExclusion([245,246,247]);

      //Creating sounds
      Dead = this.add.audio('Dead');
      Pain = this.add.audio('Pain');
      Shoot = this.add.audio('Shoot');
      Entrance = this.add.audio('Entrance');
      Entrance.play();

      // Create player
      player.sprite = CreatePlayer(Math.random() * WORLD_SIZE.w/3 + WORLD_SIZE.w/3,Math.random() * WORLD_SIZE.h/3 + WORLD_SIZE.h/3,"Me",this.game);

      gameRef = this.game;
      //Creating Lifes for the player
      text = this.game.add.text(30, 35, "My lifes: ", {
          font: "14px Arial",
          fill: "#ffffff",
          align: "center" });
      text.fixedToCamera = true;

      player.lifes=this.game.add.group();

      for (var i = 0; i < 3; i++)
      {
         var live = player.lifes.create(120 + (30 * i) , 40, 'playerLifes');
         live.anchor.setTo(0.5, 0.5);
         live.scale.set(0.1,0.1);
      }
      player.lifes.fixedToCamera = true;

      //Creating kills counter for the player
      this.game.add.text(30, 55,  "Kills: ", {
          font: "14px Arial",
          fill: "#ffffff",
          align: "center" });

      //Enabling physics for the player
      this.game.physics.enable(player.sprite, Phaser.Physics.ARCADE);
      player.sprite.body.collideWorldBounds = true;
      player.sprite.body.setSize(10, 20, 0, 0);

      //Setting bounds in the map
      this.game.world.setBounds(0, 0, WORLD_SIZE.w, WORLD_SIZE.h);

      //Creating rocks
      rocks=this.add.group();
      rocks.enableBody=true;

      socket = io(); // This triggers the 'connection' event on the server
      socket.emit('new-player',{x:player.sprite.x,y:player.sprite.y})

      // Listen for other players connecting
      socket.on('update-players',function(players_data){
          var players_found = {};

          readDatabase(gameRef);
          // Loop over all the player data received
          for(var id in players_data){
              // If the player hasn't been created yet
              if(other_players[id] == undefined && id != socket.id){ // Making sure you don't create yourself
                  var data = players_data[id];
                  var p = CreatePlayer(data.x,data.y,id.substr(0,4),gameRef);
                  Entrance.play();
                  other_players[id] = p;
              }
              players_found[id] = true;

              // Update positions and animation playing of other players
              if(id != socket.id){
                other_players[id].x = players_data[id].x;
                other_players[id].y = players_data[id].y;
                other_players[id].play(players_data[id].animation);
              }
          }
          // Check if a player is missing and delete them
          for(var id in other_players){
              if(!players_found[id]){
                  other_players[id].destroy();
                  delete other_players[id];
              }
          }

      })

      // Listen for bullet update events
      socket.on('bullets-update',function(server_bullet_array){
        // If there's not enough bullets on the client, create them
       for(var i=0;i<server_bullet_array.length;i++){
            if(bullet_array[i] == undefined){
              //In case an oponent shoot and it has got the powefull bullet mode
              if(server_bullet_array[i].owner_id != socket.id && other_players[server_bullet_array[i].owner_id].powerfullBullet == true){
                  bullet_array[i] = gameRef.add.sprite(server_bullet_array[i].x,server_bullet_array[i].y,'PowerfullBullet');
                  bullet_array[i].anchor.setTo(0.5,0.5);
                  bullet_array[i].scale.setTo(0.1, 0.1);
              }else{
                //If I shoot and I have got powerfull bullet mode
                if(server_bullet_array[i].owner_id == socket.id && player.powerfullBullet == true ){
                  bullet_array[i] = gameRef.add.sprite(server_bullet_array[i].x,server_bullet_array[i].y,'PowerfullBullet');
                  bullet_array[i].anchor.setTo(0.5,0.5);
                  bullet_array[i].scale.setTo(0.1, 0.1);
                }
                else{
                  //Otherwise, create a normal bullet
                  bullet_array[i] = gameRef.add.sprite(server_bullet_array[i].x,server_bullet_array[i].y,'bullet');
                }
              }

              Shoot.play();

            } else {
                //Otherwise, just update it!
                bullet_array[i].x = server_bullet_array[i].x;
                bullet_array[i].y = server_bullet_array[i].y;
            }
        }
        // Otherwise if there's too many, delete the extra
        for(var i=server_bullet_array.length;i<bullet_array.length;i++){
             bullet_array[i].destroy();
             bullet_array.splice(i,1);
             i--;
         }

      })

      //Listen for updates on showing lifes of opponents
      socket.on('show-lifes',function(players_lifes_array){
        var i = 0;
        //deleting previous texts of lifes for opponents
        for(var j=0; j< player.lifesOponentsText.length; j++){
          player.lifesOponentsText[j].destroy();

        }

        //deleting previous lifes icons for opponents
        for(var j=0; j< player.lifesOponentsSprite.length; j++){
          player.lifesOponentsSprite[j].destroy();
        }

        var lengthLifes = 0;
        var lifesOponents = gameRef.add.group();
        //Creating new texts and sprites for opponents' lifes
        for(var id in players_lifes_array){
          if(id != socket.id){//Making sure I don't create lifes for myself
          player.lifesOponentsText[i] = gameRef.add.text(450, (i+1) * 35, "Player " + id.substr(0,4) + " lifes: ", {
              font: "14px Arial",
              fill: "#ffffff",
              align: "center" });


          for (var k = 0; k < players_lifes_array[id]; k++)
           {
             player.lifesOponentsSprite[lengthLifes + k] = lifesOponents.create(590 + (30 * k) , 40 * (i +1) , 'playerLifes');
             player.lifesOponentsSprite[lengthLifes + k].anchor.setTo(0.5, 0.5);
             player.lifesOponentsSprite[lengthLifes + k].scale.set(0.1,0.1);
           }
           lengthLifes = player.lifesOponentsSprite.length;
           i++;

          }
        }

      })

      // Listen for any player hit events and make that player flash
      socket.on('player-hit',function(id, bulletOwnerID){
        if(id == socket.id){
          //If this is you
          var life = player.lifes.getFirstExists();
          if (life){
            life.destroy(); //destroying one of my lifes
            Pain.play();
            database.ref().child(id).child("lifes").set(player.lifes.countLiving());//Updating number lifes in database
            //In case they got powefull bullet mode, they remove 2 lifes
            if(other_players[bulletOwnerID].powerfullBullet == true && player.lifes.countLiving() > 0){
              life = player.lifes.getFirstExists();
              life.destroy();
              database.ref().child(id).child("lifes").set(player.lifes.countLiving());
            }
            //Delete myself of the game if number lifes equals to 0
            if(player.lifes.countLiving()==0){
              Dead.play();
              var reference = database.ref(bulletOwnerID + "/kills");
              //Reading current number of lifes on database and updating them incrementing the number by 1
              reference.once('value', function(snapshot) {
                reference.set(snapshot.val()+1);
              });

              //Disconnecting my player in the server
              socket.emit('manualDisconnect')
              player.sprite.destroy();
            }
          }
          }
      })

      //Listen for updates on rocks falling from the top of the screen
      socket.on('spawn-rocks', function(j){

        //Delete previous rocks
        for(var i=0; i< player.rocksArray.length; i++){
          player.rocksArray[i].destroy();
        }

        //Creating new rocks
        for (var i = 0; i < 2; i++)
        {
          player.rocksArray.push(rocks.create(100 + (350 * i), 60 * j, 'Rock'));
          //dx fixed by hand (160 instead of 100) because of the size of the sprite of the rock
          //it does not collide as expected with the player
          var dx = player.sprite.x - (160 + (350 * i));
          var dy = player.sprite.y - (60 * j);
          var dist = Math.sqrt(dx * dx + dy * dy);
          //Remove a life if rocks hits the player
          if(dist < 50){
            var life = player.lifes.getFirstExists();
            if (life){
              life.kill();
              Pain.play();
              //updating number of lifes in the database
              database.ref().child(socket.id).child("lifes").set(player.lifes.countLiving());
              if(player.lifes.countLiving()==0){
                Dead.play();
                //Desconecting my player in the server
                socket.emit('manualDisconnect')
                player.sprite.destroy();
              }
            }
          }
         }
      })
    },

	  update:function(){
      this.game.physics.arcade.collide(player.sprite, this.blockedLayer);
      player.update(this.game);
		}
}

function CreatePlayer(x,y,id,game){
    //Creating sprite for the player
    var sprite = game.add.sprite(x,y,'player',4);
    //Adding id above the player
    sprite.name = game.add.text(30, -10, id , { font: '14px Arial', fill: '#FFFFFF', align: 'center' });
    sprite.name.anchor.setTo(0.5);
    sprite.addChild(sprite.name);
    //Adding animations for the player
    sprite.animations.add('walkR', [26, 33, 40, 47, 54], 10, false);
    sprite.animations.add('walkL', [43, 44, 45, 46, 49, 50], 10, false);
    sprite.animations.add('fallR', [3,10], 10, false);
    sprite.animations.add('fallL', [17,24], 10, false);
    sprite.animations.add('idleR', [31,35,36,37],10,false);
    sprite.animations.add('idleL', [38,4,11,18],10,false);
    sprite.animations.add('attackR', [1, 8, 14,15, 21, 22],60,false);
    sprite.animations.add('attackL', [51, 52, 53, 5, 12, 19],60,false);
    sprite.animations.add('dieR', [2, 9,16, 23, 28, 29, 30],10,false);
    sprite.animations.add('dieL', [13, 20, 27, 0, 7, 6],10,false);
    sprite.animations.add('jumpR', [25, 32, 39, 42],10,false);
    sprite.animations.add('jumpL', [57, 58, 59, 60],10,false);
    return sprite;
}

//Reading needed information from database
function readDatabase(game){
  var query = database.ref().orderByKey();
  query.once("value").then(function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
          var id = childSnapshot.key;
          if(id != socket.id){
            //In case a killed player has not been deleted from the database before
            //update their attributes (asynchronous database)
            if(other_players[id] != null){
              other_players[id].powerfullBullet = childSnapshot.child("powerfullBullet").val();
            }
          }else{
            //Enabling powerfull bullet mode when killing one player
            var kills = childSnapshot.child("kills").val();
            if(kills == 1 && !textPowerfullBulletMode){
              textPowerfullBulletMode = true;
              player.powerfullBullet =  true;
              database.ref(id + "/powerfullBullet").set(true);
              game.add.text(30, 75,  "Powerfull Bullet Mode Enabled", {
                  font: "14px Arial",
                  fill: "#00ff00",
                  align: "center"});

            }
            //Deleting previous number of kills
            if(player.kills != null){
              player.kills.destroy();
            }
            //Setting updated number of kills
            player.kills = game.add.text(65, 55,  kills, {
                font: "14px Arial",
                fill: "#ffffff",
                align: "center" });
          }
        });
  });
}
