var Phaser = require('phaser');

var SCALE = 3;

var game = new Phaser.Game(
  // Game width
  360 * SCALE, //120 for tests
  // Game height
  180 * SCALE, //60 for tests
  // Game renderer (WebGL, Canvas, auto)
  Phaser.AUTO,
  // Game id in index.html
  'HitThemAll',
  // Phaser states
  {
    preload: _preload,
    create: _create,
    update: _update
  },
  // Transparent canvas background
  false,
  // Antialias
  false
);

//  The Google WebFont Loader will look for this object, so create it before loading the script.
WebFontConfig = {
  //  'active' means all requested fonts have finished loading
  //  We set a 1 second delay before calling 'createText'.
  //  For some reason if we don't the browser cannot render the text the first time it's created.
  active: function() { game.time.events.add(Phaser.Timer.SECOND, _createMessage, this); },
  //  The Google Fonts we want to load (specify as many as you like in the array)
  google: {
    families: ['Roboto', 'Montserrat', 'Cosmic', 'Atomic Age', 'Space Mono', 'Pacifico', 'Cookie']
  }
};

var stateLevel = false;
var stateFont = false;
var stateGameStarted = false;
var stateGameOver = false;

var ball = null;
var ballSpeed = 180;
var bar = null;
var barSpeed = 200;
var bricks;
var brickCount;

var hitCount;

var spaceKey;

var message = null;
var style = {
  font: '32px Cookie',
  fill: '#ffffff'
};

function _preload() {
  // console.log('💤 Preload game');
  game.load.image('ball', 'game/assets/ball.png');
  game.load.image('bar', 'game/assets/bar.png');
  game.load.image('brick', 'game/assets/brick03.png');
  game.load.image('brick-dust','game/assets/brick-dust03.png');
  //  Load the Google WebFont Loader script
  game.load.script('webfont', '//ajax.googleapis.com/ajax/libs/webfont/1/webfont.js');
}

function _create() {
  // console.log('✨ Create game');

  game.stage.backgroundColor = '#363343';

  game.physics.startSystem(Phaser.Physics.ARCADE);
  game.physics.arcade.checkCollision.down = false;

  ball = _createBall(0, 0);
  bar = _createBar(0, 0);

  _resetLevel();

  cursor = game.input.keyboard.createCursorKeys();

  spaceKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
  spaceKey.onDown.add(_eventSpaceKey, this);

  var context = new AudioContext();
  context.resume().then(() => {
    console.log('Playback resumed successfully');
  });
  var audio = document.createElement("AUDIO")
  document.body.appendChild(audio);
  audio.src = 'game/assets/main_song.mp3';
  audio.loop = true;
  audio.volume = 0.2;

  var playPromise = audio.play();
  if(playPromise !== undefined){
    playPromise.then(function(){
      // audio.pause();
    }).catch(function(error){
         console.error(error);
    });
  }
}

function _update() {
  // console.log('🔄 Update game');
  if(stateGameOver) {
    return;
  }

  bar.body.velocity.x = 0;
  if (cursor.left.isDown) {
    bar.body.velocity.x = - barSpeed * SCALE;
  } else if (cursor.right.isDown) {
    bar.body.velocity.x = barSpeed * SCALE;
  }
  if(stateGameStarted) {
    game.physics.arcade.collide(bar, ball, null, _reflect, this);
    game.physics.arcade.collide(ball, bricks, null, _breakBrick, this);
  } else {
    ball.x = bar.x + (bar.width - ball.width) * 0.5;
  }
}

function _resetLevel() {
  // Reset bar
  bar.x = (game.world.width - bar.width) * 0.5;
  bar.y = game.world.height - bar.height - 10;
  // Reset ball
  ball.y = bar.y - ball.height;
  ball.x = bar.x + (bar.width - ball.width) * 0.5;
  ball.body.velocity.setTo(0);
  // Flag level is ready
  stateLevel = true;
  stateGameStarted = false;
  stateGameOver = false;
  if (stateFont) {
    message.text = 'Again ?';
  }
  if(bricks) {
    bricks.removeAll();
  }
  bricks = _createBricks();
}

function _createBall(x, y) {
  var ball = game.add.sprite(x, y, 'ball');
  ball.scale.set(SCALE);
  game.physics.enable(ball, Phaser.Physics.ARCADE);
  ball.body.collideWorldBounds = true;
  ball.body.bounce.set(1);
  ball.checkWorldBounds = true;
  ball.events.onOutOfBounds.add(_loseBall, this);
  return ball;
}

function _createBar(x, y) {
  var bar = game.add.sprite(x, y, 'bar');
  bar.scale.set(SCALE);
  game.physics.enable(bar, Phaser.Physics.ARCADE);
  bar.body.collideWorldBounds = true;
  bar.body.immovable = true;
  return bar;
}

function _createBricks() {
  var bricks = game.add.group();
  var brickImage = 'brick';
  var widthBrick = game.cache.getImage(brickImage).width;
  var heightBrick = game.cache.getImage(brickImage).height;
  // Calculate columns and rows
  var nbColumnBrick = Math.floor(game.world.width / SCALE / widthBrick);
  var nbRowBrick = Math.floor(game.height / SCALE / heightBrick / 3);
  var deltaWidth = game.world.width / SCALE - (nbColumnBrick * widthBrick);
  // Create bricks
  for (var i = 0; i < nbColumnBrick; i++) {
    for (var j = 0; j < nbRowBrick; j++) {
      var brick = new Brick(
        game,
        (widthBrick * SCALE * i) + Math.floor(deltaWidth * SCALE * 0.5),
        heightBrick * SCALE * j,
        brickImage);
      bricks.add(brick);
    }
  }
  brickCount = nbColumnBrick * nbRowBrick;
  hitCount = 0;
  return bricks;
}

function _reflect(bar, ball) {
  if (ball.y > (bar.y + 5)) {
    return true;
  } else {
    var rate = (1 - (ball.x + ball.width * 0.5 - bar.x ) / bar.width);
    if(rate < 0.1) rate = 0.1;
    if(rate > 0.9) rate = 0.9;
    var angle = - Math.PI*rate;
    ball.body.velocity.setTo(
      Math.cos(angle) * ballSpeed,
      Math.sin(angle) * ballSpeed
    );
    return false;
  }
}

function _breakBrick(ball, brick) {
  brick.destruct();
  var brick_hit_sound = document.createElement("AUDIO")
  document.body.appendChild(brick_hit_sound);
  brick_hit_sound.src = 'game/assets/brick_hit.mp3';
  var hitPlayPromise = brick_hit_sound.play();
  if(hitPlayPromise !== undefined){
    hitPlayPromise.then(function(){
      // brick_hit_sound.pause();
    }).catch(function(error){
         console.error(error);
    });
  }
  brickCount--;
  hitCount++;
  if (brickCount <= 0) {
    _winGame();
  }
  return true;
}

function _createMessage() {
  message = game.add.text(game.width * 0.5, game.height * 0.5, 'Ready ?', style);
  message.anchor.set(0.5);
  // Flag font is ready
  stateFont = true;
  return true;
}

function _eventSpaceKey() {
  if(stateGameOver) {
    _resetLevel();
  } else if(stateGameStarted) {
    game.paused = !game.paused;
    if(game.paused) {
      message.text = 'Paused';
    } else {
      message.text = '';
    }
  } else if(stateLevel && stateFont) {
    stateGameStarted = true;
    message.text = '';
    _launchBall();
  }
}

function _launchBall() {
  var angle = - 0.5 * Math.PI;
  ball.body.velocity.setTo(
    Math.cos(angle) * ballSpeed,
    Math.sin(angle) * ballSpeed
  );
}

function _loseBall() {
  stateGameOver = true;
  ball.body.velocity.setTo(0);
  if(hitCount == 1) {
    brickForm = ' brick!)';
  }
  else {
    brickForm = ' bricks!)';
  }
  message.text = 'You\'ve lost! :( (but hit ' + hitCount + brickForm;
  var lose_sound = document.createElement("AUDIO")
  document.body.appendChild(lose_sound);
  lose_sound.src = 'game/assets/lose_sound.mp3';
  var losePlayPromise = lose_sound.play();
  if(losePlayPromise !== undefined){
    losePlayPromise.then(function(){
    }).catch(function(error){
         console.error(error);
    });
  }
}

function _winGame() {
  stateGameOver = true;
  ball.body.velocity.setTo(0);
  message.text = 'You win! :)';
  var win_sound = document.createElement("AUDIO")
  document.body.appendChild(win_sound);
  win_sound.src = 'game/assets/win_sound.mp3';
  var winPlayPromise = win_sound.play();
  if(winPlayPromise !== undefined){
    winPlayPromise.then(function(){
    }).catch(function(error){
         console.error(error);
    });
  }
}

/***************************************************/
/********************** Brick **********************/
/***************************************************/
var Brick = function(game, x, y, image) {
  Phaser.Sprite.call(this, game, x, y, 'brick');
  this.scale.set(SCALE);
  this.game.physics.enable(this, Phaser.Physics.ARCADE);
  this.body.immovable = true;
};
Brick.prototype = Object.create(Phaser.Sprite.prototype);
Brick.prototype.constructor = Brick;

Brick.prototype.destruct = function() {
  this.events.onKilled.addOnce(this._onKillHandler, this);
  this.kill();
};

Brick.prototype._onKillHandler = function() {
  var emitter = this.game.add.emitter(0, 0, 100);
  emitter.makeParticles('brick-dust');
  emitter.x = this.x + this.width * 0.5;
  emitter.y = this.y + this.height * 0.5;
  emitter.minParticleSpeed.setTo(-50 * SCALE, -50 * SCALE);
  emitter.maxParticleSpeed.setTo(50 * SCALE, 50 * SCALE);
  emitter.minParticleScale = 1 * SCALE;
  emitter.maxParticleScale = 1.5 * SCALE;
  emitter.start(true, 300, null, 10);

  this.game.time.events.add(2000,function() {
    emitter.destroy();
  });
};
