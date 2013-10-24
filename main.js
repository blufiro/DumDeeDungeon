var canvas;
var w;
var h;
var context;

var resources;
var playerGob;
var intervalID;
var showDebugInfo = true;

function main()
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
	playerGob = new Player();
	
	intervalID = setInterval(mainloop, 1000.0/60.0);
}

function mainloop()
{
	update();
	draw();
	drawDebugInfo();
	Input.pointerUpdate();
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

function drawDebugInfo()
{
	if(showDebugInfo)
	{
		context.setTransform(1,0,0,1,0,0);
		context.font="12px Monospace";
		context.fillStyle="#000000";

		// fps
		context.fillText(getFpsString(), 10, 20);

		// mouse / touch pos
		context.fillText("pointerXY["+Input.pointerX+","+Input.pointerY+"]", 10, 38);
		context.fillText("input debug:",Input.debugString, 10, 50);
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

	console.log("vx",this.vx);
}

// Inheritance
Player.prototype = Object.create(GameObject.prototype);

// override
Player.prototype.update = function()
{
	GameObject.prototype.update.call(this);
	
	if(this.x > w)
	{
		this.x = 0;
	}

	if(Input.keys[Keys.LEFT_ARROW])
	{
		this.x -= 5;
	}
	else if(Input.keys[Keys.RIGHT_ARROW])
	{
		this.x += 5;
	}
	if(Input.keys[Keys.UP_ARROW])
	{
		this.y -= 5;
	}
	else if(Input.keys[Keys.DOWN_ARROW])
	{
		this.y += 5;
	}

	if(Input.pointerIsPressed || Input.pointerIsReleased)
	{
		this.x = Input.pointerX;
		this.y = Input.pointerY;
	}
};