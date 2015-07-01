# Dragble

Dragble.js is a tiny JavaScript library for creating draggable elements.
It has not dependencies and works on IE9+ and touch devices.

## Usage

You use the following syntax to create a new draggy object:

new Dragble(element, config)

# Options

element (required)
DOM element or selector of the draggy object
config (optional)
Optional configuration object
Configuration Options

Following configuration options are available when creating the draggy object:

bindTo (string or element)
DOM element (or selector) to which the draggy object is constrained by
limitsX (array with start and end values (numbers))
Manual setting limiting horizontal movement
limitsY (array with start and end values (numbers))
Manual setting limiting vertical movement
onChange (function)
Callback that will be called when the object is dragged
restrictX (boolean)
Make it impossible to move the object horizontally
restrictY (boolean)
Make it impossible to move the object vertically

# API

Once a draggy object has been created it can be manipulated with the following API:

ele
Returns the DOM element of the draggy object
position
Current position of the element. Returns array with x and y value
bind(element)
Restrict draggy object to boundaries of an element
destroy()
Remove Draggy from element. Should be called before removing element from DOM.
disable()
Disable dragging functionality of object
enable()
Enable dragging functionality of object


## Thanks

This library started as a fork of [Stefan Liden's Draggy.js](http://jofan.github.com/Draggy/)