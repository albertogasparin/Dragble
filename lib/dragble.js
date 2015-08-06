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
  var transformProp = 'transform' in document.documentElement.style ? 'transform' : 'webkitTransform',
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
      var config = this.config,
          axis = config.axis || '',
          limits = config.limits || {};
      this.ele = typeof this.attachTo == 'string' ? document.querySelector(this.attachTo) : this.attachTo;
      this.handle = typeof config.handle == 'string' ? this.ele.querySelector(config.handle) : config.handle || this.ele;
      this.ele.dragble = this;
      
      this.restrict = {
        x: axis == 'y',
        y: axis == 'x'
      };
      this.limits = {
        x: limits.x || [-Infinity, Infinity],
        y: limits.y || [-Infinity, Infinity]
      };
      
      if (this.containment) {
        this.contain(this.containment);
      }
      this.dragStart = this.dragStart.bind(this);
      this.enable();
    },
    // Completely removing Dragble from element
    destroy: function() {
      this.disable();
      this.ele.dragble = null;
      this.handle = null;
      this.ele = null;
    },
    // Disable the dragble object so that it can't be moved
    disable: function() {
      this.handle.removeEventListener(events.start, this.dragStart);
    },
    // Enable the dragble object so that it can be moved
    enable: function() {
      this.handle.addEventListener(events.start, this.dragStart);
    },
    // Get current transform values
    updatePosition: function() {
      var transform = getComputedStyle(this.ele)[transformProp],
          is3d = transform.indexOf('3d') > 0,
          matrix = transform.match(/^\w+\((.+)\)$/),
          values = matrix ? matrix[1].split(',') : [];
      this.position = { 
        x: parseFloat( values[ is3d ? 12 : 4 ] ) || 0, 
        y: parseFloat( values[ is3d ? 13 : 5 ] ) || 0 
      };
    },
    // Get current state and prepare for moving object
    dragStart: function(e) {
      var self = this,
          ele = self.ele,
          posX = isTouch ? e.touches[0].pageX : e.clientX,
          posY = isTouch ? e.touches[0].pageY : e.clientY,
          isDragging = false,
          newX, newY, relativeX, relativeY, movedX = 0, movedY = 0;

      // Allow nested draggable elements
      // e.stopPropagation();

      self.updatePosition();
      relativeX = self.position.x;
      relativeY = self.position.y;

      self.onDragStart.call(self, e);

      document.addEventListener(events.move, dragMove);
      document.addEventListener(events.end, dragEnd);
      
      // Move dragble object using CSS3 translate3d
      function dragMove (e) {
        var clientX = isTouch ? e.touches[0].pageX : e.clientX,
            clientY = isTouch ? e.touches[0].pageY : e.clientY,
            limitsX = self.limits.x,
            limitsY = self.limits.y;
        // Mouse movementin px
        movedX = clientX - posX;
        movedY = clientY - posY;

        // Based on the direction of the first px
        // disable drag if moving in opposite axis
        if(!isDragging && (self.restrict.y && Math.abs(movedY) > Math.abs(movedX)
          || self.restrict.x && Math.abs(movedX) > Math.abs(movedY))) {
          return dragEnd();
        }
        e.preventDefault();
        isDragging = true;
        ele.classList.add('isDragging');

        if (!self.restrict.x) {
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
          self.position.x = relativeX;
        }
        if (!self.restrict.y) {
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
          self.position.y = relativeY;
        }
        util.rAF.call(window, function () {
          var use3d = self.config.use3d;
          ele.style[transformProp] = 'translate' + (use3d ? '3d' : '') + '(' + relativeX + 'px,' + relativeY + 'px' + (use3d ? ',0)' : ')');
          self.onDragMove.call(self, e, { x: movedX, y: movedY });
        });
      }
      // Stop moving dragble object, save position and dispatch onDrop event
      function dragEnd (e) {
        if(isDragging) {
          ele.classList.remove('isDragging');
          self.onDragEnd.call(self, e, { x: movedX, y: movedY });
        }
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
          xLimit1 = 0, xLimit2 = 0, yLimit1 = 0, yLimit2 = 0;

      if (ele) {
        dragblePos = util.getPosition(this.ele);
        elePos = util.getPosition(ele);
        dragbleWidth = ~~this.ele.offsetWidth;
        eleWidth = ~~ele.offsetWidth;
        dragbleHeight = ~~this.ele.offsetHeight;
        eleHeight = ~~ele.offsetHeight;
        if (!this.restrict.x) {
          xLimit1 = elePos[0] - dragblePos[0];
          xLimit2 = (eleWidth - dragbleWidth) - Math.abs(xLimit1);
        }
        if (!this.restrict.y) {
          yLimit1 = elePos[1] - dragblePos[1];
          yLimit2 = (eleHeight - dragbleHeight) - Math.abs(yLimit1);
        }

        this.limits.x = [xLimit1, xLimit2];
        this.limits.y = [yLimit1, yLimit2];

      }
    }
  };

}(window, document));
