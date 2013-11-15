var canvas;
var ui;
var context;
var onErrorFunc;

var resources;
var player1Gob;
var player2Gob;
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
		"player1" : "images/player1.png",
		"player2" : "images/player2.png",
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
	netOb = new GameNet();
	gridOb = new Grid(15, 10, gameWidth, gameHeight);
	player1Gob = new Player(1);
	player2Gob = new Player(2);
	
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
	player1Gob.update();
	player2Gob.update();
	netOb.update();
}

function draw()
{
	context.clearRect(0,0, canvasWidth, canvasHeight);

	// context.fillStyle='#712033';
	// context.fillRect(50,50,100,80);
	context.save();
	context.transform(canvasRatioX,0,0,canvasRatioY,0,0);

	bgGob.draw(context);
	player1Gob.draw(context);
	player2Gob.draw(context);

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

		drawDebugPath(player1Gob.getComponent("AIWalkerComp").path, '#FF0000');
		drawDebugPath(player2Gob.getComponent("AIWalkerComp").path, '#00FF00');

		// fps
		context.fillText(getFpsString(), 10, 10);

		// mouse / touch pos
		var y = 20;
		var dy = 10;
		context.fillText("pointerXY["+Input.pointerX+","+Input.pointerY+"]", 10, y+=dy);
		context.fillText("pointerCanvasXY["+Input.pointerCanvasX+","+Input.pointerCanvasY+"]", 10, y+=dy);
		context.fillText("input debug:"+Input.debugString, 10, y+=dy);
		context.fillText("ping:"+netOb.pingDelay+"ms", 10, y+=dy);
		context.fillText("pingState:"+netOb.pingState, 10, y+=dy);
	}
}

/*********************************
* PLAYER
*********************************/
function Player(playerID_)
{
	GameObject.call(this);

	this.playerID = playerID_;

	this.sprite = new ImageSprite( resources.images["player"+this.playerID] );

	//this.vx = 1;

	this.gx = gridOb.toGX(this.x);
	this.gy = gridOb.toGY(this.y);

	this.targetGX = this.gx;
	this.targetGY = this.gy;
	
	this.addComponent( "AIWalkerComp", new AIWalkerComp(gridOb, 2) );
	this.addComponent( "NetComp", new NetComp(netOb, "player"+this.playerID, this.onRecv.bind(this)) );
}

// Inheritance
Player.prototype = Object.create(GameObject.prototype);

Player.prototype.routeTo = function(newTargetGX, newTargetGY)
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
};

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

	// handle input only if same id as netOb
	if(netOb.playerID !== this.playerID)
		return;

	if(Input.pointerIsDown)
	{
		var newTargetGX = gridOb.toGX(Input.pointerX);
		var newTargetGY = gridOb.toGY(Input.pointerY);

		console.log("new target", newTargetGX, newTargetGY);

		if(newTargetGX !== this.targetGX || newTargetGY !== this.targetGY)
		{
			this.routeTo(newTargetGX, newTargetGY);
			
			// send this over
			var netComp = this.getComponent("NetComp");
			if(netComp && netOb.isConnected)
			{
				netOb.send(netComp,
					{
						"cmd": "mv",
						"tgx": this.targetGX,
						"tgy": this.targetGY,
					}
				);
			}
		}
	}
};
Player.prototype.onRecv = function(data)
{
	switch(data.cmd)
	{
		case "mv":
		{
			if(data.tgx !== undefined && data.tgy !== undefined)
			{
				this.routeTo(data.tgx, data.tgy);
			}
			break;
		}
	}//end switch
};

/*********************************
* SCREENS
*********************************/

/*jshint multistr: true */
function RemoveScreen()
{
	if(ui.firstChild)
	{
		ui.removeChild(ui.firstChild);
		ui.style.pointerEvents = "none";
	}
}
function SwapScreen(newScreen)
{
	RemoveScreen();
	if (newScreen)
	{
		ui.appendChild( newScreen );
		ui.style.pointerEvents = "auto";
	}
}
function CreateDialog(dialogID, headHTML, bodyHTML)
{
	var nodeX = document.createElement('div');
	nodeX.id = dialogID;
    nodeX.className = "containerCenterX";
    
    var nodeY = document.createElement('div');
    nodeY.className = "containerCenterY";
    nodeX.appendChild(nodeY);

    var contentWrapper = document.createElement('div');
    contentWrapper.className = "dialog";
    nodeY.appendChild(contentWrapper);

    var headlineNode = document.createElement('div');
    headlineNode.className = "dialogHead";
    headlineNode.innerHTML = headHTML;
    contentWrapper.appendChild(headlineNode);

    contentWrapper.appendChild(document.createElement('br'));

    var bodyNode = document.createElement('div');
    bodyNode.className = "dialogBody";
    bodyNode.innerHTML = bodyHTML;
    contentWrapper.appendChild(bodyNode);

	return nodeX;
}

function CreateConnectScreen()
{
	var contentNode = CreateDialog("ConnectScreen",
		"Grab a peer to start",
		' \
Your ID: <input type="text" id="pid" placeholder="connecting..." readonly><br> \
Connect to: <input type="text" id="rid" placeholder="Other\'s id"> \
<input class="button" type="button" value="Connect" id="connect" onclick="onClickConnect()"> \
		'
	);
	return contentNode;
}
function CreateDisconnectedScreen()
{
    var contentNode = CreateDialog( "DisconnectedScreen",
        "Lost Connection",
        ' \
You may be facing network difficulties.<br> \
Please reload. \
        '
    );
    return contentNode;
}
function onClickConnect()
{
	var otherPid = document.getElementById("rid").value;
	netOb.connect(otherPid);
}

/*********************************
* GAME NETWORKING
*********************************/
function GameNet()
{
	Net.call(this, 'p2nl3kjvwpnwmi', 2000, 30000);
	this.playerID = 0;
}
// Inheritance
GameNet.prototype = Object.create(Net.prototype);
GameNet.prototype.onOpen = function(id)
{
	Net.prototype.onOpen.call(this, id);

	var pidNode = document.getElementById("pid");
	if(pidNode)
	{
		pidNode.value = this.pid;
	}
};
GameNet.prototype.onConnect = function(conn)
{
	Net.prototype.onConnect.call(this, conn);

	if(this.pid < this.otherPid)
	{
		this.playerID = 1;
	}
	else
	{
		this.playerID = 2;
	}
	console.log("This is player "+this.playerID);

	// remove connect screen
	RemoveScreen();
	// game sync and start
};
GameNet.prototype.onMessage = function(evt)
{
	Net.prototype.onMessage.call(this, evt);


};
// GameNet.prototype.onTimeout = function()
// {

// };
// GameNet.prototype.onTimeoutRecover = function()
// {

// };
GameNet.prototype.onDisconnect = function()
{
	Net.prototype.onDisconnect.call(this);
	SwapScreen(CreateDisconnectedScreen());
};