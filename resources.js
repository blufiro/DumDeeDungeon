/*********************************
* RESOURCES 
*********************************/

// global variable
var resources = new Resources();

function Resources()
{
	// public variables
	this.queues = [];
	// private variables
	
	// private methods
}

// public methods
Resources.prototype.loadQueue = function(keysPaths)
{
	var resqueue = new ResourceQueue();
	resqueue.load(keysPaths, function() { resources.onQueueLoaded(this); } );
	this.queues.push( resqueue );
};
Resources.prototype.onQueueLoaded = function(queue)
{
	// dump contents into self
	for(var j=0; j< queue.array.length; j++)
	{
		var res = queue.array[j];
		this[res.key] = this[res.value];
	}

	// remove queue
	for(var i=0; i < this.queues.length; i++)
	{
		if(this.queues[i] === queue)
		{
			this.splice(i,1);
			break;
		}
	}

	// trigger event
	if(this.queues.length === 0 && this.onAllQueuesLoaded !== null)
	{
		var evt = new Event("complete");
		this.dispatchEvent(evt);
	}
};

Resources.prototype.loadSpritesheet = function(datapath, imagepath)
{
	var resqueue = new ResourceQueue();
	resqueue.load(
		{
			"data" : datapath,
			"img" : imagepath
		}, function() { resources.onSpritesheetLoaded(this); } );
	this.queues.push( resqueue );
};

Resources.prototype.onSpritesheetLoaded = function(queue)
{
	var data = queue.array[0].value;
	var img = queue.array[1].value;

	// dump into self
	var spritedata;
	for(var i in data)
	{
		spritedata = data[i];
		this[i] = new Sprite(img, spritedata.x, spritedata.y, spritedata.w, spritedata.h);
	}
};

/*********************************
* Sprite 
*********************************/
function Sprite(img, x,y,w,h)
{
	this.img = img;
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
}
Sprite.prototype.draw = function(ctx)
{

}

/*********************************
* QUEUE 
*********************************/

function ResourceQueue()
{
	this.array = [];
	this.toload = 0;
	this.loadedCallback = null;
}
ResourceQueue.prototype.onload = function()
{
	this.toload--;

	if(this.toload <= 0 && this.loadedCallback !== null)
	{
		this.loadedCallback();
	}
};
ResourceQueue.prototype.load = function(keysPaths, loadedCallback_)
{
	console.log("Resources::loadImages() ");

	if(this.toload !== 0)
		throw "previous load not done yet!";
	
	this.loadedCallback = loadedCallback_;

	var resource;
	var path;
	var resourceType;
	var onloadCallback = this.onload.bind(this);
	for(var key in keysPaths)
	{
		path = keysPaths[key];
		resource = null;
		resourceType = path.substring(path.lastIndexOf('.'));
		switch(resourceType)
		{
			case ".png":
			case ".jpg":
			case ".gif":
			case ".bmp":
			{
				resource = new ImageResource();
				
			}
			break;
			case ".js":
			{
				resource = new JsResource();
			}
		}//end switch

		if(resource !== null)
		{
			resource.load(key, path, onloadCallback);
			this.array.push(resource);
			this.toload++;
		}
	}
};

/*********************************
* RESOURCE 
*********************************/

function Resource()
{
	this.key = null;
	this.path = null;
	this.value = null;
}
Resource.prototype.load = function(key, path)
{
	this.key = key;
	this.path = path;
};

/*********************************
* IMAGE RESOURCE 
*********************************/

function ImageResource()
{
	Resource.call(this);
}
ImageResource.prototype = Object.create(Resource.prototype);
ImageResource.prototype.load = function(key, path, onload)
{
	Resource.prototype.load.call(this, key, path);

	// create an image object
	var img = new Image();
	img.onload = onload;
	img.src = path;
	this.value = img;
	
	console.log("loading image:",key, path);
};

/*********************************
* JAVASCRIPT RESOURCE 
*********************************/
function JsResource()
{
	Resource.call(this);
}
JsResource.prototype = Object.create(Resource.prototype);
JsResource.prototype.load = function(key, path, onload)
{
	Resource.prototype.load.call(this, key, path);

	// create script element
	var script = document.createElement('script');
	script.id = key;
	var jsresource = this;
	script.onload = function() {
		jsresource.onJsLoad();
		onload();
	};
	// assing src with callback name
	script.src = path;
	// insert script to document and load content
	document.body.appendChild(script);
};
JsResource.prototype.onJsLoad = function()
{
	// pull out loaded js object from global temp
	this.value = loadedjs[this.id];
};