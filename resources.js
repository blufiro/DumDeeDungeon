/*********************************
* RESOURCES 
*********************************/

function Resources()
{
	// public variables
	this.images = {};
	this.imagesToLoad = 0;
	this.imagesLoadedCallback = null;

	// private variables
	
	// private methods

}

// public methods
Resources.prototype.loadImages = function(imgKeysPaths, imgsLoadedCallback)
{
	console.log("Resources::loadImages() ");
	
	this.imagesLoadedCallback = imgsLoadedCallback;

	for(var key in imgKeysPaths)
	{
		var path = imgKeysPaths[key];
		this.loadImage(key, path);
	}
};


// semi-private methods
Resources.prototype.imageLoaded = function()
{
	this.imagesToLoad--;
	
	console.log(this.imagesToLoad);

	if(this.imagesToLoad <= 0 && this.imagesLoadedCallback !== null)
	{
		this.imagesLoadedCallback();
	}
};
Resources.prototype.loadImage = function(key, path)
{
	// create an image object
	var img = new Image();
	var res = this;
	img.onload = function() { res.imageLoaded(); };
	img.src = path;
	this.images[key] = img;

	this.imagesToLoad++;

	console.log("loading images["+key+"] path:"+path);
};