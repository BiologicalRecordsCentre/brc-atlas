(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3'), require('leaflet')) :
  typeof define === 'function' && define.amd ? define(['exports', 'd3', 'leaflet'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.brcatlas = {}, global.d3, global.L));
}(this, (function (exports, d3, L) { 'use strict';

  /** @module svgCoords */
  /**
   * @typedef {Object} transOptsSel
   * @property {string} key - there must be at least one, but potentially more, properties
   * on this object, each describing a map 'transformation'.
   */

  /**
   * @typedef {Object} transOpts - A 'transformation' options object simply defines the extents of the
   * map, potentially with insets too.
   * @property {string} id - this must match the key by which the object is accessed through
   * the parent object.
   * @property {string} caption - a human readable name for this transformation options object.
   * @property {module:svgCoords~transOptsBounds} bounds - an object defining the extents of the map.
   * @property {Array.<module:svgCoords~transOptsInset>} insets - an array of objects defining the inset portions of the map. 
   */

  /**
   * @typedef {Object} transOptsInset - an object defining an inset for a map, i.e. part of a map
   * which will be displayed in a different location to that in which it is actually found 
   * @property {module:svgCoords~transOptsBounds} bounds - an object defining the extents of the inset.
   * @property {number} imageX - a value defining where the inset will be displayed
   * (displaced) on the SVG. If the number is positive it represents the number of 
   * pixels the left boundary of the inset will be positioned from the left margin of
   * the SVG. If it is negative, it represents the number of pixels the right boundary
   * of the inset will be positioned from the right boundary of the SVG.
   * @property {number} imageY - a value defining where the inset will be displayed
   * (displaced) on the SVG. If the number is positive it represents the number of 
   * pixels the botton boundary of the inset will be positioned from the bottom margin of
   * the SVG. If it is negative, it represents the number of pixels the top boundary
   * of the inset will be positioned from the top boundary of the SVG.
   */

  /**
  * @typedef {Object} transOptsBounds - an object defining the extents of the map, 
  * or portion of a mpa, in the projection system
  * you want to use (either British Nation Gid, Irish National Grid or UTM 30 N for Channel Islands).
  * properties on this element are xmin, ymin, xmax and ymax.
  * @property {number} xmin - the x value for the lower left corner.
  * @property {number} ymin - the y value for the lower left corner.
  * @property {number} xmax - the x value for the top right corner.
  * @property {number} ymax - the y value for the top right corner.
  */

  /**
   * Given a transform options object, describing a bounding rectangle in world coordinates,
   * and a height dimension, this function returns an array of objects - one
   * for each inset described in the transform object - that describe a set of
   * rectangles corresponding to each of the insets. Each object has an origin
   * corresponding to the top-left of the rectangle, a width and a height dimension.
   * The dimensions and coordiates are relative to the height argument. A typical
   * use of these metrics would be to draw an SVG rectagle around an inset.
   * @param {module:svgCoords~transOpts} transOpts - The transformation options object.
   * @param {number} outputHeight - The height, e.g. height in pixels, of an SVG element.
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
   * Given a transform options object, describing a bounding rectangle in world coordinates,
   * and a height dimension, this function returns a width dimension
   * that respects the aspect ratio described by the bounding rectangle.
   * @param {module:svgCoords~transOpts} transOpts - The transformation options object.
   * @param {number} outputHeight - The height, e.g. height in pixels, of an SVG element.
   * @returns {number}
   */


  function widthFromHeight(transOpts, outputHeight) {
    var realWidth = transOpts.bounds.xmax - transOpts.bounds.xmin;
    var realHeight = transOpts.bounds.ymax - transOpts.bounds.ymin;
    return outputHeight * realWidth / realHeight;
  }
  /**
   * Given a transform options object, describing a bounding rectangle in world coordinates,
   * and a height dimension, this function returns a new function that will accept a
   * point argument - normally describing real world coordinates - and returns a 
   * point that is transformed to be within the range 0 - outputHeight (for y)
   * and 0 - outputWidth (for x). This function can be used as input to a d3.geoTransform
   * to provide a transformation to d3.geoPath to draw an SVG path from a geojson file.
   * The transOpts argument is an object which can also describe areas which should
   * displaced in the output. This can be used for displaying islands in an
   * inset, e.g. the Channel Islands.
   * @param {module:svgCoords~transOpts} transOpts - The transformation options object.
   * @param {number} outputHeight - The height, e.g. height in pixels, of an SVG element.
   * @returns {function}
   */


  function transformFunction(transOpts, outputHeight) {
    var realWidth = transOpts.bounds.xmax - transOpts.bounds.xmin;
    var realHeight = transOpts.bounds.ymax - transOpts.bounds.ymin;
    var outputWidth = widthFromHeight(transOpts, outputHeight);
    return function (p, ignoreInset) {
      var x = p[0];
      var y = p[1];
      var tX, tY;
      tX = outputWidth * (x - transOpts.bounds.xmin) / realWidth;
      tY = outputHeight - outputHeight * (y - transOpts.bounds.ymin) / realHeight;

      if (!ignoreInset && transOpts.insets && transOpts.insets.length > 0) {
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
  }
  /**
   * Given a transform options object, describing a bounding rectangle in world coordinates,
   * and a height dimension, this function returns an object that encapsulates the transformation
   * options and provides additional transformation functionality and other information.
   * @param {module:svgCoords~transOpts} transOpts - The transformation options object.
   * @param {number} outputHeight - The height, e.g. height in pixels, of an SVG element.
   * @returns {Object} transopts - The transformation object.
   * @returns {Object} transopts.params - The transformation options object.
   * @returns {Array<Object>} transopts.insetDims - An array of objects defining the position and size of insets.
   * @returns {number} transopts.height - The height, e.g. height in pixels, of the SVG element.
   * @returns {number} transopts.width - The width, e.g. width in pixels, of the SVG element.
   * @returns {function} transopts.point - A function that will take a point object describing real world coordinates and return the SVG coordinates.
   * @returns {function} transopts.d3Path - A function that will take a geoJson path in real world coordinates and return the SVG path.
   */


  function createTrans(transOpts, outputHeight) {
    var transform = transformFunction(transOpts, outputHeight);
    return {
      params: transOpts,
      insetDims: getInsetDims(transOpts, outputHeight),
      height: outputHeight,
      width: widthFromHeight(transOpts, outputHeight),
      point: transform,
      d3Path: d3.geoPath().projection(d3.geoTransform({
        point: function point(x, y) {
          var tP = transform([x, y]);
          var tX = tP[0];
          var tY = tP[1];
          this.stream.point(tX, tY);
        }
      }))
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
    * inset objects indicate the extent that is to be offset within the map image.
    * The imageX and imageY values of an inset object indicates the position of the offset
    * portion within the map in pixels. Positve x and y values offset the inset from the
    * left and bottom of the image respecitvely. Negative x and y values offset the inset
    * from the right and top of the image respectively.
    * Each transOpts object also has a property called 'id' which must be set to the
    * value used as a key to the object in the parent object. Each also has a
    * property called 'caption' which has a name which can be displayed if offering
    * users a choice between transformation objects.
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
      id: 'BI1',
      caption: 'No insets',
      bounds: {
        xmin: -213389,
        ymin: -113239,
        xmax: 702813,
        ymax: 1237242
      }
    },
    BI2: {
      id: 'BI2',
      caption: 'Inset Channel Islands (CI)',
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
      id: 'BI3',
      caption: 'Inset Northern Isles',
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
      id: 'BI4',
      caption: 'Inset CI & Northern Isles',
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
   * Given both 'from' and 'to' transform options objects, an output height and a
   * 'tween' value between 0 and 1, this function returns a transform option object
   * for which the map bounds, the inset bounds and the inset image position
   * are all interpolated between the 'from' and 'to' objects at a position
   * depending on the value of the tween value. Typically this would then be used
   * to help generate a path transformation to use with D3 to animate transitions
   * between different map transformations. Note that this only works with
   * named transformation objects defined in this library.
   * @param {module:svgCoords~transOpts} from - The 'from' transformation options object.
   * @param {module:svgCoords~transOpts} to - The 'to' transformation options object.
   * @param {number} outputHeight - The height, e.g. height in pixels, of an SVG element.
   * @param {number} tween - Between 0 and 1 indicating the interpolation position.
   * @returns {module:svgCoords~transOpts} - Intermediate transformation options object.
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

  function getRadiusPixels(transform, precision) {
    return Math.abs(transform([300000, 300000])[0] - transform([300000 + precision / 2, 300000])[0]);
  }

  /** @module dataAccess */

  function csvMonad(file) {
    return csvGr(file, 1000);
  }

  function csvTetrad(file) {
    return csvGr(file, 2000);
  }

  function csvQuadrant(file) {
    return csvGr(file, 5000);
  }

  function csvHectad(file) {
    return csvGr(file, 10000);
  }

  function csvGr(file, precision) {
    return new Promise(function (resolve, reject) {
      d3.csv(file, function (r) {
        if (r.gr) {
          return {
            gr: r.gr,
            caption: "<strong>Grid ref: </strong>".concat(r.gr),
            colour: r.colour,
            shape: r.shape,
            opacity: r.opacity,
            size: r.size
          };
        }
      }).then(function (data) {
        resolve({
          records: data,
          precision: precision
        });
      })["catch"](function (e) {
        reject(e);
      });
    });
  }
  /** @constant
  * @description This object has properties corresponding to a number of data access
  * functions that can be used to load data provided in standard formats. There are
  * four functions accessed through the keys listed below.
  * <ul>
  * <li> <b>Standard monad</b> expects the grid references to be monads (1 km resolution).
  * <li> <b>Standard tetrad</b> expects the grid references to be tetrads (2 km resolution).
  * <li> <b>Standard quadrant</b> expects the grid references to be quadrants (5 km resolution).
  * <li> <b>Standard hectad</b> expects the grid references to be hectads (10 km resolution).
  * </ul>
  * Each of the
  * data accessor functions referenced by these keys takes a single argument which is the path (or URL) of
  * a CSV that contains data in a standard format. The columns which must be present in the 
  * CSV are described below (the order is not important).
  * <ul>
  * <li> <b>gr</b> - the grid referece which must be of the correct precision for the function.
  * <li> <b>shape</b> - describes the shape that will be displayed at that location,
  * valid values are: circle, square, diamond, triangle-up, triangle-down.
  * <li> <b>size</b> - a number between 0 and 1 which will be used as a factor to resize the
  * dot symbol displayed on the map.
  * <li> <b>colour</b> - a colour for the symbol which can be hex format, e.g. #FFA500, 
  * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
  * <li> <b>opacity</b> - a number between 0 and 1 used to set the opacity of the symbol
  * (0 is fully transparent and 1 fully opaque).
  * <li> <b>caption</b> - an html string that will be used to update an element identified
  * by the <i>captionId</i> option of an svg or leaflet map when the mouse cursor moves over the
  * element representing this gr on the map.
  * </ul>
  *  @type {object}
  */


  var dataAccessors = {
    'Standard monad': csvMonad,
    'Standard tetrad': csvTetrad,
    'Standard quadrant': csvQuadrant,
    'Standard hectad': csvHectad
  };

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

  function optsDialog(mapid, transOptsSel, transOptsKey, transOptsControl, mapTypesSel, mapTypesKey, mapTypesControl, applyFunction) {
    var div1 = d3.select("body").append("div").classed("modal micromodal-slide brc-atlas-map-opts", true).attr("id", "mapOptsModal-".concat(mapid)).attr("aria-hidden", "true");
    var div2 = div1.append("div").classed("modal__overlay", true).attr("tabindex", "-1").attr("data-micromodal-close", "");
    var div3 = div2.append("div").classed("modal__container", true).attr("role", "dialog").attr("aria-modal", "true").attr("aria-labelledby", "mapOptsModal-".concat(mapid, "-title"));
    var header = div3.append("header").classed("modal__header", true);
    header.append("h2").classed("modal__title", true).attr("id", "mapOptsModal-".concat(mapid, "-title")).text("Map options");
    header.append("button").classed("modal__close", true).attr("aria-label", "Close modal").attr("data-micromodal-close", "");
    var main = div3.append("main").classed("modal__content", true).attr("id", "mapOptsModal-".concat(mapid, "-content"));
    transOptsSelection(mapid, main, transOptsSel, transOptsKey, transOptsControl);
    mapTypeSelection(mapid, main, mapTypesSel, mapTypesKey, mapTypesControl);
    var footer = div3.append("main").classed("modal__footer", true);
    var apply = footer.append("button").classed("modal__btn modal__btn-primary", true).attr("data-micromodal-close", "").text("Okay");
    footer.append("button").classed("modal__btn", true).attr("data-micromodal-close", "").attr("aria-label", "Close this dialog window").text("Cancel");
    MicroModal.init();
    apply.on("click", function () {
      var ret = {};

      if (transOptsControl && Object.keys(transOptsSel).length > 1) {
        ret.transOptsKey = div1.select("input[name=\"trans-opts-radio-".concat(mapid, "\"]:checked")).node().value;
      }

      if (mapTypesControl && Object.keys(mapTypesSel).length > 1) {
        ret.mapTypesKey = div1.select("input[name=\"map-type-radio-".concat(mapid, "\"]:checked")).node().value;
      }

      applyFunction(ret);
    });
  }
  function showOptsDialog(mapid, mapTypesKey, transOptsSel, transOptsKey) {
    if (document.getElementById("trans-opts-radio-".concat(mapid, "-").concat(transOptsKey))) {
      document.getElementById("trans-opts-radio-".concat(mapid, "-").concat(transOptsKey)).checked = true;
    }

    var id = mapTypesKey.replace(/ /g, '');

    if (document.getElementById("map-type-radio-".concat(mapid, "-").concat(id))) {
      document.getElementById("map-type-radio-".concat(mapid, "-").concat(id)).checked = true;
    }

    MicroModal.show("mapOptsModal-".concat(mapid));
  }

  function transOptsSelection(mapid, el, transOptsSel, transOptsKey, transOptsControl) {
    if (transOptsControl && Object.keys(transOptsSel).length > 1) {
      el.append("h3").text("Extent & view");
      Object.keys(transOptsSel).forEach(function (k) {
        var radio = el.append("input").attr("type", "radio").attr("id", "trans-opts-radio-".concat(mapid, "-").concat(k)).attr("name", "trans-opts-radio-".concat(mapid)).attr("value", k);
        el.append("label").attr("for", "trans-opts-radio-".concat(mapid, "-").concat(k)).text(transOptsSel[k].caption);

        if (k === transOptsKey) {
          radio.attr("checked", "checked");
        }

        if (k !== Object.keys(transOptsSel)[Object.keys(transOptsSel).length - 1]) {
          el.append("br");
        }
      });
    }
  }

  function mapTypeSelection(mapid, el, mapTypesSel, mapTypesKey, mapTypesControl) {
    if (mapTypesControl && Object.keys(mapTypesSel).length > 1) {
      el.append("h3").text("Map information type");
      Object.keys(mapTypesSel).forEach(function (k) {
        var id = k.replace(/ /g, '');
        var radio = el.append("input").attr("type", "radio").attr("id", "map-type-radio-".concat(mapid, "-").concat(id)).attr("name", "map-type-radio-".concat(mapid)).attr("value", k);
        el.append("label").attr("for", "map-type-radio-".concat(mapid, "-").concat(id)).text(k);

        if (k === mapTypesKey) {
          radio.attr("checked", "checked");
        }

        if (k !== Object.keys(mapTypesSel)[Object.keys(mapTypesSel).length - 1]) {
          el.append("br");
        }
      });
    }
  }

  var basemaps = {};
  function showImage(mapId, show, gBasemaps, imageFile, worldFile, trans) {
    // Save the map source details for use with transformImages
    if (!basemaps[mapId] && show) {
      basemaps[mapId] = {
        mapId: mapId,
        imageFile: imageFile,
        worldFile: worldFile
      };
    }

    var transId = trans.params.id; // Ensure g element exists for this mapId.

    if (gBasemaps.select("#basemap-".concat(mapId)).size() === 0) {
      gBasemaps.append('g').attr('id', "basemap-".concat(mapId));
    } // Hide/show main g element for mapId appropriately


    if (show) {
      gBasemaps.select("#basemap-".concat(mapId)).classed('hidden', false);
    } else {
      gBasemaps.select("#basemap-".concat(mapId)).classed('hidden', true);
      return;
    } // Ensure g element exists for this mapId & transId


    if (gBasemaps.select("#basemap-".concat(mapId, "-").concat(transId)).size() === 0) {
      gBasemaps.select("#basemap-".concat(mapId)).append('g').attr('id', "basemap-".concat(mapId, "-").concat(transId));
    } // Hide all g elements corresponding to different transitions within main mapId g elment
    // except that corresponding to this transID


    gBasemaps.select("#basemap-".concat(mapId)).selectAll('g').classed('hidden', true);
    gBasemaps.select("#basemap-".concat(mapId, "-").concat(transId)).classed('hidden', false); // Add the images to the map/trans g element if none there already

    if (gBasemaps.select("#basemap-".concat(mapId, "-").concat(transId, " Image")).size() === 0) {
      var img = new Image();

      img.onerror = function (e) {
        console.log(imageFile, 'could not be opened.', e);
      };

      img.onload = function () {
        var _this = this;

        var imageWidth = this.width;
        var imageHeight = this.height;
        fetch(worldFile).then(function (response) {
          response.text().then(function (text) {
            var aWrld = text.split('\n');
            var xResolution = Number(aWrld[0]);
            var yResolution = Number(aWrld[3]); //negative value

            var minEasting = Number(aWrld[4]);
            var maxNorthing = Number(aWrld[5]);
            var maxEasting = minEasting + imageWidth * xResolution;
            var minNorthing = maxNorthing + imageHeight * yResolution;
            var topLeft = trans.point([minEasting, maxNorthing]);
            var topRight = trans.point([maxEasting, maxNorthing]);
            var bottomLeft = trans.point([minEasting, minNorthing]);
            var iInsets = trans.params.insets ? trans.params.insets.length : 0;

            for (var i = 0; i <= iInsets; i++) {
              var xShift = 0,
                  yShift = 0;

              if (i > 0) {
                // Inset
                var bounds = trans.params.insets[i - 1].bounds;
                var dims = trans.insetDims[i - 1];
                var xmid = bounds.xmin + (bounds.xmax - bounds.xmin) / 2;
                var ymid = bounds.ymin + (bounds.ymax - bounds.ymin) / 2;
                var xyWithInset = trans.point([xmid, ymid]);
                var xyWithNoInset = trans.point([xmid, ymid], true);
                xShift = xyWithInset[0] - xyWithNoInset[0];
                yShift = xyWithInset[1] - xyWithNoInset[1];
                console.log(dims);
                var clippath = d3.select('svg defs').append('clipPath').attr('id', "clippath-".concat(mapId, "-").concat(transId, "-").concat(i));
                clippath.append('rect').attr('x', dims.x).attr('y', dims.y).attr('width', dims.width).attr('height', dims.height);
              } // Changed to use dataURL rather than file path URL so that image can be 
              // serialised when using the saveMap method.


              var _img = gBasemaps.select("#basemap-".concat(mapId, "-").concat(transId)).append('image') //.attr('xmlns:xlink', "http://www.w3.org/1999/xlink")
              //.attr('xlink:href', imageFile)
              .attr('href', getDataUrl(_this)).attr('x', topLeft[0] + xShift).attr('y', topLeft[1] + yShift).attr('width', topRight[0] - topLeft[0]).attr('height', bottomLeft[1] - topLeft[1]);

              if (i > 0) {
                _img.attr('clip-path', "url(#clippath-".concat(mapId, "-").concat(transId, "-").concat(i, ")"));
              }
            }
          });
        })["catch"](function (e) {
          console.log(worldFile, 'could not be opened.', e);
        });
      }; // Load the image into image object so that we can get
      // its dimensions.


      img.src = imageFile;
    }
  }

  function getDataUrl(img) {
    // Create canvas
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d'); // Set width and height

    canvas.width = img.width;
    canvas.height = img.height; // Draw the image - use png format to support background transparency

    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  }

  function transformImages(gBasemaps, trans) {
    Object.keys(basemaps).forEach(function (k) {
      var b = basemaps[k];

      if (b.imageFile) {
        var hidden = gBasemaps.select("#basemap-".concat(b.mapId)).classed('hidden');
        console.log(b.mapId, !hidden);
        showImage(b.mapId, !hidden, gBasemaps, b.imageFile, b.worldFile, trans);
      }
    });
  }
  function setImagePriorities(gBasemaps, mapIds) {
    mapIds.reverse().forEach(function (mapId) {
      gBasemaps.append('g').attr('id', "basemap-".concat(mapId)).classed('baseMapHidden', true);
    });
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

  function _unsupportedIterableToArray$1(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray$1(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$1(o, minLen);
  }

  function _arrayLikeToArray$1(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

    return arr2;
  }

  function _createForOfIteratorHelper(o, allowArrayLike) {
    var it;

    if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) {
      if (Array.isArray(o) || (it = _unsupportedIterableToArray$1(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it) o = it;
        var i = 0;

        var F = function () {};

        return {
          s: F,
          n: function () {
            if (i >= o.length) return {
              done: true
            };
            return {
              done: false,
              value: o[i++]
            };
          },
          e: function (e) {
            throw e;
          },
          f: F
        };
      }

      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }

    var normalCompletion = true,
        didErr = false,
        err;
    return {
      s: function () {
        it = o[Symbol.iterator]();
      },
      n: function () {
        var step = it.next();
        normalCompletion = step.done;
        return step;
      },
      e: function (e) {
        didErr = true;
        err = e;
      },
      f: function () {
        try {
          if (!normalCompletion && it.return != null) it.return();
        } finally {
          if (didErr) throw err;
        }
      }
    };
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
  var PJD_GRIDSHIFT = 3;
  var PJD_WGS84 = 4; // WGS84 or equivalent

  var PJD_NODATUM = 5; // WGS84 or equivalent

  var SRS_WGS84_SEMIMAJOR = 6378137.0; // only used in grid shift transforms

  var SRS_WGS84_SEMIMINOR = 6356752.314; // only used in grid shift transforms

  var SRS_WGS84_ESQUARED = 0.0066943799901413165; // only used in grid shift transforms

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
      },
      approx: function approx() {
        self.approx = true;
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
  var ENDED = -1;
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

      case ENDED:
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
        this.state = ENDED;
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

    if (this.state === ENDED) {
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

  function extend (destination, source) {
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

  function init() {
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
    init: init,
    forward: forward,
    inverse: inverse,
    names: names
  };

  function init$1() {//no-op for longlat
  }

  function identity(pt) {
    return pt;
  }
  var names$1 = ["longlat", "identity"];
  var longlat = {
    init: init$1,
    forward: identity,
    inverse: identity,
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
  function get(name) {
    if (!name) {
      return false;
    }

    var n = name.toLowerCase();

    if (typeof names$2[n] !== 'undefined' && projStore[names$2[n]]) {
      return projStore[names$2[n]];
    }
  }
  function start() {
    projs.forEach(add);
  }
  var projections = {
    start: start,
    add: add,
    get: get
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

  function datum(datumCode, datum_params, a, b, es, ep2, nadgrids) {
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

    if (nadgrids) {
      out.datum_type = PJD_GRIDSHIFT;
      out.grids = nadgrids;
    }

    out.a = a; //datum object also uses these values

    out.b = b;
    out.es = es;
    out.ep2 = ep2;
    return out;
  }

  /**
   * Resources for details of NTv2 file formats:
   * - https://web.archive.org/web/20140127204822if_/http://www.mgs.gov.on.ca:80/stdprodconsume/groups/content/@mgs/@iandit/documents/resourcelist/stel02_047447.pdf
   * - http://mimaka.com/help/gs/html/004_NTV2%20Data%20Format.htm
   */
  var loadedNadgrids = {};
  /**
   * Load a binary NTv2 file (.gsb) to a key that can be used in a proj string like +nadgrids=<key>. Pass the NTv2 file
   * as an ArrayBuffer.
   */

  function nadgrid(key, data) {
    var view = new DataView(data);
    var isLittleEndian = detectLittleEndian(view);
    var header = readHeader(view, isLittleEndian);

    if (header.nSubgrids > 1) {
      console.log('Only single NTv2 subgrids are currently supported, subsequent sub grids are ignored');
    }

    var subgrids = readSubgrids(view, header, isLittleEndian);
    var nadgrid = {
      header: header,
      subgrids: subgrids
    };
    loadedNadgrids[key] = nadgrid;
    return nadgrid;
  }
  /**
   * Given a proj4 value for nadgrids, return an array of loaded grids
   */

  function getNadgrids(nadgrids) {
    // Format details: http://proj.maptools.org/gen_parms.html
    if (nadgrids === undefined) {
      return null;
    }

    var grids = nadgrids.split(',');
    return grids.map(parseNadgridString);
  }

  function parseNadgridString(value) {
    if (value.length === 0) {
      return null;
    }

    var optional = value[0] === '@';

    if (optional) {
      value = value.slice(1);
    }

    if (value === 'null') {
      return {
        name: 'null',
        mandatory: !optional,
        grid: null,
        isNull: true
      };
    }

    return {
      name: value,
      mandatory: !optional,
      grid: loadedNadgrids[value] || null,
      isNull: false
    };
  }

  function secondsToRadians(seconds) {
    return seconds / 3600 * Math.PI / 180;
  }

  function detectLittleEndian(view) {
    var nFields = view.getInt32(8, false);

    if (nFields === 11) {
      return false;
    }

    nFields = view.getInt32(8, true);

    if (nFields !== 11) {
      console.warn('Failed to detect nadgrid endian-ness, defaulting to little-endian');
    }

    return true;
  }

  function readHeader(view, isLittleEndian) {
    return {
      nFields: view.getInt32(8, isLittleEndian),
      nSubgridFields: view.getInt32(24, isLittleEndian),
      nSubgrids: view.getInt32(40, isLittleEndian),
      shiftType: decodeString(view, 56, 56 + 8).trim(),
      fromSemiMajorAxis: view.getFloat64(120, isLittleEndian),
      fromSemiMinorAxis: view.getFloat64(136, isLittleEndian),
      toSemiMajorAxis: view.getFloat64(152, isLittleEndian),
      toSemiMinorAxis: view.getFloat64(168, isLittleEndian)
    };
  }

  function decodeString(view, start, end) {
    return String.fromCharCode.apply(null, new Uint8Array(view.buffer.slice(start, end)));
  }

  function readSubgrids(view, header, isLittleEndian) {
    var gridOffset = 176;
    var grids = [];

    for (var i = 0; i < header.nSubgrids; i++) {
      var subHeader = readGridHeader(view, gridOffset, isLittleEndian);
      var nodes = readGridNodes(view, gridOffset, subHeader, isLittleEndian);
      var lngColumnCount = Math.round(1 + (subHeader.upperLongitude - subHeader.lowerLongitude) / subHeader.longitudeInterval);
      var latColumnCount = Math.round(1 + (subHeader.upperLatitude - subHeader.lowerLatitude) / subHeader.latitudeInterval); // Proj4 operates on radians whereas the coordinates are in seconds in the grid

      grids.push({
        ll: [secondsToRadians(subHeader.lowerLongitude), secondsToRadians(subHeader.lowerLatitude)],
        del: [secondsToRadians(subHeader.longitudeInterval), secondsToRadians(subHeader.latitudeInterval)],
        lim: [lngColumnCount, latColumnCount],
        count: subHeader.gridNodeCount,
        cvs: mapNodes(nodes)
      });
    }

    return grids;
  }

  function mapNodes(nodes) {
    return nodes.map(function (r) {
      return [secondsToRadians(r.longitudeShift), secondsToRadians(r.latitudeShift)];
    });
  }

  function readGridHeader(view, offset, isLittleEndian) {
    return {
      name: decodeString(view, offset + 8, offset + 16).trim(),
      parent: decodeString(view, offset + 24, offset + 24 + 8).trim(),
      lowerLatitude: view.getFloat64(offset + 72, isLittleEndian),
      upperLatitude: view.getFloat64(offset + 88, isLittleEndian),
      lowerLongitude: view.getFloat64(offset + 104, isLittleEndian),
      upperLongitude: view.getFloat64(offset + 120, isLittleEndian),
      latitudeInterval: view.getFloat64(offset + 136, isLittleEndian),
      longitudeInterval: view.getFloat64(offset + 152, isLittleEndian),
      gridNodeCount: view.getInt32(offset + 168, isLittleEndian)
    };
  }

  function readGridNodes(view, offset, gridHeader, isLittleEndian) {
    var nodesOffset = offset + 176;
    var gridRecordLength = 16;
    var gridShiftRecords = [];

    for (var i = 0; i < gridHeader.gridNodeCount; i++) {
      var record = {
        latitudeShift: view.getFloat32(nodesOffset + i * gridRecordLength, isLittleEndian),
        longitudeShift: view.getFloat32(nodesOffset + i * gridRecordLength + 4, isLittleEndian),
        latitudeAccuracy: view.getFloat32(nodesOffset + i * gridRecordLength + 8, isLittleEndian),
        longitudeAccuracy: view.getFloat32(nodesOffset + i * gridRecordLength + 12, isLittleEndian)
      };
      gridShiftRecords.push(record);
    }

    return gridShiftRecords;
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
    var nadgrids = getNadgrids(json.nadgrids);
    var datumObj = json.datum || datum(json.datumCode, json.datum_params, sphere_.a, sphere_.b, ecc.es, ecc.ep2, nadgrids);
    extend(this, json); // transfer everything over from the projection because we don't know what we'll need

    extend(this, ourProj); // transfer all the methods from the projection
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


    var source_a = source.a;
    var source_es = source.es;

    if (source.datum_type === PJD_GRIDSHIFT) {
      var gridShiftCode = applyGridShift(source, false, point);

      if (gridShiftCode !== 0) {
        return undefined;
      }

      source_a = SRS_WGS84_SEMIMAJOR;
      source_es = SRS_WGS84_ESQUARED;
    }

    var dest_a = dest.a;
    var dest_b = dest.b;
    var dest_es = dest.es;

    if (dest.datum_type === PJD_GRIDSHIFT) {
      dest_a = SRS_WGS84_SEMIMAJOR;
      dest_b = SRS_WGS84_SEMIMINOR;
      dest_es = SRS_WGS84_ESQUARED;
    } // Do we need to go through geocentric coordinates?


    if (source_es === dest_es && source_a === dest_a && !checkParams(source.datum_type) && !checkParams(dest.datum_type)) {
      return point;
    } // Convert to geocentric coordinates.


    point = geodeticToGeocentric(point, source_es, source_a); // Convert between datums

    if (checkParams(source.datum_type)) {
      point = geocentricToWgs84(point, source.datum_type, source.datum_params);
    }

    if (checkParams(dest.datum_type)) {
      point = geocentricFromWgs84(point, dest.datum_type, dest.datum_params);
    }

    point = geocentricToGeodetic(point, dest_es, dest_a, dest_b);

    if (dest.datum_type === PJD_GRIDSHIFT) {
      var destGridShiftResult = applyGridShift(dest, true, point);

      if (destGridShiftResult !== 0) {
        return undefined;
      }
    }

    return point;
  }
  function applyGridShift(source, inverse, point) {
    if (source.grids === null || source.grids.length === 0) {
      console.log('Grid shift grids not found');
      return -1;
    }

    var input = {
      x: -point.x,
      y: point.y
    };
    var output = {
      x: Number.NaN,
      y: Number.NaN
    };
    var onlyMandatoryGrids = false;
    var attemptedGrids = [];

    for (var i = 0; i < source.grids.length; i++) {
      var grid = source.grids[i];
      attemptedGrids.push(grid.name);

      if (grid.isNull) {
        output = input;
        break;
      }

      onlyMandatoryGrids = grid.mandatory;

      if (grid.grid === null) {
        if (grid.mandatory) {
          console.log("Unable to find mandatory grid '" + grid.name + "'");
          return -1;
        }

        continue;
      }

      var subgrid = grid.grid.subgrids[0]; // skip tables that don't match our point at all

      var epsilon = (Math.abs(subgrid.del[1]) + Math.abs(subgrid.del[0])) / 10000.0;
      var minX = subgrid.ll[0] - epsilon;
      var minY = subgrid.ll[1] - epsilon;
      var maxX = subgrid.ll[0] + (subgrid.lim[0] - 1) * subgrid.del[0] + epsilon;
      var maxY = subgrid.ll[1] + (subgrid.lim[1] - 1) * subgrid.del[1] + epsilon;

      if (minY > input.y || minX > input.x || maxY < input.y || maxX < input.x) {
        continue;
      }

      output = applySubgridShift(input, inverse, subgrid);

      if (!isNaN(output.x)) {
        break;
      }
    }

    if (isNaN(output.x)) {
      console.log("Failed to find a grid shift table for location '" + -input.x * R2D + " " + input.y * R2D + " tried: '" + attemptedGrids + "'");
      return -1;
    }

    point.x = -output.x;
    point.y = output.y;
    return 0;
  }

  function applySubgridShift(pin, inverse, ct) {
    var val = {
      x: Number.NaN,
      y: Number.NaN
    };

    if (isNaN(pin.x)) {
      return val;
    }

    var tb = {
      x: pin.x,
      y: pin.y
    };
    tb.x -= ct.ll[0];
    tb.y -= ct.ll[1];
    tb.x = adjust_lon(tb.x - Math.PI) + Math.PI;
    var t = nadInterpolate(tb, ct);

    if (inverse) {
      if (isNaN(t.x)) {
        return val;
      }

      t.x = tb.x - t.x;
      t.y = tb.y - t.y;
      var i = 9,
          tol = 1e-12;
      var dif, del;

      do {
        del = nadInterpolate(t, ct);

        if (isNaN(del.x)) {
          console.log("Inverse grid shift iteration failed, presumably at grid edge.  Using first approximation.");
          break;
        }

        dif = {
          x: tb.x - (del.x + t.x),
          y: tb.y - (del.y + t.y)
        };
        t.x += dif.x;
        t.y += dif.y;
      } while (i-- && Math.abs(dif.x) > tol && Math.abs(dif.y) > tol);

      if (i < 0) {
        console.log("Inverse grid shift iterator failed to converge.");
        return val;
      }

      val.x = adjust_lon(t.x + ct.ll[0]);
      val.y = t.y + ct.ll[1];
    } else {
      if (!isNaN(t.x)) {
        val.x = pin.x + t.x;
        val.y = pin.y + t.y;
      }
    }

    return val;
  }

  function nadInterpolate(pin, ct) {
    var t = {
      x: pin.x / ct.del[0],
      y: pin.y / ct.del[1]
    };
    var indx = {
      x: Math.floor(t.x),
      y: Math.floor(t.y)
    };
    var frct = {
      x: t.x - 1.0 * indx.x,
      y: t.y - 1.0 * indx.y
    };
    var val = {
      x: Number.NaN,
      y: Number.NaN
    };
    var inx;

    if (indx.x < 0 || indx.x >= ct.lim[0]) {
      return val;
    }

    if (indx.y < 0 || indx.y >= ct.lim[1]) {
      return val;
    }

    inx = indx.y * ct.lim[0] + indx.x;
    var f00 = {
      x: ct.cvs[inx][0],
      y: ct.cvs[inx][1]
    };
    inx++;
    var f10 = {
      x: ct.cvs[inx][0],
      y: ct.cvs[inx][1]
    };
    inx += ct.lim[0];
    var f11 = {
      x: ct.cvs[inx][0],
      y: ct.cvs[inx][1]
    };
    inx--;
    var f01 = {
      x: ct.cvs[inx][0],
      y: ct.cvs[inx][1]
    };
    var m11 = frct.x * frct.y,
        m10 = frct.x * (1.0 - frct.y),
        m00 = (1.0 - frct.x) * (1.0 - frct.y),
        m01 = (1.0 - frct.x) * frct.y;
    val.x = m00 * f00.x + m10 * f10.x + m01 * f01.x + m11 * f11.x;
    val.y = m00 * f00.y + m10 * f10.y + m01 * f01.y + m11 * f11.y;
    return val;
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
          out[t] = v;
          break;

        case 'w':
          out[t] = -v;
          break;

        case 'n':
          out[t] = v;
          break;

        case 's':
          out[t] = -v;
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

  function transform(source, dest, point) {
    var wgs84;

    if (Array.isArray(point)) {
      point = common(point);
    }

    checkSanity(point); // Workaround for datum shifts towgs84, if either source or destination projection is not wgs84

    if (source.datum && dest.datum && checkNotWGS(source, dest)) {
      wgs84 = new Projection('WGS84');
      point = transform(source, wgs84, point);
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


    point = datum_transform(source.datum, dest.datum, point);

    if (!point) {
      return;
    } // Adjust for the prime meridian if necessary


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

  function transformer(from, to, coords) {
    var transformedArray, out, keys;

    if (Array.isArray(coords)) {
      transformedArray = transform(from, to, coords) || {
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
      out = transform(from, to, coords);
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
      return transformer(fromProj, toProj, coord);
    } else {
      obj = {
        forward: function forward(coords) {
          return transformer(fromProj, toProj, coords);
        },
        inverse: function inverse(coords) {
          return transformer(toProj, fromProj, coords);
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
  function init$2() {
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
  var names$3 = ["Fast_Transverse_Mercator", "Fast Transverse Mercator"];
  var tmerc = {
    init: init$2,
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
  function init$3() {
    if (!this.approx && (isNaN(this.es) || this.es <= 0)) {
      throw new Error('Incorrect elliptical usage. Try using the +approx option in the proj string, or PROJECTION["Fast_Transverse_Mercator"] in the WKT.');
    }

    if (this.approx) {
      // When '+approx' is set, use tmerc instead
      tmerc.init.apply(this);
      this.forward = tmerc.forward;
      this.inverse = tmerc.inverse;
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
  var names$4 = ["Extended_Transverse_Mercator", "Extended Transverse Mercator", "etmerc", "Transverse_Mercator", "Transverse Mercator", "tmerc"];
  var etmerc = {
    init: init$3,
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
  function init$4() {
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
    init: init$4,
    names: names$5,
    dependsOn: dependsOn
  };

  function srat (esinp, exp) {
    return Math.pow((1 - esinp) / (1 + esinp), exp);
  }

  var MAX_ITER$1 = 20;
  function init$5() {
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
    init: init$5,
    forward: forward$4,
    inverse: inverse$4,
    names: names$6
  };

  function init$6() {
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
    init: init$6,
    forward: forward$5,
    inverse: inverse$5,
    names: names$7
  };

  function ssfn_(phit, sinphi, eccen) {
    sinphi *= eccen;
    return Math.tan(0.5 * (HALF_PI + phit)) * Math.pow((1 - sinphi) / (1 + sinphi), 0.5 * eccen);
  }
  function init$7() {
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
    init: init$7,
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
  function init$8() {
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
    init: init$8,
    forward: forward$7,
    inverse: inverse$7,
    names: names$9
  };

  /* Initialize the Oblique Mercator  projection
      ------------------------------------------*/

  function init$9() {
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
    init: init$9,
    forward: forward$8,
    inverse: inverse$8,
    names: names$a
  };

  function init$a() {
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
    init: init$a,
    forward: forward$9,
    inverse: inverse$9,
    names: names$b
  };

  function init$b() {
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
    init: init$b,
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

  function init$c() {
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
    init: init$c,
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

  function init$d() {
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
    init: init$d,
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

  function init$e() {
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
    init: init$e,
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

  function init$f() {
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
    init: init$f,
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

  function init$g() {
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
    init: init$g,
    forward: forward$f,
    inverse: inverse$f,
    names: names$h
  };

  function init$h() {
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
    init: init$h,
    forward: forward$g,
    inverse: inverse$g,
    names: names$i
  };

  var MAX_ITER$2 = 20;
  function init$i() {
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
    init: init$i,
    forward: forward$h,
    inverse: inverse$h,
    names: names$j
  };

  function init$j() {
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
    init: init$j,
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

  function init$k() {//no-op
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
    init: init$k,
    forward: forward$j,
    inverse: inverse$j,
    names: names$l
  };

  var MAX_ITER$3 = 20;
  function init$l() {
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
    init: init$l,
    forward: forward$k,
    inverse: inverse$k,
    names: names$m
  };

  function init$m() {}
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
    init: init$m,
    forward: forward$l,
    inverse: inverse$l,
    names: names$n
  };

  function init$n() {
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
    init: init$n,
    forward: forward$m,
    inverse: inverse$m,
    names: names$o
  };

  /* Initialize the Van Der Grinten projection
    ----------------------------------------*/

  function init$o() {
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
    init: init$o,
    forward: forward$n,
    inverse: inverse$n,
    names: names$p
  };

  function init$p() {
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
    init: init$p,
    forward: forward$o,
    inverse: inverse$o,
    names: names$q
  };

  function init$q() {
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
    init: init$q,
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
  function init$r() {
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
    init: init$r,
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

  function init$s() {
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
    init: init$s,
    forward: forward$r,
    inverse: inverse$r,
    names: names$t
  };

  function init$t() {
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
    init: init$t,
    forward: forward$s,
    inverse: inverse$s,
    names: names$u
  };

  var mode = {
    N_POLE: 0,
    S_POLE: 1,
    EQUIT: 2,
    OBLIQ: 3
  };
  var params = {
    h: {
      def: 100000,
      num: true
    },
    // default is Karman line, no default in PROJ.7
    azi: {
      def: 0,
      num: true,
      degrees: true
    },
    // default is North
    tilt: {
      def: 0,
      num: true,
      degrees: true
    },
    // default is Nadir
    long0: {
      def: 0,
      num: true
    },
    // default is Greenwich, conversion to rad is automatic
    lat0: {
      def: 0,
      num: true
    } // default is Equator, conversion to rad is automatic

  };
  function init$u() {
    Object.keys(params).forEach(function (p) {
      if (typeof this[p] === "undefined") {
        this[p] = params[p].def;
      } else if (params[p].num && isNaN(this[p])) {
        throw new Error("Invalid parameter value, must be numeric " + p + " = " + this[p]);
      } else if (params[p].num) {
        this[p] = parseFloat(this[p]);
      }

      if (params[p].degrees) {
        this[p] = this[p] * D2R;
      }
    }.bind(this));

    if (Math.abs(Math.abs(this.lat0) - HALF_PI) < EPSLN) {
      this.mode = this.lat0 < 0 ? mode.S_POLE : mode.N_POLE;
    } else if (Math.abs(this.lat0) < EPSLN) {
      this.mode = mode.EQUIT;
    } else {
      this.mode = mode.OBLIQ;
      this.sinph0 = Math.sin(this.lat0);
      this.cosph0 = Math.cos(this.lat0);
    }

    this.pn1 = this.h / this.a; // Normalize relative to the Earth's radius

    if (this.pn1 <= 0 || this.pn1 > 1e10) {
      throw new Error("Invalid height");
    }

    this.p = 1 + this.pn1;
    this.rp = 1 / this.p;
    this.h1 = 1 / this.pn1;
    this.pfact = (this.p + 1) * this.h1;
    this.es = 0;
    var omega = this.tilt;
    var gamma = this.azi;
    this.cg = Math.cos(gamma);
    this.sg = Math.sin(gamma);
    this.cw = Math.cos(omega);
    this.sw = Math.sin(omega);
  }
  function forward$t(p) {
    p.x -= this.long0;
    var sinphi = Math.sin(p.y);
    var cosphi = Math.cos(p.y);
    var coslam = Math.cos(p.x);
    var x, y;

    switch (this.mode) {
      case mode.OBLIQ:
        y = this.sinph0 * sinphi + this.cosph0 * cosphi * coslam;
        break;

      case mode.EQUIT:
        y = cosphi * coslam;
        break;

      case mode.S_POLE:
        y = -sinphi;
        break;

      case mode.N_POLE:
        y = sinphi;
        break;
    }

    y = this.pn1 / (this.p - y);
    x = y * cosphi * Math.sin(p.x);

    switch (this.mode) {
      case mode.OBLIQ:
        y *= this.cosph0 * sinphi - this.sinph0 * cosphi * coslam;
        break;

      case mode.EQUIT:
        y *= sinphi;
        break;

      case mode.N_POLE:
        y *= -(cosphi * coslam);
        break;

      case mode.S_POLE:
        y *= cosphi * coslam;
        break;
    } // Tilt 


    var yt, ba;
    yt = y * this.cg + x * this.sg;
    ba = 1 / (yt * this.sw * this.h1 + this.cw);
    x = (x * this.cg - y * this.sg) * this.cw * ba;
    y = yt * ba;
    p.x = x * this.a;
    p.y = y * this.a;
    return p;
  }
  function inverse$t(p) {
    p.x /= this.a;
    p.y /= this.a;
    var r = {
      x: p.x,
      y: p.y
    }; // Un-Tilt

    var bm, bq, yt;
    yt = 1 / (this.pn1 - p.y * this.sw);
    bm = this.pn1 * p.x * yt;
    bq = this.pn1 * p.y * this.cw * yt;
    p.x = bm * this.cg + bq * this.sg;
    p.y = bq * this.cg - bm * this.sg;
    var rh = hypot(p.x, p.y);

    if (Math.abs(rh) < EPSLN) {
      r.x = 0;
      r.y = p.y;
    } else {
      var cosz, sinz;
      sinz = 1 - rh * rh * this.pfact;
      sinz = (this.p - Math.sqrt(sinz)) / (this.pn1 / rh + rh / this.pn1);
      cosz = Math.sqrt(1 - sinz * sinz);

      switch (this.mode) {
        case mode.OBLIQ:
          r.y = Math.asin(cosz * this.sinph0 + p.y * sinz * this.cosph0 / rh);
          p.y = (cosz - this.sinph0 * Math.sin(r.y)) * rh;
          p.x *= sinz * this.cosph0;
          break;

        case mode.EQUIT:
          r.y = Math.asin(p.y * sinz / rh);
          p.y = cosz * rh;
          p.x *= sinz;
          break;

        case mode.N_POLE:
          r.y = Math.asin(cosz);
          p.y = -p.y;
          break;

        case mode.S_POLE:
          r.y = -Math.asin(cosz);
          break;
      }

      r.x = Math.atan2(p.x, p.y);
    }

    p.x = r.x + this.long0;
    p.y = r.y;
    return p;
  }
  var names$v = ["Tilted_Perspective", "tpers"];
  var tpers = {
    init: init$u,
    forward: forward$t,
    inverse: inverse$t,
    names: names$v
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
    proj4.Proj.projections.add(tpers);
  }

  proj4.defaultDatum = 'WGS84'; //default datum

  proj4.Proj = Projection;
  proj4.WGS84 = new proj4.Proj('WGS84');
  proj4.Point = Point;
  proj4.toPoint = common;
  proj4.defs = defs;
  proj4.nadgrid = nadgrid;
  proj4.transform = transform;
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
  /** @module src/getGjson */


  function convertCoords(fromProjection, toProjection, x, y) {
    var outCoords; // If the required output projection does not match the projection of the input GR
    // then use proj4 to reproject

    if (toProjection !== fromProjection) {
      outCoords = proj4(projections$1[fromProjection].proj4, projections$1[toProjection].proj4, [x, y]);
    } else {
      outCoords = [x, y];
    }

    return outCoords;
  }
  /**
   * Given a grid reference (British National Grid, Irish Grid or UTM zone 30N shorthand),
   * a two-letter code defining the requested output projection, and a string indicating
   * the shape of the required 'symbol', this function returns a GeoJson pth geometry object.
   * @param {string} gr - the grid reference.
   * @param {string} toProjection - two letter code specifying the required output CRS.
   * @param {string} shape - string specifying the requested output shape type.
   * @param {number} scale - number between 0 and 1 to scale the output object.
   * @returns {object} - a GeoJson path geometry object.
   * @todo Extend to return all symbol types
   */


  function getGjson(gr, toProjection, shape, scale) {
    var size = scale ? scale : 1;
    var grType = checkGr(gr);
    var km100 = km100s[grType.prefix];
    var centroid = getCentroid(gr, km100.proj).centroid;
    var xmin = centroid[0] - grType.precision / 2 * size;
    var xmax = centroid[0] + grType.precision / 2 * size;
    var ymin = centroid[1] - grType.precision / 2 * size;
    var ymax = centroid[1] + grType.precision / 2 * size;
    var xmid = xmin + (xmax - xmin) / 2;
    var ymid = ymin + (ymax - ymin) / 2;
    var coords;
    var type = "Polygon";

    if (shape === "square") {
      coords = [[convertCoords(km100.proj, toProjection, xmin, ymin), convertCoords(km100.proj, toProjection, xmax, ymin), convertCoords(km100.proj, toProjection, xmax, ymax), convertCoords(km100.proj, toProjection, xmin, ymax), convertCoords(km100.proj, toProjection, xmin, ymin)]];
    } else if (shape === "triangle-up") {
      coords = [[convertCoords(km100.proj, toProjection, xmin, ymin), convertCoords(km100.proj, toProjection, xmax, ymin), convertCoords(km100.proj, toProjection, xmid, ymax), convertCoords(km100.proj, toProjection, xmin, ymin)]];
    } else if (shape === "triangle-down") {
      coords = [[convertCoords(km100.proj, toProjection, xmid, ymin), convertCoords(km100.proj, toProjection, xmax, ymax), convertCoords(km100.proj, toProjection, xmin, ymax), convertCoords(km100.proj, toProjection, xmid, ymin)]];
    } else if (shape === "diamond") {
      coords = [[convertCoords(km100.proj, toProjection, xmid, ymin), convertCoords(km100.proj, toProjection, xmax, ymid), convertCoords(km100.proj, toProjection, xmid, ymax), convertCoords(km100.proj, toProjection, xmin, ymid), convertCoords(km100.proj, toProjection, xmid, ymin)]];
    } else if (shape === "circle") {
      var rad = grType.precision / 2 * size;
      coords = [[]];

      for (var deg = 0; deg <= 360; deg += 15) {
        var angle = deg * Math.PI / 180;
        var x = rad * Math.cos(angle) + centroid[0];
        var y = rad * Math.sin(angle) + centroid[1];
        coords[0].push(convertCoords(km100.proj, toProjection, x, y));
      }
    } else if (shape === "cross") {
      type = "MultiLineString";
      coords = [[convertCoords(km100.proj, toProjection, xmin, ymin), convertCoords(km100.proj, toProjection, xmax, ymin), convertCoords(km100.proj, toProjection, xmax, ymax), convertCoords(km100.proj, toProjection, xmin, ymax), convertCoords(km100.proj, toProjection, xmin, ymin)], [convertCoords(km100.proj, toProjection, xmin, ymin), convertCoords(km100.proj, toProjection, xmax, ymax)], [convertCoords(km100.proj, toProjection, xmin, ymax), convertCoords(km100.proj, toProjection, xmax, ymin)]];
    }

    return {
      "type": type,
      "coordinates": coords
    };
  }

  function removeDots(svg) {
    svg.selectAll('.dotCircle').remove();
    svg.selectAll('.dotSquare').remove();
    svg.selectAll('.dotTriangle').remove();
    svg.selectAll('.dotDiamond').remove();
  }
  function drawDots(svg, captionId, onclick, transform, accessFunction, taxonIdentifier, proj) {
    function getCaption(d) {
      if (d.caption) {
        return d.caption;
      } else {
        return '';
      }
    }

    return new Promise(function (resolve, reject) {
      if (typeof accessFunction === 'function') {
        accessFunction(taxonIdentifier).then(function (data) {
          var radiusPixels = getRadiusPixels(transform, data.precision); // circles

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
          circles.enter().append("circle").classed('dotCircle dot', true).attr("cx", function (d) {
            return transform(getCentroid(d.gr, proj).centroid)[0];
          }).attr("cy", function (d) {
            return transform(getCentroid(d.gr, proj).centroid)[1];
          }).attr("r", 0).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour ? d.colour : data.colour;
          }).merge(circles).transition().ease(d3.easeCubic).duration(500).attr("r", function (d) {
            return d.size ? radiusPixels * d.size : radiusPixels;
          }).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour ? d.colour : data.colour;
          }).attr("data-caption", function (d) {
            return getCaption(d);
          });
          circles.exit().transition().ease(d3.easeCubic).duration(500).attr("r", 0).remove(); // bullseye

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
          bullseyes.enter().append("circle").classed('dotBullseye dot', true).attr("cx", function (d) {
            return transform(getCentroid(d.gr, proj).centroid)[0];
          }).attr("cy", function (d) {
            return transform(getCentroid(d.gr, proj).centroid)[1];
          }).attr("r", 0).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour2 ? d.colour2 : data.colour2;
          }).merge(bullseyes).transition().ease(d3.easeCubic).duration(500).attr("r", function (d) {
            return d.size ? radiusPixels * d.size * 0.5 : radiusPixels * data.size * 0.5;
          }).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour2 ? d.colour2 : data.colour2;
          }).attr("data-caption", function (d) {
            return getCaption(d);
          });
          bullseyes.exit().transition().ease(d3.easeCubic).duration(500).attr("r", 0).remove(); // squares

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
          squares.enter().append("rect").classed('dotSquare dot', true).attr("x", function (d) {
            return transform(getCentroid(d.gr, proj).centroid)[0];
          }).attr("y", function (d) {
            return transform(getCentroid(d.gr, proj).centroid)[1];
          }).attr("width", 0).attr("height", 0).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour ? d.colour : data.colour;
          }).merge(squares).transition().ease(d3.easeCubic).duration(500).attr("width", function (d) {
            return d.size ? 2 * radiusPixels * d.size : 2 * radiusPixels * data.size;
          }).attr("height", function (d) {
            return d.size ? 2 * radiusPixels * d.size : 2 * radiusPixels * data.size;
          }).attr("transform", function (d) {
            if (checkGr(d.gr).projection === 'ir') {
              var x = transform(getCentroid(d.gr, proj).centroid)[0];
              var y = transform(getCentroid(d.gr, proj).centroid)[1];
              return "translate(".concat(-radiusPixels, ",").concat(-radiusPixels, ") rotate(5 ").concat(x, " ").concat(y, ")");
            } else {
              return "translate(".concat(-radiusPixels, ",").concat(-radiusPixels, ")");
            }
          }).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour ? d.colour : data.colour;
          }).attr("data-caption", function (d) {
            return getCaption(d);
          });
          squares.exit().transition().ease(d3.easeCubic).duration(500).attr("width", 0).attr("height", 0).attr("transform", "translate(0,0)").remove(); // diamonds

          var recDiamonds;

          if (data.shape && data.shape === 'diamond') {
            recDiamonds = data.records;
          } else {
            recDiamonds = data.records.filter(function (d) {
              return d.shape && d.shape === 'diamond';
            });
          }

          var diamonds = svg.selectAll('.dotDiamond').data(recDiamonds, function (d) {
            return d.gr;
          });
          diamonds.enter().append("path").classed('dotDiamond dot', true).attr("d", d3.symbol().type(d3.symbolSquare).size(0)).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour ? d.colour : data.colour;
          }).attr("transform", function (d) {
            var x = transform(getCentroid(d.gr, proj).centroid)[0];
            var y = transform(getCentroid(d.gr, proj).centroid)[1]; // TODO - only do this rotation for output projection gb

            if (checkGr(d.gr).projection === 'ir') {
              return "translate(".concat(x, ",").concat(y, ") rotate(50)");
            } else {
              return "translate(".concat(x, ",").concat(y, ") rotate(45)");
            }
          }).merge(diamonds).transition().ease(d3.easeCubic).duration(500).attr("d", d3.symbol().type(d3.symbolSquare).size(radiusPixels * radiusPixels * 2)).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour ? d.colour : data.colour;
          }).attr("data-caption", function (d) {
            return getCaption(d);
          });
          diamonds.exit().transition().ease(d3.easeCubic).duration(500).attr("d", d3.symbol().type(d3.symbolSquare).size(0)).remove(); // triangles

          var recTriangles;

          if (data.shape && data.shape.startsWith('triangle')) {
            recTriangles = data.records;
          } else {
            recTriangles = data.records.filter(function (d) {
              return d.shape && d.shape.startsWith('triangle');
            });
          }

          var triangle = svg.selectAll('.dotTriangle').data(recTriangles, function (d) {
            return d.gr;
          });
          triangle.enter().append("path").classed('dotTriangle dot', true).attr("d", d3.symbol().type(d3.symbolTriangle).size(0)).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour ? d.colour : data.colour;
          }).attr("transform", function (d) {
            var x = transform(getCentroid(d.gr, proj).centroid)[0];
            var y = transform(getCentroid(d.gr, proj).centroid)[1];
            var extraRotate, yOffset;

            if (d.shape === 'triangle-up') {
              extraRotate = 0;
              yOffset = radiusPixels / 3;
            } else {
              extraRotate = 180;
              yOffset = -radiusPixels / 3;
            } // TODO - only do this rotation for output projection gb


            if (checkGr(d.gr).projection === 'ir') {
              return "translate(".concat(x, ",").concat(y + yOffset, ") rotate(").concat(5 + extraRotate, ")");
            } else {
              return "translate(".concat(x, ",").concat(y + yOffset, ") rotate(").concat(extraRotate, ")");
            }
          }).merge(triangle).transition().ease(d3.easeCubic).duration(500).attr("d", d3.symbol().type(d3.symbolTriangle).size(radiusPixels * radiusPixels * 1.7)).attr("opacity", function (d) {
            return d.opacity ? d.opacity : data.opacity;
          }).style("fill", function (d) {
            return d.colour ? d.colour : data.colour;
          }).attr("data-caption", function (d) {
            return getCaption(d);
          });
          triangle.exit().transition().ease(d3.easeCubic).duration(500).attr("d", d3.symbol().type(d3.symbolTriangle).size(0)).remove(); // Dot caption display

          svg.selectAll('.dot').on('mouseover', function (d) {
            if (captionId) {
              if (d.caption) {
                d3.select("#".concat(captionId)).html(d.caption);
              } else {
                d3.select("#".concat(captionId)).html('');
              }
            }
          }).on('click', function (d) {
            console.log('blah blah blah blah');

            if (onclick) {
              onclick(d.gr, d.id ? d.id : null, d.caption ? d.caption : null);
            }
          });
          return data;
        }).then(function (data) {
          resolve(data);
        })["catch"](function () {
          reject("Failed to read data", taxonIdentifier);
        });
      } else {
        reject("Data accessor not a function");
      }
    });
  }

  /** @module svgLegend */
  /**
   * @typedef module:svgLegend.legendOpts
   * @type {Object}
   * @property {boolean} display - indicates whether or not a legend is to be drawn.
   * @property {number} scale - a number between 0 and 1 which scales the size of the legend.
   * @property {number} x - an offset of the top-left corner of the legend from the left margin of the SVG.
   * @property {number} y - an offset of the top-left corner of the legend from the top margin of the SVG.
   * @property {number} width - can be used to specify a width (for leaflet legend).
   * @property {number} height - can be used to specify a height (for leaflet legend).
   * @property {legendDefintion} data - a legend defition.
   */

  /**
   * @typedef {Object} legendDefintion
   * @property {string} title - a title caption for the legend.
   * @property {string} color - a colour for the legend symbols which can be hex format, e.g. #FFA500, 
   * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red. (Can be overriden by individual legend lines.)
   * @property {string} shape - describes symbol shapes for the legend.
   * Valid values are: circle, square, diamond, triangle-up, triangle-down. (Can be overriden by individual legend lines.)
   * @property {number} size - a number between 0 and 1.
   * This can be used to scale the size of the legend dots. (Can be overriden by individual legend lines.)
   * @property {number} opacity - a number between 0 and 1 indicating the opacity of the legend symbols for the whole legend. 0 is completely
   * transparent and 1 is completely opaque. (Can be overriden by individual legend lines.)
   * @property {number} padding - a number that indicates the padding, in pixels, that should be used between the elements
   * of a legend line (e.g. the symbol and the text).
   * @property {boolean[]} raligned - an array of boolean values to indicate whether text elements in a tabulated legend
   * lines should be right-aligned.
   * @property {legendLine[]} lines - an arry of objects representing lines in a legend.
   */

  /**
   * @typedef {Object} legendLine
   * @property {string} color - a colour for the legend symbol which can be hex format, e.g. #FFA500, 
   * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red. Overrides any value set for the whole legend.
   * @property {string} shape - describes symbol shape for the legend line.
   * Valid values are: circle, square, diamond, triangle-up, triangle-down. Overrides any value set for the whole legend.
   * @property {number} size - a number between 0 and 1.
   * This can be used to scale the size of the legend dots. Overrides any value set for the whole legend.
   * @property {number} opacity - a number between 0 and 1 indicating the opacity of the legend symbol. 0 is completely
   * transparent and 1 is completely opaque. Overrides any value set for the whole legend.
   * @property {boolean} underline - If set to true, indicates that the legend line is to be underlined.
   * @property {string|string[]} text - Specifies the text for the legend line either as a single text string or an
   * array of strings for a tabulated legend layout. For tabulated legend layout, one of the strings can be set
   * to the special value of 'symbol' to indicate the position where the legend symbol should be generated in the
   * tabualted layout. In a tabulated legend layout, the various array elements in each line are aligned with those
   * in the other lines to form columns.
   */

  function svgLegend(svg, legendOpts) {
    var legendData = legendOpts.data ? legendOpts.data : legendOpts.accessorData;
    var legendX = legendOpts.x ? legendOpts.x : 0;
    var legendY = legendOpts.y ? legendOpts.x : 0;
    var legendScale = legendOpts.scale ? legendOpts.scale : 1;
    var lineHeight = 20;
    var swatchPixels = lineHeight / 3;
    legendData.padding = legendData.padding ? legendData.padding : lineHeight / 3;
    legendData.raligned = legendData.raligned ? legendData.raligned : [];
    legendData.size = legendData.size ? legendData.size : 1;
    legendData.opacity = legendData.opacity ? legendData.opacity : 1;
    legendData.shape = legendData.shape ? legendData.shape : 'circle';
    var gLegend = svg.append('g').attr('id', 'legend');
    var iUnderlinePad = 0;
    var iOffset;

    if (legendData.title) {
      gLegend.append('text').attr('x', 0).attr('y', lineHeight).attr('font-weight', 'bold').text(legendData.title);
      iOffset = 0;
    } else {
      iOffset = 1;
    } // If legend line text is not an array, turn into one
    // Also add textWidths array


    legendData.lines.forEach(function (l) {
      if (!Array.isArray(l.text)) {
        l.text = ['symbol', String(l.text)];
      } else {
        // Coerce all text elements to strings
        l.text = l.text.map(function (t) {
          return String(t);
        });
      }

      l.textWidth = [];
    }); // Set nCells to the max number of elements in line text arrays

    var nCells = legendData.lines.reduce(function (a, l) {
      return l.text.length > a ? l.text.length : a;
    }, 0);
    var maxWidths = Array(nCells).fill(0); // Calculate the max width of each legend table column.
    // Also add the calculated width of each text item to the legend line
    // array for use in right justifying if required.

    var _loop = function _loop(i) {
      legendData.lines.forEach(function (l) {
        if (l.text[i]) {
          var iLength;

          if (l.text[i] === 'symbol') {
            iLength = swatchPixels * 2;
          } else {
            // Generate a temporary SVG text object in order to get width
            var t = gLegend.append('text').text(l.text[i]);
            iLength = t.node().getBBox().width;
            t.remove();
            l.textWidth[i] = iLength;
          }

          maxWidths[i] = maxWidths[i] > iLength ? maxWidths[i] : iLength;
        }
      });
    };

    for (var i = 0; i < nCells; i++) {
      _loop(i);
    } // Set offsets


    var offsets = Array(nCells);

    for (var _i = 0; _i < offsets.length; _i++) {
      offsets[_i] = 0;

      for (var j = 1; j <= _i; j++) {
        offsets[_i] = offsets[_i] + maxWidths[j - 1] + legendData.padding;
      }
    } //console.log('max text lengths', maxWidths)
    //console.log('offsets', offsets)


    legendData.lines.forEach(function (l, iLine) {
      var y = iLine - iOffset;
      var shape = l.shape ? l.shape : legendData.shape;
      var size = l.size ? l.size : legendData.size;
      var opacity = l.opacity ? l.opacity : legendData.opacity;
      var colour = l.colour ? l.colour : legendData.colour;
      var colour2 = l.colour2 ? l.colour2 : legendData.colour2;
      var dot;

      for (var _i2 = 0; _i2 < nCells; _i2++) {
        if (l.text[_i2]) {
          if (l.text[_i2] === 'symbol') {
            if (shape === 'circle') {
              dot = gLegend.append('circle').attr("r", swatchPixels * size) //.attr("cx", swatchPixels * 1)
              .attr("cx", offsets[_i2] + swatchPixels).attr("cy", lineHeight * (y + 2.5) - swatchPixels + iUnderlinePad);
            } else if (shape === 'bullseye') {
              dot = gLegend.append('circle').attr("r", swatchPixels * size) //.attr("cx", swatchPixels * 1)
              .attr("cx", offsets[_i2] + swatchPixels).attr("cy", lineHeight * (y + 2.5) - swatchPixels + iUnderlinePad);
              gLegend.append('circle').attr("r", swatchPixels * size * 0.5) //.attr("cx", swatchPixels * 1)
              .attr("cx", offsets[_i2] + swatchPixels).attr("cy", lineHeight * (y + 2.5) - swatchPixels + iUnderlinePad).style('fill', colour2).style('opacity', opacity);
            } else if (shape === 'square') {
              dot = gLegend.append('rect').attr("width", swatchPixels * 2 * size).attr("height", swatchPixels * 2 * size) //.attr("x", swatchPixels * (1 - size))
              .attr("x", offsets[_i2] + swatchPixels * (1 - size)).attr("y", lineHeight * (y + 2.5) - 2 * swatchPixels + swatchPixels * (1 - size) + iUnderlinePad);
            } else if (shape === 'diamond') {
              dot = gLegend.append('path').attr("d", d3.symbol().type(d3.symbolSquare).size(swatchPixels * swatchPixels * 2 * size)) //.attr("transform", `translate(${swatchPixels * 1},${lineHeight * (y + 2.5) - swatchPixels}) rotate(45)`)
              .attr("transform", "translate(".concat(offsets[_i2] + swatchPixels, ",").concat(lineHeight * (y + 2.5) - swatchPixels, ") rotate(45)"));
            } else if (shape === 'triangle-up') {
              dot = gLegend.append('path').attr("d", d3.symbol().type(d3.symbolTriangle).size(swatchPixels * swatchPixels * 1.7 * size)) //.attr("transform", `translate(${swatchPixels * 1},${lineHeight * (y + 2.5) - swatchPixels})`)
              .attr("transform", "translate(".concat(offsets[_i2] + swatchPixels, ",").concat(lineHeight * (y + 2.5) - swatchPixels, ")"));
            } else if (shape === 'triangle-down') {
              dot = gLegend.append('path').attr("d", d3.symbol().type(d3.symbolTriangle).size(swatchPixels * swatchPixels * 1.7 * size)) //.attr("transform", `translate(${swatchPixels * 1},${lineHeight * (y + 2.5) - swatchPixels}) rotate(180)`)
              .attr("transform", "translate(".concat(offsets[_i2] + swatchPixels, ",").concat(lineHeight * (y + 2.5) - swatchPixels, ") rotate(180)"));
            }

            dot.style('fill', colour).style('opacity', opacity);
          } else {
            //const y = iLine - iOffset
            var alignOffset = legendData.raligned[_i2] ? maxWidths[_i2] - l.textWidth[_i2] : 0;
            gLegend.append('text') //.attr('x', swatchPixels * 2.7)
            .attr('x', offsets[_i2] + alignOffset).attr('y', lineHeight * (y + 2.5) - lineHeight / 20 + iUnderlinePad).text(l.text[_i2]);
          }
        }
      }

      if (l.underline) {
        iUnderlinePad = iUnderlinePad + 3;
        gLegend.append('rect').attr("x", 0).attr("y", lineHeight * (y + 2.5) + iUnderlinePad).attr("width", offsets[nCells - 1] + maxWidths[nCells - 1]).attr("height", 1).attr("style", "fill:black");
      }
    });
    gLegend.attr("transform", "translate(".concat(legendX, ",").concat(legendY, ") scale(").concat(legendScale, ", ").concat(legendScale, ")"));
  }

  function serialize(svg) {
    var xmlns = "http://www.w3.org/2000/xmlns/";
    var xlinkns = "http://www.w3.org/1999/xlink";
    var svgns = "http://www.w3.org/2000/svg";
    svg = svg.cloneNode(true); // Delete all hidden items (backrop images) from clone

    var d3Clone = d3.select(svg);
    d3Clone.selectAll('.hidden').remove(); // I don't think this next loop is important in our situation

    var fragment = window.location.href + "#";
    var walker = document.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT);

    while (walker.nextNode()) {
      var _iterator = _createForOfIteratorHelper(walker.currentNode.attributes),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var attr = _step.value;

          if (attr.value.includes(fragment)) {
            attr.value = attr.value.replace(fragment, "#");
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }

    svg.setAttributeNS(xmlns, "xmlns", svgns);
    svg.setAttributeNS(xmlns, "xmlns:xlink", xlinkns);
    var serializer = new window.XMLSerializer();
    var string = serializer.serializeToString(svg);
    return new Blob([string], {
      type: "image/svg+xml"
    });
  }

  function rasterize(d3Svg) {
    var resolve, reject;
    var svg = d3Svg.node();
    var promise = new Promise(function (y, n) {
      return resolve = y, reject = n;
    });
    var image = new Image();
    image.onerror = reject;

    image.onload = function () {
      var rect = svg.getBoundingClientRect(); // Create a canvas element

      var canvas = document.createElement('canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;
      var context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, rect.width, rect.height);
      context.canvas.toBlob(resolve);
    };

    image.src = URL.createObjectURL(serialize(svg)); //const data = new XMLSerializer().serializeToString(svg)
    //image.src = "data:image/svg+xml; charset=utf8, " + encodeURIComponent(data)

    return promise;
  }

  /** @module svgMap */
  /** 
   * @param {Object} opts - Initialisation options.
   * @param {string} opts.selector - The CSS selector of the element which will be the parent of the SVG.
   * @param {string} opts.mapid - The id for the static map to be created.
   * @param {string} opts.proj - The projection of the map, should be 'gb', 'ir' or 'ci'. It should 
   * reflect the projection of boundary and grid data displayed on the map. It is used to generate the 'dots'
   * in the correct location.
   * @param {string} opts.captionId - The id of a DOM element into which feature-specific HTML will be displayed
   * as the mouse moves over a dot on the map. The HTML markup must be stored in an attribute called 'caption'
   * in the input data.
  * @param {function} opts.onclick - A function that will be called if user clicks on a map
   * element. The function will be passed these attributes, in this order, if they exist on the
   * element: gr, id, caption. (Default - null.)
   * @param {number} opts.height - The desired height of the SVG.
   * @param {boolean} opts.expand - Indicates whether or not the map will expand to fill parent element.
   * @param {legendOpts} opts.legendOpts - Sets options for a map legend.
   * @param {module:svgCoords~transOptsSel} opts.transOptsSel - Sets a collection of map transformation options.
   * @param {string} opts.transOptsKey - Sets the key of the selected map transformation options. Must be
   * present in as a key in the opts.transOptsSel object.
   * @param {boolean} opts.transOptsControl - Indicates whether or not a control should be shown in the
   * bottom-right of the map that can be used display a dialog to change the transformation options.
   * @param {Object} opts.mapTypesSel - Sets an object whose properties are data access functions. The property
   * names are the 'keys' which should be human readable descriptiosn of the map types.
   * @param {string} opts.mapTypesKey - Sets the key of the selected data accessor function (map type).
   * @param {boolean} opts.mapTypesControl - Indicates whether or not a control should be shown in the
   * bottom-right of the map that can be used display a dialog to change the data accessor (map type) options.
   * @param {string} opts.boundaryGjson - The URL of a boundary geoJson file to display.
   * @param {string} opts.gridGjson - The URL of a grid geoJson file to display.
   * @param {string} opts.gridLineColour - Specifies the line colour of grid line geoJson.
   * @param {string} opts.boundaryColour - Specifies the line colour of the boundary geoJson.
   * @param {string} opts.boundaryFill - Specifies the fill colour of the boundary geoJson.
   * @param {string} opts.seaFill - Specifies the fill colour of the area outside the boundary geoJson.
   * @param {string} opts.insetColour - Specifies the line colour of map inset boxes.
   * @param {function} opts.callbackOptions - Specifies a callback function to be executed if user options dialog used.
   * @returns {module:svgMap~api} api - Returns an API for the map.
   */

  function svgMap() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        _ref$selector = _ref.selector,
        selector = _ref$selector === void 0 ? 'body' : _ref$selector,
        _ref$mapid = _ref.mapid,
        mapid = _ref$mapid === void 0 ? 'svgMap' : _ref$mapid,
        _ref$proj = _ref.proj,
        proj = _ref$proj === void 0 ? 'gb' : _ref$proj,
        _ref$captionId = _ref.captionId,
        captionId = _ref$captionId === void 0 ? '' : _ref$captionId,
        _ref$onclick = _ref.onclick,
        onclick = _ref$onclick === void 0 ? null : _ref$onclick,
        _ref$height = _ref.height,
        height = _ref$height === void 0 ? 500 : _ref$height,
        _ref$expand = _ref.expand,
        expand = _ref$expand === void 0 ? false : _ref$expand,
        _ref$legendOpts = _ref.legendOpts,
        legendOpts = _ref$legendOpts === void 0 ? {
      display: false
    } : _ref$legendOpts,
        _ref$transOptsKey = _ref.transOptsKey,
        transOptsKey = _ref$transOptsKey === void 0 ? 'BI1' : _ref$transOptsKey,
        _ref$transOptsSel = _ref.transOptsSel,
        transOptsSel = _ref$transOptsSel === void 0 ? namedTransOpts : _ref$transOptsSel,
        _ref$transOptsControl = _ref.transOptsControl,
        transOptsControl = _ref$transOptsControl === void 0 ? true : _ref$transOptsControl,
        _ref$mapTypesKey = _ref.mapTypesKey,
        mapTypesKey = _ref$mapTypesKey === void 0 ? 'Standard hectad' : _ref$mapTypesKey,
        _ref$mapTypesSel = _ref.mapTypesSel,
        mapTypesSel = _ref$mapTypesSel === void 0 ? dataAccessors : _ref$mapTypesSel,
        _ref$mapTypesControl = _ref.mapTypesControl,
        mapTypesControl = _ref$mapTypesControl === void 0 ? false : _ref$mapTypesControl,
        _ref$boundaryGjson = _ref.boundaryGjson,
        boundaryGjson = _ref$boundaryGjson === void 0 ? "".concat(constants.cdn, "/assets/GB-I-CI-27700-reduced.geojson") : _ref$boundaryGjson,
        _ref$gridGjson = _ref.gridGjson,
        gridGjson = _ref$gridGjson === void 0 ? "".concat(constants.cdn, "/assets/GB-I-grid-27700-reduced.geojson") : _ref$gridGjson,
        _ref$gridLineColour = _ref.gridLineColour,
        gridLineColour = _ref$gridLineColour === void 0 ? '#7C7CD3' : _ref$gridLineColour,
        _ref$boundaryColour = _ref.boundaryColour,
        boundaryColour = _ref$boundaryColour === void 0 ? '#7C7CD3' : _ref$boundaryColour,
        _ref$boundaryFill = _ref.boundaryFill,
        boundaryFill = _ref$boundaryFill === void 0 ? 'white' : _ref$boundaryFill,
        _ref$seaFill = _ref.seaFill,
        seaFill = _ref$seaFill === void 0 ? '#E6EFFF' : _ref$seaFill,
        _ref$insetColour = _ref.insetColour,
        insetColour = _ref$insetColour === void 0 ? '#7C7CD3' : _ref$insetColour,
        _ref$callbackOptions = _ref.callbackOptions,
        callbackOptions = _ref$callbackOptions === void 0 ? null : _ref$callbackOptions;

    var trans, basemaps, boundary, boundaryf, dataBoundary, grid, dataGrid, taxonIdentifier; // Create a parent div for the SVG within the parent element passed
    // as an argument. Allows us to style correctly for positioning etc.

    var mainDiv = d3.select("".concat(selector)).append("div").attr('id', mapid).style("position", "relative").style("display", "inline"); // Map loading spinner

    var mapLoader = mainDiv.append("div").classed('map-loader', true);
    var mapLoaderInner = mapLoader.append("div").classed('map-loader-inner', true);
    mapLoaderInner.append("div").classed('map-loader-spinner', true);
    mapLoaderInner.append("div").text("Loading map data...").classed('map-loader-text', true); // Create the SVG.

    var svg = mainDiv.append("svg").style("background-color", seaFill);
    svg.append('defs'); // Create the SVG graphic objects that store the major map elements.
    // The order these is created is important since it affects the order
    // in which they are rendered (i.e. what is drawn over what).

    boundaryf = svg.append("g").attr("id", "boundaryf");
    basemaps = svg.append("g").attr("id", "backimage");
    boundary = svg.append("g").attr("id", "boundary");
    grid = svg.append("g").attr("id", "grid"); // Options dialog. 

    if (transOptsControl && Object.keys(transOptsSel).length > 1 || mapTypesControl && Object.keys(mapTypesSel).length > 1) {
      // Add gear icon to invoke options dialog
      mainDiv.append("img") //.attr("src", "../images/gear.png")
      .attr("src", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD8AAAA/CAYAAABXXxDfAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAPlSURBVGhD7ZprT+pAEIYLKBrjDULiH+SjGo0kahQMASLGmBiF+Bf9YowEvOseXp1i4fQys93WYnkS425Ttvvuzu7sTJtRSllpJUv/U0mqxcdm9sfHx2p+fp5q7ry9vVnNZjND1ciJbeaDhAPOPSaZrfm0MhOvQ6VSYe+UNzc3kdwr6YMbYvHX19eqXq+rlZUVC//psi8PDw9UCoZ7r7QPbohc3dnZmXp+fqbaD4uLi9b+/r6ni6rVaiqXy1HNn8/PTwjybOv09FS9vr5S7Yd8Pm8dHh6K3CR75of+11U4wHX4caqO0e122cJBNuvdpWq16ioc4DoGhqosWDN/fn6uHh8fqebPycnJ1+hLZtsLpxVwzXttbc3a2dlhWQBLfJh19RvYExBEoNlPm3DA7bO2q/sLBIrnmlCSMGb2YJoGQNJXttnPzc1RKblIvQtb/NHRUQbxdlKBnx+eNUQWKtrwTCYaMJBeBxYdWq2WuG/iTE6n01F3d3dU48PJ0nCyPW4Ui0Vra2srevE6fl+6YcbxDCAyeykwa51O4Tdx7C8i8cNNjz0j6LzOOrTBEpEMgFdg5YdIPMJGLiY2R0kbOnvF2Jpvt9vq5eXFQgQHobq+vVAoWNvb26HFg4uLC9Xv96kmA5bz8fHxpWV9fd3a3d0d69PYzEM4WFpaCnWoMSUc7O3tabcFa0CiBTmCXq9HV38YiUeWhoqheH9/p5I5TLU5qXEk/unpiUrh2NjYoJI5Go2GEUsaDAZU+mYk3jb5sGxubhozedNg/TsR7fbTDtJiTkbi/RKHf5WpEI8MMBVDsbCwQKVvRoqXl5epFA6kl6lojNvbWyqFA27PyUi830sHCVEkPUy1WSqVqPTNmK3jJIRdP2ycjVMZFX8daME5AVmecrk8NsGikFYSaupEc25E+UzRLhd1lDWJpA2dEFgkXhplhRkAaVZHJ4oUiZeCzutkZfAbnRBVijiNdXV1pe7v76nGB2YZNDvS2bZJdA5vEuy+8CqZTCZU3sCJzgYrEq87M3GAAZVGf+w1j1g4qcIBrAeZKKqyYIv3+iojSUjDcpZ4E+s8LiR9DRQ/TcJtuH2O1M8nnUDxps7occLtM2vmkcrmggfjz0TGFW3Y7dGlQCZjdj/Yfn7oQ9VkDsyJ1wlO50To9TlZ0DkDh6ZarcYeKPaar1arw7bd20Ws7HV0xQuMyaypH7jX6zs6PMPrlRn8vEQ4EB9vLy8vlfP7WI5J2q/BOCDPdnBwENimc0dfXV3971UUB/Fuj1mxBXPXIjrHhXuvsw86woF45nXh+l7ugJpg5ufTykx8Woltw0siM7NPJ5b1D5gX4NZABY0OAAAAAElFTkSuQmCC").style("width", "16px").style("position", "absolute").style("right", "5px").style("bottom", "7px").on("click", function () {
        showOptsDialog(mapid, mapTypesKey, transOptsSel, transOptsKey);
      }); // Create options dialog

      optsDialog(mapid, transOptsSel, transOptsKey, transOptsControl, mapTypesSel, mapTypesKey, mapTypesControl, userChangedOptions);
    } // Initialise the display


    trans = createTrans(transOptsSel[transOptsKey], height);
    setSvgSize();
    drawInsetBoxes(); // Load boundary data

    var pBoundary, pGrid;

    if (boundaryGjson) {
      pBoundary = d3.json(boundaryGjson).then(function (data) {
        dataBoundary = data;
      });
    } else {
      pBoundary = Promise.resolve();
    } // Load grid data


    if (gridGjson) {
      pGrid = d3.json(gridGjson).then(function (data) {
        dataGrid = data;
      });
    } else {
      pGrid = Promise.resolve();
    } // Once loaded, draw booundary and grid


    Promise.all([pBoundary, pGrid]).then(function () {
      drawBoundaryAndGrid();
      mapLoader.classed('map-loader-hidden', true);
    }); // End of initialisation

    function userChangedOptions(opts) {
      if (opts.transOptsKey && transOptsKey !== opts.transOptsKey) {
        transOptsKey = opts.transOptsKey;
        trans = createTrans(transOptsSel[transOptsKey], height);
        drawBoundaryAndGrid();
        setSvgSize();
        drawInsetBoxes();
        refreshMapDots();
        transformImages(basemaps, trans);
      }

      if (opts.mapTypesKey && mapTypesKey !== opts.mapTypesKey) {
        mapTypesKey = opts.mapTypesKey;
        drawMapDots();
      }

      if (callbackOptions) {
        callbackOptions();
      }
    }

    function setSvgSize() {
      if (svg) {
        // Set width/height or viewbox depending on required behaviour
        if (expand) {
          svg.attr("viewBox", "0 0 " + trans.width + " " + trans.height);
        } else {
          svg.attr("width", trans.width);
          svg.attr("height", trans.height);
        }
      }
    }

    function drawBoundaryAndGrid() {
      if (dataBoundary) {
        boundaryf.selectAll("path").remove();
        boundaryf.append("path").datum(dataBoundary).attr("d", trans.d3Path).style("stroke-opacity", 0).style("fill", boundaryFill);
        boundary.selectAll("path").remove();
        boundary.append("path").datum(dataBoundary).attr("d", trans.d3Path).style("fill-opacity", 0).style("stroke", boundaryColour);
      }

      if (dataGrid) {
        grid.selectAll("path").remove();
        grid.append("path").datum(dataGrid).attr("d", trans.d3Path).style("fill-opacity", 0).style("stroke", gridLineColour);
      }
    }

    function drawInsetBoxes() {
      svg.selectAll('.inset').remove();
      trans.insetDims.forEach(function (i) {
        var margin = 10;
        svg.append('rect').classed('inset', true).attr('x', i.x - margin).attr('y', i.y - margin).attr('width', i.width + 2 * margin).attr('height', i.height + 2 * margin).style('fill', 'transparent').style('stroke', insetColour);
      });
    }

    function drawMapDots() {
      svg.select('#legend').remove(); // Remove here to avoid legend resizing if inset options changed.

      drawDots(svg, captionId, onclick, trans.point, mapTypesSel[mapTypesKey], taxonIdentifier, proj).then(function (data) {
        svg.select('#legend').remove(); // Also must remove here to avoid some bad effects. 

        legendOpts.accessorData = data.legend;

        if (legendOpts.display && (legendOpts.data || legendOpts.accessorData)) {
          svgLegend(svg, legendOpts);
        }
      });
    }

    function refreshMapDots() {
      removeDots(svg);
      drawMapDots();
    }
    /** @function setTransform
      * @param {string} newTransOptsKey - specifies the key of the transformation object in the parent object.
      * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
      * The method sets a map transforamation by selecting the one with the passed in key. It also
      * redisplays the map 
      */


    function setTransform(newTransOptsKey) {
      transOptsKey = newTransOptsKey;
      trans = createTrans(transOptsSel[transOptsKey], height);
      drawBoundaryAndGrid();
      setSvgSize();
      drawInsetBoxes();
      refreshMapDots();
      transformImages(basemaps, trans);
    }
    /** @function animateTransChange
      * @param {string} newTransOptsKey - specifies the key of the transformation object in the parent object.
      * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
      * The method sets a map transformation by selecting the one with the passed in key. It also
      * redisplays the map but animates the transition between the new transformation object and the
      * previous.
      */


    function animateTransChange(newTransOptsKey) {
      var lastTransOptsKey = transOptsKey;
      svg.selectAll('.inset').remove(); // remove inset boxes

      removeDots(svg); // remove dots

      var incr = 10;

      var _loop = function _loop(i) {
        var tto = getTweenTransOpts(lastTransOptsKey, newTransOptsKey, height, i / incr);
        setTimeout(function () {
          trans = createTrans(tto, height);
          drawBoundaryAndGrid();
          setSvgSize();
          transformImages(basemaps, trans);

          if (i > incr) {
            setTransform(newTransOptsKey);
          }
        }, 1000 * i / incr);
      };

      for (var i = 1; i <= incr + 1; i++) {
        _loop(i);
      }
    }
    /** @function setBoundaryColour
      * @param {string} c - a string specifying the colour which can be hex format, e.g. #FFA500, 
      * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
      * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
      * Sets the boundary colour to the specified colour.
      */


    function setBoundaryColour(c) {
      boundary.style("stroke", c);
    }
    /** @function setGridColour
      * @param {string} c - a string specifying the colour which can be hex format, e.g. #FFA500, 
      * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
      * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
      * Sets the grid colour to the specified colour.
      */


    function setGridColour(c) {
      grid.style("stroke", c);
    }
    /** @function setIdentfier
      * @param {string} identifier - a string which identifies some data to 
      * a data accessor function.
      * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
      * The data accessor function, specified elsewhere, will use this identifier to access
      * the correct data.
      */


    function setIdentfier(identifier) {
      taxonIdentifier = identifier;
    }
    /** @function setMapType
      * @param {string} newMapTypesKey - a string which a key used to identify a data accessor function. 
      * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
      * The data accessor is stored in the mapTypesSel object and referenced by this key.
      */


    function setMapType(newMapTypesKey) {
      mapTypesKey = newMapTypesKey;
    }
    /** @function basemapImage
      * @param {string} mapId - a string which should specify a unique key by which the image can be referenced. 
      * @param {boolean} show - a boolean value that indicates whether or not to display this image. 
      * @param {string} imageFile - a string identifying an image file. 
      * @param {string} worldFile - a string identifying a 'world' file. 
      * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
      * The image and world files together make a raster file that can be displayed in GIS. GIS, such as
      * QGIS can be used to create the image and world file. If you do this, make sure that the image
      * is created with the same projection as used for the SVG map - i.e. same projection as the vector
      * data for boundary and/or grid files.
      */


    function basemapImage(mapId, show, imageFile, worldFile) {
      showImage(mapId, show, basemaps, imageFile, worldFile, trans);
    }
    /** @function baseMapPriorities
      * @param {Array.<string>} mapIds - an array of strings which identify keys of basemap iamges.
      * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
      * The order the keys appear in the array specifies their priority when more than one is displayed
      * at the same time. Those at the start of the array have higher priority than those and the end.
      */


    function baseMapPriorities(mapIds) {
      setImagePriorities(basemaps, mapIds);
    }
    /** @function setLegendOpts
      * @param {legendOpts} lo - a legend options object.
      * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
      * The legend options object can be used to specify properties of a legend and even the content
      * of the legend itself.
      */


    function setLegendOpts(lo) {
      legendOpts = lo;
    }
    /** @function redrawMap
      * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
      * Redraw the map, e.g. after changing map accessor function or map identifier.
      */


    function redrawMap() {
      drawMapDots();
    }
    /** @function clearMap
      * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
      * Clear the map of dots and legend.
      */


    function clearMap() {
      svg.select('#legend').remove();
      removeDots(svg);
    }
    /** @function getMapWidth
      * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
      * Return the width of the map.
      */


    function getMapWidth() {
      return trans.width;
    }
    /** @function saveMap
      * @description <b>This function is exposed as a method on the API returned from the svgMap function</b>.
      * Creates an image from the displayed map and downloads to user's computer.
      */


    function saveMap() {
      rasterize(svg).then(function (blob) {
        var blobUrl = URL.createObjectURL(blob); // Create a link element

        var link = document.createElement("a"); // Set link's href to point to the Blob URL

        link.href = blobUrl;
        link.download = 'map.png'; // Append link to the body

        document.body.appendChild(link); // Dispatch click event on the link
        // This is necessary as link.click() does not work on the latest firefox

        link.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        })); // Remove link from body

        document.body.removeChild(link);
      });
    }
    /**
     * @typedef {Object} api
     * @property {module:svgMap~setBoundaryColour} setBoundaryColour - Change the colour of the boundary. Pass a single argument
     * which is a string specifying the colour which can be hex format, e.g. #FFA500, 
     * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
     * @property {module:svgMap~setGridColour} setGridColour - Change the colour of the grid. Pass a single argument
     * which is a string specifying the colour which can be hex format, e.g. #FFA500, 
     * RGB format, e.g. rgb(100, 255, 0) or a named colour, e.g. red.
     * @property {module:svgMap~setTransform} setTransform - Set the transformation options object by passing a single argument
     * which is a string indicating the key of the transformation in the parent object.
     * @property {module:svgMap~getMapWidth} getMapWidth - Gets and returns the current width of the SVG map. 
     * @property {module:svgMap~animateTransChange} animateTransChange - Set the a new transormation object and animates the transition.
     * @property {module:svgMap~setIdentfier} setIdentfier - Identifies data to the data accessor function.
     * @property {module:svgMap~setMapType} setMapType - Set the key of the data accessor function.
     * @property {module:svgMap~basemapImage} basemapImage - Specifies an image and world file for a basemap.
     * @property {module:svgMap~baseMapPriorities} baseMapPriorities - Identifies the display order of the basemap images.
     * @property {module:svgMap~setLegendOpts} setLegendOpts - Sets options for the legend.
     * @property {module:svgMap~redrawMap} redrawMap - Redraw the map.
     * @property {module:svgMap~clearMap} clearMap - Clear the map.
     * @property {module:svgMap~saveMap} saveMap - Save and download the map as an image.
     */


    return {
      setBoundaryColour: setBoundaryColour,
      setGridColour: setGridColour,
      setTransform: setTransform,
      getMapWidth: getMapWidth,
      animateTransChange: animateTransChange,
      setIdentfier: setIdentfier,
      setMapType: setMapType,
      basemapImage: basemapImage,
      baseMapPriorities: baseMapPriorities,
      setLegendOpts: setLegendOpts,
      redrawMap: redrawMap,
      clearMap: clearMap,
      saveMap: saveMap
    };
  }

  /** @module slippyMap */
  /**
   * @typedef {Object} basemapConfig
   * @property {string} name - name of layer to be displayer in layer control.
   * @property {string} type - either 'tileLayer' or 'wms'.
   * @property {boolean} selected - indicate whether or not this is to be the layer initially selected.
   * @property {string} url - the standard leaflet formatted URL for the layer.
   * @property {Object} opts - standard leaflet layer options.
   */

  /**
   * @param {Object} opts - Initialisation options.
   * @param {string} opts.selector - The CSS selector of the element which will be the parent of the leaflet map.
   * @param {string} opts.mapid - The id for the slippy map to be created.
   * @param {string} opts.captionId - The id of a DOM element into which feature-specific HTML will be displayed
   * as the mouse moves over a dot on the map. The HTML markup must be stored in an attribute called 'caption'
   * in the input data.
   * @param {number} opts.clusterZoomThreshold - The leaflet zoom level above which clustering will be turned
   * off for point display (except for points in same location) (default 1 - i.e. clustering always one)
   * @param {function} opts.onclick - A function that will be called if user clicks on a map
   * element. The function will be passed these attributes, in this order, if they exist on the
   * element: gr, id, caption. (Default - null.)
   * @param {number} opts.height - The desired height of the leaflet map.
   * @param {number} opts.width - The desired width of the leaflet map.
   * @param {Array.<basemapConfig>} opts.basemapConfigs - An array of map layer configuration objects.
   * @param {Object} opts.mapTypesSel - Sets an object whose properties are data access functions. The property
   * names are the 'keys' which should be human readable descriptiosn of the map types.
   * @param {string} opts.mapTypesKey - Sets the key of the selected data accessor function (map type).
   * @param {legendOpts} opts.legendOpts - Sets options for a map legend.
   * @returns {module:slippyMap~api} Returns an API for the map.
   */

  function leafletMap() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        _ref$selector = _ref.selector,
        selector = _ref$selector === void 0 ? 'body' : _ref$selector,
        _ref$mapid = _ref.mapid,
        mapid = _ref$mapid === void 0 ? 'leafletMap' : _ref$mapid,
        _ref$captionId = _ref.captionId,
        captionId = _ref$captionId === void 0 ? '' : _ref$captionId,
        _ref$clusterZoomThres = _ref.clusterZoomThreshold,
        clusterZoomThreshold = _ref$clusterZoomThres === void 0 ? 19 : _ref$clusterZoomThres,
        _ref$onclick = _ref.onclick,
        onclick = _ref$onclick === void 0 ? null : _ref$onclick,
        _ref$height = _ref.height,
        height = _ref$height === void 0 ? 500 : _ref$height,
        _ref$width = _ref.width,
        width = _ref$width === void 0 ? 300 : _ref$width,
        _ref$basemapConfigs = _ref.basemapConfigs,
        basemapConfigs = _ref$basemapConfigs === void 0 ? [] : _ref$basemapConfigs,
        _ref$mapTypesKey = _ref.mapTypesKey,
        mapTypesKey = _ref$mapTypesKey === void 0 ? 'Standard hectad' : _ref$mapTypesKey,
        _ref$mapTypesSel = _ref.mapTypesSel,
        mapTypesSel = _ref$mapTypesSel === void 0 ? dataAccessors : _ref$mapTypesSel,
        _ref$legendOpts = _ref.legendOpts,
        legendOpts = _ref$legendOpts === void 0 ? {
      display: false
    } : _ref$legendOpts;

    var taxonIdentifier, precision;
    var dots = {};
    var geojsonLayers = {};
    var markers = null;
    d3.select(selector).append('div').attr('id', mapid).style('width', "".concat(width, "px")).style('height', "".concat(height, "px")); // Create basemaps from config

    var selectedBaselayerName;
    var baseMaps = basemapConfigs.reduce(function (bm, c) {
      var lyrFn;

      if (c.type === 'tileLayer') {
        lyrFn = L.tileLayer;
      } else if (c.type === 'wms') {
        lyrFn = L.tileLayer.wms;
      } else {
        return bm;
      }

      bm[c.name] = lyrFn(c.url, c.opts);

      if (c.selected) {
        selectedBaselayerName = c.name;
      }

      return bm;
    }, {}); // If no basemaps configured, provide a default

    if (basemapConfigs.length === 0) {
      baseMaps['OpenStreetMap'] = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });
    } // If no basemap selected, select the first


    if (!selectedBaselayerName) {
      selectedBaselayerName = Object.keys(baseMaps)[0];
    }

    var map = new L.Map(mapid, {
      center: [55, -4],
      zoom: 6,
      layers: [baseMaps[selectedBaselayerName]]
    });
    map.on("viewreset", reset); // Not firing on current version - seems to be a bug

    map.on("zoomend", reset);
    map.on("moveend", reset);
    map.zoomControl.setPosition('topright'); // Record the currently selected basemap layer

    map.on('baselayerchange', function (e) {
      selectedBaselayerName = e.name;
    }); // Add layer selection control to map if there is more than one layer

    var mapLayerControl;

    if (basemapConfigs.length > 0) {
      mapLayerControl = L.control.layers(baseMaps).addTo(map);
    } // Legend custom control


    L.Control.Legend = L.Control.extend({
      onAdd: function onAdd() {
        var div = L.DomUtil.create('div', 'legendDiv leaflet-control leaflet-bar');
        return div;
      },
      onRemove: function onRemove() {}
    });

    L.control.Legend = function (opts) {
      return new L.Control.Legend(opts);
    };

    L.control.Legend({
      position: 'topleft'
    }).addTo(map);

    function projectPoint(x, y) {
      var point = map.latLngToLayerPoint(new L.LatLng(y, x));
      this.stream.point(point.x, point.y);
    }

    var transform = d3.geoTransform({
      point: projectPoint
    });
    var path = d3.geoPath().projection(transform);
    map.createPane('esbatlaspane');
    map.getPane('esbatlaspane').style.zIndex = 650;
    var svg = d3.select(map.getPane('esbatlaspane')).append("svg");
    svg.attr('id', 'atlas-leaflet-svg'); //const svg = d3.select(map.getPanes().overlayPane).append("svg")

    var g = svg.append("g").attr("class", "leaflet-zoom-hide");

    function pointMarkers() {
      // Hide the SVG (atlas elements)
      d3.select("#".concat(mapid)).select('.legendDiv').style('display', 'none');
      svg.style('display', 'none'); // Remove any previous

      if (markers) {
        map.removeLayer(markers);
        console.log('removing');
      }

      console.log('remaking', clusterZoomThreshold);
      markers = L.markerClusterGroup({
        maxClusterRadius: function maxClusterRadius(zoom) {
          return zoom <= clusterZoomThreshold ? 80 : 1; // radius in pixels
        }
      });
      dots.p0.records.forEach(function (f) {
        // Allowed colours: https://awesomeopensource.com/project/pointhi/leaflet-color-markers
        var iconColour = f.colour ? f.colour : dots.p0.colour;
        var icon = new L.Icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-".concat(iconColour, ".png"),
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
        var marker = L.marker(L.latLng(f.lat, f.lng), {
          icon: icon,
          id: f.id,
          gr: f.gr,
          caption: f.caption
        });
        markers.addLayer(marker);
      });
      map.addLayer(markers);

      if (onclick) {
        markers.on("click", function (event) {
          var p = event.layer.options;
          onclick(p.gr, p.id ? p.id : null, p.caption ? p.caption : null); //console.log(event.layer.options)
        });
      }
    }

    function reset() {
      // Hide point markers
      if (markers && precision !== 0) {
        map.removeLayer(markers);
      }

      console.log('zoom', map.getZoom());
      var view = map.getBounds();
      var deg5km = 0.0447;
      var data, buffer;

      if (precision === 10000) {
        data = dots.p10000;
        buffer = deg5km * 1.5;
      } else if (precision === 5000) {
        data = dots.p5000;
        buffer = deg5km * 0.75;
      } else if (precision === 2000) {
        data = dots.p2000;
        buffer = deg5km / 4;
      } else if (precision === 1000) {
        data = dots.p1000;
        buffer = deg5km / 2;
      } else {
        data = [];
        buffer = 0;
      }

      if (!data || !data.records || !data.records.length) {
        d3.select("#".concat(mapid)).select('.legendDiv').style('display', 'none');
        svg.style('display', 'none');
        return;
      } else {
        if (legendOpts.display) {
          d3.select("#".concat(mapid)).select('.legendDiv').style('display', 'block');
        } else {
          d3.select("#".concat(mapid)).select('.legendDiv').style('display', 'none');
        }

        if (precision === 0) {
          svg.style('display', 'none');
        } else {
          svg.style('display', 'block');
        }
      }

      var filteredData = data.records.filter(function (d) {
        if (d.lng < view._southWest.lng - buffer || d.lng > view._northEast.lng + buffer || d.lat < view._southWest.lat - buffer || d.lat > view._northEast.lat + buffer) {
          return false;
        } else {
          if (!d.geometry) {
            if (precision !== 0) {
              var shape = d.shape ? d.shape : data.shape;
              var size = d.size ? d.size : data.size;
              d.geometry = getGjson(d.gr, 'wg', shape, size);
            }
          }

          return true;
        }
      });

      if (precision !== 0) {
        // Atlas data - goes onto an SVG where D3 can work with it
        var bounds = path.bounds({
          type: "FeatureCollection",
          features: filteredData.map(function (d) {
            return {
              type: "Feature",
              geometry: d.geometry
            };
          })
        });
        var topLeft = bounds[0];
        var bottomRight = bounds[1];
        svg.attr("width", bottomRight[0] - topLeft[0]).attr("height", bottomRight[1] - topLeft[1]).style("left", topLeft[0] + "px").style("top", topLeft[1] + "px");
        g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")"); // Update the features

        var u = g.selectAll("path").data(filteredData, function (d) {
          return d.gr;
        });
        u.enter().append("path").style("pointer-events", "all").style("cursor", function () {
          if (onclick) {
            return 'pointer';
          }
        }).on('click', function (d) {
          if (onclick) {
            onclick(d.gr, d.id ? d.id : null, d.caption ? d.caption : null);
          }
        }).on('mouseover', function (d) {
          if (captionId) {
            if (d.caption) {
              d3.select("#".concat(captionId)).html(d.caption);
            } else {
              d3.select("#".concat(captionId)).html('');
            }
          }
        }).merge(u).attr("d", function (d) {
          return path(d.geometry);
        }).attr("opacity", function (d) {
          return d.opacity ? d.opacity : data.opacity;
        }).style("fill", function (d) {
          return d.colour ? d.colour : data.colour;
        }).attr("fill", function (d) {
          return d.colour;
        }).attr("stroke-width", function () {
          {
            return '1';
          }
        });
        u.exit().remove();
      }
    }
    /** @function setMapType
      * @param {string} newMapTypesKey - A string which a key used to identify a data accessor function. 
      * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
      * The data accessor is stored in the mapTypesSel object and referenced by this key.
      */


    function setMapType(newMapTypesKey) {
      mapTypesKey = newMapTypesKey;
    }
    /** @function setIdentfier
      * @param {string} identifier - A string which identifies some data to 
      * a data accessor function.
      * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
      * The data accessor function, specified elsewhere, will use this identifier to access
      * the correct data.
      */


    function setIdentfier(identifier) {
      taxonIdentifier = identifier;
    }
    /** @function redrawMap
      * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
      * Redraw the map, e.g. after changing map accessor function or map identifier.
      */


    function redrawMap() {
      var accessFunction = mapTypesSel[mapTypesKey];
      accessFunction(taxonIdentifier).then(function (data) {
        data.records = data.records.map(function (d) {
          var ll = getCentroid(d.gr, 'wg').centroid;
          d.lat = ll[1];
          d.lng = ll[0];
          return d;
        });
        dots["p".concat(data.precision)] = data;
        precision = data.precision; //Legend

        legendOpts.accessorData = data.legend;

        if (legendOpts.display && (legendOpts.data || legendOpts.accessorData)) {
          var legendSvg = d3.select(selector).append('svg');
          svgLegend(legendSvg, legendOpts);
          var bbox = legendSvg.node().getBBox();
          var w = legendOpts.width ? legendOpts.width : bbox.x + bbox.width + bbox.x;
          var h = legendOpts.height ? legendOpts.height : bbox.y + bbox.height + bbox.y;
          d3.select("#".concat(mapid)).select('.legendDiv').html("<svg class=\"legendSvg\" width=\"".concat(w, "\" height=\"").concat(h, "\">").concat(legendSvg.html(), "</svg>"));
          legendSvg.remove();
        }

        if (precision === 0) {
          pointMarkers();
        } else {
          reset();
        }
      });
    }
    /** @function setLegendOpts
      * @param {legendOpts} lo - a legend options object.
      * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
      * The legend options object can be used to specify properties of a legend and even the content
      * of the legend itself.
      */


    function setLegendOpts(lo) {
      legendOpts = lo;
    }
    /** @function clearMap
      * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
      * Clear the map of dots and legend.
      */


    function clearMap() {
      d3.select("#".concat(mapid)).select('.legendDiv').style('display', 'none');
      svg.style('display', 'none'); // Hide point markers

      if (markers) {
        map.removeLayer(markers);
      }
    }
    /** @function setSize
      * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
      * Change the size of the leaflet map.
      * @param {number} width - Width of the map. 
      * @param {number} height - Height of the map. 
      */


    function setSize(width, height) {
      d3.select("#".concat(mapid)).style('width', "".concat(width, "px")).style('height', "".concat(height, "px"));
      map.invalidateSize();
    }
    /** @function invalidateSize
     * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
     * Expose the leaflet map invalidate size method.
     */


    function invalidateSize() {
      map.invalidateSize();
    }
    /** @function addBasemapLayer
     * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
     * Provides a method to add a basemap layer after the map is created.
     * @param {basemapConfig} config - a configuration object to define the new layer. 
     */


    function addBasemapLayer(config) {
      if (!baseMaps[config.name]) {
        // Add config to baseMaps
        var lyrFn;

        if (config.type === 'tileLayer') {
          lyrFn = L.tileLayer;
        } else if (config.type === 'wms') {
          lyrFn = L.tileLayer.wms;
        }

        if (lyrFn) {
          baseMaps[config.name] = lyrFn(config.url, config.opts);

          if (Object.keys(baseMaps).length === 2) {
            // This is the second base layer - create mapLayerControl
            mapLayerControl = L.control.layers(baseMaps).addTo(map);
          } else {
            mapLayerControl.addBaseLayer(baseMaps[config.name], config.name);
          }

          if (config.selected) {
            map.removeLayer(baseMaps[selectedBaselayerName]);
            map.addLayer(baseMaps[config.name]);
          }
        }
      }
    }
    /** @function removeBasemapLayer
     * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
     * Provides a method to remove a basemap layer after the map is created.
     * @param {string} mapName - the name by which the map layer is identified (appears in layer selection). 
     */


    function removeBasemapLayer(mapName) {
      if (baseMaps[mapName] && Object.keys(baseMaps).length > 1) {
        map.removeLayer(baseMaps[mapName]);
        mapLayerControl.removeLayer(baseMaps[mapName]);
        delete baseMaps[mapName];

        if (selectedBaselayerName === mapName) {
          // If the removed layer was previously displayed, then
          // display first basemap.
          map.addLayer(baseMaps[Object.keys(baseMaps)[0]]);
        }

        if (Object.keys(baseMaps).length === 1) {
          // Only one base layer - remove mapLayerControl
          mapLayerControl.remove();
        }
      }
    }
    /** @function addGeojsonLayer
     * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
     * Provides a method to add a geojson layer after the map is created.
     * @param {geojsonConfig} config - a configuration object to define the new layer. 
     */


    function addGeojsonLayer(config) {
      if (!geojsonLayers[config.name]) {
        if (!config.style) {
          config.style = {
            "color": "blue",
            "weight": 5,
            "opacity": 0.65
          };
        }

        d3.json(config.url).then(function (data) {
          geojsonLayers[config.name] = L.geoJSON(data, {
            style: config.style
          }).addTo(map);
        });
      } else {
        console.log("Geojson layer with the name ".concat(config.name, " is already loaded."));
      }
    }
    /** @function removeGeojsonLayer
     * @description <b>This function is exposed as a method on the API returned from the leafletMap function</b>.
     * Provides a method to remove a geojson layer after the map is created.
     * @param {string} mapName - the name by which the map layer is identified. 
     */


    function removeGeojsonLayer(name) {
      if (geojsonLayers[name]) {
        map.removeLayer(geojsonLayers[name]);
        delete geojsonLayers[name];
      } else {
        console.log("Geojson layer with the name ".concat(name, " not found."));
      }
    }
    /** @function showOverlay
     * @description <b>This function allows you to show/hide the leaflet overlay layer (atlas layer)</b>.
     * Provides a method to show/hide the leaflet overlay layer used to display atlas data.
     * @param {boolean} show - Set to true to display the layer, or false to hide it. 
     */


    function showOverlay(show) {
      if (show) {
        if (legendOpts.display) {
          d3.select("#".concat(mapid)).select('.legendDiv').style('display', 'block');
        } else {
          d3.select("#".concat(mapid)).select('.legendDiv').style('display', 'none');
        }

        svg.style('display', 'block');
      } else {
        d3.select("#".concat(mapid)).select('.legendDiv').style('display', 'none');
        svg.style('display', 'none');
      }
    }
    /** @function changeClusterThreshold
     * @description <b>This function allows you to change the clustering threshold zoom level for point maps</b>.
     * @param {number} clusterZoomThreshold - The leaflet zoom level above which clustering will be turned off.
     */


    function changeClusterThreshold(level) {
      clusterZoomThreshold = level;

      if (precision === 0) {
        pointMarkers();
      }
    }
    /**
     * @typedef {Object} api
     * @property {module:slippyMap~setIdentfier} setIdentfier - Identifies data to the data accessor function.
     * @property {module:slippyMap~setMapType} setMapType - Set the key of the data accessor function.
     * @property {module:slippyMap~setLegendOpts} setLegendOpts - Sets options for the legend.
     * @property {module:slippyMap~redrawMap} redrawMap - Redraw the map.
     * @property {module:slippyMap~clearMap} clearMap - Clear the map.
     * @property {module:slippyMap~setSize} setSize - Reset the size of the leaflet map.
     * @property {module:slippyMap~invalidateSize} invalidateSize - Access Leaflet's invalidateSize method.
     * @property {module:slippyMap~addBasemapLayer} addBasemapLayer - Add a basemap to the map.
     * @property {module:slippyMap~removeBasemapLayer} removeBasemapLayer - Remove a basemap from the map.
     * @property {module:slippyMap~addGeojsonLayer} addGeojsonLayer - Add a geojson layer to the map.
     * @property {module:slippyMap~removeGeojsonLayer} removeGeojsonLayer - Remove a geojson layer from the map.
     * @property {module:slippyMap~showOverlay} showOverlay - Show/hide the overlay layer.
     * @property {module:slippyMap~changeClusterThreshold} changeClusterThreshold - Change the zoom cluster threshold for points.
     * @property {module:slippyMap~map} lmap - Returns a reference to the leaflet map object.
     */


    return {
      setIdentfier: setIdentfier,
      setLegendOpts: setLegendOpts,
      redrawMap: redrawMap,
      setMapType: setMapType,
      clearMap: clearMap,
      setSize: setSize,
      invalidateSize: invalidateSize,
      addBasemapLayer: addBasemapLayer,
      removeBasemapLayer: removeBasemapLayer,
      addGeojsonLayer: addGeojsonLayer,
      removeGeojsonLayer: removeGeojsonLayer,
      showOverlay: showOverlay,
      changeClusterThreshold: changeClusterThreshold,
      lmap: map
    };
  }

  function parseTags() {
    var divs = d3.selectAll("div.brcatlas");
    divs.each(function () {
      // Loop for each div of class brcatlas
      var el = d3.select(this);
      var id = el.attr("id");
      var csv = el.attr("data-csv");
      var valid = true;

      if (!id) {
        console.log('Div tag of class "brcatlas" requires an id attribute.');
        valid = false;
      }

      if (!csv) {
        console.log("Div tag (id=".concat(id, ") of class \"brcatlas\" requires a data-csv attribute."));
        valid = false;
      }

      if (valid) {
        // Slippiness
        var slippy = el.attr("data-slippy") ? true : false; // mapopts. Default true

        var mapopts = el.attr("data-opts") ? el.attr("data-opts") !== "false" : true; // transopts. Default BI1

        var transopts = el.attr("data-trans") ? el.attr("data-trans") : 'BI1'; // Precision. Default 10000

        var precision = el.attr("data-precision") ? parseInt(el.attr("data-precision")) : 10000; // Map height.

        var height = el.attr("data-height") ? parseInt(el.attr("data-height")) : null; // Map height.

        var width = el.attr("data-width") ? parseInt(el.attr("data-width")) : null;
        var mapTypesKey;

        switch (precision) {
          case 10000:
            mapTypesKey = 'Standard hectad';
            break;

          case 2000:
            mapTypesKey = 'Standard tetrad';
            break;

          case 1000:
            mapTypesKey = 'Standard monad';
            break;

          default:
            mapTypesKey = 'Standard hectad';
        }

        var opts = {
          selector: "#".concat(id),
          mapid: "#".concat(id, "-map"),
          mapTypesKey: mapTypesKey,
          transOptsControl: mapopts,
          legendOpts: getLegendOpts(el, precision)
        };

        if (height) {
          opts.height = height;
        }

        if (width) {
          opts.width = width;
        }

        if (transopts) {
          opts.transOptsKey = transopts;
        }

        var map;

        if (slippy) {
          map = leafletMap(opts);
        } else {
          map = svgMap(opts);
        }

        map.setIdentfier(csv);
        map.redrawMap();
      }
    });
  }

  function getLegendOpts(el, precision) {
    // display. Default true
    var display = el.attr("data-legend") ? el.attr("data-legend") === "true" : false; // scale. Default 1

    var scale = el.attr("data-legend-scale") ? parseFloat(el.attr("data-legend-scale")) : 1; // x. Default 0

    var x = el.attr("data-legend-x") ? parseInt(el.attr("data-legend-x")) : 0; // y. Default 0

    var y = el.attr("data-legend-y") ? parseInt(el.attr("data-legend-y")) : 0; // title. Default ''

    var title = el.attr("data-legend-title") ? el.attr("data-legend-title") : ''; // size. Default 1

    var size = el.attr("data-legend-size") ? parseFloat(el.attr("data-legend-size")) : 1; // opacity. Default 1

    var opacity = el.attr("data-legend-opacity") ? parseFloat(el.attr("data-legend-opacity")) : 1; // lines. Default ''

    var linesOpts = el.attr("data-legend-lines") ? el.attr("data-legend-lines").split('|') : [];
    var lines = linesOpts.map(function (l) {
      var parts = l.split(';');

      if (parts.length === 3) {
        return {
          colour: parts[2].trim(),
          shape: parts[1].trim(),
          text: parts[0].trim()
        };
      } else {
        return {
          colour: 'red',
          shape: 'circle',
          text: 'incorrect legend line elements'
        };
      }
    });
    var opts = {
      display: display,
      scale: scale,
      x: x,
      y: y,
      data: {
        title: title,
        size: size,
        precision: precision,
        opacity: opacity,
        lines: lines
      }
    };

    if (display) {
      return opts;
    } else {
      return {
        display: false
      };
    }
  }

  var name = "brcatlas";
  var version = "0.11.1";
  var description = "Javascript library for web-based biological records atlas mapping in the British Isles.";
  var type = "module";
  var main = "dist/brcatlas.umd.js";
  var browser = "dist/brcatlas.umd.js";
  var scripts = {
  	lint: "npx eslint src",
  	test: "jest",
  	prepare: "node script-prepublish.js",
  	build: "rollup --config",
  	docs: "jsdoc ./src/ -R README.md -d ./docs/api"
  };
  var author = "CEH Biological Records Centre";
  var license = "GPL-3.0-only";
  var files = [
  	"dist"
  ];
  var repository = {
  	type: "git",
  	url: "https://github.com/BiologicalRecordsCentre/brc-atlas.git"
  };
  var dependencies = {
  	"brc-atlas-bigr": "^2.1.0",
  	d3: "^5.16.0",
  	leaflet: "^1.7.1",
  	"leaflet-control-custom": "^1.0.0",
  	"leaflet.markercluster": "^1.5.0",
  	micromodal: "^0.4.6"
  };
  var devDependencies = {
  	"@babel/core": "^7.10.4",
  	"@babel/preset-env": "^7.10.4",
  	"@rollup/plugin-babel": "^5.0.4",
  	"@rollup/plugin-commonjs": "^13.0.0",
  	"@rollup/plugin-json": "^4.1.0",
  	"@rollup/plugin-node-resolve": "^8.1.0",
  	"copy-dir": "^1.3.0",
  	eslint: "^7.4.0",
  	"eslint-plugin-jest": "^23.17.1",
  	jest: "^26.1.0",
  	rollup: "^2.23.0",
  	"rollup-plugin-css-only": "^2.1.0",
  	"rollup-plugin-eslint": "^7.0.0",
  	"rollup-plugin-terser": "^6.1.0"
  };
  var pkg = {
  	name: name,
  	version: version,
  	description: description,
  	type: type,
  	main: main,
  	browser: browser,
  	scripts: scripts,
  	author: author,
  	license: license,
  	files: files,
  	repository: repository,
  	dependencies: dependencies,
  	devDependencies: devDependencies
  };

  // to assist with trouble shooting.

  console.log("Running ".concat(pkg.name, " version ").concat(pkg.version));
  document.addEventListener('DOMContentLoaded', function () {
    parseTags();
  });

  exports.dataAccessors = dataAccessors;
  exports.leafletMap = leafletMap;
  exports.namedTransOpts = namedTransOpts;
  exports.parseTags = parseTags;
  exports.svgMap = svgMap;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
