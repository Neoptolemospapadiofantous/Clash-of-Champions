var Game = Game || {};

Game.Boot = function(){};

Game.Boot.prototype = {
  create: function() {
    this.state.start('Preload');
  }
};
