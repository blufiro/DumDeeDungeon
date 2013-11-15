var canvas;
var ui;
var context;
var onErrorFunc;

var resources;
var gobMan;
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
		"gradient" : "images/gradient.jpg",
		"item" : "images/item.png"
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

	netOb = new GameNet();
	gridOb = new Grid(15, 10, gameWidth, gameHeight);
	
	gobMan = new GameObjectManager();
	
	var bgGob = new GameObject();
	bgGob.sprite = new ImageSprite( resources.images["bg"] );
	gobMan.addGob("bgGob", bgGob);
	
	player1Gob = gobMan.addGob("player1Gob", new Player(1));
	player2Gob = gobMan.addGob("player2Gob", new Player(2));
	
	intervalID = setInterval(mainloop, 1000.0/60.0);

	resizeGame();
	window.addEventListener('resize', resizeGame, false);
	window.addEventListener('orientationchange', resizeGame, false);

	SwapScreen(CreateConnectScreen());
}

function generateItems(prefix_)
{
	if(netOb.isServer)
	{
		var item;
		var netComp = player1Gob.getComponent("NetComp");
		for(var i=0; i<10; i++)
		{
			item = new Item( prefix_+i,
				Math.floor(Math.random()*gridOb.nx),
				Math.floor(Math.random()*gridOb.ny),
				null);
			
			if(netComp && netOb.isConnected)
			{
				netOb.send(netComp,
					{
						"cmd": "ic", // item create
						"iid": item.id,
						"gx" : item.gx,
						"gy" : item.gy,
						"typ" : item.type,
					}
				);
			}
		}
	}
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
	cheatsUpdate();
	fpsUpdate();
	gobMan.update();
	netOb.update();
}

function draw()
{
	context.clearRect(0,0, canvasWidth, canvasHeight);

	// context.fillStyle='#712033';
	// context.fillRect(50,50,100,80);
	context.save();
	context.transform(canvasRatioX,0,0,canvasRatioY,0,0);

	gobMan.draw(context);
	
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

function cheatsUpdate()
{
	// force remove screen and set playerID
	if(netOb.playerID === 0 && Input.keys[Keys.Q] && Input.keys[Keys.P])
	{
		RemoveScreen();
		netOb.playerID = 1;
		netOb.isServer = true;
		generateItems("AAA");
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
	console.log("p"+this.playerID, "routeTo", newTargetGX, newTargetGY);
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
Player.prototype.pickUp = function(itemObj)
{
	var netComp;

	// server gets to cheat
	if(netOb.isServer)
	{
		if(itemObj.owner !== 0)
			throw "Item already has an owner";
		else
		{
			// take item
			itemObj.taken(this.playerID);

			netComp = this.getComponent("NetComp");
			if(netComp && netOb.isConnected)
			{
				netOb.send(netComp,
					{
						"cmd": "it", // item taken
						"iid": itemObj.id,
						"gx" : itemObj.gx,
						"gy" : itemObj.gy,
						"typ" : itemObj.type,
					}
				);
			}
		}
	}
	else
	{
		// client has to ask server for permission
		netComp = this.getComponent("NetComp");
		if(netComp && netOb.isConnected)
		{
			netOb.send(netComp,
				{
					"cmd": "ir", // item request
					"iid": itemObj.id,
					"gx" : itemObj.gx,
					"gy" : itemObj.gy,
					"typ" : itemObj.type,
				}
			);
		}
	}// end else netOb.isServer
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

	var pointerGX = gridOb.toGX(Input.pointerX);
	var pointerGY = gridOb.toGY(Input.pointerY);

	if(Input.pointerIsReleased)
	{
		// check for items
		if(!gridOb.isEmpty(pointerGX, pointerGY))
		{
			var obj = gridOb[pointerGX][pointerGY];
			if(obj instanceof Item &&
				gridOb.manhatDist(pointerGX, pointerGY, this.gx, this.gy) <= 1)
			{
				// pick up item
				this.pickUp(obj);
				return;
			}
		}
	}
	if(Input.pointerIsDown)
	{
		console.log("clicked", pointerGX, pointerGY);
		if(gridOb.isEmpty(pointerGX, pointerGY))
		{
			// walk
			if(pointerGX !== this.targetGX || pointerGY !== this.targetGY)
			{
				this.routeTo(pointerGX, pointerGY);
				
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
		}//end if(gridOb.isEmpty(pointerGX, pointerGY))
	}//end if(Input.pointerIsDown)
};
Player.prototype.onRecv = function(data)
{
	var item;

	switch(data.cmd)
	{
		case "mv": // move
		{
			// params: data.tgx, data.tgy
			this.routeTo(data.tgx, data.tgy);
		}
		break;
		case "ic": // item create
		{
			// params: data.iid, data.gx, data.gy, data.typ
			item = gobMan.getGob(data.iid);
			if(!item)
			{
				// only create if not already existent
				item = new Item(data.iid, data.gx, data.gy, data.typ);
			}
		}
		break;
		case "it": // item taken
		{
			// params: data.iid, data.gx, data.gy, data.typ
			item = gobMan.getGob(data.iid);
			if(!item)
			{
				console.log("Item cannot be found!", data.iid, data.gx, data.gy, data.typ);
				// for now just fake it
				item = new Item(data.iid, data.gx, data.gy, data.typ);
			}

			item.taken(this.playerID);
		}
		break;
		case "ir": // item request
		{
			// params: data.iid, data.gx, data.gy, data.typ
			item = gobMan.getGob(data.iid);
			if(!item)
			{
				console.log("Item cannot be found!", data.iid, data.gx, data.gy, data.typ);
				// for now just fake it
				item = new Item(data.iid, data.gx, data.gy, data.typ);
			}

			// if there is no owner,
			if(item.owner === 0)
			{
				// can be taken
				this.pickUp(item);
			}
			else
			{
				// do not reply; it cannot be taken
			}
		}
		break;
	}//end switch
};

/*********************************
* ITEM
*********************************/
function Item(id_, gx_, gy_, type_)
{
	GameObject.call(this);

	this.sprite = new ImageSprite( resources.images["item"] );

	this.id = id_;
	this.gx = gx_;
	this.gy = gy_;
	this.type = type_;
	this.owner = 0;

	this.x = gridOb.toX(this.gx);
	this.y = gridOb.toY(this.gy);
	gridOb[this.gx][this.gy] = this;
	gobMan.addGob( this.id, this);
}

Item.prototype = Object.create(GameObject.prototype);

Item.prototype.taken = function(playerID_)
{
	this.owner = playerID_;
	gridOb[this.gx][this.gy] = null;
	// rm from gobMan
	gobMan.removeGob(this.id);
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
	this.isServer = false;
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
		this.isServer = true;
	}
	else
	{
		this.playerID = 2;
		this.isServer = false;
	}
	console.log("This is player "+this.playerID);

	// remove connect screen
	RemoveScreen();
};
GameNet.prototype.onConnOpen = function()
{
	Net.prototype.onConnOpen.call(this);

	// game sync and start
	if(this.isServer)
	{
		generateItems("BBB");
	}
}
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