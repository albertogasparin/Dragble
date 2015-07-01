/**
 * Dragble.js
 * A tiny lib for draggable elements.
 *
 * @author     Alberto Gasparin
 * @version    1.0.0
 * @copyright  Copyright 2015 Alberto Gasparin
 * @license    MIT
 */

(function(window, document) {
  'use strict';

  // Some simple utility functions
  var util = {
    // PPK script for getting position of element
    // http://www.quirksmode.org/js/findpos.html
    getPosition: function(ele) {
      var curleft = 0;
      var curtop = 0;
      if (ele.offsetParent) {
        do {
          curleft += ele.offsetLeft;
          curtop += ele.offsetTop;
        } while (ele = ele.offsetParent);
      }
      return [curleft, curtop];
    },
    rAF: window.requestAnimationFrame || window.webkitRequestAnimationFrame || function(callback) { return setTimeout(callback, 1000 / 60); }
  };

  // Get transform transformDash
  var transformDash = 'transform' in document.body.style ? '' : '-webkit-',
      transformProp = transformDash ? 'webkitTransform' : 'transform',
      isTouch = 'ontouchstart' in window,
      mouseEvents = {
        start: 'mousedown',
        move: 'mousemove',
        end: 'mouseup'        
      },
      touchEvents = {
        start: 'touchstart',
        move: 'touchmove',
        end: 'touchend'
      },
      events = isTouch ? touchEvents : mouseEvents;

  var Dragble = window.Dragble = function(attachTo, config) {
    var noop = function () {};
    this.attachTo = attachTo;
    this.config = config || {};
    this.onDragMove = this.config.onDragMove || noop;
    this.onDragStart = this.config.onDragStart || noop;
    this.onDragEnd = this.config.onDragEnd || noop;
    this.containment = this.config.containment || null;
    this.init();
  };

  Dragble.prototype = {
    init: function() {
      this.ele = typeof this.attachTo == 'string' ? document.querySelector(this.attachTo) : this.attachTo;
      this.ele.dragble = this;
      this.ele.onChange = this.onChange;
      this.ele.restrictX = this.config.axis == 'x';
      this.ele.restrictY = this.config.axis == 'y';
      this.ele.limitsX = this.config.limitsX || [-9999, 9999];
      this.ele.limitsY = this.config.limitsY || [-9999, 9999];
      this.ele.snapBack = this.config.snapBack || false;
      if (this.containment) {
        this.contain(this.containment);
      }
      this.enable();
    },
    // Completely removing Dragble from element
    destroy: function() {
      this.disable();
      this.ele.dragble = null;
      this.ele = null;
    },
    // Disable the dragble object so that it can't be moved
    disable: function() {
      this.ele.removeEventListener(events.start, this.dragStart);
    },
    // Enable the dragble object so that it can be moved
    enable: function() {
      debugger
      this.ele.addEventListener(events.start, this.dragStart);
    },
    // Get current transform values
    getCurrentTransform: function(ele) {
      var style = getComputedStyle(ele),
          transform = style[transformProp],
          is3d = transform.indexOf('3d') > 0,
          matrix = transform.match(/^\w+\((.+)\)$/),
          values = matrix ? matrix[1].split(',') : [],
          x = is3d ? 12 : 4,
          y = is3d ? 13 : 5;
      return [ parseFloat( values[x] ) || 0, parseFloat( values[y] ) || 0];
    },
    // Get current state and prepare for moving object
    dragStart: function(e) {
      var ele = this, // The DOM element
          self = ele.dragble,
          restrictX = this.restrictX,
          restrictY = this.restrictY,
          limitsX = this.limitsX,
          limitsY = this.limitsY,
          posX = isTouch ? e.touches[0].pageX : e.clientX,
          posY = isTouch ? e.touches[0].pageY : e.clientY,
          newX, newY, relativeX, relativeY;

      // Allow nested draggable elements
      e.stopPropagation();

      self.position = self.getCurrentTransform(ele);
      relativeX = self.position[0];
      relativeY = self.position[1];

      ele.classList.add('isDragging');
      self.onDragMove.call(self, e);

      document.addEventListener(events.move, dragMove);
      document.addEventListener(events.end, dragEnd);
      
      // Move dragble object using CSS3 translate3d
      function dragMove (e) {
        e.preventDefault();
        var movedX, movedY,
            clientX = isTouch ? e.touches[0].pageX : e.clientX,
            clientY = isTouch ? e.touches[0].pageY : e.clientY;
        if (!restrictX) {
          // Mouse movement (x axis) in px
          movedX = clientX - posX;
          // New pixel value (x axis) of element
          newX = relativeX + movedX;
          if (newX >= limitsX[0] && newX <= limitsX[1]) {
            posX = clientX;
            relativeX = newX;
          }
          else if (newX < limitsX[0]) {
            relativeX = limitsX[0];
          }
          else if (newX > limitsX[1]) {
            relativeX = limitsX[1];
          }
        }
        if (!restrictY) {
          movedY = clientY - posY;
          newY = relativeY + movedY;
          if (newY >= limitsY[0] && newY <= limitsY[1]) {
            posY = clientY;
            relativeY = newY;
          }
          else if (newY < limitsY[0]) {
            relativeY = limitsY[0];
          }
          else if (newY > limitsY[1]) {
            relativeY = limitsY[1];
          }
        }
        self.position = [relativeX, relativeY];
        util.rAF.call(window, function () {
          ele.style[transformProp] = 'translate(' + relativeX + 'px,' + relativeY + 'px)';
          self.onDragMove.call(self, e, self.position);
        });
      }
      // Stop moving dragble object, save position and dispatch onDrop event
      function dragEnd (e) {
        ele.classList.remove('isDragging');
        self.onDragEnd.call(self, e, self.position);
        document.removeEventListener(events.move, dragMove);
        document.removeEventListener(events.end, dragEnd);
      }

    },
    // API method for restricting dragble object to boundaries of an element
    // Sets x and y limits
    // Used internally if config option "containment" is used
    contain: function(element) {
      var ele = typeof element == 'string' ? document.querySelector(element) : element,
          dragblePos, elePos, dragbleWidth, eleWidth, dragbleHeight, eleHeight,
          xLimit1, xLimit2, yLimit1, yLimit2;

      xLimit1 = xLimit2 = yLimit1 = yLimit2 = 0;

      if (ele) {
        dragblePos = util.getPosition(this.ele);
        elePos = util.getPosition(ele);
        dragbleWidth = ~~this.ele.offsetWidth;
        eleWidth = ~~ele.offsetWidth;
        dragbleHeight = ~~this.ele.offsetHeight;
        eleHeight = ~~ele.offsetHeight;
        if (!this.ele.restrictX) {
          xLimit1 = elePos[0] - dragblePos[0];
          xLimit2 = (eleWidth - dragbleWidth) - Math.abs(xLimit1);
        }
        if (!this.ele.restrictY) {
          yLimit1 = elePos[1] - dragblePos[1];
          yLimit2 = (eleHeight - dragbleHeight) - Math.abs(yLimit1);
        }

        this.ele.limitsX = [xLimit1, xLimit2];
        this.ele.limitsY = [yLimit1, yLimit2];

      }
    }
  };

}(window, document));
