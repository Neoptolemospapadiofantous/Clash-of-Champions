var Game = Game || {};
var ASSET_URL = "/assets/"

Game.PreloadState=function(){};

Game.PreloadState.prototype={
	preload:function(){

		//loading screen
		var loadingLabel = this.game.add.text(350,320,'loading...', {font: '30px Courier',fill:'#ffffff'});

		this.time.advancedTiming=true;

		//game assets
    this.load.tilemap('map1', ASSET_URL + 'Themap.json', null, Phaser.Tilemap.TILED_JSON);
    this.load.image('gameTiles', ASSET_URL +'Maptiles.png');

    this.load.image('bullet', ASSET_URL + 'cannon_ball.png');
    this.load.image('PowerfullBullet', ASSET_URL + 'fireBullet.png');
    this.load.spritesheet('player', ASSET_URL + 'SpritesheetHero.png', 50, 38, 63);

    this.load.image('Rock', ASSET_URL + 'Rock.png');
    this.load.image('playerLifes', ASSET_URL + 'Heart.png',328,320);

    this.load.audio('Dead',ASSET_URL + 'audio/DeadPlayer.mp3');
    this.load.audio('Pain',ASSET_URL + 'audio/pain.mp3');
    this.load.audio('Shoot', ASSET_URL + 'audio/laser.wav');
    this.load.audio('Entrance', ASSET_URL + 'audio/FactoryEntracnce.mp3');

    this.load.image('NewGameButton',ASSET_URL + 'button_new-game.png');
    this.load.image('MenuBack',ASSET_URL + 'Vilage.png');

	},

	create:function(){

	   this.game.state.start('Title');

	}
}
