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
var numHoles = 15;
var maxTreasureSize = 3;

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
		"item_item0" : "images/item.png",
		"item_gold1" : "images/item_treasure1.png",
		"item_gold2" : "images/item_treasure2.png",
		"item_gold3" : "images/item_treasure3.png",
		"item_hole0" : "images/hole.png",
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

function generateMap()
{
	if(netOb.isServer)
	{
		var item;
		var netComp = player1Gob.getComponent("NetComp");
		var gx;
		var gy;
		var treasuresCountObj = {};
		var i;
		var x;
		var y;

		// spawn holes
		for(i=0; i<numHoles; i++)
		{
			gx = Math.floor(Math.random()*gridOb.nx);
			gy = Math.floor(Math.random()*gridOb.ny);

			// check if already spawned something
			// gx & gy should not be out of bounds
			if(!gridOb.isCellEmpty(gx, gy))
			{
				i--;
				continue;
			}

			// check if too near other holes
			var bTooManyHoles = false;
			for(x=gx-1; x<=gx+1; x++)
			{
				for(y=gy-1; y<=gy+1; y++)
				{
					// only count if is within bounds
					if(gridOb.isWithinBounds(x,y) &&
						treasuresCountObj[x] !== undefined &&
						treasuresCountObj[x][y] >= maxTreasureSize)
					{
						bTooManyHoles = true;
						break;
					}
				}
				if(bTooManyHoles)
					break;
			}
			if(bTooManyHoles)
				continue;

			// if conditions are satisfied, spawn hole item
			item = CreateItem("hole", "hole"+i, gx, gy);
			
			// add counts to treasures
			for(x=gx-1; x<=gx+1; x++)
			{
				for(y=gy-1; y<=gy+1; y++)
				{
					// avoid adding count to hole cell
					if(x==gx && y==gy)
						continue;

					// avoid adding to other hole cells, including out of bounds
					if(!gridOb.isWithinBounds(x,y) || !gridOb.isCellEmpty(x,y))
						continue;

					if(treasuresCountObj[x] === undefined)
						treasuresCountObj[x] = {};

					if(treasuresCountObj[x][y] === undefined)
						treasuresCountObj[x][y] = 1;
					else
					{
						treasuresCountObj[x][y]++;

						if(treasuresCountObj[x][y] > maxTreasureSize)
							throw "invalid number of treasure state";
					}
				}
			}
			// also set this cell count to 0 in case it had a count before placement
			treasuresCountObj[gx][gy] = 0;
			
			if(netComp && netOb.isConnected)
			{
				netOb.send(netComp,
					{
						"cmd": "ic", // item create
						"iid": item.id,
						"gx" : item.gx,
						"gy" : item.gy,
						"typ" : item.type,
						"rnk" : item.rank,
					}
				);
			}
		}//end spawn holes

		// spawn treasures around holes
		i=0;
		for(x in treasuresCountObj)
		{
			for(y in treasuresCountObj[x])
			{
				var count = treasuresCountObj[x][y];

				if(count === 0)
					continue;

				item = CreateItem( "tres", "tres"+i, x, y, count);
				i++;

				if(netComp && netOb.isConnected)
				{
					netOb.send(netComp,
						{
							"cmd": "ic", // item create
							"iid": item.id,
							"gx" : item.gx,
							"gy" : item.gy,
							"typ" : item.type,
							"rnk" : item.rank,
						}
					);
				}
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
		generateMap();
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

	this.isFallen = false;
	this.carriedItem = null;
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
};//end routeTo()

Player.prototype.fall = function(gx,gy)
{
	console.log("p"+this.playerID, "fall", gx, gy);

	// force sync position
	this.gx = gx;
	this.gy = gy;
	this.x = gridOb.toX(this.gx);
	this.y = gridOb.toY(this.gy);

	// set state
	this.isFallen = true;
};

Player.prototype.onRescued = function()
{
	// todo animation
	this.isFallen = false;
};

Player.prototype.rescue = function(playerID, gx, gy)
{
	var playerRescued = gobMan.getGob("player"+playerID+"Gob");
	if(playerRescued.gx !== gx || playerRescued.gy !== gy)
		throw "player rescued was at "+playerRescued.gx+","+playerRescued.gy+
			" instead of "+gx+","+gy;
	
	playerRescued.onRescued();
};

Player.prototype.pickUp = function(itemObj)
{
	// take item
	itemObj.taken(this.playerID);

	// carry item
	if(itemObj.isCarryable)
	{
		if(this.carriedItem !== null)
			throw "Already carrying an item!";

		this.carriedItem = itemObj;
		this.carriedItem.x = 0;
		this.carriedItem.y = -5;
		this.addChild(this.carriedItem);
	}
};

Player.prototype.putDown = function(itemObj, gx_, gy_)
{
	// put down item
	if(this.carriedItem !== itemObj || this.carriedItem === null)
		throw "Put down invalid item";

	this.carriedItem.removeParent();
	this.carriedItem = null;

	itemObj.placed(this.playerID, gx_, gy_);
};

Player.prototype.nwRouteTo = function(newTargetGX, newTargetGY)
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
};

Player.prototype.nwFall = function(gx, gy)
{
	this.fall(gx,gy);

	var netComp = this.getComponent("NetComp");
	if(netComp && netOb.isConnected)
	{
		netOb.send(netComp,
			{
				"cmd" : "fl",
				"gx" : gx,
				"gy" : gy,
			}
		);
	}
};

Player.prototype.nwRescue = function(playerID, gx, gy)
{
	this.rescue(playerID, gx, gy);

	var netComp = this.getComponent("NetComp");
	if(netComp && netOb.isConnected)
	{
		netOb.send(netComp,
			{
				"cmd" : "rc",
				"pid" : playerID,
				"gx" : gx,
				"gy" : gy,
			}
		);
	}
};

Player.prototype.nwPickUp = function(itemObj)
{
	var netComp;

	// server gets to cheat
	if(netOb.isServer)
	{
		if(itemObj.owner !== 0)
			throw "Item already has an owner";
		else
		{
			this.pickUp(itemObj);

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
						"rnk" : itemObj.rank,
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
					"rnk" : itemObj.rank,
				}
			);
		}
	}// end else netOb.isServer
};//end nwPickUp()

Player.prototype.nwPutDown = function(itemObj)
{
	var netComp;
	
	// server gets to cheat
	if(netOb.isServer)
	{
		if(itemObj.owner === 0)
			throw "Item does not have an owner";
		else
		{
			// put down item
			this.putDown(itemObj, this.gx, this.gy);

			netComp = this.getComponent("NetComp");
			if(netComp && netOb.isConnected)
			{
				netOb.send(netComp,
					{
						"cmd": "ip", // item placed
						"iid": itemObj.id,
						"gx" : this.gx,
						"gy" : this.gy,
						"typ" : itemObj.type,
						"rnk" : itemObj.rank,
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
					"cmd": "iq", // item place request
					"iid": itemObj.id,
					"gx" : this.gx,
					"gy" : this.gy,
					"typ" : itemObj.type,
					"rnk" : itemObj.rank,
				}
			);
		}
	}// end else netOb.isServer
};//end nwPutDown()

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
		// save other player
		var otherPlayerID = 0;
		switch(this.playerID)
		{
			case 1: otherPlayerID = 2; break;
			case 2: otherPlayerID = 1; break;
		}
		var otherPlayerGob = gobMan.getGob("player"+otherPlayerID+"Gob");
		if(otherPlayerGob && otherPlayerGob.isFallen &&
			gridOb.manhatDist(otherPlayerGob.gx, otherPlayerGob.gy, this.gx, this.gy) <= 1)
		{
			this.nwRescue(otherPlayerID, otherPlayerGob.gx, otherPlayerGob.gy);
			return;
		}

		// check for items
		if(gridOb.isWithinBounds(pointerGX, pointerGY) &&
			// 0 distance means player must be on cell before item can be picked up
			gridOb.manhatDist(pointerGX, pointerGY, this.gx, this.gy) <= 0)
		{
			// put down item
			if( gridOb.isCellEmpty(this.gx, pointerGY) && this.carriedItem !== null )
			{
				this.nwPutDown(this.carriedItem);
			}
			// pick up item
			else if( !gridOb.isCellEmpty(pointerGX, pointerGY) && this.carriedItem === null )
			{
				var cellObj = gridOb.getCell(pointerGX, pointerGY);
				while(cellObj !== null )
				{
					if(cellObj instanceof Item &&
						cellObj.isPickable)
					{
						// pick up item
						this.nwPickUp(cellObj);
						return;
					}

					cellObj = cellObj.next;
				}//end while cellObj !== null
			}
		}//end if cell empty
	}
	if(Input.pointerIsDown)
	{
		if(gridOb.isCellWalkable(pointerGX, pointerGY))
		{
			if(this.isFallen)
			{
				// shout for help!
			}
			else
			{
				// walk
				if(pointerGX !== this.targetGX || pointerGY !== this.targetGY)
				{
					this.nwRouteTo(pointerGX, pointerGY);
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
		case "fl":
		{
			// params: data.gx, data.gy
			this.fall(data.gx, data.gy);
		}
		break;
		case "rc":
		{
			// params: data.pid, data.gx, data.gy
			this.rescue(data.pid, data.gx, data.gy);
		}
		break;
		case "ic": // item create
		{
			// params: data.iid, data.gx, data.gy, data.typ, data.rnk
			item = gobMan.getGob(data.iid);
			if(!item)
			{
				// only create if not already existent
				item = CreateItem(data.typ, data.iid, data.gx, data.gy, data.rnk);
			}
		}
		break;
		case "it": // item taken
		{
			// params: data.iid, data.gx, data.gy, data.typ, data.rnk
			item = gobMan.getGob(data.iid);
			if(!item)
			{
				console.log("Item cannot be found!", data.iid, data.gx, data.gy, data.typ, data.rnk);
				// for now just fake it
				item = new Item(data.typ, data.iid, data.gx, data.gy, data.rnk);
			}

			this.pickUp(item);
		}
		break;
		case "ir": // item request
		{
			// params: data.iid, data.gx, data.gy, data.typ, data.rnk
			item = gobMan.getGob(data.iid);
			if(!item)
			{
				console.log("Item cannot be found!", data.iid, data.gx, data.gy, data.typ, data.rnk);
				// for now just fake it
				item = new Item(data.typ, data.iid, data.gx, data.gy, data.rnk);
			}

			// if there is no owner,
			if(item.owner === 0)
			{
				// can be taken
				this.nwPickUp(item);
			}
			else
			{
				// do not reply; it cannot be taken
			}
		}
		break;
		case "ip": // item placed
		{
			item = gobMan.getGob(data.iid);
			if(!item)
			{
				console.log("Item cannot be found!", data.iid, data.gx, data.gy, data.typ, data.rnk);
				// for now just fake it
				item = new Item(data.typ, data.iid, data.gx, data.gy, data.rnk);
			}

			this.putDown(item, data.gx. data.gy);
		}
		break;
		case "iq": // item place request
		{
			// params: data.iid, data.gx, data.gy, data.typ, data.rnk
			item = gobMan.getGob(data.iid);
			if(!item)
			{
				console.log("Item cannot be found!", data.iid, data.gx, data.gy, data.typ, data.rnk);
				// for now just fake it
				item = new Item(data.typ, data.iid, data.gx, data.gy, data.rnk);
			}

			// if there is no owner,
			if(item.owner === this.playerID)
			{
				// can be taken
				this.nwPutDown(item);
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
* is a gob that is designed to be synced through network
* player recvs codes and corresponding actions will be performed on client
* "ic" : creates item
* "it" : take item
* "ir" : request to take item
* "ip" : place item
* "iq" : request to place item
*********************************/
function Item(type_, id_, gx_, gy_, rank_)
{
	GameObject.call(this);

	console.log("***item:", id_, type_, rank_);
	this.sprite = new ImageSprite( resources.images["item_"+type_+rank_] );

	this.id = id_;
	this.gx = gx_;
	this.gy = gy_;
	this.type = type_;
	this.rank = rank_;
	this.owner = 0; // no one
	this.isPickable = true;
	this.isCarryable = true;
	
	this.addToGrid();

	// set removeFromGrid as default action
	this.onTaken = this.removeFromGrid;
	// set addToGrid as default action
	this.onPlaced = this.addToGrid;
}

Item.prototype = Object.create(GameObject.prototype);

Item.prototype.addToGrid = function()
{
	this.x = gridOb.toX(this.gx);
	this.y = gridOb.toY(this.gy);
	gridOb.addToCell(this.gx, this.gy, this);
	gobMan.addGob( this.id, this);
};
Item.prototype.removeFromGrid = function()
{
	gridOb.removeFromCell(this.gx, this.gy, this);
	// rm from gobMan
	gobMan.removeGob(this.id);
};
Item.prototype.taken = function(playerID_)
{
	this.owner = playerID_;
	
	this.onTaken();
};
Item.prototype.placed = function(playerID_, gx_, gy_)
{
	this.owner = 0;
	this.gx = gx_;
	this.gy = gy_;

	this.onPlaced();
};

function CreateItem(type_, id_, gx_, gy_, rank_)
{
	var item;
	switch(type_)
	{
		case "hole": // hole is the item that is buried, makes player fall
		{
			item = new Item(type_, id_, gx_, gy_, 0);
			item.visible = true;
			item.sprite.image = resources.images["item_"+"item0"];
			item.isCarryable = false;
			item.onTaken = function()
			{
				var playerGob = gobMan.getGob( "player"+this.owner+"Gob" );
				playerGob.fall(gx_,gy_);
				this.visible = true;
				// change image
				this.sprite.image = resources.images["item_"+this.type+this.rank];
				this.isPickable = false;
			};
		}
		break;
		case "tres": // treasure is the item that is buried
		{
			item = new Item(type_, id_, gx_, gy_, rank_);
			item.itemRank = rank_;
			item.visible = true;
			item.sprite.image = resources.images["item_"+"item0"];
			item.isCarryable = false;
			item.onTaken = function()
			{
				var itemNum = parseInt(this.id.substring(4), 10);
				CreateItem("gold", "gold"+itemNum, this.gx, this.gy, this.itemRank);
				this.removeFromGrid();
			};
		}
		break;
		case "gold": // Gold is the item that is dug out
		{
			item = new Item(type_, id_, gx_, gy_, rank_);
		}
		break;
	}

	return item;
}

/*********************************
* COLLECTION POINT
*********************************/

function CollectionSpot(gx,gy)
{

}

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
Your ID: <input type="text" id="peerID" class="peerID" placeholder="connecting..." readonly><br> \
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
	var otherPeerID = document.getElementById("rid").value;
	netOb.connect(otherPeerID);
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

	var peerIDNode = document.getElementById("peerID");
	if(peerIDNode)
	{
		peerIDNode.value = this.peerID;
	}
};
GameNet.prototype.onConnect = function(conn)
{
	Net.prototype.onConnect.call(this, conn);

	if(this.peerID < this.otherPeerID)
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
		generateMap();
	}
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