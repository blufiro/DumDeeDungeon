var canvas;
var w;
var h;
var context;
var onErrorFunc;

var resources;
var playerGob;
var gridOb;
var intervalID;
var showDebugInfo = true;

function main(onErrorFunc_)
{
	onErrorFunc = onErrorFunc_;

	try
	{
		loadScript("resources.js", onResourcesLoaded);

		canvas = document.getElementsByTagName('canvas')[0];
		w = canvas.width;
		h = canvas.height;
		console.log(w+" "+h);
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

	bgGob = new GameObject();
	bgGob.sprite = new ImageSprite( resources.images["bg"] );
	gridOb = new Grid(w/32, h/32, w, h);
	playerGob = new Player();
	
	intervalID = setInterval(mainloop, 1000.0/60.0);
}

function mainloop()
{
	try
	{
		update();
		draw();
		drawDebugInfo();
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
	context.clearRect(0,0, w, h);

	// context.fillStyle='#712033';
	// context.fillRect(50,50,100,80);

	bgGob.draw(context);
	playerGob.draw(context);
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
		context.setTransform(1,0,0,1,0,0);
		context.font="12px Monospace";
		context.fillStyle="#000000";

		drawDebugPath(playerGob.getComponent("AIWalkerComp").path, '#FF0000');

		// fps
		context.fillText(getFpsString(), 10, 20);

		// mouse / touch pos
		context.fillText("pointerXY["+Input.pointerX+","+Input.pointerY+"]", 10, 38);
		context.fillText("input debug:"+Input.debugString, 10, 50);
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