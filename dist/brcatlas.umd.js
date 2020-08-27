(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.brcatlas = {}));
}(this, (function (exports) { 'use strict';

  /** @module src/coordsToImage */

  /**
   * Given a transform object, describing a bounding rectangle in world coordinates,
   * and a height dimension, this function returns an array of objects - one
   * for each inset described in the transform object - that describe a set of
   * rectangles corresponding to each of the insets. Each object has an origin
   * corresponding to the top left of the rectangle, a width and a height dimension.
   * The dimensions and coordiates are relative to the height argument. A typical
   * use of these metrics would be to draw an SVG rectagle around an inset.
   * @param {object} transOpts - the transformation object
   * @param {number} outputHeight - the height, e.g. height in pixels, of an SVG element.
   * @returns {Array<Object>}
   */
  function getInsetDims(transOpts, outputHeight) {
    var outputWidth = widthFromHeight(transOpts, outputHeight);
    var transform = transformFunction(transOpts, outputHeight);
    var insetDims = [];

    if (transOpts.insets) {
      transOpts.insets.forEach(function (inset) {
        var ll = transform([inset.bounds.xmin, inset.bounds.ymin]);
        var ur = transform([inset.bounds.xmax, inset.bounds.ymax]);
        var iWidth = ur[0] - ll[0];
        var iHeight = ll[1] - ur[1];
        insetDims.push({
          x: inset.imageX < 0 ? outputWidth - iWidth + inset.imageX : inset.imageX,
          y: inset.imageY < 0 ? -inset.imageY : outputHeight - inset.imageY - iHeight,
          width: iWidth,
          height: iHeight
        });
      });
    }

    return insetDims;
  }
  /**
   * Given a transform object, describing a bounding rectangle in world coordinates,
   * and a height dimension, this function returns a width dimension
   * that respects the aspect ratio described by the bounding rectangle.
   * @param {object} transOpts - the transformation object
   * @param {number} outputHeight - the height, e.g. height in pixels, of an SVG element.
   * @returns {number}
   */

  function widthFromHeight(transOpts, outputHeight) {
    var realWidth = transOpts.bounds.xmax - transOpts.bounds.xmin;
    var realHeight = transOpts.bounds.ymax - transOpts.bounds.ymin;
    return outputHeight * realWidth / realHeight;
  }
  /**
   * Given a transform object, describing a bounding rectangle in world coordinates,
   * and a height dimension, this function returns a new function that will accept a
   * point argument - normally describing real world coordinates - and returns a 
   * point that is transformed to be within the range 0 - outputHeight (for y)
   * and 0 - outputWidth (for x). This function can be used as input to a d3.geoTransform
   * to provide a transformation to d3.geoPath to draw an SVG path from a geojson file.
   * The transOpts argument is an object which can also describe areas which should
   * displaced in the output. This can be used for displaying islands in an
   * inset, e.g. the Channel Islands.
   * @param {object} transOpts - the transformation object
   * @param {number} outputHeight - the height, e.g. height in pixels, of an SVG element.
   * @returns {function}
   */

  function transformFunction(transOpts, outputHeight) {
    var realWidth = transOpts.bounds.xmax - transOpts.bounds.xmin;
    var realHeight = transOpts.bounds.ymax - transOpts.bounds.ymin;
    var outputWidth = widthFromHeight(transOpts, outputHeight);
    return function (p) {
      var x = p[0];
      var y = p[1];
      var tX, tY;
      tX = outputWidth * (x - transOpts.bounds.xmin) / realWidth;
      tY = outputHeight - outputHeight * (y - transOpts.bounds.ymin) / realHeight;

      if (transOpts.insets && transOpts.insets.length > 0) {
        transOpts.insets.forEach(function (inset) {
          if (x >= inset.bounds.xmin && x <= inset.bounds.xmax && y >= inset.bounds.ymin && y <= inset.bounds.ymax) {
            var insetX = outputWidth * (inset.bounds.xmin - transOpts.bounds.xmin) / realWidth;
            var insetY = outputHeight - outputHeight * (inset.bounds.ymin - transOpts.bounds.ymin) / realHeight; // Coordinates are within bounds on an inset
            // Adjust inset origns - negative are offsets of max inset from max output

            var imageX, imageY;

            if (inset.imageX < 0 && !transOpts.forTween) {
              imageX = outputWidth + inset.imageX - (inset.bounds.xmax - inset.bounds.xmin) / realWidth * outputWidth;
            } else {
              imageX = inset.imageX;
            }

            if (inset.imageY < 0 && !transOpts.forTween) {
              imageY = outputHeight + inset.imageY - (inset.bounds.ymax - inset.bounds.ymin) / realHeight * outputHeight;
            } else {
              imageY = inset.imageY;
            }

            tX = tX - insetX + imageX;
            tY = outputHeight - imageY - (insetY - tY);
          }
        });
      }

      return [tX, tY];
    };
  } // Defined insets required for namedTransOpts

  var boundsChannelIslands_gb = {
    xmin: 337373,
    ymin: -92599,
    xmax: 427671,
    ymax: -6678
  };
  var boundsNorthernIsles_gb = {
    xmin: 312667,
    ymin: 980030,
    xmax: 475291,
    ymax: 1225003
  };
  /** @constant
    *  @description This object contains some named objects that are in the correct 
    * format to be used as transOpts arguments to some of the functions in this module.
    * Using one of these may save you generating one of your own. The main bounds element
    * indicates the extent of the main map (in real world coordinates). The bounds of
    * inset objects indicate the extent that is to be offset within the map image. The
    * imageX and imageY values of an inset object indicates the position of the offset
    * portion within the map in pixels. Positve x and y values offset the inset from the
    * left and bottom of the image respecitvely. Negative x and y values offset the inset
    * from the right and top of the image respectively.
    * <ul>
    * <li> <b>namedTransOpts.BI1</b> is a bounding box, in EPSG:27700, for the 
    * British Ilses that includes the Channel Islands in their natural position.
    * <li> <b>namedTransOpts.BI2</b> is a bounding box, in EPSG:27700, for the 
    * British Isles, that doesn't extend as far south as the 
    * Channel Islands, but with an inset covering the Channel Isles, 
    * offset 25 pixels from the bottom left corner of the output.
    * <li> <b>namedTransOpts.BI3</b> is a bounding box, in EPSG:27700, for 
    * the British Isles, that doesn't extend as far north as the Northern Isles.
    * An inset covering the Northern Isles, is offset 25 pixels from the 
    * top right corner of the output.
    * <li> <b>namedTransOpts.BI4</b> is a bounding box, in EPSG:27700, for 
    * the British Isles, that doesn't extend as far south as the 
    * Channel Islands or as far north as the Northern Isles. An inset covering 
    * the Channel Isles, is offset 25 pixels from the bottom left corner of the output.
    * An inset covering the Northern Isles, is offset 25 pixels from the 
    * top right corner of the output.
    * </ul>
    *  @type {object}
  */

  var namedTransOpts = {
    BI1: {
      bounds: {
        xmin: -213389,
        ymin: -113239,
        xmax: 702813,
        ymax: 1237242
      }
    },
    BI2: {
      bounds: {
        xmin: -213389,
        ymin: -9939,
        xmax: 702813,
        ymax: 1237242
      },
      insets: [{
        bounds: boundsChannelIslands_gb,
        imageX: 25,
        imageY: 25
      }]
    },
    BI3: {
      bounds: {
        xmin: -213389,
        ymin: -9939,
        xmax: 702813,
        ymax: 1050000
      },
      insets: [{
        bounds: boundsNorthernIsles_gb,
        imageX: -25,
        imageY: -25
      }]
    },
    BI4: {
      bounds: {
        xmin: -213389,
        ymin: -9939,
        xmax: 702813,
        ymax: 1050000
      },
      insets: [{
        bounds: boundsChannelIslands_gb,
        imageX: 25,
        imageY: 25
      }, {
        bounds: boundsNorthernIsles_gb,
        imageX: -25,
        imageY: -25
      }]
    }
  };
  /**
   * Given both 'from' and 'to' transform objects, an output height and a
   * 'tween' value between 0 and 1, this function returns a transform object
   * for which the map bounds, the inset bounds and the inset image position
   * are all interpolated between the 'from' and 'to' objects at a position
   * depending on the value of the tween value. Typically this would then be used
   * to help generate a path transformation to use with D3 to animate transitions
   * between different map transformations. Note that this only works with
   * named transformation objects defined in this library.
   * @param {object} from - the 'from' transformation object.
   * @param {object} to - the 'to' transformation object.
   * @param {number} outputHeight - the height, e.g. height in pixels, of an SVG element.
   * @param {number} tween - between 0 and 1 indicating the interpolation position.
   * @returns {object} - in intermediate transformation object.
   */

  function getTweenTransOpts(from, to, outputHeight, tween) {
    var fto = copyTransOptsForTween(namedTransOpts[from], outputHeight);
    var tto = copyTransOptsForTween(namedTransOpts[to], outputHeight);
    var rto = {
      bounds: {
        xmin: fto.bounds.xmin + (tto.bounds.xmin - fto.bounds.xmin) * tween,
        xmax: fto.bounds.xmax + (tto.bounds.xmax - fto.bounds.xmax) * tween,
        ymin: fto.bounds.ymin + (tto.bounds.ymin - fto.bounds.ymin) * tween,
        ymax: fto.bounds.ymax + (tto.bounds.ymax - fto.bounds.ymax) * tween
      },
      insets: [],
      forTween: true // Means that negative image positions won't be translated by transformFunction

    };
    fto.insets.forEach(function (i, idx) {
      rto.insets.push({
        bounds: {
          xmin: i.bounds.xmin + (tto.insets[idx].bounds.xmin - i.bounds.xmin) * tween,
          xmax: i.bounds.xmax + (tto.insets[idx].bounds.xmax - i.bounds.xmax) * tween,
          ymin: i.bounds.ymin + (tto.insets[idx].bounds.ymin - i.bounds.ymin) * tween,
          ymax: i.bounds.ymax + (tto.insets[idx].bounds.ymax - i.bounds.ymax) * tween
        },
        imageX: i.imageX + (tto.insets[idx].imageX - i.imageX) * tween,
        imageY: i.imageY + (tto.insets[idx].imageY - i.imageY) * tween
      });
    });
    return rto;
  }

  function copyTransOptsForTween(transOpts, outputHeight) {
    // This function makes a copy of a transformation object. The copy is different
    // from the original in two respects. Firstly the image positions of the insets
    // are expressed as positive numbers (from bottom or left of image)
    // even when expressed as negative offsets (from top or right of image) in the
    // original. Secondly all named insets used in this library are represented in
    // the returned object even if not present in the original. Such insets are
    // given image positions that reflect their real world positions.
    var insetDims = getInsetDims(transOpts, outputHeight);
    var tto = {
      bounds: {
        xmin: transOpts.bounds.xmin,
        xmax: transOpts.bounds.xmax,
        ymin: transOpts.bounds.ymin,
        ymax: transOpts.bounds.ymax
      },
      insets: []
    };

    if (transOpts.insets) {
      transOpts.insets.forEach(function (i, idx) {
        var iNew = {
          bounds: {
            xmin: i.bounds.xmin,
            xmax: i.bounds.xmax,
            ymin: i.bounds.ymin,
            ymax: i.bounds.ymax
          }
        }; // Usng the calculated insetDims translates any negative numbers - used
        // as shorthand for defining position offsets from top or right margin - to 
        // positive values from bottom and left.

        iNew.imageX = insetDims[idx].x, iNew.imageY = outputHeight - insetDims[idx].y - insetDims[idx].height;
        tto.insets.push(iNew);
      });
    }

    var insetCi, insetNi;
    tto.insets.forEach(function (i) {
      if (i.bounds.xmin === boundsChannelIslands_gb.xmin) {
        insetCi = true;
      }

      if (i.bounds.xmin === boundsNorthernIsles_gb.xmin) {
        insetNi = true;
      }
    });

    if (!insetCi) {
      tto.insets.unshift({
        bounds: boundsChannelIslands_gb,
        imageX: (boundsChannelIslands_gb.xmin - tto.bounds.xmin) / (tto.bounds.xmax - tto.bounds.xmin) * widthFromHeight(tto, outputHeight),
        imageY: (boundsChannelIslands_gb.ymin - tto.bounds.ymin) / (tto.bounds.ymax - tto.bounds.ymin) * outputHeight
      });
    }

    if (!insetNi) {
      tto.insets.push({
        bounds: boundsNorthernIsles_gb,
        imageX: (boundsNorthernIsles_gb.xmin - tto.bounds.xmin) / (tto.bounds.xmax - tto.bounds.xmin) * widthFromHeight(tto, outputHeight),
        imageY: (boundsNorthernIsles_gb.ymin - tto.bounds.ymin) / (tto.bounds.ymax - tto.bounds.ymin) * outputHeight
      });
    }

    return tto;
  }

  function ascending (a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function bisector (compare) {
    if (compare.length === 1) compare = ascendingComparator(compare);
    return {
      left: function left(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;

        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (compare(a[mid], x) < 0) lo = mid + 1;else hi = mid;
        }

        return lo;
      },
      right: function right(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;

        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (compare(a[mid], x) > 0) hi = mid;else lo = mid + 1;
        }

        return lo;
      }
    };
  }

  function ascendingComparator(f) {
    return function (d, x) {
      return ascending(f(d), x);
    };
  }

  var ascendingBisect = bisector(ascending);

  var noop = {
    value: function value() {}
  };

  function dispatch() {
    for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
      if (!(t = arguments[i] + "") || t in _ || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
      _[t] = [];
    }

    return new Dispatch(_);
  }

  function Dispatch(_) {
    this._ = _;
  }

  function parseTypenames(typenames, types) {
    return typenames.trim().split(/^|\s+/).map(function (t) {
      var name = "",
          i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
      return {
        type: t,
        name: name
      };
    });
  }

  Dispatch.prototype = dispatch.prototype = {
    constructor: Dispatch,
    on: function on(typename, callback) {
      var _ = this._,
          T = parseTypenames(typename + "", _),
          t,
          i = -1,
          n = T.length; // If no callback was specified, return the callback of the given type and name.

      if (arguments.length < 2) {
        while (++i < n) {
          if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
        }

        return;
      } // If a type was specified, set the callback for the given type and name.
      // Otherwise, if a null callback was specified, remove callbacks of the given name.


      if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);

      while (++i < n) {
        if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);else if (callback == null) for (t in _) {
          _[t] = set(_[t], typename.name, null);
        }
      }

      return this;
    },
    copy: function copy() {
      var copy = {},
          _ = this._;

      for (var t in _) {
        copy[t] = _[t].slice();
      }

      return new Dispatch(copy);
    },
    call: function call(type, that) {
      if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) {
        args[i] = arguments[i + 2];
      }
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);

      for (t = this._[type], i = 0, n = t.length; i < n; ++i) {
        t[i].value.apply(that, args);
      }
    },
    apply: function apply(type, that, args) {
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);

      for (var t = this._[type], i = 0, n = t.length; i < n; ++i) {
        t[i].value.apply(that, args);
      }
    }
  };

  function get(type, name) {
    for (var i = 0, n = type.length, c; i < n; ++i) {
      if ((c = type[i]).name === name) {
        return c.value;
      }
    }
  }

  function set(type, name, callback) {
    for (var i = 0, n = type.length; i < n; ++i) {
      if (type[i].name === name) {
        type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
        break;
      }
    }

    if (callback != null) type.push({
      name: name,
      value: callback
    });
    return type;
  }

  var xhtml = "http://www.w3.org/1999/xhtml";
  var namespaces = {
    svg: "http://www.w3.org/2000/svg",
    xhtml: xhtml,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };

  function namespace (name) {
    var prefix = name += "",
        i = prefix.indexOf(":");
    if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
    return namespaces.hasOwnProperty(prefix) ? {
      space: namespaces[prefix],
      local: name
    } : name;
  }

  function creatorInherit(name) {
    return function () {
      var document = this.ownerDocument,
          uri = this.namespaceURI;
      return uri === xhtml && document.documentElement.namespaceURI === xhtml ? document.createElement(name) : document.createElementNS(uri, name);
    };
  }

  function creatorFixed(fullname) {
    return function () {
      return this.ownerDocument.createElementNS(fullname.space, fullname.local);
    };
  }

  function creator (name) {
    var fullname = namespace(name);
    return (fullname.local ? creatorFixed : creatorInherit)(fullname);
  }

  function none() {}

  function selector (selector) {
    return selector == null ? none : function () {
      return this.querySelector(selector);
    };
  }

  function selection_select (select) {
    if (typeof select !== "function") select = selector(select);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
        }
      }
    }

    return new Selection(subgroups, this._parents);
  }

  function empty() {
    return [];
  }

  function selectorAll (selector) {
    return selector == null ? empty : function () {
      return this.querySelectorAll(selector);
    };
  }

  function selection_selectAll (select) {
    if (typeof select !== "function") select = selectorAll(select);

    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          subgroups.push(select.call(node, node.__data__, i, group));
          parents.push(node);
        }
      }
    }

    return new Selection(subgroups, parents);
  }

  function matcher (selector) {
    return function () {
      return this.matches(selector);
    };
  }

  function selection_filter (match) {
    if (typeof match !== "function") match = matcher(match);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }

    return new Selection(subgroups, this._parents);
  }

  function sparse (update) {
    return new Array(update.length);
  }

  function selection_enter () {
    return new Selection(this._enter || this._groups.map(sparse), this._parents);
  }
  function EnterNode(parent, datum) {
    this.ownerDocument = parent.ownerDocument;
    this.namespaceURI = parent.namespaceURI;
    this._next = null;
    this._parent = parent;
    this.__data__ = datum;
  }
  EnterNode.prototype = {
    constructor: EnterNode,
    appendChild: function appendChild(child) {
      return this._parent.insertBefore(child, this._next);
    },
    insertBefore: function insertBefore(child, next) {
      return this._parent.insertBefore(child, next);
    },
    querySelector: function querySelector(selector) {
      return this._parent.querySelector(selector);
    },
    querySelectorAll: function querySelectorAll(selector) {
      return this._parent.querySelectorAll(selector);
    }
  };

  function constant (x) {
    return function () {
      return x;
    };
  }

  var keyPrefix = "$"; // Protect against keys like “__proto__”.

  function bindIndex(parent, group, enter, update, exit, data) {
    var i = 0,
        node,
        groupLength = group.length,
        dataLength = data.length; // Put any non-null nodes that fit into update.
    // Put any null nodes into enter.
    // Put any remaining data into enter.

    for (; i < dataLength; ++i) {
      if (node = group[i]) {
        node.__data__ = data[i];
        update[i] = node;
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    } // Put any non-null nodes that don’t fit into exit.


    for (; i < groupLength; ++i) {
      if (node = group[i]) {
        exit[i] = node;
      }
    }
  }

  function bindKey(parent, group, enter, update, exit, data, key) {
    var i,
        node,
        nodeByKeyValue = {},
        groupLength = group.length,
        dataLength = data.length,
        keyValues = new Array(groupLength),
        keyValue; // Compute the key for each node.
    // If multiple nodes have the same key, the duplicates are added to exit.

    for (i = 0; i < groupLength; ++i) {
      if (node = group[i]) {
        keyValues[i] = keyValue = keyPrefix + key.call(node, node.__data__, i, group);

        if (keyValue in nodeByKeyValue) {
          exit[i] = node;
        } else {
          nodeByKeyValue[keyValue] = node;
        }
      }
    } // Compute the key for each datum.
    // If there a node associated with this key, join and add it to update.
    // If there is not (or the key is a duplicate), add it to enter.


    for (i = 0; i < dataLength; ++i) {
      keyValue = keyPrefix + key.call(parent, data[i], i, data);

      if (node = nodeByKeyValue[keyValue]) {
        update[i] = node;
        node.__data__ = data[i];
        nodeByKeyValue[keyValue] = null;
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    } // Add any remaining nodes that were not bound to data to exit.


    for (i = 0; i < groupLength; ++i) {
      if ((node = group[i]) && nodeByKeyValue[keyValues[i]] === node) {
        exit[i] = node;
      }
    }
  }

  function selection_data (value, key) {
    if (!value) {
      data = new Array(this.size()), j = -1;
      this.each(function (d) {
        data[++j] = d;
      });
      return data;
    }

    var bind = key ? bindKey : bindIndex,
        parents = this._parents,
        groups = this._groups;
    if (typeof value !== "function") value = constant(value);

    for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
      var parent = parents[j],
          group = groups[j],
          groupLength = group.length,
          data = value.call(parent, parent && parent.__data__, j, parents),
          dataLength = data.length,
          enterGroup = enter[j] = new Array(dataLength),
          updateGroup = update[j] = new Array(dataLength),
          exitGroup = exit[j] = new Array(groupLength);
      bind(parent, group, enterGroup, updateGroup, exitGroup, data, key); // Now connect the enter nodes to their following update node, such that
      // appendChild can insert the materialized enter node before this node,
      // rather than at the end of the parent node.

      for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
        if (previous = enterGroup[i0]) {
          if (i0 >= i1) i1 = i0 + 1;

          while (!(next = updateGroup[i1]) && ++i1 < dataLength) {
          }

          previous._next = next || null;
        }
      }
    }

    update = new Selection(update, parents);
    update._enter = enter;
    update._exit = exit;
    return update;
  }

  function selection_exit () {
    return new Selection(this._exit || this._groups.map(sparse), this._parents);
  }

  function selection_join (onenter, onupdate, onexit) {
    var enter = this.enter(),
        update = this,
        exit = this.exit();
    enter = typeof onenter === "function" ? onenter(enter) : enter.append(onenter + "");
    if (onupdate != null) update = onupdate(update);
    if (onexit == null) exit.remove();else onexit(exit);
    return enter && update ? enter.merge(update).order() : update;
  }

  function selection_merge (selection) {
    for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }

    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }

    return new Selection(merges, this._parents);
  }

  function selection_order () {
    for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
      for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
        if (node = group[i]) {
          if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }

    return this;
  }

  function selection_sort (compare) {
    if (!compare) compare = ascending$1;

    function compareNode(a, b) {
      return a && b ? compare(a.__data__, b.__data__) : !a - !b;
    }

    for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          sortgroup[i] = node;
        }
      }

      sortgroup.sort(compareNode);
    }

    return new Selection(sortgroups, this._parents).order();
  }

  function ascending$1(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function selection_call () {
    var callback = arguments[0];
    arguments[0] = this;
    callback.apply(null, arguments);
    return this;
  }

  function selection_nodes () {
    var nodes = new Array(this.size()),
        i = -1;
    this.each(function () {
      nodes[++i] = this;
    });
    return nodes;
  }

  function selection_node () {
    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
        var node = group[i];
        if (node) return node;
      }
    }

    return null;
  }

  function selection_size () {
    var size = 0;
    this.each(function () {
      ++size;
    });
    return size;
  }

  function selection_empty () {
    return !this.node();
  }

  function selection_each (callback) {
    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) callback.call(node, node.__data__, i, group);
      }
    }

    return this;
  }

  function attrRemove(name) {
    return function () {
      this.removeAttribute(name);
    };
  }

  function attrRemoveNS(fullname) {
    return function () {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }

  function attrConstant(name, value) {
    return function () {
      this.setAttribute(name, value);
    };
  }

  function attrConstantNS(fullname, value) {
    return function () {
      this.setAttributeNS(fullname.space, fullname.local, value);
    };
  }

  function attrFunction(name, value) {
    return function () {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttribute(name);else this.setAttribute(name, v);
    };
  }

  function attrFunctionNS(fullname, value) {
    return function () {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttributeNS(fullname.space, fullname.local);else this.setAttributeNS(fullname.space, fullname.local, v);
    };
  }

  function selection_attr (name, value) {
    var fullname = namespace(name);

    if (arguments.length < 2) {
      var node = this.node();
      return fullname.local ? node.getAttributeNS(fullname.space, fullname.local) : node.getAttribute(fullname);
    }

    return this.each((value == null ? fullname.local ? attrRemoveNS : attrRemove : typeof value === "function" ? fullname.local ? attrFunctionNS : attrFunction : fullname.local ? attrConstantNS : attrConstant)(fullname, value));
  }

  function defaultView (node) {
    return node.ownerDocument && node.ownerDocument.defaultView || // node is a Node
    node.document && node // node is a Window
    || node.defaultView; // node is a Document
  }

  function styleRemove(name) {
    return function () {
      this.style.removeProperty(name);
    };
  }

  function styleConstant(name, value, priority) {
    return function () {
      this.style.setProperty(name, value, priority);
    };
  }

  function styleFunction(name, value, priority) {
    return function () {
      var v = value.apply(this, arguments);
      if (v == null) this.style.removeProperty(name);else this.style.setProperty(name, v, priority);
    };
  }

  function selection_style (name, value, priority) {
    return arguments.length > 1 ? this.each((value == null ? styleRemove : typeof value === "function" ? styleFunction : styleConstant)(name, value, priority == null ? "" : priority)) : styleValue(this.node(), name);
  }
  function styleValue(node, name) {
    return node.style.getPropertyValue(name) || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
  }

  function propertyRemove(name) {
    return function () {
      delete this[name];
    };
  }

  function propertyConstant(name, value) {
    return function () {
      this[name] = value;
    };
  }

  function propertyFunction(name, value) {
    return function () {
      var v = value.apply(this, arguments);
      if (v == null) delete this[name];else this[name] = v;
    };
  }

  function selection_property (name, value) {
    return arguments.length > 1 ? this.each((value == null ? propertyRemove : typeof value === "function" ? propertyFunction : propertyConstant)(name, value)) : this.node()[name];
  }

  function classArray(string) {
    return string.trim().split(/^|\s+/);
  }

  function classList(node) {
    return node.classList || new ClassList(node);
  }

  function ClassList(node) {
    this._node = node;
    this._names = classArray(node.getAttribute("class") || "");
  }

  ClassList.prototype = {
    add: function add(name) {
      var i = this._names.indexOf(name);

      if (i < 0) {
        this._names.push(name);

        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    remove: function remove(name) {
      var i = this._names.indexOf(name);

      if (i >= 0) {
        this._names.splice(i, 1);

        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    contains: function contains(name) {
      return this._names.indexOf(name) >= 0;
    }
  };

  function classedAdd(node, names) {
    var list = classList(node),
        i = -1,
        n = names.length;

    while (++i < n) {
      list.add(names[i]);
    }
  }

  function classedRemove(node, names) {
    var list = classList(node),
        i = -1,
        n = names.length;

    while (++i < n) {
      list.remove(names[i]);
    }
  }

  function classedTrue(names) {
    return function () {
      classedAdd(this, names);
    };
  }

  function classedFalse(names) {
    return function () {
      classedRemove(this, names);
    };
  }

  function classedFunction(names, value) {
    return function () {
      (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
    };
  }

  function selection_classed (name, value) {
    var names = classArray(name + "");

    if (arguments.length < 2) {
      var list = classList(this.node()),
          i = -1,
          n = names.length;

      while (++i < n) {
        if (!list.contains(names[i])) return false;
      }

      return true;
    }

    return this.each((typeof value === "function" ? classedFunction : value ? classedTrue : classedFalse)(names, value));
  }

  function textRemove() {
    this.textContent = "";
  }

  function textConstant(value) {
    return function () {
      this.textContent = value;
    };
  }

  function textFunction(value) {
    return function () {
      var v = value.apply(this, arguments);
      this.textContent = v == null ? "" : v;
    };
  }

  function selection_text (value) {
    return arguments.length ? this.each(value == null ? textRemove : (typeof value === "function" ? textFunction : textConstant)(value)) : this.node().textContent;
  }

  function htmlRemove() {
    this.innerHTML = "";
  }

  function htmlConstant(value) {
    return function () {
      this.innerHTML = value;
    };
  }

  function htmlFunction(value) {
    return function () {
      var v = value.apply(this, arguments);
      this.innerHTML = v == null ? "" : v;
    };
  }

  function selection_html (value) {
    return arguments.length ? this.each(value == null ? htmlRemove : (typeof value === "function" ? htmlFunction : htmlConstant)(value)) : this.node().innerHTML;
  }

  function raise() {
    if (this.nextSibling) this.parentNode.appendChild(this);
  }

  function selection_raise () {
    return this.each(raise);
  }

  function lower() {
    if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }

  function selection_lower () {
    return this.each(lower);
  }

  function selection_append (name) {
    var create = typeof name === "function" ? name : creator(name);
    return this.select(function () {
      return this.appendChild(create.apply(this, arguments));
    });
  }

  function constantNull() {
    return null;
  }

  function selection_insert (name, before) {
    var create = typeof name === "function" ? name : creator(name),
        select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
    return this.select(function () {
      return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
    });
  }

  function remove() {
    var parent = this.parentNode;
    if (parent) parent.removeChild(this);
  }

  function selection_remove () {
    return this.each(remove);
  }

  function selection_cloneShallow() {
    var clone = this.cloneNode(false),
        parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }

  function selection_cloneDeep() {
    var clone = this.cloneNode(true),
        parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }

  function selection_clone (deep) {
    return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
  }

  function selection_datum (value) {
    return arguments.length ? this.property("__data__", value) : this.node().__data__;
  }

  var filterEvents = {};

  if (typeof document !== "undefined") {
    var element = document.documentElement;

    if (!("onmouseenter" in element)) {
      filterEvents = {
        mouseenter: "mouseover",
        mouseleave: "mouseout"
      };
    }
  }

  function filterContextListener(listener, index, group) {
    listener = contextListener(listener, index, group);
    return function (event) {
      var related = event.relatedTarget;

      if (!related || related !== this && !(related.compareDocumentPosition(this) & 8)) {
        listener.call(this, event);
      }
    };
  }

  function contextListener(listener, index, group) {
    return function (event1) {

      try {
        listener.call(this, this.__data__, index, group);
      } finally {
      }
    };
  }

  function parseTypenames$1(typenames) {
    return typenames.trim().split(/^|\s+/).map(function (t) {
      var name = "",
          i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      return {
        type: t,
        name: name
      };
    });
  }

  function onRemove(typename) {
    return function () {
      var on = this.__on;
      if (!on) return;

      for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
        if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.capture);
        } else {
          on[++i] = o;
        }
      }

      if (++i) on.length = i;else delete this.__on;
    };
  }

  function onAdd(typename, value, capture) {
    var wrap = filterEvents.hasOwnProperty(typename.type) ? filterContextListener : contextListener;
    return function (d, i, group) {
      var on = this.__on,
          o,
          listener = wrap(value, i, group);
      if (on) for (var j = 0, m = on.length; j < m; ++j) {
        if ((o = on[j]).type === typename.type && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.capture);
          this.addEventListener(o.type, o.listener = listener, o.capture = capture);
          o.value = value;
          return;
        }
      }
      this.addEventListener(typename.type, listener, capture);
      o = {
        type: typename.type,
        name: typename.name,
        value: value,
        listener: listener,
        capture: capture
      };
      if (!on) this.__on = [o];else on.push(o);
    };
  }

  function selection_on (typename, value, capture) {
    var typenames = parseTypenames$1(typename + ""),
        i,
        n = typenames.length,
        t;

    if (arguments.length < 2) {
      var on = this.node().__on;

      if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
        for (i = 0, o = on[j]; i < n; ++i) {
          if ((t = typenames[i]).type === o.type && t.name === o.name) {
            return o.value;
          }
        }
      }
      return;
    }

    on = value ? onAdd : onRemove;
    if (capture == null) capture = false;

    for (i = 0; i < n; ++i) {
      this.each(on(typenames[i], value, capture));
    }

    return this;
  }

  function dispatchEvent(node, type, params) {
    var window = defaultView(node),
        event = window.CustomEvent;

    if (typeof event === "function") {
      event = new event(type, params);
    } else {
      event = window.document.createEvent("Event");
      if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;else event.initEvent(type, false, false);
    }

    node.dispatchEvent(event);
  }

  function dispatchConstant(type, params) {
    return function () {
      return dispatchEvent(this, type, params);
    };
  }

  function dispatchFunction(type, params) {
    return function () {
      return dispatchEvent(this, type, params.apply(this, arguments));
    };
  }

  function selection_dispatch (type, params) {
    return this.each((typeof params === "function" ? dispatchFunction : dispatchConstant)(type, params));
  }

  var root = [null];
  function Selection(groups, parents) {
    this._groups = groups;
    this._parents = parents;
  }

  function selection() {
    return new Selection([[document.documentElement]], root);
  }

  Selection.prototype = selection.prototype = {
    constructor: Selection,
    select: selection_select,
    selectAll: selection_selectAll,
    filter: selection_filter,
    data: selection_data,
    enter: selection_enter,
    exit: selection_exit,
    join: selection_join,
    merge: selection_merge,
    order: selection_order,
    sort: selection_sort,
    call: selection_call,
    nodes: selection_nodes,
    node: selection_node,
    size: selection_size,
    empty: selection_empty,
    each: selection_each,
    attr: selection_attr,
    style: selection_style,
    property: selection_property,
    classed: selection_classed,
    text: selection_text,
    html: selection_html,
    raise: selection_raise,
    lower: selection_lower,
    append: selection_append,
    insert: selection_insert,
    remove: selection_remove,
    clone: selection_clone,
    datum: selection_datum,
    on: selection_on,
    dispatch: selection_dispatch
  };

  function select (selector) {
    return typeof selector === "string" ? new Selection([[document.querySelector(selector)]], [document.documentElement]) : new Selection([[selector]], root);
  }

  function _typeof(obj) {
    "@babel/helpers - typeof";

    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function define (constructor, factory, prototype) {
    constructor.prototype = factory.prototype = prototype;
    prototype.constructor = constructor;
  }
  function extend(parent, definition) {
    var prototype = Object.create(parent.prototype);

    for (var key in definition) {
      prototype[key] = definition[key];
    }

    return prototype;
  }

  function Color() {}
  var _darker = 0.7;

  var _brighter = 1 / _darker;
  var reI = "\\s*([+-]?\\d+)\\s*",
      reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",
      reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
      reHex = /^#([0-9a-f]{3,8})$/,
      reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$"),
      reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$"),
      reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$"),
      reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$"),
      reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$"),
      reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");
  var named = {
    aliceblue: 0xf0f8ff,
    antiquewhite: 0xfaebd7,
    aqua: 0x00ffff,
    aquamarine: 0x7fffd4,
    azure: 0xf0ffff,
    beige: 0xf5f5dc,
    bisque: 0xffe4c4,
    black: 0x000000,
    blanchedalmond: 0xffebcd,
    blue: 0x0000ff,
    blueviolet: 0x8a2be2,
    brown: 0xa52a2a,
    burlywood: 0xdeb887,
    cadetblue: 0x5f9ea0,
    chartreuse: 0x7fff00,
    chocolate: 0xd2691e,
    coral: 0xff7f50,
    cornflowerblue: 0x6495ed,
    cornsilk: 0xfff8dc,
    crimson: 0xdc143c,
    cyan: 0x00ffff,
    darkblue: 0x00008b,
    darkcyan: 0x008b8b,
    darkgoldenrod: 0xb8860b,
    darkgray: 0xa9a9a9,
    darkgreen: 0x006400,
    darkgrey: 0xa9a9a9,
    darkkhaki: 0xbdb76b,
    darkmagenta: 0x8b008b,
    darkolivegreen: 0x556b2f,
    darkorange: 0xff8c00,
    darkorchid: 0x9932cc,
    darkred: 0x8b0000,
    darksalmon: 0xe9967a,
    darkseagreen: 0x8fbc8f,
    darkslateblue: 0x483d8b,
    darkslategray: 0x2f4f4f,
    darkslategrey: 0x2f4f4f,
    darkturquoise: 0x00ced1,
    darkviolet: 0x9400d3,
    deeppink: 0xff1493,
    deepskyblue: 0x00bfff,
    dimgray: 0x696969,
    dimgrey: 0x696969,
    dodgerblue: 0x1e90ff,
    firebrick: 0xb22222,
    floralwhite: 0xfffaf0,
    forestgreen: 0x228b22,
    fuchsia: 0xff00ff,
    gainsboro: 0xdcdcdc,
    ghostwhite: 0xf8f8ff,
    gold: 0xffd700,
    goldenrod: 0xdaa520,
    gray: 0x808080,
    green: 0x008000,
    greenyellow: 0xadff2f,
    grey: 0x808080,
    honeydew: 0xf0fff0,
    hotpink: 0xff69b4,
    indianred: 0xcd5c5c,
    indigo: 0x4b0082,
    ivory: 0xfffff0,
    khaki: 0xf0e68c,
    lavender: 0xe6e6fa,
    lavenderblush: 0xfff0f5,
    lawngreen: 0x7cfc00,
    lemonchiffon: 0xfffacd,
    lightblue: 0xadd8e6,
    lightcoral: 0xf08080,
    lightcyan: 0xe0ffff,
    lightgoldenrodyellow: 0xfafad2,
    lightgray: 0xd3d3d3,
    lightgreen: 0x90ee90,
    lightgrey: 0xd3d3d3,
    lightpink: 0xffb6c1,
    lightsalmon: 0xffa07a,
    lightseagreen: 0x20b2aa,
    lightskyblue: 0x87cefa,
    lightslategray: 0x778899,
    lightslategrey: 0x778899,
    lightsteelblue: 0xb0c4de,
    lightyellow: 0xffffe0,
    lime: 0x00ff00,
    limegreen: 0x32cd32,
    linen: 0xfaf0e6,
    magenta: 0xff00ff,
    maroon: 0x800000,
    mediumaquamarine: 0x66cdaa,
    mediumblue: 0x0000cd,
    mediumorchid: 0xba55d3,
    mediumpurple: 0x9370db,
    mediumseagreen: 0x3cb371,
    mediumslateblue: 0x7b68ee,
    mediumspringgreen: 0x00fa9a,
    mediumturquoise: 0x48d1cc,
    mediumvioletred: 0xc71585,
    midnightblue: 0x191970,
    mintcream: 0xf5fffa,
    mistyrose: 0xffe4e1,
    moccasin: 0xffe4b5,
    navajowhite: 0xffdead,
    navy: 0x000080,
    oldlace: 0xfdf5e6,
    olive: 0x808000,
    olivedrab: 0x6b8e23,
    orange: 0xffa500,
    orangered: 0xff4500,
    orchid: 0xda70d6,
    palegoldenrod: 0xeee8aa,
    palegreen: 0x98fb98,
    paleturquoise: 0xafeeee,
    palevioletred: 0xdb7093,
    papayawhip: 0xffefd5,
    peachpuff: 0xffdab9,
    peru: 0xcd853f,
    pink: 0xffc0cb,
    plum: 0xdda0dd,
    powderblue: 0xb0e0e6,
    purple: 0x800080,
    rebeccapurple: 0x663399,
    red: 0xff0000,
    rosybrown: 0xbc8f8f,
    royalblue: 0x4169e1,
    saddlebrown: 0x8b4513,
    salmon: 0xfa8072,
    sandybrown: 0xf4a460,
    seagreen: 0x2e8b57,
    seashell: 0xfff5ee,
    sienna: 0xa0522d,
    silver: 0xc0c0c0,
    skyblue: 0x87ceeb,
    slateblue: 0x6a5acd,
    slategray: 0x708090,
    slategrey: 0x708090,
    snow: 0xfffafa,
    springgreen: 0x00ff7f,
    steelblue: 0x4682b4,
    tan: 0xd2b48c,
    teal: 0x008080,
    thistle: 0xd8bfd8,
    tomato: 0xff6347,
    turquoise: 0x40e0d0,
    violet: 0xee82ee,
    wheat: 0xf5deb3,
    white: 0xffffff,
    whitesmoke: 0xf5f5f5,
    yellow: 0xffff00,
    yellowgreen: 0x9acd32
  };
  define(Color, color, {
    copy: function copy(channels) {
      return Object.assign(new this.constructor(), this, channels);
    },
    displayable: function displayable() {
      return this.rgb().displayable();
    },
    hex: color_formatHex,
    // Deprecated! Use color.formatHex.
    formatHex: color_formatHex,
    formatHsl: color_formatHsl,
    formatRgb: color_formatRgb,
    toString: color_formatRgb
  });

  function color_formatHex() {
    return this.rgb().formatHex();
  }

  function color_formatHsl() {
    return hslConvert(this).formatHsl();
  }

  function color_formatRgb() {
    return this.rgb().formatRgb();
  }

  function color(format) {
    var m, l;
    format = (format + "").trim().toLowerCase();
    return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
    : l === 3 ? new Rgb(m >> 8 & 0xf | m >> 4 & 0xf0, m >> 4 & 0xf | m & 0xf0, (m & 0xf) << 4 | m & 0xf, 1) // #f00
    : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
    : l === 4 ? rgba(m >> 12 & 0xf | m >> 8 & 0xf0, m >> 8 & 0xf | m >> 4 & 0xf0, m >> 4 & 0xf | m & 0xf0, ((m & 0xf) << 4 | m & 0xf) / 0xff) // #f000
    : null // invalid hex
    ) : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
    : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
    : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
    : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
    : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
    : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
    : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
    : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
  }

  function rgbn(n) {
    return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
  }

  function rgba(r, g, b, a) {
    if (a <= 0) r = g = b = NaN;
    return new Rgb(r, g, b, a);
  }

  function rgbConvert(o) {
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Rgb();
    o = o.rgb();
    return new Rgb(o.r, o.g, o.b, o.opacity);
  }
  function rgb(r, g, b, opacity) {
    return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
  }
  function Rgb(r, g, b, opacity) {
    this.r = +r;
    this.g = +g;
    this.b = +b;
    this.opacity = +opacity;
  }
  define(Rgb, rgb, extend(Color, {
    brighter: function brighter(k) {
      k = k == null ? _brighter : Math.pow(_brighter, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    darker: function darker(k) {
      k = k == null ? _darker : Math.pow(_darker, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    rgb: function rgb() {
      return this;
    },
    displayable: function displayable() {
      return -0.5 <= this.r && this.r < 255.5 && -0.5 <= this.g && this.g < 255.5 && -0.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
    },
    hex: rgb_formatHex,
    // Deprecated! Use color.formatHex.
    formatHex: rgb_formatHex,
    formatRgb: rgb_formatRgb,
    toString: rgb_formatRgb
  }));

  function rgb_formatHex() {
    return "#" + hex(this.r) + hex(this.g) + hex(this.b);
  }

  function rgb_formatRgb() {
    var a = this.opacity;
    a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
    return (a === 1 ? "rgb(" : "rgba(") + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", " + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", " + Math.max(0, Math.min(255, Math.round(this.b) || 0)) + (a === 1 ? ")" : ", " + a + ")");
  }

  function hex(value) {
    value = Math.max(0, Math.min(255, Math.round(value) || 0));
    return (value < 16 ? "0" : "") + value.toString(16);
  }

  function hsla(h, s, l, a) {
    if (a <= 0) h = s = l = NaN;else if (l <= 0 || l >= 1) h = s = NaN;else if (s <= 0) h = NaN;
    return new Hsl(h, s, l, a);
  }

  function hslConvert(o) {
    if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Hsl();
    if (o instanceof Hsl) return o;
    o = o.rgb();
    var r = o.r / 255,
        g = o.g / 255,
        b = o.b / 255,
        min = Math.min(r, g, b),
        max = Math.max(r, g, b),
        h = NaN,
        s = max - min,
        l = (max + min) / 2;

    if (s) {
      if (r === max) h = (g - b) / s + (g < b) * 6;else if (g === max) h = (b - r) / s + 2;else h = (r - g) / s + 4;
      s /= l < 0.5 ? max + min : 2 - max - min;
      h *= 60;
    } else {
      s = l > 0 && l < 1 ? 0 : h;
    }

    return new Hsl(h, s, l, o.opacity);
  }
  function hsl(h, s, l, opacity) {
    return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
  }

  function Hsl(h, s, l, opacity) {
    this.h = +h;
    this.s = +s;
    this.l = +l;
    this.opacity = +opacity;
  }

  define(Hsl, hsl, extend(Color, {
    brighter: function brighter(k) {
      k = k == null ? _brighter : Math.pow(_brighter, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    darker: function darker(k) {
      k = k == null ? _darker : Math.pow(_darker, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    rgb: function rgb() {
      var h = this.h % 360 + (this.h < 0) * 360,
          s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
          l = this.l,
          m2 = l + (l < 0.5 ? l : 1 - l) * s,
          m1 = 2 * l - m2;
      return new Rgb(hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2), hsl2rgb(h, m1, m2), hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2), this.opacity);
    },
    displayable: function displayable() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
    },
    formatHsl: function formatHsl() {
      var a = this.opacity;
      a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
      return (a === 1 ? "hsl(" : "hsla(") + (this.h || 0) + ", " + (this.s || 0) * 100 + "%, " + (this.l || 0) * 100 + "%" + (a === 1 ? ")" : ", " + a + ")");
    }
  }));
  /* From FvD 13.37, CSS Color Module Level 3 */

  function hsl2rgb(h, m1, m2) {
    return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
  }

  function constant$1 (x) {
    return function () {
      return x;
    };
  }

  function linear(a, d) {
    return function (t) {
      return a + t * d;
    };
  }

  function exponential(a, b, y) {
    return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function (t) {
      return Math.pow(a + t * b, y);
    };
  }
  function gamma(y) {
    return (y = +y) === 1 ? nogamma : function (a, b) {
      return b - a ? exponential(a, b, y) : constant$1(isNaN(a) ? b : a);
    };
  }
  function nogamma(a, b) {
    var d = b - a;
    return d ? linear(a, d) : constant$1(isNaN(a) ? b : a);
  }

  var interpolateRgb = (function rgbGamma(y) {
    var color = gamma(y);

    function rgb$1(start, end) {
      var r = color((start = rgb(start)).r, (end = rgb(end)).r),
          g = color(start.g, end.g),
          b = color(start.b, end.b),
          opacity = nogamma(start.opacity, end.opacity);
      return function (t) {
        start.r = r(t);
        start.g = g(t);
        start.b = b(t);
        start.opacity = opacity(t);
        return start + "";
      };
    }

    rgb$1.gamma = rgbGamma;
    return rgb$1;
  })(1);

  function interpolateNumber (a, b) {
    return a = +a, b = +b, function (t) {
      return a * (1 - t) + b * t;
    };
  }

  var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
      reB = new RegExp(reA.source, "g");

  function zero(b) {
    return function () {
      return b;
    };
  }

  function one(b) {
    return function (t) {
      return b(t) + "";
    };
  }

  function interpolateString (a, b) {
    var bi = reA.lastIndex = reB.lastIndex = 0,
        // scan index for next number in b
    am,
        // current match in a
    bm,
        // current match in b
    bs,
        // string preceding current number in b, if any
    i = -1,
        // index in s
    s = [],
        // string constants and placeholders
    q = []; // number interpolators
    // Coerce inputs to strings.

    a = a + "", b = b + ""; // Interpolate pairs of numbers in a & b.

    while ((am = reA.exec(a)) && (bm = reB.exec(b))) {
      if ((bs = bm.index) > bi) {
        // a string precedes the next number in b
        bs = b.slice(bi, bs);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }

      if ((am = am[0]) === (bm = bm[0])) {
        // numbers in a & b match
        if (s[i]) s[i] += bm; // coalesce with previous string
        else s[++i] = bm;
      } else {
        // interpolate non-matching numbers
        s[++i] = null;
        q.push({
          i: i,
          x: interpolateNumber(am, bm)
        });
      }

      bi = reB.lastIndex;
    } // Add remains of b.


    if (bi < b.length) {
      bs = b.slice(bi);
      if (s[i]) s[i] += bs; // coalesce with previous string
      else s[++i] = bs;
    } // Special optimization for only a single match.
    // Otherwise, interpolate each of the numbers and rejoin the string.


    return s.length < 2 ? q[0] ? one(q[0].x) : zero(b) : (b = q.length, function (t) {
      for (var i = 0, o; i < b; ++i) {
        s[(o = q[i]).i] = o.x(t);
      }

      return s.join("");
    });
  }

  var degrees = 180 / Math.PI;
  var identity = {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    skewX: 0,
    scaleX: 1,
    scaleY: 1
  };
  function decompose (a, b, c, d, e, f) {
    var scaleX, scaleY, skewX;
    if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
    if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
    if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
    if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
    return {
      translateX: e,
      translateY: f,
      rotate: Math.atan2(b, a) * degrees,
      skewX: Math.atan(skewX) * degrees,
      scaleX: scaleX,
      scaleY: scaleY
    };
  }

  var cssNode, cssRoot, cssView, svgNode;
  function parseCss(value) {
    if (value === "none") return identity;
    if (!cssNode) cssNode = document.createElement("DIV"), cssRoot = document.documentElement, cssView = document.defaultView;
    cssNode.style.transform = value;
    value = cssView.getComputedStyle(cssRoot.appendChild(cssNode), null).getPropertyValue("transform");
    cssRoot.removeChild(cssNode);
    value = value.slice(7, -1).split(",");
    return decompose(+value[0], +value[1], +value[2], +value[3], +value[4], +value[5]);
  }
  function parseSvg(value) {
    if (value == null) return identity;
    if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svgNode.setAttribute("transform", value);
    if (!(value = svgNode.transform.baseVal.consolidate())) return identity;
    value = value.matrix;
    return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
  }

  function interpolateTransform(parse, pxComma, pxParen, degParen) {
    function pop(s) {
      return s.length ? s.pop() + " " : "";
    }

    function translate(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push("translate(", null, pxComma, null, pxParen);
        q.push({
          i: i - 4,
          x: interpolateNumber(xa, xb)
        }, {
          i: i - 2,
          x: interpolateNumber(ya, yb)
        });
      } else if (xb || yb) {
        s.push("translate(" + xb + pxComma + yb + pxParen);
      }
    }

    function rotate(a, b, s, q) {
      if (a !== b) {
        if (a - b > 180) b += 360;else if (b - a > 180) a += 360; // shortest path

        q.push({
          i: s.push(pop(s) + "rotate(", null, degParen) - 2,
          x: interpolateNumber(a, b)
        });
      } else if (b) {
        s.push(pop(s) + "rotate(" + b + degParen);
      }
    }

    function skewX(a, b, s, q) {
      if (a !== b) {
        q.push({
          i: s.push(pop(s) + "skewX(", null, degParen) - 2,
          x: interpolateNumber(a, b)
        });
      } else if (b) {
        s.push(pop(s) + "skewX(" + b + degParen);
      }
    }

    function scale(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push(pop(s) + "scale(", null, ",", null, ")");
        q.push({
          i: i - 4,
          x: interpolateNumber(xa, xb)
        }, {
          i: i - 2,
          x: interpolateNumber(ya, yb)
        });
      } else if (xb !== 1 || yb !== 1) {
        s.push(pop(s) + "scale(" + xb + "," + yb + ")");
      }
    }

    return function (a, b) {
      var s = [],
          // string constants and placeholders
      q = []; // number interpolators

      a = parse(a), b = parse(b);
      translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
      rotate(a.rotate, b.rotate, s, q);
      skewX(a.skewX, b.skewX, s, q);
      scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
      a = b = null; // gc

      return function (t) {
        var i = -1,
            n = q.length,
            o;

        while (++i < n) {
          s[(o = q[i]).i] = o.x(t);
        }

        return s.join("");
      };
    };
  }

  var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
  var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

  var frame = 0,
      // is an animation frame pending?
  timeout = 0,
      // is a timeout pending?
  interval = 0,
      // are any timers active?
  pokeDelay = 1000,
      // how frequently we check for clock skew
  taskHead,
      taskTail,
      clockLast = 0,
      clockNow = 0,
      clockSkew = 0,
      clock = (typeof performance === "undefined" ? "undefined" : _typeof(performance)) === "object" && performance.now ? performance : Date,
      setFrame = (typeof window === "undefined" ? "undefined" : _typeof(window)) === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (f) {
    setTimeout(f, 17);
  };
  function now() {
    return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
  }

  function clearNow() {
    clockNow = 0;
  }

  function Timer() {
    this._call = this._time = this._next = null;
  }
  Timer.prototype = timer.prototype = {
    constructor: Timer,
    restart: function restart(callback, delay, time) {
      if (typeof callback !== "function") throw new TypeError("callback is not a function");
      time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);

      if (!this._next && taskTail !== this) {
        if (taskTail) taskTail._next = this;else taskHead = this;
        taskTail = this;
      }

      this._call = callback;
      this._time = time;
      sleep();
    },
    stop: function stop() {
      if (this._call) {
        this._call = null;
        this._time = Infinity;
        sleep();
      }
    }
  };
  function timer(callback, delay, time) {
    var t = new Timer();
    t.restart(callback, delay, time);
    return t;
  }
  function timerFlush() {
    now(); // Get the current time, if not already set.

    ++frame; // Pretend we’ve set an alarm, if we haven’t already.

    var t = taskHead,
        e;

    while (t) {
      if ((e = clockNow - t._time) >= 0) t._call.call(null, e);
      t = t._next;
    }

    --frame;
  }

  function wake() {
    clockNow = (clockLast = clock.now()) + clockSkew;
    frame = timeout = 0;

    try {
      timerFlush();
    } finally {
      frame = 0;
      nap();
      clockNow = 0;
    }
  }

  function poke() {
    var now = clock.now(),
        delay = now - clockLast;
    if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
  }

  function nap() {
    var t0,
        t1 = taskHead,
        t2,
        time = Infinity;

    while (t1) {
      if (t1._call) {
        if (time > t1._time) time = t1._time;
        t0 = t1, t1 = t1._next;
      } else {
        t2 = t1._next, t1._next = null;
        t1 = t0 ? t0._next = t2 : taskHead = t2;
      }
    }

    taskTail = t0;
    sleep(time);
  }

  function sleep(time) {
    if (frame) return; // Soonest alarm already set, or will be.

    if (timeout) timeout = clearTimeout(timeout);
    var delay = time - clockNow; // Strictly less than if we recomputed clockNow.

    if (delay > 24) {
      if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
      if (interval) interval = clearInterval(interval);
    } else {
      if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
      frame = 1, setFrame(wake);
    }
  }

  function timeout$1 (callback, delay, time) {
    var t = new Timer();
    delay = delay == null ? 0 : +delay;
    t.restart(function (elapsed) {
      t.stop();
      callback(elapsed + delay);
    }, delay, time);
    return t;
  }

  var emptyOn = dispatch("start", "end", "cancel", "interrupt");
  var emptyTween = [];
  var CREATED = 0;
  var SCHEDULED = 1;
  var STARTING = 2;
  var STARTED = 3;
  var RUNNING = 4;
  var ENDING = 5;
  var ENDED = 6;
  function schedule (node, name, id, index, group, timing) {
    var schedules = node.__transition;
    if (!schedules) node.__transition = {};else if (id in schedules) return;
    create(node, id, {
      name: name,
      index: index,
      // For context during callback.
      group: group,
      // For context during callback.
      on: emptyOn,
      tween: emptyTween,
      time: timing.time,
      delay: timing.delay,
      duration: timing.duration,
      ease: timing.ease,
      timer: null,
      state: CREATED
    });
  }
  function init(node, id) {
    var schedule = get$1(node, id);
    if (schedule.state > CREATED) throw new Error("too late; already scheduled");
    return schedule;
  }
  function set$1(node, id) {
    var schedule = get$1(node, id);
    if (schedule.state > STARTED) throw new Error("too late; already running");
    return schedule;
  }
  function get$1(node, id) {
    var schedule = node.__transition;
    if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
    return schedule;
  }

  function create(node, id, self) {
    var schedules = node.__transition,
        tween; // Initialize the self timer when the transition is created.
    // Note the actual delay is not known until the first callback!

    schedules[id] = self;
    self.timer = timer(schedule, 0, self.time);

    function schedule(elapsed) {
      self.state = SCHEDULED;
      self.timer.restart(start, self.delay, self.time); // If the elapsed delay is less than our first sleep, start immediately.

      if (self.delay <= elapsed) start(elapsed - self.delay);
    }

    function start(elapsed) {
      var i, j, n, o; // If the state is not SCHEDULED, then we previously errored on start.

      if (self.state !== SCHEDULED) return stop();

      for (i in schedules) {
        o = schedules[i];
        if (o.name !== self.name) continue; // While this element already has a starting transition during this frame,
        // defer starting an interrupting transition until that transition has a
        // chance to tick (and possibly end); see d3/d3-transition#54!

        if (o.state === STARTED) return timeout$1(start); // Interrupt the active transition, if any.

        if (o.state === RUNNING) {
          o.state = ENDED;
          o.timer.stop();
          o.on.call("interrupt", node, node.__data__, o.index, o.group);
          delete schedules[i];
        } // Cancel any pre-empted transitions.
        else if (+i < id) {
            o.state = ENDED;
            o.timer.stop();
            o.on.call("cancel", node, node.__data__, o.index, o.group);
            delete schedules[i];
          }
      } // Defer the first tick to end of the current frame; see d3/d3#1576.
      // Note the transition may be canceled after start and before the first tick!
      // Note this must be scheduled before the start event; see d3/d3-transition#16!
      // Assuming this is successful, subsequent callbacks go straight to tick.


      timeout$1(function () {
        if (self.state === STARTED) {
          self.state = RUNNING;
          self.timer.restart(tick, self.delay, self.time);
          tick(elapsed);
        }
      }); // Dispatch the start event.
      // Note this must be done before the tween are initialized.

      self.state = STARTING;
      self.on.call("start", node, node.__data__, self.index, self.group);
      if (self.state !== STARTING) return; // interrupted

      self.state = STARTED; // Initialize the tween, deleting null tween.

      tween = new Array(n = self.tween.length);

      for (i = 0, j = -1; i < n; ++i) {
        if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
          tween[++j] = o;
        }
      }

      tween.length = j + 1;
    }

    function tick(elapsed) {
      var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
          i = -1,
          n = tween.length;

      while (++i < n) {
        tween[i].call(node, t);
      } // Dispatch the end event.


      if (self.state === ENDING) {
        self.on.call("end", node, node.__data__, self.index, self.group);
        stop();
      }
    }

    function stop() {
      self.state = ENDED;
      self.timer.stop();
      delete schedules[id];

      for (var i in schedules) {
        return;
      } // eslint-disable-line no-unused-vars


      delete node.__transition;
    }
  }

  function interrupt (node, name) {
    var schedules = node.__transition,
        schedule,
        active,
        empty = true,
        i;
    if (!schedules) return;
    name = name == null ? null : name + "";

    for (i in schedules) {
      if ((schedule = schedules[i]).name !== name) {
        empty = false;
        continue;
      }

      active = schedule.state > STARTING && schedule.state < ENDING;
      schedule.state = ENDED;
      schedule.timer.stop();
      schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
      delete schedules[i];
    }

    if (empty) delete node.__transition;
  }

  function selection_interrupt (name) {
    return this.each(function () {
      interrupt(this, name);
    });
  }

  function tweenRemove(id, name) {
    var tween0, tween1;
    return function () {
      var schedule = set$1(this, id),
          tween = schedule.tween; // If this node shared tween with the previous node,
      // just assign the updated shared tween and we’re done!
      // Otherwise, copy-on-write.

      if (tween !== tween0) {
        tween1 = tween0 = tween;

        for (var i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name) {
            tween1 = tween1.slice();
            tween1.splice(i, 1);
            break;
          }
        }
      }

      schedule.tween = tween1;
    };
  }

  function tweenFunction(id, name, value) {
    var tween0, tween1;
    if (typeof value !== "function") throw new Error();
    return function () {
      var schedule = set$1(this, id),
          tween = schedule.tween; // If this node shared tween with the previous node,
      // just assign the updated shared tween and we’re done!
      // Otherwise, copy-on-write.

      if (tween !== tween0) {
        tween1 = (tween0 = tween).slice();

        for (var t = {
          name: name,
          value: value
        }, i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name) {
            tween1[i] = t;
            break;
          }
        }

        if (i === n) tween1.push(t);
      }

      schedule.tween = tween1;
    };
  }

  function transition_tween (name, value) {
    var id = this._id;
    name += "";

    if (arguments.length < 2) {
      var tween = get$1(this.node(), id).tween;

      for (var i = 0, n = tween.length, t; i < n; ++i) {
        if ((t = tween[i]).name === name) {
          return t.value;
        }
      }

      return null;
    }

    return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
  }
  function tweenValue(transition, name, value) {
    var id = transition._id;
    transition.each(function () {
      var schedule = set$1(this, id);
      (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
    });
    return function (node) {
      return get$1(node, id).value[name];
    };
  }

  function interpolate (a, b) {
    var c;
    return (typeof b === "number" ? interpolateNumber : b instanceof color ? interpolateRgb : (c = color(b)) ? (b = c, interpolateRgb) : interpolateString)(a, b);
  }

  function attrRemove$1(name) {
    return function () {
      this.removeAttribute(name);
    };
  }

  function attrRemoveNS$1(fullname) {
    return function () {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }

  function attrConstant$1(name, interpolate, value1) {
    var string00,
        string1 = value1 + "",
        interpolate0;
    return function () {
      var string0 = this.getAttribute(name);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
    };
  }

  function attrConstantNS$1(fullname, interpolate, value1) {
    var string00,
        string1 = value1 + "",
        interpolate0;
    return function () {
      var string0 = this.getAttributeNS(fullname.space, fullname.local);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
    };
  }

  function attrFunction$1(name, interpolate, value) {
    var string00, string10, interpolate0;
    return function () {
      var string0,
          value1 = value(this),
          string1;
      if (value1 == null) return void this.removeAttribute(name);
      string0 = this.getAttribute(name);
      string1 = value1 + "";
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }

  function attrFunctionNS$1(fullname, interpolate, value) {
    var string00, string10, interpolate0;
    return function () {
      var string0,
          value1 = value(this),
          string1;
      if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
      string0 = this.getAttributeNS(fullname.space, fullname.local);
      string1 = value1 + "";
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }

  function transition_attr (name, value) {
    var fullname = namespace(name),
        i = fullname === "transform" ? interpolateTransformSvg : interpolate;
    return this.attrTween(name, typeof value === "function" ? (fullname.local ? attrFunctionNS$1 : attrFunction$1)(fullname, i, tweenValue(this, "attr." + name, value)) : value == null ? (fullname.local ? attrRemoveNS$1 : attrRemove$1)(fullname) : (fullname.local ? attrConstantNS$1 : attrConstant$1)(fullname, i, value));
  }

  function attrInterpolate(name, i) {
    return function (t) {
      this.setAttribute(name, i.call(this, t));
    };
  }

  function attrInterpolateNS(fullname, i) {
    return function (t) {
      this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
    };
  }

  function attrTweenNS(fullname, value) {
    var t0, i0;

    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
      return t0;
    }

    tween._value = value;
    return tween;
  }

  function attrTween(name, value) {
    var t0, i0;

    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
      return t0;
    }

    tween._value = value;
    return tween;
  }

  function transition_attrTween (name, value) {
    var key = "attr." + name;
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error();
    var fullname = namespace(name);
    return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
  }

  function delayFunction(id, value) {
    return function () {
      init(this, id).delay = +value.apply(this, arguments);
    };
  }

  function delayConstant(id, value) {
    return value = +value, function () {
      init(this, id).delay = value;
    };
  }

  function transition_delay (value) {
    var id = this._id;
    return arguments.length ? this.each((typeof value === "function" ? delayFunction : delayConstant)(id, value)) : get$1(this.node(), id).delay;
  }

  function durationFunction(id, value) {
    return function () {
      set$1(this, id).duration = +value.apply(this, arguments);
    };
  }

  function durationConstant(id, value) {
    return value = +value, function () {
      set$1(this, id).duration = value;
    };
  }

  function transition_duration (value) {
    var id = this._id;
    return arguments.length ? this.each((typeof value === "function" ? durationFunction : durationConstant)(id, value)) : get$1(this.node(), id).duration;
  }

  function easeConstant(id, value) {
    if (typeof value !== "function") throw new Error();
    return function () {
      set$1(this, id).ease = value;
    };
  }

  function transition_ease (value) {
    var id = this._id;
    return arguments.length ? this.each(easeConstant(id, value)) : get$1(this.node(), id).ease;
  }

  function transition_filter (match) {
    if (typeof match !== "function") match = matcher(match);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }

    return new Transition(subgroups, this._parents, this._name, this._id);
  }

  function transition_merge (transition) {
    if (transition._id !== this._id) throw new Error();

    for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }

    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }

    return new Transition(merges, this._parents, this._name, this._id);
  }

  function start(name) {
    return (name + "").trim().split(/^|\s+/).every(function (t) {
      var i = t.indexOf(".");
      if (i >= 0) t = t.slice(0, i);
      return !t || t === "start";
    });
  }

  function onFunction(id, name, listener) {
    var on0,
        on1,
        sit = start(name) ? init : set$1;
    return function () {
      var schedule = sit(this, id),
          on = schedule.on; // If this node shared a dispatch with the previous node,
      // just assign the updated shared dispatch and we’re done!
      // Otherwise, copy-on-write.

      if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);
      schedule.on = on1;
    };
  }

  function transition_on (name, listener) {
    var id = this._id;
    return arguments.length < 2 ? get$1(this.node(), id).on.on(name) : this.each(onFunction(id, name, listener));
  }

  function removeFunction(id) {
    return function () {
      var parent = this.parentNode;

      for (var i in this.__transition) {
        if (+i !== id) return;
      }

      if (parent) parent.removeChild(this);
    };
  }

  function transition_remove () {
    return this.on("end.remove", removeFunction(this._id));
  }

  function transition_select (select) {
    var name = this._name,
        id = this._id;
    if (typeof select !== "function") select = selector(select);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
          schedule(subgroup[i], name, id, i, subgroup, get$1(node, id));
        }
      }
    }

    return new Transition(subgroups, this._parents, name, id);
  }

  function transition_selectAll (select) {
    var name = this._name,
        id = this._id;
    if (typeof select !== "function") select = selectorAll(select);

    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          for (var children = select.call(node, node.__data__, i, group), child, inherit = get$1(node, id), k = 0, l = children.length; k < l; ++k) {
            if (child = children[k]) {
              schedule(child, name, id, k, children, inherit);
            }
          }

          subgroups.push(children);
          parents.push(node);
        }
      }
    }

    return new Transition(subgroups, parents, name, id);
  }

  var Selection$1 = selection.prototype.constructor;
  function transition_selection () {
    return new Selection$1(this._groups, this._parents);
  }

  function styleNull(name, interpolate) {
    var string00, string10, interpolate0;
    return function () {
      var string0 = styleValue(this, name),
          string1 = (this.style.removeProperty(name), styleValue(this, name));
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : interpolate0 = interpolate(string00 = string0, string10 = string1);
    };
  }

  function styleRemove$1(name) {
    return function () {
      this.style.removeProperty(name);
    };
  }

  function styleConstant$1(name, interpolate, value1) {
    var string00,
        string1 = value1 + "",
        interpolate0;
    return function () {
      var string0 = styleValue(this, name);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
    };
  }

  function styleFunction$1(name, interpolate, value) {
    var string00, string10, interpolate0;
    return function () {
      var string0 = styleValue(this, name),
          value1 = value(this),
          string1 = value1 + "";
      if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }

  function styleMaybeRemove(id, name) {
    var on0,
        on1,
        listener0,
        key = "style." + name,
        event = "end." + key,
        remove;
    return function () {
      var schedule = set$1(this, id),
          on = schedule.on,
          listener = schedule.value[key] == null ? remove || (remove = styleRemove$1(name)) : undefined; // If this node shared a dispatch with the previous node,
      // just assign the updated shared dispatch and we’re done!
      // Otherwise, copy-on-write.

      if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);
      schedule.on = on1;
    };
  }

  function transition_style (name, value, priority) {
    var i = (name += "") === "transform" ? interpolateTransformCss : interpolate;
    return value == null ? this.styleTween(name, styleNull(name, i)).on("end.style." + name, styleRemove$1(name)) : typeof value === "function" ? this.styleTween(name, styleFunction$1(name, i, tweenValue(this, "style." + name, value))).each(styleMaybeRemove(this._id, name)) : this.styleTween(name, styleConstant$1(name, i, value), priority).on("end.style." + name, null);
  }

  function styleInterpolate(name, i, priority) {
    return function (t) {
      this.style.setProperty(name, i.call(this, t), priority);
    };
  }

  function styleTween(name, value, priority) {
    var t, i0;

    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
      return t;
    }

    tween._value = value;
    return tween;
  }

  function transition_styleTween (name, value, priority) {
    var key = "style." + (name += "");
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error();
    return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
  }

  function textConstant$1(value) {
    return function () {
      this.textContent = value;
    };
  }

  function textFunction$1(value) {
    return function () {
      var value1 = value(this);
      this.textContent = value1 == null ? "" : value1;
    };
  }

  function transition_text (value) {
    return this.tween("text", typeof value === "function" ? textFunction$1(tweenValue(this, "text", value)) : textConstant$1(value == null ? "" : value + ""));
  }

  function textInterpolate(i) {
    return function (t) {
      this.textContent = i.call(this, t);
    };
  }

  function textTween(value) {
    var t0, i0;

    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
      return t0;
    }

    tween._value = value;
    return tween;
  }

  function transition_textTween (value) {
    var key = "text";
    if (arguments.length < 1) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error();
    return this.tween(key, textTween(value));
  }

  function transition_transition () {
    var name = this._name,
        id0 = this._id,
        id1 = newId();

    for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          var inherit = get$1(node, id0);
          schedule(node, name, id1, i, group, {
            time: inherit.time + inherit.delay + inherit.duration,
            delay: 0,
            duration: inherit.duration,
            ease: inherit.ease
          });
        }
      }
    }

    return new Transition(groups, this._parents, name, id1);
  }

  function transition_end () {
    var on0,
        on1,
        that = this,
        id = that._id,
        size = that.size();
    return new Promise(function (resolve, reject) {
      var cancel = {
        value: reject
      },
          end = {
        value: function value() {
          if (--size === 0) resolve();
        }
      };
      that.each(function () {
        var schedule = set$1(this, id),
            on = schedule.on; // If this node shared a dispatch with the previous node,
        // just assign the updated shared dispatch and we’re done!
        // Otherwise, copy-on-write.

        if (on !== on0) {
          on1 = (on0 = on).copy();

          on1._.cancel.push(cancel);

          on1._.interrupt.push(cancel);

          on1._.end.push(end);
        }

        schedule.on = on1;
      });
    });
  }

  var id = 0;
  function Transition(groups, parents, name, id) {
    this._groups = groups;
    this._parents = parents;
    this._name = name;
    this._id = id;
  }
  function transition(name) {
    return selection().transition(name);
  }
  function newId() {
    return ++id;
  }
  var selection_prototype = selection.prototype;
  Transition.prototype = transition.prototype = {
    constructor: Transition,
    select: transition_select,
    selectAll: transition_selectAll,
    filter: transition_filter,
    merge: transition_merge,
    selection: transition_selection,
    transition: transition_transition,
    call: selection_prototype.call,
    nodes: selection_prototype.nodes,
    node: selection_prototype.node,
    size: selection_prototype.size,
    empty: selection_prototype.empty,
    each: selection_prototype.each,
    on: transition_on,
    attr: transition_attr,
    attrTween: transition_attrTween,
    style: transition_style,
    styleTween: transition_styleTween,
    text: transition_text,
    textTween: transition_textTween,
    remove: transition_remove,
    tween: transition_tween,
    delay: transition_delay,
    duration: transition_duration,
    ease: transition_ease,
    end: transition_end
  };

  function cubicInOut(t) {
    return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
  }

  var defaultTiming = {
    time: null,
    // Set on use.
    delay: 0,
    duration: 250,
    ease: cubicInOut
  };

  function inherit(node, id) {
    var timing;

    while (!(timing = node.__transition) || !(timing = timing[id])) {
      if (!(node = node.parentNode)) {
        return defaultTiming.time = now(), defaultTiming;
      }
    }

    return timing;
  }

  function selection_transition (name) {
    var id, timing;

    if (name instanceof Transition) {
      id = name._id, name = name._name;
    } else {
      id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
    }

    for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          schedule(node, name, id, i, group, timing || inherit(node, id));
        }
      }
    }

    return new Transition(groups, this._parents, name, id);
  }

  selection.prototype.interrupt = selection_interrupt;
  selection.prototype.transition = selection_transition;

  var pi = Math.PI,
      tau = 2 * pi,
      epsilon = 1e-6,
      tauEpsilon = tau - epsilon;

  function Path() {
    this._x0 = this._y0 = // start of current subpath
    this._x1 = this._y1 = null; // end of current subpath

    this._ = "";
  }

  function path() {
    return new Path();
  }

  Path.prototype = path.prototype = {
    constructor: Path,
    moveTo: function moveTo(x, y) {
      this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y);
    },
    closePath: function closePath() {
      if (this._x1 !== null) {
        this._x1 = this._x0, this._y1 = this._y0;
        this._ += "Z";
      }
    },
    lineTo: function lineTo(x, y) {
      this._ += "L" + (this._x1 = +x) + "," + (this._y1 = +y);
    },
    quadraticCurveTo: function quadraticCurveTo(x1, y1, x, y) {
      this._ += "Q" + +x1 + "," + +y1 + "," + (this._x1 = +x) + "," + (this._y1 = +y);
    },
    bezierCurveTo: function bezierCurveTo(x1, y1, x2, y2, x, y) {
      this._ += "C" + +x1 + "," + +y1 + "," + +x2 + "," + +y2 + "," + (this._x1 = +x) + "," + (this._y1 = +y);
    },
    arcTo: function arcTo(x1, y1, x2, y2, r) {
      x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
      var x0 = this._x1,
          y0 = this._y1,
          x21 = x2 - x1,
          y21 = y2 - y1,
          x01 = x0 - x1,
          y01 = y0 - y1,
          l01_2 = x01 * x01 + y01 * y01; // Is the radius negative? Error.

      if (r < 0) throw new Error("negative radius: " + r); // Is this path empty? Move to (x1,y1).

      if (this._x1 === null) {
        this._ += "M" + (this._x1 = x1) + "," + (this._y1 = y1);
      } // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
      else if (!(l01_2 > epsilon)) ; // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
        // Equivalently, is (x1,y1) coincident with (x2,y2)?
        // Or, is the radius zero? Line to (x1,y1).
        else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
            this._ += "L" + (this._x1 = x1) + "," + (this._y1 = y1);
          } // Otherwise, draw an arc!
          else {
              var x20 = x2 - x0,
                  y20 = y2 - y0,
                  l21_2 = x21 * x21 + y21 * y21,
                  l20_2 = x20 * x20 + y20 * y20,
                  l21 = Math.sqrt(l21_2),
                  l01 = Math.sqrt(l01_2),
                  l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
                  t01 = l / l01,
                  t21 = l / l21; // If the start tangent is not coincident with (x0,y0), line to.

              if (Math.abs(t01 - 1) > epsilon) {
                this._ += "L" + (x1 + t01 * x01) + "," + (y1 + t01 * y01);
              }

              this._ += "A" + r + "," + r + ",0,0," + +(y01 * x20 > x01 * y20) + "," + (this._x1 = x1 + t21 * x21) + "," + (this._y1 = y1 + t21 * y21);
            }
    },
    arc: function arc(x, y, r, a0, a1, ccw) {
      x = +x, y = +y, r = +r, ccw = !!ccw;
      var dx = r * Math.cos(a0),
          dy = r * Math.sin(a0),
          x0 = x + dx,
          y0 = y + dy,
          cw = 1 ^ ccw,
          da = ccw ? a0 - a1 : a1 - a0; // Is the radius negative? Error.

      if (r < 0) throw new Error("negative radius: " + r); // Is this path empty? Move to (x0,y0).

      if (this._x1 === null) {
        this._ += "M" + x0 + "," + y0;
      } // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
      else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
          this._ += "L" + x0 + "," + y0;
        } // Is this arc empty? We’re done.


      if (!r) return; // Does the angle go the wrong way? Flip the direction.

      if (da < 0) da = da % tau + tau; // Is this a complete circle? Draw two arcs to complete the circle.

      if (da > tauEpsilon) {
        this._ += "A" + r + "," + r + ",0,1," + cw + "," + (x - dx) + "," + (y - dy) + "A" + r + "," + r + ",0,1," + cw + "," + (this._x1 = x0) + "," + (this._y1 = y0);
      } // Is this arc non-empty? Draw an arc!
      else if (da > epsilon) {
          this._ += "A" + r + "," + r + ",0," + +(da >= pi) + "," + cw + "," + (this._x1 = x + r * Math.cos(a1)) + "," + (this._y1 = y + r * Math.sin(a1));
        }
    },
    rect: function rect(x, y, w, h) {
      this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y) + "h" + +w + "v" + +h + "h" + -w + "Z";
    },
    toString: function toString() {
      return this._;
    }
  };

  var prefix = "$";

  function Map() {}

  Map.prototype = map.prototype = {
    constructor: Map,
    has: function has(key) {
      return prefix + key in this;
    },
    get: function get(key) {
      return this[prefix + key];
    },
    set: function set(key, value) {
      this[prefix + key] = value;
      return this;
    },
    remove: function remove(key) {
      var property = prefix + key;
      return property in this && delete this[property];
    },
    clear: function clear() {
      for (var property in this) {
        if (property[0] === prefix) delete this[property];
      }
    },
    keys: function keys() {
      var keys = [];

      for (var property in this) {
        if (property[0] === prefix) keys.push(property.slice(1));
      }

      return keys;
    },
    values: function values() {
      var values = [];

      for (var property in this) {
        if (property[0] === prefix) values.push(this[property]);
      }

      return values;
    },
    entries: function entries() {
      var entries = [];

      for (var property in this) {
        if (property[0] === prefix) entries.push({
          key: property.slice(1),
          value: this[property]
        });
      }

      return entries;
    },
    size: function size() {
      var size = 0;

      for (var property in this) {
        if (property[0] === prefix) ++size;
      }

      return size;
    },
    empty: function empty() {
      for (var property in this) {
        if (property[0] === prefix) return false;
      }

      return true;
    },
    each: function each(f) {
      for (var property in this) {
        if (property[0] === prefix) f(this[property], property.slice(1), this);
      }
    }
  };

  function map(object, f) {
    var map = new Map(); // Copy constructor.

    if (object instanceof Map) object.each(function (value, key) {
      map.set(key, value);
    }); // Index array by numeric index or specified key function.
    else if (Array.isArray(object)) {
        var i = -1,
            n = object.length,
            o;
        if (f == null) while (++i < n) {
          map.set(i, object[i]);
        } else while (++i < n) {
          map.set(f(o = object[i], i, object), o);
        }
      } // Convert object to map.
      else if (object) for (var key in object) {
          map.set(key, object[key]);
        }
    return map;
  }

  function Set() {}

  var proto = map.prototype;
  Set.prototype = set$2.prototype = {
    constructor: Set,
    has: proto.has,
    add: function add(value) {
      value += "";
      this[prefix + value] = value;
      return this;
    },
    remove: proto.remove,
    clear: proto.clear,
    values: proto.keys,
    size: proto.size,
    empty: proto.empty,
    each: proto.each
  };

  function set$2(object, f) {
    var set = new Set(); // Copy constructor.

    if (object instanceof Set) object.each(function (value) {
      set.add(value);
    }); // Otherwise, assume it’s an array.
    else if (object) {
        var i = -1,
            n = object.length;
        if (f == null) while (++i < n) {
          set.add(object[i]);
        } else while (++i < n) {
          set.add(f(object[i], i, object));
        }
      }
    return set;
  }

  var EOL = {},
      EOF = {},
      QUOTE = 34,
      NEWLINE = 10,
      RETURN = 13;

  function objectConverter(columns) {
    return new Function("d", "return {" + columns.map(function (name, i) {
      return JSON.stringify(name) + ": d[" + i + "] || \"\"";
    }).join(",") + "}");
  }

  function customConverter(columns, f) {
    var object = objectConverter(columns);
    return function (row, i) {
      return f(object(row), i, columns);
    };
  } // Compute unique columns in order of discovery.


  function inferColumns(rows) {
    var columnSet = Object.create(null),
        columns = [];
    rows.forEach(function (row) {
      for (var column in row) {
        if (!(column in columnSet)) {
          columns.push(columnSet[column] = column);
        }
      }
    });
    return columns;
  }

  function pad(value, width) {
    var s = value + "",
        length = s.length;
    return length < width ? new Array(width - length + 1).join(0) + s : s;
  }

  function formatYear(year) {
    return year < 0 ? "-" + pad(-year, 6) : year > 9999 ? "+" + pad(year, 6) : pad(year, 4);
  }

  function formatDate(date) {
    var hours = date.getUTCHours(),
        minutes = date.getUTCMinutes(),
        seconds = date.getUTCSeconds(),
        milliseconds = date.getUTCMilliseconds();
    return isNaN(date) ? "Invalid Date" : formatYear(date.getUTCFullYear()) + "-" + pad(date.getUTCMonth() + 1, 2) + "-" + pad(date.getUTCDate(), 2) + (milliseconds ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "." + pad(milliseconds, 3) + "Z" : seconds ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "Z" : minutes || hours ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + "Z" : "");
  }

  function dsvFormat (delimiter) {
    var reFormat = new RegExp("[\"" + delimiter + "\n\r]"),
        DELIMITER = delimiter.charCodeAt(0);

    function parse(text, f) {
      var convert,
          columns,
          rows = parseRows(text, function (row, i) {
        if (convert) return convert(row, i - 1);
        columns = row, convert = f ? customConverter(row, f) : objectConverter(row);
      });
      rows.columns = columns || [];
      return rows;
    }

    function parseRows(text, f) {
      var rows = [],
          // output rows
      N = text.length,
          I = 0,
          // current character index
      n = 0,
          // current line number
      t,
          // current token
      eof = N <= 0,
          // current token followed by EOF?
      eol = false; // current token followed by EOL?
      // Strip the trailing newline.

      if (text.charCodeAt(N - 1) === NEWLINE) --N;
      if (text.charCodeAt(N - 1) === RETURN) --N;

      function token() {
        if (eof) return EOF;
        if (eol) return eol = false, EOL; // Unescape quotes.

        var i,
            j = I,
            c;

        if (text.charCodeAt(j) === QUOTE) {
          while (I++ < N && text.charCodeAt(I) !== QUOTE || text.charCodeAt(++I) === QUOTE) {
          }

          if ((i = I) >= N) eof = true;else if ((c = text.charCodeAt(I++)) === NEWLINE) eol = true;else if (c === RETURN) {
            eol = true;
            if (text.charCodeAt(I) === NEWLINE) ++I;
          }
          return text.slice(j + 1, i - 1).replace(/""/g, "\"");
        } // Find next delimiter or newline.


        while (I < N) {
          if ((c = text.charCodeAt(i = I++)) === NEWLINE) eol = true;else if (c === RETURN) {
            eol = true;
            if (text.charCodeAt(I) === NEWLINE) ++I;
          } else if (c !== DELIMITER) continue;
          return text.slice(j, i);
        } // Return last token before EOF.


        return eof = true, text.slice(j, N);
      }

      while ((t = token()) !== EOF) {
        var row = [];

        while (t !== EOL && t !== EOF) {
          row.push(t), t = token();
        }

        if (f && (row = f(row, n++)) == null) continue;
        rows.push(row);
      }

      return rows;
    }

    function preformatBody(rows, columns) {
      return rows.map(function (row) {
        return columns.map(function (column) {
          return formatValue(row[column]);
        }).join(delimiter);
      });
    }

    function format(rows, columns) {
      if (columns == null) columns = inferColumns(rows);
      return [columns.map(formatValue).join(delimiter)].concat(preformatBody(rows, columns)).join("\n");
    }

    function formatBody(rows, columns) {
      if (columns == null) columns = inferColumns(rows);
      return preformatBody(rows, columns).join("\n");
    }

    function formatRows(rows) {
      return rows.map(formatRow).join("\n");
    }

    function formatRow(row) {
      return row.map(formatValue).join(delimiter);
    }

    function formatValue(value) {
      return value == null ? "" : value instanceof Date ? formatDate(value) : reFormat.test(value += "") ? "\"" + value.replace(/"/g, "\"\"") + "\"" : value;
    }

    return {
      parse: parse,
      parseRows: parseRows,
      format: format,
      formatBody: formatBody,
      formatRows: formatRows,
      formatRow: formatRow,
      formatValue: formatValue
    };
  }

  var csv = dsvFormat(",");
  var csvParse = csv.parse;

  function responseText(response) {
    if (!response.ok) throw new Error(response.status + " " + response.statusText);
    return response.text();
  }

  function text (input, init) {
    return fetch(input, init).then(responseText);
  }

  function dsvParse(parse) {
    return function (input, init, row) {
      if (arguments.length === 2 && typeof init === "function") row = init, init = undefined;
      return text(input, init).then(function (response) {
        return parse(response, row);
      });
    };
  }
  var csv$1 = dsvParse(csvParse);

  function responseJson(response) {
    if (!response.ok) throw new Error(response.status + " " + response.statusText);
    if (response.status === 204 || response.status === 205) return;
    return response.json();
  }

  function json (input, init) {
    return fetch(input, init).then(responseJson);
  }

  // Adds floating point numbers with twice the normal precision.
  // Reference: J. R. Shewchuk, Adaptive Precision Floating-Point Arithmetic and
  // Fast Robust Geometric Predicates, Discrete & Computational Geometry 18(3)
  // 305–363 (1997).
  // Code adapted from GeographicLib by Charles F. F. Karney,
  // http://geographiclib.sourceforge.net/
  function adder () {
    return new Adder();
  }

  function Adder() {
    this.reset();
  }

  Adder.prototype = {
    constructor: Adder,
    reset: function reset() {
      this.s = // rounded value
      this.t = 0; // exact error
    },
    add: function add(y) {
      _add(temp, y, this.t);

      _add(this, temp.s, this.s);

      if (this.s) this.t += temp.t;else this.s = temp.t;
    },
    valueOf: function valueOf() {
      return this.s;
    }
  };
  var temp = new Adder();

  function _add(adder, a, b) {
    var x = adder.s = a + b,
        bv = x - a,
        av = x - bv;
    adder.t = a - av + (b - bv);
  }

  var pi$1 = Math.PI;
  var tau$1 = pi$1 * 2;
  var abs = Math.abs;
  var sqrt = Math.sqrt;

  function noop$1() {}

  function streamGeometry(geometry, stream) {
    if (geometry && streamGeometryType.hasOwnProperty(geometry.type)) {
      streamGeometryType[geometry.type](geometry, stream);
    }
  }

  var streamObjectType = {
    Feature: function Feature(object, stream) {
      streamGeometry(object.geometry, stream);
    },
    FeatureCollection: function FeatureCollection(object, stream) {
      var features = object.features,
          i = -1,
          n = features.length;

      while (++i < n) {
        streamGeometry(features[i].geometry, stream);
      }
    }
  };
  var streamGeometryType = {
    Sphere: function Sphere(object, stream) {
      stream.sphere();
    },
    Point: function Point(object, stream) {
      object = object.coordinates;
      stream.point(object[0], object[1], object[2]);
    },
    MultiPoint: function MultiPoint(object, stream) {
      var coordinates = object.coordinates,
          i = -1,
          n = coordinates.length;

      while (++i < n) {
        object = coordinates[i], stream.point(object[0], object[1], object[2]);
      }
    },
    LineString: function LineString(object, stream) {
      streamLine(object.coordinates, stream, 0);
    },
    MultiLineString: function MultiLineString(object, stream) {
      var coordinates = object.coordinates,
          i = -1,
          n = coordinates.length;

      while (++i < n) {
        streamLine(coordinates[i], stream, 0);
      }
    },
    Polygon: function Polygon(object, stream) {
      streamPolygon(object.coordinates, stream);
    },
    MultiPolygon: function MultiPolygon(object, stream) {
      var coordinates = object.coordinates,
          i = -1,
          n = coordinates.length;

      while (++i < n) {
        streamPolygon(coordinates[i], stream);
      }
    },
    GeometryCollection: function GeometryCollection(object, stream) {
      var geometries = object.geometries,
          i = -1,
          n = geometries.length;

      while (++i < n) {
        streamGeometry(geometries[i], stream);
      }
    }
  };

  function streamLine(coordinates, stream, closed) {
    var i = -1,
        n = coordinates.length - closed,
        coordinate;
    stream.lineStart();

    while (++i < n) {
      coordinate = coordinates[i], stream.point(coordinate[0], coordinate[1], coordinate[2]);
    }

    stream.lineEnd();
  }

  function streamPolygon(coordinates, stream) {
    var i = -1,
        n = coordinates.length;
    stream.polygonStart();

    while (++i < n) {
      streamLine(coordinates[i], stream, 1);
    }

    stream.polygonEnd();
  }

  function geoStream (object, stream) {
    if (object && streamObjectType.hasOwnProperty(object.type)) {
      streamObjectType[object.type](object, stream);
    } else {
      streamGeometry(object, stream);
    }
  }

  function identity$1 (x) {
    return x;
  }

  var areaSum = adder(),
      areaRingSum = adder(),
      x00,
      y00,
      x0,
      y0;
  var areaStream = {
    point: noop$1,
    lineStart: noop$1,
    lineEnd: noop$1,
    polygonStart: function polygonStart() {
      areaStream.lineStart = areaRingStart;
      areaStream.lineEnd = areaRingEnd;
    },
    polygonEnd: function polygonEnd() {
      areaStream.lineStart = areaStream.lineEnd = areaStream.point = noop$1;
      areaSum.add(abs(areaRingSum));
      areaRingSum.reset();
    },
    result: function result() {
      var area = areaSum / 2;
      areaSum.reset();
      return area;
    }
  };

  function areaRingStart() {
    areaStream.point = areaPointFirst;
  }

  function areaPointFirst(x, y) {
    areaStream.point = areaPoint;
    x00 = x0 = x, y00 = y0 = y;
  }

  function areaPoint(x, y) {
    areaRingSum.add(y0 * x - x0 * y);
    x0 = x, y0 = y;
  }

  function areaRingEnd() {
    areaPoint(x00, y00);
  }

  var x0$1 = Infinity,
      y0$1 = x0$1,
      x1 = -x0$1,
      y1 = x1;
  var boundsStream = {
    point: boundsPoint,
    lineStart: noop$1,
    lineEnd: noop$1,
    polygonStart: noop$1,
    polygonEnd: noop$1,
    result: function result() {
      var bounds = [[x0$1, y0$1], [x1, y1]];
      x1 = y1 = -(y0$1 = x0$1 = Infinity);
      return bounds;
    }
  };

  function boundsPoint(x, y) {
    if (x < x0$1) x0$1 = x;
    if (x > x1) x1 = x;
    if (y < y0$1) y0$1 = y;
    if (y > y1) y1 = y;
  }

  var X0 = 0,
      Y0 = 0,
      Z0 = 0,
      X1 = 0,
      Y1 = 0,
      Z1 = 0,
      X2 = 0,
      Y2 = 0,
      Z2 = 0,
      x00$1,
      y00$1,
      x0$2,
      y0$2;
  var centroidStream = {
    point: centroidPoint,
    lineStart: centroidLineStart,
    lineEnd: centroidLineEnd,
    polygonStart: function polygonStart() {
      centroidStream.lineStart = centroidRingStart;
      centroidStream.lineEnd = centroidRingEnd;
    },
    polygonEnd: function polygonEnd() {
      centroidStream.point = centroidPoint;
      centroidStream.lineStart = centroidLineStart;
      centroidStream.lineEnd = centroidLineEnd;
    },
    result: function result() {
      var centroid = Z2 ? [X2 / Z2, Y2 / Z2] : Z1 ? [X1 / Z1, Y1 / Z1] : Z0 ? [X0 / Z0, Y0 / Z0] : [NaN, NaN];
      X0 = Y0 = Z0 = X1 = Y1 = Z1 = X2 = Y2 = Z2 = 0;
      return centroid;
    }
  };

  function centroidPoint(x, y) {
    X0 += x;
    Y0 += y;
    ++Z0;
  }

  function centroidLineStart() {
    centroidStream.point = centroidPointFirstLine;
  }

  function centroidPointFirstLine(x, y) {
    centroidStream.point = centroidPointLine;
    centroidPoint(x0$2 = x, y0$2 = y);
  }

  function centroidPointLine(x, y) {
    var dx = x - x0$2,
        dy = y - y0$2,
        z = sqrt(dx * dx + dy * dy);
    X1 += z * (x0$2 + x) / 2;
    Y1 += z * (y0$2 + y) / 2;
    Z1 += z;
    centroidPoint(x0$2 = x, y0$2 = y);
  }

  function centroidLineEnd() {
    centroidStream.point = centroidPoint;
  }

  function centroidRingStart() {
    centroidStream.point = centroidPointFirstRing;
  }

  function centroidRingEnd() {
    centroidPointRing(x00$1, y00$1);
  }

  function centroidPointFirstRing(x, y) {
    centroidStream.point = centroidPointRing;
    centroidPoint(x00$1 = x0$2 = x, y00$1 = y0$2 = y);
  }

  function centroidPointRing(x, y) {
    var dx = x - x0$2,
        dy = y - y0$2,
        z = sqrt(dx * dx + dy * dy);
    X1 += z * (x0$2 + x) / 2;
    Y1 += z * (y0$2 + y) / 2;
    Z1 += z;
    z = y0$2 * x - x0$2 * y;
    X2 += z * (x0$2 + x);
    Y2 += z * (y0$2 + y);
    Z2 += z * 3;
    centroidPoint(x0$2 = x, y0$2 = y);
  }

  function PathContext(context) {
    this._context = context;
  }
  PathContext.prototype = {
    _radius: 4.5,
    pointRadius: function pointRadius(_) {
      return this._radius = _, this;
    },
    polygonStart: function polygonStart() {
      this._line = 0;
    },
    polygonEnd: function polygonEnd() {
      this._line = NaN;
    },
    lineStart: function lineStart() {
      this._point = 0;
    },
    lineEnd: function lineEnd() {
      if (this._line === 0) this._context.closePath();
      this._point = NaN;
    },
    point: function point(x, y) {
      switch (this._point) {
        case 0:
          {
            this._context.moveTo(x, y);

            this._point = 1;
            break;
          }

        case 1:
          {
            this._context.lineTo(x, y);

            break;
          }

        default:
          {
            this._context.moveTo(x + this._radius, y);

            this._context.arc(x, y, this._radius, 0, tau$1);

            break;
          }
      }
    },
    result: noop$1
  };

  var lengthSum = adder(),
      lengthRing,
      x00$2,
      y00$2,
      x0$3,
      y0$3;
  var lengthStream = {
    point: noop$1,
    lineStart: function lineStart() {
      lengthStream.point = lengthPointFirst;
    },
    lineEnd: function lineEnd() {
      if (lengthRing) lengthPoint(x00$2, y00$2);
      lengthStream.point = noop$1;
    },
    polygonStart: function polygonStart() {
      lengthRing = true;
    },
    polygonEnd: function polygonEnd() {
      lengthRing = null;
    },
    result: function result() {
      var length = +lengthSum;
      lengthSum.reset();
      return length;
    }
  };

  function lengthPointFirst(x, y) {
    lengthStream.point = lengthPoint;
    x00$2 = x0$3 = x, y00$2 = y0$3 = y;
  }

  function lengthPoint(x, y) {
    x0$3 -= x, y0$3 -= y;
    lengthSum.add(sqrt(x0$3 * x0$3 + y0$3 * y0$3));
    x0$3 = x, y0$3 = y;
  }

  function PathString() {
    this._string = [];
  }
  PathString.prototype = {
    _radius: 4.5,
    _circle: circle(4.5),
    pointRadius: function pointRadius(_) {
      if ((_ = +_) !== this._radius) this._radius = _, this._circle = null;
      return this;
    },
    polygonStart: function polygonStart() {
      this._line = 0;
    },
    polygonEnd: function polygonEnd() {
      this._line = NaN;
    },
    lineStart: function lineStart() {
      this._point = 0;
    },
    lineEnd: function lineEnd() {
      if (this._line === 0) this._string.push("Z");
      this._point = NaN;
    },
    point: function point(x, y) {
      switch (this._point) {
        case 0:
          {
            this._string.push("M", x, ",", y);

            this._point = 1;
            break;
          }

        case 1:
          {
            this._string.push("L", x, ",", y);

            break;
          }

        default:
          {
            if (this._circle == null) this._circle = circle(this._radius);

            this._string.push("M", x, ",", y, this._circle);

            break;
          }
      }
    },
    result: function result() {
      if (this._string.length) {
        var result = this._string.join("");

        this._string = [];
        return result;
      } else {
        return null;
      }
    }
  };

  function circle(radius) {
    return "m0," + radius + "a" + radius + "," + radius + " 0 1,1 0," + -2 * radius + "a" + radius + "," + radius + " 0 1,1 0," + 2 * radius + "z";
  }

  function index (projection, context) {
    var pointRadius = 4.5,
        projectionStream,
        contextStream;

    function path(object) {
      if (object) {
        if (typeof pointRadius === "function") contextStream.pointRadius(+pointRadius.apply(this, arguments));
        geoStream(object, projectionStream(contextStream));
      }

      return contextStream.result();
    }

    path.area = function (object) {
      geoStream(object, projectionStream(areaStream));
      return areaStream.result();
    };

    path.measure = function (object) {
      geoStream(object, projectionStream(lengthStream));
      return lengthStream.result();
    };

    path.bounds = function (object) {
      geoStream(object, projectionStream(boundsStream));
      return boundsStream.result();
    };

    path.centroid = function (object) {
      geoStream(object, projectionStream(centroidStream));
      return centroidStream.result();
    };

    path.projection = function (_) {
      return arguments.length ? (projectionStream = _ == null ? (projection = null, identity$1) : (projection = _).stream, path) : projection;
    };

    path.context = function (_) {
      if (!arguments.length) return context;
      contextStream = _ == null ? (context = null, new PathString()) : new PathContext(context = _);
      if (typeof pointRadius !== "function") contextStream.pointRadius(pointRadius);
      return path;
    };

    path.pointRadius = function (_) {
      if (!arguments.length) return pointRadius;
      pointRadius = typeof _ === "function" ? _ : (contextStream.pointRadius(+_), +_);
      return path;
    };

    return path.projection(projection).context(context);
  }

  function transform (methods) {
    return {
      stream: transformer(methods)
    };
  }
  function transformer(methods) {
    return function (stream) {
      var s = new TransformStream();

      for (var key in methods) {
        s[key] = methods[key];
      }

      s.stream = stream;
      return s;
    };
  }

  function TransformStream() {}

  TransformStream.prototype = {
    constructor: TransformStream,
    point: function point(x, y) {
      this.stream.point(x, y);
    },
    sphere: function sphere() {
      this.stream.sphere();
    },
    lineStart: function lineStart() {
      this.stream.lineStart();
    },
    lineEnd: function lineEnd() {
      this.stream.lineEnd();
    },
    polygonStart: function polygonStart() {
      this.stream.polygonStart();
    },
    polygonEnd: function polygonEnd() {
      this.stream.polygonEnd();
    }
  };

  function constant$2 (x) {
    return function constant() {
      return x;
    };
  }

  var pi$2 = Math.PI;
  var tau$2 = 2 * pi$2;

  var circle$1 = {
    draw: function draw(context, size) {
      var r = Math.sqrt(size / pi$2);
      context.moveTo(r, 0);
      context.arc(0, 0, r, 0, tau$2);
    }
  };

  var sqrt3 = Math.sqrt(3);
  var triangle = {
    draw: function draw(context, size) {
      var y = -Math.sqrt(size / (sqrt3 * 3));
      context.moveTo(0, y * 2);
      context.lineTo(-sqrt3 * y, -y);
      context.lineTo(sqrt3 * y, -y);
      context.closePath();
    }
  };

  function symbol () {
    var type = constant$2(circle$1),
        size = constant$2(64),
        context = null;

    function symbol() {
      var buffer;
      if (!context) context = buffer = path();
      type.apply(this, arguments).draw(context, +size.apply(this, arguments));
      if (buffer) return context = null, buffer + "" || null;
    }

    symbol.type = function (_) {
      return arguments.length ? (type = typeof _ === "function" ? _ : constant$2(_), symbol) : type;
    };

    symbol.size = function (_) {
      return arguments.length ? (size = typeof _ === "function" ? _ : constant$2(+_), symbol) : size;
    };

    symbol.context = function (_) {
      return arguments.length ? (context = _ == null ? null : _, symbol) : context;
    };

    return symbol;
  }

  function globals (defs) {
    defs('EPSG:4326', "+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees");
    defs('EPSG:4269', "+title=NAD83 (long/lat) +proj=longlat +a=6378137.0 +b=6356752.31414036 +ellps=GRS80 +datum=NAD83 +units=degrees");
    defs('EPSG:3857', "+title=WGS 84 / Pseudo-Mercator +proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs");
    defs.WGS84 = defs['EPSG:4326'];
    defs['EPSG:3785'] = defs['EPSG:3857']; // maintain backward compat, official code is 3857

    defs.GOOGLE = defs['EPSG:3857'];
    defs['EPSG:900913'] = defs['EPSG:3857'];
    defs['EPSG:102113'] = defs['EPSG:3857'];
  }

  var PJD_3PARAM = 1;
  var PJD_7PARAM = 2;
  var PJD_WGS84 = 4; // WGS84 or equivalent

  var PJD_NODATUM = 5; // WGS84 or equivalent

  var SEC_TO_RAD = 4.84813681109535993589914102357e-6;
  var HALF_PI = Math.PI / 2; // ellipoid pj_set_ell.c

  var SIXTH = 0.1666666666666666667;
  /* 1/6 */

  var RA4 = 0.04722222222222222222;
  /* 17/360 */

  var RA6 = 0.02215608465608465608;
  var EPSLN = 1.0e-10; // you'd think you could use Number.EPSILON above but that makes
  // Mollweide get into an infinate loop.

  var D2R = 0.01745329251994329577;
  var R2D = 57.29577951308232088;
  var FORTPI = Math.PI / 4;
  var TWO_PI = Math.PI * 2; // SPI is slightly greater than Math.PI, so values that exceed the -180..180
  // degree range by a tiny amount don't get wrapped. This prevents points that
  // have drifted from their original location along the 180th meridian (due to
  // floating point error) from changing their sign.

  var SPI = 3.14159265359;

  var exports$1 = {};
  exports$1.greenwich = 0.0; //"0dE",

  exports$1.lisbon = -9.131906111111; //"9d07'54.862\"W",

  exports$1.paris = 2.337229166667; //"2d20'14.025\"E",

  exports$1.bogota = -74.080916666667; //"74d04'51.3\"W",

  exports$1.madrid = -3.687938888889; //"3d41'16.58\"W",

  exports$1.rome = 12.452333333333; //"12d27'8.4\"E",

  exports$1.bern = 7.439583333333; //"7d26'22.5\"E",

  exports$1.jakarta = 106.807719444444; //"106d48'27.79\"E",

  exports$1.ferro = -17.666666666667; //"17d40'W",

  exports$1.brussels = 4.367975; //"4d22'4.71\"E",

  exports$1.stockholm = 18.058277777778; //"18d3'29.8\"E",

  exports$1.athens = 23.7163375; //"23d42'58.815\"E",

  exports$1.oslo = 10.722916666667; //"10d43'22.5\"E"

  var _units = {
    ft: {
      to_meter: 0.3048
    },
    'us-ft': {
      to_meter: 1200 / 3937
    }
  };

  var ignoredChar = /[\s_\-\/\(\)]/g;
  function match(obj, key) {
    if (obj[key]) {
      return obj[key];
    }

    var keys = Object.keys(obj);
    var lkey = key.toLowerCase().replace(ignoredChar, '');
    var i = -1;
    var testkey, processedKey;

    while (++i < keys.length) {
      testkey = keys[i];
      processedKey = testkey.toLowerCase().replace(ignoredChar, '');

      if (processedKey === lkey) {
        return obj[testkey];
      }
    }
  }

  function projStr (defData) {
    var self = {};
    var paramObj = defData.split('+').map(function (v) {
      return v.trim();
    }).filter(function (a) {
      return a;
    }).reduce(function (p, a) {
      var split = a.split('=');
      split.push(true);
      p[split[0].toLowerCase()] = split[1];
      return p;
    }, {});
    var paramName, paramVal, paramOutname;
    var params = {
      proj: 'projName',
      datum: 'datumCode',
      rf: function rf(v) {
        self.rf = parseFloat(v);
      },
      lat_0: function lat_0(v) {
        self.lat0 = v * D2R;
      },
      lat_1: function lat_1(v) {
        self.lat1 = v * D2R;
      },
      lat_2: function lat_2(v) {
        self.lat2 = v * D2R;
      },
      lat_ts: function lat_ts(v) {
        self.lat_ts = v * D2R;
      },
      lon_0: function lon_0(v) {
        self.long0 = v * D2R;
      },
      lon_1: function lon_1(v) {
        self.long1 = v * D2R;
      },
      lon_2: function lon_2(v) {
        self.long2 = v * D2R;
      },
      alpha: function alpha(v) {
        self.alpha = parseFloat(v) * D2R;
      },
      lonc: function lonc(v) {
        self.longc = v * D2R;
      },
      x_0: function x_0(v) {
        self.x0 = parseFloat(v);
      },
      y_0: function y_0(v) {
        self.y0 = parseFloat(v);
      },
      k_0: function k_0(v) {
        self.k0 = parseFloat(v);
      },
      k: function k(v) {
        self.k0 = parseFloat(v);
      },
      a: function a(v) {
        self.a = parseFloat(v);
      },
      b: function b(v) {
        self.b = parseFloat(v);
      },
      r_a: function r_a() {
        self.R_A = true;
      },
      zone: function zone(v) {
        self.zone = parseInt(v, 10);
      },
      south: function south() {
        self.utmSouth = true;
      },
      towgs84: function towgs84(v) {
        self.datum_params = v.split(",").map(function (a) {
          return parseFloat(a);
        });
      },
      to_meter: function to_meter(v) {
        self.to_meter = parseFloat(v);
      },
      units: function units(v) {
        self.units = v;
        var unit = match(_units, v);

        if (unit) {
          self.to_meter = unit.to_meter;
        }
      },
      from_greenwich: function from_greenwich(v) {
        self.from_greenwich = v * D2R;
      },
      pm: function pm(v) {
        var pm = match(exports$1, v);
        self.from_greenwich = (pm ? pm : parseFloat(v)) * D2R;
      },
      nadgrids: function nadgrids(v) {
        if (v === '@null') {
          self.datumCode = 'none';
        } else {
          self.nadgrids = v;
        }
      },
      axis: function axis(v) {
        var legalAxis = "ewnsud";

        if (v.length === 3 && legalAxis.indexOf(v.substr(0, 1)) !== -1 && legalAxis.indexOf(v.substr(1, 1)) !== -1 && legalAxis.indexOf(v.substr(2, 1)) !== -1) {
          self.axis = v;
        }
      }
    };

    for (paramName in paramObj) {
      paramVal = paramObj[paramName];

      if (paramName in params) {
        paramOutname = params[paramName];

        if (typeof paramOutname === 'function') {
          paramOutname(paramVal);
        } else {
          self[paramOutname] = paramVal;
        }
      } else {
        self[paramName] = paramVal;
      }
    }

    if (typeof self.datumCode === 'string' && self.datumCode !== "WGS84") {
      self.datumCode = self.datumCode.toLowerCase();
    }

    return self;
  }

  var NEUTRAL = 1;
  var KEYWORD = 2;
  var NUMBER = 3;
  var QUOTED = 4;
  var AFTERQUOTE = 5;
  var ENDED$1 = -1;
  var whitespace = /\s/;
  var latin = /[A-Za-z]/;
  var keyword = /[A-Za-z84]/;
  var endThings = /[,\]]/;
  var digets = /[\d\.E\-\+]/; // const ignoredChar = /[\s_\-\/\(\)]/g;

  function Parser(text) {
    if (typeof text !== 'string') {
      throw new Error('not a string');
    }

    this.text = text.trim();
    this.level = 0;
    this.place = 0;
    this.root = null;
    this.stack = [];
    this.currentObject = null;
    this.state = NEUTRAL;
  }

  Parser.prototype.readCharicter = function () {
    var _char = this.text[this.place++];

    if (this.state !== QUOTED) {
      while (whitespace.test(_char)) {
        if (this.place >= this.text.length) {
          return;
        }

        _char = this.text[this.place++];
      }
    }

    switch (this.state) {
      case NEUTRAL:
        return this.neutral(_char);

      case KEYWORD:
        return this.keyword(_char);

      case QUOTED:
        return this.quoted(_char);

      case AFTERQUOTE:
        return this.afterquote(_char);

      case NUMBER:
        return this.number(_char);

      case ENDED$1:
        return;
    }
  };

  Parser.prototype.afterquote = function (_char2) {
    if (_char2 === '"') {
      this.word += '"';
      this.state = QUOTED;
      return;
    }

    if (endThings.test(_char2)) {
      this.word = this.word.trim();
      this.afterItem(_char2);
      return;
    }

    throw new Error('havn\'t handled "' + _char2 + '" in afterquote yet, index ' + this.place);
  };

  Parser.prototype.afterItem = function (_char3) {
    if (_char3 === ',') {
      if (this.word !== null) {
        this.currentObject.push(this.word);
      }

      this.word = null;
      this.state = NEUTRAL;
      return;
    }

    if (_char3 === ']') {
      this.level--;

      if (this.word !== null) {
        this.currentObject.push(this.word);
        this.word = null;
      }

      this.state = NEUTRAL;
      this.currentObject = this.stack.pop();

      if (!this.currentObject) {
        this.state = ENDED$1;
      }

      return;
    }
  };

  Parser.prototype.number = function (_char4) {
    if (digets.test(_char4)) {
      this.word += _char4;
      return;
    }

    if (endThings.test(_char4)) {
      this.word = parseFloat(this.word);
      this.afterItem(_char4);
      return;
    }

    throw new Error('havn\'t handled "' + _char4 + '" in number yet, index ' + this.place);
  };

  Parser.prototype.quoted = function (_char5) {
    if (_char5 === '"') {
      this.state = AFTERQUOTE;
      return;
    }

    this.word += _char5;
    return;
  };

  Parser.prototype.keyword = function (_char6) {
    if (keyword.test(_char6)) {
      this.word += _char6;
      return;
    }

    if (_char6 === '[') {
      var newObjects = [];
      newObjects.push(this.word);
      this.level++;

      if (this.root === null) {
        this.root = newObjects;
      } else {
        this.currentObject.push(newObjects);
      }

      this.stack.push(this.currentObject);
      this.currentObject = newObjects;
      this.state = NEUTRAL;
      return;
    }

    if (endThings.test(_char6)) {
      this.afterItem(_char6);
      return;
    }

    throw new Error('havn\'t handled "' + _char6 + '" in keyword yet, index ' + this.place);
  };

  Parser.prototype.neutral = function (_char7) {
    if (latin.test(_char7)) {
      this.word = _char7;
      this.state = KEYWORD;
      return;
    }

    if (_char7 === '"') {
      this.word = '';
      this.state = QUOTED;
      return;
    }

    if (digets.test(_char7)) {
      this.word = _char7;
      this.state = NUMBER;
      return;
    }

    if (endThings.test(_char7)) {
      this.afterItem(_char7);
      return;
    }

    throw new Error('havn\'t handled "' + _char7 + '" in neutral yet, index ' + this.place);
  };

  Parser.prototype.output = function () {
    while (this.place < this.text.length) {
      this.readCharicter();
    }

    if (this.state === ENDED$1) {
      return this.root;
    }

    throw new Error('unable to parse string "' + this.text + '". State is ' + this.state);
  };

  function parseString(txt) {
    var parser = new Parser(txt);
    return parser.output();
  }

  function mapit(obj, key, value) {
    if (Array.isArray(key)) {
      value.unshift(key);
      key = null;
    }

    var thing = key ? {} : obj;
    var out = value.reduce(function (newObj, item) {
      sExpr(item, newObj);
      return newObj;
    }, thing);

    if (key) {
      obj[key] = out;
    }
  }

  function sExpr(v, obj) {
    if (!Array.isArray(v)) {
      obj[v] = true;
      return;
    }

    var key = v.shift();

    if (key === 'PARAMETER') {
      key = v.shift();
    }

    if (v.length === 1) {
      if (Array.isArray(v[0])) {
        obj[key] = {};
        sExpr(v[0], obj[key]);
        return;
      }

      obj[key] = v[0];
      return;
    }

    if (!v.length) {
      obj[key] = true;
      return;
    }

    if (key === 'TOWGS84') {
      obj[key] = v;
      return;
    }

    if (key === 'AXIS') {
      if (!(key in obj)) {
        obj[key] = [];
      }

      obj[key].push(v);
      return;
    }

    if (!Array.isArray(key)) {
      obj[key] = {};
    }

    var i;

    switch (key) {
      case 'UNIT':
      case 'PRIMEM':
      case 'VERT_DATUM':
        obj[key] = {
          name: v[0].toLowerCase(),
          convert: v[1]
        };

        if (v.length === 3) {
          sExpr(v[2], obj[key]);
        }

        return;

      case 'SPHEROID':
      case 'ELLIPSOID':
        obj[key] = {
          name: v[0],
          a: v[1],
          rf: v[2]
        };

        if (v.length === 4) {
          sExpr(v[3], obj[key]);
        }

        return;

      case 'PROJECTEDCRS':
      case 'PROJCRS':
      case 'GEOGCS':
      case 'GEOCCS':
      case 'PROJCS':
      case 'LOCAL_CS':
      case 'GEODCRS':
      case 'GEODETICCRS':
      case 'GEODETICDATUM':
      case 'EDATUM':
      case 'ENGINEERINGDATUM':
      case 'VERT_CS':
      case 'VERTCRS':
      case 'VERTICALCRS':
      case 'COMPD_CS':
      case 'COMPOUNDCRS':
      case 'ENGINEERINGCRS':
      case 'ENGCRS':
      case 'FITTED_CS':
      case 'LOCAL_DATUM':
      case 'DATUM':
        v[0] = ['name', v[0]];
        mapit(obj, key, v);
        return;

      default:
        i = -1;

        while (++i < v.length) {
          if (!Array.isArray(v[i])) {
            return sExpr(v, obj[key]);
          }
        }

        return mapit(obj, key, v);
    }
  }

  var D2R$1 = 0.01745329251994329577;

  function rename(obj, params) {
    var outName = params[0];
    var inName = params[1];

    if (!(outName in obj) && inName in obj) {
      obj[outName] = obj[inName];

      if (params.length === 3) {
        obj[outName] = params[2](obj[outName]);
      }
    }
  }

  function d2r(input) {
    return input * D2R$1;
  }

  function cleanWKT(wkt) {
    if (wkt.type === 'GEOGCS') {
      wkt.projName = 'longlat';
    } else if (wkt.type === 'LOCAL_CS') {
      wkt.projName = 'identity';
      wkt.local = true;
    } else {
      if (_typeof(wkt.PROJECTION) === 'object') {
        wkt.projName = Object.keys(wkt.PROJECTION)[0];
      } else {
        wkt.projName = wkt.PROJECTION;
      }
    }

    if (wkt.AXIS) {
      var axisOrder = '';

      for (var i = 0, ii = wkt.AXIS.length; i < ii; ++i) {
        var axis = wkt.AXIS[i];
        var descriptor = axis[0].toLowerCase();

        if (descriptor.indexOf('north') !== -1) {
          axisOrder += 'n';
        } else if (descriptor.indexOf('south') !== -1) {
          axisOrder += 's';
        } else if (descriptor.indexOf('east') !== -1) {
          axisOrder += 'e';
        } else if (descriptor.indexOf('west') !== -1) {
          axisOrder += 'w';
        }
      }

      if (axisOrder.length === 2) {
        axisOrder += 'u';
      }

      if (axisOrder.length === 3) {
        wkt.axis = axisOrder;
      }
    }

    if (wkt.UNIT) {
      wkt.units = wkt.UNIT.name.toLowerCase();

      if (wkt.units === 'metre') {
        wkt.units = 'meter';
      }

      if (wkt.UNIT.convert) {
        if (wkt.type === 'GEOGCS') {
          if (wkt.DATUM && wkt.DATUM.SPHEROID) {
            wkt.to_meter = wkt.UNIT.convert * wkt.DATUM.SPHEROID.a;
          }
        } else {
          wkt.to_meter = wkt.UNIT.convert;
        }
      }
    }

    var geogcs = wkt.GEOGCS;

    if (wkt.type === 'GEOGCS') {
      geogcs = wkt;
    }

    if (geogcs) {
      //if(wkt.GEOGCS.PRIMEM&&wkt.GEOGCS.PRIMEM.convert){
      //  wkt.from_greenwich=wkt.GEOGCS.PRIMEM.convert*D2R;
      //}
      if (geogcs.DATUM) {
        wkt.datumCode = geogcs.DATUM.name.toLowerCase();
      } else {
        wkt.datumCode = geogcs.name.toLowerCase();
      }

      if (wkt.datumCode.slice(0, 2) === 'd_') {
        wkt.datumCode = wkt.datumCode.slice(2);
      }

      if (wkt.datumCode === 'new_zealand_geodetic_datum_1949' || wkt.datumCode === 'new_zealand_1949') {
        wkt.datumCode = 'nzgd49';
      }

      if (wkt.datumCode === 'wgs_1984' || wkt.datumCode === 'world_geodetic_system_1984') {
        if (wkt.PROJECTION === 'Mercator_Auxiliary_Sphere') {
          wkt.sphere = true;
        }

        wkt.datumCode = 'wgs84';
      }

      if (wkt.datumCode.slice(-6) === '_ferro') {
        wkt.datumCode = wkt.datumCode.slice(0, -6);
      }

      if (wkt.datumCode.slice(-8) === '_jakarta') {
        wkt.datumCode = wkt.datumCode.slice(0, -8);
      }

      if (~wkt.datumCode.indexOf('belge')) {
        wkt.datumCode = 'rnb72';
      }

      if (geogcs.DATUM && geogcs.DATUM.SPHEROID) {
        wkt.ellps = geogcs.DATUM.SPHEROID.name.replace('_19', '').replace(/[Cc]larke\_18/, 'clrk');

        if (wkt.ellps.toLowerCase().slice(0, 13) === 'international') {
          wkt.ellps = 'intl';
        }

        wkt.a = geogcs.DATUM.SPHEROID.a;
        wkt.rf = parseFloat(geogcs.DATUM.SPHEROID.rf, 10);
      }

      if (geogcs.DATUM && geogcs.DATUM.TOWGS84) {
        wkt.datum_params = geogcs.DATUM.TOWGS84;
      }

      if (~wkt.datumCode.indexOf('osgb_1936')) {
        wkt.datumCode = 'osgb36';
      }

      if (~wkt.datumCode.indexOf('osni_1952')) {
        wkt.datumCode = 'osni52';
      }

      if (~wkt.datumCode.indexOf('tm65') || ~wkt.datumCode.indexOf('geodetic_datum_of_1965')) {
        wkt.datumCode = 'ire65';
      }

      if (wkt.datumCode === 'ch1903+') {
        wkt.datumCode = 'ch1903';
      }

      if (~wkt.datumCode.indexOf('israel')) {
        wkt.datumCode = 'isr93';
      }
    }

    if (wkt.b && !isFinite(wkt.b)) {
      wkt.b = wkt.a;
    }

    function toMeter(input) {
      var ratio = wkt.to_meter || 1;
      return input * ratio;
    }

    var renamer = function renamer(a) {
      return rename(wkt, a);
    };

    var list = [['standard_parallel_1', 'Standard_Parallel_1'], ['standard_parallel_2', 'Standard_Parallel_2'], ['false_easting', 'False_Easting'], ['false_northing', 'False_Northing'], ['central_meridian', 'Central_Meridian'], ['latitude_of_origin', 'Latitude_Of_Origin'], ['latitude_of_origin', 'Central_Parallel'], ['scale_factor', 'Scale_Factor'], ['k0', 'scale_factor'], ['latitude_of_center', 'Latitude_Of_Center'], ['latitude_of_center', 'Latitude_of_center'], ['lat0', 'latitude_of_center', d2r], ['longitude_of_center', 'Longitude_Of_Center'], ['longitude_of_center', 'Longitude_of_center'], ['longc', 'longitude_of_center', d2r], ['x0', 'false_easting', toMeter], ['y0', 'false_northing', toMeter], ['long0', 'central_meridian', d2r], ['lat0', 'latitude_of_origin', d2r], ['lat0', 'standard_parallel_1', d2r], ['lat1', 'standard_parallel_1', d2r], ['lat2', 'standard_parallel_2', d2r], ['azimuth', 'Azimuth'], ['alpha', 'azimuth', d2r], ['srsCode', 'name']];
    list.forEach(renamer);

    if (!wkt.long0 && wkt.longc && (wkt.projName === 'Albers_Conic_Equal_Area' || wkt.projName === 'Lambert_Azimuthal_Equal_Area')) {
      wkt.long0 = wkt.longc;
    }

    if (!wkt.lat_ts && wkt.lat1 && (wkt.projName === 'Stereographic_South_Pole' || wkt.projName === 'Polar Stereographic (variant B)')) {
      wkt.lat0 = d2r(wkt.lat1 > 0 ? 90 : -90);
      wkt.lat_ts = wkt.lat1;
    }
  }

  function wkt (wkt) {
    var lisp = parseString(wkt);
    var type = lisp.shift();
    var name = lisp.shift();
    lisp.unshift(['name', name]);
    lisp.unshift(['type', type]);
    var obj = {};
    sExpr(lisp, obj);
    cleanWKT(obj);
    return obj;
  }

  function defs(name) {
    /*global console*/
    var that = this;

    if (arguments.length === 2) {
      var def = arguments[1];

      if (typeof def === 'string') {
        if (def.charAt(0) === '+') {
          defs[name] = projStr(arguments[1]);
        } else {
          defs[name] = wkt(arguments[1]);
        }
      } else {
        defs[name] = def;
      }
    } else if (arguments.length === 1) {
      if (Array.isArray(name)) {
        return name.map(function (v) {
          if (Array.isArray(v)) {
            defs.apply(that, v);
          } else {
            defs(v);
          }
        });
      } else if (typeof name === 'string') {
        if (name in defs) {
          return defs[name];
        }
      } else if ('EPSG' in name) {
        defs['EPSG:' + name.EPSG] = name;
      } else if ('ESRI' in name) {
        defs['ESRI:' + name.ESRI] = name;
      } else if ('IAU2000' in name) {
        defs['IAU2000:' + name.IAU2000] = name;
      } else {
        console.log(name);
      }

      return;
    }
  }

  globals(defs);

  function testObj(code) {
    return typeof code === 'string';
  }

  function testDef(code) {
    return code in defs;
  }

  var codeWords = ['PROJECTEDCRS', 'PROJCRS', 'GEOGCS', 'GEOCCS', 'PROJCS', 'LOCAL_CS', 'GEODCRS', 'GEODETICCRS', 'GEODETICDATUM', 'ENGCRS', 'ENGINEERINGCRS'];

  function testWKT(code) {
    return codeWords.some(function (word) {
      return code.indexOf(word) > -1;
    });
  }

  var codes = ['3857', '900913', '3785', '102113'];

  function checkMercator(item) {
    var auth = match(item, 'authority');

    if (!auth) {
      return;
    }

    var code = match(auth, 'epsg');
    return code && codes.indexOf(code) > -1;
  }

  function checkProjStr(item) {
    var ext = match(item, 'extension');

    if (!ext) {
      return;
    }

    return match(ext, 'proj4');
  }

  function testProj(code) {
    return code[0] === '+';
  }

  function parse(code) {
    if (testObj(code)) {
      //check to see if this is a WKT string
      if (testDef(code)) {
        return defs[code];
      }

      if (testWKT(code)) {
        var out = wkt(code); // test of spetial case, due to this being a very common and often malformed

        if (checkMercator(out)) {
          return defs['EPSG:3857'];
        }

        var maybeProjStr = checkProjStr(out);

        if (maybeProjStr) {
          return projStr(maybeProjStr);
        }

        return out;
      }

      if (testProj(code)) {
        return projStr(code);
      }
    } else {
      return code;
    }
  }

  function extend$1 (destination, source) {
    destination = destination || {};
    var value, property;

    if (!source) {
      return destination;
    }

    for (property in source) {
      value = source[property];

      if (value !== undefined) {
        destination[property] = value;
      }
    }

    return destination;
  }

  function msfnz (eccent, sinphi, cosphi) {
    var con = eccent * sinphi;
    return cosphi / Math.sqrt(1 - con * con);
  }

  function sign (x) {
    return x < 0 ? -1 : 1;
  }

  function adjust_lon (x) {
    return Math.abs(x) <= SPI ? x : x - sign(x) * TWO_PI;
  }

  function tsfnz (eccent, phi, sinphi) {
    var con = eccent * sinphi;
    var com = 0.5 * eccent;
    con = Math.pow((1 - con) / (1 + con), com);
    return Math.tan(0.5 * (HALF_PI - phi)) / con;
  }

  function phi2z (eccent, ts) {
    var eccnth = 0.5 * eccent;
    var con, dphi;
    var phi = HALF_PI - 2 * Math.atan(ts);

    for (var i = 0; i <= 15; i++) {
      con = eccent * Math.sin(phi);
      dphi = HALF_PI - 2 * Math.atan(ts * Math.pow((1 - con) / (1 + con), eccnth)) - phi;
      phi += dphi;

      if (Math.abs(dphi) <= 0.0000000001) {
        return phi;
      }
    } //console.log("phi2z has NoConvergence");


    return -9999;
  }

  function init$1() {
    var con = this.b / this.a;
    this.es = 1 - con * con;

    if (!('x0' in this)) {
      this.x0 = 0;
    }

    if (!('y0' in this)) {
      this.y0 = 0;
    }

    this.e = Math.sqrt(this.es);

    if (this.lat_ts) {
      if (this.sphere) {
        this.k0 = Math.cos(this.lat_ts);
      } else {
        this.k0 = msfnz(this.e, Math.sin(this.lat_ts), Math.cos(this.lat_ts));
      }
    } else {
      if (!this.k0) {
        if (this.k) {
          this.k0 = this.k;
        } else {
          this.k0 = 1;
        }
      }
    }
  }
  /* Mercator forward equations--mapping lat,long to x,y
    --------------------------------------------------*/

  function forward(p) {
    var lon = p.x;
    var lat = p.y; // convert to radians

    if (lat * R2D > 90 && lat * R2D < -90 && lon * R2D > 180 && lon * R2D < -180) {
      return null;
    }

    var x, y;

    if (Math.abs(Math.abs(lat) - HALF_PI) <= EPSLN) {
      return null;
    } else {
      if (this.sphere) {
        x = this.x0 + this.a * this.k0 * adjust_lon(lon - this.long0);
        y = this.y0 + this.a * this.k0 * Math.log(Math.tan(FORTPI + 0.5 * lat));
      } else {
        var sinphi = Math.sin(lat);
        var ts = tsfnz(this.e, lat, sinphi);
        x = this.x0 + this.a * this.k0 * adjust_lon(lon - this.long0);
        y = this.y0 - this.a * this.k0 * Math.log(ts);
      }

      p.x = x;
      p.y = y;
      return p;
    }
  }
  /* Mercator inverse equations--mapping x,y to lat/long
    --------------------------------------------------*/

  function inverse(p) {
    var x = p.x - this.x0;
    var y = p.y - this.y0;
    var lon, lat;

    if (this.sphere) {
      lat = HALF_PI - 2 * Math.atan(Math.exp(-y / (this.a * this.k0)));
    } else {
      var ts = Math.exp(-y / (this.a * this.k0));
      lat = phi2z(this.e, ts);

      if (lat === -9999) {
        return null;
      }
    }

    lon = adjust_lon(this.long0 + x / (this.a * this.k0));
    p.x = lon;
    p.y = lat;
    return p;
  }
  var names = ["Mercator", "Popular Visualisation Pseudo Mercator", "Mercator_1SP", "Mercator_Auxiliary_Sphere", "merc"];
  var merc = {
    init: init$1,
    forward: forward,
    inverse: inverse,
    names: names
  };

  function init$2() {//no-op for longlat
  }

  function identity$2(pt) {
    return pt;
  }
  var names$1 = ["longlat", "identity"];
  var longlat = {
    init: init$2,
    forward: identity$2,
    inverse: identity$2,
    names: names$1
  };

  var projs = [merc, longlat];
  var names$2 = {};
  var projStore = [];

  function add(proj, i) {
    var len = projStore.length;

    if (!proj.names) {
      console.log(i);
      return true;
    }

    projStore[len] = proj;
    proj.names.forEach(function (n) {
      names$2[n.toLowerCase()] = len;
    });
    return this;
  }
  function get$2(name) {
    if (!name) {
      return false;
    }

    var n = name.toLowerCase();

    if (typeof names$2[n] !== 'undefined' && projStore[names$2[n]]) {
      return projStore[names$2[n]];
    }
  }
  function start$1() {
    projs.forEach(add);
  }
  var projections = {
    start: start$1,
    add: add,
    get: get$2
  };

  var exports$2 = {};
  exports$2.MERIT = {
    a: 6378137.0,
    rf: 298.257,
    ellipseName: "MERIT 1983"
  };
  exports$2.SGS85 = {
    a: 6378136.0,
    rf: 298.257,
    ellipseName: "Soviet Geodetic System 85"
  };
  exports$2.GRS80 = {
    a: 6378137.0,
    rf: 298.257222101,
    ellipseName: "GRS 1980(IUGG, 1980)"
  };
  exports$2.IAU76 = {
    a: 6378140.0,
    rf: 298.257,
    ellipseName: "IAU 1976"
  };
  exports$2.airy = {
    a: 6377563.396,
    b: 6356256.910,
    ellipseName: "Airy 1830"
  };
  exports$2.APL4 = {
    a: 6378137,
    rf: 298.25,
    ellipseName: "Appl. Physics. 1965"
  };
  exports$2.NWL9D = {
    a: 6378145.0,
    rf: 298.25,
    ellipseName: "Naval Weapons Lab., 1965"
  };
  exports$2.mod_airy = {
    a: 6377340.189,
    b: 6356034.446,
    ellipseName: "Modified Airy"
  };
  exports$2.andrae = {
    a: 6377104.43,
    rf: 300.0,
    ellipseName: "Andrae 1876 (Den., Iclnd.)"
  };
  exports$2.aust_SA = {
    a: 6378160.0,
    rf: 298.25,
    ellipseName: "Australian Natl & S. Amer. 1969"
  };
  exports$2.GRS67 = {
    a: 6378160.0,
    rf: 298.2471674270,
    ellipseName: "GRS 67(IUGG 1967)"
  };
  exports$2.bessel = {
    a: 6377397.155,
    rf: 299.1528128,
    ellipseName: "Bessel 1841"
  };
  exports$2.bess_nam = {
    a: 6377483.865,
    rf: 299.1528128,
    ellipseName: "Bessel 1841 (Namibia)"
  };
  exports$2.clrk66 = {
    a: 6378206.4,
    b: 6356583.8,
    ellipseName: "Clarke 1866"
  };
  exports$2.clrk80 = {
    a: 6378249.145,
    rf: 293.4663,
    ellipseName: "Clarke 1880 mod."
  };
  exports$2.clrk58 = {
    a: 6378293.645208759,
    rf: 294.2606763692654,
    ellipseName: "Clarke 1858"
  };
  exports$2.CPM = {
    a: 6375738.7,
    rf: 334.29,
    ellipseName: "Comm. des Poids et Mesures 1799"
  };
  exports$2.delmbr = {
    a: 6376428.0,
    rf: 311.5,
    ellipseName: "Delambre 1810 (Belgium)"
  };
  exports$2.engelis = {
    a: 6378136.05,
    rf: 298.2566,
    ellipseName: "Engelis 1985"
  };
  exports$2.evrst30 = {
    a: 6377276.345,
    rf: 300.8017,
    ellipseName: "Everest 1830"
  };
  exports$2.evrst48 = {
    a: 6377304.063,
    rf: 300.8017,
    ellipseName: "Everest 1948"
  };
  exports$2.evrst56 = {
    a: 6377301.243,
    rf: 300.8017,
    ellipseName: "Everest 1956"
  };
  exports$2.evrst69 = {
    a: 6377295.664,
    rf: 300.8017,
    ellipseName: "Everest 1969"
  };
  exports$2.evrstSS = {
    a: 6377298.556,
    rf: 300.8017,
    ellipseName: "Everest (Sabah & Sarawak)"
  };
  exports$2.fschr60 = {
    a: 6378166.0,
    rf: 298.3,
    ellipseName: "Fischer (Mercury Datum) 1960"
  };
  exports$2.fschr60m = {
    a: 6378155.0,
    rf: 298.3,
    ellipseName: "Fischer 1960"
  };
  exports$2.fschr68 = {
    a: 6378150.0,
    rf: 298.3,
    ellipseName: "Fischer 1968"
  };
  exports$2.helmert = {
    a: 6378200.0,
    rf: 298.3,
    ellipseName: "Helmert 1906"
  };
  exports$2.hough = {
    a: 6378270.0,
    rf: 297.0,
    ellipseName: "Hough"
  };
  exports$2.intl = {
    a: 6378388.0,
    rf: 297.0,
    ellipseName: "International 1909 (Hayford)"
  };
  exports$2.kaula = {
    a: 6378163.0,
    rf: 298.24,
    ellipseName: "Kaula 1961"
  };
  exports$2.lerch = {
    a: 6378139.0,
    rf: 298.257,
    ellipseName: "Lerch 1979"
  };
  exports$2.mprts = {
    a: 6397300.0,
    rf: 191.0,
    ellipseName: "Maupertius 1738"
  };
  exports$2.new_intl = {
    a: 6378157.5,
    b: 6356772.2,
    ellipseName: "New International 1967"
  };
  exports$2.plessis = {
    a: 6376523.0,
    rf: 6355863.0,
    ellipseName: "Plessis 1817 (France)"
  };
  exports$2.krass = {
    a: 6378245.0,
    rf: 298.3,
    ellipseName: "Krassovsky, 1942"
  };
  exports$2.SEasia = {
    a: 6378155.0,
    b: 6356773.3205,
    ellipseName: "Southeast Asia"
  };
  exports$2.walbeck = {
    a: 6376896.0,
    b: 6355834.8467,
    ellipseName: "Walbeck"
  };
  exports$2.WGS60 = {
    a: 6378165.0,
    rf: 298.3,
    ellipseName: "WGS 60"
  };
  exports$2.WGS66 = {
    a: 6378145.0,
    rf: 298.25,
    ellipseName: "WGS 66"
  };
  exports$2.WGS7 = {
    a: 6378135.0,
    rf: 298.26,
    ellipseName: "WGS 72"
  };
  var WGS84 = exports$2.WGS84 = {
    a: 6378137.0,
    rf: 298.257223563,
    ellipseName: "WGS 84"
  };
  exports$2.sphere = {
    a: 6370997.0,
    b: 6370997.0,
    ellipseName: "Normal Sphere (r=6370997)"
  };

  function eccentricity(a, b, rf, R_A) {
    var a2 = a * a; // used in geocentric

    var b2 = b * b; // used in geocentric

    var es = (a2 - b2) / a2; // e ^ 2

    var e = 0;

    if (R_A) {
      a *= 1 - es * (SIXTH + es * (RA4 + es * RA6));
      a2 = a * a;
      es = 0;
    } else {
      e = Math.sqrt(es); // eccentricity
    }

    var ep2 = (a2 - b2) / b2; // used in geocentric

    return {
      es: es,
      e: e,
      ep2: ep2
    };
  }
  function sphere(a, b, rf, ellps, sphere) {
    if (!a) {
      // do we have an ellipsoid?
      var ellipse = match(exports$2, ellps);

      if (!ellipse) {
        ellipse = WGS84;
      }

      a = ellipse.a;
      b = ellipse.b;
      rf = ellipse.rf;
    }

    if (rf && !b) {
      b = (1.0 - 1.0 / rf) * a;
    }

    if (rf === 0 || Math.abs(a - b) < EPSLN) {
      sphere = true;
      b = a;
    }

    return {
      a: a,
      b: b,
      rf: rf,
      sphere: sphere
    };
  }

  var exports$3 = {};
  exports$3.wgs84 = {
    towgs84: "0,0,0",
    ellipse: "WGS84",
    datumName: "WGS84"
  };
  exports$3.ch1903 = {
    towgs84: "674.374,15.056,405.346",
    ellipse: "bessel",
    datumName: "swiss"
  };
  exports$3.ggrs87 = {
    towgs84: "-199.87,74.79,246.62",
    ellipse: "GRS80",
    datumName: "Greek_Geodetic_Reference_System_1987"
  };
  exports$3.nad83 = {
    towgs84: "0,0,0",
    ellipse: "GRS80",
    datumName: "North_American_Datum_1983"
  };
  exports$3.nad27 = {
    nadgrids: "@conus,@alaska,@ntv2_0.gsb,@ntv1_can.dat",
    ellipse: "clrk66",
    datumName: "North_American_Datum_1927"
  };
  exports$3.potsdam = {
    towgs84: "606.0,23.0,413.0",
    ellipse: "bessel",
    datumName: "Potsdam Rauenberg 1950 DHDN"
  };
  exports$3.carthage = {
    towgs84: "-263.0,6.0,431.0",
    ellipse: "clark80",
    datumName: "Carthage 1934 Tunisia"
  };
  exports$3.hermannskogel = {
    towgs84: "653.0,-212.0,449.0",
    ellipse: "bessel",
    datumName: "Hermannskogel"
  };
  exports$3.osni52 = {
    towgs84: "482.530,-130.596,564.557,-1.042,-0.214,-0.631,8.15",
    ellipse: "airy",
    datumName: "Irish National"
  };
  exports$3.ire65 = {
    towgs84: "482.530,-130.596,564.557,-1.042,-0.214,-0.631,8.15",
    ellipse: "mod_airy",
    datumName: "Ireland 1965"
  };
  exports$3.rassadiran = {
    towgs84: "-133.63,-157.5,-158.62",
    ellipse: "intl",
    datumName: "Rassadiran"
  };
  exports$3.nzgd49 = {
    towgs84: "59.47,-5.04,187.44,0.47,-0.1,1.024,-4.5993",
    ellipse: "intl",
    datumName: "New Zealand Geodetic Datum 1949"
  };
  exports$3.osgb36 = {
    towgs84: "446.448,-125.157,542.060,0.1502,0.2470,0.8421,-20.4894",
    ellipse: "airy",
    datumName: "Airy 1830"
  };
  exports$3.s_jtsk = {
    towgs84: "589,76,480",
    ellipse: 'bessel',
    datumName: 'S-JTSK (Ferro)'
  };
  exports$3.beduaram = {
    towgs84: '-106,-87,188',
    ellipse: 'clrk80',
    datumName: 'Beduaram'
  };
  exports$3.gunung_segara = {
    towgs84: '-403,684,41',
    ellipse: 'bessel',
    datumName: 'Gunung Segara Jakarta'
  };
  exports$3.rnb72 = {
    towgs84: "106.869,-52.2978,103.724,-0.33657,0.456955,-1.84218,1",
    ellipse: "intl",
    datumName: "Reseau National Belge 1972"
  };

  function datum(datumCode, datum_params, a, b, es, ep2) {
    var out = {};

    if (datumCode === undefined || datumCode === 'none') {
      out.datum_type = PJD_NODATUM;
    } else {
      out.datum_type = PJD_WGS84;
    }

    if (datum_params) {
      out.datum_params = datum_params.map(parseFloat);

      if (out.datum_params[0] !== 0 || out.datum_params[1] !== 0 || out.datum_params[2] !== 0) {
        out.datum_type = PJD_3PARAM;
      }

      if (out.datum_params.length > 3) {
        if (out.datum_params[3] !== 0 || out.datum_params[4] !== 0 || out.datum_params[5] !== 0 || out.datum_params[6] !== 0) {
          out.datum_type = PJD_7PARAM;
          out.datum_params[3] *= SEC_TO_RAD;
          out.datum_params[4] *= SEC_TO_RAD;
          out.datum_params[5] *= SEC_TO_RAD;
          out.datum_params[6] = out.datum_params[6] / 1000000.0 + 1.0;
        }
      }
    }

    out.a = a; //datum object also uses these values

    out.b = b;
    out.es = es;
    out.ep2 = ep2;
    return out;
  }

  function Projection(srsCode, callback) {
    if (!(this instanceof Projection)) {
      return new Projection(srsCode);
    }

    callback = callback || function (error) {
      if (error) {
        throw error;
      }
    };

    var json = parse(srsCode);

    if (_typeof(json) !== 'object') {
      callback(srsCode);
      return;
    }

    var ourProj = Projection.projections.get(json.projName);

    if (!ourProj) {
      callback(srsCode);
      return;
    }

    if (json.datumCode && json.datumCode !== 'none') {
      var datumDef = match(exports$3, json.datumCode);

      if (datumDef) {
        json.datum_params = datumDef.towgs84 ? datumDef.towgs84.split(',') : null;
        json.ellps = datumDef.ellipse;
        json.datumName = datumDef.datumName ? datumDef.datumName : json.datumCode;
      }
    }

    json.k0 = json.k0 || 1.0;
    json.axis = json.axis || 'enu';
    json.ellps = json.ellps || 'wgs84';
    var sphere_ = sphere(json.a, json.b, json.rf, json.ellps, json.sphere);
    var ecc = eccentricity(sphere_.a, sphere_.b, sphere_.rf, json.R_A);
    var datumObj = json.datum || datum(json.datumCode, json.datum_params, sphere_.a, sphere_.b, ecc.es, ecc.ep2);
    extend$1(this, json); // transfer everything over from the projection because we don't know what we'll need

    extend$1(this, ourProj); // transfer all the methods from the projection
    // copy the 4 things over we calulated in deriveConstants.sphere

    this.a = sphere_.a;
    this.b = sphere_.b;
    this.rf = sphere_.rf;
    this.sphere = sphere_.sphere; // copy the 3 things we calculated in deriveConstants.eccentricity

    this.es = ecc.es;
    this.e = ecc.e;
    this.ep2 = ecc.ep2; // add in the datum object

    this.datum = datumObj; // init the projection

    this.init(); // legecy callback from back in the day when it went to spatialreference.org

    callback(null, this);
  }

  Projection.projections = projections;
  Projection.projections.start();

  function compareDatums(source, dest) {
    if (source.datum_type !== dest.datum_type) {
      return false; // false, datums are not equal
    } else if (source.a !== dest.a || Math.abs(source.es - dest.es) > 0.000000000050) {
      // the tolerance for es is to ensure that GRS80 and WGS84
      // are considered identical
      return false;
    } else if (source.datum_type === PJD_3PARAM) {
      return source.datum_params[0] === dest.datum_params[0] && source.datum_params[1] === dest.datum_params[1] && source.datum_params[2] === dest.datum_params[2];
    } else if (source.datum_type === PJD_7PARAM) {
      return source.datum_params[0] === dest.datum_params[0] && source.datum_params[1] === dest.datum_params[1] && source.datum_params[2] === dest.datum_params[2] && source.datum_params[3] === dest.datum_params[3] && source.datum_params[4] === dest.datum_params[4] && source.datum_params[5] === dest.datum_params[5] && source.datum_params[6] === dest.datum_params[6];
    } else {
      return true; // datums are equal
    }
  } // cs_compare_datums()

  /*
   * The function Convert_Geodetic_To_Geocentric converts geodetic coordinates
   * (latitude, longitude, and height) to geocentric coordinates (X, Y, Z),
   * according to the current ellipsoid parameters.
   *
   *    Latitude  : Geodetic latitude in radians                     (input)
   *    Longitude : Geodetic longitude in radians                    (input)
   *    Height    : Geodetic height, in meters                       (input)
   *    X         : Calculated Geocentric X coordinate, in meters    (output)
   *    Y         : Calculated Geocentric Y coordinate, in meters    (output)
   *    Z         : Calculated Geocentric Z coordinate, in meters    (output)
   *
   */

  function geodeticToGeocentric(p, es, a) {
    var Longitude = p.x;
    var Latitude = p.y;
    var Height = p.z ? p.z : 0; //Z value not always supplied

    var Rn;
    /*  Earth radius at location  */

    var Sin_Lat;
    /*  Math.sin(Latitude)  */

    var Sin2_Lat;
    /*  Square of Math.sin(Latitude)  */

    var Cos_Lat;
    /*  Math.cos(Latitude)  */

    /*
     ** Don't blow up if Latitude is just a little out of the value
     ** range as it may just be a rounding issue.  Also removed longitude
     ** test, it should be wrapped by Math.cos() and Math.sin().  NFW for PROJ.4, Sep/2001.
     */

    if (Latitude < -HALF_PI && Latitude > -1.001 * HALF_PI) {
      Latitude = -HALF_PI;
    } else if (Latitude > HALF_PI && Latitude < 1.001 * HALF_PI) {
      Latitude = HALF_PI;
    } else if (Latitude < -HALF_PI) {
      /* Latitude out of range */
      //..reportError('geocent:lat out of range:' + Latitude);
      return {
        x: -Infinity,
        y: -Infinity,
        z: p.z
      };
    } else if (Latitude > HALF_PI) {
      /* Latitude out of range */
      return {
        x: Infinity,
        y: Infinity,
        z: p.z
      };
    }

    if (Longitude > Math.PI) {
      Longitude -= 2 * Math.PI;
    }

    Sin_Lat = Math.sin(Latitude);
    Cos_Lat = Math.cos(Latitude);
    Sin2_Lat = Sin_Lat * Sin_Lat;
    Rn = a / Math.sqrt(1.0e0 - es * Sin2_Lat);
    return {
      x: (Rn + Height) * Cos_Lat * Math.cos(Longitude),
      y: (Rn + Height) * Cos_Lat * Math.sin(Longitude),
      z: (Rn * (1 - es) + Height) * Sin_Lat
    };
  } // cs_geodetic_to_geocentric()

  function geocentricToGeodetic(p, es, a, b) {
    /* local defintions and variables */

    /* end-criterium of loop, accuracy of sin(Latitude) */
    var genau = 1e-12;
    var genau2 = genau * genau;
    var maxiter = 30;
    var P;
    /* distance between semi-minor axis and location */

    var RR;
    /* distance between center and location */

    var CT;
    /* sin of geocentric latitude */

    var ST;
    /* cos of geocentric latitude */

    var RX;
    var RK;
    var RN;
    /* Earth radius at location */

    var CPHI0;
    /* cos of start or old geodetic latitude in iterations */

    var SPHI0;
    /* sin of start or old geodetic latitude in iterations */

    var CPHI;
    /* cos of searched geodetic latitude */

    var SPHI;
    /* sin of searched geodetic latitude */

    var SDPHI;
    /* end-criterium: addition-theorem of sin(Latitude(iter)-Latitude(iter-1)) */

    var iter;
    /* # of continous iteration, max. 30 is always enough (s.a.) */

    var X = p.x;
    var Y = p.y;
    var Z = p.z ? p.z : 0.0; //Z value not always supplied

    var Longitude;
    var Latitude;
    var Height;
    P = Math.sqrt(X * X + Y * Y);
    RR = Math.sqrt(X * X + Y * Y + Z * Z);
    /*      special cases for latitude and longitude */

    if (P / a < genau) {
      /*  special case, if P=0. (X=0., Y=0.) */
      Longitude = 0.0;
      /*  if (X,Y,Z)=(0.,0.,0.) then Height becomes semi-minor axis
       *  of ellipsoid (=center of mass), Latitude becomes PI/2 */

      if (RR / a < genau) {
        Latitude = HALF_PI;
        Height = -b;
        return {
          x: p.x,
          y: p.y,
          z: p.z
        };
      }
    } else {
      /*  ellipsoidal (geodetic) longitude
       *  interval: -PI < Longitude <= +PI */
      Longitude = Math.atan2(Y, X);
    }
    /* --------------------------------------------------------------
     * Following iterative algorithm was developped by
     * "Institut for Erdmessung", University of Hannover, July 1988.
     * Internet: www.ife.uni-hannover.de
     * Iterative computation of CPHI,SPHI and Height.
     * Iteration of CPHI and SPHI to 10**-12 radian resp.
     * 2*10**-7 arcsec.
     * --------------------------------------------------------------
     */


    CT = Z / RR;
    ST = P / RR;
    RX = 1.0 / Math.sqrt(1.0 - es * (2.0 - es) * ST * ST);
    CPHI0 = ST * (1.0 - es) * RX;
    SPHI0 = CT * RX;
    iter = 0;
    /* loop to find sin(Latitude) resp. Latitude
     * until |sin(Latitude(iter)-Latitude(iter-1))| < genau */

    do {
      iter++;
      RN = a / Math.sqrt(1.0 - es * SPHI0 * SPHI0);
      /*  ellipsoidal (geodetic) height */

      Height = P * CPHI0 + Z * SPHI0 - RN * (1.0 - es * SPHI0 * SPHI0);
      RK = es * RN / (RN + Height);
      RX = 1.0 / Math.sqrt(1.0 - RK * (2.0 - RK) * ST * ST);
      CPHI = ST * (1.0 - RK) * RX;
      SPHI = CT * RX;
      SDPHI = SPHI * CPHI0 - CPHI * SPHI0;
      CPHI0 = CPHI;
      SPHI0 = SPHI;
    } while (SDPHI * SDPHI > genau2 && iter < maxiter);
    /*      ellipsoidal (geodetic) latitude */


    Latitude = Math.atan(SPHI / Math.abs(CPHI));
    return {
      x: Longitude,
      y: Latitude,
      z: Height
    };
  } // cs_geocentric_to_geodetic()

  /****************************************************************/
  // pj_geocentic_to_wgs84( p )
  //  p = point to transform in geocentric coordinates (x,y,z)

  /** point object, nothing fancy, just allows values to be
      passed back and forth by reference rather than by value.
      Other point classes may be used as long as they have
      x and y properties, which will get modified in the transform method.
  */

  function geocentricToWgs84(p, datum_type, datum_params) {
    if (datum_type === PJD_3PARAM) {
      // if( x[io] === HUGE_VAL )
      //    continue;
      return {
        x: p.x + datum_params[0],
        y: p.y + datum_params[1],
        z: p.z + datum_params[2]
      };
    } else if (datum_type === PJD_7PARAM) {
      var Dx_BF = datum_params[0];
      var Dy_BF = datum_params[1];
      var Dz_BF = datum_params[2];
      var Rx_BF = datum_params[3];
      var Ry_BF = datum_params[4];
      var Rz_BF = datum_params[5];
      var M_BF = datum_params[6]; // if( x[io] === HUGE_VAL )
      //    continue;

      return {
        x: M_BF * (p.x - Rz_BF * p.y + Ry_BF * p.z) + Dx_BF,
        y: M_BF * (Rz_BF * p.x + p.y - Rx_BF * p.z) + Dy_BF,
        z: M_BF * (-Ry_BF * p.x + Rx_BF * p.y + p.z) + Dz_BF
      };
    }
  } // cs_geocentric_to_wgs84

  /****************************************************************/
  // pj_geocentic_from_wgs84()
  //  coordinate system definition,
  //  point to transform in geocentric coordinates (x,y,z)

  function geocentricFromWgs84(p, datum_type, datum_params) {
    if (datum_type === PJD_3PARAM) {
      //if( x[io] === HUGE_VAL )
      //    continue;
      return {
        x: p.x - datum_params[0],
        y: p.y - datum_params[1],
        z: p.z - datum_params[2]
      };
    } else if (datum_type === PJD_7PARAM) {
      var Dx_BF = datum_params[0];
      var Dy_BF = datum_params[1];
      var Dz_BF = datum_params[2];
      var Rx_BF = datum_params[3];
      var Ry_BF = datum_params[4];
      var Rz_BF = datum_params[5];
      var M_BF = datum_params[6];
      var x_tmp = (p.x - Dx_BF) / M_BF;
      var y_tmp = (p.y - Dy_BF) / M_BF;
      var z_tmp = (p.z - Dz_BF) / M_BF; //if( x[io] === HUGE_VAL )
      //    continue;

      return {
        x: x_tmp + Rz_BF * y_tmp - Ry_BF * z_tmp,
        y: -Rz_BF * x_tmp + y_tmp + Rx_BF * z_tmp,
        z: Ry_BF * x_tmp - Rx_BF * y_tmp + z_tmp
      };
    } //cs_geocentric_from_wgs84()

  }

  function checkParams(type) {
    return type === PJD_3PARAM || type === PJD_7PARAM;
  }

  function datum_transform (source, dest, point) {
    // Short cut if the datums are identical.
    if (compareDatums(source, dest)) {
      return point; // in this case, zero is sucess,
      // whereas cs_compare_datums returns 1 to indicate TRUE
      // confusing, should fix this
    } // Explicitly skip datum transform by setting 'datum=none' as parameter for either source or dest


    if (source.datum_type === PJD_NODATUM || dest.datum_type === PJD_NODATUM) {
      return point;
    } // If this datum requires grid shifts, then apply it to geodetic coordinates.
    // Do we need to go through geocentric coordinates?


    if (source.es === dest.es && source.a === dest.a && !checkParams(source.datum_type) && !checkParams(dest.datum_type)) {
      return point;
    } // Convert to geocentric coordinates.


    point = geodeticToGeocentric(point, source.es, source.a); // Convert between datums

    if (checkParams(source.datum_type)) {
      point = geocentricToWgs84(point, source.datum_type, source.datum_params);
    }

    if (checkParams(dest.datum_type)) {
      point = geocentricFromWgs84(point, dest.datum_type, dest.datum_params);
    }

    return geocentricToGeodetic(point, dest.es, dest.a, dest.b);
  }

  function adjust_axis (crs, denorm, point) {
    var xin = point.x,
        yin = point.y,
        zin = point.z || 0.0;
    var v, t, i;
    var out = {};

    for (i = 0; i < 3; i++) {
      if (denorm && i === 2 && point.z === undefined) {
        continue;
      }

      if (i === 0) {
        v = xin;

        if ("ew".indexOf(crs.axis[i]) !== -1) {
          t = 'x';
        } else {
          t = 'y';
        }
      } else if (i === 1) {
        v = yin;

        if ("ns".indexOf(crs.axis[i]) !== -1) {
          t = 'y';
        } else {
          t = 'x';
        }
      } else {
        v = zin;
        t = 'z';
      }

      switch (crs.axis[i]) {
        case 'e':
        case 'w':
        case 'n':
        case 's':
          out[t] = v;
          break;

        case 'u':
          if (point[t] !== undefined) {
            out.z = v;
          }

          break;

        case 'd':
          if (point[t] !== undefined) {
            out.z = -v;
          }

          break;

        default:
          //console.log("ERROR: unknow axis ("+crs.axis[i]+") - check definition of "+crs.projName);
          return null;
      }
    }

    return out;
  }

  function common (array) {
    var out = {
      x: array[0],
      y: array[1]
    };

    if (array.length > 2) {
      out.z = array[2];
    }

    if (array.length > 3) {
      out.m = array[3];
    }

    return out;
  }

  function checkSanity (point) {
    checkCoord(point.x);
    checkCoord(point.y);
  }

  function checkCoord(num) {
    if (typeof Number.isFinite === 'function') {
      if (Number.isFinite(num)) {
        return;
      }

      throw new TypeError('coordinates must be finite numbers');
    }

    if (typeof num !== 'number' || num !== num || !isFinite(num)) {
      throw new TypeError('coordinates must be finite numbers');
    }
  }

  function checkNotWGS(source, dest) {
    return (source.datum.datum_type === PJD_3PARAM || source.datum.datum_type === PJD_7PARAM) && dest.datumCode !== 'WGS84' || (dest.datum.datum_type === PJD_3PARAM || dest.datum.datum_type === PJD_7PARAM) && source.datumCode !== 'WGS84';
  }

  function transform$1(source, dest, point) {
    var wgs84;

    if (Array.isArray(point)) {
      point = common(point);
    }

    checkSanity(point); // Workaround for datum shifts towgs84, if either source or destination projection is not wgs84

    if (source.datum && dest.datum && checkNotWGS(source, dest)) {
      wgs84 = new Projection('WGS84');
      point = transform$1(source, wgs84, point);
      source = wgs84;
    } // DGR, 2010/11/12


    if (source.axis !== 'enu') {
      point = adjust_axis(source, false, point);
    } // Transform source points to long/lat, if they aren't already.


    if (source.projName === 'longlat') {
      point = {
        x: point.x * D2R,
        y: point.y * D2R,
        z: point.z || 0
      };
    } else {
      if (source.to_meter) {
        point = {
          x: point.x * source.to_meter,
          y: point.y * source.to_meter,
          z: point.z || 0
        };
      }

      point = source.inverse(point); // Convert Cartesian to longlat

      if (!point) {
        return;
      }
    } // Adjust for the prime meridian if necessary


    if (source.from_greenwich) {
      point.x += source.from_greenwich;
    } // Convert datums if needed, and if possible.


    point = datum_transform(source.datum, dest.datum, point); // Adjust for the prime meridian if necessary

    if (dest.from_greenwich) {
      point = {
        x: point.x - dest.from_greenwich,
        y: point.y,
        z: point.z || 0
      };
    }

    if (dest.projName === 'longlat') {
      // convert radians to decimal degrees
      point = {
        x: point.x * R2D,
        y: point.y * R2D,
        z: point.z || 0
      };
    } else {
      // else project
      point = dest.forward(point);

      if (dest.to_meter) {
        point = {
          x: point.x / dest.to_meter,
          y: point.y / dest.to_meter,
          z: point.z || 0
        };
      }
    } // DGR, 2010/11/12


    if (dest.axis !== 'enu') {
      return adjust_axis(dest, true, point);
    }

    return point;
  }

  var wgs84 = Projection('WGS84');

  function transformer$1(from, to, coords) {
    var transformedArray, out, keys;

    if (Array.isArray(coords)) {
      transformedArray = transform$1(from, to, coords) || {
        x: NaN,
        y: NaN
      };

      if (coords.length > 2) {
        if (typeof from.name !== 'undefined' && from.name === 'geocent' || typeof to.name !== 'undefined' && to.name === 'geocent') {
          if (typeof transformedArray.z === 'number') {
            return [transformedArray.x, transformedArray.y, transformedArray.z].concat(coords.splice(3));
          } else {
            return [transformedArray.x, transformedArray.y, coords[2]].concat(coords.splice(3));
          }
        } else {
          return [transformedArray.x, transformedArray.y].concat(coords.splice(2));
        }
      } else {
        return [transformedArray.x, transformedArray.y];
      }
    } else {
      out = transform$1(from, to, coords);
      keys = Object.keys(coords);

      if (keys.length === 2) {
        return out;
      }

      keys.forEach(function (key) {
        if (typeof from.name !== 'undefined' && from.name === 'geocent' || typeof to.name !== 'undefined' && to.name === 'geocent') {
          if (key === 'x' || key === 'y' || key === 'z') {
            return;
          }
        } else {
          if (key === 'x' || key === 'y') {
            return;
          }
        }

        out[key] = coords[key];
      });
      return out;
    }
  }

  function checkProj(item) {
    if (item instanceof Projection) {
      return item;
    }

    if (item.oProj) {
      return item.oProj;
    }

    return Projection(item);
  }

  function proj4(fromProj, toProj, coord) {
    fromProj = checkProj(fromProj);
    var single = false;
    var obj;

    if (typeof toProj === 'undefined') {
      toProj = fromProj;
      fromProj = wgs84;
      single = true;
    } else if (typeof toProj.x !== 'undefined' || Array.isArray(toProj)) {
      coord = toProj;
      toProj = fromProj;
      fromProj = wgs84;
      single = true;
    }

    toProj = checkProj(toProj);

    if (coord) {
      return transformer$1(fromProj, toProj, coord);
    } else {
      obj = {
        forward: function forward(coords) {
          return transformer$1(fromProj, toProj, coords);
        },
        inverse: function inverse(coords) {
          return transformer$1(toProj, fromProj, coords);
        }
      };

      if (single) {
        obj.oProj = toProj;
      }

      return obj;
    }
  }

  /**
   * UTM zones are grouped, and assigned to one of a group of 6
   * sets.
   *
   * {int} @private
   */
  var NUM_100K_SETS = 6;
  /**
   * The column letters (for easting) of the lower left value, per
   * set.
   *
   * {string} @private
   */

  var SET_ORIGIN_COLUMN_LETTERS = 'AJSAJS';
  /**
   * The row letters (for northing) of the lower left value, per
   * set.
   *
   * {string} @private
   */

  var SET_ORIGIN_ROW_LETTERS = 'AFAFAF';
  var A = 65; // A

  var I = 73; // I

  var O = 79; // O

  var V = 86; // V

  var Z = 90; // Z

  var mgrs = {
    forward: forward$1,
    inverse: inverse$1,
    toPoint: toPoint
  };
  /**
   * Conversion of lat/lon to MGRS.
   *
   * @param {object} ll Object literal with lat and lon properties on a
   *     WGS84 ellipsoid.
   * @param {int} accuracy Accuracy in digits (5 for 1 m, 4 for 10 m, 3 for
   *      100 m, 2 for 1000 m or 1 for 10000 m). Optional, default is 5.
   * @return {string} the MGRS string for the given location and accuracy.
   */

  function forward$1(ll, accuracy) {
    accuracy = accuracy || 5; // default accuracy 1m

    return encode(LLtoUTM({
      lat: ll[1],
      lon: ll[0]
    }), accuracy);
  }
  /**
   * Conversion of MGRS to lat/lon.
   *
   * @param {string} mgrs MGRS string.
   * @return {array} An array with left (longitude), bottom (latitude), right
   *     (longitude) and top (latitude) values in WGS84, representing the
   *     bounding box for the provided MGRS reference.
   */

  function inverse$1(mgrs) {
    var bbox = UTMtoLL(decode(mgrs.toUpperCase()));

    if (bbox.lat && bbox.lon) {
      return [bbox.lon, bbox.lat, bbox.lon, bbox.lat];
    }

    return [bbox.left, bbox.bottom, bbox.right, bbox.top];
  }
  function toPoint(mgrs) {
    var bbox = UTMtoLL(decode(mgrs.toUpperCase()));

    if (bbox.lat && bbox.lon) {
      return [bbox.lon, bbox.lat];
    }

    return [(bbox.left + bbox.right) / 2, (bbox.top + bbox.bottom) / 2];
  }
  /**
   * Conversion from degrees to radians.
   *
   * @private
   * @param {number} deg the angle in degrees.
   * @return {number} the angle in radians.
   */

  function degToRad(deg) {
    return deg * (Math.PI / 180.0);
  }
  /**
   * Conversion from radians to degrees.
   *
   * @private
   * @param {number} rad the angle in radians.
   * @return {number} the angle in degrees.
   */


  function radToDeg(rad) {
    return 180.0 * (rad / Math.PI);
  }
  /**
   * Converts a set of Longitude and Latitude co-ordinates to UTM
   * using the WGS84 ellipsoid.
   *
   * @private
   * @param {object} ll Object literal with lat and lon properties
   *     representing the WGS84 coordinate to be converted.
   * @return {object} Object literal containing the UTM value with easting,
   *     northing, zoneNumber and zoneLetter properties, and an optional
   *     accuracy property in digits. Returns null if the conversion failed.
   */


  function LLtoUTM(ll) {
    var Lat = ll.lat;
    var Long = ll.lon;
    var a = 6378137.0; //ellip.radius;

    var eccSquared = 0.00669438; //ellip.eccsq;

    var k0 = 0.9996;
    var LongOrigin;
    var eccPrimeSquared;
    var N, T, C, A, M;
    var LatRad = degToRad(Lat);
    var LongRad = degToRad(Long);
    var LongOriginRad;
    var ZoneNumber; // (int)

    ZoneNumber = Math.floor((Long + 180) / 6) + 1; //Make sure the longitude 180.00 is in Zone 60

    if (Long === 180) {
      ZoneNumber = 60;
    } // Special zone for Norway


    if (Lat >= 56.0 && Lat < 64.0 && Long >= 3.0 && Long < 12.0) {
      ZoneNumber = 32;
    } // Special zones for Svalbard


    if (Lat >= 72.0 && Lat < 84.0) {
      if (Long >= 0.0 && Long < 9.0) {
        ZoneNumber = 31;
      } else if (Long >= 9.0 && Long < 21.0) {
        ZoneNumber = 33;
      } else if (Long >= 21.0 && Long < 33.0) {
        ZoneNumber = 35;
      } else if (Long >= 33.0 && Long < 42.0) {
        ZoneNumber = 37;
      }
    }

    LongOrigin = (ZoneNumber - 1) * 6 - 180 + 3; //+3 puts origin
    // in middle of
    // zone

    LongOriginRad = degToRad(LongOrigin);
    eccPrimeSquared = eccSquared / (1 - eccSquared);
    N = a / Math.sqrt(1 - eccSquared * Math.sin(LatRad) * Math.sin(LatRad));
    T = Math.tan(LatRad) * Math.tan(LatRad);
    C = eccPrimeSquared * Math.cos(LatRad) * Math.cos(LatRad);
    A = Math.cos(LatRad) * (LongRad - LongOriginRad);
    M = a * ((1 - eccSquared / 4 - 3 * eccSquared * eccSquared / 64 - 5 * eccSquared * eccSquared * eccSquared / 256) * LatRad - (3 * eccSquared / 8 + 3 * eccSquared * eccSquared / 32 + 45 * eccSquared * eccSquared * eccSquared / 1024) * Math.sin(2 * LatRad) + (15 * eccSquared * eccSquared / 256 + 45 * eccSquared * eccSquared * eccSquared / 1024) * Math.sin(4 * LatRad) - 35 * eccSquared * eccSquared * eccSquared / 3072 * Math.sin(6 * LatRad));
    var UTMEasting = k0 * N * (A + (1 - T + C) * A * A * A / 6.0 + (5 - 18 * T + T * T + 72 * C - 58 * eccPrimeSquared) * A * A * A * A * A / 120.0) + 500000.0;
    var UTMNorthing = k0 * (M + N * Math.tan(LatRad) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24.0 + (61 - 58 * T + T * T + 600 * C - 330 * eccPrimeSquared) * A * A * A * A * A * A / 720.0));

    if (Lat < 0.0) {
      UTMNorthing += 10000000.0; //10000000 meter offset for
      // southern hemisphere
    }

    return {
      northing: Math.round(UTMNorthing),
      easting: Math.round(UTMEasting),
      zoneNumber: ZoneNumber,
      zoneLetter: getLetterDesignator(Lat)
    };
  }
  /**
   * Converts UTM coords to lat/long, using the WGS84 ellipsoid. This is a convenience
   * class where the Zone can be specified as a single string eg."60N" which
   * is then broken down into the ZoneNumber and ZoneLetter.
   *
   * @private
   * @param {object} utm An object literal with northing, easting, zoneNumber
   *     and zoneLetter properties. If an optional accuracy property is
   *     provided (in meters), a bounding box will be returned instead of
   *     latitude and longitude.
   * @return {object} An object literal containing either lat and lon values
   *     (if no accuracy was provided), or top, right, bottom and left values
   *     for the bounding box calculated according to the provided accuracy.
   *     Returns null if the conversion failed.
   */


  function UTMtoLL(utm) {
    var UTMNorthing = utm.northing;
    var UTMEasting = utm.easting;
    var zoneLetter = utm.zoneLetter;
    var zoneNumber = utm.zoneNumber; // check the ZoneNummber is valid

    if (zoneNumber < 0 || zoneNumber > 60) {
      return null;
    }

    var k0 = 0.9996;
    var a = 6378137.0; //ellip.radius;

    var eccSquared = 0.00669438; //ellip.eccsq;

    var eccPrimeSquared;
    var e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));
    var N1, T1, C1, R1, D, M;
    var LongOrigin;
    var mu, phi1Rad; // remove 500,000 meter offset for longitude

    var x = UTMEasting - 500000.0;
    var y = UTMNorthing; // We must know somehow if we are in the Northern or Southern
    // hemisphere, this is the only time we use the letter So even
    // if the Zone letter isn't exactly correct it should indicate
    // the hemisphere correctly

    if (zoneLetter < 'N') {
      y -= 10000000.0; // remove 10,000,000 meter offset used
      // for southern hemisphere
    } // There are 60 zones with zone 1 being at West -180 to -174


    LongOrigin = (zoneNumber - 1) * 6 - 180 + 3; // +3 puts origin
    // in middle of
    // zone

    eccPrimeSquared = eccSquared / (1 - eccSquared);
    M = y / k0;
    mu = M / (a * (1 - eccSquared / 4 - 3 * eccSquared * eccSquared / 64 - 5 * eccSquared * eccSquared * eccSquared / 256));
    phi1Rad = mu + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu) + 151 * e1 * e1 * e1 / 96 * Math.sin(6 * mu); // double phi1 = ProjMath.radToDeg(phi1Rad);

    N1 = a / Math.sqrt(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad));
    T1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
    C1 = eccPrimeSquared * Math.cos(phi1Rad) * Math.cos(phi1Rad);
    R1 = a * (1 - eccSquared) / Math.pow(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
    D = x / (N1 * k0);
    var lat = phi1Rad - N1 * Math.tan(phi1Rad) / R1 * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * eccPrimeSquared) * D * D * D * D / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * eccPrimeSquared - 3 * C1 * C1) * D * D * D * D * D * D / 720);
    lat = radToDeg(lat);
    var lon = (D - (1 + 2 * T1 + C1) * D * D * D / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * eccPrimeSquared + 24 * T1 * T1) * D * D * D * D * D / 120) / Math.cos(phi1Rad);
    lon = LongOrigin + radToDeg(lon);
    var result;

    if (utm.accuracy) {
      var topRight = UTMtoLL({
        northing: utm.northing + utm.accuracy,
        easting: utm.easting + utm.accuracy,
        zoneLetter: utm.zoneLetter,
        zoneNumber: utm.zoneNumber
      });
      result = {
        top: topRight.lat,
        right: topRight.lon,
        bottom: lat,
        left: lon
      };
    } else {
      result = {
        lat: lat,
        lon: lon
      };
    }

    return result;
  }
  /**
   * Calculates the MGRS letter designator for the given latitude.
   *
   * @private
   * @param {number} lat The latitude in WGS84 to get the letter designator
   *     for.
   * @return {char} The letter designator.
   */


  function getLetterDesignator(lat) {
    //This is here as an error flag to show that the Latitude is
    //outside MGRS limits
    var LetterDesignator = 'Z';

    if (84 >= lat && lat >= 72) {
      LetterDesignator = 'X';
    } else if (72 > lat && lat >= 64) {
      LetterDesignator = 'W';
    } else if (64 > lat && lat >= 56) {
      LetterDesignator = 'V';
    } else if (56 > lat && lat >= 48) {
      LetterDesignator = 'U';
    } else if (48 > lat && lat >= 40) {
      LetterDesignator = 'T';
    } else if (40 > lat && lat >= 32) {
      LetterDesignator = 'S';
    } else if (32 > lat && lat >= 24) {
      LetterDesignator = 'R';
    } else if (24 > lat && lat >= 16) {
      LetterDesignator = 'Q';
    } else if (16 > lat && lat >= 8) {
      LetterDesignator = 'P';
    } else if (8 > lat && lat >= 0) {
      LetterDesignator = 'N';
    } else if (0 > lat && lat >= -8) {
      LetterDesignator = 'M';
    } else if (-8 > lat && lat >= -16) {
      LetterDesignator = 'L';
    } else if (-16 > lat && lat >= -24) {
      LetterDesignator = 'K';
    } else if (-24 > lat && lat >= -32) {
      LetterDesignator = 'J';
    } else if (-32 > lat && lat >= -40) {
      LetterDesignator = 'H';
    } else if (-40 > lat && lat >= -48) {
      LetterDesignator = 'G';
    } else if (-48 > lat && lat >= -56) {
      LetterDesignator = 'F';
    } else if (-56 > lat && lat >= -64) {
      LetterDesignator = 'E';
    } else if (-64 > lat && lat >= -72) {
      LetterDesignator = 'D';
    } else if (-72 > lat && lat >= -80) {
      LetterDesignator = 'C';
    }

    return LetterDesignator;
  }
  /**
   * Encodes a UTM location as MGRS string.
   *
   * @private
   * @param {object} utm An object literal with easting, northing,
   *     zoneLetter, zoneNumber
   * @param {number} accuracy Accuracy in digits (1-5).
   * @return {string} MGRS string for the given UTM location.
   */


  function encode(utm, accuracy) {
    // prepend with leading zeroes
    var seasting = "00000" + utm.easting,
        snorthing = "00000" + utm.northing;
    return utm.zoneNumber + utm.zoneLetter + get100kID(utm.easting, utm.northing, utm.zoneNumber) + seasting.substr(seasting.length - 5, accuracy) + snorthing.substr(snorthing.length - 5, accuracy);
  }
  /**
   * Get the two letter 100k designator for a given UTM easting,
   * northing and zone number value.
   *
   * @private
   * @param {number} easting
   * @param {number} northing
   * @param {number} zoneNumber
   * @return the two letter 100k designator for the given UTM location.
   */


  function get100kID(easting, northing, zoneNumber) {
    var setParm = get100kSetForZone(zoneNumber);
    var setColumn = Math.floor(easting / 100000);
    var setRow = Math.floor(northing / 100000) % 20;
    return getLetter100kID(setColumn, setRow, setParm);
  }
  /**
   * Given a UTM zone number, figure out the MGRS 100K set it is in.
   *
   * @private
   * @param {number} i An UTM zone number.
   * @return {number} the 100k set the UTM zone is in.
   */


  function get100kSetForZone(i) {
    var setParm = i % NUM_100K_SETS;

    if (setParm === 0) {
      setParm = NUM_100K_SETS;
    }

    return setParm;
  }
  /**
   * Get the two-letter MGRS 100k designator given information
   * translated from the UTM northing, easting and zone number.
   *
   * @private
   * @param {number} column the column index as it relates to the MGRS
   *        100k set spreadsheet, created from the UTM easting.
   *        Values are 1-8.
   * @param {number} row the row index as it relates to the MGRS 100k set
   *        spreadsheet, created from the UTM northing value. Values
   *        are from 0-19.
   * @param {number} parm the set block, as it relates to the MGRS 100k set
   *        spreadsheet, created from the UTM zone. Values are from
   *        1-60.
   * @return two letter MGRS 100k code.
   */


  function getLetter100kID(column, row, parm) {
    // colOrigin and rowOrigin are the letters at the origin of the set
    var index = parm - 1;
    var colOrigin = SET_ORIGIN_COLUMN_LETTERS.charCodeAt(index);
    var rowOrigin = SET_ORIGIN_ROW_LETTERS.charCodeAt(index); // colInt and rowInt are the letters to build to return

    var colInt = colOrigin + column - 1;
    var rowInt = rowOrigin + row;
    var rollover = false;

    if (colInt > Z) {
      colInt = colInt - Z + A - 1;
      rollover = true;
    }

    if (colInt === I || colOrigin < I && colInt > I || (colInt > I || colOrigin < I) && rollover) {
      colInt++;
    }

    if (colInt === O || colOrigin < O && colInt > O || (colInt > O || colOrigin < O) && rollover) {
      colInt++;

      if (colInt === I) {
        colInt++;
      }
    }

    if (colInt > Z) {
      colInt = colInt - Z + A - 1;
    }

    if (rowInt > V) {
      rowInt = rowInt - V + A - 1;
      rollover = true;
    } else {
      rollover = false;
    }

    if (rowInt === I || rowOrigin < I && rowInt > I || (rowInt > I || rowOrigin < I) && rollover) {
      rowInt++;
    }

    if (rowInt === O || rowOrigin < O && rowInt > O || (rowInt > O || rowOrigin < O) && rollover) {
      rowInt++;

      if (rowInt === I) {
        rowInt++;
      }
    }

    if (rowInt > V) {
      rowInt = rowInt - V + A - 1;
    }

    var twoLetter = String.fromCharCode(colInt) + String.fromCharCode(rowInt);
    return twoLetter;
  }
  /**
   * Decode the UTM parameters from a MGRS string.
   *
   * @private
   * @param {string} mgrsString an UPPERCASE coordinate string is expected.
   * @return {object} An object literal with easting, northing, zoneLetter,
   *     zoneNumber and accuracy (in meters) properties.
   */


  function decode(mgrsString) {
    if (mgrsString && mgrsString.length === 0) {
      throw "MGRSPoint coverting from nothing";
    }

    var length = mgrsString.length;
    var hunK = null;
    var sb = "";
    var testChar;
    var i = 0; // get Zone number

    while (!/[A-Z]/.test(testChar = mgrsString.charAt(i))) {
      if (i >= 2) {
        throw "MGRSPoint bad conversion from: " + mgrsString;
      }

      sb += testChar;
      i++;
    }

    var zoneNumber = parseInt(sb, 10);

    if (i === 0 || i + 3 > length) {
      // A good MGRS string has to be 4-5 digits long,
      // ##AAA/#AAA at least.
      throw "MGRSPoint bad conversion from: " + mgrsString;
    }

    var zoneLetter = mgrsString.charAt(i++); // Should we check the zone letter here? Why not.

    if (zoneLetter <= 'A' || zoneLetter === 'B' || zoneLetter === 'Y' || zoneLetter >= 'Z' || zoneLetter === 'I' || zoneLetter === 'O') {
      throw "MGRSPoint zone letter " + zoneLetter + " not handled: " + mgrsString;
    }

    hunK = mgrsString.substring(i, i += 2);
    var set = get100kSetForZone(zoneNumber);
    var east100k = getEastingFromChar(hunK.charAt(0), set);
    var north100k = getNorthingFromChar(hunK.charAt(1), set); // We have a bug where the northing may be 2000000 too low.
    // How
    // do we know when to roll over?

    while (north100k < getMinNorthing(zoneLetter)) {
      north100k += 2000000;
    } // calculate the char index for easting/northing separator


    var remainder = length - i;

    if (remainder % 2 !== 0) {
      throw "MGRSPoint has to have an even number \nof digits after the zone letter and two 100km letters - front \nhalf for easting meters, second half for \nnorthing meters" + mgrsString;
    }

    var sep = remainder / 2;
    var sepEasting = 0.0;
    var sepNorthing = 0.0;
    var accuracyBonus, sepEastingString, sepNorthingString, easting, northing;

    if (sep > 0) {
      accuracyBonus = 100000.0 / Math.pow(10, sep);
      sepEastingString = mgrsString.substring(i, i + sep);
      sepEasting = parseFloat(sepEastingString) * accuracyBonus;
      sepNorthingString = mgrsString.substring(i + sep);
      sepNorthing = parseFloat(sepNorthingString) * accuracyBonus;
    }

    easting = sepEasting + east100k;
    northing = sepNorthing + north100k;
    return {
      easting: easting,
      northing: northing,
      zoneLetter: zoneLetter,
      zoneNumber: zoneNumber,
      accuracy: accuracyBonus
    };
  }
  /**
   * Given the first letter from a two-letter MGRS 100k zone, and given the
   * MGRS table set for the zone number, figure out the easting value that
   * should be added to the other, secondary easting value.
   *
   * @private
   * @param {char} e The first letter from a two-letter MGRS 100´k zone.
   * @param {number} set The MGRS table set for the zone number.
   * @return {number} The easting value for the given letter and set.
   */


  function getEastingFromChar(e, set) {
    // colOrigin is the letter at the origin of the set for the
    // column
    var curCol = SET_ORIGIN_COLUMN_LETTERS.charCodeAt(set - 1);
    var eastingValue = 100000.0;
    var rewindMarker = false;

    while (curCol !== e.charCodeAt(0)) {
      curCol++;

      if (curCol === I) {
        curCol++;
      }

      if (curCol === O) {
        curCol++;
      }

      if (curCol > Z) {
        if (rewindMarker) {
          throw "Bad character: " + e;
        }

        curCol = A;
        rewindMarker = true;
      }

      eastingValue += 100000.0;
    }

    return eastingValue;
  }
  /**
   * Given the second letter from a two-letter MGRS 100k zone, and given the
   * MGRS table set for the zone number, figure out the northing value that
   * should be added to the other, secondary northing value. You have to
   * remember that Northings are determined from the equator, and the vertical
   * cycle of letters mean a 2000000 additional northing meters. This happens
   * approx. every 18 degrees of latitude. This method does *NOT* count any
   * additional northings. You have to figure out how many 2000000 meters need
   * to be added for the zone letter of the MGRS coordinate.
   *
   * @private
   * @param {char} n Second letter of the MGRS 100k zone
   * @param {number} set The MGRS table set number, which is dependent on the
   *     UTM zone number.
   * @return {number} The northing value for the given letter and set.
   */


  function getNorthingFromChar(n, set) {
    if (n > 'V') {
      throw "MGRSPoint given invalid Northing " + n;
    } // rowOrigin is the letter at the origin of the set for the
    // column


    var curRow = SET_ORIGIN_ROW_LETTERS.charCodeAt(set - 1);
    var northingValue = 0.0;
    var rewindMarker = false;

    while (curRow !== n.charCodeAt(0)) {
      curRow++;

      if (curRow === I) {
        curRow++;
      }

      if (curRow === O) {
        curRow++;
      } // fixing a bug making whole application hang in this loop
      // when 'n' is a wrong character


      if (curRow > V) {
        if (rewindMarker) {
          // making sure that this loop ends
          throw "Bad character: " + n;
        }

        curRow = A;
        rewindMarker = true;
      }

      northingValue += 100000.0;
    }

    return northingValue;
  }
  /**
   * The function getMinNorthing returns the minimum northing value of a MGRS
   * zone.
   *
   * Ported from Geotrans' c Lattitude_Band_Value structure table.
   *
   * @private
   * @param {char} zoneLetter The MGRS zone to get the min northing for.
   * @return {number}
   */


  function getMinNorthing(zoneLetter) {
    var northing;

    switch (zoneLetter) {
      case 'C':
        northing = 1100000.0;
        break;

      case 'D':
        northing = 2000000.0;
        break;

      case 'E':
        northing = 2800000.0;
        break;

      case 'F':
        northing = 3700000.0;
        break;

      case 'G':
        northing = 4600000.0;
        break;

      case 'H':
        northing = 5500000.0;
        break;

      case 'J':
        northing = 6400000.0;
        break;

      case 'K':
        northing = 7300000.0;
        break;

      case 'L':
        northing = 8200000.0;
        break;

      case 'M':
        northing = 9100000.0;
        break;

      case 'N':
        northing = 0.0;
        break;

      case 'P':
        northing = 800000.0;
        break;

      case 'Q':
        northing = 1700000.0;
        break;

      case 'R':
        northing = 2600000.0;
        break;

      case 'S':
        northing = 3500000.0;
        break;

      case 'T':
        northing = 4400000.0;
        break;

      case 'U':
        northing = 5300000.0;
        break;

      case 'V':
        northing = 6200000.0;
        break;

      case 'W':
        northing = 7000000.0;
        break;

      case 'X':
        northing = 7900000.0;
        break;

      default:
        northing = -1.0;
    }

    if (northing >= 0.0) {
      return northing;
    } else {
      throw "Invalid zone letter: " + zoneLetter;
    }
  }

  function Point(x, y, z) {
    if (!(this instanceof Point)) {
      return new Point(x, y, z);
    }

    if (Array.isArray(x)) {
      this.x = x[0];
      this.y = x[1];
      this.z = x[2] || 0.0;
    } else if (_typeof(x) === 'object') {
      this.x = x.x;
      this.y = x.y;
      this.z = x.z || 0.0;
    } else if (typeof x === 'string' && typeof y === 'undefined') {
      var coords = x.split(',');
      this.x = parseFloat(coords[0], 10);
      this.y = parseFloat(coords[1], 10);
      this.z = parseFloat(coords[2], 10) || 0.0;
    } else {
      this.x = x;
      this.y = y;
      this.z = z || 0.0;
    }

    console.warn('proj4.Point will be removed in version 3, use proj4.toPoint');
  }

  Point.fromMGRS = function (mgrsStr) {
    return new Point(toPoint(mgrsStr));
  };

  Point.prototype.toMGRS = function (accuracy) {
    return forward$1([this.x, this.y], accuracy);
  };

  var C00 = 1;
  var C02 = 0.25;
  var C04 = 0.046875;
  var C06 = 0.01953125;
  var C08 = 0.01068115234375;
  var C22 = 0.75;
  var C44 = 0.46875;
  var C46 = 0.01302083333333333333;
  var C48 = 0.00712076822916666666;
  var C66 = 0.36458333333333333333;
  var C68 = 0.00569661458333333333;
  var C88 = 0.3076171875;
  function pj_enfn (es) {
    var en = [];
    en[0] = C00 - es * (C02 + es * (C04 + es * (C06 + es * C08)));
    en[1] = es * (C22 - es * (C04 + es * (C06 + es * C08)));
    var t = es * es;
    en[2] = t * (C44 - es * (C46 + es * C48));
    t *= es;
    en[3] = t * (C66 - es * C68);
    en[4] = t * es * C88;
    return en;
  }

  function pj_mlfn (phi, sphi, cphi, en) {
    cphi *= sphi;
    sphi *= sphi;
    return en[0] * phi - cphi * (en[1] + sphi * (en[2] + sphi * (en[3] + sphi * en[4])));
  }

  var MAX_ITER = 20;
  function pj_inv_mlfn (arg, es, en) {
    var k = 1 / (1 - es);
    var phi = arg;

    for (var i = MAX_ITER; i; --i) {
      /* rarely goes over 2 iterations */
      var s = Math.sin(phi);
      var t = 1 - es * s * s; //t = this.pj_mlfn(phi, s, Math.cos(phi), en) - arg;
      //phi -= t * (t * Math.sqrt(t)) * k;

      t = (pj_mlfn(phi, s, Math.cos(phi), en) - arg) * (t * Math.sqrt(t)) * k;
      phi -= t;

      if (Math.abs(t) < EPSLN) {
        return phi;
      }
    } //..reportError("cass:pj_inv_mlfn: Convergence error");


    return phi;
  }

  // Heavily based on this tmerc projection implementation
  function init$3() {
    this.x0 = this.x0 !== undefined ? this.x0 : 0;
    this.y0 = this.y0 !== undefined ? this.y0 : 0;
    this.long0 = this.long0 !== undefined ? this.long0 : 0;
    this.lat0 = this.lat0 !== undefined ? this.lat0 : 0;

    if (this.es) {
      this.en = pj_enfn(this.es);
      this.ml0 = pj_mlfn(this.lat0, Math.sin(this.lat0), Math.cos(this.lat0), this.en);
    }
  }
  /**
      Transverse Mercator Forward  - long/lat to x/y
      long/lat in radians
    */

  function forward$2(p) {
    var lon = p.x;
    var lat = p.y;
    var delta_lon = adjust_lon(lon - this.long0);
    var con;
    var x, y;
    var sin_phi = Math.sin(lat);
    var cos_phi = Math.cos(lat);

    if (!this.es) {
      var b = cos_phi * Math.sin(delta_lon);

      if (Math.abs(Math.abs(b) - 1) < EPSLN) {
        return 93;
      } else {
        x = 0.5 * this.a * this.k0 * Math.log((1 + b) / (1 - b)) + this.x0;
        y = cos_phi * Math.cos(delta_lon) / Math.sqrt(1 - Math.pow(b, 2));
        b = Math.abs(y);

        if (b >= 1) {
          if (b - 1 > EPSLN) {
            return 93;
          } else {
            y = 0;
          }
        } else {
          y = Math.acos(y);
        }

        if (lat < 0) {
          y = -y;
        }

        y = this.a * this.k0 * (y - this.lat0) + this.y0;
      }
    } else {
      var al = cos_phi * delta_lon;
      var als = Math.pow(al, 2);
      var c = this.ep2 * Math.pow(cos_phi, 2);
      var cs = Math.pow(c, 2);
      var tq = Math.abs(cos_phi) > EPSLN ? Math.tan(lat) : 0;
      var t = Math.pow(tq, 2);
      var ts = Math.pow(t, 2);
      con = 1 - this.es * Math.pow(sin_phi, 2);
      al = al / Math.sqrt(con);
      var ml = pj_mlfn(lat, sin_phi, cos_phi, this.en);
      x = this.a * (this.k0 * al * (1 + als / 6 * (1 - t + c + als / 20 * (5 - 18 * t + ts + 14 * c - 58 * t * c + als / 42 * (61 + 179 * ts - ts * t - 479 * t))))) + this.x0;
      y = this.a * (this.k0 * (ml - this.ml0 + sin_phi * delta_lon * al / 2 * (1 + als / 12 * (5 - t + 9 * c + 4 * cs + als / 30 * (61 + ts - 58 * t + 270 * c - 330 * t * c + als / 56 * (1385 + 543 * ts - ts * t - 3111 * t)))))) + this.y0;
    }

    p.x = x;
    p.y = y;
    return p;
  }
  /**
      Transverse Mercator Inverse  -  x/y to long/lat
    */

  function inverse$2(p) {
    var con, phi;
    var lat, lon;
    var x = (p.x - this.x0) * (1 / this.a);
    var y = (p.y - this.y0) * (1 / this.a);

    if (!this.es) {
      var f = Math.exp(x / this.k0);
      var g = 0.5 * (f - 1 / f);
      var temp = this.lat0 + y / this.k0;
      var h = Math.cos(temp);
      con = Math.sqrt((1 - Math.pow(h, 2)) / (1 + Math.pow(g, 2)));
      lat = Math.asin(con);

      if (y < 0) {
        lat = -lat;
      }

      if (g === 0 && h === 0) {
        lon = 0;
      } else {
        lon = adjust_lon(Math.atan2(g, h) + this.long0);
      }
    } else {
      // ellipsoidal form
      con = this.ml0 + y / this.k0;
      phi = pj_inv_mlfn(con, this.es, this.en);

      if (Math.abs(phi) < HALF_PI) {
        var sin_phi = Math.sin(phi);
        var cos_phi = Math.cos(phi);
        var tan_phi = Math.abs(cos_phi) > EPSLN ? Math.tan(phi) : 0;
        var c = this.ep2 * Math.pow(cos_phi, 2);
        var cs = Math.pow(c, 2);
        var t = Math.pow(tan_phi, 2);
        var ts = Math.pow(t, 2);
        con = 1 - this.es * Math.pow(sin_phi, 2);
        var d = x * Math.sqrt(con) / this.k0;
        var ds = Math.pow(d, 2);
        con = con * tan_phi;
        lat = phi - con * ds / (1 - this.es) * 0.5 * (1 - ds / 12 * (5 + 3 * t - 9 * c * t + c - 4 * cs - ds / 30 * (61 + 90 * t - 252 * c * t + 45 * ts + 46 * c - ds / 56 * (1385 + 3633 * t + 4095 * ts + 1574 * ts * t))));
        lon = adjust_lon(this.long0 + d * (1 - ds / 6 * (1 + 2 * t + c - ds / 20 * (5 + 28 * t + 24 * ts + 8 * c * t + 6 * c - ds / 42 * (61 + 662 * t + 1320 * ts + 720 * ts * t)))) / cos_phi);
      } else {
        lat = HALF_PI * sign(y);
        lon = 0;
      }
    }

    p.x = lon;
    p.y = lat;
    return p;
  }
  var names$3 = ["Transverse_Mercator", "Transverse Mercator", "tmerc"];
  var tmerc = {
    init: init$3,
    forward: forward$2,
    inverse: inverse$2,
    names: names$3
  };

  function sinh (x) {
    var r = Math.exp(x);
    r = (r - 1 / r) / 2;
    return r;
  }

  function hypot (x, y) {
    x = Math.abs(x);
    y = Math.abs(y);
    var a = Math.max(x, y);
    var b = Math.min(x, y) / (a ? a : 1);
    return a * Math.sqrt(1 + Math.pow(b, 2));
  }

  function log1py (x) {
    var y = 1 + x;
    var z = y - 1;
    return z === 0 ? x : x * Math.log(y) / z;
  }

  function asinhy (x) {
    var y = Math.abs(x);
    y = log1py(y * (1 + y / (hypot(1, y) + 1)));
    return x < 0 ? -y : y;
  }

  function gatg (pp, B) {
    var cos_2B = 2 * Math.cos(2 * B);
    var i = pp.length - 1;
    var h1 = pp[i];
    var h2 = 0;
    var h;

    while (--i >= 0) {
      h = -h2 + cos_2B * h1 + pp[i];
      h2 = h1;
      h1 = h;
    }

    return B + h * Math.sin(2 * B);
  }

  function clens (pp, arg_r) {
    var r = 2 * Math.cos(arg_r);
    var i = pp.length - 1;
    var hr1 = pp[i];
    var hr2 = 0;
    var hr;

    while (--i >= 0) {
      hr = -hr2 + r * hr1 + pp[i];
      hr2 = hr1;
      hr1 = hr;
    }

    return Math.sin(arg_r) * hr;
  }

  function cosh (x) {
    var r = Math.exp(x);
    r = (r + 1 / r) / 2;
    return r;
  }

  function clens_cmplx (pp, arg_r, arg_i) {
    var sin_arg_r = Math.sin(arg_r);
    var cos_arg_r = Math.cos(arg_r);
    var sinh_arg_i = sinh(arg_i);
    var cosh_arg_i = cosh(arg_i);
    var r = 2 * cos_arg_r * cosh_arg_i;
    var i = -2 * sin_arg_r * sinh_arg_i;
    var j = pp.length - 1;
    var hr = pp[j];
    var hi1 = 0;
    var hr1 = 0;
    var hi = 0;
    var hr2;
    var hi2;

    while (--j >= 0) {
      hr2 = hr1;
      hi2 = hi1;
      hr1 = hr;
      hi1 = hi;
      hr = -hr2 + r * hr1 - i * hi1 + pp[j];
      hi = -hi2 + i * hr1 + r * hi1;
    }

    r = sin_arg_r * cosh_arg_i;
    i = cos_arg_r * sinh_arg_i;
    return [r * hr - i * hi, r * hi + i * hr];
  }

  // Heavily based on this etmerc projection implementation
  function init$4() {
    if (this.es === undefined || this.es <= 0) {
      throw new Error('incorrect elliptical usage');
    }

    this.x0 = this.x0 !== undefined ? this.x0 : 0;
    this.y0 = this.y0 !== undefined ? this.y0 : 0;
    this.long0 = this.long0 !== undefined ? this.long0 : 0;
    this.lat0 = this.lat0 !== undefined ? this.lat0 : 0;
    this.cgb = [];
    this.cbg = [];
    this.utg = [];
    this.gtu = [];
    var f = this.es / (1 + Math.sqrt(1 - this.es));
    var n = f / (2 - f);
    var np = n;
    this.cgb[0] = n * (2 + n * (-2 / 3 + n * (-2 + n * (116 / 45 + n * (26 / 45 + n * (-2854 / 675))))));
    this.cbg[0] = n * (-2 + n * (2 / 3 + n * (4 / 3 + n * (-82 / 45 + n * (32 / 45 + n * (4642 / 4725))))));
    np = np * n;
    this.cgb[1] = np * (7 / 3 + n * (-8 / 5 + n * (-227 / 45 + n * (2704 / 315 + n * (2323 / 945)))));
    this.cbg[1] = np * (5 / 3 + n * (-16 / 15 + n * (-13 / 9 + n * (904 / 315 + n * (-1522 / 945)))));
    np = np * n;
    this.cgb[2] = np * (56 / 15 + n * (-136 / 35 + n * (-1262 / 105 + n * (73814 / 2835))));
    this.cbg[2] = np * (-26 / 15 + n * (34 / 21 + n * (8 / 5 + n * (-12686 / 2835))));
    np = np * n;
    this.cgb[3] = np * (4279 / 630 + n * (-332 / 35 + n * (-399572 / 14175)));
    this.cbg[3] = np * (1237 / 630 + n * (-12 / 5 + n * (-24832 / 14175)));
    np = np * n;
    this.cgb[4] = np * (4174 / 315 + n * (-144838 / 6237));
    this.cbg[4] = np * (-734 / 315 + n * (109598 / 31185));
    np = np * n;
    this.cgb[5] = np * (601676 / 22275);
    this.cbg[5] = np * (444337 / 155925);
    np = Math.pow(n, 2);
    this.Qn = this.k0 / (1 + n) * (1 + np * (1 / 4 + np * (1 / 64 + np / 256)));
    this.utg[0] = n * (-0.5 + n * (2 / 3 + n * (-37 / 96 + n * (1 / 360 + n * (81 / 512 + n * (-96199 / 604800))))));
    this.gtu[0] = n * (0.5 + n * (-2 / 3 + n * (5 / 16 + n * (41 / 180 + n * (-127 / 288 + n * (7891 / 37800))))));
    this.utg[1] = np * (-1 / 48 + n * (-1 / 15 + n * (437 / 1440 + n * (-46 / 105 + n * (1118711 / 3870720)))));
    this.gtu[1] = np * (13 / 48 + n * (-3 / 5 + n * (557 / 1440 + n * (281 / 630 + n * (-1983433 / 1935360)))));
    np = np * n;
    this.utg[2] = np * (-17 / 480 + n * (37 / 840 + n * (209 / 4480 + n * (-5569 / 90720))));
    this.gtu[2] = np * (61 / 240 + n * (-103 / 140 + n * (15061 / 26880 + n * (167603 / 181440))));
    np = np * n;
    this.utg[3] = np * (-4397 / 161280 + n * (11 / 504 + n * (830251 / 7257600)));
    this.gtu[3] = np * (49561 / 161280 + n * (-179 / 168 + n * (6601661 / 7257600)));
    np = np * n;
    this.utg[4] = np * (-4583 / 161280 + n * (108847 / 3991680));
    this.gtu[4] = np * (34729 / 80640 + n * (-3418889 / 1995840));
    np = np * n;
    this.utg[5] = np * (-20648693 / 638668800);
    this.gtu[5] = np * (212378941 / 319334400);
    var Z = gatg(this.cbg, this.lat0);
    this.Zb = -this.Qn * (Z + clens(this.gtu, 2 * Z));
  }
  function forward$3(p) {
    var Ce = adjust_lon(p.x - this.long0);
    var Cn = p.y;
    Cn = gatg(this.cbg, Cn);
    var sin_Cn = Math.sin(Cn);
    var cos_Cn = Math.cos(Cn);
    var sin_Ce = Math.sin(Ce);
    var cos_Ce = Math.cos(Ce);
    Cn = Math.atan2(sin_Cn, cos_Ce * cos_Cn);
    Ce = Math.atan2(sin_Ce * cos_Cn, hypot(sin_Cn, cos_Cn * cos_Ce));
    Ce = asinhy(Math.tan(Ce));
    var tmp = clens_cmplx(this.gtu, 2 * Cn, 2 * Ce);
    Cn = Cn + tmp[0];
    Ce = Ce + tmp[1];
    var x;
    var y;

    if (Math.abs(Ce) <= 2.623395162778) {
      x = this.a * (this.Qn * Ce) + this.x0;
      y = this.a * (this.Qn * Cn + this.Zb) + this.y0;
    } else {
      x = Infinity;
      y = Infinity;
    }

    p.x = x;
    p.y = y;
    return p;
  }
  function inverse$3(p) {
    var Ce = (p.x - this.x0) * (1 / this.a);
    var Cn = (p.y - this.y0) * (1 / this.a);
    Cn = (Cn - this.Zb) / this.Qn;
    Ce = Ce / this.Qn;
    var lon;
    var lat;

    if (Math.abs(Ce) <= 2.623395162778) {
      var tmp = clens_cmplx(this.utg, 2 * Cn, 2 * Ce);
      Cn = Cn + tmp[0];
      Ce = Ce + tmp[1];
      Ce = Math.atan(sinh(Ce));
      var sin_Cn = Math.sin(Cn);
      var cos_Cn = Math.cos(Cn);
      var sin_Ce = Math.sin(Ce);
      var cos_Ce = Math.cos(Ce);
      Cn = Math.atan2(sin_Cn * cos_Ce, hypot(sin_Ce, cos_Ce * cos_Cn));
      Ce = Math.atan2(sin_Ce, cos_Ce * cos_Cn);
      lon = adjust_lon(Ce + this.long0);
      lat = gatg(this.cgb, Cn);
    } else {
      lon = Infinity;
      lat = Infinity;
    }

    p.x = lon;
    p.y = lat;
    return p;
  }
  var names$4 = ["Extended_Transverse_Mercator", "Extended Transverse Mercator", "etmerc"];
  var etmerc = {
    init: init$4,
    forward: forward$3,
    inverse: inverse$3,
    names: names$4
  };

  function adjust_zone (zone, lon) {
    if (zone === undefined) {
      zone = Math.floor((adjust_lon(lon) + Math.PI) * 30 / Math.PI) + 1;

      if (zone < 0) {
        return 0;
      } else if (zone > 60) {
        return 60;
      }
    }

    return zone;
  }

  var dependsOn = 'etmerc';
  function init$5() {
    var zone = adjust_zone(this.zone, this.long0);

    if (zone === undefined) {
      throw new Error('unknown utm zone');
    }

    this.lat0 = 0;
    this.long0 = (6 * Math.abs(zone) - 183) * D2R;
    this.x0 = 500000;
    this.y0 = this.utmSouth ? 10000000 : 0;
    this.k0 = 0.9996;
    etmerc.init.apply(this);
    this.forward = etmerc.forward;
    this.inverse = etmerc.inverse;
  }
  var names$5 = ["Universal Transverse Mercator System", "utm"];
  var utm = {
    init: init$5,
    names: names$5,
    dependsOn: dependsOn
  };

  function srat (esinp, exp) {
    return Math.pow((1 - esinp) / (1 + esinp), exp);
  }

  var MAX_ITER$1 = 20;
  function init$6() {
    var sphi = Math.sin(this.lat0);
    var cphi = Math.cos(this.lat0);
    cphi *= cphi;
    this.rc = Math.sqrt(1 - this.es) / (1 - this.es * sphi * sphi);
    this.C = Math.sqrt(1 + this.es * cphi * cphi / (1 - this.es));
    this.phic0 = Math.asin(sphi / this.C);
    this.ratexp = 0.5 * this.C * this.e;
    this.K = Math.tan(0.5 * this.phic0 + FORTPI) / (Math.pow(Math.tan(0.5 * this.lat0 + FORTPI), this.C) * srat(this.e * sphi, this.ratexp));
  }
  function forward$4(p) {
    var lon = p.x;
    var lat = p.y;
    p.y = 2 * Math.atan(this.K * Math.pow(Math.tan(0.5 * lat + FORTPI), this.C) * srat(this.e * Math.sin(lat), this.ratexp)) - HALF_PI;
    p.x = this.C * lon;
    return p;
  }
  function inverse$4(p) {
    var DEL_TOL = 1e-14;
    var lon = p.x / this.C;
    var lat = p.y;
    var num = Math.pow(Math.tan(0.5 * lat + FORTPI) / this.K, 1 / this.C);

    for (var i = MAX_ITER$1; i > 0; --i) {
      lat = 2 * Math.atan(num * srat(this.e * Math.sin(p.y), -0.5 * this.e)) - HALF_PI;

      if (Math.abs(lat - p.y) < DEL_TOL) {
        break;
      }

      p.y = lat;
    }
    /* convergence failed */


    if (!i) {
      return null;
    }

    p.x = lon;
    p.y = lat;
    return p;
  }
  var names$6 = ["gauss"];
  var gauss = {
    init: init$6,
    forward: forward$4,
    inverse: inverse$4,
    names: names$6
  };

  function init$7() {
    gauss.init.apply(this);

    if (!this.rc) {
      return;
    }

    this.sinc0 = Math.sin(this.phic0);
    this.cosc0 = Math.cos(this.phic0);
    this.R2 = 2 * this.rc;

    if (!this.title) {
      this.title = "Oblique Stereographic Alternative";
    }
  }
  function forward$5(p) {
    var sinc, cosc, cosl, k;
    p.x = adjust_lon(p.x - this.long0);
    gauss.forward.apply(this, [p]);
    sinc = Math.sin(p.y);
    cosc = Math.cos(p.y);
    cosl = Math.cos(p.x);
    k = this.k0 * this.R2 / (1 + this.sinc0 * sinc + this.cosc0 * cosc * cosl);
    p.x = k * cosc * Math.sin(p.x);
    p.y = k * (this.cosc0 * sinc - this.sinc0 * cosc * cosl);
    p.x = this.a * p.x + this.x0;
    p.y = this.a * p.y + this.y0;
    return p;
  }
  function inverse$5(p) {
    var sinc, cosc, lon, lat, rho;
    p.x = (p.x - this.x0) / this.a;
    p.y = (p.y - this.y0) / this.a;
    p.x /= this.k0;
    p.y /= this.k0;

    if (rho = Math.sqrt(p.x * p.x + p.y * p.y)) {
      var c = 2 * Math.atan2(rho, this.R2);
      sinc = Math.sin(c);
      cosc = Math.cos(c);
      lat = Math.asin(cosc * this.sinc0 + p.y * sinc * this.cosc0 / rho);
      lon = Math.atan2(p.x * sinc, rho * this.cosc0 * cosc - p.y * this.sinc0 * sinc);
    } else {
      lat = this.phic0;
      lon = 0;
    }

    p.x = lon;
    p.y = lat;
    gauss.inverse.apply(this, [p]);
    p.x = adjust_lon(p.x + this.long0);
    return p;
  }
  var names$7 = ["Stereographic_North_Pole", "Oblique_Stereographic", "Polar_Stereographic", "sterea", "Oblique Stereographic Alternative", "Double_Stereographic"];
  var sterea = {
    init: init$7,
    forward: forward$5,
    inverse: inverse$5,
    names: names$7
  };

  function ssfn_(phit, sinphi, eccen) {
    sinphi *= eccen;
    return Math.tan(0.5 * (HALF_PI + phit)) * Math.pow((1 - sinphi) / (1 + sinphi), 0.5 * eccen);
  }
  function init$8() {
    this.coslat0 = Math.cos(this.lat0);
    this.sinlat0 = Math.sin(this.lat0);

    if (this.sphere) {
      if (this.k0 === 1 && !isNaN(this.lat_ts) && Math.abs(this.coslat0) <= EPSLN) {
        this.k0 = 0.5 * (1 + sign(this.lat0) * Math.sin(this.lat_ts));
      }
    } else {
      if (Math.abs(this.coslat0) <= EPSLN) {
        if (this.lat0 > 0) {
          //North pole
          //trace('stere:north pole');
          this.con = 1;
        } else {
          //South pole
          //trace('stere:south pole');
          this.con = -1;
        }
      }

      this.cons = Math.sqrt(Math.pow(1 + this.e, 1 + this.e) * Math.pow(1 - this.e, 1 - this.e));

      if (this.k0 === 1 && !isNaN(this.lat_ts) && Math.abs(this.coslat0) <= EPSLN) {
        this.k0 = 0.5 * this.cons * msfnz(this.e, Math.sin(this.lat_ts), Math.cos(this.lat_ts)) / tsfnz(this.e, this.con * this.lat_ts, this.con * Math.sin(this.lat_ts));
      }

      this.ms1 = msfnz(this.e, this.sinlat0, this.coslat0);
      this.X0 = 2 * Math.atan(this.ssfn_(this.lat0, this.sinlat0, this.e)) - HALF_PI;
      this.cosX0 = Math.cos(this.X0);
      this.sinX0 = Math.sin(this.X0);
    }
  } // Stereographic forward equations--mapping lat,long to x,y

  function forward$6(p) {
    var lon = p.x;
    var lat = p.y;
    var sinlat = Math.sin(lat);
    var coslat = Math.cos(lat);
    var A, X, sinX, cosX, ts, rh;
    var dlon = adjust_lon(lon - this.long0);

    if (Math.abs(Math.abs(lon - this.long0) - Math.PI) <= EPSLN && Math.abs(lat + this.lat0) <= EPSLN) {
      //case of the origine point
      //trace('stere:this is the origin point');
      p.x = NaN;
      p.y = NaN;
      return p;
    }

    if (this.sphere) {
      //trace('stere:sphere case');
      A = 2 * this.k0 / (1 + this.sinlat0 * sinlat + this.coslat0 * coslat * Math.cos(dlon));
      p.x = this.a * A * coslat * Math.sin(dlon) + this.x0;
      p.y = this.a * A * (this.coslat0 * sinlat - this.sinlat0 * coslat * Math.cos(dlon)) + this.y0;
      return p;
    } else {
      X = 2 * Math.atan(this.ssfn_(lat, sinlat, this.e)) - HALF_PI;
      cosX = Math.cos(X);
      sinX = Math.sin(X);

      if (Math.abs(this.coslat0) <= EPSLN) {
        ts = tsfnz(this.e, lat * this.con, this.con * sinlat);
        rh = 2 * this.a * this.k0 * ts / this.cons;
        p.x = this.x0 + rh * Math.sin(lon - this.long0);
        p.y = this.y0 - this.con * rh * Math.cos(lon - this.long0); //trace(p.toString());

        return p;
      } else if (Math.abs(this.sinlat0) < EPSLN) {
        //Eq
        //trace('stere:equateur');
        A = 2 * this.a * this.k0 / (1 + cosX * Math.cos(dlon));
        p.y = A * sinX;
      } else {
        //other case
        //trace('stere:normal case');
        A = 2 * this.a * this.k0 * this.ms1 / (this.cosX0 * (1 + this.sinX0 * sinX + this.cosX0 * cosX * Math.cos(dlon)));
        p.y = A * (this.cosX0 * sinX - this.sinX0 * cosX * Math.cos(dlon)) + this.y0;
      }

      p.x = A * cosX * Math.sin(dlon) + this.x0;
    } //trace(p.toString());


    return p;
  } //* Stereographic inverse equations--mapping x,y to lat/long

  function inverse$6(p) {
    p.x -= this.x0;
    p.y -= this.y0;
    var lon, lat, ts, ce, Chi;
    var rh = Math.sqrt(p.x * p.x + p.y * p.y);

    if (this.sphere) {
      var c = 2 * Math.atan(rh / (2 * this.a * this.k0));
      lon = this.long0;
      lat = this.lat0;

      if (rh <= EPSLN) {
        p.x = lon;
        p.y = lat;
        return p;
      }

      lat = Math.asin(Math.cos(c) * this.sinlat0 + p.y * Math.sin(c) * this.coslat0 / rh);

      if (Math.abs(this.coslat0) < EPSLN) {
        if (this.lat0 > 0) {
          lon = adjust_lon(this.long0 + Math.atan2(p.x, -1 * p.y));
        } else {
          lon = adjust_lon(this.long0 + Math.atan2(p.x, p.y));
        }
      } else {
        lon = adjust_lon(this.long0 + Math.atan2(p.x * Math.sin(c), rh * this.coslat0 * Math.cos(c) - p.y * this.sinlat0 * Math.sin(c)));
      }

      p.x = lon;
      p.y = lat;
      return p;
    } else {
      if (Math.abs(this.coslat0) <= EPSLN) {
        if (rh <= EPSLN) {
          lat = this.lat0;
          lon = this.long0;
          p.x = lon;
          p.y = lat; //trace(p.toString());

          return p;
        }

        p.x *= this.con;
        p.y *= this.con;
        ts = rh * this.cons / (2 * this.a * this.k0);
        lat = this.con * phi2z(this.e, ts);
        lon = this.con * adjust_lon(this.con * this.long0 + Math.atan2(p.x, -1 * p.y));
      } else {
        ce = 2 * Math.atan(rh * this.cosX0 / (2 * this.a * this.k0 * this.ms1));
        lon = this.long0;

        if (rh <= EPSLN) {
          Chi = this.X0;
        } else {
          Chi = Math.asin(Math.cos(ce) * this.sinX0 + p.y * Math.sin(ce) * this.cosX0 / rh);
          lon = adjust_lon(this.long0 + Math.atan2(p.x * Math.sin(ce), rh * this.cosX0 * Math.cos(ce) - p.y * this.sinX0 * Math.sin(ce)));
        }

        lat = -1 * phi2z(this.e, Math.tan(0.5 * (HALF_PI + Chi)));
      }
    }

    p.x = lon;
    p.y = lat; //trace(p.toString());

    return p;
  }
  var names$8 = ["stere", "Stereographic_South_Pole", "Polar Stereographic (variant B)"];
  var stere = {
    init: init$8,
    forward: forward$6,
    inverse: inverse$6,
    names: names$8,
    ssfn_: ssfn_
  };

  /*
    references:
      Formules et constantes pour le Calcul pour la
      projection cylindrique conforme à axe oblique et pour la transformation entre
      des systèmes de référence.
      http://www.swisstopo.admin.ch/internet/swisstopo/fr/home/topics/survey/sys/refsys/switzerland.parsysrelated1.31216.downloadList.77004.DownloadFile.tmp/swissprojectionfr.pdf
    */
  function init$9() {
    var phy0 = this.lat0;
    this.lambda0 = this.long0;
    var sinPhy0 = Math.sin(phy0);
    var semiMajorAxis = this.a;
    var invF = this.rf;
    var flattening = 1 / invF;
    var e2 = 2 * flattening - Math.pow(flattening, 2);
    var e = this.e = Math.sqrt(e2);
    this.R = this.k0 * semiMajorAxis * Math.sqrt(1 - e2) / (1 - e2 * Math.pow(sinPhy0, 2));
    this.alpha = Math.sqrt(1 + e2 / (1 - e2) * Math.pow(Math.cos(phy0), 4));
    this.b0 = Math.asin(sinPhy0 / this.alpha);
    var k1 = Math.log(Math.tan(Math.PI / 4 + this.b0 / 2));
    var k2 = Math.log(Math.tan(Math.PI / 4 + phy0 / 2));
    var k3 = Math.log((1 + e * sinPhy0) / (1 - e * sinPhy0));
    this.K = k1 - this.alpha * k2 + this.alpha * e / 2 * k3;
  }
  function forward$7(p) {
    var Sa1 = Math.log(Math.tan(Math.PI / 4 - p.y / 2));
    var Sa2 = this.e / 2 * Math.log((1 + this.e * Math.sin(p.y)) / (1 - this.e * Math.sin(p.y)));
    var S = -this.alpha * (Sa1 + Sa2) + this.K; // spheric latitude

    var b = 2 * (Math.atan(Math.exp(S)) - Math.PI / 4); // spheric longitude

    var I = this.alpha * (p.x - this.lambda0); // psoeudo equatorial rotation

    var rotI = Math.atan(Math.sin(I) / (Math.sin(this.b0) * Math.tan(b) + Math.cos(this.b0) * Math.cos(I)));
    var rotB = Math.asin(Math.cos(this.b0) * Math.sin(b) - Math.sin(this.b0) * Math.cos(b) * Math.cos(I));
    p.y = this.R / 2 * Math.log((1 + Math.sin(rotB)) / (1 - Math.sin(rotB))) + this.y0;
    p.x = this.R * rotI + this.x0;
    return p;
  }
  function inverse$7(p) {
    var Y = p.x - this.x0;
    var X = p.y - this.y0;
    var rotI = Y / this.R;
    var rotB = 2 * (Math.atan(Math.exp(X / this.R)) - Math.PI / 4);
    var b = Math.asin(Math.cos(this.b0) * Math.sin(rotB) + Math.sin(this.b0) * Math.cos(rotB) * Math.cos(rotI));
    var I = Math.atan(Math.sin(rotI) / (Math.cos(this.b0) * Math.cos(rotI) - Math.sin(this.b0) * Math.tan(rotB)));
    var lambda = this.lambda0 + I / this.alpha;
    var S = 0;
    var phy = b;
    var prevPhy = -1000;
    var iteration = 0;

    while (Math.abs(phy - prevPhy) > 0.0000001) {
      if (++iteration > 20) {
        //...reportError("omercFwdInfinity");
        return;
      } //S = Math.log(Math.tan(Math.PI / 4 + phy / 2));


      S = 1 / this.alpha * (Math.log(Math.tan(Math.PI / 4 + b / 2)) - this.K) + this.e * Math.log(Math.tan(Math.PI / 4 + Math.asin(this.e * Math.sin(phy)) / 2));
      prevPhy = phy;
      phy = 2 * Math.atan(Math.exp(S)) - Math.PI / 2;
    }

    p.x = lambda;
    p.y = phy;
    return p;
  }
  var names$9 = ["somerc"];
  var somerc = {
    init: init$9,
    forward: forward$7,
    inverse: inverse$7,
    names: names$9
  };

  /* Initialize the Oblique Mercator  projection
      ------------------------------------------*/

  function init$a() {
    this.no_off = this.no_off || false;
    this.no_rot = this.no_rot || false;

    if (isNaN(this.k0)) {
      this.k0 = 1;
    }

    var sinlat = Math.sin(this.lat0);
    var coslat = Math.cos(this.lat0);
    var con = this.e * sinlat;
    this.bl = Math.sqrt(1 + this.es / (1 - this.es) * Math.pow(coslat, 4));
    this.al = this.a * this.bl * this.k0 * Math.sqrt(1 - this.es) / (1 - con * con);
    var t0 = tsfnz(this.e, this.lat0, sinlat);
    var dl = this.bl / coslat * Math.sqrt((1 - this.es) / (1 - con * con));

    if (dl * dl < 1) {
      dl = 1;
    }

    var fl;
    var gl;

    if (!isNaN(this.longc)) {
      //Central point and azimuth method
      if (this.lat0 >= 0) {
        fl = dl + Math.sqrt(dl * dl - 1);
      } else {
        fl = dl - Math.sqrt(dl * dl - 1);
      }

      this.el = fl * Math.pow(t0, this.bl);
      gl = 0.5 * (fl - 1 / fl);
      this.gamma0 = Math.asin(Math.sin(this.alpha) / dl);
      this.long0 = this.longc - Math.asin(gl * Math.tan(this.gamma0)) / this.bl;
    } else {
      //2 points method
      var t1 = tsfnz(this.e, this.lat1, Math.sin(this.lat1));
      var t2 = tsfnz(this.e, this.lat2, Math.sin(this.lat2));

      if (this.lat0 >= 0) {
        this.el = (dl + Math.sqrt(dl * dl - 1)) * Math.pow(t0, this.bl);
      } else {
        this.el = (dl - Math.sqrt(dl * dl - 1)) * Math.pow(t0, this.bl);
      }

      var hl = Math.pow(t1, this.bl);
      var ll = Math.pow(t2, this.bl);
      fl = this.el / hl;
      gl = 0.5 * (fl - 1 / fl);
      var jl = (this.el * this.el - ll * hl) / (this.el * this.el + ll * hl);
      var pl = (ll - hl) / (ll + hl);
      var dlon12 = adjust_lon(this.long1 - this.long2);
      this.long0 = 0.5 * (this.long1 + this.long2) - Math.atan(jl * Math.tan(0.5 * this.bl * dlon12) / pl) / this.bl;
      this.long0 = adjust_lon(this.long0);
      var dlon10 = adjust_lon(this.long1 - this.long0);
      this.gamma0 = Math.atan(Math.sin(this.bl * dlon10) / gl);
      this.alpha = Math.asin(dl * Math.sin(this.gamma0));
    }

    if (this.no_off) {
      this.uc = 0;
    } else {
      if (this.lat0 >= 0) {
        this.uc = this.al / this.bl * Math.atan2(Math.sqrt(dl * dl - 1), Math.cos(this.alpha));
      } else {
        this.uc = -1 * this.al / this.bl * Math.atan2(Math.sqrt(dl * dl - 1), Math.cos(this.alpha));
      }
    }
  }
  /* Oblique Mercator forward equations--mapping lat,long to x,y
      ----------------------------------------------------------*/

  function forward$8(p) {
    var lon = p.x;
    var lat = p.y;
    var dlon = adjust_lon(lon - this.long0);
    var us, vs;
    var con;

    if (Math.abs(Math.abs(lat) - HALF_PI) <= EPSLN) {
      if (lat > 0) {
        con = -1;
      } else {
        con = 1;
      }

      vs = this.al / this.bl * Math.log(Math.tan(FORTPI + con * this.gamma0 * 0.5));
      us = -1 * con * HALF_PI * this.al / this.bl;
    } else {
      var t = tsfnz(this.e, lat, Math.sin(lat));
      var ql = this.el / Math.pow(t, this.bl);
      var sl = 0.5 * (ql - 1 / ql);
      var tl = 0.5 * (ql + 1 / ql);
      var vl = Math.sin(this.bl * dlon);
      var ul = (sl * Math.sin(this.gamma0) - vl * Math.cos(this.gamma0)) / tl;

      if (Math.abs(Math.abs(ul) - 1) <= EPSLN) {
        vs = Number.POSITIVE_INFINITY;
      } else {
        vs = 0.5 * this.al * Math.log((1 - ul) / (1 + ul)) / this.bl;
      }

      if (Math.abs(Math.cos(this.bl * dlon)) <= EPSLN) {
        us = this.al * this.bl * dlon;
      } else {
        us = this.al * Math.atan2(sl * Math.cos(this.gamma0) + vl * Math.sin(this.gamma0), Math.cos(this.bl * dlon)) / this.bl;
      }
    }

    if (this.no_rot) {
      p.x = this.x0 + us;
      p.y = this.y0 + vs;
    } else {
      us -= this.uc;
      p.x = this.x0 + vs * Math.cos(this.alpha) + us * Math.sin(this.alpha);
      p.y = this.y0 + us * Math.cos(this.alpha) - vs * Math.sin(this.alpha);
    }

    return p;
  }
  function inverse$8(p) {
    var us, vs;

    if (this.no_rot) {
      vs = p.y - this.y0;
      us = p.x - this.x0;
    } else {
      vs = (p.x - this.x0) * Math.cos(this.alpha) - (p.y - this.y0) * Math.sin(this.alpha);
      us = (p.y - this.y0) * Math.cos(this.alpha) + (p.x - this.x0) * Math.sin(this.alpha);
      us += this.uc;
    }

    var qp = Math.exp(-1 * this.bl * vs / this.al);
    var sp = 0.5 * (qp - 1 / qp);
    var tp = 0.5 * (qp + 1 / qp);
    var vp = Math.sin(this.bl * us / this.al);
    var up = (vp * Math.cos(this.gamma0) + sp * Math.sin(this.gamma0)) / tp;
    var ts = Math.pow(this.el / Math.sqrt((1 + up) / (1 - up)), 1 / this.bl);

    if (Math.abs(up - 1) < EPSLN) {
      p.x = this.long0;
      p.y = HALF_PI;
    } else if (Math.abs(up + 1) < EPSLN) {
      p.x = this.long0;
      p.y = -1 * HALF_PI;
    } else {
      p.y = phi2z(this.e, ts);
      p.x = adjust_lon(this.long0 - Math.atan2(sp * Math.cos(this.gamma0) - vp * Math.sin(this.gamma0), Math.cos(this.bl * us / this.al)) / this.bl);
    }

    return p;
  }
  var names$a = ["Hotine_Oblique_Mercator", "Hotine Oblique Mercator", "Hotine_Oblique_Mercator_Azimuth_Natural_Origin", "Hotine_Oblique_Mercator_Azimuth_Center", "omerc"];
  var omerc = {
    init: init$a,
    forward: forward$8,
    inverse: inverse$8,
    names: names$a
  };

  function init$b() {
    // array of:  r_maj,r_min,lat1,lat2,c_lon,c_lat,false_east,false_north
    //double c_lat;                   /* center latitude                      */
    //double c_lon;                   /* center longitude                     */
    //double lat1;                    /* first standard parallel              */
    //double lat2;                    /* second standard parallel             */
    //double r_maj;                   /* major axis                           */
    //double r_min;                   /* minor axis                           */
    //double false_east;              /* x offset in meters                   */
    //double false_north;             /* y offset in meters                   */
    if (!this.lat2) {
      this.lat2 = this.lat1;
    } //if lat2 is not defined


    if (!this.k0) {
      this.k0 = 1;
    }

    this.x0 = this.x0 || 0;
    this.y0 = this.y0 || 0; // Standard Parallels cannot be equal and on opposite sides of the equator

    if (Math.abs(this.lat1 + this.lat2) < EPSLN) {
      return;
    }

    var temp = this.b / this.a;
    this.e = Math.sqrt(1 - temp * temp);
    var sin1 = Math.sin(this.lat1);
    var cos1 = Math.cos(this.lat1);
    var ms1 = msfnz(this.e, sin1, cos1);
    var ts1 = tsfnz(this.e, this.lat1, sin1);
    var sin2 = Math.sin(this.lat2);
    var cos2 = Math.cos(this.lat2);
    var ms2 = msfnz(this.e, sin2, cos2);
    var ts2 = tsfnz(this.e, this.lat2, sin2);
    var ts0 = tsfnz(this.e, this.lat0, Math.sin(this.lat0));

    if (Math.abs(this.lat1 - this.lat2) > EPSLN) {
      this.ns = Math.log(ms1 / ms2) / Math.log(ts1 / ts2);
    } else {
      this.ns = sin1;
    }

    if (isNaN(this.ns)) {
      this.ns = sin1;
    }

    this.f0 = ms1 / (this.ns * Math.pow(ts1, this.ns));
    this.rh = this.a * this.f0 * Math.pow(ts0, this.ns);

    if (!this.title) {
      this.title = "Lambert Conformal Conic";
    }
  } // Lambert Conformal conic forward equations--mapping lat,long to x,y
  // -----------------------------------------------------------------

  function forward$9(p) {
    var lon = p.x;
    var lat = p.y; // singular cases :

    if (Math.abs(2 * Math.abs(lat) - Math.PI) <= EPSLN) {
      lat = sign(lat) * (HALF_PI - 2 * EPSLN);
    }

    var con = Math.abs(Math.abs(lat) - HALF_PI);
    var ts, rh1;

    if (con > EPSLN) {
      ts = tsfnz(this.e, lat, Math.sin(lat));
      rh1 = this.a * this.f0 * Math.pow(ts, this.ns);
    } else {
      con = lat * this.ns;

      if (con <= 0) {
        return null;
      }

      rh1 = 0;
    }

    var theta = this.ns * adjust_lon(lon - this.long0);
    p.x = this.k0 * (rh1 * Math.sin(theta)) + this.x0;
    p.y = this.k0 * (this.rh - rh1 * Math.cos(theta)) + this.y0;
    return p;
  } // Lambert Conformal Conic inverse equations--mapping x,y to lat/long
  // -----------------------------------------------------------------

  function inverse$9(p) {
    var rh1, con, ts;
    var lat, lon;
    var x = (p.x - this.x0) / this.k0;
    var y = this.rh - (p.y - this.y0) / this.k0;

    if (this.ns > 0) {
      rh1 = Math.sqrt(x * x + y * y);
      con = 1;
    } else {
      rh1 = -Math.sqrt(x * x + y * y);
      con = -1;
    }

    var theta = 0;

    if (rh1 !== 0) {
      theta = Math.atan2(con * x, con * y);
    }

    if (rh1 !== 0 || this.ns > 0) {
      con = 1 / this.ns;
      ts = Math.pow(rh1 / (this.a * this.f0), con);
      lat = phi2z(this.e, ts);

      if (lat === -9999) {
        return null;
      }
    } else {
      lat = -HALF_PI;
    }

    lon = adjust_lon(theta / this.ns + this.long0);
    p.x = lon;
    p.y = lat;
    return p;
  }
  var names$b = ["Lambert Tangential Conformal Conic Projection", "Lambert_Conformal_Conic", "Lambert_Conformal_Conic_2SP", "lcc"];
  var lcc = {
    init: init$b,
    forward: forward$9,
    inverse: inverse$9,
    names: names$b
  };

  function init$c() {
    this.a = 6377397.155;
    this.es = 0.006674372230614;
    this.e = Math.sqrt(this.es);

    if (!this.lat0) {
      this.lat0 = 0.863937979737193;
    }

    if (!this.long0) {
      this.long0 = 0.7417649320975901 - 0.308341501185665;
    }
    /* if scale not set default to 0.9999 */


    if (!this.k0) {
      this.k0 = 0.9999;
    }

    this.s45 = 0.785398163397448;
    /* 45 */

    this.s90 = 2 * this.s45;
    this.fi0 = this.lat0;
    this.e2 = this.es;
    this.e = Math.sqrt(this.e2);
    this.alfa = Math.sqrt(1 + this.e2 * Math.pow(Math.cos(this.fi0), 4) / (1 - this.e2));
    this.uq = 1.04216856380474;
    this.u0 = Math.asin(Math.sin(this.fi0) / this.alfa);
    this.g = Math.pow((1 + this.e * Math.sin(this.fi0)) / (1 - this.e * Math.sin(this.fi0)), this.alfa * this.e / 2);
    this.k = Math.tan(this.u0 / 2 + this.s45) / Math.pow(Math.tan(this.fi0 / 2 + this.s45), this.alfa) * this.g;
    this.k1 = this.k0;
    this.n0 = this.a * Math.sqrt(1 - this.e2) / (1 - this.e2 * Math.pow(Math.sin(this.fi0), 2));
    this.s0 = 1.37008346281555;
    this.n = Math.sin(this.s0);
    this.ro0 = this.k1 * this.n0 / Math.tan(this.s0);
    this.ad = this.s90 - this.uq;
  }
  /* ellipsoid */

  /* calculate xy from lat/lon */

  /* Constants, identical to inverse transform function */

  function forward$a(p) {
    var gfi, u, deltav, s, d, eps, ro;
    var lon = p.x;
    var lat = p.y;
    var delta_lon = adjust_lon(lon - this.long0);
    /* Transformation */

    gfi = Math.pow((1 + this.e * Math.sin(lat)) / (1 - this.e * Math.sin(lat)), this.alfa * this.e / 2);
    u = 2 * (Math.atan(this.k * Math.pow(Math.tan(lat / 2 + this.s45), this.alfa) / gfi) - this.s45);
    deltav = -delta_lon * this.alfa;
    s = Math.asin(Math.cos(this.ad) * Math.sin(u) + Math.sin(this.ad) * Math.cos(u) * Math.cos(deltav));
    d = Math.asin(Math.cos(u) * Math.sin(deltav) / Math.cos(s));
    eps = this.n * d;
    ro = this.ro0 * Math.pow(Math.tan(this.s0 / 2 + this.s45), this.n) / Math.pow(Math.tan(s / 2 + this.s45), this.n);
    p.y = ro * Math.cos(eps) / 1;
    p.x = ro * Math.sin(eps) / 1;

    if (!this.czech) {
      p.y *= -1;
      p.x *= -1;
    }

    return p;
  }
  /* calculate lat/lon from xy */

  function inverse$a(p) {
    var u, deltav, s, d, eps, ro, fi1;
    var ok;
    /* Transformation */

    /* revert y, x*/

    var tmp = p.x;
    p.x = p.y;
    p.y = tmp;

    if (!this.czech) {
      p.y *= -1;
      p.x *= -1;
    }

    ro = Math.sqrt(p.x * p.x + p.y * p.y);
    eps = Math.atan2(p.y, p.x);
    d = eps / Math.sin(this.s0);
    s = 2 * (Math.atan(Math.pow(this.ro0 / ro, 1 / this.n) * Math.tan(this.s0 / 2 + this.s45)) - this.s45);
    u = Math.asin(Math.cos(this.ad) * Math.sin(s) - Math.sin(this.ad) * Math.cos(s) * Math.cos(d));
    deltav = Math.asin(Math.cos(s) * Math.sin(d) / Math.cos(u));
    p.x = this.long0 - deltav / this.alfa;
    fi1 = u;
    ok = 0;
    var iter = 0;

    do {
      p.y = 2 * (Math.atan(Math.pow(this.k, -1 / this.alfa) * Math.pow(Math.tan(u / 2 + this.s45), 1 / this.alfa) * Math.pow((1 + this.e * Math.sin(fi1)) / (1 - this.e * Math.sin(fi1)), this.e / 2)) - this.s45);

      if (Math.abs(fi1 - p.y) < 0.0000000001) {
        ok = 1;
      }

      fi1 = p.y;
      iter += 1;
    } while (ok === 0 && iter < 15);

    if (iter >= 15) {
      return null;
    }

    return p;
  }
  var names$c = ["Krovak", "krovak"];
  var krovak = {
    init: init$c,
    forward: forward$a,
    inverse: inverse$a,
    names: names$c
  };

  function mlfn (e0, e1, e2, e3, phi) {
    return e0 * phi - e1 * Math.sin(2 * phi) + e2 * Math.sin(4 * phi) - e3 * Math.sin(6 * phi);
  }

  function e0fn (x) {
    return 1 - 0.25 * x * (1 + x / 16 * (3 + 1.25 * x));
  }

  function e1fn (x) {
    return 0.375 * x * (1 + 0.25 * x * (1 + 0.46875 * x));
  }

  function e2fn (x) {
    return 0.05859375 * x * x * (1 + 0.75 * x);
  }

  function e3fn (x) {
    return x * x * x * (35 / 3072);
  }

  function gN (a, e, sinphi) {
    var temp = e * sinphi;
    return a / Math.sqrt(1 - temp * temp);
  }

  function adjust_lat (x) {
    return Math.abs(x) < HALF_PI ? x : x - sign(x) * Math.PI;
  }

  function imlfn (ml, e0, e1, e2, e3) {
    var phi;
    var dphi;
    phi = ml / e0;

    for (var i = 0; i < 15; i++) {
      dphi = (ml - (e0 * phi - e1 * Math.sin(2 * phi) + e2 * Math.sin(4 * phi) - e3 * Math.sin(6 * phi))) / (e0 - 2 * e1 * Math.cos(2 * phi) + 4 * e2 * Math.cos(4 * phi) - 6 * e3 * Math.cos(6 * phi));
      phi += dphi;

      if (Math.abs(dphi) <= 0.0000000001) {
        return phi;
      }
    } //..reportError("IMLFN-CONV:Latitude failed to converge after 15 iterations");


    return NaN;
  }

  function init$d() {
    if (!this.sphere) {
      this.e0 = e0fn(this.es);
      this.e1 = e1fn(this.es);
      this.e2 = e2fn(this.es);
      this.e3 = e3fn(this.es);
      this.ml0 = this.a * mlfn(this.e0, this.e1, this.e2, this.e3, this.lat0);
    }
  }
  /* Cassini forward equations--mapping lat,long to x,y
    -----------------------------------------------------------------------*/

  function forward$b(p) {
    /* Forward equations
        -----------------*/
    var x, y;
    var lam = p.x;
    var phi = p.y;
    lam = adjust_lon(lam - this.long0);

    if (this.sphere) {
      x = this.a * Math.asin(Math.cos(phi) * Math.sin(lam));
      y = this.a * (Math.atan2(Math.tan(phi), Math.cos(lam)) - this.lat0);
    } else {
      //ellipsoid
      var sinphi = Math.sin(phi);
      var cosphi = Math.cos(phi);
      var nl = gN(this.a, this.e, sinphi);
      var tl = Math.tan(phi) * Math.tan(phi);
      var al = lam * Math.cos(phi);
      var asq = al * al;
      var cl = this.es * cosphi * cosphi / (1 - this.es);
      var ml = this.a * mlfn(this.e0, this.e1, this.e2, this.e3, phi);
      x = nl * al * (1 - asq * tl * (1 / 6 - (8 - tl + 8 * cl) * asq / 120));
      y = ml - this.ml0 + nl * sinphi / cosphi * asq * (0.5 + (5 - tl + 6 * cl) * asq / 24);
    }

    p.x = x + this.x0;
    p.y = y + this.y0;
    return p;
  }
  /* Inverse equations
    -----------------*/

  function inverse$b(p) {
    p.x -= this.x0;
    p.y -= this.y0;
    var x = p.x / this.a;
    var y = p.y / this.a;
    var phi, lam;

    if (this.sphere) {
      var dd = y + this.lat0;
      phi = Math.asin(Math.sin(dd) * Math.cos(x));
      lam = Math.atan2(Math.tan(x), Math.cos(dd));
    } else {
      /* ellipsoid */
      var ml1 = this.ml0 / this.a + y;
      var phi1 = imlfn(ml1, this.e0, this.e1, this.e2, this.e3);

      if (Math.abs(Math.abs(phi1) - HALF_PI) <= EPSLN) {
        p.x = this.long0;
        p.y = HALF_PI;

        if (y < 0) {
          p.y *= -1;
        }

        return p;
      }

      var nl1 = gN(this.a, this.e, Math.sin(phi1));
      var rl1 = nl1 * nl1 * nl1 / this.a / this.a * (1 - this.es);
      var tl1 = Math.pow(Math.tan(phi1), 2);
      var dl = x * this.a / nl1;
      var dsq = dl * dl;
      phi = phi1 - nl1 * Math.tan(phi1) / rl1 * dl * dl * (0.5 - (1 + 3 * tl1) * dl * dl / 24);
      lam = dl * (1 - dsq * (tl1 / 3 + (1 + 3 * tl1) * tl1 * dsq / 15)) / Math.cos(phi1);
    }

    p.x = adjust_lon(lam + this.long0);
    p.y = adjust_lat(phi);
    return p;
  }
  var names$d = ["Cassini", "Cassini_Soldner", "cass"];
  var cass = {
    init: init$d,
    forward: forward$b,
    inverse: inverse$b,
    names: names$d
  };

  function qsfnz (eccent, sinphi) {
    var con;

    if (eccent > 1.0e-7) {
      con = eccent * sinphi;
      return (1 - eccent * eccent) * (sinphi / (1 - con * con) - 0.5 / eccent * Math.log((1 - con) / (1 + con)));
    } else {
      return 2 * sinphi;
    }
  }

  /*
    reference
      "New Equal-Area Map Projections for Noncircular Regions", John P. Snyder,
      The American Cartographer, Vol 15, No. 4, October 1988, pp. 341-355.
    */

  var S_POLE = 1;
  var N_POLE = 2;
  var EQUIT = 3;
  var OBLIQ = 4;
  /* Initialize the Lambert Azimuthal Equal Area projection
    ------------------------------------------------------*/

  function init$e() {
    var t = Math.abs(this.lat0);

    if (Math.abs(t - HALF_PI) < EPSLN) {
      this.mode = this.lat0 < 0 ? this.S_POLE : this.N_POLE;
    } else if (Math.abs(t) < EPSLN) {
      this.mode = this.EQUIT;
    } else {
      this.mode = this.OBLIQ;
    }

    if (this.es > 0) {
      var sinphi;
      this.qp = qsfnz(this.e, 1);
      this.mmf = 0.5 / (1 - this.es);
      this.apa = authset(this.es);

      switch (this.mode) {
        case this.N_POLE:
          this.dd = 1;
          break;

        case this.S_POLE:
          this.dd = 1;
          break;

        case this.EQUIT:
          this.rq = Math.sqrt(0.5 * this.qp);
          this.dd = 1 / this.rq;
          this.xmf = 1;
          this.ymf = 0.5 * this.qp;
          break;

        case this.OBLIQ:
          this.rq = Math.sqrt(0.5 * this.qp);
          sinphi = Math.sin(this.lat0);
          this.sinb1 = qsfnz(this.e, sinphi) / this.qp;
          this.cosb1 = Math.sqrt(1 - this.sinb1 * this.sinb1);
          this.dd = Math.cos(this.lat0) / (Math.sqrt(1 - this.es * sinphi * sinphi) * this.rq * this.cosb1);
          this.ymf = (this.xmf = this.rq) / this.dd;
          this.xmf *= this.dd;
          break;
      }
    } else {
      if (this.mode === this.OBLIQ) {
        this.sinph0 = Math.sin(this.lat0);
        this.cosph0 = Math.cos(this.lat0);
      }
    }
  }
  /* Lambert Azimuthal Equal Area forward equations--mapping lat,long to x,y
    -----------------------------------------------------------------------*/

  function forward$c(p) {
    /* Forward equations
        -----------------*/
    var x, y, coslam, sinlam, sinphi, q, sinb, cosb, b, cosphi;
    var lam = p.x;
    var phi = p.y;
    lam = adjust_lon(lam - this.long0);

    if (this.sphere) {
      sinphi = Math.sin(phi);
      cosphi = Math.cos(phi);
      coslam = Math.cos(lam);

      if (this.mode === this.OBLIQ || this.mode === this.EQUIT) {
        y = this.mode === this.EQUIT ? 1 + cosphi * coslam : 1 + this.sinph0 * sinphi + this.cosph0 * cosphi * coslam;

        if (y <= EPSLN) {
          return null;
        }

        y = Math.sqrt(2 / y);
        x = y * cosphi * Math.sin(lam);
        y *= this.mode === this.EQUIT ? sinphi : this.cosph0 * sinphi - this.sinph0 * cosphi * coslam;
      } else if (this.mode === this.N_POLE || this.mode === this.S_POLE) {
        if (this.mode === this.N_POLE) {
          coslam = -coslam;
        }

        if (Math.abs(phi + this.lat0) < EPSLN) {
          return null;
        }

        y = FORTPI - phi * 0.5;
        y = 2 * (this.mode === this.S_POLE ? Math.cos(y) : Math.sin(y));
        x = y * Math.sin(lam);
        y *= coslam;
      }
    } else {
      sinb = 0;
      cosb = 0;
      b = 0;
      coslam = Math.cos(lam);
      sinlam = Math.sin(lam);
      sinphi = Math.sin(phi);
      q = qsfnz(this.e, sinphi);

      if (this.mode === this.OBLIQ || this.mode === this.EQUIT) {
        sinb = q / this.qp;
        cosb = Math.sqrt(1 - sinb * sinb);
      }

      switch (this.mode) {
        case this.OBLIQ:
          b = 1 + this.sinb1 * sinb + this.cosb1 * cosb * coslam;
          break;

        case this.EQUIT:
          b = 1 + cosb * coslam;
          break;

        case this.N_POLE:
          b = HALF_PI + phi;
          q = this.qp - q;
          break;

        case this.S_POLE:
          b = phi - HALF_PI;
          q = this.qp + q;
          break;
      }

      if (Math.abs(b) < EPSLN) {
        return null;
      }

      switch (this.mode) {
        case this.OBLIQ:
        case this.EQUIT:
          b = Math.sqrt(2 / b);

          if (this.mode === this.OBLIQ) {
            y = this.ymf * b * (this.cosb1 * sinb - this.sinb1 * cosb * coslam);
          } else {
            y = (b = Math.sqrt(2 / (1 + cosb * coslam))) * sinb * this.ymf;
          }

          x = this.xmf * b * cosb * sinlam;
          break;

        case this.N_POLE:
        case this.S_POLE:
          if (q >= 0) {
            x = (b = Math.sqrt(q)) * sinlam;
            y = coslam * (this.mode === this.S_POLE ? b : -b);
          } else {
            x = y = 0;
          }

          break;
      }
    }

    p.x = this.a * x + this.x0;
    p.y = this.a * y + this.y0;
    return p;
  }
  /* Inverse equations
    -----------------*/

  function inverse$c(p) {
    p.x -= this.x0;
    p.y -= this.y0;
    var x = p.x / this.a;
    var y = p.y / this.a;
    var lam, phi, cCe, sCe, q, rho, ab;

    if (this.sphere) {
      var cosz = 0,
          rh,
          sinz = 0;
      rh = Math.sqrt(x * x + y * y);
      phi = rh * 0.5;

      if (phi > 1) {
        return null;
      }

      phi = 2 * Math.asin(phi);

      if (this.mode === this.OBLIQ || this.mode === this.EQUIT) {
        sinz = Math.sin(phi);
        cosz = Math.cos(phi);
      }

      switch (this.mode) {
        case this.EQUIT:
          phi = Math.abs(rh) <= EPSLN ? 0 : Math.asin(y * sinz / rh);
          x *= sinz;
          y = cosz * rh;
          break;

        case this.OBLIQ:
          phi = Math.abs(rh) <= EPSLN ? this.lat0 : Math.asin(cosz * this.sinph0 + y * sinz * this.cosph0 / rh);
          x *= sinz * this.cosph0;
          y = (cosz - Math.sin(phi) * this.sinph0) * rh;
          break;

        case this.N_POLE:
          y = -y;
          phi = HALF_PI - phi;
          break;

        case this.S_POLE:
          phi -= HALF_PI;
          break;
      }

      lam = y === 0 && (this.mode === this.EQUIT || this.mode === this.OBLIQ) ? 0 : Math.atan2(x, y);
    } else {
      ab = 0;

      if (this.mode === this.OBLIQ || this.mode === this.EQUIT) {
        x /= this.dd;
        y *= this.dd;
        rho = Math.sqrt(x * x + y * y);

        if (rho < EPSLN) {
          p.x = this.long0;
          p.y = this.lat0;
          return p;
        }

        sCe = 2 * Math.asin(0.5 * rho / this.rq);
        cCe = Math.cos(sCe);
        x *= sCe = Math.sin(sCe);

        if (this.mode === this.OBLIQ) {
          ab = cCe * this.sinb1 + y * sCe * this.cosb1 / rho;
          q = this.qp * ab;
          y = rho * this.cosb1 * cCe - y * this.sinb1 * sCe;
        } else {
          ab = y * sCe / rho;
          q = this.qp * ab;
          y = rho * cCe;
        }
      } else if (this.mode === this.N_POLE || this.mode === this.S_POLE) {
        if (this.mode === this.N_POLE) {
          y = -y;
        }

        q = x * x + y * y;

        if (!q) {
          p.x = this.long0;
          p.y = this.lat0;
          return p;
        }

        ab = 1 - q / this.qp;

        if (this.mode === this.S_POLE) {
          ab = -ab;
        }
      }

      lam = Math.atan2(x, y);
      phi = authlat(Math.asin(ab), this.apa);
    }

    p.x = adjust_lon(this.long0 + lam);
    p.y = phi;
    return p;
  }
  /* determine latitude from authalic latitude */

  var P00 = 0.33333333333333333333;
  var P01 = 0.17222222222222222222;
  var P02 = 0.10257936507936507936;
  var P10 = 0.06388888888888888888;
  var P11 = 0.06640211640211640211;
  var P20 = 0.01641501294219154443;

  function authset(es) {
    var t;
    var APA = [];
    APA[0] = es * P00;
    t = es * es;
    APA[0] += t * P01;
    APA[1] = t * P10;
    t *= es;
    APA[0] += t * P02;
    APA[1] += t * P11;
    APA[2] = t * P20;
    return APA;
  }

  function authlat(beta, APA) {
    var t = beta + beta;
    return beta + APA[0] * Math.sin(t) + APA[1] * Math.sin(t + t) + APA[2] * Math.sin(t + t + t);
  }

  var names$e = ["Lambert Azimuthal Equal Area", "Lambert_Azimuthal_Equal_Area", "laea"];
  var laea = {
    init: init$e,
    forward: forward$c,
    inverse: inverse$c,
    names: names$e,
    S_POLE: S_POLE,
    N_POLE: N_POLE,
    EQUIT: EQUIT,
    OBLIQ: OBLIQ
  };

  function asinz (x) {
    if (Math.abs(x) > 1) {
      x = x > 1 ? 1 : -1;
    }

    return Math.asin(x);
  }

  function init$f() {
    if (Math.abs(this.lat1 + this.lat2) < EPSLN) {
      return;
    }

    this.temp = this.b / this.a;
    this.es = 1 - Math.pow(this.temp, 2);
    this.e3 = Math.sqrt(this.es);
    this.sin_po = Math.sin(this.lat1);
    this.cos_po = Math.cos(this.lat1);
    this.t1 = this.sin_po;
    this.con = this.sin_po;
    this.ms1 = msfnz(this.e3, this.sin_po, this.cos_po);
    this.qs1 = qsfnz(this.e3, this.sin_po, this.cos_po);
    this.sin_po = Math.sin(this.lat2);
    this.cos_po = Math.cos(this.lat2);
    this.t2 = this.sin_po;
    this.ms2 = msfnz(this.e3, this.sin_po, this.cos_po);
    this.qs2 = qsfnz(this.e3, this.sin_po, this.cos_po);
    this.sin_po = Math.sin(this.lat0);
    this.cos_po = Math.cos(this.lat0);
    this.t3 = this.sin_po;
    this.qs0 = qsfnz(this.e3, this.sin_po, this.cos_po);

    if (Math.abs(this.lat1 - this.lat2) > EPSLN) {
      this.ns0 = (this.ms1 * this.ms1 - this.ms2 * this.ms2) / (this.qs2 - this.qs1);
    } else {
      this.ns0 = this.con;
    }

    this.c = this.ms1 * this.ms1 + this.ns0 * this.qs1;
    this.rh = this.a * Math.sqrt(this.c - this.ns0 * this.qs0) / this.ns0;
  }
  /* Albers Conical Equal Area forward equations--mapping lat,long to x,y
    -------------------------------------------------------------------*/

  function forward$d(p) {
    var lon = p.x;
    var lat = p.y;
    this.sin_phi = Math.sin(lat);
    this.cos_phi = Math.cos(lat);
    var qs = qsfnz(this.e3, this.sin_phi, this.cos_phi);
    var rh1 = this.a * Math.sqrt(this.c - this.ns0 * qs) / this.ns0;
    var theta = this.ns0 * adjust_lon(lon - this.long0);
    var x = rh1 * Math.sin(theta) + this.x0;
    var y = this.rh - rh1 * Math.cos(theta) + this.y0;
    p.x = x;
    p.y = y;
    return p;
  }
  function inverse$d(p) {
    var rh1, qs, con, theta, lon, lat;
    p.x -= this.x0;
    p.y = this.rh - p.y + this.y0;

    if (this.ns0 >= 0) {
      rh1 = Math.sqrt(p.x * p.x + p.y * p.y);
      con = 1;
    } else {
      rh1 = -Math.sqrt(p.x * p.x + p.y * p.y);
      con = -1;
    }

    theta = 0;

    if (rh1 !== 0) {
      theta = Math.atan2(con * p.x, con * p.y);
    }

    con = rh1 * this.ns0 / this.a;

    if (this.sphere) {
      lat = Math.asin((this.c - con * con) / (2 * this.ns0));
    } else {
      qs = (this.c - con * con) / this.ns0;
      lat = this.phi1z(this.e3, qs);
    }

    lon = adjust_lon(theta / this.ns0 + this.long0);
    p.x = lon;
    p.y = lat;
    return p;
  }
  /* Function to compute phi1, the latitude for the inverse of the
     Albers Conical Equal-Area projection.
  -------------------------------------------*/

  function phi1z(eccent, qs) {
    var sinphi, cosphi, con, com, dphi;
    var phi = asinz(0.5 * qs);

    if (eccent < EPSLN) {
      return phi;
    }

    var eccnts = eccent * eccent;

    for (var i = 1; i <= 25; i++) {
      sinphi = Math.sin(phi);
      cosphi = Math.cos(phi);
      con = eccent * sinphi;
      com = 1 - con * con;
      dphi = 0.5 * com * com / cosphi * (qs / (1 - eccnts) - sinphi / com + 0.5 / eccent * Math.log((1 - con) / (1 + con)));
      phi = phi + dphi;

      if (Math.abs(dphi) <= 1e-7) {
        return phi;
      }
    }

    return null;
  }
  var names$f = ["Albers_Conic_Equal_Area", "Albers", "aea"];
  var aea = {
    init: init$f,
    forward: forward$d,
    inverse: inverse$d,
    names: names$f,
    phi1z: phi1z
  };

  /*
    reference:
      Wolfram Mathworld "Gnomonic Projection"
      http://mathworld.wolfram.com/GnomonicProjection.html
      Accessed: 12th November 2009
    */

  function init$g() {
    /* Place parameters in static storage for common use
        -------------------------------------------------*/
    this.sin_p14 = Math.sin(this.lat0);
    this.cos_p14 = Math.cos(this.lat0); // Approximation for projecting points to the horizon (infinity)

    this.infinity_dist = 1000 * this.a;
    this.rc = 1;
  }
  /* Gnomonic forward equations--mapping lat,long to x,y
      ---------------------------------------------------*/

  function forward$e(p) {
    var sinphi, cosphi;
    /* sin and cos value        */

    var dlon;
    /* delta longitude value      */

    var coslon;
    /* cos of longitude        */

    var ksp;
    /* scale factor          */

    var g;
    var x, y;
    var lon = p.x;
    var lat = p.y;
    /* Forward equations
        -----------------*/

    dlon = adjust_lon(lon - this.long0);
    sinphi = Math.sin(lat);
    cosphi = Math.cos(lat);
    coslon = Math.cos(dlon);
    g = this.sin_p14 * sinphi + this.cos_p14 * cosphi * coslon;
    ksp = 1;

    if (g > 0 || Math.abs(g) <= EPSLN) {
      x = this.x0 + this.a * ksp * cosphi * Math.sin(dlon) / g;
      y = this.y0 + this.a * ksp * (this.cos_p14 * sinphi - this.sin_p14 * cosphi * coslon) / g;
    } else {
      // Point is in the opposing hemisphere and is unprojectable
      // We still need to return a reasonable point, so we project
      // to infinity, on a bearing
      // equivalent to the northern hemisphere equivalent
      // This is a reasonable approximation for short shapes and lines that
      // straddle the horizon.
      x = this.x0 + this.infinity_dist * cosphi * Math.sin(dlon);
      y = this.y0 + this.infinity_dist * (this.cos_p14 * sinphi - this.sin_p14 * cosphi * coslon);
    }

    p.x = x;
    p.y = y;
    return p;
  }
  function inverse$e(p) {
    var rh;
    /* Rho */

    var sinc, cosc;
    var c;
    var lon, lat;
    /* Inverse equations
        -----------------*/

    p.x = (p.x - this.x0) / this.a;
    p.y = (p.y - this.y0) / this.a;
    p.x /= this.k0;
    p.y /= this.k0;

    if (rh = Math.sqrt(p.x * p.x + p.y * p.y)) {
      c = Math.atan2(rh, this.rc);
      sinc = Math.sin(c);
      cosc = Math.cos(c);
      lat = asinz(cosc * this.sin_p14 + p.y * sinc * this.cos_p14 / rh);
      lon = Math.atan2(p.x * sinc, rh * this.cos_p14 * cosc - p.y * this.sin_p14 * sinc);
      lon = adjust_lon(this.long0 + lon);
    } else {
      lat = this.phic0;
      lon = 0;
    }

    p.x = lon;
    p.y = lat;
    return p;
  }
  var names$g = ["gnom"];
  var gnom = {
    init: init$g,
    forward: forward$e,
    inverse: inverse$e,
    names: names$g
  };

  function iqsfnz (eccent, q) {
    var temp = 1 - (1 - eccent * eccent) / (2 * eccent) * Math.log((1 - eccent) / (1 + eccent));

    if (Math.abs(Math.abs(q) - temp) < 1.0E-6) {
      if (q < 0) {
        return -1 * HALF_PI;
      } else {
        return HALF_PI;
      }
    } //var phi = 0.5* q/(1-eccent*eccent);


    var phi = Math.asin(0.5 * q);
    var dphi;
    var sin_phi;
    var cos_phi;
    var con;

    for (var i = 0; i < 30; i++) {
      sin_phi = Math.sin(phi);
      cos_phi = Math.cos(phi);
      con = eccent * sin_phi;
      dphi = Math.pow(1 - con * con, 2) / (2 * cos_phi) * (q / (1 - eccent * eccent) - sin_phi / (1 - con * con) + 0.5 / eccent * Math.log((1 - con) / (1 + con)));
      phi += dphi;

      if (Math.abs(dphi) <= 0.0000000001) {
        return phi;
      }
    } //console.log("IQSFN-CONV:Latitude failed to converge after 30 iterations");


    return NaN;
  }

  /*
    reference:
      "Cartographic Projection Procedures for the UNIX Environment-
      A User's Manual" by Gerald I. Evenden,
      USGS Open File Report 90-284and Release 4 Interim Reports (2003)
  */

  function init$h() {
    //no-op
    if (!this.sphere) {
      this.k0 = msfnz(this.e, Math.sin(this.lat_ts), Math.cos(this.lat_ts));
    }
  }
  /* Cylindrical Equal Area forward equations--mapping lat,long to x,y
      ------------------------------------------------------------*/

  function forward$f(p) {
    var lon = p.x;
    var lat = p.y;
    var x, y;
    /* Forward equations
        -----------------*/

    var dlon = adjust_lon(lon - this.long0);

    if (this.sphere) {
      x = this.x0 + this.a * dlon * Math.cos(this.lat_ts);
      y = this.y0 + this.a * Math.sin(lat) / Math.cos(this.lat_ts);
    } else {
      var qs = qsfnz(this.e, Math.sin(lat));
      x = this.x0 + this.a * this.k0 * dlon;
      y = this.y0 + this.a * qs * 0.5 / this.k0;
    }

    p.x = x;
    p.y = y;
    return p;
  }
  /* Cylindrical Equal Area inverse equations--mapping x,y to lat/long
      ------------------------------------------------------------*/

  function inverse$f(p) {
    p.x -= this.x0;
    p.y -= this.y0;
    var lon, lat;

    if (this.sphere) {
      lon = adjust_lon(this.long0 + p.x / this.a / Math.cos(this.lat_ts));
      lat = Math.asin(p.y / this.a * Math.cos(this.lat_ts));
    } else {
      lat = iqsfnz(this.e, 2 * p.y * this.k0 / this.a);
      lon = adjust_lon(this.long0 + p.x / (this.a * this.k0));
    }

    p.x = lon;
    p.y = lat;
    return p;
  }
  var names$h = ["cea"];
  var cea = {
    init: init$h,
    forward: forward$f,
    inverse: inverse$f,
    names: names$h
  };

  function init$i() {
    this.x0 = this.x0 || 0;
    this.y0 = this.y0 || 0;
    this.lat0 = this.lat0 || 0;
    this.long0 = this.long0 || 0;
    this.lat_ts = this.lat_ts || 0;
    this.title = this.title || "Equidistant Cylindrical (Plate Carre)";
    this.rc = Math.cos(this.lat_ts);
  } // forward equations--mapping lat,long to x,y
  // -----------------------------------------------------------------

  function forward$g(p) {
    var lon = p.x;
    var lat = p.y;
    var dlon = adjust_lon(lon - this.long0);
    var dlat = adjust_lat(lat - this.lat0);
    p.x = this.x0 + this.a * dlon * this.rc;
    p.y = this.y0 + this.a * dlat;
    return p;
  } // inverse equations--mapping x,y to lat/long
  // -----------------------------------------------------------------

  function inverse$g(p) {
    var x = p.x;
    var y = p.y;
    p.x = adjust_lon(this.long0 + (x - this.x0) / (this.a * this.rc));
    p.y = adjust_lat(this.lat0 + (y - this.y0) / this.a);
    return p;
  }
  var names$i = ["Equirectangular", "Equidistant_Cylindrical", "eqc"];
  var eqc = {
    init: init$i,
    forward: forward$g,
    inverse: inverse$g,
    names: names$i
  };

  var MAX_ITER$2 = 20;
  function init$j() {
    /* Place parameters in static storage for common use
        -------------------------------------------------*/
    this.temp = this.b / this.a;
    this.es = 1 - Math.pow(this.temp, 2); // devait etre dans tmerc.js mais n y est pas donc je commente sinon retour de valeurs nulles

    this.e = Math.sqrt(this.es);
    this.e0 = e0fn(this.es);
    this.e1 = e1fn(this.es);
    this.e2 = e2fn(this.es);
    this.e3 = e3fn(this.es);
    this.ml0 = this.a * mlfn(this.e0, this.e1, this.e2, this.e3, this.lat0); //si que des zeros le calcul ne se fait pas
  }
  /* Polyconic forward equations--mapping lat,long to x,y
      ---------------------------------------------------*/

  function forward$h(p) {
    var lon = p.x;
    var lat = p.y;
    var x, y, el;
    var dlon = adjust_lon(lon - this.long0);
    el = dlon * Math.sin(lat);

    if (this.sphere) {
      if (Math.abs(lat) <= EPSLN) {
        x = this.a * dlon;
        y = -1 * this.a * this.lat0;
      } else {
        x = this.a * Math.sin(el) / Math.tan(lat);
        y = this.a * (adjust_lat(lat - this.lat0) + (1 - Math.cos(el)) / Math.tan(lat));
      }
    } else {
      if (Math.abs(lat) <= EPSLN) {
        x = this.a * dlon;
        y = -1 * this.ml0;
      } else {
        var nl = gN(this.a, this.e, Math.sin(lat)) / Math.tan(lat);
        x = nl * Math.sin(el);
        y = this.a * mlfn(this.e0, this.e1, this.e2, this.e3, lat) - this.ml0 + nl * (1 - Math.cos(el));
      }
    }

    p.x = x + this.x0;
    p.y = y + this.y0;
    return p;
  }
  /* Inverse equations
    -----------------*/

  function inverse$h(p) {
    var lon, lat, x, y, i;
    var al, bl;
    var phi, dphi;
    x = p.x - this.x0;
    y = p.y - this.y0;

    if (this.sphere) {
      if (Math.abs(y + this.a * this.lat0) <= EPSLN) {
        lon = adjust_lon(x / this.a + this.long0);
        lat = 0;
      } else {
        al = this.lat0 + y / this.a;
        bl = x * x / this.a / this.a + al * al;
        phi = al;
        var tanphi;

        for (i = MAX_ITER$2; i; --i) {
          tanphi = Math.tan(phi);
          dphi = -1 * (al * (phi * tanphi + 1) - phi - 0.5 * (phi * phi + bl) * tanphi) / ((phi - al) / tanphi - 1);
          phi += dphi;

          if (Math.abs(dphi) <= EPSLN) {
            lat = phi;
            break;
          }
        }

        lon = adjust_lon(this.long0 + Math.asin(x * Math.tan(phi) / this.a) / Math.sin(lat));
      }
    } else {
      if (Math.abs(y + this.ml0) <= EPSLN) {
        lat = 0;
        lon = adjust_lon(this.long0 + x / this.a);
      } else {
        al = (this.ml0 + y) / this.a;
        bl = x * x / this.a / this.a + al * al;
        phi = al;
        var cl, mln, mlnp, ma;
        var con;

        for (i = MAX_ITER$2; i; --i) {
          con = this.e * Math.sin(phi);
          cl = Math.sqrt(1 - con * con) * Math.tan(phi);
          mln = this.a * mlfn(this.e0, this.e1, this.e2, this.e3, phi);
          mlnp = this.e0 - 2 * this.e1 * Math.cos(2 * phi) + 4 * this.e2 * Math.cos(4 * phi) - 6 * this.e3 * Math.cos(6 * phi);
          ma = mln / this.a;
          dphi = (al * (cl * ma + 1) - ma - 0.5 * cl * (ma * ma + bl)) / (this.es * Math.sin(2 * phi) * (ma * ma + bl - 2 * al * ma) / (4 * cl) + (al - ma) * (cl * mlnp - 2 / Math.sin(2 * phi)) - mlnp);
          phi -= dphi;

          if (Math.abs(dphi) <= EPSLN) {
            lat = phi;
            break;
          }
        } //lat=phi4z(this.e,this.e0,this.e1,this.e2,this.e3,al,bl,0,0);


        cl = Math.sqrt(1 - this.es * Math.pow(Math.sin(lat), 2)) * Math.tan(lat);
        lon = adjust_lon(this.long0 + Math.asin(x * cl / this.a) / Math.sin(lat));
      }
    }

    p.x = lon;
    p.y = lat;
    return p;
  }
  var names$j = ["Polyconic", "poly"];
  var poly = {
    init: init$j,
    forward: forward$h,
    inverse: inverse$h,
    names: names$j
  };

  function init$k() {
    this.A = [];
    this.A[1] = 0.6399175073;
    this.A[2] = -0.1358797613;
    this.A[3] = 0.063294409;
    this.A[4] = -0.02526853;
    this.A[5] = 0.0117879;
    this.A[6] = -0.0055161;
    this.A[7] = 0.0026906;
    this.A[8] = -0.001333;
    this.A[9] = 0.00067;
    this.A[10] = -0.00034;
    this.B_re = [];
    this.B_im = [];
    this.B_re[1] = 0.7557853228;
    this.B_im[1] = 0;
    this.B_re[2] = 0.249204646;
    this.B_im[2] = 0.003371507;
    this.B_re[3] = -0.001541739;
    this.B_im[3] = 0.041058560;
    this.B_re[4] = -0.10162907;
    this.B_im[4] = 0.01727609;
    this.B_re[5] = -0.26623489;
    this.B_im[5] = -0.36249218;
    this.B_re[6] = -0.6870983;
    this.B_im[6] = -1.1651967;
    this.C_re = [];
    this.C_im = [];
    this.C_re[1] = 1.3231270439;
    this.C_im[1] = 0;
    this.C_re[2] = -0.577245789;
    this.C_im[2] = -0.007809598;
    this.C_re[3] = 0.508307513;
    this.C_im[3] = -0.112208952;
    this.C_re[4] = -0.15094762;
    this.C_im[4] = 0.18200602;
    this.C_re[5] = 1.01418179;
    this.C_im[5] = 1.64497696;
    this.C_re[6] = 1.9660549;
    this.C_im[6] = 2.5127645;
    this.D = [];
    this.D[1] = 1.5627014243;
    this.D[2] = 0.5185406398;
    this.D[3] = -0.03333098;
    this.D[4] = -0.1052906;
    this.D[5] = -0.0368594;
    this.D[6] = 0.007317;
    this.D[7] = 0.01220;
    this.D[8] = 0.00394;
    this.D[9] = -0.0013;
  }
  /**
      New Zealand Map Grid Forward  - long/lat to x/y
      long/lat in radians
    */

  function forward$i(p) {
    var n;
    var lon = p.x;
    var lat = p.y;
    var delta_lat = lat - this.lat0;
    var delta_lon = lon - this.long0; // 1. Calculate d_phi and d_psi    ...                          // and d_lambda
    // For this algorithm, delta_latitude is in seconds of arc x 10-5, so we need to scale to those units. Longitude is radians.

    var d_phi = delta_lat / SEC_TO_RAD * 1E-5;
    var d_lambda = delta_lon;
    var d_phi_n = 1; // d_phi^0

    var d_psi = 0;

    for (n = 1; n <= 10; n++) {
      d_phi_n = d_phi_n * d_phi;
      d_psi = d_psi + this.A[n] * d_phi_n;
    } // 2. Calculate theta


    var th_re = d_psi;
    var th_im = d_lambda; // 3. Calculate z

    var th_n_re = 1;
    var th_n_im = 0; // theta^0

    var th_n_re1;
    var th_n_im1;
    var z_re = 0;
    var z_im = 0;

    for (n = 1; n <= 6; n++) {
      th_n_re1 = th_n_re * th_re - th_n_im * th_im;
      th_n_im1 = th_n_im * th_re + th_n_re * th_im;
      th_n_re = th_n_re1;
      th_n_im = th_n_im1;
      z_re = z_re + this.B_re[n] * th_n_re - this.B_im[n] * th_n_im;
      z_im = z_im + this.B_im[n] * th_n_re + this.B_re[n] * th_n_im;
    } // 4. Calculate easting and northing


    p.x = z_im * this.a + this.x0;
    p.y = z_re * this.a + this.y0;
    return p;
  }
  /**
      New Zealand Map Grid Inverse  -  x/y to long/lat
    */

  function inverse$i(p) {
    var n;
    var x = p.x;
    var y = p.y;
    var delta_x = x - this.x0;
    var delta_y = y - this.y0; // 1. Calculate z

    var z_re = delta_y / this.a;
    var z_im = delta_x / this.a; // 2a. Calculate theta - first approximation gives km accuracy

    var z_n_re = 1;
    var z_n_im = 0; // z^0

    var z_n_re1;
    var z_n_im1;
    var th_re = 0;
    var th_im = 0;

    for (n = 1; n <= 6; n++) {
      z_n_re1 = z_n_re * z_re - z_n_im * z_im;
      z_n_im1 = z_n_im * z_re + z_n_re * z_im;
      z_n_re = z_n_re1;
      z_n_im = z_n_im1;
      th_re = th_re + this.C_re[n] * z_n_re - this.C_im[n] * z_n_im;
      th_im = th_im + this.C_im[n] * z_n_re + this.C_re[n] * z_n_im;
    } // 2b. Iterate to refine the accuracy of the calculation
    //        0 iterations gives km accuracy
    //        1 iteration gives m accuracy -- good enough for most mapping applications
    //        2 iterations bives mm accuracy


    for (var i = 0; i < this.iterations; i++) {
      var th_n_re = th_re;
      var th_n_im = th_im;
      var th_n_re1;
      var th_n_im1;
      var num_re = z_re;
      var num_im = z_im;

      for (n = 2; n <= 6; n++) {
        th_n_re1 = th_n_re * th_re - th_n_im * th_im;
        th_n_im1 = th_n_im * th_re + th_n_re * th_im;
        th_n_re = th_n_re1;
        th_n_im = th_n_im1;
        num_re = num_re + (n - 1) * (this.B_re[n] * th_n_re - this.B_im[n] * th_n_im);
        num_im = num_im + (n - 1) * (this.B_im[n] * th_n_re + this.B_re[n] * th_n_im);
      }

      th_n_re = 1;
      th_n_im = 0;
      var den_re = this.B_re[1];
      var den_im = this.B_im[1];

      for (n = 2; n <= 6; n++) {
        th_n_re1 = th_n_re * th_re - th_n_im * th_im;
        th_n_im1 = th_n_im * th_re + th_n_re * th_im;
        th_n_re = th_n_re1;
        th_n_im = th_n_im1;
        den_re = den_re + n * (this.B_re[n] * th_n_re - this.B_im[n] * th_n_im);
        den_im = den_im + n * (this.B_im[n] * th_n_re + this.B_re[n] * th_n_im);
      } // Complex division


      var den2 = den_re * den_re + den_im * den_im;
      th_re = (num_re * den_re + num_im * den_im) / den2;
      th_im = (num_im * den_re - num_re * den_im) / den2;
    } // 3. Calculate d_phi              ...                                    // and d_lambda


    var d_psi = th_re;
    var d_lambda = th_im;
    var d_psi_n = 1; // d_psi^0

    var d_phi = 0;

    for (n = 1; n <= 9; n++) {
      d_psi_n = d_psi_n * d_psi;
      d_phi = d_phi + this.D[n] * d_psi_n;
    } // 4. Calculate latitude and longitude
    // d_phi is calcuated in second of arc * 10^-5, so we need to scale back to radians. d_lambda is in radians.


    var lat = this.lat0 + d_phi * SEC_TO_RAD * 1E5;
    var lon = this.long0 + d_lambda;
    p.x = lon;
    p.y = lat;
    return p;
  }
  var names$k = ["New_Zealand_Map_Grid", "nzmg"];
  var nzmg = {
    init: init$k,
    forward: forward$i,
    inverse: inverse$i,
    names: names$k
  };

  /*
    reference
      "New Equal-Area Map Projections for Noncircular Regions", John P. Snyder,
      The American Cartographer, Vol 15, No. 4, October 1988, pp. 341-355.
    */

  /* Initialize the Miller Cylindrical projection
    -------------------------------------------*/

  function init$l() {//no-op
  }
  /* Miller Cylindrical forward equations--mapping lat,long to x,y
      ------------------------------------------------------------*/

  function forward$j(p) {
    var lon = p.x;
    var lat = p.y;
    /* Forward equations
        -----------------*/

    var dlon = adjust_lon(lon - this.long0);
    var x = this.x0 + this.a * dlon;
    var y = this.y0 + this.a * Math.log(Math.tan(Math.PI / 4 + lat / 2.5)) * 1.25;
    p.x = x;
    p.y = y;
    return p;
  }
  /* Miller Cylindrical inverse equations--mapping x,y to lat/long
      ------------------------------------------------------------*/

  function inverse$j(p) {
    p.x -= this.x0;
    p.y -= this.y0;
    var lon = adjust_lon(this.long0 + p.x / this.a);
    var lat = 2.5 * (Math.atan(Math.exp(0.8 * p.y / this.a)) - Math.PI / 4);
    p.x = lon;
    p.y = lat;
    return p;
  }
  var names$l = ["Miller_Cylindrical", "mill"];
  var mill = {
    init: init$l,
    forward: forward$j,
    inverse: inverse$j,
    names: names$l
  };

  var MAX_ITER$3 = 20;
  function init$m() {
    /* Place parameters in static storage for common use
      -------------------------------------------------*/
    if (!this.sphere) {
      this.en = pj_enfn(this.es);
    } else {
      this.n = 1;
      this.m = 0;
      this.es = 0;
      this.C_y = Math.sqrt((this.m + 1) / this.n);
      this.C_x = this.C_y / (this.m + 1);
    }
  }
  /* Sinusoidal forward equations--mapping lat,long to x,y
    -----------------------------------------------------*/

  function forward$k(p) {
    var x, y;
    var lon = p.x;
    var lat = p.y;
    /* Forward equations
      -----------------*/

    lon = adjust_lon(lon - this.long0);

    if (this.sphere) {
      if (!this.m) {
        lat = this.n !== 1 ? Math.asin(this.n * Math.sin(lat)) : lat;
      } else {
        var k = this.n * Math.sin(lat);

        for (var i = MAX_ITER$3; i; --i) {
          var V = (this.m * lat + Math.sin(lat) - k) / (this.m + Math.cos(lat));
          lat -= V;

          if (Math.abs(V) < EPSLN) {
            break;
          }
        }
      }

      x = this.a * this.C_x * lon * (this.m + Math.cos(lat));
      y = this.a * this.C_y * lat;
    } else {
      var s = Math.sin(lat);
      var c = Math.cos(lat);
      y = this.a * pj_mlfn(lat, s, c, this.en);
      x = this.a * lon * c / Math.sqrt(1 - this.es * s * s);
    }

    p.x = x;
    p.y = y;
    return p;
  }
  function inverse$k(p) {
    var lat, temp, lon, s;
    p.x -= this.x0;
    lon = p.x / this.a;
    p.y -= this.y0;
    lat = p.y / this.a;

    if (this.sphere) {
      lat /= this.C_y;
      lon = lon / (this.C_x * (this.m + Math.cos(lat)));

      if (this.m) {
        lat = asinz((this.m * lat + Math.sin(lat)) / this.n);
      } else if (this.n !== 1) {
        lat = asinz(Math.sin(lat) / this.n);
      }

      lon = adjust_lon(lon + this.long0);
      lat = adjust_lat(lat);
    } else {
      lat = pj_inv_mlfn(p.y / this.a, this.es, this.en);
      s = Math.abs(lat);

      if (s < HALF_PI) {
        s = Math.sin(lat);
        temp = this.long0 + p.x * Math.sqrt(1 - this.es * s * s) / (this.a * Math.cos(lat)); //temp = this.long0 + p.x / (this.a * Math.cos(lat));

        lon = adjust_lon(temp);
      } else if (s - EPSLN < HALF_PI) {
        lon = this.long0;
      }
    }

    p.x = lon;
    p.y = lat;
    return p;
  }
  var names$m = ["Sinusoidal", "sinu"];
  var sinu = {
    init: init$m,
    forward: forward$k,
    inverse: inverse$k,
    names: names$m
  };

  function init$n() {}
  /* Mollweide forward equations--mapping lat,long to x,y
      ----------------------------------------------------*/

  function forward$l(p) {
    /* Forward equations
        -----------------*/
    var lon = p.x;
    var lat = p.y;
    var delta_lon = adjust_lon(lon - this.long0);
    var theta = lat;
    var con = Math.PI * Math.sin(lat);
    /* Iterate using the Newton-Raphson method to find theta
        -----------------------------------------------------*/

    while (true) {
      var delta_theta = -(theta + Math.sin(theta) - con) / (1 + Math.cos(theta));
      theta += delta_theta;

      if (Math.abs(delta_theta) < EPSLN) {
        break;
      }
    }

    theta /= 2;
    /* If the latitude is 90 deg, force the x coordinate to be "0 + false easting"
         this is done here because of precision problems with "cos(theta)"
         --------------------------------------------------------------------------*/

    if (Math.PI / 2 - Math.abs(lat) < EPSLN) {
      delta_lon = 0;
    }

    var x = 0.900316316158 * this.a * delta_lon * Math.cos(theta) + this.x0;
    var y = 1.4142135623731 * this.a * Math.sin(theta) + this.y0;
    p.x = x;
    p.y = y;
    return p;
  }
  function inverse$l(p) {
    var theta;
    var arg;
    /* Inverse equations
        -----------------*/

    p.x -= this.x0;
    p.y -= this.y0;
    arg = p.y / (1.4142135623731 * this.a);
    /* Because of division by zero problems, 'arg' can not be 1.  Therefore
         a number very close to one is used instead.
         -------------------------------------------------------------------*/

    if (Math.abs(arg) > 0.999999999999) {
      arg = 0.999999999999;
    }

    theta = Math.asin(arg);
    var lon = adjust_lon(this.long0 + p.x / (0.900316316158 * this.a * Math.cos(theta)));

    if (lon < -Math.PI) {
      lon = -Math.PI;
    }

    if (lon > Math.PI) {
      lon = Math.PI;
    }

    arg = (2 * theta + Math.sin(2 * theta)) / Math.PI;

    if (Math.abs(arg) > 1) {
      arg = 1;
    }

    var lat = Math.asin(arg);
    p.x = lon;
    p.y = lat;
    return p;
  }
  var names$n = ["Mollweide", "moll"];
  var moll = {
    init: init$n,
    forward: forward$l,
    inverse: inverse$l,
    names: names$n
  };

  function init$o() {
    /* Place parameters in static storage for common use
        -------------------------------------------------*/
    // Standard Parallels cannot be equal and on opposite sides of the equator
    if (Math.abs(this.lat1 + this.lat2) < EPSLN) {
      return;
    }

    this.lat2 = this.lat2 || this.lat1;
    this.temp = this.b / this.a;
    this.es = 1 - Math.pow(this.temp, 2);
    this.e = Math.sqrt(this.es);
    this.e0 = e0fn(this.es);
    this.e1 = e1fn(this.es);
    this.e2 = e2fn(this.es);
    this.e3 = e3fn(this.es);
    this.sinphi = Math.sin(this.lat1);
    this.cosphi = Math.cos(this.lat1);
    this.ms1 = msfnz(this.e, this.sinphi, this.cosphi);
    this.ml1 = mlfn(this.e0, this.e1, this.e2, this.e3, this.lat1);

    if (Math.abs(this.lat1 - this.lat2) < EPSLN) {
      this.ns = this.sinphi;
    } else {
      this.sinphi = Math.sin(this.lat2);
      this.cosphi = Math.cos(this.lat2);
      this.ms2 = msfnz(this.e, this.sinphi, this.cosphi);
      this.ml2 = mlfn(this.e0, this.e1, this.e2, this.e3, this.lat2);
      this.ns = (this.ms1 - this.ms2) / (this.ml2 - this.ml1);
    }

    this.g = this.ml1 + this.ms1 / this.ns;
    this.ml0 = mlfn(this.e0, this.e1, this.e2, this.e3, this.lat0);
    this.rh = this.a * (this.g - this.ml0);
  }
  /* Equidistant Conic forward equations--mapping lat,long to x,y
    -----------------------------------------------------------*/

  function forward$m(p) {
    var lon = p.x;
    var lat = p.y;
    var rh1;
    /* Forward equations
        -----------------*/

    if (this.sphere) {
      rh1 = this.a * (this.g - lat);
    } else {
      var ml = mlfn(this.e0, this.e1, this.e2, this.e3, lat);
      rh1 = this.a * (this.g - ml);
    }

    var theta = this.ns * adjust_lon(lon - this.long0);
    var x = this.x0 + rh1 * Math.sin(theta);
    var y = this.y0 + this.rh - rh1 * Math.cos(theta);
    p.x = x;
    p.y = y;
    return p;
  }
  /* Inverse equations
    -----------------*/

  function inverse$m(p) {
    p.x -= this.x0;
    p.y = this.rh - p.y + this.y0;
    var con, rh1, lat, lon;

    if (this.ns >= 0) {
      rh1 = Math.sqrt(p.x * p.x + p.y * p.y);
      con = 1;
    } else {
      rh1 = -Math.sqrt(p.x * p.x + p.y * p.y);
      con = -1;
    }

    var theta = 0;

    if (rh1 !== 0) {
      theta = Math.atan2(con * p.x, con * p.y);
    }

    if (this.sphere) {
      lon = adjust_lon(this.long0 + theta / this.ns);
      lat = adjust_lat(this.g - rh1 / this.a);
      p.x = lon;
      p.y = lat;
      return p;
    } else {
      var ml = this.g - rh1 / this.a;
      lat = imlfn(ml, this.e0, this.e1, this.e2, this.e3);
      lon = adjust_lon(this.long0 + theta / this.ns);
      p.x = lon;
      p.y = lat;
      return p;
    }
  }
  var names$o = ["Equidistant_Conic", "eqdc"];
  var eqdc = {
    init: init$o,
    forward: forward$m,
    inverse: inverse$m,
    names: names$o
  };

  /* Initialize the Van Der Grinten projection
    ----------------------------------------*/

  function init$p() {
    //this.R = 6370997; //Radius of earth
    this.R = this.a;
  }
  function forward$n(p) {
    var lon = p.x;
    var lat = p.y;
    /* Forward equations
      -----------------*/

    var dlon = adjust_lon(lon - this.long0);
    var x, y;

    if (Math.abs(lat) <= EPSLN) {
      x = this.x0 + this.R * dlon;
      y = this.y0;
    }

    var theta = asinz(2 * Math.abs(lat / Math.PI));

    if (Math.abs(dlon) <= EPSLN || Math.abs(Math.abs(lat) - HALF_PI) <= EPSLN) {
      x = this.x0;

      if (lat >= 0) {
        y = this.y0 + Math.PI * this.R * Math.tan(0.5 * theta);
      } else {
        y = this.y0 + Math.PI * this.R * -Math.tan(0.5 * theta);
      } //  return(OK);

    }

    var al = 0.5 * Math.abs(Math.PI / dlon - dlon / Math.PI);
    var asq = al * al;
    var sinth = Math.sin(theta);
    var costh = Math.cos(theta);
    var g = costh / (sinth + costh - 1);
    var gsq = g * g;
    var m = g * (2 / sinth - 1);
    var msq = m * m;
    var con = Math.PI * this.R * (al * (g - msq) + Math.sqrt(asq * (g - msq) * (g - msq) - (msq + asq) * (gsq - msq))) / (msq + asq);

    if (dlon < 0) {
      con = -con;
    }

    x = this.x0 + con; //con = Math.abs(con / (Math.PI * this.R));

    var q = asq + g;
    con = Math.PI * this.R * (m * q - al * Math.sqrt((msq + asq) * (asq + 1) - q * q)) / (msq + asq);

    if (lat >= 0) {
      //y = this.y0 + Math.PI * this.R * Math.sqrt(1 - con * con - 2 * al * con);
      y = this.y0 + con;
    } else {
      //y = this.y0 - Math.PI * this.R * Math.sqrt(1 - con * con - 2 * al * con);
      y = this.y0 - con;
    }

    p.x = x;
    p.y = y;
    return p;
  }
  /* Van Der Grinten inverse equations--mapping x,y to lat/long
    ---------------------------------------------------------*/

  function inverse$n(p) {
    var lon, lat;
    var xx, yy, xys, c1, c2, c3;
    var a1;
    var m1;
    var con;
    var th1;
    var d;
    /* inverse equations
      -----------------*/

    p.x -= this.x0;
    p.y -= this.y0;
    con = Math.PI * this.R;
    xx = p.x / con;
    yy = p.y / con;
    xys = xx * xx + yy * yy;
    c1 = -Math.abs(yy) * (1 + xys);
    c2 = c1 - 2 * yy * yy + xx * xx;
    c3 = -2 * c1 + 1 + 2 * yy * yy + xys * xys;
    d = yy * yy / c3 + (2 * c2 * c2 * c2 / c3 / c3 / c3 - 9 * c1 * c2 / c3 / c3) / 27;
    a1 = (c1 - c2 * c2 / 3 / c3) / c3;
    m1 = 2 * Math.sqrt(-a1 / 3);
    con = 3 * d / a1 / m1;

    if (Math.abs(con) > 1) {
      if (con >= 0) {
        con = 1;
      } else {
        con = -1;
      }
    }

    th1 = Math.acos(con) / 3;

    if (p.y >= 0) {
      lat = (-m1 * Math.cos(th1 + Math.PI / 3) - c2 / 3 / c3) * Math.PI;
    } else {
      lat = -(-m1 * Math.cos(th1 + Math.PI / 3) - c2 / 3 / c3) * Math.PI;
    }

    if (Math.abs(xx) < EPSLN) {
      lon = this.long0;
    } else {
      lon = adjust_lon(this.long0 + Math.PI * (xys - 1 + Math.sqrt(1 + 2 * (xx * xx - yy * yy) + xys * xys)) / 2 / xx);
    }

    p.x = lon;
    p.y = lat;
    return p;
  }
  var names$p = ["Van_der_Grinten_I", "VanDerGrinten", "vandg"];
  var vandg = {
    init: init$p,
    forward: forward$n,
    inverse: inverse$n,
    names: names$p
  };

  function init$q() {
    this.sin_p12 = Math.sin(this.lat0);
    this.cos_p12 = Math.cos(this.lat0);
  }
  function forward$o(p) {
    var lon = p.x;
    var lat = p.y;
    var sinphi = Math.sin(p.y);
    var cosphi = Math.cos(p.y);
    var dlon = adjust_lon(lon - this.long0);
    var e0, e1, e2, e3, Mlp, Ml, tanphi, Nl1, Nl, psi, Az, G, H, GH, Hs, c, kp, cos_c, s, s2, s3, s4, s5;

    if (this.sphere) {
      if (Math.abs(this.sin_p12 - 1) <= EPSLN) {
        //North Pole case
        p.x = this.x0 + this.a * (HALF_PI - lat) * Math.sin(dlon);
        p.y = this.y0 - this.a * (HALF_PI - lat) * Math.cos(dlon);
        return p;
      } else if (Math.abs(this.sin_p12 + 1) <= EPSLN) {
        //South Pole case
        p.x = this.x0 + this.a * (HALF_PI + lat) * Math.sin(dlon);
        p.y = this.y0 + this.a * (HALF_PI + lat) * Math.cos(dlon);
        return p;
      } else {
        //default case
        cos_c = this.sin_p12 * sinphi + this.cos_p12 * cosphi * Math.cos(dlon);
        c = Math.acos(cos_c);
        kp = c ? c / Math.sin(c) : 1;
        p.x = this.x0 + this.a * kp * cosphi * Math.sin(dlon);
        p.y = this.y0 + this.a * kp * (this.cos_p12 * sinphi - this.sin_p12 * cosphi * Math.cos(dlon));
        return p;
      }
    } else {
      e0 = e0fn(this.es);
      e1 = e1fn(this.es);
      e2 = e2fn(this.es);
      e3 = e3fn(this.es);

      if (Math.abs(this.sin_p12 - 1) <= EPSLN) {
        //North Pole case
        Mlp = this.a * mlfn(e0, e1, e2, e3, HALF_PI);
        Ml = this.a * mlfn(e0, e1, e2, e3, lat);
        p.x = this.x0 + (Mlp - Ml) * Math.sin(dlon);
        p.y = this.y0 - (Mlp - Ml) * Math.cos(dlon);
        return p;
      } else if (Math.abs(this.sin_p12 + 1) <= EPSLN) {
        //South Pole case
        Mlp = this.a * mlfn(e0, e1, e2, e3, HALF_PI);
        Ml = this.a * mlfn(e0, e1, e2, e3, lat);
        p.x = this.x0 + (Mlp + Ml) * Math.sin(dlon);
        p.y = this.y0 + (Mlp + Ml) * Math.cos(dlon);
        return p;
      } else {
        //Default case
        tanphi = sinphi / cosphi;
        Nl1 = gN(this.a, this.e, this.sin_p12);
        Nl = gN(this.a, this.e, sinphi);
        psi = Math.atan((1 - this.es) * tanphi + this.es * Nl1 * this.sin_p12 / (Nl * cosphi));
        Az = Math.atan2(Math.sin(dlon), this.cos_p12 * Math.tan(psi) - this.sin_p12 * Math.cos(dlon));

        if (Az === 0) {
          s = Math.asin(this.cos_p12 * Math.sin(psi) - this.sin_p12 * Math.cos(psi));
        } else if (Math.abs(Math.abs(Az) - Math.PI) <= EPSLN) {
          s = -Math.asin(this.cos_p12 * Math.sin(psi) - this.sin_p12 * Math.cos(psi));
        } else {
          s = Math.asin(Math.sin(dlon) * Math.cos(psi) / Math.sin(Az));
        }

        G = this.e * this.sin_p12 / Math.sqrt(1 - this.es);
        H = this.e * this.cos_p12 * Math.cos(Az) / Math.sqrt(1 - this.es);
        GH = G * H;
        Hs = H * H;
        s2 = s * s;
        s3 = s2 * s;
        s4 = s3 * s;
        s5 = s4 * s;
        c = Nl1 * s * (1 - s2 * Hs * (1 - Hs) / 6 + s3 / 8 * GH * (1 - 2 * Hs) + s4 / 120 * (Hs * (4 - 7 * Hs) - 3 * G * G * (1 - 7 * Hs)) - s5 / 48 * GH);
        p.x = this.x0 + c * Math.sin(Az);
        p.y = this.y0 + c * Math.cos(Az);
        return p;
      }
    }
  }
  function inverse$o(p) {
    p.x -= this.x0;
    p.y -= this.y0;
    var rh, z, sinz, cosz, lon, lat, con, e0, e1, e2, e3, Mlp, M, N1, psi, Az, cosAz, tmp, A, B, D, Ee, F, sinpsi;

    if (this.sphere) {
      rh = Math.sqrt(p.x * p.x + p.y * p.y);

      if (rh > 2 * HALF_PI * this.a) {
        return;
      }

      z = rh / this.a;
      sinz = Math.sin(z);
      cosz = Math.cos(z);
      lon = this.long0;

      if (Math.abs(rh) <= EPSLN) {
        lat = this.lat0;
      } else {
        lat = asinz(cosz * this.sin_p12 + p.y * sinz * this.cos_p12 / rh);
        con = Math.abs(this.lat0) - HALF_PI;

        if (Math.abs(con) <= EPSLN) {
          if (this.lat0 >= 0) {
            lon = adjust_lon(this.long0 + Math.atan2(p.x, -p.y));
          } else {
            lon = adjust_lon(this.long0 - Math.atan2(-p.x, p.y));
          }
        } else {
          /*con = cosz - this.sin_p12 * Math.sin(lat);
          if ((Math.abs(con) < EPSLN) && (Math.abs(p.x) < EPSLN)) {
            //no-op, just keep the lon value as is
          } else {
            var temp = Math.atan2((p.x * sinz * this.cos_p12), (con * rh));
            lon = adjust_lon(this.long0 + Math.atan2((p.x * sinz * this.cos_p12), (con * rh)));
          }*/
          lon = adjust_lon(this.long0 + Math.atan2(p.x * sinz, rh * this.cos_p12 * cosz - p.y * this.sin_p12 * sinz));
        }
      }

      p.x = lon;
      p.y = lat;
      return p;
    } else {
      e0 = e0fn(this.es);
      e1 = e1fn(this.es);
      e2 = e2fn(this.es);
      e3 = e3fn(this.es);

      if (Math.abs(this.sin_p12 - 1) <= EPSLN) {
        //North pole case
        Mlp = this.a * mlfn(e0, e1, e2, e3, HALF_PI);
        rh = Math.sqrt(p.x * p.x + p.y * p.y);
        M = Mlp - rh;
        lat = imlfn(M / this.a, e0, e1, e2, e3);
        lon = adjust_lon(this.long0 + Math.atan2(p.x, -1 * p.y));
        p.x = lon;
        p.y = lat;
        return p;
      } else if (Math.abs(this.sin_p12 + 1) <= EPSLN) {
        //South pole case
        Mlp = this.a * mlfn(e0, e1, e2, e3, HALF_PI);
        rh = Math.sqrt(p.x * p.x + p.y * p.y);
        M = rh - Mlp;
        lat = imlfn(M / this.a, e0, e1, e2, e3);
        lon = adjust_lon(this.long0 + Math.atan2(p.x, p.y));
        p.x = lon;
        p.y = lat;
        return p;
      } else {
        //default case
        rh = Math.sqrt(p.x * p.x + p.y * p.y);
        Az = Math.atan2(p.x, p.y);
        N1 = gN(this.a, this.e, this.sin_p12);
        cosAz = Math.cos(Az);
        tmp = this.e * this.cos_p12 * cosAz;
        A = -tmp * tmp / (1 - this.es);
        B = 3 * this.es * (1 - A) * this.sin_p12 * this.cos_p12 * cosAz / (1 - this.es);
        D = rh / N1;
        Ee = D - A * (1 + A) * Math.pow(D, 3) / 6 - B * (1 + 3 * A) * Math.pow(D, 4) / 24;
        F = 1 - A * Ee * Ee / 2 - D * Ee * Ee * Ee / 6;
        psi = Math.asin(this.sin_p12 * Math.cos(Ee) + this.cos_p12 * Math.sin(Ee) * cosAz);
        lon = adjust_lon(this.long0 + Math.asin(Math.sin(Az) * Math.sin(Ee) / Math.cos(psi)));
        sinpsi = Math.sin(psi);
        lat = Math.atan2((sinpsi - this.es * F * this.sin_p12) * Math.tan(psi), sinpsi * (1 - this.es));
        p.x = lon;
        p.y = lat;
        return p;
      }
    }
  }
  var names$q = ["Azimuthal_Equidistant", "aeqd"];
  var aeqd = {
    init: init$q,
    forward: forward$o,
    inverse: inverse$o,
    names: names$q
  };

  function init$r() {
    //double temp;      /* temporary variable    */

    /* Place parameters in static storage for common use
        -------------------------------------------------*/
    this.sin_p14 = Math.sin(this.lat0);
    this.cos_p14 = Math.cos(this.lat0);
  }
  /* Orthographic forward equations--mapping lat,long to x,y
      ---------------------------------------------------*/

  function forward$p(p) {
    var sinphi, cosphi;
    /* sin and cos value        */

    var dlon;
    /* delta longitude value      */

    var coslon;
    /* cos of longitude        */

    var ksp;
    /* scale factor          */

    var g, x, y;
    var lon = p.x;
    var lat = p.y;
    /* Forward equations
        -----------------*/

    dlon = adjust_lon(lon - this.long0);
    sinphi = Math.sin(lat);
    cosphi = Math.cos(lat);
    coslon = Math.cos(dlon);
    g = this.sin_p14 * sinphi + this.cos_p14 * cosphi * coslon;
    ksp = 1;

    if (g > 0 || Math.abs(g) <= EPSLN) {
      x = this.a * ksp * cosphi * Math.sin(dlon);
      y = this.y0 + this.a * ksp * (this.cos_p14 * sinphi - this.sin_p14 * cosphi * coslon);
    }

    p.x = x;
    p.y = y;
    return p;
  }
  function inverse$p(p) {
    var rh;
    /* height above ellipsoid      */

    var z;
    /* angle          */

    var sinz, cosz;
    /* sin of z and cos of z      */

    var con;
    var lon, lat;
    /* Inverse equations
        -----------------*/

    p.x -= this.x0;
    p.y -= this.y0;
    rh = Math.sqrt(p.x * p.x + p.y * p.y);
    z = asinz(rh / this.a);
    sinz = Math.sin(z);
    cosz = Math.cos(z);
    lon = this.long0;

    if (Math.abs(rh) <= EPSLN) {
      lat = this.lat0;
      p.x = lon;
      p.y = lat;
      return p;
    }

    lat = asinz(cosz * this.sin_p14 + p.y * sinz * this.cos_p14 / rh);
    con = Math.abs(this.lat0) - HALF_PI;

    if (Math.abs(con) <= EPSLN) {
      if (this.lat0 >= 0) {
        lon = adjust_lon(this.long0 + Math.atan2(p.x, -p.y));
      } else {
        lon = adjust_lon(this.long0 - Math.atan2(-p.x, p.y));
      }

      p.x = lon;
      p.y = lat;
      return p;
    }

    lon = adjust_lon(this.long0 + Math.atan2(p.x * sinz, rh * this.cos_p14 * cosz - p.y * this.sin_p14 * sinz));
    p.x = lon;
    p.y = lat;
    return p;
  }
  var names$r = ["ortho"];
  var ortho = {
    init: init$r,
    forward: forward$p,
    inverse: inverse$p,
    names: names$r
  };

  // QSC projection rewritten from the original PROJ4
  /* constants */

  var FACE_ENUM = {
    FRONT: 1,
    RIGHT: 2,
    BACK: 3,
    LEFT: 4,
    TOP: 5,
    BOTTOM: 6
  };
  var AREA_ENUM = {
    AREA_0: 1,
    AREA_1: 2,
    AREA_2: 3,
    AREA_3: 4
  };
  function init$s() {
    this.x0 = this.x0 || 0;
    this.y0 = this.y0 || 0;
    this.lat0 = this.lat0 || 0;
    this.long0 = this.long0 || 0;
    this.lat_ts = this.lat_ts || 0;
    this.title = this.title || "Quadrilateralized Spherical Cube";
    /* Determine the cube face from the center of projection. */

    if (this.lat0 >= HALF_PI - FORTPI / 2.0) {
      this.face = FACE_ENUM.TOP;
    } else if (this.lat0 <= -(HALF_PI - FORTPI / 2.0)) {
      this.face = FACE_ENUM.BOTTOM;
    } else if (Math.abs(this.long0) <= FORTPI) {
      this.face = FACE_ENUM.FRONT;
    } else if (Math.abs(this.long0) <= HALF_PI + FORTPI) {
      this.face = this.long0 > 0.0 ? FACE_ENUM.RIGHT : FACE_ENUM.LEFT;
    } else {
      this.face = FACE_ENUM.BACK;
    }
    /* Fill in useful values for the ellipsoid <-> sphere shift
     * described in [LK12]. */


    if (this.es !== 0) {
      this.one_minus_f = 1 - (this.a - this.b) / this.a;
      this.one_minus_f_squared = this.one_minus_f * this.one_minus_f;
    }
  } // QSC forward equations--mapping lat,long to x,y
  // -----------------------------------------------------------------

  function forward$q(p) {
    var xy = {
      x: 0,
      y: 0
    };
    var lat, lon;
    var theta, phi;
    var t, mu;
    /* nu; */

    var area = {
      value: 0
    }; // move lon according to projection's lon

    p.x -= this.long0;
    /* Convert the geodetic latitude to a geocentric latitude.
     * This corresponds to the shift from the ellipsoid to the sphere
     * described in [LK12]. */

    if (this.es !== 0) {
      //if (P->es != 0) {
      lat = Math.atan(this.one_minus_f_squared * Math.tan(p.y));
    } else {
      lat = p.y;
    }
    /* Convert the input lat, lon into theta, phi as used by QSC.
     * This depends on the cube face and the area on it.
     * For the top and bottom face, we can compute theta and phi
     * directly from phi, lam. For the other faces, we must use
     * unit sphere cartesian coordinates as an intermediate step. */


    lon = p.x; //lon = lp.lam;

    if (this.face === FACE_ENUM.TOP) {
      phi = HALF_PI - lat;

      if (lon >= FORTPI && lon <= HALF_PI + FORTPI) {
        area.value = AREA_ENUM.AREA_0;
        theta = lon - HALF_PI;
      } else if (lon > HALF_PI + FORTPI || lon <= -(HALF_PI + FORTPI)) {
        area.value = AREA_ENUM.AREA_1;
        theta = lon > 0.0 ? lon - SPI : lon + SPI;
      } else if (lon > -(HALF_PI + FORTPI) && lon <= -FORTPI) {
        area.value = AREA_ENUM.AREA_2;
        theta = lon + HALF_PI;
      } else {
        area.value = AREA_ENUM.AREA_3;
        theta = lon;
      }
    } else if (this.face === FACE_ENUM.BOTTOM) {
      phi = HALF_PI + lat;

      if (lon >= FORTPI && lon <= HALF_PI + FORTPI) {
        area.value = AREA_ENUM.AREA_0;
        theta = -lon + HALF_PI;
      } else if (lon < FORTPI && lon >= -FORTPI) {
        area.value = AREA_ENUM.AREA_1;
        theta = -lon;
      } else if (lon < -FORTPI && lon >= -(HALF_PI + FORTPI)) {
        area.value = AREA_ENUM.AREA_2;
        theta = -lon - HALF_PI;
      } else {
        area.value = AREA_ENUM.AREA_3;
        theta = lon > 0.0 ? -lon + SPI : -lon - SPI;
      }
    } else {
      var q, r, s;
      var sinlat, coslat;
      var sinlon, coslon;

      if (this.face === FACE_ENUM.RIGHT) {
        lon = qsc_shift_lon_origin(lon, +HALF_PI);
      } else if (this.face === FACE_ENUM.BACK) {
        lon = qsc_shift_lon_origin(lon, +SPI);
      } else if (this.face === FACE_ENUM.LEFT) {
        lon = qsc_shift_lon_origin(lon, -HALF_PI);
      }

      sinlat = Math.sin(lat);
      coslat = Math.cos(lat);
      sinlon = Math.sin(lon);
      coslon = Math.cos(lon);
      q = coslat * coslon;
      r = coslat * sinlon;
      s = sinlat;

      if (this.face === FACE_ENUM.FRONT) {
        phi = Math.acos(q);
        theta = qsc_fwd_equat_face_theta(phi, s, r, area);
      } else if (this.face === FACE_ENUM.RIGHT) {
        phi = Math.acos(r);
        theta = qsc_fwd_equat_face_theta(phi, s, -q, area);
      } else if (this.face === FACE_ENUM.BACK) {
        phi = Math.acos(-q);
        theta = qsc_fwd_equat_face_theta(phi, s, -r, area);
      } else if (this.face === FACE_ENUM.LEFT) {
        phi = Math.acos(-r);
        theta = qsc_fwd_equat_face_theta(phi, s, q, area);
      } else {
        /* Impossible */
        phi = theta = 0;
        area.value = AREA_ENUM.AREA_0;
      }
    }
    /* Compute mu and nu for the area of definition.
     * For mu, see Eq. (3-21) in [OL76], but note the typos:
     * compare with Eq. (3-14). For nu, see Eq. (3-38). */


    mu = Math.atan(12 / SPI * (theta + Math.acos(Math.sin(theta) * Math.cos(FORTPI)) - HALF_PI));
    t = Math.sqrt((1 - Math.cos(phi)) / (Math.cos(mu) * Math.cos(mu)) / (1 - Math.cos(Math.atan(1 / Math.cos(theta)))));
    /* Apply the result to the real area. */

    if (area.value === AREA_ENUM.AREA_1) {
      mu += HALF_PI;
    } else if (area.value === AREA_ENUM.AREA_2) {
      mu += SPI;
    } else if (area.value === AREA_ENUM.AREA_3) {
      mu += 1.5 * SPI;
    }
    /* Now compute x, y from mu and nu */


    xy.x = t * Math.cos(mu);
    xy.y = t * Math.sin(mu);
    xy.x = xy.x * this.a + this.x0;
    xy.y = xy.y * this.a + this.y0;
    p.x = xy.x;
    p.y = xy.y;
    return p;
  } // QSC inverse equations--mapping x,y to lat/long
  // -----------------------------------------------------------------

  function inverse$q(p) {
    var lp = {
      lam: 0,
      phi: 0
    };
    var mu, nu, cosmu, tannu;
    var tantheta, theta, cosphi, phi;
    var t;
    var area = {
      value: 0
    };
    /* de-offset */

    p.x = (p.x - this.x0) / this.a;
    p.y = (p.y - this.y0) / this.a;
    /* Convert the input x, y to the mu and nu angles as used by QSC.
     * This depends on the area of the cube face. */

    nu = Math.atan(Math.sqrt(p.x * p.x + p.y * p.y));
    mu = Math.atan2(p.y, p.x);

    if (p.x >= 0.0 && p.x >= Math.abs(p.y)) {
      area.value = AREA_ENUM.AREA_0;
    } else if (p.y >= 0.0 && p.y >= Math.abs(p.x)) {
      area.value = AREA_ENUM.AREA_1;
      mu -= HALF_PI;
    } else if (p.x < 0.0 && -p.x >= Math.abs(p.y)) {
      area.value = AREA_ENUM.AREA_2;
      mu = mu < 0.0 ? mu + SPI : mu - SPI;
    } else {
      area.value = AREA_ENUM.AREA_3;
      mu += HALF_PI;
    }
    /* Compute phi and theta for the area of definition.
     * The inverse projection is not described in the original paper, but some
     * good hints can be found here (as of 2011-12-14):
     * http://fits.gsfc.nasa.gov/fitsbits/saf.93/saf.9302
     * (search for "Message-Id: <9302181759.AA25477 at fits.cv.nrao.edu>") */


    t = SPI / 12 * Math.tan(mu);
    tantheta = Math.sin(t) / (Math.cos(t) - 1 / Math.sqrt(2));
    theta = Math.atan(tantheta);
    cosmu = Math.cos(mu);
    tannu = Math.tan(nu);
    cosphi = 1 - cosmu * cosmu * tannu * tannu * (1 - Math.cos(Math.atan(1 / Math.cos(theta))));

    if (cosphi < -1) {
      cosphi = -1;
    } else if (cosphi > +1) {
      cosphi = +1;
    }
    /* Apply the result to the real area on the cube face.
     * For the top and bottom face, we can compute phi and lam directly.
     * For the other faces, we must use unit sphere cartesian coordinates
     * as an intermediate step. */


    if (this.face === FACE_ENUM.TOP) {
      phi = Math.acos(cosphi);
      lp.phi = HALF_PI - phi;

      if (area.value === AREA_ENUM.AREA_0) {
        lp.lam = theta + HALF_PI;
      } else if (area.value === AREA_ENUM.AREA_1) {
        lp.lam = theta < 0.0 ? theta + SPI : theta - SPI;
      } else if (area.value === AREA_ENUM.AREA_2) {
        lp.lam = theta - HALF_PI;
      } else
        /* area.value == AREA_ENUM.AREA_3 */
        {
          lp.lam = theta;
        }
    } else if (this.face === FACE_ENUM.BOTTOM) {
      phi = Math.acos(cosphi);
      lp.phi = phi - HALF_PI;

      if (area.value === AREA_ENUM.AREA_0) {
        lp.lam = -theta + HALF_PI;
      } else if (area.value === AREA_ENUM.AREA_1) {
        lp.lam = -theta;
      } else if (area.value === AREA_ENUM.AREA_2) {
        lp.lam = -theta - HALF_PI;
      } else
        /* area.value == AREA_ENUM.AREA_3 */
        {
          lp.lam = theta < 0.0 ? -theta - SPI : -theta + SPI;
        }
    } else {
      /* Compute phi and lam via cartesian unit sphere coordinates. */
      var q, r, s;
      q = cosphi;
      t = q * q;

      if (t >= 1) {
        s = 0;
      } else {
        s = Math.sqrt(1 - t) * Math.sin(theta);
      }

      t += s * s;

      if (t >= 1) {
        r = 0;
      } else {
        r = Math.sqrt(1 - t);
      }
      /* Rotate q,r,s into the correct area. */


      if (area.value === AREA_ENUM.AREA_1) {
        t = r;
        r = -s;
        s = t;
      } else if (area.value === AREA_ENUM.AREA_2) {
        r = -r;
        s = -s;
      } else if (area.value === AREA_ENUM.AREA_3) {
        t = r;
        r = s;
        s = -t;
      }
      /* Rotate q,r,s into the correct cube face. */


      if (this.face === FACE_ENUM.RIGHT) {
        t = q;
        q = -r;
        r = t;
      } else if (this.face === FACE_ENUM.BACK) {
        q = -q;
        r = -r;
      } else if (this.face === FACE_ENUM.LEFT) {
        t = q;
        q = r;
        r = -t;
      }
      /* Now compute phi and lam from the unit sphere coordinates. */


      lp.phi = Math.acos(-s) - HALF_PI;
      lp.lam = Math.atan2(r, q);

      if (this.face === FACE_ENUM.RIGHT) {
        lp.lam = qsc_shift_lon_origin(lp.lam, -HALF_PI);
      } else if (this.face === FACE_ENUM.BACK) {
        lp.lam = qsc_shift_lon_origin(lp.lam, -SPI);
      } else if (this.face === FACE_ENUM.LEFT) {
        lp.lam = qsc_shift_lon_origin(lp.lam, +HALF_PI);
      }
    }
    /* Apply the shift from the sphere to the ellipsoid as described
     * in [LK12]. */


    if (this.es !== 0) {
      var invert_sign;
      var tanphi, xa;
      invert_sign = lp.phi < 0 ? 1 : 0;
      tanphi = Math.tan(lp.phi);
      xa = this.b / Math.sqrt(tanphi * tanphi + this.one_minus_f_squared);
      lp.phi = Math.atan(Math.sqrt(this.a * this.a - xa * xa) / (this.one_minus_f * xa));

      if (invert_sign) {
        lp.phi = -lp.phi;
      }
    }

    lp.lam += this.long0;
    p.x = lp.lam;
    p.y = lp.phi;
    return p;
  }
  /* Helper function for forward projection: compute the theta angle
   * and determine the area number. */

  function qsc_fwd_equat_face_theta(phi, y, x, area) {
    var theta;

    if (phi < EPSLN) {
      area.value = AREA_ENUM.AREA_0;
      theta = 0.0;
    } else {
      theta = Math.atan2(y, x);

      if (Math.abs(theta) <= FORTPI) {
        area.value = AREA_ENUM.AREA_0;
      } else if (theta > FORTPI && theta <= HALF_PI + FORTPI) {
        area.value = AREA_ENUM.AREA_1;
        theta -= HALF_PI;
      } else if (theta > HALF_PI + FORTPI || theta <= -(HALF_PI + FORTPI)) {
        area.value = AREA_ENUM.AREA_2;
        theta = theta >= 0.0 ? theta - SPI : theta + SPI;
      } else {
        area.value = AREA_ENUM.AREA_3;
        theta += HALF_PI;
      }
    }

    return theta;
  }
  /* Helper function: shift the longitude. */


  function qsc_shift_lon_origin(lon, offset) {
    var slon = lon + offset;

    if (slon < -SPI) {
      slon += TWO_PI;
    } else if (slon > +SPI) {
      slon -= TWO_PI;
    }

    return slon;
  }

  var names$s = ["Quadrilateralized Spherical Cube", "Quadrilateralized_Spherical_Cube", "qsc"];
  var qsc = {
    init: init$s,
    forward: forward$q,
    inverse: inverse$q,
    names: names$s
  };

  // Robinson projection
  var COEFS_X = [[1.0000, 2.2199e-17, -7.15515e-05, 3.1103e-06], [0.9986, -0.000482243, -2.4897e-05, -1.3309e-06], [0.9954, -0.00083103, -4.48605e-05, -9.86701e-07], [0.9900, -0.00135364, -5.9661e-05, 3.6777e-06], [0.9822, -0.00167442, -4.49547e-06, -5.72411e-06], [0.9730, -0.00214868, -9.03571e-05, 1.8736e-08], [0.9600, -0.00305085, -9.00761e-05, 1.64917e-06], [0.9427, -0.00382792, -6.53386e-05, -2.6154e-06], [0.9216, -0.00467746, -0.00010457, 4.81243e-06], [0.8962, -0.00536223, -3.23831e-05, -5.43432e-06], [0.8679, -0.00609363, -0.000113898, 3.32484e-06], [0.8350, -0.00698325, -6.40253e-05, 9.34959e-07], [0.7986, -0.00755338, -5.00009e-05, 9.35324e-07], [0.7597, -0.00798324, -3.5971e-05, -2.27626e-06], [0.7186, -0.00851367, -7.01149e-05, -8.6303e-06], [0.6732, -0.00986209, -0.000199569, 1.91974e-05], [0.6213, -0.010418, 8.83923e-05, 6.24051e-06], [0.5722, -0.00906601, 0.000182, 6.24051e-06], [0.5322, -0.00677797, 0.000275608, 6.24051e-06]];
  var COEFS_Y = [[-5.20417e-18, 0.0124, 1.21431e-18, -8.45284e-11], [0.0620, 0.0124, -1.26793e-09, 4.22642e-10], [0.1240, 0.0124, 5.07171e-09, -1.60604e-09], [0.1860, 0.0123999, -1.90189e-08, 6.00152e-09], [0.2480, 0.0124002, 7.10039e-08, -2.24e-08], [0.3100, 0.0123992, -2.64997e-07, 8.35986e-08], [0.3720, 0.0124029, 9.88983e-07, -3.11994e-07], [0.4340, 0.0123893, -3.69093e-06, -4.35621e-07], [0.4958, 0.0123198, -1.02252e-05, -3.45523e-07], [0.5571, 0.0121916, -1.54081e-05, -5.82288e-07], [0.6176, 0.0119938, -2.41424e-05, -5.25327e-07], [0.6769, 0.011713, -3.20223e-05, -5.16405e-07], [0.7346, 0.0113541, -3.97684e-05, -6.09052e-07], [0.7903, 0.0109107, -4.89042e-05, -1.04739e-06], [0.8435, 0.0103431, -6.4615e-05, -1.40374e-09], [0.8936, 0.00969686, -6.4636e-05, -8.547e-06], [0.9394, 0.00840947, -0.000192841, -4.2106e-06], [0.9761, 0.00616527, -0.000256, -4.2106e-06], [1.0000, 0.00328947, -0.000319159, -4.2106e-06]];
  var FXC = 0.8487;
  var FYC = 1.3523;
  var C1 = R2D / 5; // rad to 5-degree interval

  var RC1 = 1 / C1;
  var NODES = 18;

  var poly3_val = function poly3_val(coefs, x) {
    return coefs[0] + x * (coefs[1] + x * (coefs[2] + x * coefs[3]));
  };

  var poly3_der = function poly3_der(coefs, x) {
    return coefs[1] + x * (2 * coefs[2] + x * 3 * coefs[3]);
  };

  function newton_rapshon(f_df, start, max_err, iters) {
    var x = start;

    for (; iters; --iters) {
      var upd = f_df(x);
      x -= upd;

      if (Math.abs(upd) < max_err) {
        break;
      }
    }

    return x;
  }

  function init$t() {
    this.x0 = this.x0 || 0;
    this.y0 = this.y0 || 0;
    this.long0 = this.long0 || 0;
    this.es = 0;
    this.title = this.title || "Robinson";
  }
  function forward$r(ll) {
    var lon = adjust_lon(ll.x - this.long0);
    var dphi = Math.abs(ll.y);
    var i = Math.floor(dphi * C1);

    if (i < 0) {
      i = 0;
    } else if (i >= NODES) {
      i = NODES - 1;
    }

    dphi = R2D * (dphi - RC1 * i);
    var xy = {
      x: poly3_val(COEFS_X[i], dphi) * lon,
      y: poly3_val(COEFS_Y[i], dphi)
    };

    if (ll.y < 0) {
      xy.y = -xy.y;
    }

    xy.x = xy.x * this.a * FXC + this.x0;
    xy.y = xy.y * this.a * FYC + this.y0;
    return xy;
  }
  function inverse$r(xy) {
    var ll = {
      x: (xy.x - this.x0) / (this.a * FXC),
      y: Math.abs(xy.y - this.y0) / (this.a * FYC)
    };

    if (ll.y >= 1) {
      // pathologic case
      ll.x /= COEFS_X[NODES][0];
      ll.y = xy.y < 0 ? -HALF_PI : HALF_PI;
    } else {
      // find table interval
      var i = Math.floor(ll.y * NODES);

      if (i < 0) {
        i = 0;
      } else if (i >= NODES) {
        i = NODES - 1;
      }

      for (;;) {
        if (COEFS_Y[i][0] > ll.y) {
          --i;
        } else if (COEFS_Y[i + 1][0] <= ll.y) {
          ++i;
        } else {
          break;
        }
      } // linear interpolation in 5 degree interval


      var coefs = COEFS_Y[i];
      var t = 5 * (ll.y - coefs[0]) / (COEFS_Y[i + 1][0] - coefs[0]); // find t so that poly3_val(coefs, t) = ll.y

      t = newton_rapshon(function (x) {
        return (poly3_val(coefs, x) - ll.y) / poly3_der(coefs, x);
      }, t, EPSLN, 100);
      ll.x /= poly3_val(COEFS_X[i], t);
      ll.y = (5 * i + t) * D2R;

      if (xy.y < 0) {
        ll.y = -ll.y;
      }
    }

    ll.x = adjust_lon(ll.x + this.long0);
    return ll;
  }
  var names$t = ["Robinson", "robin"];
  var robin = {
    init: init$t,
    forward: forward$r,
    inverse: inverse$r,
    names: names$t
  };

  function init$u() {
    this.name = 'geocent';
  }
  function forward$s(p) {
    var point = geodeticToGeocentric(p, this.es, this.a);
    return point;
  }
  function inverse$s(p) {
    var point = geocentricToGeodetic(p, this.es, this.a, this.b);
    return point;
  }
  var names$u = ["Geocentric", 'geocentric', "geocent", "Geocent"];
  var geocent = {
    init: init$u,
    forward: forward$s,
    inverse: inverse$s,
    names: names$u
  };

  function includedProjections (proj4) {
    proj4.Proj.projections.add(tmerc);
    proj4.Proj.projections.add(etmerc);
    proj4.Proj.projections.add(utm);
    proj4.Proj.projections.add(sterea);
    proj4.Proj.projections.add(stere);
    proj4.Proj.projections.add(somerc);
    proj4.Proj.projections.add(omerc);
    proj4.Proj.projections.add(lcc);
    proj4.Proj.projections.add(krovak);
    proj4.Proj.projections.add(cass);
    proj4.Proj.projections.add(laea);
    proj4.Proj.projections.add(aea);
    proj4.Proj.projections.add(gnom);
    proj4.Proj.projections.add(cea);
    proj4.Proj.projections.add(eqc);
    proj4.Proj.projections.add(poly);
    proj4.Proj.projections.add(nzmg);
    proj4.Proj.projections.add(mill);
    proj4.Proj.projections.add(sinu);
    proj4.Proj.projections.add(moll);
    proj4.Proj.projections.add(eqdc);
    proj4.Proj.projections.add(vandg);
    proj4.Proj.projections.add(aeqd);
    proj4.Proj.projections.add(ortho);
    proj4.Proj.projections.add(qsc);
    proj4.Proj.projections.add(robin);
    proj4.Proj.projections.add(geocent);
  }

  proj4.defaultDatum = 'WGS84'; //default datum

  proj4.Proj = Projection;
  proj4.WGS84 = new proj4.Proj('WGS84');
  proj4.Point = Point;
  proj4.toPoint = common;
  proj4.defs = defs;
  proj4.transform = transform$1;
  proj4.mgrs = mgrs;
  proj4.version = '__VERSION__';
  includedProjections(proj4);

  /** @module src/km100 */

  /** @constant
    * @description This the array from which the default object is derived. If you
    * need to work with an array of objects where the 100 km grid reference is a property
    * of the object alongside x, y, and proj, you can use this.
    * @type {array}
  */

  var a100km = [{
    "GridRef": "SV",
    "x": 0,
    "y": 0,
    "proj": "gb"
  }, {
    "GridRef": "NL",
    "x": 0,
    "y": 7,
    "proj": "gb"
  }, {
    "GridRef": "NF",
    "x": 0,
    "y": 8,
    "proj": "gb"
  }, {
    "GridRef": "NA",
    "x": 0,
    "y": 9,
    "proj": "gb"
  }, {
    "GridRef": "SW",
    "x": 1,
    "y": 0,
    "proj": "gb"
  }, {
    "GridRef": "SR",
    "x": 1,
    "y": 1,
    "proj": "gb"
  }, {
    "GridRef": "SM",
    "x": 1,
    "y": 2,
    "proj": "gb"
  }, {
    "GridRef": "NW",
    "x": 1,
    "y": 5,
    "proj": "gb"
  }, {
    "GridRef": "NR",
    "x": 1,
    "y": 6,
    "proj": "gb"
  }, {
    "GridRef": "NM",
    "x": 1,
    "y": 7,
    "proj": "gb"
  }, {
    "GridRef": "NG",
    "x": 1,
    "y": 8,
    "proj": "gb"
  }, {
    "GridRef": "NB",
    "x": 1,
    "y": 9,
    "proj": "gb"
  }, {
    "GridRef": "HW",
    "x": 1,
    "y": 10,
    "proj": "gb"
  }, {
    "GridRef": "SX",
    "x": 2,
    "y": 0,
    "proj": "gb"
  }, {
    "GridRef": "SS",
    "x": 2,
    "y": 1,
    "proj": "gb"
  }, {
    "GridRef": "SN",
    "x": 2,
    "y": 2,
    "proj": "gb"
  }, {
    "GridRef": "SH",
    "x": 2,
    "y": 3,
    "proj": "gb"
  }, {
    "GridRef": "SC",
    "x": 2,
    "y": 4,
    "proj": "gb"
  }, {
    "GridRef": "NX",
    "x": 2,
    "y": 5,
    "proj": "gb"
  }, {
    "GridRef": "NS",
    "x": 2,
    "y": 6,
    "proj": "gb"
  }, {
    "GridRef": "NN",
    "x": 2,
    "y": 7,
    "proj": "gb"
  }, {
    "GridRef": "NH",
    "x": 2,
    "y": 8,
    "proj": "gb"
  }, {
    "GridRef": "NC",
    "x": 2,
    "y": 9,
    "proj": "gb"
  }, {
    "GridRef": "HX",
    "x": 2,
    "y": 10,
    "proj": "gb"
  }, {
    "GridRef": "SY",
    "x": 3,
    "y": 0,
    "proj": "gb"
  }, {
    "GridRef": "ST",
    "x": 3,
    "y": 1,
    "proj": "gb"
  }, {
    "GridRef": "SO",
    "x": 3,
    "y": 2,
    "proj": "gb"
  }, {
    "GridRef": "SJ",
    "x": 3,
    "y": 3,
    "proj": "gb"
  }, {
    "GridRef": "SD",
    "x": 3,
    "y": 4,
    "proj": "gb"
  }, {
    "GridRef": "NY",
    "x": 3,
    "y": 5,
    "proj": "gb"
  }, {
    "GridRef": "NT",
    "x": 3,
    "y": 6,
    "proj": "gb"
  }, {
    "GridRef": "NO",
    "x": 3,
    "y": 7,
    "proj": "gb"
  }, {
    "GridRef": "NJ",
    "x": 3,
    "y": 8,
    "proj": "gb"
  }, {
    "GridRef": "ND",
    "x": 3,
    "y": 9,
    "proj": "gb"
  }, {
    "GridRef": "HY",
    "x": 3,
    "y": 10,
    "proj": "gb"
  }, {
    "GridRef": "HT",
    "x": 3,
    "y": 11,
    "proj": "gb"
  }, {
    "GridRef": "SZ",
    "x": 4,
    "y": 0,
    "proj": "gb"
  }, {
    "GridRef": "SU",
    "x": 4,
    "y": 1,
    "proj": "gb"
  }, {
    "GridRef": "SP",
    "x": 4,
    "y": 2,
    "proj": "gb"
  }, {
    "GridRef": "SK",
    "x": 4,
    "y": 3,
    "proj": "gb"
  }, {
    "GridRef": "SE",
    "x": 4,
    "y": 4,
    "proj": "gb"
  }, {
    "GridRef": "NZ",
    "x": 4,
    "y": 5,
    "proj": "gb"
  }, {
    "GridRef": "NU",
    "x": 4,
    "y": 6,
    "proj": "gb"
  }, {
    "GridRef": "NK",
    "x": 4,
    "y": 8,
    "proj": "gb"
  }, {
    "GridRef": "HZ",
    "x": 4,
    "y": 10,
    "proj": "gb"
  }, {
    "GridRef": "HU",
    "x": 4,
    "y": 11,
    "proj": "gb"
  }, {
    "GridRef": "HP",
    "x": 4,
    "y": 12,
    "proj": "gb"
  }, {
    "GridRef": "TV",
    "x": 5,
    "y": 0,
    "proj": "gb"
  }, {
    "GridRef": "TQ",
    "x": 5,
    "y": 1,
    "proj": "gb"
  }, {
    "GridRef": "TL",
    "x": 5,
    "y": 2,
    "proj": "gb"
  }, {
    "GridRef": "TF",
    "x": 5,
    "y": 3,
    "proj": "gb"
  }, {
    "GridRef": "TA",
    "x": 5,
    "y": 4,
    "proj": "gb"
  }, {
    "GridRef": "OV",
    "x": 5,
    "y": 5,
    "proj": "gb"
  }, {
    "GridRef": "TR",
    "x": 6,
    "y": 1,
    "proj": "gb"
  }, {
    "GridRef": "TM",
    "x": 6,
    "y": 2,
    "proj": "gb"
  }, {
    "GridRef": "TG",
    "x": 6,
    "y": 3,
    "proj": "gb"
  }, {
    "GridRef": "V",
    "x": 0,
    "y": 0,
    "proj": "ir"
  }, {
    "GridRef": "Q",
    "x": 0,
    "y": 1,
    "proj": "ir"
  }, {
    "GridRef": "L",
    "x": 0,
    "y": 2,
    "proj": "ir"
  }, {
    "GridRef": "F",
    "x": 0,
    "y": 3,
    "proj": "ir"
  }, {
    "GridRef": "A",
    "x": 0,
    "y": 4,
    "proj": "ir"
  }, {
    "GridRef": "W",
    "x": 1,
    "y": 0,
    "proj": "ir"
  }, {
    "GridRef": "R",
    "x": 1,
    "y": 1,
    "proj": "ir"
  }, {
    "GridRef": "M",
    "x": 1,
    "y": 2,
    "proj": "ir"
  }, {
    "GridRef": "G",
    "x": 1,
    "y": 3,
    "proj": "ir"
  }, {
    "GridRef": "B",
    "x": 1,
    "y": 4,
    "proj": "ir"
  }, {
    "GridRef": "X",
    "x": 2,
    "y": 0,
    "proj": "ir"
  }, {
    "GridRef": "S",
    "x": 2,
    "y": 1,
    "proj": "ir"
  }, {
    "GridRef": "N",
    "x": 2,
    "y": 2,
    "proj": "ir"
  }, {
    "GridRef": "H",
    "x": 2,
    "y": 3,
    "proj": "ir"
  }, {
    "GridRef": "C",
    "x": 2,
    "y": 4,
    "proj": "ir"
  }, {
    "GridRef": "Y",
    "x": 3,
    "y": 0,
    "proj": "ir"
  }, {
    "GridRef": "T",
    "x": 3,
    "y": 1,
    "proj": "ir"
  }, {
    "GridRef": "O",
    "x": 3,
    "y": 2,
    "proj": "ir"
  }, {
    "GridRef": "J",
    "x": 3,
    "y": 3,
    "proj": "ir"
  }, {
    "GridRef": "D",
    "x": 3,
    "y": 4,
    "proj": "ir"
  }, {
    "GridRef": "Z",
    "x": 4,
    "y": 0,
    "proj": "ir"
  }, {
    "GridRef": "U",
    "x": 4,
    "y": 1,
    "proj": "ir"
  }, {
    "GridRef": "P",
    "x": 4,
    "y": 2,
    "proj": "ir"
  }, {
    "GridRef": "K",
    "x": 4,
    "y": 3,
    "proj": "ir"
  }, {
    "GridRef": "E",
    "x": 4,
    "y": 4,
    "proj": "ir"
  }, {
    "GridRef": "WV",
    "x": 5,
    "y": 54,
    "proj": "ci"
  }, {
    "GridRef": "WA",
    "x": 5,
    "y": 55,
    "proj": "ci"
  }];
  /** @constant
    * @description The default export from this module is an object with a property
    * for every 100 km square reference for Britain (Brtish National Grid),
    * Ireland (Irish National Grid) and the Channel Islands (abbreviated UTM 30N).
    * Each grid reference references an object that has properties x, y and proj.
    * The x and y coordinates represent the centroid of the 100 km square in the
    * coordinate reference system corresponding to the aforementioned areas, respectively
    * epsg:27700, epsg:29903 and epsg:32630. Another property, proj, indicates the region/CRS
    * with two letter codes, respectively gb, ir and ci.
    * <p>An example of the object referenced through the property 'SO' is shown below:</p>
    * <pre>
    * {
    *   "x": 3,
    *   "y": 2,
    *   "proj": "gb"
    * }
    * </pre>
    * @type {object}
  */

  var km100s = a100km.reduce(function (acc, km100) {
    acc[km100.GridRef] = {
      x: km100.x,
      y: km100.y,
      proj: km100.proj
    };
    return acc;
  }, {});
  /** @module src/checkGr */

  function invalidGridRef(gr) {
    throw "The value '".concat(gr, "' is not recognised as a valid grid reference.");
  }
  /**
   * Given a grid reference (British National Grid, Irish Grid or UTM zone 30N shorthand),
   * check that ths is a valid GR. If it is, return an object which includes the 
   * GR precision in metres, the prefix and the two-letter projection code.
   * If an invalid grid reference is supplied throws an error.
   * @param {string} gr - the grid reference.
   * @returns {object} Object of the form {precision: n, prefix: 'prefix', projection: 'code'}.
   */


  function checkGr(gr) {
    var r100km = RegExp('^[a-zA-Z]{1,2}$');
    var rHectad = RegExp('^[a-zA-Z]{1,2}[0-9]{2}$');
    var rQuandrant = RegExp('^[a-zA-Z]{1,2}[0-9]{2}[SsNn][WwEe]$');
    var rTetrad = RegExp('^[a-zA-Z]{1,2}[0-9]{2}[a-np-zA-NP-Z]$');
    var rMonad = RegExp('^[a-zA-Z]{1,2}[0-9]{4}$');
    var r6fig = RegExp('^[a-zA-Z]{1,2}[0-9]{6}$');
    var r8fig = RegExp('^[a-zA-Z]{1,2}[0-9]{8}$');
    var r10fig = RegExp('^[a-zA-Z]{1,2}[0-9]{10}$');
    var match = gr.match(/^[A-Za-z]+/);
    if (!match) invalidGridRef(gr);
    var prefix = match[0].toUpperCase();
    var km100 = km100s[prefix];
    if (!km100) invalidGridRef(gr);
    var ret = {
      precision: null,
      prefix: prefix,
      projection: km100.proj
    };

    if (r100km.test(gr)) {
      // The GR is a 100 km square reference
      ret.precision = 100000;
    } else if (rHectad.test(gr)) {
      // The GR is a hectad
      ret.precision = 10000;
    } else if (rQuandrant.test(gr)) {
      // The GR is a quandrant
      ret.precision = 5000;
    } else if (rTetrad.test(gr)) {
      // The GR is a tetrad
      ret.precision = 2000;
    } else if (rMonad.test(gr)) {
      // The GR is a monad
      ret.precision = 1000;
    } else if (r6fig.test(gr)) {
      // The GR is a 6 figure GR
      ret.precision = 100;
    } else if (r8fig.test(gr)) {
      // The GR is a 8 figure GR
      ret.precision = 10;
    } else if (r10fig.test(gr)) {
      // The GR is a 10 figure GR
      ret.precision = 1;
    } else {
      invalidGridRef(gr);
    }

    return ret;
  }
  /** @module src/projections */

  /** @constant
    * @description This object describes the coordinate reference systems used in this project corresponding
    * to the British National Grid, Irish Grid, UTM zone 30N (used for the Channel Islands)  and WGS 84. The object contains
    * four properties, each named with the two letter code used throughout this package to represent one of the
    * three systems: gb, ir, ci and wg. Each of these properties provides access to an object defining the name,
    * epsg code and proj4 string for the CRS.
    * @type {array}
  */


  var projections$1 = {
    gb: {
      name: 'OSGB 1936 / British National Grid',
      epsg: '27700',
      proj4: '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs'
    },
    ir: {
      name: 'TM75 / Irish Grid',
      epsg: '29903',
      proj4: '+proj=tmerc +lat_0=53.5 +lon_0=-8 +k=1.000035 +x_0=200000 +y_0=250000 +ellps=mod_airy +towgs84=482.5,-130.6,564.6,-1.042,-0.214,-0.631,8.15 +units=m +no_defs'
    },
    ci: {
      name: 'WGS 84 / UTM zone 30N',
      epsg: '32630',
      proj4: '+proj=utm +zone=30 +datum=WGS84 +units=m +no_defs'
    },
    wg: {
      name: 'WGS 84',
      epsg: '4326',
      proj4: '+proj=longlat +datum=WGS84 +no_defs'
    }
  };
  /** @module src/quadrants */

  /** @constant
    * @description This object specifies the x, y offsets associated with suffixes for quandrant grid refs.
    * @type {Object}
  */

  var qOffsets = {
    sw: {
      x: 0,
      y: 0
    },
    se: {
      x: 5000,
      y: 0
    },
    nw: {
      x: 0,
      y: 5000
    },
    ne: {
      x: 5000,
      y: 5000
    }
  };
  /** @module src/tetrads */

  /** @constant
    * @description This object specifies the x, y offsets associated with suffixes for tetrad grid refs.
    * @type {Object}
  */

  var tOffsets = {
    a: {
      x: 0,
      y: 0
    },
    b: {
      x: 0,
      y: 2000
    },
    c: {
      x: 0,
      y: 4000
    },
    d: {
      x: 0,
      y: 6000
    },
    e: {
      x: 0,
      y: 8000
    },
    f: {
      x: 2000,
      y: 0
    },
    g: {
      x: 2000,
      y: 2000
    },
    h: {
      x: 2000,
      y: 4000
    },
    i: {
      x: 2000,
      y: 6000
    },
    j: {
      x: 2000,
      y: 8000
    },
    k: {
      x: 4000,
      y: 0
    },
    l: {
      x: 4000,
      y: 2000
    },
    m: {
      x: 4000,
      y: 4000
    },
    n: {
      x: 4000,
      y: 6000
    },
    p: {
      x: 4000,
      y: 8000
    },
    q: {
      x: 6000,
      y: 0
    },
    r: {
      x: 6000,
      y: 2000
    },
    s: {
      x: 6000,
      y: 4000
    },
    t: {
      x: 6000,
      y: 6000
    },
    u: {
      x: 6000,
      y: 8000
    },
    v: {
      x: 8000,
      y: 0
    },
    w: {
      x: 8000,
      y: 2000
    },
    x: {
      x: 8000,
      y: 4000
    },
    y: {
      x: 8000,
      y: 6000
    },
    z: {
      x: 8000,
      y: 8000
    }
  };
  /** @module src/getCentroid */

  /**
   * Given a grid reference (British National Grid, Irish Grid or UTM zone 30N shorthand),
   * and a two-letter code defining the requested output projection, this function
   * returns the centroid of the grid reference.
   * @param {string} gr - the grid reference
   * @param {string} toProjection - two letter code specifying the required output CRS.
   * @returns {object} - of the form {centroid: [x, y], proj: 'code'}; x and y are 
   * coordinates in CRS specified by toProjection. The proj code indicates the source projection.
   */

  function getCentroid(gr, toProjection) {
    var x, y, outCoords, suffix;
    var grType = checkGr(gr);
    var prefix = grType.prefix;
    var km100 = km100s[prefix];

    switch (grType.precision) {
      case 100000:
        x = km100.x * 100000 + 50000;
        y = km100.y * 100000 + 50000;
        break;

      case 10000:
        x = km100.x * 100000 + Number(gr.substr(prefix.length, 1)) * 10000 + 5000;
        y = km100.y * 100000 + Number(gr.substr(prefix.length + 1, 1)) * 10000 + 5000;
        break;

      case 5000:
        suffix = gr.substr(prefix.length + 2, 2).toLowerCase();
        x = km100.x * 100000 + Number(gr.substr(prefix.length, 1)) * 10000 + qOffsets[suffix].x + 2500;
        y = km100.y * 100000 + Number(gr.substr(prefix.length + 1, 1)) * 10000 + qOffsets[suffix].y + 2500;
        break;

      case 2000:
        suffix = gr.substr(prefix.length + 2, 1).toLowerCase();
        x = km100.x * 100000 + Number(gr.substr(prefix.length, 1)) * 10000 + tOffsets[suffix].x + 1000;
        y = km100.y * 100000 + Number(gr.substr(prefix.length + 1, 1)) * 10000 + tOffsets[suffix].y + 1000;
        break;

      case 1000:
        x = km100.x * 100000 + Number(gr.substr(prefix.length, 2)) * 1000 + 500;
        y = km100.y * 100000 + Number(gr.substr(prefix.length + 2, 2)) * 1000 + 500;
        break;

      case 100:
        x = km100.x * 100000 + Number(gr.substr(prefix.length, 3)) * 100 + 50;
        y = km100.y * 100000 + Number(gr.substr(prefix.length + 3, 3)) * 100 + 50;
        break;

      case 10:
        x = km100.x * 100000 + Number(gr.substr(prefix.length, 4)) * 10 + 5;
        y = km100.y * 100000 + Number(gr.substr(prefix.length + 4, 4)) * 10 + 5;
        break;

      default:
        x = km100.x * 100000 + Number(gr.substr(prefix.length, 5)) + 0.5;
        y = km100.y * 100000 + Number(gr.substr(prefix.length + 5, 5)) + 0.5;
    } // If the required output projection does not match the projection of the input GR
    // then use proj4 to reproject


    if (toProjection !== km100.proj) {
      outCoords = proj4(projections$1[km100.proj].proj4, projections$1[toProjection].proj4, [x, y]);
    } else {
      outCoords = [x, y];
    }

    return {
      centroid: outCoords,
      proj: km100.proj
    };
  }

  /** @module src/constants */

  /** @constant
    * @description This object contains some constants which may be required 
    * throughout the library.
    *  @type {object}
  */
  var constants = {
    cdn: 'https://unpkg.com/brc-atlas-bigr/dist'
  };

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);
  }

  function _iterableToArray(iter) {
    if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
  }

  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }

  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) {
      arr2[i] = arr[i];
    }

    return arr2;
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  var MicroModal = function () {
    var FOCUSABLE_ELEMENTS = ['a[href]', 'area[href]', 'input:not([disabled]):not([type="hidden"]):not([aria-hidden])', 'select:not([disabled]):not([aria-hidden])', 'textarea:not([disabled]):not([aria-hidden])', 'button:not([disabled]):not([aria-hidden])', 'iframe', 'object', 'embed', '[contenteditable]', '[tabindex]:not([tabindex^="-"])'];

    var Modal = /*#__PURE__*/function () {
      function Modal(_ref) {
        var targetModal = _ref.targetModal,
            _ref$triggers = _ref.triggers,
            triggers = _ref$triggers === void 0 ? [] : _ref$triggers,
            _ref$onShow = _ref.onShow,
            onShow = _ref$onShow === void 0 ? function () {} : _ref$onShow,
            _ref$onClose = _ref.onClose,
            onClose = _ref$onClose === void 0 ? function () {} : _ref$onClose,
            _ref$openTrigger = _ref.openTrigger,
            openTrigger = _ref$openTrigger === void 0 ? 'data-micromodal-trigger' : _ref$openTrigger,
            _ref$closeTrigger = _ref.closeTrigger,
            closeTrigger = _ref$closeTrigger === void 0 ? 'data-micromodal-close' : _ref$closeTrigger,
            _ref$openClass = _ref.openClass,
            openClass = _ref$openClass === void 0 ? 'is-open' : _ref$openClass,
            _ref$disableScroll = _ref.disableScroll,
            disableScroll = _ref$disableScroll === void 0 ? false : _ref$disableScroll,
            _ref$disableFocus = _ref.disableFocus,
            disableFocus = _ref$disableFocus === void 0 ? false : _ref$disableFocus,
            _ref$awaitCloseAnimat = _ref.awaitCloseAnimation,
            awaitCloseAnimation = _ref$awaitCloseAnimat === void 0 ? false : _ref$awaitCloseAnimat,
            _ref$awaitOpenAnimati = _ref.awaitOpenAnimation,
            awaitOpenAnimation = _ref$awaitOpenAnimati === void 0 ? false : _ref$awaitOpenAnimati,
            _ref$debugMode = _ref.debugMode,
            debugMode = _ref$debugMode === void 0 ? false : _ref$debugMode;

        _classCallCheck(this, Modal); // Save a reference of the modal


        this.modal = document.getElementById(targetModal); // Save a reference to the passed config

        this.config = {
          debugMode: debugMode,
          disableScroll: disableScroll,
          openTrigger: openTrigger,
          closeTrigger: closeTrigger,
          openClass: openClass,
          onShow: onShow,
          onClose: onClose,
          awaitCloseAnimation: awaitCloseAnimation,
          awaitOpenAnimation: awaitOpenAnimation,
          disableFocus: disableFocus
        }; // Register click events only if pre binding eventListeners

        if (triggers.length > 0) this.registerTriggers.apply(this, _toConsumableArray(triggers)); // pre bind functions for event listeners

        this.onClick = this.onClick.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
      }
      /**
       * Loops through all openTriggers and binds click event
       * @param  {array} triggers [Array of node elements]
       * @return {void}
       */


      _createClass(Modal, [{
        key: "registerTriggers",
        value: function registerTriggers() {
          var _this = this;

          for (var _len = arguments.length, triggers = new Array(_len), _key = 0; _key < _len; _key++) {
            triggers[_key] = arguments[_key];
          }

          triggers.filter(Boolean).forEach(function (trigger) {
            trigger.addEventListener('click', function (event) {
              return _this.showModal(event);
            });
          });
        }
      }, {
        key: "showModal",
        value: function showModal() {
          var _this2 = this;

          var event = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
          this.activeElement = document.activeElement;
          this.modal.setAttribute('aria-hidden', 'false');
          this.modal.classList.add(this.config.openClass);
          this.scrollBehaviour('disable');
          this.addEventListeners();

          if (this.config.awaitOpenAnimation) {
            var handler = function handler() {
              _this2.modal.removeEventListener('animationend', handler, false);

              _this2.setFocusToFirstNode();
            };

            this.modal.addEventListener('animationend', handler, false);
          } else {
            this.setFocusToFirstNode();
          }

          this.config.onShow(this.modal, this.activeElement, event);
        }
      }, {
        key: "closeModal",
        value: function closeModal() {
          var event = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
          var modal = this.modal;
          this.modal.setAttribute('aria-hidden', 'true');
          this.removeEventListeners();
          this.scrollBehaviour('enable');

          if (this.activeElement && this.activeElement.focus) {
            this.activeElement.focus();
          }

          this.config.onClose(this.modal, this.activeElement, event);

          if (this.config.awaitCloseAnimation) {
            var openClass = this.config.openClass; // <- old school ftw

            this.modal.addEventListener('animationend', function handler() {
              modal.classList.remove(openClass);
              modal.removeEventListener('animationend', handler, false);
            }, false);
          } else {
            modal.classList.remove(this.config.openClass);
          }
        }
      }, {
        key: "closeModalById",
        value: function closeModalById(targetModal) {
          this.modal = document.getElementById(targetModal);
          if (this.modal) this.closeModal();
        }
      }, {
        key: "scrollBehaviour",
        value: function scrollBehaviour(toggle) {
          if (!this.config.disableScroll) return;
          var body = document.querySelector('body');

          switch (toggle) {
            case 'enable':
              Object.assign(body.style, {
                overflow: ''
              });
              break;

            case 'disable':
              Object.assign(body.style, {
                overflow: 'hidden'
              });
              break;
          }
        }
      }, {
        key: "addEventListeners",
        value: function addEventListeners() {
          this.modal.addEventListener('touchstart', this.onClick);
          this.modal.addEventListener('click', this.onClick);
          document.addEventListener('keydown', this.onKeydown);
        }
      }, {
        key: "removeEventListeners",
        value: function removeEventListeners() {
          this.modal.removeEventListener('touchstart', this.onClick);
          this.modal.removeEventListener('click', this.onClick);
          document.removeEventListener('keydown', this.onKeydown);
        }
      }, {
        key: "onClick",
        value: function onClick(event) {
          if (event.target.hasAttribute(this.config.closeTrigger)) {
            this.closeModal(event);
          }
        }
      }, {
        key: "onKeydown",
        value: function onKeydown(event) {
          if (event.keyCode === 27) this.closeModal(event); // esc

          if (event.keyCode === 9) this.retainFocus(event); // tab
        }
      }, {
        key: "getFocusableNodes",
        value: function getFocusableNodes() {
          var nodes = this.modal.querySelectorAll(FOCUSABLE_ELEMENTS);
          return Array.apply(void 0, _toConsumableArray(nodes));
        }
        /**
         * Tries to set focus on a node which is not a close trigger
         * if no other nodes exist then focuses on first close trigger
         */

      }, {
        key: "setFocusToFirstNode",
        value: function setFocusToFirstNode() {
          var _this3 = this;

          if (this.config.disableFocus) return;
          var focusableNodes = this.getFocusableNodes(); // no focusable nodes

          if (focusableNodes.length === 0) return; // remove nodes on whose click, the modal closes
          // could not think of a better name :(

          var nodesWhichAreNotCloseTargets = focusableNodes.filter(function (node) {
            return !node.hasAttribute(_this3.config.closeTrigger);
          });
          if (nodesWhichAreNotCloseTargets.length > 0) nodesWhichAreNotCloseTargets[0].focus();
          if (nodesWhichAreNotCloseTargets.length === 0) focusableNodes[0].focus();
        }
      }, {
        key: "retainFocus",
        value: function retainFocus(event) {
          var focusableNodes = this.getFocusableNodes(); // no focusable nodes

          if (focusableNodes.length === 0) return;
          /**
           * Filters nodes which are hidden to prevent
           * focus leak outside modal
           */

          focusableNodes = focusableNodes.filter(function (node) {
            return node.offsetParent !== null;
          }); // if disableFocus is true

          if (!this.modal.contains(document.activeElement)) {
            focusableNodes[0].focus();
          } else {
            var focusedItemIndex = focusableNodes.indexOf(document.activeElement);

            if (event.shiftKey && focusedItemIndex === 0) {
              focusableNodes[focusableNodes.length - 1].focus();
              event.preventDefault();
            }

            if (!event.shiftKey && focusableNodes.length > 0 && focusedItemIndex === focusableNodes.length - 1) {
              focusableNodes[0].focus();
              event.preventDefault();
            }
          }
        }
      }]);

      return Modal;
    }();
    /**
     * Modal prototype ends.
     * Here on code is responsible for detecting and
     * auto binding event handlers on modal triggers
     */
    // Keep a reference to the opened modal


    var activeModal = null;
    /**
     * Generates an associative array of modals and it's
     * respective triggers
     * @param  {array} triggers     An array of all triggers
     * @param  {string} triggerAttr The data-attribute which triggers the module
     * @return {array}
     */

    var generateTriggerMap = function generateTriggerMap(triggers, triggerAttr) {
      var triggerMap = [];
      triggers.forEach(function (trigger) {
        var targetModal = trigger.attributes[triggerAttr].value;
        if (triggerMap[targetModal] === undefined) triggerMap[targetModal] = [];
        triggerMap[targetModal].push(trigger);
      });
      return triggerMap;
    };
    /**
     * Validates whether a modal of the given id exists
     * in the DOM
     * @param  {number} id  The id of the modal
     * @return {boolean}
     */


    var validateModalPresence = function validateModalPresence(id) {
      if (!document.getElementById(id)) {
        console.warn("MicroModal: \u2757Seems like you have missed %c'".concat(id, "'"), 'background-color: #f8f9fa;color: #50596c;font-weight: bold;', 'ID somewhere in your code. Refer example below to resolve it.');
        console.warn("%cExample:", 'background-color: #f8f9fa;color: #50596c;font-weight: bold;', "<div class=\"modal\" id=\"".concat(id, "\"></div>"));
        return false;
      }
    };
    /**
     * Validates if there are modal triggers present
     * in the DOM
     * @param  {array} triggers An array of data-triggers
     * @return {boolean}
     */


    var validateTriggerPresence = function validateTriggerPresence(triggers) {
      if (triggers.length <= 0) {
        console.warn("MicroModal: \u2757Please specify at least one %c'micromodal-trigger'", 'background-color: #f8f9fa;color: #50596c;font-weight: bold;', 'data attribute.');
        console.warn("%cExample:", 'background-color: #f8f9fa;color: #50596c;font-weight: bold;', "<a href=\"#\" data-micromodal-trigger=\"my-modal\"></a>");
        return false;
      }
    };
    /**
     * Checks if triggers and their corresponding modals
     * are present in the DOM
     * @param  {array} triggers   Array of DOM nodes which have data-triggers
     * @param  {array} triggerMap Associative array of modals and their triggers
     * @return {boolean}
     */


    var validateArgs = function validateArgs(triggers, triggerMap) {
      validateTriggerPresence(triggers);
      if (!triggerMap) return true;

      for (var id in triggerMap) {
        validateModalPresence(id);
      }

      return true;
    };
    /**
     * Binds click handlers to all modal triggers
     * @param  {object} config [description]
     * @return void
     */


    var init = function init(config) {
      // Create an config object with default openTrigger
      var options = Object.assign({}, {
        openTrigger: 'data-micromodal-trigger'
      }, config); // Collects all the nodes with the trigger

      var triggers = _toConsumableArray(document.querySelectorAll("[".concat(options.openTrigger, "]"))); // Makes a mappings of modals with their trigger nodes


      var triggerMap = generateTriggerMap(triggers, options.openTrigger); // Checks if modals and triggers exist in dom

      if (options.debugMode === true && validateArgs(triggers, triggerMap) === false) return; // For every target modal creates a new instance

      for (var key in triggerMap) {
        var value = triggerMap[key];
        options.targetModal = key;
        options.triggers = _toConsumableArray(value);
        activeModal = new Modal(options); // eslint-disable-line no-new
      }
    };
    /**
     * Shows a particular modal
     * @param  {string} targetModal [The id of the modal to display]
     * @param  {object} config [The configuration object to pass]
     * @return {void}
     */


    var show = function show(targetModal, config) {
      var options = config || {};
      options.targetModal = targetModal; // Checks if modals and triggers exist in dom

      if (options.debugMode === true && validateModalPresence(targetModal) === false) return; // clear events in case previous modal wasn't close

      if (activeModal) activeModal.removeEventListeners(); // stores reference to active modal

      activeModal = new Modal(options); // eslint-disable-line no-new

      activeModal.showModal();
    };
    /**
     * Closes the active modal
     * @param  {string} targetModal [The id of the modal to close]
     * @return {void}
     */


    var close = function close(targetModal) {
      targetModal ? activeModal.closeModalById(targetModal) : activeModal.closeModal();
    };

    return {
      init: init,
      show: show,
      close: close
    };
  }();

  window.MicroModal = MicroModal;

  /**
   * #TODO
   * @returns {null} - there is no return object.
   */
  // export function optsDialog({
  //     // Default options in here
  //     parentId = 'body',
  //     transOptsSel = {},
  //     transOptsKey = "",
  //     transOptsOpts = false,
  //     mapTypesSel = {},
  //     mapTypesKey = "",
  //     mapTypesOpts = false,
  //     applyFunction = null,
  //   } = {}) {

  function optsDialog(parentId, transOptsSel, transOptsKey, transOptsOpts, mapTypesSel, mapTypesKey, mapTypesOpts, applyFunction) {
    // Create map SVG in given parent
    var div1 = select("#".concat(parentId)).append("div").classed("modal micromodal-slide", true).attr("id", "modal-1").attr("aria-hidden", "true");
    var div2 = div1.append("div").classed("modal__overlay", true).attr("tabindex", "-1").attr("data-micromodal-close", "");
    var div3 = div2.append("div").classed("modal__container", true).attr("role", "dialog").attr("aria-modal", "true").attr("aria-labelledby", "modal-1-title");
    var header = div3.append("header").classed("modal__header", true);
    header.append("h2").classed("modal__title", true).attr("id", "modal-1-title").text("Map options");
    header.append("button").classed("modal__close", true).attr("aria-label", "Close modal").attr("data-micromodal-close", "");
    var main = div3.append("main").classed("modal__content", true).attr("id", "modal-1-content");
    transOptsSelection(main, transOptsSel, transOptsKey, transOptsOpts);
    mapTypeSelection(main, mapTypesSel, mapTypesKey, mapTypesOpts);
    var footer = div3.append("main").classed("modal__footer", true);
    var apply = footer.append("button").classed("modal__btn modal__btn-primary", true).attr("data-micromodal-close", "").text("Okay");
    footer.append("button").classed("modal__btn", true).attr("data-micromodal-close", "").attr("aria-label", "Close this dialog window").text("Cancel");
    MicroModal.init();
    apply.on("click", function () {
      var ret = {};

      if (transOptsOpts && Object.keys(transOptsSel).length > 1) {
        ret.transOptsKey = select('input[name="transOptsRadio"]:checked').node().value;
      }

      if (mapTypesOpts && Object.keys(mapTypesSel).length > 1) {
        ret.mapTypesKey = select('input[name="mapTypeRadio"]:checked').node().value;
      }

      applyFunction(ret);
    });
  }
  function showOptsDialog(mapTypesKey, transOptsSel, transOptsKey) {
    if (document.getElementById(transOptsSel[transOptsKey])) {
      document.getElementById(transOptsSel[transOptsKey]).checked = true;
    }

    var id = mapTypesKey.replace(/ /g, '');

    if (document.getElementById(id)) {
      document.getElementById(id).checked = true;
    }

    MicroModal.show('modal-1');
  }

  function transOptsSelection(el, transOptsSel, transOptsKey, transOptsOpts) {
    if (transOptsOpts && Object.keys(transOptsSel).length > 1) {
      el.append("h3").text("Extent & view");
      Object.keys(transOptsSel).forEach(function (k) {
        var radio = el.append("input").attr("type", "radio").attr("id", transOptsSel[k]).attr("name", "transOptsRadio").attr("value", k);
        el.append("label").attr("for", transOptsSel[k]).text(k);

        if (k === transOptsKey) {
          radio.attr("checked", "checked");
        }

        if (k !== Object.keys(transOptsSel)[Object.keys(transOptsSel).length - 1]) {
          el.append("br");
        }
      });
    }
  }

  function mapTypeSelection(el, mapTypesSel, mapTypesKey, mapTypesOpts) {
    var id = mapTypesKey.replace(/ /g, '');

    if (mapTypesOpts && Object.keys(mapTypesSel).length > 1) {
      el.append("h3").text("Map information type");
      Object.keys(mapTypesSel).forEach(function (k) {
        var radio = el.append("input").attr("type", "radio").attr("id", id).attr("name", "mapTypeRadio").attr("value", k);
        el.append("label").attr("for", id).text(k);

        if (k === mapTypesKey) {
          radio.attr("checked", "checked");
        }

        if (k !== Object.keys(mapTypesSel)[Object.keys(mapTypesSel).length - 1]) {
          el.append("br");
        }
      });
    }
  }

  /* ANY GENERALLY USEFUL DATA ACCESS ROUTINES SHOULD GO IN THIS MODULE *?

  /**
   * This will be a general purpose CSV reader that will read
   * CSV expecting columns gr, shape, size, colour etc.
   * @param {Object} opts - initialisation options.
   */

  function csvHectad(opts) {
    // #TDOO - code below is just a placeholder
    return new Promise(function (resolve, reject) {
      csv$1(opts.data, function (r) {
        if (r.Hectad) {
          // e.g. {Hectad: "NZ09"}
          return {
            gr: r.Hectad,
            colour: "red"
          };
        }
      }).then(function (data) {
        resolve({
          records: data,
          size: 1,
          shape: 'circle',
          precision: 10000,
          opacity: 0.8
        });
      })["catch"](function (e) {
        reject(e);
      });
    });
  }

  /**
   * #TODO - description and full parameter list.
   * @param {Object} opts - initialisation options.
   * @param {string} opts.id - the id of the element which will be the parent of the SVG.
   * @param {number} opts.height - the height of the SVG.
   * @param {boolean} opts.expand - indicates whether or not the map will expand to fill parent element.
   * @param {Object or string} opts.transOptsInit - a transformation object or a string representing a pre-defined transformation.
   * @param {string} opts.boundaryGjson - the URL of a boundary geoJson file to display.
   * @param {string} opts.gridGjson - the URL of a grid geoJson file to display.
   * @returns {null} - there is no return object.
   */

  function svgMap() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        _ref$id = _ref.id,
        id = _ref$id === void 0 ? 'body' : _ref$id,
        _ref$height = _ref.height,
        height = _ref$height === void 0 ? 500 : _ref$height,
        _ref$expand = _ref.expand,
        expand = _ref$expand === void 0 ? false : _ref$expand,
        _ref$legend = _ref.legend,
        legend = _ref$legend === void 0 ? false : _ref$legend,
        _ref$legendScale = _ref.legendScale,
        legendScale = _ref$legendScale === void 0 ? 1 : _ref$legendScale,
        _ref$legendX = _ref.legendX,
        legendX = _ref$legendX === void 0 ? 10 : _ref$legendX,
        _ref$legendY = _ref.legendY,
        legendY = _ref$legendY === void 0 ? 5 : _ref$legendY,
        _ref$transOptsInit = _ref.transOptsInit,
        transOptsInit = _ref$transOptsInit === void 0 ? '' : _ref$transOptsInit,
        _ref$transOptsSel = _ref.transOptsSel,
        transOptsSel = _ref$transOptsSel === void 0 ? {
      'No insets': 'BI1'
    } : _ref$transOptsSel,
        _ref$transOptsOpts = _ref.transOptsOpts,
        transOptsOpts = _ref$transOptsOpts === void 0 ? true : _ref$transOptsOpts,
        _ref$mapTypesInit = _ref.mapTypesInit,
        mapTypesInit = _ref$mapTypesInit === void 0 ? 'Standard hectad' : _ref$mapTypesInit,
        _ref$mapTypesSel = _ref.mapTypesSel,
        mapTypesSel = _ref$mapTypesSel === void 0 ? {
      'Standard hectad': csvHectad
    } : _ref$mapTypesSel,
        _ref$mapTypesOpts = _ref.mapTypesOpts,
        mapTypesOpts = _ref$mapTypesOpts === void 0 ? true : _ref$mapTypesOpts,
        _ref$boundaryGjson = _ref.boundaryGjson,
        boundaryGjson = _ref$boundaryGjson === void 0 ? "".concat(constants.cdn, "/assets/GB-I-CI-27700-reduced.geojson") : _ref$boundaryGjson,
        _ref$gridGjson = _ref.gridGjson,
        gridGjson = _ref$gridGjson === void 0 ? "".concat(constants.cdn, "/assets/GB-I-grid-27700-reduced.geojson") : _ref$gridGjson,
        _ref$gridLineColour = _ref.gridLineColour,
        gridLineColour = _ref$gridLineColour === void 0 ? '7C7CD3' : _ref$gridLineColour,
        _ref$boundaryColour = _ref.boundaryColour,
        boundaryColour = _ref$boundaryColour === void 0 ? '7C7CD3' : _ref$boundaryColour,
        _ref$boundaryFill = _ref.boundaryFill,
        boundaryFill = _ref$boundaryFill === void 0 ? 'white' : _ref$boundaryFill,
        _ref$seaFill = _ref.seaFill,
        seaFill = _ref$seaFill === void 0 ? 'E6EFFF' : _ref$seaFill,
        _ref$insetColour = _ref.insetColour,
        insetColour = _ref$insetColour === void 0 ? '7C7CD3' : _ref$insetColour;

    var width, path, transform$1, boundary, dataBoundary, grid, dataGrid, transOptsKey, mapTypesKey, taxonIdentifier; // Set the initial transformation key

    if (transOptsInit && transOptsSel[transOptsInit]) {
      transOptsKey = transOptsInit;
    } else {
      transOptsKey = Object.keys(transOptsSel)[0];
    } // Set the initial map type key


    if (mapTypesInit && mapTypesSel[mapTypesInit]) {
      mapTypesKey = mapTypesInit;
    } else {
      mapTypesKey = Object.keys(mapTypesSel)[0];
    } // Create map SVG in given parent


    var mainDiv = select("#".concat(id)).append("div").style("position", "relative").style("display", "inline");
    var svg = mainDiv.append("svg").style("background-color", seaFill);

    if (transOptsOpts && Object.keys(transOptsSel).length > 1 || mapTypesOpts && Object.keys(mapTypesSel).length > 1) {
      // Add gear icon to invoke options dialog
      mainDiv.append("img").attr("src", "../images/gear.png").style("width", "16px").style("position", "absolute").style("right", "5px").style("bottom", "7px").on("click", function () {
        showOptsDialog(mapTypesKey, transOptsSel, transOptsKey);
      }); // Create to options dialog

      optsDialog(id, transOptsSel, transOptsKey, transOptsOpts, mapTypesSel, mapTypesKey, mapTypesOpts, userChangedOptions);
    }

    function getRadiusPixels(precision) {
      return Math.abs(transform$1([300000, 300000])[0] - transform$1([300000 + precision / 2, 300000])[0]);
    }

    function userChangedOptions(opts) {
      if (opts.transOptsKey && transOptsKey !== opts.transOptsKey) {
        transOptsKey = opts.transOptsKey;
        transformSet();
        drawBoundaryAndGrid();
        setSvgSize();
        drawInsetBoxes();
        refreshDots();
      }

      if (opts.mapTypesKey && mapTypesKey !== opts.mapTypesKey) {
        mapTypesKey = opts.mapTypesKey;
        drawDots();
      }
    }

    function transformSet() {
      var transOpts = transOptsSel[transOptsKey];

      if (typeof transOpts === 'string') {
        transOpts = namedTransOpts[transOpts];
      }

      transform$1 = transformFunction(transOpts, height);
      path = index().projection(transform({
        point: function point(x, y) {
          var tP = transform$1([x, y]);
          var tX = tP[0];
          var tY = tP[1];
          this.stream.point(tX, tY);
        }
      }));
      width = widthFromHeight(transOpts, height);
    }

    function setSvgSize() {
      if (svg) {
        // Set width/height or viewbox depending on required behaviour
        if (expand) {
          svg.attr("viewBox", "0 0 " + width + " " + height);
        } else {
          svg.attr("width", width);
          svg.attr("height", height);
        }
      }
    }

    function drawBoundaryAndGrid() {
      if (dataBoundary) {
        if (boundary) {
          boundary.selectAll("path").remove();
        } else {
          boundary = svg.append("g").attr("id", "boundary");
        }

        boundary.append("path").datum(dataBoundary).attr("d", path).style("fill", boundaryFill).style("stroke", boundaryColour);
      }

      if (dataGrid) {
        if (grid) {
          grid.selectAll("path").remove();
        } else {
          grid = svg.append("g").attr("id", "grid");
        }

        grid.append("path").datum(dataGrid).attr("d", path).style("stroke", gridLineColour);
      }
    }

    function drawInsetBoxes() {
      svg.selectAll('.inset').remove();
      var transOpts = transOptsSel[transOptsKey];

      if (typeof transOpts === 'string') {
        transOpts = namedTransOpts[transOpts];
      }

      getInsetDims(transOpts, height).forEach(function (i) {
        var margin = 10;
        svg.append('rect').classed('inset', true).attr('x', i.x - margin).attr('y', i.y - margin).attr('width', i.width + 2 * margin).attr('height', i.height + 2 * margin).style('fill', 'transparent').style('stroke', insetColour);
      });
    }

    function refreshDots() {
      svg.selectAll('.dotCircle').remove();
      svg.selectAll('.dotSquare').remove();
      svg.selectAll('.dotTriangle').remove();
      drawDots();
    }

    function drawDots() {
      // if(typeof window[mapFunctionName] === 'function') {
      //   window[mapFunctionName](taxonIdentifier).then(data => {
      if (typeof mapTypesSel[mapTypesKey] === 'function') {
        mapTypesSel[mapTypesKey](taxonIdentifier).then(function (data) {
          var radiusPixels = getRadiusPixels(data.precision); // circles

          var recCircles;

          if (data.shape && (data.shape === 'circle' || data.shape === 'bullseye')) {
            recCircles = data.records;
          } else {
            recCircles = data.records.filter(function (d) {
              return d.shape && (d.shape === 'circle' || d.shape === 'bullseye');
            });
          }

          var circles = svg.selectAll('.dotCircle').data(recCircles, function (d) {
            return d.gr;
          });
          circles.enter().append("circle").classed('dotCircle', true).attr("cx", function (d) {
            return transform$1(getCentroid(d.gr, 'gb').centroid)[0];
          }).attr("cy", function (d) {
            return transform$1(getCentroid(d.gr, 'gb').centroid)[1];
          }).attr("r", 0).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour ? d.colour : data.colour;
          }).merge(circles).transition().ease(cubicInOut).duration(500).attr("r", function (d) {
            return d.size ? radiusPixels * d.size : radiusPixels * data.size;
          }).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour ? d.colour : data.colour;
          });
          circles.exit().transition().ease(cubicInOut).duration(500).attr("r", 0).remove(); // bullseye

          var recBullseyes;

          if (data.shape && data.shape === 'bullseye') {
            recBullseyes = data.records;
          } else {
            recBullseyes = data.records.filter(function (d) {
              return d.shape && d.shape === 'bullseye';
            });
          }

          var bullseyes = svg.selectAll('.dotBullseye').data(recBullseyes, function (d) {
            return d.gr;
          });
          bullseyes.enter().append("circle").classed('dotBullseye', true).attr("cx", function (d) {
            return transform$1(getCentroid(d.gr, 'gb').centroid)[0];
          }).attr("cy", function (d) {
            return transform$1(getCentroid(d.gr, 'gb').centroid)[1];
          }).attr("r", 0).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour2 ? d.colour2 : data.colour2;
          }).merge(bullseyes).transition().ease(cubicInOut).duration(500).attr("r", function (d) {
            return d.size ? radiusPixels * d.size * 0.5 : radiusPixels * data.size * 0.5;
          }).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour2 ? d.colour2 : data.colour2;
          });
          bullseyes.exit().transition().ease(cubicInOut).duration(500).attr("r", 0).remove(); // squares

          var recSquares;

          if (data.shape && data.shape === 'square') {
            recSquares = data.records;
          } else {
            recSquares = data.records.filter(function (d) {
              return d.shape && d.shape === 'square';
            });
          }

          var squares = svg.selectAll('.dotSquare').data(recSquares, function (d) {
            return d.gr;
          });
          squares.enter().append("rect").classed('dotSquare', true).attr("x", function (d) {
            return transform$1(getCentroid(d.gr, 'gb').centroid)[0];
          }).attr("y", function (d) {
            return transform$1(getCentroid(d.gr, 'gb').centroid)[1];
          }).attr("width", 0).attr("height", 0).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour ? d.colour : data.colour;
          }).merge(squares).transition().ease(cubicInOut).duration(500).attr("width", function (d) {
            return d.size ? 2 * radiusPixels * d.size : 2 * radiusPixels * data.size;
          }).attr("height", function (d) {
            return d.size ? 2 * radiusPixels * d.size : 2 * radiusPixels * data.size;
          }).attr("transform", function (d) {
            if (checkGr(d.gr).projection === 'ir') {
              var x = transform$1(getCentroid(d.gr, 'gb').centroid)[0];
              var y = transform$1(getCentroid(d.gr, 'gb').centroid)[1];
              return "translate(".concat(-radiusPixels, ",").concat(-radiusPixels, ") rotate(5 ").concat(x, " ").concat(y, ")");
            } else {
              return "translate(".concat(-radiusPixels, ",").concat(-radiusPixels, ")");
            }
          }).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour ? d.colour : data.colour;
          });
          squares.exit().transition().ease(cubicInOut).duration(500).attr("width", 0).attr("height", 0).attr("transform", "translate(0,0)").remove(); // up triangles

          var recTriangles;

          if (data.shape && data.shape.startsWith('triangle')) {
            recTriangles = data.records;
          } else {
            recTriangles = data.records.filter(function (d) {
              return d.shape && d.shape.startsWith('triangle');
            });
          }

          var triangle$1 = svg.selectAll('.dotTriangle').data(recTriangles, function (d) {
            return d.gr;
          });
          triangle$1.enter().append("path").classed('dotTriangle', true).attr("d", symbol().type(triangle).size(0)).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour ? d.colour : data.colour;
          }).attr("transform", function (d) {
            var x = transform$1(getCentroid(d.gr, 'gb').centroid)[0];
            var y = transform$1(getCentroid(d.gr, 'gb').centroid)[1];
            var extraRotate, yOffset;

            if (d.shape === 'triangle-up') {
              extraRotate = 0;
              yOffset = radiusPixels / 3;
            } else {
              extraRotate = 180;
              yOffset = -radiusPixels / 3;
            }

            if (checkGr(d.gr).projection === 'ir') {
              return "translate(".concat(x, ",").concat(y + yOffset, ") rotate(").concat(5 + extraRotate, ")");
            } else {
              return "translate(".concat(x, ",").concat(y + yOffset, ") rotate(").concat(extraRotate, ")");
            }
          }).merge(triangle$1).transition().ease(cubicInOut).duration(500).attr("d", symbol().type(triangle).size(radiusPixels * radiusPixels * 1.7)).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour ? d.colour : data.colour;
          });
          triangle$1.exit().transition().ease(cubicInOut).duration(500).attr("d", symbol().type(triangle).size(0)).remove(); // Legend

          if (legend) {
            svgLegend(data);
          }
        })["catch"](function () {
          console.log("Failed to read data", taxonIdentifier);
        });
      }
    }

    function svgLegend(data) {
      svg.select('#legend').remove();
      if (!data.legend) return;
      var radiusPixels = getRadiusPixels(data.precision) * 2;
      var lineHeight = 20;
      var gLegend = svg.append('g').attr('id', 'legend');
      gLegend.append('text').attr('x', 0).attr('y', lineHeight).attr('font-weight', 'bold').text(data.legend.title);
      data.legend.lines.forEach(function (l, i) {
        var shape = l.shape ? l.shape : data.shape;
        var size = l.size ? l.size : data.size;
        var opacity = l.opacity ? l.opacity : data.opacity;
        var colour = l.colour ? l.colour : data.colour;
        var colour2 = l.colour2 ? l.colour2 : data.colour2;
        var dot;

        if (shape === 'circle') {
          dot = gLegend.append('circle').attr("r", radiusPixels * size).attr("cx", radiusPixels * 1).attr("cy", lineHeight * (i + 2.5) - radiusPixels);
        } else if (shape === 'bullseye') {
          dot = gLegend.append('circle').attr("r", radiusPixels * size).attr("cx", radiusPixels * 1).attr("cy", lineHeight * (i + 2.5) - radiusPixels);
          gLegend.append('circle').attr("r", radiusPixels * size * 0.5).attr("cx", radiusPixels * 1).attr("cy", lineHeight * (i + 2.5) - radiusPixels).style('fill', colour2).style('opacity', opacity);
        } else if (shape === 'square') {
          dot = gLegend.append('rect').attr("width", radiusPixels * 2).attr("height", radiusPixels * 2).attr("x", 0).attr("y", lineHeight * (i + 2.5) - 2 * radiusPixels);
        } else if (shape === 'triangle-up') {
          dot = gLegend.append('path').attr("d", symbol().type(triangle).size(radiusPixels * radiusPixels * 1.7)).attr("transform", "translate(".concat(radiusPixels * 1, ",").concat(lineHeight * (i + 2.5) - radiusPixels, ")"));
        } else if (shape === 'triangle-down') {
          dot = gLegend.append('path').attr("d", symbol().type(triangle).size(radiusPixels * radiusPixels * 1.7)).attr("transform", "translate(".concat(radiusPixels * 1, ",").concat(lineHeight * (i + 2.5) - radiusPixels, ") rotate(180)"));
        }

        dot.style('fill', colour).style('opacity', opacity);
      });
      data.legend.lines.forEach(function (l, i) {
        gLegend.append('text').attr('x', radiusPixels * 4).attr('y', lineHeight * (i + 2.5)).text(l.text);
      });
      gLegend.attr("transform", "translate(".concat(legendX, ",").concat(legendY, ") scale(").concat(legendScale, ", ").concat(legendScale, ")"));
    } // TODO. Needs enlarging and documenting. 
    // Define the api that will be exposed.


    var api = {
      setBoundaryColour: function setBoundaryColour(c) {
        boundary.style("stroke", c);
      },
      setTransform: function setTransform(newTransOptsKey) {
        transOptsKey = newTransOptsKey;
        transformSet();
        drawBoundaryAndGrid();
        setSvgSize();
        drawInsetBoxes();
        refreshDots();
      },
      setIdentfier: function setIdentfier(identifier) {
        taxonIdentifier = identifier;
        drawDots();
      },
      setMapType: function setMapType(newMapTypesKey) {
        mapTypesKey = newMapTypesKey;
        drawDots();
      }
    }; // Initialise the display

    transformSet();
    setSvgSize();
    drawInsetBoxes();
    var pBoundary, pGrid;

    if (boundaryGjson) {
      pBoundary = json(boundaryGjson).then(function (data) {
        dataBoundary = data;
      });
    } else {
      pBoundary = Promise.resolve();
    }

    if (gridGjson) {
      pGrid = json(gridGjson).then(function (data) {
        dataGrid = data;
      });
    } else {
      pGrid = Promise.resolve();
    }

    Promise.all([pBoundary, pGrid]).then(function () {
      drawBoundaryAndGrid();
    }); // Return the publicly accessible API

    return api;
  }

  exports.getInsetDims = getInsetDims;
  exports.getTweenTransOpts = getTweenTransOpts;
  exports.namedTransOpts = namedTransOpts;
  exports.svgMap = svgMap;
  exports.transformFunction = transformFunction;
  exports.widthFromHeight = widthFromHeight;

  Object.defineProperty(exports, '__esModule', { value: true });

})));