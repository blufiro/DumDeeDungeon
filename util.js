function loadScript(url, callback)
{
    // Adding the script tag to the head as suggested before
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;

    // Then bind the event to the callback function.
    // There are several events for cross browser compatibility.
    script.onreadystatechange = callback;
    script.onload = callback;

    // Fire the loading
    head.appendChild(script);
}

function defaultFor(arg, val) { return typeof arg !== 'undefined' ? arg : val; }

/*********************************
* RESIZE GAME, KEEP ASPECT RATIO
* from Gopherwood Studios
* http://www.html5rocks.com/en/tutorials/casestudies/gopherwoord-studios-resizing-html5-games/
*********************************/
var canvasWidth;
var canvasHeight;
var gameWidth;
var gameHeight;
var widthToHeight;
var canvasRatioX;
var canvasRatioY;
function canvas2gameX(canvasX) {return canvasX / canvasRatioX;}
function canvas2gameY(canvasY) {return canvasY / canvasRatioY;}
function game2canvasX(gameX) {return gameX * canvasRatioX;}
function game2canvasY(gameY) {return gameY * canvasRatioY;}
function resizeGame()
{
    var gameArea = document.getElementById('gameArea');
    var newWidth = window.innerWidth;
    var newHeight = window.innerHeight;
    var newWidthToHeight = newWidth / newHeight;
    
    if (newWidthToHeight > widthToHeight) {
        newWidth = newHeight * widthToHeight;
        gameArea.style.height = newHeight + 'px';
        gameArea.style.width = newWidth + 'px';
    } else {
        newHeight = newWidth / widthToHeight;
        gameArea.style.width = newWidth + 'px';
        gameArea.style.height = newHeight + 'px';
    }
    
    gameArea.style.marginTop = (-newHeight / 2) + 'px';
    gameArea.style.marginLeft = (-newWidth / 2) + 'px';
    
    var gameCanvas = document.getElementById('gameCanvas');
    gameCanvas.width = newWidth;
    gameCanvas.height = newHeight;
    canvasWidth = newWidth;
    canvasHeight = newHeight;

    canvasRatioX = canvasWidth / gameWidth;
    canvasRatioY = canvasHeight / gameHeight;

    console.log("resizeGame "+newWidth+","+newHeight, gameCanvas, gameArea);
}


/*********************************
* FRAME RATE 
*********************************/

// The higher this value, the less the fps will reflect temporary variations
// A value of 1 will only keep the last value
var fpsFilterStrength = 3;
var fpsFrameTime = 0, fpsLastLoop = now(), fpsThisLoop;
var frameCounter = 0;

function now() { return new Date(); }
function fpsUpdate()
{
  var thisFrameTime = (fpsThisLoop=now()) - fpsLastLoop;
  fpsFrameTime+= (thisFrameTime - fpsFrameTime) / fpsFilterStrength;
  fpsLastLoop = fpsThisLoop;
  frameCounter++;
}
function getFpsString()
{
    return (1000/fpsFrameTime).toFixed(1) + " fps f:"+frameCounter;
}

/*********************************
* DIRECTION INDICES
*********************************/
var DIRECTION_NONE = 0;
var DIRECTION_NORTH = 1;
var DIRECTION_SOUTH = (1<<1);
var DIRECTION_EAST = (1<<2);
var DIRECTION_WEST = (1<<3);

/*********************************
* INPUT 
*********************************/

var Keys = {
    TAB : 9,
    ENTER : 13,
    SHIFT : 16,
    CONTROL : 17,
    ALT : 18,
    ESC : 27,
    SPACE : 32,
    LEFT_ARROW : 37, UP_ARROW : 38, RIGHT_ARROW : 39, DOWN_ARROW : 40,
    A : 65, B : 66, C : 67, D : 68, E : 69, F : 70, G : 71, H : 72, I : 73,
    J : 74, K : 75, L : 76, M : 77, N : 78, O : 79, P : 80, Q : 81, R : 82,
    S : 83, T : 84, U : 85, V : 86, W : 87, X : 88, Y : 89, Z : 90,
};

var Input = {
    keys : {},
    keyPress : function (evt)
    {
        if (this.keys[evt.keyCode] > 0) { return; }
        this.keys[evt.keyCode] = evt.timeStamp || now().getTime();
    },
    keyRelease : function (evt)
    {
        this.keys[evt.keyCode] = 0;
    },
    pointerX : 0,
    pointerY : 0,
    pointerCanvasX : 0,
    pointerCanvasY : 0,
    pointerIsPressed : false,
    pointerIsReleased : false,
    pointerIsDown : false,
    debugString : "",
    pointerUpdate : function()
    {
        this.pointerIsPressed = false;
        this.pointerIsReleased = false;
        this.debugString = "";
    },
    pointerStart : function(x,y)
    {
        this.pointerMove(x,y);
        this.pointerIsDown = true;
        this.pointerIsPressed = true;
    },
    pointerMove : function (x,y)
    {
        this.pointerCanvasX = x + document.body.scrollLeft + document.documentElement.scrollLeft - canvas.parentNode.offsetLeft;
        this.pointerCanvasY = y + document.body.scrollTop + document.documentElement.scrollTop - canvas.parentNode.offsetTop;

        this.pointerX = Math.floor(canvas2gameX( this.pointerCanvasX ));
        this.pointerY = Math.floor(canvas2gameY( this.pointerCanvasY ));
    },
    pointerEnd : function (x,y)
    {
        this.pointerMove(x,y);
        this.pointerIsDown = false;
        this.pointerIsReleased = true;
    },
    mouseDown : function(evt)
    {
        this.pointerStart(evt.clientX, evt.clientY);
        this.debugString += "mouseDown,";
    },
    mouseMove : function(evt)
    {
        this.pointerMove(evt.clientX, evt.clientY);
        this.debugString += "mouseMove,";
    },
    mouseUp : function(evt)
    {
        this.pointerEnd(evt.clientX, evt.clientY);
        this.debugString += "mouseUp,";
    },
    touchStart : function(evt)
    {
        evt.preventDefault();
        this.pointerStart(evt.targetTouches[0].clientX, evt.targetTouches[0].clientY);
        this.debugString += "touchStart,";
    },
    touchMove : function(evt)
    {
        evt.preventDefault();
        this.pointerMove(evt.targetTouches[0].clientX, evt.targetTouches[0].clientY);
        this.debugString += "touchMove,";
    },
    touchEnd : function(evt)
    {
        evt.preventDefault();
        // touch end does not have any touches or targetTouches, so we use changedTouches
        this.pointerEnd(evt.changedTouches[0].clientX, evt.changedTouches[0].clientY);
        this.debugString += "touchEnd,";
    },
};
Input.pointerUpdate.bind(Input);

function registerInputEvents(canvas, preventScrolling)
{
    console.log("registerInputEvents", window);

    // key events
    window.addEventListener("keydown", Input.keyPress.bind(Input), false);
    window.addEventListener("keyup", Input.keyRelease.bind(Input), false);

    // mouse events
    canvas.addEventListener("mousedown", Input.mouseDown.bind(Input), false);
    canvas.addEventListener("mousemove", Input.mouseMove.bind(Input), false);
    document.body.addEventListener("mouseup", Input.mouseUp.bind(Input), false);
    
    // touch events
    canvas.addEventListener("touchstart", Input.touchStart.bind(Input), false);
    canvas.addEventListener("touchmove", Input.touchMove.bind(Input), true);
    canvas.addEventListener("touchend", Input.touchEnd.bind(Input), false);
    document.body.addEventListener("touchcancel", Input.touchEnd.bind(Input), false);

    // prevent scrolling
    if(preventScrolling)
    {
        document.body.addEventListener('touchmove', function(event) {
          event.preventDefault();
        }, false);
    }
}

/*********************************
* TRANSFORM 
*********************************/

function Transform()
{
    this.a = 1;     this.c = 0;     this.e = 0;
    this.b = 0;     this.d = 1;     this.f = 0;
}

Transform.prototype = {

    get x() { return this.e; },
    set x(value) { this.e = value; },
    
    get y() { return this.f; },
    set y(value) { this.f = value; }
};

/*********************************
* IMAGE SPRITE 
*********************************/
function ImageSprite(image)
{
    this.img = image;
}

ImageSprite.prototype.draw = function(ctx)
{
    ctx.drawImage(this.img, 0, 0);
};

/*********************************
* GAME COMPONENT 
*********************************/
function Component()
{
    this.m_gob = null;
}
Component.prototype = {
    get gameObject() { return this.m_gob; },
    set gameObject(value) { this.m_gob = value; },
};
Component.prototype.update = function()
{   //do nothing
};

/*********************************
* GAME OBJECT 
*********************************/

function GameObject()
{
    this.transform = new Transform();
    this.sprite = null;

    this.m_vx = 0;
    this.m_vy = 0;

    this.m_speed = 0;
    this.m_angle = 0;

    this.m_components  = {};
}

GameObject.prototype = {

    get x() { return this.transform.x; },
    set x(value) { this.transform.x = value; },

    get y() { return this.transform.y; },
    set y(value) { this.transform.y = value; },

    get vx() { return this.m_vx; },
    set vx(value) { this.m_vx = value; this.refreshAngleSpeed(); },

    get vy() { return this.m_vy; },
    set vy(value) { this.m_vy = value; this.refreshAngleSpeed(); },

    get speed() { return this.m_speed; },
    set speed(value) { this.m_speed = value; this.refreshVelocity(); },

    get angleDeg() { return this.m_angle * (180 / Math.PI); },
    set angleDeg(value) { this.m_angle = value * (Math.PI / 180); this.refreshVelocity(); },
    get angleRad() { return this.m_angle; },
    set angleRad(value) { this.m_angle = value; this.refreshVelocity(); },
};

GameObject.prototype.vxy = function(vx_ , vy_)
{
    this.m_vx = vx_;        this.m_vy = vy_;
    this.refreshAngleSpeed();
};

GameObject.prototype.update = function()
{
    this.transform.x += this.m_vx;
    this.transform.y += this.m_vy;

    for(var c in this.m_components)
    {
        this.m_components[c].update();
    }
};

GameObject.prototype.draw = function(ctx)
{
    if(this.sprite !== null)
    {
        ctx.save();
        
        var t = this.transform;
        ctx.transform(t.a, t.b, t.c, t.d, t.e, t.f);
        this.sprite.draw(ctx);

        ctx.restore();
    }
};

GameObject.prototype.refreshVelocity = function()
{
    this.m_vx = this.m_speed * Math.cos(this.m_angle);
    this.m_vy = this.m_speed * Math.sin(this.m_angle);
};

GameObject.prototype.refreshAngleSpeed = function()
{
    this.m_speed = Math.sqrt(this.m_vx * this.m_vx + this.m_vy * this.m_vy);
    this.m_angle = Math.atan2(this.m_vy, this.m_vx);
};

GameObject.prototype.getComponent = function(componentName) { return this.m_components[componentName]; };
GameObject.prototype.addComponent = function(componentName, component)
{
    if(! (component instanceof Component) )
        throw "adding invalid component";
    if(this.m_components[componentName] !== undefined)
        throw "replacing existing component!";

    this.m_components[componentName] = component;
    component.gameObject = this;
};
GameObject.prototype.removeComponent = function(componentName)
{
    if(this.m_components[componentName] !== undefined)
    {
        var component = this.m_components[componentName];
        component.gameObject = null;
        this.m_components[componentName] = null;
        delete this.m_components[componentName];
        return component;
    }
    return null;
};

/*********************************
* COMMON GAME COMPONENTS
*********************************/
function AIWalkerComp(gridOb, speed)
{
    Component.call(this);

    this.path = null;
    this.grid = gridOb;
    this.walkSpeed = speed;

    this.stopWalk();
}
// Inheritance
AIWalkerComp.prototype = Object.create(Component.prototype);
AIWalkerComp.prototype.walk = function(currCell, destCell)
{
    this.destX = this.grid.toX(destCell.gx);
    this.destY = this.grid.toY(destCell.gy);
    
    var px = destCell.gx - currCell.gx;
    var py = destCell.gy - currCell.gy;
    if(px > 0)
    {
        this.walkDir = DIRECTION_EAST;
        this.gameObject.vxy(this.walkSpeed, 0);
    }
    else if(px < 0)
    {
        this.walkDir = DIRECTION_WEST;
        this.gameObject.vxy(-this.walkSpeed, 0);
    }
    else if(py > 0)
    {
        this.walkDir = DIRECTION_SOUTH;
        this.gameObject.vxy(0, this.walkSpeed);
    }
    else if(py < 0)
    {
        this.walkDir = DIRECTION_NORTH;
        this.gameObject.vxy(0, -this.walkSpeed);
    }

    this.isWalking = true;
};
AIWalkerComp.prototype.snapToDest = function()
{
    if(this.gameObject)
    {
        this.gameObject.x = this.destX;
        this.gameObject.y = this.destY;
    }
};
AIWalkerComp.prototype.stopWalk = function()
{
    // note this is used in initialization also
    this.isWalking = false;
    this.destX = -1;
    this.destY = -1;
    this.walkDir = DIRECTION_NONE;
    if(this.gameObject)
        this.gameObject.speed = 0;
};
AIWalkerComp.prototype.update = function()
{
    //Component.prototype.update.call(this); // does nothing
    
    // check if reached destination
    if(this.isWalking)
    {
        if(this.destX !== -1 && this.destY !== -1)
        {
            var bReached;
            switch(this.walkDir)
            {
                case DIRECTION_NORTH: bReached = (this.gameObject.y <= this.destY); break;
                case DIRECTION_SOUTH: bReached = (this.gameObject.y >= this.destY); break;
                case DIRECTION_EAST: bReached = (this.gameObject.x >= this.destX); break;
                case DIRECTION_WEST: bReached = (this.gameObject.x <= this.destX); break;
                default: bReached = true; break;
            }

            if(bReached)
            {
                // measure overflow
                var overflow = 0;
                switch(this.walkDir)
                {
                    case DIRECTION_NORTH:
                    case DIRECTION_SOUTH: overflow = this.destY - this.gameObject.y; break;
                    case DIRECTION_EAST:
                    case DIRECTION_WEST: overflow = this.destX - this.gameObject.x; break;
                }

                // snap and update current cell id
                this.snapToDest();
                this.gameObject.gx = this.grid.toGX(this.gameObject.x);
                this.gameObject.gy = this.grid.toGY(this.gameObject.y);
                
                // shift out old cell
                if(this.path !== null)
                {
                    while(this.path.length > 0 &&
                        !this.grid.isCellEqual(this.path[0].gx, this.path[0].gy, this.gameObject.gx, this.gameObject.gy))
                        this.path.shift();
                }

                if(this.path === null || this.path.length <= 1)
                {
                    this.stopWalk();
                    return;
                }

                this.walk(this.path[0], this.path[1]);

                // push overflow into new direction
                switch(this.walkDir)
                {
                    case DIRECTION_NORTH:
                    case DIRECTION_SOUTH: this.gameObject.y -= overflow; break;
                    case DIRECTION_EAST:
                    case DIRECTION_WEST: this.gameObject.x -= overflow; break;
                }

            }//end if(bReached)
        }// end if(this.destX !== -1 && this.destY !== -1)
        else
        {
            this.stopWalk();
            return;
        }
    }
    else
    {
        // set a new destination and start walking again
        if(this.path !== null && this.path.length > 1)
        {
            this.walk(this.path[0], this.path[1]);
        }
    }
};

function NetComp(netOb, netID_, onRecvCallback)
{
    Component.call(this);

    this.m_lastTimestamp = 0;
    this.netID = netID_;
    this.onRecvCb = onRecvCallback;

    // register with Net
    netOb.registerComp(this);
}
NetComp.prototype = Object.create( Component.prototype );

NetComp.prototype.onRecv = function(data)
{
    if(!data.t)
    {
        console.log("data had no timestamp", data);
        return false;
    }

    if (this.m_lastTimestamp <= data.t)
    {
        this.m_lastTimestamp = data.t;
        this.onRecvCb(data);
        return true;
    }
    return false;
};

/*********************************
* GRID 
*********************************/
function Grid(numCellsX, numCellsY, worldWidth, worldHeight)
{
    this.m_nx = numCellsX;
    this.m_ny = numCellsY;
    this.m_ww = worldWidth;
    this.m_wh = worldHeight;

    for(var gx = 0; gx < this.m_nx; gx++)
    {
        this[gx] = [];
        for(var gy = 0; gy < this.m_ny; gy++)
        {
            this[gx][gy] = 0;
        }
    }
}

Grid.prototype = {
    get nx () { return this.m_nx; },
    get ny () { return this.m_ny; },
};

Grid.prototype.isEmpty = function(gx,gy)
{
    return (gx >= 0 && gx < this.m_nx &&
            gy >= 0 && gy < this.m_ny &&
            this[gx][gy] === 0);
};
Grid.prototype.toGX = function (x) { return Math.floor(x * this.m_nx / this.m_ww); };
Grid.prototype.toGY = function (y) { return Math.floor(y * this.m_ny / this.m_wh); };
Grid.prototype.toX = function (gx) { return gx * this.m_ww / this.m_nx; };
Grid.prototype.toY = function (gy) { return gy * this.m_wh / this.m_ny; };
Grid.prototype.isCellEqual = function(gx1, gy1, gx2, gy2) { return gx1 === gx2 && gy1 === gy2; };

/*********************************
* MinHeap
* nodes that are added must implement less(otherNode) function
*********************************/

function MinHeap()
{
    this.array = [];
}
MinHeap.prototype.parentIndex = function(i) { return (i-1) >> 1; };
MinHeap.prototype.leftChildIndex = function(i) { return (i << 1) + 1; };
MinHeap.prototype.rightChildIndex = function(i) { return (i << 1) + 2; };
MinHeap.prototype.swap = function(i, j)
{
    var temp = this.array[i];
    this.array[i] = this.array[j];
    this.array[j] = temp;
};
MinHeap.prototype.isEmpty = function()
{
    return (this.array.length === 0);
};
MinHeap.prototype.downHeapify = function(i, arrlen)
{
    var minId = i;
    var leftId = this.leftChildIndex(minId);
    var rightId = this.rightChildIndex(minId);
    if(leftId < arrlen && this.array[leftId].less( this.array[minId] ))
        minId = leftId;
    if(rightId < arrlen && this.array[rightId].less( this.array[minId] ))
        minId = rightId;

    if(i != minId)
    {
        this.swap(i, minId);
        this.downHeapify(minId, arrlen);
    }
};
MinHeap.prototype.push = function(node)
{
    var len = this.array.push(node);
    
    //  heapify upwards
    var i  = len-1;
    var parentId = this.parentIndex(i);
    
    while(i > 0 && this.array[i].less( this.array[parentId] ) )
    {
        this.swap(i, parentId);
        i = parentId;
    }
};
MinHeap.prototype.pop = function()
{
    if(this.isEmpty())
        return null;
    else
    {
        var returnNode = this.array[0];

        var last = this.array.pop();
        var arrlen = this.array.length;
        if(arrlen > 0)
        {
            // put last element into root
            this.array[0] = last;
            this.downHeapify(0, arrlen);
        }
        // else only contains root, so result is empty array

        return returnNode;
    }
};

/*********************************
* A STAR PATHFINDING 
*********************************/
function AStarNode(gx_, gy_, cameFrom_, gScore_, fScore_)
{
    this.m_gx = gx_;
    this.m_gy = gy_;
    this.m_cameFrom = cameFrom_;
    this.m_gScore = gScore_;
    this.m_fScore = fScore_;
}
AStarNode.prototype = {
    get gx() { return this.m_gx; },
    get gy() { return this.m_gy; },

    get cameFrom() { return this.m_cameFrom; },
    set cameFrom(value) { this.m_cameFrom = value; },
    get fScore() { return this.m_fScore; },
    set fScore(value) { this.m_fScore = value; },
    get gScore() { return this.m_gScore; },
    set gScore(value) { this.m_gScore = value;},
};
AStarNode.prototype.getNeighbours = function(grid)
{
    var retArr = [];

    // top
    // if(grid.isEmpty(this.m_gx-1, this.m_gy-1))
    //     retArr.push( {gx: this.m_gx-1, gy: this.m_gy-1} );

    if(grid.isEmpty(this.m_gx, this.m_gy-1))
        retArr.push( {gx: this.m_gx, gy: this.m_gy-1} );

    // if(grid.isEmpty(this.m_gx+1, this.m_gy-1))
    //     retArr.push( {gx: this.m_gx+1, gy: this.m_gy-1} );

    // mid
    if(grid.isEmpty(this.m_gx-1, this.m_gy))
        retArr.push( {gx: this.m_gx-1, gy: this.m_gy} );

    if(grid.isEmpty(this.m_gx+1, this.m_gy))
        retArr.push( {gx: this.m_gx+1, gy: this.m_gy} );

    // bottom
    // if(grid.isEmpty(this.m_gx-1, this.m_gy+1))
    //     retArr.push( {gx: this.m_gx-1, gy: this.m_gy+1});

    if(grid.isEmpty(this.m_gx, this.m_gy+1))
        retArr.push( {gx: this.m_gx, gy: this.m_gy+1} );

    // if(grid.isEmpty(this.m_gx+1, this.m_gy+1))
    //     retArr.push( {gx: this.m_gx+1, gy: this.m_gy+1} );

    return retArr;
};
AStarNode.prototype.less = function(otherNode)
{
    return this.fScore < otherNode.fScore;
};

var AStar = {
    distBetween : function(node, gx, gy)
    {
        return Math.abs(node.gx - gx) + Math.abs(node.gy - gy);
    },
    heuristicCostEstimate : function(goal, gx, gy)
    {
        return Math.abs(goal.gx - gx) + Math.abs(goal.gy - gy);
    },
    // returns an array of came from AStarNodes
    reconstructPath : function(node)
    {
        if(node.cameFrom)
        {
            var arr = this.reconstructPath(node.cameFrom);
            arr.push(node);
            return arr;
        }
        else
            return [node];
    },
    // search with nodes
    search : function(startGX, startGY, goalGX, goalGY, grid)
    {
        var openPQ = new MinHeap();
        var openSet = {};
        var closedSet = {};

        var goal = new AStarNode(goalGX, goalGY, null, 0, 0);
        var start = new AStarNode(startGX, startGY, null, 0, this.heuristicCostEstimate(goal, startGX, startGY) );
        openPQ.push(start);
        openSet[start.gx] = {};
        openSet[start.gx][start.gy] = start;

        var curr;
        var neighbours;
        var n;
        var tempNode;
        while( !openPQ.isEmpty()  )
        {
            // remove from open set
            curr = openPQ.pop();
            delete openSet[curr.gx][curr.gy];
            if ((curr.gx === goal.gx) && (curr.gy === goal.gy))
                return this.reconstructPath(curr);

            // add to closed set
            if(closedSet[curr.gx] === undefined)
                closedSet[curr.gx] = {};
            closedSet[curr.gx][curr.gy] = curr;

            // check neighbours
            neighbours = curr.getNeighbours(grid);
            for(var i=neighbours.length-1; i >= 0; i--)
            {
                n = neighbours[i];
                tempNode = null;
                var tentativeGScore = curr.gScore + this.distBetween(curr, n.gx, n.gy);
                var tentativeFScore = tentativeGScore + this.heuristicCostEstimate(goal, n.gx, n.gy);
                if(closedSet[n.gx] !== undefined && closedSet[n.gx][n.gy] !== undefined)
                {
                    if(tentativeFScore >= closedSet[n.gx][n.gy].fScore)
                        continue;
                    else
                    {
                        // update fscore and put back into openPQ
                        tempNode = closedSet[n.gx][n.gy];
                        delete closedSet[n.gx][n.gy];
                        tempNode.fScore = tentativeFScore;
                        tempNode.gScore = tentativeGScore;
                        tempNode.cameFrom = curr;
                        openPQ.push(tempNode);
                        if(!openSet[tempNode.gx])
                            openSet[tempNode.gx] = {};
                        openSet[tempNode.gx][tempNode.gy] = tempNode;
                    }
                }
                else if(openSet[n.gx] !== undefined && openSet[n.gx][n.gy] !== undefined)
                {
                    // update in openPQ
                    tempNode = openSet[n.gx][n.gy];
                    if(tentativeFScore < tempNode.fScore)
                    {
                        tempNode.fScore = tentativeFScore;
                        tempNode.gScore = tentativeGScore;
                        tempNode.cameFrom = curr;
                    }
                }
                else
                {   // create new node
                    tempNode = new AStarNode(n.gx, n.gy, curr, tentativeGScore, tentativeFScore);
                    openPQ.push(tempNode);
                    if(openSet[tempNode.gx] === undefined)
                        openSet[tempNode.gx] = {};
                    openSet[tempNode.gx][tempNode.gy] = tempNode;
                }
            }//end for neighbour n
        }//end while
    },
};

/*********************************
* WEB SOCKETS NETWORKING
* This uses WebRTC. Please include peer.min.js http://peerjs.com/
*********************************/
function Net(key_, pingTimeoutMS_, pingDisconnectMS_)
{
    this.m_peer = new Peer({key: key_});
    this.m_peer.on('open', this.onOpen.bind(this));
    this.m_peer.on('connection', this.onConnect.bind(this));
    this.m_peer.on('close', this.onClose.bind(this));
    this.m_peer.on('error', this.onError.bind(this));

    this.m_peerID = null;
    this.m_connection = null;
    this.m_lastsent = null;
    this.m_lastrecv = null;

    // Instances of NetComponents from game objects will be attached here
    this.m_netComponents = {};

    this.pingDelay = 999999;
    this.pingTimeout = pingTimeoutMS_;
    this.pingDisconnectDuration = pingDisconnectMS_;
    this.pingLast = 0;
    this.pingState = this.PING_STATE_READY;
}
Net.prototype = {
    get pid() { return this.m_peerID; },
    get otherPid() { return this.m_connection.peer; },
    get isOnline() { return (this.m_peer && !this.m_peer.disconnected); },
    get isConnected() { return (this.m_connection && this.m_connection.open); },

    get PING_STATE_READY() { return 0; },
    get PING_STATE_SENT() { return 1; },
    get PING_STATE_WAIT() { return 2; },
};
Net.prototype.onOpen = function(id)
{
    console.log('My peer ID is: ' + id);
    this.m_peerID = id;
};
Net.prototype.setupConnection = function(conn)
{
    if(this.m_connection !== null)
        throw "Connection already exists!";
    this.m_connection = conn;
    this.m_connection.on('data', this.onMessage.bind(this));
    this.m_connection.on('close', this.onDisconnect.bind(this));
    this.m_connection.on('error', this.onError.bind(this));

    this.pingLast = now().getTime();
    this.pingState = this.PING_STATE_READY;
};
Net.prototype.onConnect = function(conn)
{
    console.log('Received connection ', conn);
    
    this.setupConnection(conn);
};
Net.prototype.onClose = function(evt)
{
    console.log("Connection closed, peer destroyed.");
};
Net.prototype.onError = function(err)
{
    console.log(err);
};
Net.prototype.connect = function(destPeerID)
{
    var conn = this.m_peer.connect(destPeerID);
    this.onConnect( conn );
};
Net.prototype.close = function()
{
    this.m_peer.destroy();
    this.m_peer = null;
    this.m_connection = null;
};
Net.prototype.registerComp = function(netComp)
{
    if(!(netComp instanceof NetComp))
        throw "Invalid NetComp"+netComp;
    this.m_netComponents[netComp.netID] = netComp;
};
Net.prototype.send = function(netComp, dataObj)
{
    var toSend = dataObj;
    // add timestamp
    toSend.t = now().getTime();
    // add netID
    toSend.netID = netComp.netID;
    
    this.m_lastsent = toSend;
    this.m_connection.send(this.m_lastsent);

    console.log("sent message: "+JSON.stringify(this.m_lastsent));
};
Net.prototype.onMessage = function(data)
{
    // ping pong
    if(data.ping !== undefined)
    {
        if( (data.ping & 0x1) === 0)
        {
            // send back
            data.ping ++;
            this.m_connection.send( data );
            console.log("pong");
            return;
        }
        else //if( (data.ping & 0x1) === 1)
        {
            this.pingLast = now().getTime();
            // recv after bounce from other
            this.pingDelay = ( this.pingLast - data.t ) / 2;
            // wait until threshold before ping again
            // as we do not want to flood the network with pings
            this.pingState = this.PING_STATE_WAIT;
            data.ping++;
            console.log("pang");
            if(data.ping > 2)
                console.log("warning: double ping recv "+data.ping);
            return;
        }
    }

    // pings do not affect component code
    this.m_lastrecv = data;
    console.log( "Received Message: " + JSON.stringify(data));

    var netComp = this.m_netComponents[data.netID];
    if(netComp)
    {
        netComp.onRecv(data);
    }
};
Net.prototype.onTimeout = function()
{
    // to override
    console.log("Net timed out!");
};
Net.prototype.onTimeoutRecover = function()
{
    // to override
    console.log("Net recovered from timeout.");
};
Net.prototype.onDisconnect = function()
{
    // to override
    console.log("Net disconnected!");

    this.close();
};
Net.prototype.ping = function(bSetLast)
{
    if(bSetLast)
    {
        var t = now().getTime();
        this.pingLast = t;
    }
    this.m_connection.send({ "ping":0, 't':this.pingLast });
    this.pingState = this.PING_STATE_SENT;
};
Net.prototype.update = function()
{
    if(!this.isConnected)
        return;

    var t = now().getTime();
    var dt = t - this.pingLast;

    // auto ping if ping state is ready
    if(this.pingState == this.PING_STATE_READY)
    {
        this.ping(true);
    }
    else if(this.pingState == this.PING_STATE_WAIT)
    {
        // use timeout/4 as heuristic 
        // since ping should take < half of timeout
        if( dt > this.pingTimeout / 4)
        {
            this.ping(true);
        }
    }

    // check partner timeout
    if( dt > this.pingTimeout )
    {
        this.pingDelay = dt;
        if(!this.isTimeout)
        {
            console.log("timeout", dt, this.pingTimeout);
            //timeout event
            this.isTimeout = true;
            this.onTimeout();

            // try to ping again
            this.ping(false);
        }
    }
    else if(this.isTimeout)
    {
        console.log("timeout recover dt:",dt, this.pingTimeout, this.pingState);
        // timeout recover event
        this.isTimeout = false;
        this.onTimeoutRecover();
    }

    if( (dt > this.pingDisconnectDuration))
    {
        this.close();
    }
};