Components.utils.import('resource://gre/modules/Services.jsm');

var core = {
	addon: {
		name: 'NativeShot',
		id: 'NativeShot@jetpack'
	}
};

var gQS = queryStringAsJson(window.location.search.substr(1));
console.log('gQS:', gQS, window.location.search.substr(1));

var gCanBase;
var gCanDim;

var gCtxBase;
var gCtxDim;

const gStyle = {
	dimFill: 'rgba(0, 0, 0, 0.6)',
	lineDash: [3, 3],
	stroke: '#fff',
	lineDashAlt: [0, 3, 0],
	strokeAlt: '#000',
	lineWidth: '1',
	resizePtSize: 7,
	resizePtFill: '#000'
};

const NS_HTML = 'http://www.w3.org/1999/xhtml';
const NS_XUL = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';

var gUsedW;
var gUsedH;

function init() {
	// set globals	
	gCanBase = document.getElementById('canBase');
	gCanDim = document.getElementById('canDim');
	
	gCtxBase = gCanBase.getContext('2d');
	gCtxDim = gCanDim.getContext('2d');
	
	// set dimensions of canvas
	
	// setAttributeNS doesnt work
	// gCanBase.setAttributeNS(NS_HTML, 'width', gQS.w);
	// gCanBase.setAttributeNS(NS_HTML, 'height', gQS.h);
	// gCanDim.setAttributeNS(NS_HTML, 'width', gQS.w);
	// gCanDim.setAttributeNS(NS_HTML, 'height', gQS.h);
	
	if (gQS.win81ScaleX || gQS.win81ScaleY) {
		gUsedW = Math.ceil(gQS.w / gQS.win81ScaleX);
		gUsedH = Math.ceil(gQS.h / gQS.win81ScaleY);
	}

	
	gCanBase.setAttribute('width', gUsedW);
	gCanBase.setAttribute('height', gUsedH);
	gCanDim.setAttribute('width', gUsedW);
	gCanDim.setAttribute('height', gUsedH);
	
	// fill
	gCtxDim.fillStyle = gStyle.dimFill;
	console.log('gStyle.dimFill:', gStyle.dimFill);
	gCtxDim.fillRect(0, 0, gQS.w, gQS.h);
	console.log('filled:', 0, 0, gQS.w, gQS.h)
	
	Services.obs.notifyObservers(null, core.addon.id + '_nativeshot-editor-request', JSON.stringify({
		topic: 'init',
		iMon: gQS.iMon
	}));
	
	var s = new CanvasState(gCanDim);
	s.addShape(new Shape(monToMultiMon.x(40), monToMultiMon.y(40), monToMultiMon.w(50), monToMultiMon.h(50))); // The default is gray
	s.addShape(new Shape(monToMultiMon.x(60), monToMultiMon.y(140), monToMultiMon.w(40), monToMultiMon.h(60), 'lightskyblue'));
	// Lets make some partially transparent
	s.addShape(new Shape(monToMultiMon.x(80), monToMultiMon.y(150), monToMultiMon.w(60), monToMultiMon.h(30), 'rgba(127, 255, 212, .5)'));
	s.addShape(new Shape(monToMultiMon.x(125), monToMultiMon.y(80), monToMultiMon.w(30), monToMultiMon.h(80), 'rgba(245, 222, 179, .7)'));
}

function screenshotXfer(aData) {
	console.log('in screenshotXfer, aData:', aData);
	
	var screenshotImageData = new ImageData(new Uint8ClampedArray(aData.screenshotArrBuf), gQS.w, gQS.h);
	
	if (gQS.win81ScaleX || gQS.win81ScaleY) {
		var canDum = document.createElementNS(NS_HTML, 'canvas');
		canDum.setAttribute('width', gQS.w);
		canDum.setAttribute('height', gQS.h);
		
		var ctxDum = canDum.getContext('2d');
		ctxDum.putImageData(screenshotImageData, 0, 0);
		
		gCtxBase.scale(1/gQS.win81ScaleX, 1/gQS.win81ScaleY);
		gCtxDim.scale(1/gQS.win81ScaleX, 1/gQS.win81ScaleY);
		
		gCtxBase.drawImage(canDum, 0, 0);
	} else {
		gCtxBase.putImageData(screenshotImageData, 0, 0);
	}
}

window.addEventListener('load', init, false);

window.addEventListener('message', function(aWinMsgEvent) {
	console.error('incoming message to window iMon "' + gQS.iMon + '", aWinMsgEvent:', aWinMsgEvent);
	var aData = aWinMsgEvent.data;
	if (aData.topic in window) {
		window[aData.topic](aData);
	} else {
		throw new Error('unknown topic received: ' + aData.topic);
	}
}, false);

// start - canvas functions
// based on http://simonsarris.com/blog/510-making-html5-canvas-useful
// all numbers passed to ctx functions, should be the monToMultiMon-scaled numbers

	// CODE FOR KEEPING TRACK OF OBJECTS

	
	// CODE FOR KEEPING TRACK OF CANVAS STATE
		function CanvasState(canvas) {
			// **** First some setup! ****

			this.canvas = canvas;
			this.width = gQS.w; // same as - monToMultiMon.w(canvas.width);
			this.height = gQS.h; // same as - monToMultiMon.h(canvas.height);
			
			this.ctx = canvas.getContext('2d');
			// This complicates things a little but but fixes mouse co-ordinate problems
			// when there's a border or padding. See getMouse for more detail
			// var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
			// if(document.defaultView && document.defaultView.getComputedStyle) {
				this.stylePaddingLeft = 0; // parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10) || 0;
				this.stylePaddingTop = 0; // parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10) || 0;
				this.styleBorderLeft = 0; // parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10) || 0;
				this.styleBorderTop = 0; // parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10) || 0;
			// }
			// Some pages have fixed-position bars (like the stumbleupon bar) at the top or left of the page
			// They will mess up mouse coordinates and this fixes that
			// var html = document.body.parentNode;
			this.htmlTop = 0; // html.offsetTop;
			this.htmlLeft = 0; // html.offsetLeft;

			// **** Keep track of state! ****

			this.valid = false; // when set to false, the canvas will redraw everything
			this.shapes = []; // the collection of things to be drawn
			this.dragging = false; // Keep track of when we are dragging
			// the current selected object. In the future we could turn this into an array for multiple selection
			this.selection = null;
			this.dragoffx = 0; // See mousedown and mousemove events for explanation
			this.dragoffy = 0;

			// **** Then events! ****

			// This is an example of a closure!
			// Right here "this" means the CanvasState. But we are making events on the Canvas itself,
			// and when the events are fired on the canvas the variable "this" is going to mean the canvas!
			// Since we still want to use this particular CanvasState in the events we have to save a reference to it.
			// This is our reference!
			var myState = this;

			//fixes a problem where double clicking causes text to get selected on the canvas
			canvas.addEventListener('selectstart', function (e) {
				e.preventDefault();
				return false;
			}, false);
			
			// Up, down, and move are for dragging
			canvas.addEventListener('mousedown', function (e) {
				var mouse = myState.getMouse(e);
				var mx = mouse.x;
				var my = mouse.y;
				var shapes = myState.shapes;
				var l = shapes.length;
				for(var i = l - 1; i >= 0; i--) {
					if(shapes[i].contains(mx, my)) {
						var mySel = shapes[i];
						// noit: move this shape to the top in the z-index
						shapes.push(shapes.splice(i, 1)[0]);
						
						// Keep track of where in the object we clicked
						// so we can move it smoothly (see mousemove)
						myState.dragoffx = mx - mySel.x;
						myState.dragoffy = my - mySel.y;
						myState.dragging = true;
						myState.selection = mySel;
						myState.valid = false;
						return;
					}
				}
				// havent returned means we have failed to select anything.
				// If there was an object selected, we deselect it
				if(myState.selection) {
					myState.selection = null;
					myState.valid = false; // Need to clear the old selection border
				}
			}, true);
			canvas.addEventListener('mousemove', function (e) {
				if(myState.dragging) {
					var mouse = myState.getMouse(e);
					// We don't want to drag the object by its top-left corner, we want to drag it
					// from where we clicked. Thats why we saved the offset and use it here
					myState.selection.x = mouse.x - myState.dragoffx;
					myState.selection.y = mouse.y - myState.dragoffy;
					myState.valid = false; // Something's dragging so we must redraw
				}
			}, true);
			canvas.addEventListener('mouseup', function (e) {
				myState.dragging = false;
			}, true);
			// double click for making new shapes
			canvas.addEventListener('dblclick', function (e) {
				var mouse = myState.getMouse(e);
				myState.addShape(new Shape(mouse.x - 10, mouse.y - 10, 20, 20, 'rgba(0,255,0,.6)'));
			}, true);

			// **** Options! ****

			this.selectionColor = '#CC0000';
			this.selectionWidth = 2;
			this.interval = 30;
			setInterval(function () {
				myState.draw();
			}, myState.interval);
		}

		CanvasState.prototype.addShape = function (shape) {
			this.shapes.push(shape);
			this.valid = false;
		}

		CanvasState.prototype.clear = function () {
			this.ctx.clearRect(0, 0, this.width, this.height);
			this.ctx.fillStyle = gStyle.dimFill;
			this.ctx.fillRect(0, 0, this.width, this.height);
		}

		// While draw is called as often as the INTERVAL variable demands,
		// It only ever does something if the canvas gets invalidated by our code
		CanvasState.prototype.draw = function () {
			// if our state is invalid, redraw and validate!
			if(!this.valid) {
				var ctx = this.ctx;
				var shapes = this.shapes;
				this.clear();

				// ** Add stuff you want drawn in the background all the time here **

				// clear rect for all the shapes (i dont clear rect in the shape draw, so shapes can overlap shapes)
				var l = shapes.length;
				for(var i = 0; i < l; i++) {
					var shape = shapes[i];
					// We can skip the drawing of elements that have moved off the screen:
					if(shape.x > this.width || shape.y > this.height ||
						shape.x + shape.w < 0 || shape.y + shape.h < 0) continue;
					shapes[i].clearDim(ctx);
				}
				
				// draw all shapes
				var l = shapes.length;
				for(var i = 0; i < l; i++) {
					var shape = shapes[i];
					// We can skip the drawing of elements that have moved off the screen:
					if(shape.x > this.width || shape.y > this.height ||
						shape.x + shape.w < 0 || shape.y + shape.h < 0) continue;
					shapes[i].draw(ctx);
				}

				// draw selection
				// right now this is just a stroke along the edge of the selected Shape
				if(this.selection != null) {
					ctx.strokeStyle = this.selectionColor;
					ctx.lineWidth = this.selectionWidth;
					var mySel = this.selection;
					ctx.strokeRect(mySel.x, mySel.y, mySel.w, mySel.h);
				}

				// ** Add stuff you want drawn on top all the time here **

				this.valid = true;
			}
		}


		// Creates an object with x and y defined, set to the mouse position relative to the state's canvas
		// If you wanna be super-correct this can be tricky, we have to worry about padding and borders
		CanvasState.prototype.getMouse = function (e) {
			var element = this.canvas,
				offsetX = 0,
				offsetY = 0,
				mx, my;

			// noit: i dont need this
			// // Compute the total offset
			// if(element.offsetParent !== undefined) {
			// 	do {
			// 		offsetX += element.offsetLeft;
			// 		offsetY += element.offsetTop;
			// 	} while ((element = element.offsetParent));
			// }

			// // Add padding and border style widths to offset
			// // Also add the <html> offsets in case there's a position:fixed bar
			// offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
			// offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

			// mx = e.pageX - offsetX;
			// my = e.pageY - offsetY;
			
			mx = monToMultiMon.x(e.screenX);
			my = monToMultiMon.y(e.screenY);
			
			console.log('e.screenX:', e.screenX, 'e.pageX:', e.pageX, 'mx:', mx);

			// We return a simple javascript object (a hash) with x and y defined
			return {
				x: mx,
				y: my
			};
		}
	// CODE FOR MOUSE EVENTS

	
	// CODE FOR DRAWING THE OBJECTS AS THEY ARE MADE AND MOVE AROUND
	
		// Constructor for Shape objects to hold data for all drawn objects.
		// For now they will just be defined as rectangles.
		function Shape(x, y, w, h, fill) {
			// This is a very simple and unsafe constructor. All we're doing is checking if the values exist.
			// "x || 0" just means "if there is a value for x, use that. Otherwise use 0."
			// But we aren't checking anything else! We could put "Lalala" for the value of x 
			this.x = x || 0;
			this.y = y || 0;
			this.w = w || 1;
			this.h = h || 1;
			this.fill = fill || '#AAAAAA';
		}
		
		// Clears the dim layer of the space the shape will occupy when drawn
		Shape.prototype.clearDim = function (ctx) {
			ctx.clearRect(this.x, this.y, this.w, this.h);
		}
		
		// Draws this shape to a given context
		Shape.prototype.draw = function (ctx) {
			ctx.fillStyle = this.fill;
			ctx.fillRect(this.x, this.y, this.w, this.h);
		}

		// Determine if a point is inside the shape's bounds
		Shape.prototype.contains = function (mx, my) {
			// All we have to do is make sure the Mouse X,Y fall in the area between
			// the shape's X and (X + Width) and its Y and (Y + Height)
			return(this.x <= mx) && (this.x + this.w >= mx) &&
				(this.y <= my) && (this.y + this.h >= my);
		}

		
// end - canvas functions

var monToMultiMon = {
	// aX is the x on the current monitor (so 0,0 is the top left of the current monitor) - same for aY
	x: function(aX) {
		return gQS.win81ScaleX ? Math.ceil(gQS.x + ((aX - gQS.x) * gQS.win81ScaleX)) : aX;
	},
	y: function(aY) {
		return gQS.win81ScaleY ? Math.ceil(gQS.y + ((aY - gQS.y) * gQS.win81ScaleY)) : aY
	},
	w: function(aW) {
		// width
		return gQS.win81ScaleX ? Math.ceil(aW * gQS.win81ScaleX) : aW;
	},
	h: function(aH) {
		// width
		return gQS.win81ScaleY ? Math.ceil(aH * gQS.win81ScaleY) : aH;
	},
	obj: function(aCoord) {
		// aCoord has a x and a y
		aCoord.x = gQS.win81ScaleX ? Math.ceil(gQS.x + ((aX - gQS.x) * gQS.win81ScaleX)) : aX;
		aCoord.y = gQS.win81ScaleY ? Math.ceil(gQS.y + ((aY - gQS.y) * gQS.win81ScaleY)) : aY;
	},
	// ctxFunc: function(aFuncName, aFuncArgs, )
}
// common functions

// rev3 - https://gist.github.com/Noitidart/725a9c181c97cfc19a99e2bf1991ebd3
function queryStringAsJson(aQueryString) {
	var asJsonStringify = aQueryString;
	asJsonStringify = asJsonStringify.replace(/&/g, '","');
	asJsonStringify = asJsonStringify.replace(/=/g, '":"');
	asJsonStringify = '{"' + asJsonStringify + '"}';
	asJsonStringify = asJsonStringify.replace(/"(\d+(?:.\d+)?|true|false)"/g, function($0, $1) { return $1; });
	
	return JSON.parse(asJsonStringify);
}