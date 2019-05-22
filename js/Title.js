var Game = Game || {};

function actionOnClickPlay () {

	this.state.start('Game',true,false);

}

Game.TitleState=function(){};

Game.TitleState.prototype={
    create:function(){

				 //loading menu before playing
	 	     var backgroundimg = this.game.add.image(0,0,'MenuBack');
		     this.game.input.activePointer.caprure=true;
				 //click new game button to enter the game
		     buttonPlay = this.game.add.button(300,320, 'NewGameButton', actionOnClickPlay, this);
      },

	   update:function(){

		 }
}
