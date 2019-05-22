var Game = Game || {};

Game.game = new Phaser.Game(800,580, Phaser.AUTO, '');

Game.game.state.add('Boot', Game.Boot);
Game.game.state.add('Preload', Game.PreloadState);
Game.game.state.add('Title', Game.TitleState);
Game.game.state.add('Game', Game.GameState);

Game.game.state.start('Boot');
