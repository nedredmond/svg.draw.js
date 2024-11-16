var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
/*!
* @svgdotjs/svg.draw.js - An extension for svg.js which allows to draw elements with mouse
* @version 3.0.2
* https://github.com/svgdotjs/svg.draw.js
*
* @copyright [object Object]
* @license MIT
*
* BUILT: Fri Nov 15 2024 22:05:28 GMT-0500 (Eastern Standard Time)
*/
;
import { extend, Element, on, off } from "@svgdotjs/svg.js";
const circle = {
  NAME: "circle",
  init: function() {
    var p = this.startPoint;
    this.el.attr({ cx: p.x, cy: p.y, r: 1 });
  },
  // We determine the radius by the cursor position
  calc: function(e) {
    var p = this.transformPoint(e.clientX, e.clientY);
    var circle2 = {
      cx: this.startPoint.x,
      cy: this.startPoint.y,
      // calculating the radius
      r: Math.sqrt(
        (p.x - this.startPoint.x) * (p.x - this.startPoint.x) + (p.y - this.startPoint.y) * (p.y - this.startPoint.y)
      )
    };
    this.snapToGrid(circle2);
    this.el.attr(circle2);
  }
};
const ellipse = {
  NAME: "ellipse",
  init: function() {
    var p = this.startPoint;
    this.el.attr({ cx: p.x, cy: p.y, rx: 1, ry: 1 });
  },
  calc: function(e) {
    var p = this.transformPoint(e.clientX, e.clientY);
    var ellipse2 = {
      cx: this.startPoint.x,
      cy: this.startPoint.y,
      rx: Math.abs(p.x - this.startPoint.x),
      ry: Math.abs(p.y - this.startPoint.y)
    };
    this.snapToGrid(ellipse2);
    this.el.attr(ellipse2);
  }
};
const lineable = {
  NAME: "line polyline polygon",
  init: function() {
    this.set = [];
    var p = this.startPoint;
    var arr = [
      [p.x, p.y],
      [p.x, p.y]
    ];
    this.el.plot(arr);
    if (this.options.drawCircles) {
      this.drawCircles();
    }
  },
  // The calc-function sets the position of the last point to the mouse-position (with offset ofc)
  calc: function(e) {
    var arr = this.el.array().valueOf();
    arr.pop();
    if (e) {
      var p = this.transformPoint(e.clientX, e.clientY);
      arr.push(this.snapToGrid([p.x, p.y]));
    }
    this.el.plot(arr);
    if (this.options.drawCircles) {
      this.drawCircles();
    } else {
      this.set.forEach((e2) => e2.remove());
      this.set = [];
    }
  },
  point: function(e) {
    if (this.el.type.indexOf("poly") > -1) {
      var p = this.transformPoint(e.clientX, e.clientY);
      var arr = this.el.array().valueOf();
      arr.push(this.snapToGrid([p.x, p.y]));
      this.el.plot(arr);
      if (this.options.drawCircles) {
        this.drawCircles();
      }
      this.el.fire("drawpoint", { event: e, p: { x: p.x, y: p.y }, m: this.m });
      return;
    }
    this.stop(e);
  },
  clean: function() {
    this.set.forEach((e) => e.remove());
    this.set = [];
    delete this.set;
  },
  drawCircles: function() {
    var array = this.el.array().valueOf();
    this.set.forEach((e) => e.remove());
    this.set = [];
    for (var i = 0; i < array.length; ++i) {
      this.p.x = array[i][0];
      this.p.y = array[i][1];
      var p = this.p.matrixTransform(this.parent.node.getScreenCTM().inverse().multiply(this.el.node.getScreenCTM()));
      this.set.push(this.parent.circle(5).stroke({ width: 1 }).fill("#ccc").center(p.x, p.y));
    }
  },
  undo: function() {
    if (this.set.length) {
      this.set.splice(-2, 1)[0].remove();
      this.el.array().splice(-2, 1);
      this.el.plot(this.el.array());
      this.el.fire("undopoint");
    }
  }
};
const rectable = {
  NAME: "rect image",
  init: function() {
    var p = this.startPoint;
    this.el.attr({ x: p.x, y: p.y, height: 0, width: 0 });
  },
  calc: function(e) {
    var rect = {
      x: this.startPoint.x,
      y: this.startPoint.y
    };
    var p = this.transformPoint(e.clientX, e.clientY);
    rect.width = p.x - rect.x;
    rect.height = p.y - rect.y;
    this.snapToGrid(rect);
    if (rect.width < 0) {
      rect.x = rect.x + rect.width;
      rect.width = -rect.width;
    }
    if (rect.height < 0) {
      rect.y = rect.y + rect.height;
      rect.height = -rect.height;
    }
    this.el.attr(rect);
  }
};
const _PaintHandler = class _PaintHandler {
  constructor(el, event, options) {
    el.remember("_paintHandler", this);
    this.el = el;
    var _this = this;
    var plugin = this.getPlugin();
    this.parent = el.root();
    this.p = this.parent.node.createSVGPoint();
    this.m = null;
    this.startPoint = null;
    this.lastUpdateCall = null;
    this.options = {};
    this.set = [];
    for (const i in _PaintHandler.defaults) {
      this.options[i] = _PaintHandler.defaults[i];
      if (typeof options[i] !== "undefined") {
        this.options[i] = options[i];
      }
    }
    if (plugin.point) {
      plugin.pointPlugin = plugin.point;
      delete plugin.point;
    }
    for (const i in plugin) {
      this[i] = plugin[i];
    }
    if (!event) {
      this.parent.on("click.draw", function(e) {
        _this.start(e);
      });
    }
  }
  transformPoint(x, y) {
    this.p.x = x - (this.offset.x - window.pageXOffset);
    this.p.y = y - (this.offset.y - window.pageYOffset);
    return this.p.matrixTransform(this.m);
  }
  start(event) {
    var _this = this;
    this.m = this.el.node.getScreenCTM().inverse();
    this.offset = { x: window.pageXOffset, y: window.pageYOffset };
    this.options.snapToGrid *= Math.sqrt(this.m.a * this.m.a + this.m.b * this.m.b);
    this.startPoint = this.snapToGrid(this.transformPoint(event.clientX, event.clientY));
    if (this.init) {
      this.init(event);
    }
    this.el.fire("drawstart", { event, p: this.p, m: this.m });
    on(window, "pointermove.draw", function(e) {
      _this.update(e);
    });
    this.start = this.point;
  }
  // This function draws a point if the element is a polyline or polygon
  // Otherwise it will just stop drawing the shape cause we are done
  point(event) {
    if (this.point !== this.start) return this.start(event);
    if (this.pointPlugin) {
      return this.pointPlugin(event);
    }
    this.stop(event);
  }
  // The stop-function does the cleanup work
  stop(event) {
    if (event) {
      this.update(event);
    }
    if (this.clean) {
      this.clean();
    }
    off(window, "pointermove.draw");
    this.parent.off("click.draw");
    this.el.forget("_paintHandler");
    this.el.draw = function() {
    };
    this.el.fire("drawstop");
  }
  // Updates the element while moving the cursor
  update(event) {
    if (!event && this.lastUpdateCall) {
      event = this.lastUpdateCall;
    }
    this.lastUpdateCall = event;
    this.m = this.el.node.getScreenCTM().inverse();
    this.calc(event);
    this.el.fire("drawupdate", { event, p: this.p, m: this.m });
  }
  // Called from outside. Finishs a poly-element
  done() {
    this.calc();
    this.stop();
    this.el.fire("drawdone");
  }
  // Called from outside. Cancels a poly-element
  cancel() {
    this.stop();
    this.el.remove();
    this.el.fire("drawcancel");
  }
  // Calculate the corrected position when using `snapToGrid`
  snapToGrid(draw) {
    var temp = null;
    if (draw.length) {
      temp = [draw[0] % this.options.snapToGrid, draw[1] % this.options.snapToGrid];
      draw[0] -= temp[0] < this.options.snapToGrid / 2 ? temp[0] : temp[0] - this.options.snapToGrid;
      draw[1] -= temp[1] < this.options.snapToGrid / 2 ? temp[1] : temp[1] - this.options.snapToGrid;
      return draw;
    }
    for (var i in draw) {
      temp = draw[i] % this.options.snapToGrid;
      draw[i] -= (temp < this.options.snapToGrid / 2 ? temp : temp - this.options.snapToGrid) + (temp < 0 ? this.options.snapToGrid : 0);
    }
    return draw;
  }
  param(key, value) {
    this.options[key] = value === null ? _PaintHandler.defaults[key] : value;
    this.update();
  }
  // Returns the plugin
  getPlugin() {
    return _PaintHandler.plugins[this.el.type];
  }
  static extend(name, obj) {
    var plugins = {};
    if (typeof name === "string") {
      plugins[name] = obj;
    } else {
      plugins = name;
    }
    for (var shapes in plugins) {
      var shapesArr = shapes.trim().split(/\s+/);
      for (var i in shapesArr) {
        _PaintHandler.plugins[shapesArr[i]] = plugins[shapes];
      }
    }
  }
};
// Default values. Can be changed for the whole project if needed
__publicField(_PaintHandler, "defaults", {
  snapToGrid: 1,
  // Snaps to a grid of `snapToGrid` px
  drawCircles: true
  // Draw little circles around line/polyline/polygon points
});
// Container for all types not specified here
__publicField(_PaintHandler, "plugins", {});
let PaintHandler = _PaintHandler;
extend(Element, {
  // Draw element with pointer
  draw: function(event, options, value) {
    if (!(event instanceof Event || typeof event === "string")) {
      options = event;
      event = null;
    }
    var paintHandler = this.remember("_paintHandler") || new PaintHandler(this, event, options || {});
    if (event instanceof Event) {
      paintHandler.start(event);
    }
    if (paintHandler[event]) {
      paintHandler[event](options, value);
    }
    return this;
  }
});
PaintHandler.extend(rectable.NAME, rectable);
PaintHandler.extend(lineable.NAME, lineable);
PaintHandler.extend(ellipse.NAME, ellipse);
PaintHandler.extend(circle.NAME, circle);
//# sourceMappingURL=svg.draw.js.map
