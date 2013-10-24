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
* FRAME RATE 
*********************************/

// The higher this value, the less the fps will reflect temporary variations
// A value of 1 will only keep the last value
var fpsFilterStrength = 3;
var fpsFrameTime = 0, fpsLastLoop = new Date(), fpsThisLoop;

function fpsUpdate()
{
  var thisFrameTime = (fpsThisLoop=new Date()) - fpsLastLoop;
  fpsFrameTime+= (thisFrameTime - fpsFrameTime) / fpsFilterStrength;
  fpsLastLoop = fpsThisLoop;
}
function getFpsString()
{
    return (1000/fpsFrameTime).toFixed(1) + " fps";
}

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
        this.keys[evt.keyCode] = evt.timeStamp || (new Date()).getTime();
    },
    keyRelease : function (evt)
    {
        this.keys[evt.keyCode] = 0;
    },
    pointerX : 0,
    pointerY : 0,
    pointerIsPressed : false,
    pointerIsReleased : false,
    pointerIsDown : false,
    debugString : "",
    pointerUpdate : function()
    {
        this.pointerIsPressed = false;
        this.pointerIsReleased = false;
        debugString = "";
    },
    pointerStart : function(x,y)
    {
        this.pointerMove(x,y);
        this.pointerIsDown = true;
        this.pointerIsPressed = true;
    },
    pointerMove : function (x,y)
    {
        this.pointerX = x + document.body.scrollLeft + document.documentElement.scrollLeft - canvas.offsetLeft;
        this.pointerY = y + document.body.scrollTop + document.documentElement.scrollTop - canvas.offsetTop;
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
        debugString += "mouseDown,";
    },
    mouseMove : function(evt)
    {
        this.pointerMove(evt.clientX, evt.clientY);
        debugString += "mouseMove,";
    },
    mouseUp : function(evt)
    {
        this.pointerEnd(evt.clientX, evt.clientY);
        debugString += "mouseUp,";
    },
    touchStart : function(evt)
    {
        evt.preventDefault();
        this.pointerStart(evt.targetTouches[0].clientX, evt.targetTouches[0].clientY);
        debugString += "touchStart,";
    },
    touchMove : function(evt)
    {
        evt.preventDefault();
        this.pointerMove(evt.targetTouches[0].clientX, evt.targetTouches[0].clientY);
        debugString += "touchMove,";
    },
    touchEnd : function(evt)
    {
        evt.preventDefault();
        // touch end does not have any touches or targetTouches, so we use changedTouches
        this.pointerEnd(evt.changedTouches[0].clientX, evt.changedTouches[0].clientY);
        debugString += "touchEnd,";
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

GameObject.prototype.update = function()
{
    this.transform.x += this.m_vx;
    this.transform.y += this.m_vy;
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