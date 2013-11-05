var canvas;
var ui;
var context;
var onErrorFunc;

var resources;
var playerGob;
var gridOb;
var netOb;
var intervalID;
var showDebugInfo = true;

function main(onErrorFunc_)
{
	onErrorFunc = onErrorFunc_;

	try
	{
		loadScript("resources.js", onResourcesLoaded);

		canvas = document.getElementById('gameCanvas');
		ui = document.getElementById("gameUI");
		context = canvas.getContext("2d");

		// input event listeners
		registerInputEvents(canvas, true);
	}
	catch(e)
	{
		onErrorFunc(e);
	}
}

function onResourcesLoaded()
{
	var imgs = {
		"player" : "images/player.png",
		"bg" : "images/bg.png",
		"gradient" : "images/gradient.jpg"
	};

	resources = new Resources();
	resources.loadImages(imgs, init);
}

function init()
{
	console.log("init()");

	// these variables are in util
	gameWidth = 480;
	gameHeight = 320;
	widthToHeight = gameWidth/ gameHeight;

	bgGob = new GameObject();
	bgGob.sprite = new ImageSprite( resources.images["bg"] );
	netOb = new Net('p2nl3kjvwpnwmi');
	gridOb = new Grid(15, 10, gameWidth, gameHeight);
	playerGob = new Player();
	
	intervalID = setInterval(mainloop, 1000.0/60.0);

	resizeGame();
	window.addEventListener('resize', resizeGame, false);
	window.addEventListener('orientationchange', resizeGame, false);

	SwapScreen(CreateConnectScreen());
}

function mainloop()
{
	try
	{
		update();
		draw();
		Input.pointerUpdate();
	}
	catch(e)
	{
		onErrorFunc(e);
	}
}

function update()
{
	fpsUpdate();
	playerGob.update();
}

function draw()
{
	context.clearRect(0,0, canvasWidth, canvasHeight);

	// context.fillStyle='#712033';
	// context.fillRect(50,50,100,80);
	context.save();
	context.transform(canvasRatioX,0,0,canvasRatioY,0,0);

	bgGob.draw(context);
	playerGob.draw(context);

	drawDebugInfo();

	context.restore();
}
function drawDebugPath(path, strokeStyle_)
{
	if(path && path.length > 0)
	{
		context.beginPath();
		context.strokeStyle = strokeStyle_;
		var pathx = gridOb.toX(path[0].gx + 0.5);
		var pathy = gridOb.toY(path[0].gy + 0.5);
		context.moveTo(pathx, pathy);
		for(var i=1; i<path.length; i++)
		{
			pathx = gridOb.toX(path[i].gx + 0.5);
			pathy = gridOb.toY(path[i].gy + 0.5);
			context.lineTo(pathx, pathy);
		}
		context.stroke();
	}
}
function drawDebugInfo()
{
	if(showDebugInfo)
	{
		context.font="8px Monospace";
		context.fillStyle="#000000";

		drawDebugPath(playerGob.getComponent("AIWalkerComp").path, '#FF0000');

		// fps
		context.fillText(getFpsString(), 10, 10);

		// mouse / touch pos
		var y = 20;
		var dy = 10;
		context.fillText("pointerXY["+Input.pointerX+","+Input.pointerY+"]", 10, y+=dy);
		context.fillText("pointerCanvasXY["+Input.pointerCanvasX+","+Input.pointerCanvasY+"]", 10, y+=dy);
		context.fillText("input debug:"+Input.debugString, 10, y+=dy);
	}
}

/*********************************
* PLAYER
*********************************/
function Player()
{
	GameObject.call(this);
	this.sprite = new ImageSprite( resources.images["player"] );

	//this.vx = 1;

	this.gx = gridOb.toGX(this.x);
	this.gy = gridOb.toGY(this.y);

	this.targetGX = this.gx;
	this.targetGY = this.gy;
	
	this.addComponent( "AIWalkerComp", new AIWalkerComp(gridOb, 2) );
}

// Inheritance
Player.prototype = Object.create(GameObject.prototype);

// override
Player.prototype.update = function()
{
	GameObject.prototype.update.call(this);
	
	// if(this.x > w)
	// {
	// 	this.x = 0;
	// }

	// if(Input.keys[Keys.LEFT_ARROW])
	// {
	// 	this.x -= 5;
	// }
	// else if(Input.keys[Keys.RIGHT_ARROW])
	// {
	// 	this.x += 5;
	// }
	// if(Input.keys[Keys.UP_ARROW])
	// {
	// 	this.y -= 5;
	// }
	// else if(Input.keys[Keys.DOWN_ARROW])
	// {
	// 	this.y += 5;
	// }

	if(Input.pointerIsDown)
	{
		var newTargetGX = gridOb.toGX(Input.pointerX);
		var newTargetGY = gridOb.toGY(Input.pointerY);

		console.log("new target", newTargetGX, newTargetGY);

		if(newTargetGX !== this.targetGX || newTargetGY !== this.targetGY)
		{
			this.targetGX = newTargetGX; this.targetGY = newTargetGY;
			var aiwalkercomp = this.getComponent("AIWalkerComp");
			var nextGX = this.gx;
			var nextGY = this.gy;
			if(aiwalkercomp.isWalking && aiwalkercomp.path.length > 1)
			{
				nextGX = gridOb.toGX(aiwalkercomp.destX);
				nextGY = gridOb.toGY(aiwalkercomp.destY);
			}
			aiwalkercomp.path = AStar.search(nextGX, nextGY, this.targetGX, this.targetGY, gridOb);
		}
	}
};
// Player.prototype.draw = function()
// {
// 	GameObject.prototype.draw.call(this);
// }

/*********************************
* SCREENS
*********************************/
function SwapScreen(newScreen)
{
	if(ui.firstChild)
		ui.removeChild(ui.firstChild);
	ui.appendChild( newScreen );
}

function CreateConnectScreen()
{
	var newNode = document.createElement('div');
    newNode.className = "containerCenterX";
	/*jshint multistr: true */
	newNode.innerHTML = '<div class="containerCenterY" \
	<h1>Connect to Peer</h1> \
	<div id="actions"> \
    Your ID is <span id="pid"></span><br> \
    Connect to a peer: <input type="text" id="rid" placeholder="Someone else\'s id"> \
    <input class="button" type="button" value="Connect" id="connect"> \
    <br> \
    <br> \
    <form id="send"> \
      <input type="text" id="text" placeholder="Enter message"><input class="button" type="submit" value="Send to selected peers"> \
    </form> \
    <button id="close">Close selected connections</button> \
    </div> \
    </div>';
  return newNode;
}