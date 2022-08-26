(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["VueColor"] = factory();
	else
		root["VueColor"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _Compact = __webpack_require__(1);

	var _Compact2 = _interopRequireDefault(_Compact);

	var _Material = __webpack_require__(15);

	var _Material2 = _interopRequireDefault(_Material);

	var _Slider = __webpack_require__(20);

	var _Slider2 = _interopRequireDefault(_Slider);

	var _Swatches = __webpack_require__(30);

	var _Swatches2 = _interopRequireDefault(_Swatches);

	var _Photoshop = __webpack_require__(36);

	var _Photoshop2 = _interopRequireDefault(_Photoshop);

	var _Sketch = __webpack_require__(57);

	var _Sketch2 = _interopRequireDefault(_Sketch);

	var _Chrome = __webpack_require__(62);

	var _Chrome2 = _interopRequireDefault(_Chrome);

	var _Alpha = __webpack_require__(46);

	var _Alpha2 = _interopRequireDefault(_Alpha);

	var _Checkboard = __webpack_require__(50);

	var _Checkboard2 = _interopRequireDefault(_Checkboard);

	var _EditableInput = __webpack_require__(9);

	var _EditableInput2 = _interopRequireDefault(_EditableInput);

	var _Hue = __webpack_require__(24);

	var _Hue2 = _interopRequireDefault(_Hue);

	var _Saturation = __webpack_require__(40);

	var _Saturation2 = _interopRequireDefault(_Saturation);

	var _color = __webpack_require__(7);

	var _color2 = _interopRequireDefault(_color);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var VueColor = {
	  version: '1.0.26',
	  Compact: _Compact2.default,
	  Material: _Material2.default,
	  Slider: _Slider2.default,
	  Swatches: _Swatches2.default,
	  Photoshop: _Photoshop2.default,
	  Sketch: _Sketch2.default,
	  Chrome: _Chrome2.default,
	  Alpha: _Alpha2.default,
	  Checkboard: _Checkboard2.default,
	  EditableInput: _EditableInput2.default,
	  Hue: _Hue2.default,
	  Saturation: _Saturation2.default,
	  ColorMixin: _color2.default
	};

	module.exports = VueColor;

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	var __vue_exports__, __vue_options__

	/* styles */
	__webpack_require__(2)

	/* script */
	__vue_exports__ = __webpack_require__(6)

	/* template */
	var __vue_template__ = __webpack_require__(14)
	__vue_options__ = __vue_exports__ = __vue_exports__ || {}
	if (
	  typeof __vue_exports__.default === "object" ||
	  typeof __vue_exports__.default === "function"
	) {
	if (Object.keys(__vue_exports__).some(function (key) { return key !== "default" && key !== "__esModule" })) {console.error("named exports are not supported in *.vue files.")}
	__vue_options__ = __vue_exports__ = __vue_exports__.default
	}
	if (typeof __vue_options__ === "function") {
	  __vue_options__ = __vue_options__.options
	}
	__vue_options__.render = __vue_template__.render
	__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

	/* hot reload */
	if (false) {(function () {
	  var hotAPI = require("vue-loader/node_modules/vue-hot-reload-api")
	  hotAPI.install(require("vue"), false)
	  if (!hotAPI.compatible) return
	  module.hot.accept()
	  if (!module.hot.data) {
	    hotAPI.createRecord("data-v-1", __vue_options__)
	  } else {
	    hotAPI.reload("data-v-1", __vue_options__)
	  }
	})()}
	if (__vue_options__.functional) {console.error("[vue-loader] Compact.vue: functional components are not supported and should be defined in plain js files using render functions.")}

	module.exports = __vue_exports__


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(3);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(5)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../../node_modules/css-loader/index.js!../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-1!../../node_modules/stylus-loader/index.js!../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Compact.vue", function() {
				var newContent = require("!!../../node_modules/css-loader/index.js!../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-1!../../node_modules/stylus-loader/index.js!../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Compact.vue");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(4)();
	// imports


	// module
	exports.push([module.id, "\n.vue-color__compact {\n  padding-top: 5px;\n  padding-left: 5px;\n  width: 240px;\n  border-radius: 2px;\n  box-shadow: 0 2px 10px rgba(0,0,0,0.12), 0 2px 5px rgba(0,0,0,0.16);\n  background-color: #fff;\n}\n.vue-color__compact__colors {\n  overflow: hidden;\n  padding: 0;\n  margin: 0;\n}\n.vue-color__compact__color-item {\n  list-style: none;\n  width: 15px;\n  height: 15px;\n  float: left;\n  margin-right: 5px;\n  margin-bottom: 5px;\n  position: relative;\n  cursor: pointer;\n}\n.vue-color__compact__color-item--white {\n  box-shadow: inset 0 0 0 1px #ddd;\n}\n.vue-color__compact__color-item--white .vue-color__compact__dot {\n  background: #000;\n}\n.vue-color__compact__dot {\n  position: absolute;\n  top: 5px;\n  right: 5px;\n  bottom: 5px;\n  left: 5px;\n  border-radius: 50%;\n  opacity: 1;\n  background: #fff;\n}\n.vue-color__compact__fields {\n  display: flex;\n  position: relative;\n  padding-bottom: 6px;\n  padding-right: 5px;\n  position: relative;\n}\n.vue-color__compact__fields .vue-color__editable-input__input {\n  width: 70%;\n  padding-left: 30%;\n  background: none;\n  font-size: 12px;\n  color: #333;\n  height: 16px;\n}\n.vue-color__compact__fields .vue-color__editable-input__label {\n  position: absolute;\n  top: 3px;\n  left: 0;\n  line-height: 16px;\n  text-transform: uppercase;\n  font-size: 12px;\n  color: #999;\n}\n.vue-color__compact__pick-color {\n  position: absolute;\n  top: 6px;\n  left: 5px;\n  height: 9px;\n  width: 9px;\n}\n.vue-color__compact__col-3 {\n  flex: 1;\n}\n.vue_color__compact__col-hex {\n  flex: 2;\n}\n.vue_color__compact__col-hex .vue-color__editable-input__input {\n  width: 80%;\n  padding-left: 20%;\n}\n.vue_color__compact__col-hex .vue-color__editable-input__label {\n  display: none;\n}\n", ""]);

	// exports


/***/ }),
/* 4 */
/***/ (function(module, exports) {

	/*
		MIT License http://www.opensource.org/licenses/mit-license.php
		Author Tobias Koppers @sokra
	*/
	// css base code, injected by the css-loader
	module.exports = function() {
		var list = [];

		// return the list of modules as css string
		list.toString = function toString() {
			var result = [];
			for(var i = 0; i < this.length; i++) {
				var item = this[i];
				if(item[2]) {
					result.push("@media " + item[2] + "{" + item[1] + "}");
				} else {
					result.push(item[1]);
				}
			}
			return result.join("");
		};

		// import a list of modules into the list
		list.i = function(modules, mediaQuery) {
			if(typeof modules === "string")
				modules = [[null, modules, ""]];
			var alreadyImportedModules = {};
			for(var i = 0; i < this.length; i++) {
				var id = this[i][0];
				if(typeof id === "number")
					alreadyImportedModules[id] = true;
			}
			for(i = 0; i < modules.length; i++) {
				var item = modules[i];
				// skip already imported module
				// this implementation is not 100% perfect for weird media query combinations
				//  when a module is imported multiple times with different media queries.
				//  I hope this will never occur (Hey this way we have smaller bundles)
				if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
					if(mediaQuery && !item[2]) {
						item[2] = mediaQuery;
					} else if(mediaQuery) {
						item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
					}
					list.push(item);
				}
			}
		};
		return list;
	};


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	/*
		MIT License http://www.opensource.org/licenses/mit-license.php
		Author Tobias Koppers @sokra
	*/
	var stylesInDom = {},
		memoize = function(fn) {
			var memo;
			return function () {
				if (typeof memo === "undefined") memo = fn.apply(this, arguments);
				return memo;
			};
		},
		isOldIE = memoize(function() {
			return /msie [6-9]\b/.test(window.navigator.userAgent.toLowerCase());
		}),
		getHeadElement = memoize(function () {
			return document.head || document.getElementsByTagName("head")[0];
		}),
		singletonElement = null,
		singletonCounter = 0,
		styleElementsInsertedAtTop = [];

	module.exports = function(list, options) {
		if(false) {
			if(typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
		}

		options = options || {};
		// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
		// tags it will allow on a page
		if (typeof options.singleton === "undefined") options.singleton = isOldIE();

		// By default, add <style> tags to the bottom of <head>.
		if (typeof options.insertAt === "undefined") options.insertAt = "bottom";

		var styles = listToStyles(list);
		addStylesToDom(styles, options);

		return function update(newList) {
			var mayRemove = [];
			for(var i = 0; i < styles.length; i++) {
				var item = styles[i];
				var domStyle = stylesInDom[item.id];
				domStyle.refs--;
				mayRemove.push(domStyle);
			}
			if(newList) {
				var newStyles = listToStyles(newList);
				addStylesToDom(newStyles, options);
			}
			for(var i = 0; i < mayRemove.length; i++) {
				var domStyle = mayRemove[i];
				if(domStyle.refs === 0) {
					for(var j = 0; j < domStyle.parts.length; j++)
						domStyle.parts[j]();
					delete stylesInDom[domStyle.id];
				}
			}
		};
	}

	function addStylesToDom(styles, options) {
		for(var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];
			if(domStyle) {
				domStyle.refs++;
				for(var j = 0; j < domStyle.parts.length; j++) {
					domStyle.parts[j](item.parts[j]);
				}
				for(; j < item.parts.length; j++) {
					domStyle.parts.push(addStyle(item.parts[j], options));
				}
			} else {
				var parts = [];
				for(var j = 0; j < item.parts.length; j++) {
					parts.push(addStyle(item.parts[j], options));
				}
				stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
			}
		}
	}

	function listToStyles(list) {
		var styles = [];
		var newStyles = {};
		for(var i = 0; i < list.length; i++) {
			var item = list[i];
			var id = item[0];
			var css = item[1];
			var media = item[2];
			var sourceMap = item[3];
			var part = {css: css, media: media, sourceMap: sourceMap};
			if(!newStyles[id])
				styles.push(newStyles[id] = {id: id, parts: [part]});
			else
				newStyles[id].parts.push(part);
		}
		return styles;
	}

	function insertStyleElement(options, styleElement) {
		var head = getHeadElement();
		var lastStyleElementInsertedAtTop = styleElementsInsertedAtTop[styleElementsInsertedAtTop.length - 1];
		if (options.insertAt === "top") {
			if(!lastStyleElementInsertedAtTop) {
				head.insertBefore(styleElement, head.firstChild);
			} else if(lastStyleElementInsertedAtTop.nextSibling) {
				head.insertBefore(styleElement, lastStyleElementInsertedAtTop.nextSibling);
			} else {
				head.appendChild(styleElement);
			}
			styleElementsInsertedAtTop.push(styleElement);
		} else if (options.insertAt === "bottom") {
			head.appendChild(styleElement);
		} else {
			throw new Error("Invalid value for parameter 'insertAt'. Must be 'top' or 'bottom'.");
		}
	}

	function removeStyleElement(styleElement) {
		styleElement.parentNode.removeChild(styleElement);
		var idx = styleElementsInsertedAtTop.indexOf(styleElement);
		if(idx >= 0) {
			styleElementsInsertedAtTop.splice(idx, 1);
		}
	}

	function createStyleElement(options) {
		var styleElement = document.createElement("style");
		styleElement.type = "text/css";
		insertStyleElement(options, styleElement);
		return styleElement;
	}

	function addStyle(obj, options) {
		var styleElement, update, remove;

		if (options.singleton) {
			var styleIndex = singletonCounter++;
			styleElement = singletonElement || (singletonElement = createStyleElement(options));
			update = applyToSingletonTag.bind(null, styleElement, styleIndex, false);
			remove = applyToSingletonTag.bind(null, styleElement, styleIndex, true);
		} else {
			styleElement = createStyleElement(options);
			update = applyToTag.bind(null, styleElement);
			remove = function() {
				removeStyleElement(styleElement);
			};
		}

		update(obj);

		return function updateStyle(newObj) {
			if(newObj) {
				if(newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap)
					return;
				update(obj = newObj);
			} else {
				remove();
			}
		};
	}

	var replaceText = (function () {
		var textStore = [];

		return function (index, replacement) {
			textStore[index] = replacement;
			return textStore.filter(Boolean).join('\n');
		};
	})();

	function applyToSingletonTag(styleElement, index, remove, obj) {
		var css = remove ? "" : obj.css;

		if (styleElement.styleSheet) {
			styleElement.styleSheet.cssText = replaceText(index, css);
		} else {
			var cssNode = document.createTextNode(css);
			var childNodes = styleElement.childNodes;
			if (childNodes[index]) styleElement.removeChild(childNodes[index]);
			if (childNodes.length) {
				styleElement.insertBefore(cssNode, childNodes[index]);
			} else {
				styleElement.appendChild(cssNode);
			}
		}
	}

	function applyToTag(styleElement, obj) {
		var css = obj.css;
		var media = obj.media;
		var sourceMap = obj.sourceMap;

		if (media) {
			styleElement.setAttribute("media", media);
		}

		if (sourceMap) {
			// https://developer.chrome.com/devtools/docs/javascript-debugging
			// this makes source maps inside style tags work properly in Chrome
			css += '\n/*# sourceURL=' + sourceMap.sources[0] + ' */';
			// http://stackoverflow.com/a/26603875
			css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
		}

		if (styleElement.styleSheet) {
			styleElement.styleSheet.cssText = css;
		} else {
			while(styleElement.firstChild) {
				styleElement.removeChild(styleElement.firstChild);
			}
			styleElement.appendChild(document.createTextNode(css));
		}
	}


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _color = __webpack_require__(7);

	var _color2 = _interopRequireDefault(_color);

	var _EditableInput = __webpack_require__(9);

	var _EditableInput2 = _interopRequireDefault(_EditableInput);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var defaultColors = ['#4D4D4D', '#999999', '#FFFFFF', '#F44E3B', '#FE9200', '#FCDC00', '#DBDF00', '#A4DD00', '#68CCCA', '#73D8FF', '#AEA1FF', '#FDA1FF', '#333333', '#808080', '#CCCCCC', '#D33115', '#E27300', '#FCC400', '#B0BC00', '#68BC00', '#16A5A5', '#009CE0', '#7B64FF', '#FA28FF', '#000000', '#666666', '#B3B3B3', '#9F0500', '#C45100', '#FB9E00', '#808900', '#194D33', '#0C797D', '#0062B1', '#653294', '#AB149E'];

	exports.default = {
	  name: 'Compact',
	  mixins: [_color2.default],
	  props: {},
	  components: {
	    'ed-in': _EditableInput2.default
	  },
	  computed: {
	    pick: function pick() {
	      return this.colors.hex;
	    }
	  },
	  data: function data() {
	    return {
	      defaultColors: defaultColors
	    };
	  },

	  methods: {
	    handlerClick: function handlerClick(c) {
	      this.colorChange({
	        hex: c,
	        source: 'hex'
	      });
	    },
	    onChange: function onChange(data) {
	      if (!data) {
	        return;
	      }
	      if (data.hex) {
	        this.isValidHex(data.hex) && this.colorChange({
	          hex: data.hex,
	          source: 'hex'
	        });
	      } else if (data.r || data.g || data.b) {
	        this.colorChange({
	          r: data.r || this.colors.rgba.r,
	          g: data.g || this.colors.rgba.g,
	          b: data.b || this.colors.rgba.b,
	          a: data.a || this.colors.rgba.a,
	          source: 'rgba'
	        });
	      }
	    }
	  }
	};

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _tinycolor = __webpack_require__(8);

	var _tinycolor2 = _interopRequireDefault(_tinycolor);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _colorChange(data, oldHue) {
	  var alpha = data && data.a;
	  var color;

	  if (data && data.hsl) {
	    color = (0, _tinycolor2.default)(data.hsl);
	  } else if (data && data.hex && data.hex.length > 0) {
	    color = (0, _tinycolor2.default)(data.hex);
	  } else {
	    color = (0, _tinycolor2.default)(data);
	  }

	  if (color) color.setAlpha(alpha || 1);

	  var hsl = color.toHsl();
	  var hsv = color.toHsv();

	  if (hsl.s === 0) {
	    hsl.h = data.h || oldHue || 0;
	    hsv.h = data.h || oldHue || 0;
	  }

	  return {
	    hsl: hsl,
	    hex: color.toHexString().toUpperCase(),
	    rgba: color.toRgb(),
	    hsv: hsv,
	    oldHue: data.h || oldHue || hsl.h,
	    source: data.source,
	    a: data.a || color.getAlpha()
	  };
	}

	exports.default = {
	  props: ['value'],
	  data: function data() {
	    return {
	      val: _colorChange(this.value)
	    };
	  },

	  computed: {
	    colors: {
	      get: function get() {
	        return this.val;
	      },
	      set: function set(newVal) {
	        this.val = newVal;
	        this.$emit('change-color', newVal);
	      }
	    }
	  },
	  watch: {
	    value: function value(newVal) {
	      this.val = _colorChange(newVal);
	    }
	  },
	  methods: {
	    colorChange: function colorChange(data, oldHue) {
	      this.oldHue = this.colors.hsl.h;
	      this.colors = _colorChange(data, oldHue || this.oldHue);
	    },
	    isValidHex: function isValidHex(hex) {
	      return (0, _tinycolor2.default)(hex).isValid();
	    },
	    simpleCheckForValidColor: function simpleCheckForValidColor(data) {
	      var keysToCheck = ['r', 'g', 'b', 'a', 'h', 's', 'a', 'v'];
	      var checked = 0;
	      var passed = 0;

	      for (var i = 0; i < keysToCheck.length; i++) {
	        var letter = keysToCheck[i];
	        if (data[letter]) {
	          checked++;
	          if (!isNaN(data[letter])) {
	            passed++;
	          }
	        }
	      }

	      if (checked === passed) {
	        return data;
	      }
	    }
	  }
	};

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;// TinyColor v1.4.1
	// https://github.com/bgrins/TinyColor
	// Brian Grinstead, MIT License

	(function(Math) {

	var trimLeft = /^\s+/,
	    trimRight = /\s+$/,
	    tinyCounter = 0,
	    mathRound = Math.round,
	    mathMin = Math.min,
	    mathMax = Math.max,
	    mathRandom = Math.random;

	function tinycolor (color, opts) {

	    color = (color) ? color : '';
	    opts = opts || { };

	    // If input is already a tinycolor, return itself
	    if (color instanceof tinycolor) {
	       return color;
	    }
	    // If we are called as a function, call using new instead
	    if (!(this instanceof tinycolor)) {
	        return new tinycolor(color, opts);
	    }

	    var rgb = inputToRGB(color);
	    this._originalInput = color,
	    this._r = rgb.r,
	    this._g = rgb.g,
	    this._b = rgb.b,
	    this._a = rgb.a,
	    this._roundA = mathRound(100*this._a) / 100,
	    this._format = opts.format || rgb.format;
	    this._gradientType = opts.gradientType;

	    // Don't let the range of [0,255] come back in [0,1].
	    // Potentially lose a little bit of precision here, but will fix issues where
	    // .5 gets interpreted as half of the total, instead of half of 1
	    // If it was supposed to be 128, this was already taken care of by `inputToRgb`
	    if (this._r < 1) { this._r = mathRound(this._r); }
	    if (this._g < 1) { this._g = mathRound(this._g); }
	    if (this._b < 1) { this._b = mathRound(this._b); }

	    this._ok = rgb.ok;
	    this._tc_id = tinyCounter++;
	}

	tinycolor.prototype = {
	    isDark: function() {
	        return this.getBrightness() < 128;
	    },
	    isLight: function() {
	        return !this.isDark();
	    },
	    isValid: function() {
	        return this._ok;
	    },
	    getOriginalInput: function() {
	      return this._originalInput;
	    },
	    getFormat: function() {
	        return this._format;
	    },
	    getAlpha: function() {
	        return this._a;
	    },
	    getBrightness: function() {
	        //http://www.w3.org/TR/AERT#color-contrast
	        var rgb = this.toRgb();
	        return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
	    },
	    getLuminance: function() {
	        //http://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
	        var rgb = this.toRgb();
	        var RsRGB, GsRGB, BsRGB, R, G, B;
	        RsRGB = rgb.r/255;
	        GsRGB = rgb.g/255;
	        BsRGB = rgb.b/255;

	        if (RsRGB <= 0.03928) {R = RsRGB / 12.92;} else {R = Math.pow(((RsRGB + 0.055) / 1.055), 2.4);}
	        if (GsRGB <= 0.03928) {G = GsRGB / 12.92;} else {G = Math.pow(((GsRGB + 0.055) / 1.055), 2.4);}
	        if (BsRGB <= 0.03928) {B = BsRGB / 12.92;} else {B = Math.pow(((BsRGB + 0.055) / 1.055), 2.4);}
	        return (0.2126 * R) + (0.7152 * G) + (0.0722 * B);
	    },
	    setAlpha: function(value) {
	        this._a = boundAlpha(value);
	        this._roundA = mathRound(100*this._a) / 100;
	        return this;
	    },
	    toHsv: function() {
	        var hsv = rgbToHsv(this._r, this._g, this._b);
	        return { h: hsv.h * 360, s: hsv.s, v: hsv.v, a: this._a };
	    },
	    toHsvString: function() {
	        var hsv = rgbToHsv(this._r, this._g, this._b);
	        var h = mathRound(hsv.h * 360), s = mathRound(hsv.s * 100), v = mathRound(hsv.v * 100);
	        return (this._a == 1) ?
	          "hsv("  + h + ", " + s + "%, " + v + "%)" :
	          "hsva(" + h + ", " + s + "%, " + v + "%, "+ this._roundA + ")";
	    },
	    toHsl: function() {
	        var hsl = rgbToHsl(this._r, this._g, this._b);
	        return { h: hsl.h * 360, s: hsl.s, l: hsl.l, a: this._a };
	    },
	    toHslString: function() {
	        var hsl = rgbToHsl(this._r, this._g, this._b);
	        var h = mathRound(hsl.h * 360), s = mathRound(hsl.s * 100), l = mathRound(hsl.l * 100);
	        return (this._a == 1) ?
	          "hsl("  + h + ", " + s + "%, " + l + "%)" :
	          "hsla(" + h + ", " + s + "%, " + l + "%, "+ this._roundA + ")";
	    },
	    toHex: function(allow3Char) {
	        return rgbToHex(this._r, this._g, this._b, allow3Char);
	    },
	    toHexString: function(allow3Char) {
	        return '#' + this.toHex(allow3Char);
	    },
	    toHex8: function(allow4Char) {
	        return rgbaToHex(this._r, this._g, this._b, this._a, allow4Char);
	    },
	    toHex8String: function(allow4Char) {
	        return '#' + this.toHex8(allow4Char);
	    },
	    toRgb: function() {
	        return { r: mathRound(this._r), g: mathRound(this._g), b: mathRound(this._b), a: this._a };
	    },
	    toRgbString: function() {
	        return (this._a == 1) ?
	          "rgb("  + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ")" :
	          "rgba(" + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ", " + this._roundA + ")";
	    },
	    toPercentageRgb: function() {
	        return { r: mathRound(bound01(this._r, 255) * 100) + "%", g: mathRound(bound01(this._g, 255) * 100) + "%", b: mathRound(bound01(this._b, 255) * 100) + "%", a: this._a };
	    },
	    toPercentageRgbString: function() {
	        return (this._a == 1) ?
	          "rgb("  + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%)" :
	          "rgba(" + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%, " + this._roundA + ")";
	    },
	    toName: function() {
	        if (this._a === 0) {
	            return "transparent";
	        }

	        if (this._a < 1) {
	            return false;
	        }

	        return hexNames[rgbToHex(this._r, this._g, this._b, true)] || false;
	    },
	    toFilter: function(secondColor) {
	        var hex8String = '#' + rgbaToArgbHex(this._r, this._g, this._b, this._a);
	        var secondHex8String = hex8String;
	        var gradientType = this._gradientType ? "GradientType = 1, " : "";

	        if (secondColor) {
	            var s = tinycolor(secondColor);
	            secondHex8String = '#' + rgbaToArgbHex(s._r, s._g, s._b, s._a);
	        }

	        return "progid:DXImageTransform.Microsoft.gradient("+gradientType+"startColorstr="+hex8String+",endColorstr="+secondHex8String+")";
	    },
	    toString: function(format) {
	        var formatSet = !!format;
	        format = format || this._format;

	        var formattedString = false;
	        var hasAlpha = this._a < 1 && this._a >= 0;
	        var needsAlphaFormat = !formatSet && hasAlpha && (format === "hex" || format === "hex6" || format === "hex3" || format === "hex4" || format === "hex8" || format === "name");

	        if (needsAlphaFormat) {
	            // Special case for "transparent", all other non-alpha formats
	            // will return rgba when there is transparency.
	            if (format === "name" && this._a === 0) {
	                return this.toName();
	            }
	            return this.toRgbString();
	        }
	        if (format === "rgb") {
	            formattedString = this.toRgbString();
	        }
	        if (format === "prgb") {
	            formattedString = this.toPercentageRgbString();
	        }
	        if (format === "hex" || format === "hex6") {
	            formattedString = this.toHexString();
	        }
	        if (format === "hex3") {
	            formattedString = this.toHexString(true);
	        }
	        if (format === "hex4") {
	            formattedString = this.toHex8String(true);
	        }
	        if (format === "hex8") {
	            formattedString = this.toHex8String();
	        }
	        if (format === "name") {
	            formattedString = this.toName();
	        }
	        if (format === "hsl") {
	            formattedString = this.toHslString();
	        }
	        if (format === "hsv") {
	            formattedString = this.toHsvString();
	        }

	        return formattedString || this.toHexString();
	    },
	    clone: function() {
	        return tinycolor(this.toString());
	    },

	    _applyModification: function(fn, args) {
	        var color = fn.apply(null, [this].concat([].slice.call(args)));
	        this._r = color._r;
	        this._g = color._g;
	        this._b = color._b;
	        this.setAlpha(color._a);
	        return this;
	    },
	    lighten: function() {
	        return this._applyModification(lighten, arguments);
	    },
	    brighten: function() {
	        return this._applyModification(brighten, arguments);
	    },
	    darken: function() {
	        return this._applyModification(darken, arguments);
	    },
	    desaturate: function() {
	        return this._applyModification(desaturate, arguments);
	    },
	    saturate: function() {
	        return this._applyModification(saturate, arguments);
	    },
	    greyscale: function() {
	        return this._applyModification(greyscale, arguments);
	    },
	    spin: function() {
	        return this._applyModification(spin, arguments);
	    },

	    _applyCombination: function(fn, args) {
	        return fn.apply(null, [this].concat([].slice.call(args)));
	    },
	    analogous: function() {
	        return this._applyCombination(analogous, arguments);
	    },
	    complement: function() {
	        return this._applyCombination(complement, arguments);
	    },
	    monochromatic: function() {
	        return this._applyCombination(monochromatic, arguments);
	    },
	    splitcomplement: function() {
	        return this._applyCombination(splitcomplement, arguments);
	    },
	    triad: function() {
	        return this._applyCombination(triad, arguments);
	    },
	    tetrad: function() {
	        return this._applyCombination(tetrad, arguments);
	    }
	};

	// If input is an object, force 1 into "1.0" to handle ratios properly
	// String input requires "1.0" as input, so 1 will be treated as 1
	tinycolor.fromRatio = function(color, opts) {
	    if (typeof color == "object") {
	        var newColor = {};
	        for (var i in color) {
	            if (color.hasOwnProperty(i)) {
	                if (i === "a") {
	                    newColor[i] = color[i];
	                }
	                else {
	                    newColor[i] = convertToPercentage(color[i]);
	                }
	            }
	        }
	        color = newColor;
	    }

	    return tinycolor(color, opts);
	};

	// Given a string or object, convert that input to RGB
	// Possible string inputs:
	//
	//     "red"
	//     "#f00" or "f00"
	//     "#ff0000" or "ff0000"
	//     "#ff000000" or "ff000000"
	//     "rgb 255 0 0" or "rgb (255, 0, 0)"
	//     "rgb 1.0 0 0" or "rgb (1, 0, 0)"
	//     "rgba (255, 0, 0, 1)" or "rgba 255, 0, 0, 1"
	//     "rgba (1.0, 0, 0, 1)" or "rgba 1.0, 0, 0, 1"
	//     "hsl(0, 100%, 50%)" or "hsl 0 100% 50%"
	//     "hsla(0, 100%, 50%, 1)" or "hsla 0 100% 50%, 1"
	//     "hsv(0, 100%, 100%)" or "hsv 0 100% 100%"
	//
	function inputToRGB(color) {

	    var rgb = { r: 0, g: 0, b: 0 };
	    var a = 1;
	    var s = null;
	    var v = null;
	    var l = null;
	    var ok = false;
	    var format = false;

	    if (typeof color == "string") {
	        color = stringInputToObject(color);
	    }

	    if (typeof color == "object") {
	        if (isValidCSSUnit(color.r) && isValidCSSUnit(color.g) && isValidCSSUnit(color.b)) {
	            rgb = rgbToRgb(color.r, color.g, color.b);
	            ok = true;
	            format = String(color.r).substr(-1) === "%" ? "prgb" : "rgb";
	        }
	        else if (isValidCSSUnit(color.h) && isValidCSSUnit(color.s) && isValidCSSUnit(color.v)) {
	            s = convertToPercentage(color.s);
	            v = convertToPercentage(color.v);
	            rgb = hsvToRgb(color.h, s, v);
	            ok = true;
	            format = "hsv";
	        }
	        else if (isValidCSSUnit(color.h) && isValidCSSUnit(color.s) && isValidCSSUnit(color.l)) {
	            s = convertToPercentage(color.s);
	            l = convertToPercentage(color.l);
	            rgb = hslToRgb(color.h, s, l);
	            ok = true;
	            format = "hsl";
	        }

	        if (color.hasOwnProperty("a")) {
	            a = color.a;
	        }
	    }

	    a = boundAlpha(a);

	    return {
	        ok: ok,
	        format: color.format || format,
	        r: mathMin(255, mathMax(rgb.r, 0)),
	        g: mathMin(255, mathMax(rgb.g, 0)),
	        b: mathMin(255, mathMax(rgb.b, 0)),
	        a: a
	    };
	}


	// Conversion Functions
	// --------------------

	// `rgbToHsl`, `rgbToHsv`, `hslToRgb`, `hsvToRgb` modified from:
	// <http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript>

	// `rgbToRgb`
	// Handle bounds / percentage checking to conform to CSS color spec
	// <http://www.w3.org/TR/css3-color/>
	// *Assumes:* r, g, b in [0, 255] or [0, 1]
	// *Returns:* { r, g, b } in [0, 255]
	function rgbToRgb(r, g, b){
	    return {
	        r: bound01(r, 255) * 255,
	        g: bound01(g, 255) * 255,
	        b: bound01(b, 255) * 255
	    };
	}

	// `rgbToHsl`
	// Converts an RGB color value to HSL.
	// *Assumes:* r, g, and b are contained in [0, 255] or [0, 1]
	// *Returns:* { h, s, l } in [0,1]
	function rgbToHsl(r, g, b) {

	    r = bound01(r, 255);
	    g = bound01(g, 255);
	    b = bound01(b, 255);

	    var max = mathMax(r, g, b), min = mathMin(r, g, b);
	    var h, s, l = (max + min) / 2;

	    if(max == min) {
	        h = s = 0; // achromatic
	    }
	    else {
	        var d = max - min;
	        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	        switch(max) {
	            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
	            case g: h = (b - r) / d + 2; break;
	            case b: h = (r - g) / d + 4; break;
	        }

	        h /= 6;
	    }

	    return { h: h, s: s, l: l };
	}

	// `hslToRgb`
	// Converts an HSL color value to RGB.
	// *Assumes:* h is contained in [0, 1] or [0, 360] and s and l are contained [0, 1] or [0, 100]
	// *Returns:* { r, g, b } in the set [0, 255]
	function hslToRgb(h, s, l) {
	    var r, g, b;

	    h = bound01(h, 360);
	    s = bound01(s, 100);
	    l = bound01(l, 100);

	    function hue2rgb(p, q, t) {
	        if(t < 0) t += 1;
	        if(t > 1) t -= 1;
	        if(t < 1/6) return p + (q - p) * 6 * t;
	        if(t < 1/2) return q;
	        if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
	        return p;
	    }

	    if(s === 0) {
	        r = g = b = l; // achromatic
	    }
	    else {
	        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	        var p = 2 * l - q;
	        r = hue2rgb(p, q, h + 1/3);
	        g = hue2rgb(p, q, h);
	        b = hue2rgb(p, q, h - 1/3);
	    }

	    return { r: r * 255, g: g * 255, b: b * 255 };
	}

	// `rgbToHsv`
	// Converts an RGB color value to HSV
	// *Assumes:* r, g, and b are contained in the set [0, 255] or [0, 1]
	// *Returns:* { h, s, v } in [0,1]
	function rgbToHsv(r, g, b) {

	    r = bound01(r, 255);
	    g = bound01(g, 255);
	    b = bound01(b, 255);

	    var max = mathMax(r, g, b), min = mathMin(r, g, b);
	    var h, s, v = max;

	    var d = max - min;
	    s = max === 0 ? 0 : d / max;

	    if(max == min) {
	        h = 0; // achromatic
	    }
	    else {
	        switch(max) {
	            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
	            case g: h = (b - r) / d + 2; break;
	            case b: h = (r - g) / d + 4; break;
	        }
	        h /= 6;
	    }
	    return { h: h, s: s, v: v };
	}

	// `hsvToRgb`
	// Converts an HSV color value to RGB.
	// *Assumes:* h is contained in [0, 1] or [0, 360] and s and v are contained in [0, 1] or [0, 100]
	// *Returns:* { r, g, b } in the set [0, 255]
	 function hsvToRgb(h, s, v) {

	    h = bound01(h, 360) * 6;
	    s = bound01(s, 100);
	    v = bound01(v, 100);

	    var i = Math.floor(h),
	        f = h - i,
	        p = v * (1 - s),
	        q = v * (1 - f * s),
	        t = v * (1 - (1 - f) * s),
	        mod = i % 6,
	        r = [v, q, p, p, t, v][mod],
	        g = [t, v, v, q, p, p][mod],
	        b = [p, p, t, v, v, q][mod];

	    return { r: r * 255, g: g * 255, b: b * 255 };
	}

	// `rgbToHex`
	// Converts an RGB color to hex
	// Assumes r, g, and b are contained in the set [0, 255]
	// Returns a 3 or 6 character hex
	function rgbToHex(r, g, b, allow3Char) {

	    var hex = [
	        pad2(mathRound(r).toString(16)),
	        pad2(mathRound(g).toString(16)),
	        pad2(mathRound(b).toString(16))
	    ];

	    // Return a 3 character hex if possible
	    if (allow3Char && hex[0].charAt(0) == hex[0].charAt(1) && hex[1].charAt(0) == hex[1].charAt(1) && hex[2].charAt(0) == hex[2].charAt(1)) {
	        return hex[0].charAt(0) + hex[1].charAt(0) + hex[2].charAt(0);
	    }

	    return hex.join("");
	}

	// `rgbaToHex`
	// Converts an RGBA color plus alpha transparency to hex
	// Assumes r, g, b are contained in the set [0, 255] and
	// a in [0, 1]. Returns a 4 or 8 character rgba hex
	function rgbaToHex(r, g, b, a, allow4Char) {

	    var hex = [
	        pad2(mathRound(r).toString(16)),
	        pad2(mathRound(g).toString(16)),
	        pad2(mathRound(b).toString(16)),
	        pad2(convertDecimalToHex(a))
	    ];

	    // Return a 4 character hex if possible
	    if (allow4Char && hex[0].charAt(0) == hex[0].charAt(1) && hex[1].charAt(0) == hex[1].charAt(1) && hex[2].charAt(0) == hex[2].charAt(1) && hex[3].charAt(0) == hex[3].charAt(1)) {
	        return hex[0].charAt(0) + hex[1].charAt(0) + hex[2].charAt(0) + hex[3].charAt(0);
	    }

	    return hex.join("");
	}

	// `rgbaToArgbHex`
	// Converts an RGBA color to an ARGB Hex8 string
	// Rarely used, but required for "toFilter()"
	function rgbaToArgbHex(r, g, b, a) {

	    var hex = [
	        pad2(convertDecimalToHex(a)),
	        pad2(mathRound(r).toString(16)),
	        pad2(mathRound(g).toString(16)),
	        pad2(mathRound(b).toString(16))
	    ];

	    return hex.join("");
	}

	// `equals`
	// Can be called with any tinycolor input
	tinycolor.equals = function (color1, color2) {
	    if (!color1 || !color2) { return false; }
	    return tinycolor(color1).toRgbString() == tinycolor(color2).toRgbString();
	};

	tinycolor.random = function() {
	    return tinycolor.fromRatio({
	        r: mathRandom(),
	        g: mathRandom(),
	        b: mathRandom()
	    });
	};


	// Modification Functions
	// ----------------------
	// Thanks to less.js for some of the basics here
	// <https://github.com/cloudhead/less.js/blob/master/lib/less/functions.js>

	function desaturate(color, amount) {
	    amount = (amount === 0) ? 0 : (amount || 10);
	    var hsl = tinycolor(color).toHsl();
	    hsl.s -= amount / 100;
	    hsl.s = clamp01(hsl.s);
	    return tinycolor(hsl);
	}

	function saturate(color, amount) {
	    amount = (amount === 0) ? 0 : (amount || 10);
	    var hsl = tinycolor(color).toHsl();
	    hsl.s += amount / 100;
	    hsl.s = clamp01(hsl.s);
	    return tinycolor(hsl);
	}

	function greyscale(color) {
	    return tinycolor(color).desaturate(100);
	}

	function lighten (color, amount) {
	    amount = (amount === 0) ? 0 : (amount || 10);
	    var hsl = tinycolor(color).toHsl();
	    hsl.l += amount / 100;
	    hsl.l = clamp01(hsl.l);
	    return tinycolor(hsl);
	}

	function brighten(color, amount) {
	    amount = (amount === 0) ? 0 : (amount || 10);
	    var rgb = tinycolor(color).toRgb();
	    rgb.r = mathMax(0, mathMin(255, rgb.r - mathRound(255 * - (amount / 100))));
	    rgb.g = mathMax(0, mathMin(255, rgb.g - mathRound(255 * - (amount / 100))));
	    rgb.b = mathMax(0, mathMin(255, rgb.b - mathRound(255 * - (amount / 100))));
	    return tinycolor(rgb);
	}

	function darken (color, amount) {
	    amount = (amount === 0) ? 0 : (amount || 10);
	    var hsl = tinycolor(color).toHsl();
	    hsl.l -= amount / 100;
	    hsl.l = clamp01(hsl.l);
	    return tinycolor(hsl);
	}

	// Spin takes a positive or negative amount within [-360, 360] indicating the change of hue.
	// Values outside of this range will be wrapped into this range.
	function spin(color, amount) {
	    var hsl = tinycolor(color).toHsl();
	    var hue = (hsl.h + amount) % 360;
	    hsl.h = hue < 0 ? 360 + hue : hue;
	    return tinycolor(hsl);
	}

	// Combination Functions
	// ---------------------
	// Thanks to jQuery xColor for some of the ideas behind these
	// <https://github.com/infusion/jQuery-xcolor/blob/master/jquery.xcolor.js>

	function complement(color) {
	    var hsl = tinycolor(color).toHsl();
	    hsl.h = (hsl.h + 180) % 360;
	    return tinycolor(hsl);
	}

	function triad(color) {
	    var hsl = tinycolor(color).toHsl();
	    var h = hsl.h;
	    return [
	        tinycolor(color),
	        tinycolor({ h: (h + 120) % 360, s: hsl.s, l: hsl.l }),
	        tinycolor({ h: (h + 240) % 360, s: hsl.s, l: hsl.l })
	    ];
	}

	function tetrad(color) {
	    var hsl = tinycolor(color).toHsl();
	    var h = hsl.h;
	    return [
	        tinycolor(color),
	        tinycolor({ h: (h + 90) % 360, s: hsl.s, l: hsl.l }),
	        tinycolor({ h: (h + 180) % 360, s: hsl.s, l: hsl.l }),
	        tinycolor({ h: (h + 270) % 360, s: hsl.s, l: hsl.l })
	    ];
	}

	function splitcomplement(color) {
	    var hsl = tinycolor(color).toHsl();
	    var h = hsl.h;
	    return [
	        tinycolor(color),
	        tinycolor({ h: (h + 72) % 360, s: hsl.s, l: hsl.l}),
	        tinycolor({ h: (h + 216) % 360, s: hsl.s, l: hsl.l})
	    ];
	}

	function analogous(color, results, slices) {
	    results = results || 6;
	    slices = slices || 30;

	    var hsl = tinycolor(color).toHsl();
	    var part = 360 / slices;
	    var ret = [tinycolor(color)];

	    for (hsl.h = ((hsl.h - (part * results >> 1)) + 720) % 360; --results; ) {
	        hsl.h = (hsl.h + part) % 360;
	        ret.push(tinycolor(hsl));
	    }
	    return ret;
	}

	function monochromatic(color, results) {
	    results = results || 6;
	    var hsv = tinycolor(color).toHsv();
	    var h = hsv.h, s = hsv.s, v = hsv.v;
	    var ret = [];
	    var modification = 1 / results;

	    while (results--) {
	        ret.push(tinycolor({ h: h, s: s, v: v}));
	        v = (v + modification) % 1;
	    }

	    return ret;
	}

	// Utility Functions
	// ---------------------

	tinycolor.mix = function(color1, color2, amount) {
	    amount = (amount === 0) ? 0 : (amount || 50);

	    var rgb1 = tinycolor(color1).toRgb();
	    var rgb2 = tinycolor(color2).toRgb();

	    var p = amount / 100;

	    var rgba = {
	        r: ((rgb2.r - rgb1.r) * p) + rgb1.r,
	        g: ((rgb2.g - rgb1.g) * p) + rgb1.g,
	        b: ((rgb2.b - rgb1.b) * p) + rgb1.b,
	        a: ((rgb2.a - rgb1.a) * p) + rgb1.a
	    };

	    return tinycolor(rgba);
	};


	// Readability Functions
	// ---------------------
	// <http://www.w3.org/TR/2008/REC-WCAG20-20081211/#contrast-ratiodef (WCAG Version 2)

	// `contrast`
	// Analyze the 2 colors and returns the color contrast defined by (WCAG Version 2)
	tinycolor.readability = function(color1, color2) {
	    var c1 = tinycolor(color1);
	    var c2 = tinycolor(color2);
	    return (Math.max(c1.getLuminance(),c2.getLuminance())+0.05) / (Math.min(c1.getLuminance(),c2.getLuminance())+0.05);
	};

	// `isReadable`
	// Ensure that foreground and background color combinations meet WCAG2 guidelines.
	// The third argument is an optional Object.
	//      the 'level' property states 'AA' or 'AAA' - if missing or invalid, it defaults to 'AA';
	//      the 'size' property states 'large' or 'small' - if missing or invalid, it defaults to 'small'.
	// If the entire object is absent, isReadable defaults to {level:"AA",size:"small"}.

	// *Example*
	//    tinycolor.isReadable("#000", "#111") => false
	//    tinycolor.isReadable("#000", "#111",{level:"AA",size:"large"}) => false
	tinycolor.isReadable = function(color1, color2, wcag2) {
	    var readability = tinycolor.readability(color1, color2);
	    var wcag2Parms, out;

	    out = false;

	    wcag2Parms = validateWCAG2Parms(wcag2);
	    switch (wcag2Parms.level + wcag2Parms.size) {
	        case "AAsmall":
	        case "AAAlarge":
	            out = readability >= 4.5;
	            break;
	        case "AAlarge":
	            out = readability >= 3;
	            break;
	        case "AAAsmall":
	            out = readability >= 7;
	            break;
	    }
	    return out;

	};

	// `mostReadable`
	// Given a base color and a list of possible foreground or background
	// colors for that base, returns the most readable color.
	// Optionally returns Black or White if the most readable color is unreadable.
	// *Example*
	//    tinycolor.mostReadable(tinycolor.mostReadable("#123", ["#124", "#125"],{includeFallbackColors:false}).toHexString(); // "#112255"
	//    tinycolor.mostReadable(tinycolor.mostReadable("#123", ["#124", "#125"],{includeFallbackColors:true}).toHexString();  // "#ffffff"
	//    tinycolor.mostReadable("#a8015a", ["#faf3f3"],{includeFallbackColors:true,level:"AAA",size:"large"}).toHexString(); // "#faf3f3"
	//    tinycolor.mostReadable("#a8015a", ["#faf3f3"],{includeFallbackColors:true,level:"AAA",size:"small"}).toHexString(); // "#ffffff"
	tinycolor.mostReadable = function(baseColor, colorList, args) {
	    var bestColor = null;
	    var bestScore = 0;
	    var readability;
	    var includeFallbackColors, level, size ;
	    args = args || {};
	    includeFallbackColors = args.includeFallbackColors ;
	    level = args.level;
	    size = args.size;

	    for (var i= 0; i < colorList.length ; i++) {
	        readability = tinycolor.readability(baseColor, colorList[i]);
	        if (readability > bestScore) {
	            bestScore = readability;
	            bestColor = tinycolor(colorList[i]);
	        }
	    }

	    if (tinycolor.isReadable(baseColor, bestColor, {"level":level,"size":size}) || !includeFallbackColors) {
	        return bestColor;
	    }
	    else {
	        args.includeFallbackColors=false;
	        return tinycolor.mostReadable(baseColor,["#fff", "#000"],args);
	    }
	};


	// Big List of Colors
	// ------------------
	// <http://www.w3.org/TR/css3-color/#svg-color>
	var names = tinycolor.names = {
	    aliceblue: "f0f8ff",
	    antiquewhite: "faebd7",
	    aqua: "0ff",
	    aquamarine: "7fffd4",
	    azure: "f0ffff",
	    beige: "f5f5dc",
	    bisque: "ffe4c4",
	    black: "000",
	    blanchedalmond: "ffebcd",
	    blue: "00f",
	    blueviolet: "8a2be2",
	    brown: "a52a2a",
	    burlywood: "deb887",
	    burntsienna: "ea7e5d",
	    cadetblue: "5f9ea0",
	    chartreuse: "7fff00",
	    chocolate: "d2691e",
	    coral: "ff7f50",
	    cornflowerblue: "6495ed",
	    cornsilk: "fff8dc",
	    crimson: "dc143c",
	    cyan: "0ff",
	    darkblue: "00008b",
	    darkcyan: "008b8b",
	    darkgoldenrod: "b8860b",
	    darkgray: "a9a9a9",
	    darkgreen: "006400",
	    darkgrey: "a9a9a9",
	    darkkhaki: "bdb76b",
	    darkmagenta: "8b008b",
	    darkolivegreen: "556b2f",
	    darkorange: "ff8c00",
	    darkorchid: "9932cc",
	    darkred: "8b0000",
	    darksalmon: "e9967a",
	    darkseagreen: "8fbc8f",
	    darkslateblue: "483d8b",
	    darkslategray: "2f4f4f",
	    darkslategrey: "2f4f4f",
	    darkturquoise: "00ced1",
	    darkviolet: "9400d3",
	    deeppink: "ff1493",
	    deepskyblue: "00bfff",
	    dimgray: "696969",
	    dimgrey: "696969",
	    dodgerblue: "1e90ff",
	    firebrick: "b22222",
	    floralwhite: "fffaf0",
	    forestgreen: "228b22",
	    fuchsia: "f0f",
	    gainsboro: "dcdcdc",
	    ghostwhite: "f8f8ff",
	    gold: "ffd700",
	    goldenrod: "daa520",
	    gray: "808080",
	    green: "008000",
	    greenyellow: "adff2f",
	    grey: "808080",
	    honeydew: "f0fff0",
	    hotpink: "ff69b4",
	    indianred: "cd5c5c",
	    indigo: "4b0082",
	    ivory: "fffff0",
	    khaki: "f0e68c",
	    lavender: "e6e6fa",
	    lavenderblush: "fff0f5",
	    lawngreen: "7cfc00",
	    lemonchiffon: "fffacd",
	    lightblue: "add8e6",
	    lightcoral: "f08080",
	    lightcyan: "e0ffff",
	    lightgoldenrodyellow: "fafad2",
	    lightgray: "d3d3d3",
	    lightgreen: "90ee90",
	    lightgrey: "d3d3d3",
	    lightpink: "ffb6c1",
	    lightsalmon: "ffa07a",
	    lightseagreen: "20b2aa",
	    lightskyblue: "87cefa",
	    lightslategray: "789",
	    lightslategrey: "789",
	    lightsteelblue: "b0c4de",
	    lightyellow: "ffffe0",
	    lime: "0f0",
	    limegreen: "32cd32",
	    linen: "faf0e6",
	    magenta: "f0f",
	    maroon: "800000",
	    mediumaquamarine: "66cdaa",
	    mediumblue: "0000cd",
	    mediumorchid: "ba55d3",
	    mediumpurple: "9370db",
	    mediumseagreen: "3cb371",
	    mediumslateblue: "7b68ee",
	    mediumspringgreen: "00fa9a",
	    mediumturquoise: "48d1cc",
	    mediumvioletred: "c71585",
	    midnightblue: "191970",
	    mintcream: "f5fffa",
	    mistyrose: "ffe4e1",
	    moccasin: "ffe4b5",
	    navajowhite: "ffdead",
	    navy: "000080",
	    oldlace: "fdf5e6",
	    olive: "808000",
	    olivedrab: "6b8e23",
	    orange: "ffa500",
	    orangered: "ff4500",
	    orchid: "da70d6",
	    palegoldenrod: "eee8aa",
	    palegreen: "98fb98",
	    paleturquoise: "afeeee",
	    palevioletred: "db7093",
	    papayawhip: "ffefd5",
	    peachpuff: "ffdab9",
	    peru: "cd853f",
	    pink: "ffc0cb",
	    plum: "dda0dd",
	    powderblue: "b0e0e6",
	    purple: "800080",
	    rebeccapurple: "663399",
	    red: "f00",
	    rosybrown: "bc8f8f",
	    royalblue: "4169e1",
	    saddlebrown: "8b4513",
	    salmon: "fa8072",
	    sandybrown: "f4a460",
	    seagreen: "2e8b57",
	    seashell: "fff5ee",
	    sienna: "a0522d",
	    silver: "c0c0c0",
	    skyblue: "87ceeb",
	    slateblue: "6a5acd",
	    slategray: "708090",
	    slategrey: "708090",
	    snow: "fffafa",
	    springgreen: "00ff7f",
	    steelblue: "4682b4",
	    tan: "d2b48c",
	    teal: "008080",
	    thistle: "d8bfd8",
	    tomato: "ff6347",
	    turquoise: "40e0d0",
	    violet: "ee82ee",
	    wheat: "f5deb3",
	    white: "fff",
	    whitesmoke: "f5f5f5",
	    yellow: "ff0",
	    yellowgreen: "9acd32"
	};

	// Make it easy to access colors via `hexNames[hex]`
	var hexNames = tinycolor.hexNames = flip(names);


	// Utilities
	// ---------

	// `{ 'name1': 'val1' }` becomes `{ 'val1': 'name1' }`
	function flip(o) {
	    var flipped = { };
	    for (var i in o) {
	        if (o.hasOwnProperty(i)) {
	            flipped[o[i]] = i;
	        }
	    }
	    return flipped;
	}

	// Return a valid alpha value [0,1] with all invalid values being set to 1
	function boundAlpha(a) {
	    a = parseFloat(a);

	    if (isNaN(a) || a < 0 || a > 1) {
	        a = 1;
	    }

	    return a;
	}

	// Take input from [0, n] and return it as [0, 1]
	function bound01(n, max) {
	    if (isOnePointZero(n)) { n = "100%"; }

	    var processPercent = isPercentage(n);
	    n = mathMin(max, mathMax(0, parseFloat(n)));

	    // Automatically convert percentage into number
	    if (processPercent) {
	        n = parseInt(n * max, 10) / 100;
	    }

	    // Handle floating point rounding errors
	    if ((Math.abs(n - max) < 0.000001)) {
	        return 1;
	    }

	    // Convert into [0, 1] range if it isn't already
	    return (n % max) / parseFloat(max);
	}

	// Force a number between 0 and 1
	function clamp01(val) {
	    return mathMin(1, mathMax(0, val));
	}

	// Parse a base-16 hex value into a base-10 integer
	function parseIntFromHex(val) {
	    return parseInt(val, 16);
	}

	// Need to handle 1.0 as 100%, since once it is a number, there is no difference between it and 1
	// <http://stackoverflow.com/questions/7422072/javascript-how-to-detect-number-as-a-decimal-including-1-0>
	function isOnePointZero(n) {
	    return typeof n == "string" && n.indexOf('.') != -1 && parseFloat(n) === 1;
	}

	// Check to see if string passed in is a percentage
	function isPercentage(n) {
	    return typeof n === "string" && n.indexOf('%') != -1;
	}

	// Force a hex value to have 2 characters
	function pad2(c) {
	    return c.length == 1 ? '0' + c : '' + c;
	}

	// Replace a decimal with it's percentage value
	function convertToPercentage(n) {
	    if (n <= 1) {
	        n = (n * 100) + "%";
	    }

	    return n;
	}

	// Converts a decimal to a hex value
	function convertDecimalToHex(d) {
	    return Math.round(parseFloat(d) * 255).toString(16);
	}
	// Converts a hex value to a decimal
	function convertHexToDecimal(h) {
	    return (parseIntFromHex(h) / 255);
	}

	var matchers = (function() {

	    // <http://www.w3.org/TR/css3-values/#integers>
	    var CSS_INTEGER = "[-\\+]?\\d+%?";

	    // <http://www.w3.org/TR/css3-values/#number-value>
	    var CSS_NUMBER = "[-\\+]?\\d*\\.\\d+%?";

	    // Allow positive/negative integer/number.  Don't capture the either/or, just the entire outcome.
	    var CSS_UNIT = "(?:" + CSS_NUMBER + ")|(?:" + CSS_INTEGER + ")";

	    // Actual matching.
	    // Parentheses and commas are optional, but not required.
	    // Whitespace can take the place of commas or opening paren
	    var PERMISSIVE_MATCH3 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";
	    var PERMISSIVE_MATCH4 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";

	    return {
	        CSS_UNIT: new RegExp(CSS_UNIT),
	        rgb: new RegExp("rgb" + PERMISSIVE_MATCH3),
	        rgba: new RegExp("rgba" + PERMISSIVE_MATCH4),
	        hsl: new RegExp("hsl" + PERMISSIVE_MATCH3),
	        hsla: new RegExp("hsla" + PERMISSIVE_MATCH4),
	        hsv: new RegExp("hsv" + PERMISSIVE_MATCH3),
	        hsva: new RegExp("hsva" + PERMISSIVE_MATCH4),
	        hex3: /^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
	        hex6: /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,
	        hex4: /^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
	        hex8: /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/
	    };
	})();

	// `isValidCSSUnit`
	// Take in a single string / number and check to see if it looks like a CSS unit
	// (see `matchers` above for definition).
	function isValidCSSUnit(color) {
	    return !!matchers.CSS_UNIT.exec(color);
	}

	// `stringInputToObject`
	// Permissive string parsing.  Take in a number of formats, and output an object
	// based on detected format.  Returns `{ r, g, b }` or `{ h, s, l }` or `{ h, s, v}`
	function stringInputToObject(color) {

	    color = color.replace(trimLeft,'').replace(trimRight, '').toLowerCase();
	    var named = false;
	    if (names[color]) {
	        color = names[color];
	        named = true;
	    }
	    else if (color == 'transparent') {
	        return { r: 0, g: 0, b: 0, a: 0, format: "name" };
	    }

	    // Try to match string input using regular expressions.
	    // Keep most of the number bounding out of this function - don't worry about [0,1] or [0,100] or [0,360]
	    // Just return an object and let the conversion functions handle that.
	    // This way the result will be the same whether the tinycolor is initialized with string or object.
	    var match;
	    if ((match = matchers.rgb.exec(color))) {
	        return { r: match[1], g: match[2], b: match[3] };
	    }
	    if ((match = matchers.rgba.exec(color))) {
	        return { r: match[1], g: match[2], b: match[3], a: match[4] };
	    }
	    if ((match = matchers.hsl.exec(color))) {
	        return { h: match[1], s: match[2], l: match[3] };
	    }
	    if ((match = matchers.hsla.exec(color))) {
	        return { h: match[1], s: match[2], l: match[3], a: match[4] };
	    }
	    if ((match = matchers.hsv.exec(color))) {
	        return { h: match[1], s: match[2], v: match[3] };
	    }
	    if ((match = matchers.hsva.exec(color))) {
	        return { h: match[1], s: match[2], v: match[3], a: match[4] };
	    }
	    if ((match = matchers.hex8.exec(color))) {
	        return {
	            r: parseIntFromHex(match[1]),
	            g: parseIntFromHex(match[2]),
	            b: parseIntFromHex(match[3]),
	            a: convertHexToDecimal(match[4]),
	            format: named ? "name" : "hex8"
	        };
	    }
	    if ((match = matchers.hex6.exec(color))) {
	        return {
	            r: parseIntFromHex(match[1]),
	            g: parseIntFromHex(match[2]),
	            b: parseIntFromHex(match[3]),
	            format: named ? "name" : "hex"
	        };
	    }
	    if ((match = matchers.hex4.exec(color))) {
	        return {
	            r: parseIntFromHex(match[1] + '' + match[1]),
	            g: parseIntFromHex(match[2] + '' + match[2]),
	            b: parseIntFromHex(match[3] + '' + match[3]),
	            a: convertHexToDecimal(match[4] + '' + match[4]),
	            format: named ? "name" : "hex8"
	        };
	    }
	    if ((match = matchers.hex3.exec(color))) {
	        return {
	            r: parseIntFromHex(match[1] + '' + match[1]),
	            g: parseIntFromHex(match[2] + '' + match[2]),
	            b: parseIntFromHex(match[3] + '' + match[3]),
	            format: named ? "name" : "hex"
	        };
	    }

	    return false;
	}

	function validateWCAG2Parms(parms) {
	    // return valid WCAG2 parms for isReadable.
	    // If input parms are invalid, return {"level":"AA", "size":"small"}
	    var level, size;
	    parms = parms || {"level":"AA", "size":"small"};
	    level = (parms.level || "AA").toUpperCase();
	    size = (parms.size || "small").toLowerCase();
	    if (level !== "AA" && level !== "AAA") {
	        level = "AA";
	    }
	    if (size !== "small" && size !== "large") {
	        size = "small";
	    }
	    return {"level":level, "size":size};
	}

	// Node: Export function
	if (typeof module !== "undefined" && module.exports) {
	    module.exports = tinycolor;
	}
	// AMD/requirejs: Define the module
	else if (true) {
	    !(__WEBPACK_AMD_DEFINE_RESULT__ = function () {return tinycolor;}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}
	// Browser: Expose to window
	else {
	    window.tinycolor = tinycolor;
	}

	})(Math);


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

	var __vue_exports__, __vue_options__

	/* styles */
	__webpack_require__(10)

	/* script */
	__vue_exports__ = __webpack_require__(12)

	/* template */
	var __vue_template__ = __webpack_require__(13)
	__vue_options__ = __vue_exports__ = __vue_exports__ || {}
	if (
	  typeof __vue_exports__.default === "object" ||
	  typeof __vue_exports__.default === "function"
	) {
	if (Object.keys(__vue_exports__).some(function (key) { return key !== "default" && key !== "__esModule" })) {console.error("named exports are not supported in *.vue files.")}
	__vue_options__ = __vue_exports__ = __vue_exports__.default
	}
	if (typeof __vue_options__ === "function") {
	  __vue_options__ = __vue_options__.options
	}
	__vue_options__.render = __vue_template__.render
	__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

	/* hot reload */
	if (false) {(function () {
	  var hotAPI = require("vue-loader/node_modules/vue-hot-reload-api")
	  hotAPI.install(require("vue"), false)
	  if (!hotAPI.compatible) return
	  module.hot.accept()
	  if (!module.hot.data) {
	    hotAPI.createRecord("data-v-10", __vue_options__)
	  } else {
	    hotAPI.reload("data-v-10", __vue_options__)
	  }
	})()}
	if (__vue_options__.functional) {console.error("[vue-loader] EditableInput.vue: functional components are not supported and should be defined in plain js files using render functions.")}

	module.exports = __vue_exports__


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(11);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(5)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../../../node_modules/css-loader/index.js!../../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-10!../../../node_modules/stylus-loader/index.js!../../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./EditableInput.vue", function() {
				var newContent = require("!!../../../node_modules/css-loader/index.js!../../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-10!../../../node_modules/stylus-loader/index.js!../../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./EditableInput.vue");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(4)();
	// imports


	// module
	exports.push([module.id, "\n.vue-color__editable-input {\n  position: relative;\n}\n.vue-color__editable-input__input {\n  padding: 0;\n  border: 0;\n  outline: none;\n}\n.vue-color__editable-input__label {\n  text-transform: capitalize;\n}\n", ""]);

	// exports


/***/ }),
/* 12 */
/***/ (function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = {
	  name: 'editableInput',
	  props: {
	    label: String,
	    value: [String, Number],
	    max: Number,
	    arrowOffset: {
	      type: Number,
	      default: 1
	    }
	  },
	  computed: {
	    val: function val() {
	      return this.value;
	    }
	  },
	  filters: {
	    maxFilter: {
	      read: function read(val) {
	        if (this.max && val > this.max) {
	          return this.max;
	        } else {
	          return val;
	        }
	      },
	      write: function write(val, oldVal) {
	        return val;
	      }
	    }
	  },
	  methods: {
	    update: function update(e) {
	      this.handleChange(e.target.value);
	    },
	    handleChange: function handleChange(newVal) {
	      var data = {};
	      data[this.label] = newVal;
	      this.$emit('on-change', data);
	    },
	    handleBlur: function handleBlur(e) {
	      console.log(e);
	    },
	    handleKeyDown: function handleKeyDown(e) {
	      var val = this.val;
	      var number = Number(val);

	      if (number) {
	        var amount = this.arrowOffset || 1;

	        if (e.keyCode === 38) {
	          val = number + amount;
	          this.handleChange(val);
	          e.preventDefault();
	        }

	        if (e.keyCode === 40) {
	          val = number - amount;
	          this.handleChange(val);
	          e.preventDefault();
	        }
	      }
	    },
	    handleDrag: function handleDrag(e) {
	      console.log(e);
	    },
	    handleMouseDown: function handleMouseDown(e) {
	      console.log(e);
	    }
	  }
	};

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
	  return _c('div', {
	    staticClass: "vue-color__editable-input"
	  }, [_c('input', {
	    directives: [{
	      name: "model",
	      rawName: "v-model",
	      value: (_vm.val),
	      expression: "val"
	    }],
	    staticClass: "vue-color__editable-input__input",
	    domProps: {
	      "value": (_vm.val)
	    },
	    on: {
	      "keydown": _vm.handleKeyDown,
	      "input": [function($event) {
	        if ($event.target.composing) { return; }
	        _vm.val = $event.target.value
	      }, _vm.update]
	    }
	  }), _vm._v(" "), _c('span', {
	    staticClass: "vue-color__editable-input__label"
	  }, [_vm._v(_vm._s(_vm.label))])])
	},staticRenderFns: []}
	if (false) {
	  module.hot.accept()
	  if (module.hot.data) {
	     require("vue-loader/node_modules/vue-hot-reload-api").rerender("data-v-10", module.exports)
	  }
	}

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
	  return _c('div', {
	    staticClass: "vue-color__compact"
	  }, [_c('ul', {
	    staticClass: "vue-color__compact__colors"
	  }, _vm._l((_vm.defaultColors), function(c) {
	    return _c('li', {
	      staticClass: "vue-color__compact__color-item",
	      class: {
	        'vue-color__compact__color-item--white': c === '#FFFFFF'
	      },
	      style: ({
	        background: c
	      }),
	      on: {
	        "click": function($event) {
	          _vm.handlerClick(c)
	        }
	      }
	    }, [_c('div', {
	      directives: [{
	        name: "show",
	        rawName: "v-show",
	        value: (c === _vm.pick),
	        expression: "c === pick"
	      }],
	      staticClass: "vue-color__compact__dot"
	    })])
	  }))])
	},staticRenderFns: []}
	if (false) {
	  module.hot.accept()
	  if (module.hot.data) {
	     require("vue-loader/node_modules/vue-hot-reload-api").rerender("data-v-1", module.exports)
	  }
	}

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

	var __vue_exports__, __vue_options__

	/* styles */
	__webpack_require__(16)

	/* script */
	__vue_exports__ = __webpack_require__(18)

	/* template */
	var __vue_template__ = __webpack_require__(19)
	__vue_options__ = __vue_exports__ = __vue_exports__ || {}
	if (
	  typeof __vue_exports__.default === "object" ||
	  typeof __vue_exports__.default === "function"
	) {
	if (Object.keys(__vue_exports__).some(function (key) { return key !== "default" && key !== "__esModule" })) {console.error("named exports are not supported in *.vue files.")}
	__vue_options__ = __vue_exports__ = __vue_exports__.default
	}
	if (typeof __vue_options__ === "function") {
	  __vue_options__ = __vue_options__.options
	}
	__vue_options__.render = __vue_template__.render
	__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

	/* hot reload */
	if (false) {(function () {
	  var hotAPI = require("vue-loader/node_modules/vue-hot-reload-api")
	  hotAPI.install(require("vue"), false)
	  if (!hotAPI.compatible) return
	  module.hot.accept()
	  if (!module.hot.data) {
	    hotAPI.createRecord("data-v-2", __vue_options__)
	  } else {
	    hotAPI.reload("data-v-2", __vue_options__)
	  }
	})()}
	if (__vue_options__.functional) {console.error("[vue-loader] Material.vue: functional components are not supported and should be defined in plain js files using render functions.")}

	module.exports = __vue_exports__


/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(17);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(5)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../../node_modules/css-loader/index.js!../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-2!../../node_modules/stylus-loader/index.js!../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Material.vue", function() {
				var newContent = require("!!../../node_modules/css-loader/index.js!../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-2!../../node_modules/stylus-loader/index.js!../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Material.vue");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(4)();
	// imports


	// module
	exports.push([module.id, "\n.vue-color__material {\n  width: 98px;\n  height: 98px;\n  padding: 16px;\n  font-family: \"Roboto\";\n  position: relative;\n  border-radius: 2px;\n  box-shadow: 0 2px 10px rgba(0,0,0,0.12), 0 2px 5px rgba(0,0,0,0.16);\n  background-color: #fff;\n}\n.vue-color__material .vue-color__editable-input__input {\n  width: 100%;\n  margin-top: 12px;\n  font-size: 15px;\n  color: #333;\n  height: 30px;\n}\n.vue-color__material .vue-color__editable-input__label {\n  position: absolute;\n  top: 0;\n  left: 0;\n  font-size: 11px;\n  color: #999;\n  text-transform: capitalize;\n}\n.vue-color__material__hex {\n  border-bottom-width: 2px;\n  border-bottom-style: solid;\n}\n.vue-color__material__split {\n  display: flex;\n  margin-right: -10px;\n  padding-top: 11px;\n}\n.vue-color__material__third {\n  flex: 1;\n  padding-right: 10px;\n}\n", ""]);

	// exports


/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _EditableInput = __webpack_require__(9);

	var _EditableInput2 = _interopRequireDefault(_EditableInput);

	var _color = __webpack_require__(7);

	var _color2 = _interopRequireDefault(_color);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	exports.default = {
	  name: 'Material',
	  mixins: [_color2.default],
	  components: {
	    'ed-in': _EditableInput2.default
	  },
	  methods: {
	    onChange: function onChange(data) {
	      if (!data) {
	        return;
	      }
	      if (data.hex) {
	        this.isValidHex(data.hex) && this.colorChange({
	          hex: data.hex,
	          source: 'hex'
	        });
	      } else if (data.r || data.g || data.b) {
	        this.colorChange({
	          r: data.r || this.colors.rgba.r,
	          g: data.g || this.colors.rgba.g,
	          b: data.b || this.colors.rgba.b,
	          a: data.a || this.colors.rgba.a,
	          source: 'rgba'
	        });
	      }
	    }
	  }
	};

/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
	  return _c('div', {
	    staticClass: "vue-color__material"
	  }, [_c('ed-in', {
	    staticClass: "vue-color__material__hex",
	    style: ({
	      borderColor: _vm.colors.hex
	    }),
	    attrs: {
	      "label": "hex"
	    },
	    on: {
	      "on-change": _vm.onChange
	    },
	    model: {
	      value: (_vm.colors.hex),
	      callback: function($$v) {
	        _vm.colors.hex = $$v
	      },
	      expression: "colors.hex"
	    }
	  }), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__material__split"
	  }, [_c('div', {
	    staticClass: "vue-color__material__third"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "r"
	    },
	    on: {
	      "on-change": _vm.onChange
	    },
	    model: {
	      value: (_vm.colors.rgba.r),
	      callback: function($$v) {
	        _vm.colors.rgba.r = $$v
	      },
	      expression: "colors.rgba.r"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__material__third"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "g"
	    },
	    on: {
	      "on-change": _vm.onChange
	    },
	    model: {
	      value: (_vm.colors.rgba.g),
	      callback: function($$v) {
	        _vm.colors.rgba.g = $$v
	      },
	      expression: "colors.rgba.g"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__material__third"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "b"
	    },
	    on: {
	      "on-change": _vm.onChange
	    },
	    model: {
	      value: (_vm.colors.rgba.b),
	      callback: function($$v) {
	        _vm.colors.rgba.b = $$v
	      },
	      expression: "colors.rgba.b"
	    }
	  })], 1)])], 1)
	},staticRenderFns: []}
	if (false) {
	  module.hot.accept()
	  if (module.hot.data) {
	     require("vue-loader/node_modules/vue-hot-reload-api").rerender("data-v-2", module.exports)
	  }
	}

/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

	var __vue_exports__, __vue_options__

	/* styles */
	__webpack_require__(21)

	/* script */
	__vue_exports__ = __webpack_require__(23)

	/* template */
	var __vue_template__ = __webpack_require__(29)
	__vue_options__ = __vue_exports__ = __vue_exports__ || {}
	if (
	  typeof __vue_exports__.default === "object" ||
	  typeof __vue_exports__.default === "function"
	) {
	if (Object.keys(__vue_exports__).some(function (key) { return key !== "default" && key !== "__esModule" })) {console.error("named exports are not supported in *.vue files.")}
	__vue_options__ = __vue_exports__ = __vue_exports__.default
	}
	if (typeof __vue_options__ === "function") {
	  __vue_options__ = __vue_options__.options
	}
	__vue_options__.render = __vue_template__.render
	__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

	/* hot reload */
	if (false) {(function () {
	  var hotAPI = require("vue-loader/node_modules/vue-hot-reload-api")
	  hotAPI.install(require("vue"), false)
	  if (!hotAPI.compatible) return
	  module.hot.accept()
	  if (!module.hot.data) {
	    hotAPI.createRecord("data-v-3", __vue_options__)
	  } else {
	    hotAPI.reload("data-v-3", __vue_options__)
	  }
	})()}
	if (__vue_options__.functional) {console.error("[vue-loader] Slider.vue: functional components are not supported and should be defined in plain js files using render functions.")}

	module.exports = __vue_exports__


/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(22);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(5)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../../node_modules/css-loader/index.js!../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-3!../../node_modules/stylus-loader/index.js!../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Slider.vue", function() {
				var newContent = require("!!../../node_modules/css-loader/index.js!../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-3!../../node_modules/stylus-loader/index.js!../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Slider.vue");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(4)();
	// imports


	// module
	exports.push([module.id, "\n.vue-color__slider {\n  position: relative;\n  width: 410px;\n}\n.vue-color__slider__hue-warp {\n  height: 12px;\n  position: relative;\n}\n.vue-color__slider__hue-warp .vue-color__c-hue__picker {\n  width: 14px;\n  height: 14px;\n  border-radius: 6px;\n  transform: translate(-7px, -2px);\n  background-color: #f8f8f8;\n  box-shadow: 0 1px 4px 0 rgba(0,0,0,0.37);\n}\n.vue-color__slider__swatches {\n  display: flex;\n  margin-top: 20px;\n}\n.vue-color__slider__swatch {\n  margin-right: 1px;\n  flex: 1;\n  width: 20%;\n}\n.vue-color__slider__swatch:first-child {\n  margin-right: 1px;\n}\n.vue-color__slider__swatch:first-child .vue-color__slider__swatch-picker {\n  border-radius: 2px 0px 0px 2px;\n}\n.vue-color__slider__swatch:last-child {\n  margin-right: 0;\n}\n.vue-color__slider__swatch:last-child .vue-color__slider__swatch-picker {\n  border-radius: 0px 2px 2px 0px;\n}\n.vue-color__slider__swatch-picker {\n  cursor: pointer;\n  height: 12px;\n}\n.vue-color__slider__swatch-picker--active {\n  transform: scaleY(1.8);\n  border-radius: 3.6px/2px;\n}\n", ""]);

	// exports


/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _color = __webpack_require__(7);

	var _color2 = _interopRequireDefault(_color);

	var _Hue = __webpack_require__(24);

	var _Hue2 = _interopRequireDefault(_Hue);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	exports.default = {
	  name: 'Slider',
	  mixins: [_color2.default],
	  props: {
	    direction: String
	  },
	  components: {
	    hue: _Hue2.default
	  },
	  computed: {
	    activeOffset: function activeOffset() {
	      if (Math.round(this.colors.hsl.s * 100) / 100 === 0.50) {
	        return Math.round(this.colors.hsl.l * 100) / 100;
	      }
	      return 0;
	    }
	  },
	  data: function data() {
	    return {
	      swatches: ['.80', '.65', '.50', '.35', '.20']
	    };
	  },

	  methods: {
	    hueChange: function hueChange(data) {
	      this.colorChange(data);
	    },
	    handleSwClick: function handleSwClick(index, offset) {
	      this.colorChange({
	        h: this.colors.hsl.h,
	        s: 0.5,
	        l: offset,
	        source: 'hsl'
	      });
	    }
	  }
	};

/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

	var __vue_exports__, __vue_options__

	/* styles */
	__webpack_require__(25)

	/* script */
	__vue_exports__ = __webpack_require__(27)

	/* template */
	var __vue_template__ = __webpack_require__(28)
	__vue_options__ = __vue_exports__ = __vue_exports__ || {}
	if (
	  typeof __vue_exports__.default === "object" ||
	  typeof __vue_exports__.default === "function"
	) {
	if (Object.keys(__vue_exports__).some(function (key) { return key !== "default" && key !== "__esModule" })) {console.error("named exports are not supported in *.vue files.")}
	__vue_options__ = __vue_exports__ = __vue_exports__.default
	}
	if (typeof __vue_options__ === "function") {
	  __vue_options__ = __vue_options__.options
	}
	__vue_options__.render = __vue_template__.render
	__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

	/* hot reload */
	if (false) {(function () {
	  var hotAPI = require("vue-loader/node_modules/vue-hot-reload-api")
	  hotAPI.install(require("vue"), false)
	  if (!hotAPI.compatible) return
	  module.hot.accept()
	  if (!module.hot.data) {
	    hotAPI.createRecord("data-v-11", __vue_options__)
	  } else {
	    hotAPI.reload("data-v-11", __vue_options__)
	  }
	})()}
	if (__vue_options__.functional) {console.error("[vue-loader] Hue.vue: functional components are not supported and should be defined in plain js files using render functions.")}

	module.exports = __vue_exports__


/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(26);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(5)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../../../node_modules/css-loader/index.js!../../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-11!../../../node_modules/stylus-loader/index.js!../../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Hue.vue", function() {
				var newContent = require("!!../../../node_modules/css-loader/index.js!../../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-11!../../../node_modules/stylus-loader/index.js!../../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Hue.vue");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(4)();
	// imports


	// module
	exports.push([module.id, "\n.vue-color__c-hue {\n  position: absolute;\n  top: 0px;\n  right: 0px;\n  bottom: 0px;\n  left: 0px;\n  border-radius: 2px;\n}\n.vue-color__c-hue--horizontal {\n  background: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);\n}\n.vue-color__c-hue--vertical {\n  background: linear-gradient(to top, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);\n}\n.vue-color__c-hue__container {\n  cursor: pointer;\n  margin: 0 2px;\n  position: relative;\n  height: 100%;\n}\n.vue-color__c-hue__pointer {\n  z-index: 2;\n  position: absolute;\n}\n.vue-color__c-hue__picker {\n  cursor: pointer;\n  margin-top: 1px;\n  width: 4px;\n  border-radius: 1px;\n  height: 8px;\n  box-shadow: 0 0 2px rgba(0,0,0,0.6);\n  background: #fff;\n  transform: translateX(-2px);\n}\n", ""]);

	// exports


/***/ }),
/* 27 */
/***/ (function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = {
	  name: 'Hue',
	  props: {
	    value: Object,
	    direction: {
	      type: String,

	      default: 'horizontal'
	    }
	  },
	  computed: {
	    colors: function colors() {
	      return this.value;
	    },
	    directionClass: function directionClass() {
	      return {
	        'vue-color__c-hue--horizontal': this.direction === 'horizontal',
	        'vue-color__c-hue--vertical': this.direction === 'vertical'
	      };
	    },
	    pointerTop: function pointerTop() {
	      if (this.direction === 'vertical') {
	        return -(this.colors.hsl.h * 100 / 360) + 100 + '%';
	      } else {
	        return 0;
	      }
	    },
	    pointerLeft: function pointerLeft() {
	      if (this.direction === 'vertical') {
	        return 0;
	      } else {
	        return this.colors.hsl.h * 100 / 360 + '%';
	      }
	    }
	  },
	  methods: {
	    handleChange: function handleChange(e, skip) {
	      !skip && e.preventDefault();

	      var container = this.$refs.container;
	      var containerWidth = container.clientWidth;
	      var containerHeight = container.clientHeight;

	      var xOffset = container.getBoundingClientRect().left + window.pageXOffset;
	      var yOffset = container.getBoundingClientRect().top + window.pageYOffset;
	      var pageX = e.pageX || (e.touches ? e.touches[0].pageX : 0);
	      var pageY = e.pageY || (e.touches ? e.touches[0].pageY : 0);
	      var left = pageX - xOffset;
	      var top = pageY - yOffset;

	      var h;
	      var percent;

	      if (this.direction === 'vertical') {
	        if (top < 0) {
	          h = 359;
	        } else if (top > containerHeight) {
	          h = 0;
	        } else {
	          percent = -(top * 100 / containerHeight) + 100;
	          h = 360 * percent / 100;
	        }

	        if (this.colors.hsl.h !== h) {
	          this.$emit('on-change', {
	            h: h,
	            s: this.colors.hsl.s,
	            l: this.colors.hsl.l,
	            a: this.colors.hsl.a,
	            source: 'hsl'
	          });
	        }
	      } else {
	        if (left < 0) {
	          h = 0;
	        } else if (left > containerWidth) {
	          h = 359;
	        } else {
	          percent = left * 100 / containerWidth;
	          h = 360 * percent / 100;
	        }

	        if (this.colors.hsl.h !== h) {
	          this.$emit('on-change', {
	            h: h,
	            s: this.colors.hsl.s,
	            l: this.colors.hsl.l,
	            a: this.colors.hsl.a,
	            source: 'hsl'
	          });
	        }
	      }
	    },
	    handleMouseDown: function handleMouseDown(e) {
	      this.handleChange(e, true);
	      window.addEventListener('mousemove', this.handleChange);
	      window.addEventListener('mouseup', this.handleMouseUp);
	    },
	    handleMouseUp: function handleMouseUp(e) {
	      this.unbindEventListeners();
	    },
	    unbindEventListeners: function unbindEventListeners() {
	      window.removeEventListener('mousemove', this.handleChange);
	      window.removeEventListener('mouseup', this.handleMouseUp);
	    }
	  }
	};

/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
	  return _c('div', {
	    class: ['vue-color__c-hue', _vm.directionClass]
	  }, [_c('div', {
	    ref: "container",
	    staticClass: "vue-color__c-hue__container",
	    on: {
	      "mousedown": _vm.handleMouseDown,
	      "touchmove": _vm.handleChange,
	      "touchstart": _vm.handleChange
	    }
	  }, [_c('div', {
	    staticClass: "vue-color__c-hue__pointer",
	    style: ({
	      top: _vm.pointerTop,
	      left: _vm.pointerLeft
	    })
	  }, [_c('div', {
	    staticClass: "vue-color__c-hue__picker"
	  })])])])
	},staticRenderFns: []}
	if (false) {
	  module.hot.accept()
	  if (module.hot.data) {
	     require("vue-loader/node_modules/vue-hot-reload-api").rerender("data-v-11", module.exports)
	  }
	}

/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
	  return _c('div', {
	    staticClass: "vue-color__slider"
	  }, [_c('div', {
	    staticClass: "vue-color__slider__hue-warp"
	  }, [_c('hue', {
	    on: {
	      "on-change": _vm.hueChange
	    },
	    model: {
	      value: (_vm.colors),
	      callback: function($$v) {
	        _vm.colors = $$v
	      },
	      expression: "colors"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__slider__swatches"
	  }, _vm._l((_vm.swatches), function(offset, index) {
	    return _c('div', {
	      staticClass: "vue-color__slider__swatch",
	      attrs: {
	        "data-index": index
	      },
	      on: {
	        "click": function($event) {
	          _vm.handleSwClick(index, offset)
	        }
	      }
	    }, [_c('div', {
	      staticClass: "vue-color__slider__swatch-picker",
	      class: {
	        'vue-color__slider__swatch-picker--active': offset == _vm.activeOffset
	      },
	      style: ({
	        background: 'hsl(' + _vm.colors.hsl.h + ', 50%, ' + (offset * 100) + '%)'
	      })
	    })])
	  }))])
	},staticRenderFns: []}
	if (false) {
	  module.hot.accept()
	  if (module.hot.data) {
	     require("vue-loader/node_modules/vue-hot-reload-api").rerender("data-v-3", module.exports)
	  }
	}

/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

	var __vue_exports__, __vue_options__

	/* styles */
	__webpack_require__(31)

	/* script */
	__vue_exports__ = __webpack_require__(33)

	/* template */
	var __vue_template__ = __webpack_require__(35)
	__vue_options__ = __vue_exports__ = __vue_exports__ || {}
	if (
	  typeof __vue_exports__.default === "object" ||
	  typeof __vue_exports__.default === "function"
	) {
	if (Object.keys(__vue_exports__).some(function (key) { return key !== "default" && key !== "__esModule" })) {console.error("named exports are not supported in *.vue files.")}
	__vue_options__ = __vue_exports__ = __vue_exports__.default
	}
	if (typeof __vue_options__ === "function") {
	  __vue_options__ = __vue_options__.options
	}
	__vue_options__.render = __vue_template__.render
	__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

	/* hot reload */
	if (false) {(function () {
	  var hotAPI = require("vue-loader/node_modules/vue-hot-reload-api")
	  hotAPI.install(require("vue"), false)
	  if (!hotAPI.compatible) return
	  module.hot.accept()
	  if (!module.hot.data) {
	    hotAPI.createRecord("data-v-4", __vue_options__)
	  } else {
	    hotAPI.reload("data-v-4", __vue_options__)
	  }
	})()}
	if (__vue_options__.functional) {console.error("[vue-loader] Swatches.vue: functional components are not supported and should be defined in plain js files using render functions.")}

	module.exports = __vue_exports__


/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(32);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(5)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../../node_modules/css-loader/index.js!../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-4!../../node_modules/stylus-loader/index.js!../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Swatches.vue", function() {
				var newContent = require("!!../../node_modules/css-loader/index.js!../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-4!../../node_modules/stylus-loader/index.js!../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Swatches.vue");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(4)();
	// imports


	// module
	exports.push([module.id, "\n.vue-color__swatches {\n  width: 320px;\n  height: 240px;\n  overflow-y: scroll;\n  background-color: #fff;\n  box-shadow: 0 2px 10px rgba(0,0,0,0.12), 0 2px 5px rgba(0,0,0,0.16);\n}\n.vue-color__swatches__box {\n  padding: 16px 0 6px 16px;\n  overflow: hidden;\n}\n.vue-color__swatches__color-group {\n  padding-bottom: 10px;\n  width: 40px;\n  float: left;\n  margin-right: 10px;\n}\n.vue-color__swatches__color-it {\n  width: 40px;\n  height: 24px;\n  cursor: pointer;\n  background: #880e4f;\n  margin-bottom: 1px;\n  overflow: hidden;\n  -ms-border-radius: 2px 2px 0 0;\n  -moz-border-radius: 2px 2px 0 0;\n  -o-border-radius: 2px 2px 0 0;\n  -webkit-border-radius: 2px 2px 0 0;\n  border-radius: 2px 2px 0 0;\n}\n.vue-color__swatches__pick {\n  fill: #fff;\n  margin-left: 8px;\n  display: block;\n}\n", ""]);

	// exports


/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _materialColors = __webpack_require__(34);

	var _materialColors2 = _interopRequireDefault(_materialColors);

	var _color = __webpack_require__(7);

	var _color2 = _interopRequireDefault(_color);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var colorMap = ['red', 'pink', 'purple', 'deepPurple', 'indigo', 'blue', 'lightBlue', 'cyan', 'teal', 'green', 'lightGreen', 'lime', 'yellow', 'amber', 'orange', 'deepOrange', 'brown', 'blueGrey'];
	var colorLevel = ['900', '700', '500', '300', '100'];
	var defaultColors = function () {
	  var colors = [];
	  colorMap.forEach(function (type) {
	    var typeColor = [];
	    colorLevel.forEach(function (level) {
	      typeColor.push(_materialColors2.default[type][level].toUpperCase());
	    });
	    colors.push(typeColor);
	  });
	  return colors;
	}();

	exports.default = {
	  name: 'Swatches',
	  mixins: [_color2.default],
	  computed: {
	    pick: function pick() {
	      return this.colors.hex;
	    }
	  },
	  data: function data() {
	    return {
	      defaultColors: defaultColors
	    };
	  },

	  methods: {
	    handlerClick: function handlerClick(c) {
	      this.colorChange({
	        hex: c,
	        source: 'hex'
	      });
	    }
	  }

	};

/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function(root, factory) {
	  if (true) {
	    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	  } else if (typeof exports === 'object') {
	    module.exports = factory();
	  } else {
	    root.materialColors = factory();
	  }
	})(this, function() {
	  return {"red":{"50":"#ffebee","100":"#ffcdd2","200":"#ef9a9a","300":"#e57373","400":"#ef5350","500":"#f44336","600":"#e53935","700":"#d32f2f","800":"#c62828","900":"#b71c1c","a100":"#ff8a80","a200":"#ff5252","a400":"#ff1744","a700":"#d50000"},"pink":{"50":"#fce4ec","100":"#f8bbd0","200":"#f48fb1","300":"#f06292","400":"#ec407a","500":"#e91e63","600":"#d81b60","700":"#c2185b","800":"#ad1457","900":"#880e4f","a100":"#ff80ab","a200":"#ff4081","a400":"#f50057","a700":"#c51162"},"purple":{"50":"#f3e5f5","100":"#e1bee7","200":"#ce93d8","300":"#ba68c8","400":"#ab47bc","500":"#9c27b0","600":"#8e24aa","700":"#7b1fa2","800":"#6a1b9a","900":"#4a148c","a100":"#ea80fc","a200":"#e040fb","a400":"#d500f9","a700":"#aa00ff"},"deepPurple":{"50":"#ede7f6","100":"#d1c4e9","200":"#b39ddb","300":"#9575cd","400":"#7e57c2","500":"#673ab7","600":"#5e35b1","700":"#512da8","800":"#4527a0","900":"#311b92","a100":"#b388ff","a200":"#7c4dff","a400":"#651fff","a700":"#6200ea"},"indigo":{"50":"#e8eaf6","100":"#c5cae9","200":"#9fa8da","300":"#7986cb","400":"#5c6bc0","500":"#3f51b5","600":"#3949ab","700":"#303f9f","800":"#283593","900":"#1a237e","a100":"#8c9eff","a200":"#536dfe","a400":"#3d5afe","a700":"#304ffe"},"blue":{"50":"#e3f2fd","100":"#bbdefb","200":"#90caf9","300":"#64b5f6","400":"#42a5f5","500":"#2196f3","600":"#1e88e5","700":"#1976d2","800":"#1565c0","900":"#0d47a1","a100":"#82b1ff","a200":"#448aff","a400":"#2979ff","a700":"#2962ff"},"lightBlue":{"50":"#e1f5fe","100":"#b3e5fc","200":"#81d4fa","300":"#4fc3f7","400":"#29b6f6","500":"#03a9f4","600":"#039be5","700":"#0288d1","800":"#0277bd","900":"#01579b","a100":"#80d8ff","a200":"#40c4ff","a400":"#00b0ff","a700":"#0091ea"},"cyan":{"50":"#e0f7fa","100":"#b2ebf2","200":"#80deea","300":"#4dd0e1","400":"#26c6da","500":"#00bcd4","600":"#00acc1","700":"#0097a7","800":"#00838f","900":"#006064","a100":"#84ffff","a200":"#18ffff","a400":"#00e5ff","a700":"#00b8d4"},"teal":{"50":"#e0f2f1","100":"#b2dfdb","200":"#80cbc4","300":"#4db6ac","400":"#26a69a","500":"#009688","600":"#00897b","700":"#00796b","800":"#00695c","900":"#004d40","a100":"#a7ffeb","a200":"#64ffda","a400":"#1de9b6","a700":"#00bfa5"},"green":{"50":"#e8f5e9","100":"#c8e6c9","200":"#a5d6a7","300":"#81c784","400":"#66bb6a","500":"#4caf50","600":"#43a047","700":"#388e3c","800":"#2e7d32","900":"#1b5e20","a100":"#b9f6ca","a200":"#69f0ae","a400":"#00e676","a700":"#00c853"},"lightGreen":{"50":"#f1f8e9","100":"#dcedc8","200":"#c5e1a5","300":"#aed581","400":"#9ccc65","500":"#8bc34a","600":"#7cb342","700":"#689f38","800":"#558b2f","900":"#33691e","a100":"#ccff90","a200":"#b2ff59","a400":"#76ff03","a700":"#64dd17"},"lime":{"50":"#f9fbe7","100":"#f0f4c3","200":"#e6ee9c","300":"#dce775","400":"#d4e157","500":"#cddc39","600":"#c0ca33","700":"#afb42b","800":"#9e9d24","900":"#827717","a100":"#f4ff81","a200":"#eeff41","a400":"#c6ff00","a700":"#aeea00"},"yellow":{"50":"#fffde7","100":"#fff9c4","200":"#fff59d","300":"#fff176","400":"#ffee58","500":"#ffeb3b","600":"#fdd835","700":"#fbc02d","800":"#f9a825","900":"#f57f17","a100":"#ffff8d","a200":"#ffff00","a400":"#ffea00","a700":"#ffd600"},"amber":{"50":"#fff8e1","100":"#ffecb3","200":"#ffe082","300":"#ffd54f","400":"#ffca28","500":"#ffc107","600":"#ffb300","700":"#ffa000","800":"#ff8f00","900":"#ff6f00","a100":"#ffe57f","a200":"#ffd740","a400":"#ffc400","a700":"#ffab00"},"orange":{"50":"#fff3e0","100":"#ffe0b2","200":"#ffcc80","300":"#ffb74d","400":"#ffa726","500":"#ff9800","600":"#fb8c00","700":"#f57c00","800":"#ef6c00","900":"#e65100","a100":"#ffd180","a200":"#ffab40","a400":"#ff9100","a700":"#ff6d00"},"deepOrange":{"50":"#fbe9e7","100":"#ffccbc","200":"#ffab91","300":"#ff8a65","400":"#ff7043","500":"#ff5722","600":"#f4511e","700":"#e64a19","800":"#d84315","900":"#bf360c","a100":"#ff9e80","a200":"#ff6e40","a400":"#ff3d00","a700":"#dd2c00"},"brown":{"50":"#efebe9","100":"#d7ccc8","200":"#bcaaa4","300":"#a1887f","400":"#8d6e63","500":"#795548","600":"#6d4c41","700":"#5d4037","800":"#4e342e","900":"#3e2723"},"grey":{"50":"#fafafa","100":"#f5f5f5","200":"#eeeeee","300":"#e0e0e0","400":"#bdbdbd","500":"#9e9e9e","600":"#757575","700":"#616161","800":"#424242","900":"#212121"},"blueGrey":{"50":"#eceff1","100":"#cfd8dc","200":"#b0bec5","300":"#90a4ae","400":"#78909c","500":"#607d8b","600":"#546e7a","700":"#455a64","800":"#37474f","900":"#263238"},"darkText":{"primary":"rgba(0, 0, 0, 0.87)","secondary":"rgba(0, 0, 0, 0.54)","disabled":"rgba(0, 0, 0, 0.38)","dividers":"rgba(0, 0, 0, 0.12)"},"lightText":{"primary":"rgba(255, 255, 255, 1)","secondary":"rgba(255, 255, 255, 0.7)","disabled":"rgba(255, 255, 255, 0.5)","dividers":"rgba(255, 255, 255, 0.12)"},"darkIcons":{"active":"rgba(0, 0, 0, 0.54)","inactive":"rgba(0, 0, 0, 0.38)"},"lightIcons":{"active":"rgba(255, 255, 255, 1)","inactive":"rgba(255, 255, 255, 0.5)"},"white":"#ffffff","black":"#000000"};
	});


/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
	  return _c('div', {
	    staticClass: "vue-color__swatches",
	    attrs: {
	      "data-pick": _vm.pick
	    }
	  }, [_c('div', {
	    staticClass: "vue-color__swatches__box"
	  }, _vm._l((_vm.defaultColors), function(group) {
	    return _c('div', {
	      staticClass: "vue-color__swatches__color-group"
	    }, _vm._l((group), function(c) {
	      return _c('div', {
	        staticClass: "vue-color__swatches__color-it",
	        style: ({
	          background: c
	        }),
	        attrs: {
	          "data-color": c
	        },
	        on: {
	          "click": function($event) {
	            _vm.handlerClick(c)
	          }
	        }
	      }, [_c('div', {
	        directives: [{
	          name: "show",
	          rawName: "v-show",
	          value: (c == _vm.pick),
	          expression: "c == pick"
	        }],
	        staticClass: "vue-color__swatches__pick"
	      }, [_c('svg', {
	        staticStyle: {
	          "width": "24px",
	          "height": "24px"
	        },
	        attrs: {
	          "viewBox": "0 0 24 24"
	        }
	      }, [_c('path', {
	        attrs: {
	          "d": "M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"
	        }
	      })])])])
	    }))
	  }))])
	},staticRenderFns: []}
	if (false) {
	  module.hot.accept()
	  if (module.hot.data) {
	     require("vue-loader/node_modules/vue-hot-reload-api").rerender("data-v-4", module.exports)
	  }
	}

/***/ }),
/* 36 */
/***/ (function(module, exports, __webpack_require__) {

	var __vue_exports__, __vue_options__

	/* styles */
	__webpack_require__(37)

	/* script */
	__vue_exports__ = __webpack_require__(39)

	/* template */
	var __vue_template__ = __webpack_require__(56)
	__vue_options__ = __vue_exports__ = __vue_exports__ || {}
	if (
	  typeof __vue_exports__.default === "object" ||
	  typeof __vue_exports__.default === "function"
	) {
	if (Object.keys(__vue_exports__).some(function (key) { return key !== "default" && key !== "__esModule" })) {console.error("named exports are not supported in *.vue files.")}
	__vue_options__ = __vue_exports__ = __vue_exports__.default
	}
	if (typeof __vue_options__ === "function") {
	  __vue_options__ = __vue_options__.options
	}
	__vue_options__.render = __vue_template__.render
	__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

	/* hot reload */
	if (false) {(function () {
	  var hotAPI = require("vue-loader/node_modules/vue-hot-reload-api")
	  hotAPI.install(require("vue"), false)
	  if (!hotAPI.compatible) return
	  module.hot.accept()
	  if (!module.hot.data) {
	    hotAPI.createRecord("data-v-5", __vue_options__)
	  } else {
	    hotAPI.reload("data-v-5", __vue_options__)
	  }
	})()}
	if (__vue_options__.functional) {console.error("[vue-loader] Photoshop.vue: functional components are not supported and should be defined in plain js files using render functions.")}

	module.exports = __vue_exports__


/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(38);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(5)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../../node_modules/css-loader/index.js!../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-5!../../node_modules/stylus-loader/index.js!../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Photoshop.vue", function() {
				var newContent = require("!!../../node_modules/css-loader/index.js!../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-5!../../node_modules/stylus-loader/index.js!../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Photoshop.vue");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(4)();
	// imports


	// module
	exports.push([module.id, "\n.vue-color__photoshop {\n  background: #dcdcdc;\n  border-radius: 4px;\n  box-shadow: 0 0 0 1px rgba(0,0,0,0.25), 0 8px 16px rgba(0,0,0,0.15);\n  box-sizing: initial;\n  width: 513px;\n  font-family: Roboto;\n}\n.vue-color__photoshop__head {\n  background-image: linear-gradient(-180deg, #f0f0f0 0%, #d4d4d4 100%);\n  border-bottom: 1px solid #b1b1b1;\n  box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.2), inset 0 -1px 0 0 rgba(0,0,0,0.02);\n  height: 23px;\n  line-height: 24px;\n  border-radius: 4px 4px 0 0;\n  font-size: 13px;\n  color: #4d4d4d;\n  text-align: center;\n}\n.vue-color__photoshop__body {\n  padding: 15px;\n  display: flex;\n}\n.vue-color__photoshop__saturation-wrap {\n  width: 256px;\n  height: 256px;\n  position: relative;\n  border: 2px solid #b3b3b3;\n  border-bottom: 2px solid #f0f0f0;\n  overflow: hidden;\n}\n.vue-color__photoshop__saturation-wrap .vue-color__saturation--circle {\n  width: 12px;\n  height: 12px;\n}\n.vue-color__photoshop__hue-wrap {\n  position: relative;\n  height: 256px;\n  width: 19px;\n  margin-left: 10px;\n  border: 2px solid #b3b3b3;\n  border-bottom: 2px solid #f0f0f0;\n}\n.vue-color__photoshop__hue-pointer {\n  position: relative;\n}\n.vue-color__photoshop__hue-pointer--left,\n.vue-color__photoshop__hue-pointer--right {\n  position: absolute;\n  width: 0;\n  height: 0;\n  border-style: solid;\n  border-width: 5px 0 5px 8px;\n  border-color: transparent transparent transparent #555;\n}\n.vue-color__photoshop__hue-pointer--left:after,\n.vue-color__photoshop__hue-pointer--right:after {\n  content: \"\";\n  width: 0;\n  height: 0;\n  border-style: solid;\n  border-width: 4px 0 4px 6px;\n  border-color: transparent transparent transparent #fff;\n  position: absolute;\n  top: 1px;\n  left: 1px;\n  transform: translate(-8px, -5px);\n}\n.vue-color__photoshop__hue-pointer--left {\n  transform: translate(-13px, -4px);\n}\n.vue-color__photoshop__hue-pointer--right {\n  transform: translate(20px, -4px) rotate(180deg);\n}\n.vue-color__photoshop__controls {\n  width: 180px;\n  margin-left: 10px;\n  display: flex;\n}\n.vue-color__photoshop__actions {\n  margin-left: 20px;\n  flex: 1;\n}\n.vue-color__photoshop__ac-btn {\n  cursor: pointer;\n  background-image: linear-gradient(-180deg, #fff 0%, #e6e6e6 100%);\n  border: 1px solid #878787;\n  border-radius: 2px;\n  height: 20px;\n  box-shadow: 0 1px 0 0 #eaeaea;\n  font-size: 14px;\n  color: #000;\n  line-height: 20px;\n  text-align: center;\n  margin-bottom: 10px;\n}\n.vue-color__photoshop__previews {\n  width: 60px;\n}\n.vue-color__photoshop__previews__swatches {\n  border: 1px solid #b3b3b3;\n  border-bottom: 1px solid #f0f0f0;\n  margin-bottom: 2px;\n  margin-top: 1px;\n}\n.vue-color__photoshop__previews__pr-color {\n  height: 34px;\n  box-shadow: inset 1px 0 0 #000, inset -1px 0 0 #000, inset 0 1px 0 #000;\n}\n.vue-color__photoshop__previews__label {\n  font-size: 14px;\n  color: #000;\n  text-align: center;\n}\n.vue-color__photoshop__fields {\n  padding-top: 5px;\n  padding-bottom: 9px;\n  width: 80px;\n  position: relative;\n}\n.vue-color__photoshop__fields .vue-color__editable-input__input {\n  margin-left: 40%;\n  width: 40%;\n  height: 18px;\n  border: 1px solid #888;\n  box-shadow: inset 0 1px 1px rgba(0,0,0,0.1), 0 1px 0 0 #ececec;\n  margin-bottom: 5px;\n  font-size: 13px;\n  padding-left: 3px;\n  margin-right: 10px;\n}\n.vue-color__photoshop__fields .vue-color__editable-input__label {\n  top: 0;\n  left: 0;\n  width: 34px;\n  text-transform: uppercase;\n  font-size: 13px;\n  height: 18px;\n  line-height: 22px;\n  position: absolute;\n}\n.vue-color__photoshop__fields__divider {\n  height: 5px;\n}\n.vue-color__photoshop__fields__hex .vue-color__editable-input__input {\n  margin-left: 20%;\n  width: 80%;\n  height: 18px;\n  border: 1px solid #888;\n  box-shadow: inset 0 1px 1px rgba(0,0,0,0.1), 0 1px 0 0 #ececec;\n  margin-bottom: 6px;\n  font-size: 13px;\n  padding-left: 3px;\n}\n.vue-color__photoshop__fields__hex .vue-color__editable-input__label {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 14px;\n  text-transform: uppercase;\n  font-size: 13px;\n  height: 18px;\n  line-height: 22px;\n}\n", ""]);

	// exports


/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _color = __webpack_require__(7);

	var _color2 = _interopRequireDefault(_color);

	var _EditableInput = __webpack_require__(9);

	var _EditableInput2 = _interopRequireDefault(_EditableInput);

	var _Saturation = __webpack_require__(40);

	var _Saturation2 = _interopRequireDefault(_Saturation);

	var _Hue = __webpack_require__(24);

	var _Hue2 = _interopRequireDefault(_Hue);

	var _Alpha = __webpack_require__(46);

	var _Alpha2 = _interopRequireDefault(_Alpha);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	exports.default = {
	  name: 'Photoshop',
	  mixins: [_color2.default],
	  props: {
	    head: {
	      type: String,
	      default: 'Color Picker'
	    }
	  },
	  components: {
	    saturation: _Saturation2.default,
	    hue: _Hue2.default,
	    alpha: _Alpha2.default,
	    'ed-in': _EditableInput2.default
	  },
	  data: function data() {
	    return {
	      currentColor: '#FFF'
	    };
	  },
	  created: function created() {
	    this.currentColor = this.colors.hex;
	  },

	  methods: {
	    childChange: function childChange(data) {
	      this.colorChange(data);
	    },
	    inputChange: function inputChange(data) {
	      if (!data) {
	        return;
	      }
	      if (data['#']) {
	        this.isValidHex(data['#']) && this.colorChange({
	          hex: data['#'],
	          source: 'hex'
	        });
	      } else if (data.r || data.g || data.b || data.a) {
	        this.colorChange({
	          r: data.r || this.colors.rgba.r,
	          g: data.g || this.colors.rgba.g,
	          b: data.b || this.colors.rgba.b,
	          a: data.a || this.colors.rgba.a,
	          source: 'rgba'
	        });
	      }
	    },
	    handleAccept: function handleAccept() {
	      this.$emit('ok');
	    },
	    handleCancel: function handleCancel() {
	      this.$emit('cancel');
	    }
	  }

	};

/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

	var __vue_exports__, __vue_options__

	/* styles */
	__webpack_require__(41)

	/* script */
	__vue_exports__ = __webpack_require__(43)

	/* template */
	var __vue_template__ = __webpack_require__(45)
	__vue_options__ = __vue_exports__ = __vue_exports__ || {}
	if (
	  typeof __vue_exports__.default === "object" ||
	  typeof __vue_exports__.default === "function"
	) {
	if (Object.keys(__vue_exports__).some(function (key) { return key !== "default" && key !== "__esModule" })) {console.error("named exports are not supported in *.vue files.")}
	__vue_options__ = __vue_exports__ = __vue_exports__.default
	}
	if (typeof __vue_options__ === "function") {
	  __vue_options__ = __vue_options__.options
	}
	__vue_options__.render = __vue_template__.render
	__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

	/* hot reload */
	if (false) {(function () {
	  var hotAPI = require("vue-loader/node_modules/vue-hot-reload-api")
	  hotAPI.install(require("vue"), false)
	  if (!hotAPI.compatible) return
	  module.hot.accept()
	  if (!module.hot.data) {
	    hotAPI.createRecord("data-v-12", __vue_options__)
	  } else {
	    hotAPI.reload("data-v-12", __vue_options__)
	  }
	})()}
	if (__vue_options__.functional) {console.error("[vue-loader] Saturation.vue: functional components are not supported and should be defined in plain js files using render functions.")}

	module.exports = __vue_exports__


/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(42);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(5)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../../../node_modules/css-loader/index.js!../../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-12!../../../node_modules/stylus-loader/index.js!../../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Saturation.vue", function() {
				var newContent = require("!!../../../node_modules/css-loader/index.js!../../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-12!../../../node_modules/stylus-loader/index.js!../../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Saturation.vue");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(4)();
	// imports


	// module
	exports.push([module.id, "\n.vue-color__saturation,\n.vue-color__saturation--white,\n.vue-color__saturation--black {\n  cursor: pointer;\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n}\n.vue-color__saturation--white {\n  background: linear-gradient(to right, #fff, rgba(255,255,255,0));\n}\n.vue-color__saturation--black {\n  background: linear-gradient(to top, #000, rgba(0,0,0,0));\n}\n.vue-color__saturation--pointer {\n  cursor: pointer;\n  position: absolute;\n}\n.vue-color__saturation--circle {\n  cursor: head;\n  width: 4px;\n  height: 4px;\n  box-shadow: 0 0 0 1.5px #fff, inset 0 0 1px 1px rgba(0,0,0,0.3), 0 0 1px 2px rgba(0,0,0,0.4);\n  border-radius: 50%;\n  transform: translate(-2px, -2px);\n}\n", ""]);

	// exports


/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _lodash = __webpack_require__(44);

	var _lodash2 = _interopRequireDefault(_lodash);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	exports.default = {
	  name: 'Saturation',
	  props: {
	    value: Object
	  },
	  computed: {
	    colors: function colors() {
	      return this.value;
	    },
	    bgColor: function bgColor() {
	      return 'hsl(' + this.colors.hsl.h + ', 100%, 50%)';
	    },
	    pointerTop: function pointerTop() {
	      return -(this.colors.hsv.v * 100) + 100 + '%';
	    },
	    pointerLeft: function pointerLeft() {
	      return this.colors.hsv.s * 100 + '%';
	    }
	  },
	  methods: {
	    throttle: (0, _lodash2.default)(function (fn, data) {
	      fn(data);
	    }, 20, {
	      'leading': true,
	      'trailing': false
	    }),
	    handleChange: function handleChange(e, skip) {
	      !skip && e.preventDefault();
	      var container = this.$refs.container;
	      var containerWidth = container.clientWidth;
	      var containerHeight = container.clientHeight;

	      var xOffset = container.getBoundingClientRect().left + window.pageXOffset;
	      var yOffset = container.getBoundingClientRect().top + window.pageYOffset;
	      var pageX = e.pageX || (e.touches ? e.touches[0].pageX : 0);
	      var pageY = e.pageY || (e.touches ? e.touches[0].pageY : 0);
	      var left = pageX - xOffset;
	      var top = pageY - yOffset;

	      if (left < 0) {
	        left = 0;
	      } else if (left > containerWidth) {
	        left = containerWidth;
	      } else if (top < 0) {
	        top = 0;
	      } else if (top > containerHeight) {
	        top = containerHeight;
	      }

	      var saturation = left * 100 / containerWidth;
	      var bright = -(top * 100 / containerHeight) + 100;

	      this.throttle(this.onChange, {
	        h: this.colors.hsl.h,
	        s: saturation,
	        v: bright > 0 ? bright : 0.01,
	        a: this.colors.hsl.a,
	        source: 'hsva'
	      });
	    },
	    onChange: function onChange(param) {
	      this.$emit('on-change', param);
	    },
	    handleMouseDown: function handleMouseDown(e) {
	      window.addEventListener('mousemove', this.handleChange);
	      window.addEventListener('mouseup', this.handleChange);
	      window.addEventListener('mouseup', this.handleMouseUp);
	    },
	    handleMouseUp: function handleMouseUp(e) {
	      this.unbindEventListeners();
	    },
	    unbindEventListeners: function unbindEventListeners() {
	      window.removeEventListener('mousemove', this.handleChange);
	      window.removeEventListener('mouseup', this.handleChange);
	      window.removeEventListener('mouseup', this.handleMouseUp);
	    }
	  }
	};

/***/ }),
/* 44 */
/***/ (function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {/**
	 * lodash (Custom Build) <https://lodash.com/>
	 * Build: `lodash modularize exports="npm" -o ./`
	 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
	 * Released under MIT license <https://lodash.com/license>
	 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
	 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	 */

	/** Used as the `TypeError` message for "Functions" methods. */
	var FUNC_ERROR_TEXT = 'Expected a function';

	/** Used as references for various `Number` constants. */
	var NAN = 0 / 0;

	/** `Object#toString` result references. */
	var symbolTag = '[object Symbol]';

	/** Used to match leading and trailing whitespace. */
	var reTrim = /^\s+|\s+$/g;

	/** Used to detect bad signed hexadecimal string values. */
	var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

	/** Used to detect binary string values. */
	var reIsBinary = /^0b[01]+$/i;

	/** Used to detect octal string values. */
	var reIsOctal = /^0o[0-7]+$/i;

	/** Built-in method references without a dependency on `root`. */
	var freeParseInt = parseInt;

	/** Detect free variable `global` from Node.js. */
	var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

	/** Detect free variable `self`. */
	var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

	/** Used as a reference to the global object. */
	var root = freeGlobal || freeSelf || Function('return this')();

	/** Used for built-in method references. */
	var objectProto = Object.prototype;

	/**
	 * Used to resolve the
	 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	 * of values.
	 */
	var objectToString = objectProto.toString;

	/* Built-in method references for those with the same name as other `lodash` methods. */
	var nativeMax = Math.max,
	    nativeMin = Math.min;

	/**
	 * Gets the timestamp of the number of milliseconds that have elapsed since
	 * the Unix epoch (1 January 1970 00:00:00 UTC).
	 *
	 * @static
	 * @memberOf _
	 * @since 2.4.0
	 * @category Date
	 * @returns {number} Returns the timestamp.
	 * @example
	 *
	 * _.defer(function(stamp) {
	 *   console.log(_.now() - stamp);
	 * }, _.now());
	 * // => Logs the number of milliseconds it took for the deferred invocation.
	 */
	var now = function() {
	  return root.Date.now();
	};

	/**
	 * Creates a debounced function that delays invoking `func` until after `wait`
	 * milliseconds have elapsed since the last time the debounced function was
	 * invoked. The debounced function comes with a `cancel` method to cancel
	 * delayed `func` invocations and a `flush` method to immediately invoke them.
	 * Provide `options` to indicate whether `func` should be invoked on the
	 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
	 * with the last arguments provided to the debounced function. Subsequent
	 * calls to the debounced function return the result of the last `func`
	 * invocation.
	 *
	 * **Note:** If `leading` and `trailing` options are `true`, `func` is
	 * invoked on the trailing edge of the timeout only if the debounced function
	 * is invoked more than once during the `wait` timeout.
	 *
	 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
	 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
	 *
	 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
	 * for details over the differences between `_.debounce` and `_.throttle`.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Function
	 * @param {Function} func The function to debounce.
	 * @param {number} [wait=0] The number of milliseconds to delay.
	 * @param {Object} [options={}] The options object.
	 * @param {boolean} [options.leading=false]
	 *  Specify invoking on the leading edge of the timeout.
	 * @param {number} [options.maxWait]
	 *  The maximum time `func` is allowed to be delayed before it's invoked.
	 * @param {boolean} [options.trailing=true]
	 *  Specify invoking on the trailing edge of the timeout.
	 * @returns {Function} Returns the new debounced function.
	 * @example
	 *
	 * // Avoid costly calculations while the window size is in flux.
	 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
	 *
	 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
	 * jQuery(element).on('click', _.debounce(sendMail, 300, {
	 *   'leading': true,
	 *   'trailing': false
	 * }));
	 *
	 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
	 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
	 * var source = new EventSource('/stream');
	 * jQuery(source).on('message', debounced);
	 *
	 * // Cancel the trailing debounced invocation.
	 * jQuery(window).on('popstate', debounced.cancel);
	 */
	function debounce(func, wait, options) {
	  var lastArgs,
	      lastThis,
	      maxWait,
	      result,
	      timerId,
	      lastCallTime,
	      lastInvokeTime = 0,
	      leading = false,
	      maxing = false,
	      trailing = true;

	  if (typeof func != 'function') {
	    throw new TypeError(FUNC_ERROR_TEXT);
	  }
	  wait = toNumber(wait) || 0;
	  if (isObject(options)) {
	    leading = !!options.leading;
	    maxing = 'maxWait' in options;
	    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
	    trailing = 'trailing' in options ? !!options.trailing : trailing;
	  }

	  function invokeFunc(time) {
	    var args = lastArgs,
	        thisArg = lastThis;

	    lastArgs = lastThis = undefined;
	    lastInvokeTime = time;
	    result = func.apply(thisArg, args);
	    return result;
	  }

	  function leadingEdge(time) {
	    // Reset any `maxWait` timer.
	    lastInvokeTime = time;
	    // Start the timer for the trailing edge.
	    timerId = setTimeout(timerExpired, wait);
	    // Invoke the leading edge.
	    return leading ? invokeFunc(time) : result;
	  }

	  function remainingWait(time) {
	    var timeSinceLastCall = time - lastCallTime,
	        timeSinceLastInvoke = time - lastInvokeTime,
	        result = wait - timeSinceLastCall;

	    return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
	  }

	  function shouldInvoke(time) {
	    var timeSinceLastCall = time - lastCallTime,
	        timeSinceLastInvoke = time - lastInvokeTime;

	    // Either this is the first call, activity has stopped and we're at the
	    // trailing edge, the system time has gone backwards and we're treating
	    // it as the trailing edge, or we've hit the `maxWait` limit.
	    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
	      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
	  }

	  function timerExpired() {
	    var time = now();
	    if (shouldInvoke(time)) {
	      return trailingEdge(time);
	    }
	    // Restart the timer.
	    timerId = setTimeout(timerExpired, remainingWait(time));
	  }

	  function trailingEdge(time) {
	    timerId = undefined;

	    // Only invoke if we have `lastArgs` which means `func` has been
	    // debounced at least once.
	    if (trailing && lastArgs) {
	      return invokeFunc(time);
	    }
	    lastArgs = lastThis = undefined;
	    return result;
	  }

	  function cancel() {
	    if (timerId !== undefined) {
	      clearTimeout(timerId);
	    }
	    lastInvokeTime = 0;
	    lastArgs = lastCallTime = lastThis = timerId = undefined;
	  }

	  function flush() {
	    return timerId === undefined ? result : trailingEdge(now());
	  }

	  function debounced() {
	    var time = now(),
	        isInvoking = shouldInvoke(time);

	    lastArgs = arguments;
	    lastThis = this;
	    lastCallTime = time;

	    if (isInvoking) {
	      if (timerId === undefined) {
	        return leadingEdge(lastCallTime);
	      }
	      if (maxing) {
	        // Handle invocations in a tight loop.
	        timerId = setTimeout(timerExpired, wait);
	        return invokeFunc(lastCallTime);
	      }
	    }
	    if (timerId === undefined) {
	      timerId = setTimeout(timerExpired, wait);
	    }
	    return result;
	  }
	  debounced.cancel = cancel;
	  debounced.flush = flush;
	  return debounced;
	}

	/**
	 * Creates a throttled function that only invokes `func` at most once per
	 * every `wait` milliseconds. The throttled function comes with a `cancel`
	 * method to cancel delayed `func` invocations and a `flush` method to
	 * immediately invoke them. Provide `options` to indicate whether `func`
	 * should be invoked on the leading and/or trailing edge of the `wait`
	 * timeout. The `func` is invoked with the last arguments provided to the
	 * throttled function. Subsequent calls to the throttled function return the
	 * result of the last `func` invocation.
	 *
	 * **Note:** If `leading` and `trailing` options are `true`, `func` is
	 * invoked on the trailing edge of the timeout only if the throttled function
	 * is invoked more than once during the `wait` timeout.
	 *
	 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
	 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
	 *
	 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
	 * for details over the differences between `_.throttle` and `_.debounce`.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Function
	 * @param {Function} func The function to throttle.
	 * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
	 * @param {Object} [options={}] The options object.
	 * @param {boolean} [options.leading=true]
	 *  Specify invoking on the leading edge of the timeout.
	 * @param {boolean} [options.trailing=true]
	 *  Specify invoking on the trailing edge of the timeout.
	 * @returns {Function} Returns the new throttled function.
	 * @example
	 *
	 * // Avoid excessively updating the position while scrolling.
	 * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
	 *
	 * // Invoke `renewToken` when the click event is fired, but not more than once every 5 minutes.
	 * var throttled = _.throttle(renewToken, 300000, { 'trailing': false });
	 * jQuery(element).on('click', throttled);
	 *
	 * // Cancel the trailing throttled invocation.
	 * jQuery(window).on('popstate', throttled.cancel);
	 */
	function throttle(func, wait, options) {
	  var leading = true,
	      trailing = true;

	  if (typeof func != 'function') {
	    throw new TypeError(FUNC_ERROR_TEXT);
	  }
	  if (isObject(options)) {
	    leading = 'leading' in options ? !!options.leading : leading;
	    trailing = 'trailing' in options ? !!options.trailing : trailing;
	  }
	  return debounce(func, wait, {
	    'leading': leading,
	    'maxWait': wait,
	    'trailing': trailing
	  });
	}

	/**
	 * Checks if `value` is the
	 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
	 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
	 * @example
	 *
	 * _.isObject({});
	 * // => true
	 *
	 * _.isObject([1, 2, 3]);
	 * // => true
	 *
	 * _.isObject(_.noop);
	 * // => true
	 *
	 * _.isObject(null);
	 * // => false
	 */
	function isObject(value) {
	  var type = typeof value;
	  return !!value && (type == 'object' || type == 'function');
	}

	/**
	 * Checks if `value` is object-like. A value is object-like if it's not `null`
	 * and has a `typeof` result of "object".
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	 * @example
	 *
	 * _.isObjectLike({});
	 * // => true
	 *
	 * _.isObjectLike([1, 2, 3]);
	 * // => true
	 *
	 * _.isObjectLike(_.noop);
	 * // => false
	 *
	 * _.isObjectLike(null);
	 * // => false
	 */
	function isObjectLike(value) {
	  return !!value && typeof value == 'object';
	}

	/**
	 * Checks if `value` is classified as a `Symbol` primitive or object.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
	 * @example
	 *
	 * _.isSymbol(Symbol.iterator);
	 * // => true
	 *
	 * _.isSymbol('abc');
	 * // => false
	 */
	function isSymbol(value) {
	  return typeof value == 'symbol' ||
	    (isObjectLike(value) && objectToString.call(value) == symbolTag);
	}

	/**
	 * Converts `value` to a number.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to process.
	 * @returns {number} Returns the number.
	 * @example
	 *
	 * _.toNumber(3.2);
	 * // => 3.2
	 *
	 * _.toNumber(Number.MIN_VALUE);
	 * // => 5e-324
	 *
	 * _.toNumber(Infinity);
	 * // => Infinity
	 *
	 * _.toNumber('3.2');
	 * // => 3.2
	 */
	function toNumber(value) {
	  if (typeof value == 'number') {
	    return value;
	  }
	  if (isSymbol(value)) {
	    return NAN;
	  }
	  if (isObject(value)) {
	    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
	    value = isObject(other) ? (other + '') : other;
	  }
	  if (typeof value != 'string') {
	    return value === 0 ? value : +value;
	  }
	  value = value.replace(reTrim, '');
	  var isBinary = reIsBinary.test(value);
	  return (isBinary || reIsOctal.test(value))
	    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
	    : (reIsBadHex.test(value) ? NAN : +value);
	}

	module.exports = throttle;

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ }),
/* 45 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
	  return _c('div', {
	    ref: "container",
	    staticClass: "vue-color__saturation",
	    style: ({
	      background: _vm.bgColor
	    }),
	    on: {
	      "mousedown": _vm.handleMouseDown
	    }
	  }, [_c('div', {
	    staticClass: "vue-color__saturation--white"
	  }), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__saturation--black"
	  }), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__saturation--pointer",
	    style: ({
	      top: _vm.pointerTop,
	      left: _vm.pointerLeft
	    })
	  }, [_c('div', {
	    staticClass: "vue-color__saturation--circle"
	  })])])
	},staticRenderFns: []}
	if (false) {
	  module.hot.accept()
	  if (module.hot.data) {
	     require("vue-loader/node_modules/vue-hot-reload-api").rerender("data-v-12", module.exports)
	  }
	}

/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

	var __vue_exports__, __vue_options__

	/* styles */
	__webpack_require__(47)

	/* script */
	__vue_exports__ = __webpack_require__(49)

	/* template */
	var __vue_template__ = __webpack_require__(55)
	__vue_options__ = __vue_exports__ = __vue_exports__ || {}
	if (
	  typeof __vue_exports__.default === "object" ||
	  typeof __vue_exports__.default === "function"
	) {
	if (Object.keys(__vue_exports__).some(function (key) { return key !== "default" && key !== "__esModule" })) {console.error("named exports are not supported in *.vue files.")}
	__vue_options__ = __vue_exports__ = __vue_exports__.default
	}
	if (typeof __vue_options__ === "function") {
	  __vue_options__ = __vue_options__.options
	}
	__vue_options__.render = __vue_template__.render
	__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

	/* hot reload */
	if (false) {(function () {
	  var hotAPI = require("vue-loader/node_modules/vue-hot-reload-api")
	  hotAPI.install(require("vue"), false)
	  if (!hotAPI.compatible) return
	  module.hot.accept()
	  if (!module.hot.data) {
	    hotAPI.createRecord("data-v-8", __vue_options__)
	  } else {
	    hotAPI.reload("data-v-8", __vue_options__)
	  }
	})()}
	if (__vue_options__.functional) {console.error("[vue-loader] Alpha.vue: functional components are not supported and should be defined in plain js files using render functions.")}

	module.exports = __vue_exports__


/***/ }),
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(48);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(5)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../../../node_modules/css-loader/index.js!../../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-8!../../../node_modules/stylus-loader/index.js!../../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Alpha.vue", function() {
				var newContent = require("!!../../../node_modules/css-loader/index.js!../../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-8!../../../node_modules/stylus-loader/index.js!../../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Alpha.vue");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 48 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(4)();
	// imports


	// module
	exports.push([module.id, "\n.vue-color__c-alpha {\n  position: absolute;\n  top: 0px;\n  right: 0px;\n  bottom: 0px;\n  left: 0px;\n}\n.vue-color__c-alpha__checkboard-wrap {\n  position: absolute;\n  top: 0px;\n  right: 0px;\n  bottom: 0px;\n  left: 0px;\n  overflow: hidden;\n}\n.vue-color__c-alpha__gradient {\n  position: absolute;\n  top: 0px;\n  right: 0px;\n  bottom: 0px;\n  left: 0px;\n}\n.vue-color__c-alpha__container {\n  cursor: pointer;\n  position: relative;\n  z-index: 2;\n  height: 100%;\n  margin: 0 3px;\n}\n.vue-color__c-alpha__pointer {\n  z-index: 2;\n  position: absolute;\n}\n.vue-color__c-alpha__picker {\n  cursor: pointer;\n  width: 4px;\n  border-radius: 1px;\n  height: 8px;\n  box-shadow: 0 0 2px rgba(0,0,0,0.6);\n  background: #fff;\n  margin-top: 1px;\n  transform: translateX(-2px);\n}\n", ""]);

	// exports


/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _Checkboard = __webpack_require__(50);

	var _Checkboard2 = _interopRequireDefault(_Checkboard);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	exports.default = {
	  name: 'Alpha',
	  props: {
	    value: Object,
	    onChange: Function
	  },
	  components: {
	    checkboard: _Checkboard2.default
	  },
	  computed: {
	    colors: function colors() {
	      return this.value;
	    },
	    gradientColor: function gradientColor() {
	      var rgba = this.colors.rgba;
	      var rgbStr = [rgba.r, rgba.g, rgba.b].join(',');
	      return 'linear-gradient(to right, rgba(' + rgbStr + ', 0) 0%, rgba(' + rgbStr + ', 1) 100%)';
	    }
	  },
	  methods: {
	    handleChange: function handleChange(e, skip) {
	      !skip && e.preventDefault();
	      var container = this.$refs.container;
	      var containerWidth = container.clientWidth;

	      var xOffset = container.getBoundingClientRect().left + window.pageXOffset;
	      var pageX = e.pageX || (e.touches ? e.touches[0].pageX : 0);
	      var left = pageX - xOffset;

	      var a;
	      if (left < 0) {
	        a = 0;
	      } else if (left > containerWidth) {
	        a = 1;
	      } else {
	        a = Math.round(left * 100 / containerWidth) / 100;
	      }

	      if (this.colors.a !== a) {
	        this.$emit('on-change', {
	          h: this.colors.hsl.h,
	          s: this.colors.hsl.s,
	          l: this.colors.hsl.l,
	          a: a,
	          source: 'rgba'
	        });
	      }
	    },
	    handleMouseDown: function handleMouseDown(e) {
	      this.handleChange(e, true);
	      window.addEventListener('mousemove', this.handleChange);
	      window.addEventListener('mouseup', this.handleMouseUp);
	    },
	    handleMouseUp: function handleMouseUp() {
	      this.unbindEventListeners();
	    },
	    unbindEventListeners: function unbindEventListeners() {
	      window.removeEventListener('mousemove', this.handleChange);
	      window.removeEventListener('mouseup', this.handleMouseUp);
	    }
	  }
	};

/***/ }),
/* 50 */
/***/ (function(module, exports, __webpack_require__) {

	var __vue_exports__, __vue_options__

	/* styles */
	__webpack_require__(51)

	/* script */
	__vue_exports__ = __webpack_require__(53)

	/* template */
	var __vue_template__ = __webpack_require__(54)
	__vue_options__ = __vue_exports__ = __vue_exports__ || {}
	if (
	  typeof __vue_exports__.default === "object" ||
	  typeof __vue_exports__.default === "function"
	) {
	if (Object.keys(__vue_exports__).some(function (key) { return key !== "default" && key !== "__esModule" })) {console.error("named exports are not supported in *.vue files.")}
	__vue_options__ = __vue_exports__ = __vue_exports__.default
	}
	if (typeof __vue_options__ === "function") {
	  __vue_options__ = __vue_options__.options
	}
	__vue_options__.render = __vue_template__.render
	__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

	/* hot reload */
	if (false) {(function () {
	  var hotAPI = require("vue-loader/node_modules/vue-hot-reload-api")
	  hotAPI.install(require("vue"), false)
	  if (!hotAPI.compatible) return
	  module.hot.accept()
	  if (!module.hot.data) {
	    hotAPI.createRecord("data-v-9", __vue_options__)
	  } else {
	    hotAPI.reload("data-v-9", __vue_options__)
	  }
	})()}
	if (__vue_options__.functional) {console.error("[vue-loader] Checkboard.vue: functional components are not supported and should be defined in plain js files using render functions.")}

	module.exports = __vue_exports__


/***/ }),
/* 51 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(52);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(5)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../../../node_modules/css-loader/index.js!../../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-9!../../../node_modules/stylus-loader/index.js!../../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Checkboard.vue", function() {
				var newContent = require("!!../../../node_modules/css-loader/index.js!../../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-9!../../../node_modules/stylus-loader/index.js!../../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Checkboard.vue");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 52 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(4)();
	// imports


	// module
	exports.push([module.id, "\n.vue-color__c-checkerboard {\n  position: absolute;\n  top: 0px;\n  right: 0px;\n  bottom: 0px;\n  left: 0px;\n}\n", ""]);

	// exports


/***/ }),
/* 53 */
/***/ (function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});


	var _checkboardCache = {};

	exports.default = {
	  name: 'Checkboard',
	  props: {
	    size: {
	      type: [Number, String],
	      default: 8
	    },
	    white: {
	      type: String,
	      default: '#fff'
	    },
	    grey: {
	      type: String,
	      default: '#e6e6e6'
	    }
	  },
	  computed: {
	    bgStyle: function bgStyle() {
	      return 'url(' + getCheckboard(this.white, this.grey, this.size) + ') center left';
	    }
	  }
	};


	function renderCheckboard(c1, c2, size) {
	  if (typeof document === 'undefined') {
	    return null;
	  }
	  var canvas = document.createElement('canvas');
	  canvas.width = canvas.height = size * 2;
	  var ctx = canvas.getContext('2d');

	  if (!ctx) {
	    return null;
	  }
	  ctx.fillStyle = c1;
	  ctx.fillRect(0, 0, canvas.width, canvas.height);
	  ctx.fillStyle = c2;
	  ctx.fillRect(0, 0, size, size);
	  ctx.translate(size, size);
	  ctx.fillRect(0, 0, size, size);
	  return canvas.toDataURL();
	}

	function getCheckboard(c1, c2, size) {
	  var key = c1 + ',' + c2 + ',' + size;

	  if (_checkboardCache[key]) {
	    return _checkboardCache[key];
	  } else {
	    var checkboard = renderCheckboard(c1, c2, size);
	    _checkboardCache[key] = checkboard;
	    return checkboard;
	  }
	}

/***/ }),
/* 54 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
	  return _c('div', {
	    staticClass: "vue-color__c-checkerboard",
	    style: ({
	      background: _vm.bgStyle
	    })
	  })
	},staticRenderFns: []}
	if (false) {
	  module.hot.accept()
	  if (module.hot.data) {
	     require("vue-loader/node_modules/vue-hot-reload-api").rerender("data-v-9", module.exports)
	  }
	}

/***/ }),
/* 55 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
	  return _c('div', {
	    staticClass: "vue-color__c-alpha"
	  }, [_c('div', {
	    staticClass: "vue-color__c-alpha__checkboard-wrap"
	  }, [_c('checkboard')], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__c-alpha__gradient",
	    style: ({
	      background: _vm.gradientColor
	    })
	  }), _vm._v(" "), _c('div', {
	    ref: "container",
	    staticClass: "vue-color__c-alpha__container",
	    on: {
	      "mousedown": _vm.handleMouseDown,
	      "touchmove": _vm.handleChange,
	      "touchstart": _vm.handleChange
	    }
	  }, [_c('div', {
	    staticClass: "vue-color__c-alpha__pointer",
	    style: ({
	      left: _vm.colors.a * 100 + '%'
	    })
	  }, [_c('div', {
	    staticClass: "vue-color__c-alpha__picker"
	  })])])])
	},staticRenderFns: []}
	if (false) {
	  module.hot.accept()
	  if (module.hot.data) {
	     require("vue-loader/node_modules/vue-hot-reload-api").rerender("data-v-8", module.exports)
	  }
	}

/***/ }),
/* 56 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
	  return _c('div', {
	    staticClass: "vue-color__photoshop"
	  }, [_c('div', {
	    staticClass: "vue-color__photoshop__head"
	  }, [_vm._v(_vm._s(_vm.head))]), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__photoshop__body"
	  }, [_c('div', {
	    staticClass: "vue-color__photoshop__saturation-wrap"
	  }, [_c('saturation', {
	    on: {
	      "on-change": _vm.childChange
	    },
	    model: {
	      value: (_vm.colors),
	      callback: function($$v) {
	        _vm.colors = $$v
	      },
	      expression: "colors"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__photoshop__hue-wrap"
	  }, [_c('hue', {
	    attrs: {
	      "direction": "vertical"
	    },
	    on: {
	      "on-change": _vm.childChange
	    },
	    model: {
	      value: (_vm.colors),
	      callback: function($$v) {
	        _vm.colors = $$v
	      },
	      expression: "colors"
	    }
	  }, [_c('div', {
	    staticClass: "vue-color__photoshop__hue-pointer"
	  }, [_c('i', {
	    staticClass: "vue-color__photoshop__hue-pointer--left"
	  }), _c('i', {
	    staticClass: "vue-color__photoshop__hue-pointer--right"
	  })])])], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__photoshop__controls"
	  }, [_c('div', {
	    staticClass: "vue-color__photoshop__previews"
	  }, [_c('div', {
	    staticClass: "vue-color__photoshop__previews__label"
	  }, [_vm._v("new")]), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__photoshop__previews__swatches"
	  }, [_c('div', {
	    staticClass: "vue-color__photoshop__previews__pr-color",
	    style: ({
	      background: _vm.colors.hex
	    })
	  }), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__photoshop__previews__pr-color",
	    style: ({
	      background: _vm.currentColor
	    })
	  })]), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__photoshop__previews__label"
	  }, [_vm._v("current")])]), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__photoshop__actions"
	  }, [_c('div', {
	    staticClass: "vue-color__photoshop__ac-btn",
	    on: {
	      "click": _vm.handleAccept
	    }
	  }, [_vm._v("OK")]), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__photoshop__ac-btn",
	    on: {
	      "click": _vm.handleCancel
	    }
	  }, [_vm._v("Cancel")]), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__photoshop__fields"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "h"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.hsl.h),
	      callback: function($$v) {
	        _vm.colors.hsl.h = $$v
	      },
	      expression: "colors.hsl.h"
	    }
	  }), _vm._v(" "), _c('ed-in', {
	    attrs: {
	      "label": "s"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.hsl.s),
	      callback: function($$v) {
	        _vm.colors.hsl.s = $$v
	      },
	      expression: "colors.hsl.s"
	    }
	  }), _vm._v(" "), _c('ed-in', {
	    attrs: {
	      "label": "v"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.hsl.l),
	      callback: function($$v) {
	        _vm.colors.hsl.l = $$v
	      },
	      expression: "colors.hsl.l"
	    }
	  }), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__photoshop__fields__divider"
	  }), _vm._v(" "), _c('ed-in', {
	    attrs: {
	      "label": "r"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.rgba.r),
	      callback: function($$v) {
	        _vm.colors.rgba.r = $$v
	      },
	      expression: "colors.rgba.r"
	    }
	  }), _vm._v(" "), _c('ed-in', {
	    attrs: {
	      "label": "g"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.rgba.g),
	      callback: function($$v) {
	        _vm.colors.rgba.g = $$v
	      },
	      expression: "colors.rgba.g"
	    }
	  }), _vm._v(" "), _c('ed-in', {
	    attrs: {
	      "label": "b"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.rgba.b),
	      callback: function($$v) {
	        _vm.colors.rgba.b = $$v
	      },
	      expression: "colors.rgba.b"
	    }
	  }), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__photoshop__fields__divider"
	  }), _vm._v(" "), _c('ed-in', {
	    staticClass: "vue-color__photoshop__fields__hex",
	    attrs: {
	      "label": "#"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.hex),
	      callback: function($$v) {
	        _vm.colors.hex = $$v
	      },
	      expression: "colors.hex"
	    }
	  })], 1)])])])])
	},staticRenderFns: []}
	if (false) {
	  module.hot.accept()
	  if (module.hot.data) {
	     require("vue-loader/node_modules/vue-hot-reload-api").rerender("data-v-5", module.exports)
	  }
	}

/***/ }),
/* 57 */
/***/ (function(module, exports, __webpack_require__) {

	var __vue_exports__, __vue_options__

	/* styles */
	__webpack_require__(58)

	/* script */
	__vue_exports__ = __webpack_require__(60)

	/* template */
	var __vue_template__ = __webpack_require__(61)
	__vue_options__ = __vue_exports__ = __vue_exports__ || {}
	if (
	  typeof __vue_exports__.default === "object" ||
	  typeof __vue_exports__.default === "function"
	) {
	if (Object.keys(__vue_exports__).some(function (key) { return key !== "default" && key !== "__esModule" })) {console.error("named exports are not supported in *.vue files.")}
	__vue_options__ = __vue_exports__ = __vue_exports__.default
	}
	if (typeof __vue_options__ === "function") {
	  __vue_options__ = __vue_options__.options
	}
	__vue_options__.render = __vue_template__.render
	__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

	/* hot reload */
	if (false) {(function () {
	  var hotAPI = require("vue-loader/node_modules/vue-hot-reload-api")
	  hotAPI.install(require("vue"), false)
	  if (!hotAPI.compatible) return
	  module.hot.accept()
	  if (!module.hot.data) {
	    hotAPI.createRecord("data-v-6", __vue_options__)
	  } else {
	    hotAPI.reload("data-v-6", __vue_options__)
	  }
	})()}
	if (__vue_options__.functional) {console.error("[vue-loader] Sketch.vue: functional components are not supported and should be defined in plain js files using render functions.")}

	module.exports = __vue_exports__


/***/ }),
/* 58 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(59);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(5)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../../node_modules/css-loader/index.js!../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-6!../../node_modules/stylus-loader/index.js!../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Sketch.vue", function() {
				var newContent = require("!!../../node_modules/css-loader/index.js!../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-6!../../node_modules/stylus-loader/index.js!../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Sketch.vue");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 59 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(4)();
	// imports


	// module
	exports.push([module.id, "\n.vue-color__sketch {\n  position: relative;\n  width: 200px;\n  padding: 10px 10px 0;\n  box-sizing: initial;\n  background: #fff;\n  border-radius: 4px;\n  box-shadow: 0 0 0 1px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.15);\n}\n.vue-color__sketch__saturation-wrap {\n  width: 100%;\n  padding-bottom: 75%;\n  position: relative;\n  overflow: hidden;\n}\n.vue-color__sketch__controls {\n  display: flex;\n}\n.vue-color__sketch__sliders {\n  padding: 4px 0;\n  flex: 1;\n}\n.vue-color__sketch__sliders .vue-color__c-hue,\n.vue-color__sketch__sliders .vue-color__c-alpha__gradient {\n  border-radius: 2px;\n}\n.vue-color__sketch__hue-wrap {\n  position: relative;\n  height: 10px;\n}\n.vue-color__sketch__alpha-wrap {\n  position: relative;\n  height: 10px;\n  margin-top: 4px;\n  overflow: hidden;\n}\n.vue-color__sketch__color-wrap {\n  width: 24px;\n  height: 24px;\n  position: relative;\n  margin-top: 4px;\n  margin-left: 4px;\n  border-radius: 3px;\n}\n.vue-color__sketch__active-color {\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  border-radius: 2px;\n  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15), inset 0 0 4px rgba(0,0,0,0.25);\n  z-index: 2;\n}\n.vue-color__sketch__field {\n  display: flex;\n  padding-top: 4px;\n}\n.vue-color__sketch__field .vue-color__editable-input__input {\n  width: 80%;\n  padding: 4px 10% 3px;\n  border: none;\n  box-shadow: inset 0 0 0 1px #ccc;\n  font-size: 11px;\n}\n.vue-color__sketch__field .vue-color__editable-input__label {\n  display: block;\n  text-align: center;\n  font-size: 11px;\n  color: #222;\n  padding-top: 3px;\n  padding-bottom: 4px;\n  text-transform: capitalize;\n}\n.vue-color__sketch__field--single {\n  flex: 1;\n  padding-left: 6px;\n}\n.vue-color__sketch__field--double {\n  flex: 2;\n}\n.vue-color__sketch__presets {\n  margin-right: -10px;\n  margin-left: -10px;\n  padding-left: 10px;\n  padding-top: 10px;\n  border-top: 1px solid #eee;\n}\n.vue-color__sketch__presets-color {\n  border-radius: 3px;\n  overflow: hidden;\n  position: relative;\n  display: inline-block;\n  margin: 0 10px 10px 0;\n  vertical-align: top;\n  cursor: pointer;\n  width: 16px;\n  height: 16px;\n  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15);\n}\n", ""]);

	// exports


/***/ }),
/* 60 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _color = __webpack_require__(7);

	var _color2 = _interopRequireDefault(_color);

	var _EditableInput = __webpack_require__(9);

	var _EditableInput2 = _interopRequireDefault(_EditableInput);

	var _Saturation = __webpack_require__(40);

	var _Saturation2 = _interopRequireDefault(_Saturation);

	var _Hue = __webpack_require__(24);

	var _Hue2 = _interopRequireDefault(_Hue);

	var _Alpha = __webpack_require__(46);

	var _Alpha2 = _interopRequireDefault(_Alpha);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var presetColors = ['#D0021B', '#F5A623', '#F8E71C', '#8B572A', '#7ED321', '#417505', '#BD10E0', '#9013FE', '#4A90E2', '#50E3C2', '#B8E986', '#000000', '#4A4A4A', '#9B9B9B', '#FFFFFF'];

	exports.default = {
	  name: 'Sketch',
	  mixins: [_color2.default],
	  components: {
	    saturation: _Saturation2.default,
	    hue: _Hue2.default,
	    alpha: _Alpha2.default,
	    'ed-in': _EditableInput2.default
	  },
	  data: function data() {
	    return {
	      presetColors: presetColors
	    };
	  },

	  computed: {
	    activeColor: function activeColor() {
	      var rgba = this.colors.rgba;
	      return 'rgba(' + [rgba.r, rgba.g, rgba.b, rgba.a].join(',') + ')';
	    }
	  },
	  methods: {
	    handlePreset: function handlePreset(c) {
	      this.colorChange({
	        hex: c,
	        source: 'hex'
	      });
	    },
	    childChange: function childChange(data) {
	      this.colorChange(data);
	    },
	    inputChange: function inputChange(data) {
	      if (!data) {
	        return;
	      }
	      if (data.hex) {
	        this.isValidHex(data.hex) && this.colorChange({
	          hex: data.hex,
	          source: 'hex'
	        });
	      } else if (data.r || data.g || data.b || data.a) {
	        this.colorChange({
	          r: data.r || this.colors.rgba.r,
	          g: data.g || this.colors.rgba.g,
	          b: data.b || this.colors.rgba.b,
	          a: data.a || this.colors.rgba.a,
	          source: 'rgba'
	        });
	      }
	    }
	  }
	};

/***/ }),
/* 61 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
	  return _c('div', {
	    staticClass: "vue-color__sketch"
	  }, [_c('div', {
	    staticClass: "vue-color__sketch__saturation-wrap"
	  }, [_c('saturation', {
	    on: {
	      "on-change": _vm.childChange
	    },
	    model: {
	      value: (_vm.colors),
	      callback: function($$v) {
	        _vm.colors = $$v
	      },
	      expression: "colors"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__sketch__controls"
	  }, [_c('div', {
	    staticClass: "vue-color__sketch__sliders"
	  }, [_c('div', {
	    staticClass: "vue-color__sketch__hue-wrap"
	  }, [_c('hue', {
	    on: {
	      "on-change": _vm.childChange
	    },
	    model: {
	      value: (_vm.colors),
	      callback: function($$v) {
	        _vm.colors = $$v
	      },
	      expression: "colors"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__sketch__alpha-wrap"
	  }, [_c('alpha', {
	    on: {
	      "on-change": _vm.childChange
	    },
	    model: {
	      value: (_vm.colors),
	      callback: function($$v) {
	        _vm.colors = $$v
	      },
	      expression: "colors"
	    }
	  })], 1)]), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__sketch__color-wrap"
	  }, [_c('div', {
	    staticClass: "vue-color__sketch__active-color",
	    style: ({
	      background: _vm.activeColor
	    })
	  })])]), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__sketch__field"
	  }, [_c('div', {
	    staticClass: "vue-color__sketch__field--double"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "hex"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.hex),
	      callback: function($$v) {
	        _vm.colors.hex = $$v
	      },
	      expression: "colors.hex"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__sketch__field--single"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "r"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.rgba.r),
	      callback: function($$v) {
	        _vm.colors.rgba.r = $$v
	      },
	      expression: "colors.rgba.r"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__sketch__field--single"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "g"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.rgba.g),
	      callback: function($$v) {
	        _vm.colors.rgba.g = $$v
	      },
	      expression: "colors.rgba.g"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__sketch__field--single"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "b"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.rgba.b),
	      callback: function($$v) {
	        _vm.colors.rgba.b = $$v
	      },
	      expression: "colors.rgba.b"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__sketch__field--single"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "a",
	      "arrow-offset": 0.01,
	      "max": 1
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.a),
	      callback: function($$v) {
	        _vm.colors.a = $$v
	      },
	      expression: "colors.a"
	    }
	  })], 1)]), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__sketch__presets"
	  }, _vm._l((_vm.presetColors), function(c) {
	    return _c('div', {
	      staticClass: "vue-color__sketch__presets-color",
	      style: ({
	        background: c
	      }),
	      on: {
	        "click": function($event) {
	          _vm.handlePreset(c)
	        }
	      }
	    })
	  }))])
	},staticRenderFns: []}
	if (false) {
	  module.hot.accept()
	  if (module.hot.data) {
	     require("vue-loader/node_modules/vue-hot-reload-api").rerender("data-v-6", module.exports)
	  }
	}

/***/ }),
/* 62 */
/***/ (function(module, exports, __webpack_require__) {

	var __vue_exports__, __vue_options__

	/* styles */
	__webpack_require__(63)

	/* script */
	__vue_exports__ = __webpack_require__(65)

	/* template */
	var __vue_template__ = __webpack_require__(66)
	__vue_options__ = __vue_exports__ = __vue_exports__ || {}
	if (
	  typeof __vue_exports__.default === "object" ||
	  typeof __vue_exports__.default === "function"
	) {
	if (Object.keys(__vue_exports__).some(function (key) { return key !== "default" && key !== "__esModule" })) {console.error("named exports are not supported in *.vue files.")}
	__vue_options__ = __vue_exports__ = __vue_exports__.default
	}
	if (typeof __vue_options__ === "function") {
	  __vue_options__ = __vue_options__.options
	}
	__vue_options__.render = __vue_template__.render
	__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

	/* hot reload */
	if (false) {(function () {
	  var hotAPI = require("vue-loader/node_modules/vue-hot-reload-api")
	  hotAPI.install(require("vue"), false)
	  if (!hotAPI.compatible) return
	  module.hot.accept()
	  if (!module.hot.data) {
	    hotAPI.createRecord("data-v-7", __vue_options__)
	  } else {
	    hotAPI.reload("data-v-7", __vue_options__)
	  }
	})()}
	if (__vue_options__.functional) {console.error("[vue-loader] Chrome.vue: functional components are not supported and should be defined in plain js files using render functions.")}

	module.exports = __vue_exports__


/***/ }),
/* 63 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(64);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(5)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../../node_modules/css-loader/index.js!../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-7!../../node_modules/stylus-loader/index.js!../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Chrome.vue", function() {
				var newContent = require("!!../../node_modules/css-loader/index.js!../../node_modules/vue-loader/lib/style-rewriter.js?id=data-v-7!../../node_modules/stylus-loader/index.js!../../node_modules/vue-loader/lib/selector.js?type=styles&index=0!./Chrome.vue");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 64 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(4)();
	// imports


	// module
	exports.push([module.id, "\n.vue-color__chrome {\n  background: #fff;\n  border-radius: 2px;\n  box-shadow: 0 0 2px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.3);\n  box-sizing: initial;\n  width: 225px;\n  font-family: Menlo;\n  background-color: #fff;\n}\n.vue-color__chrome__controls {\n  display: flex;\n}\n.vue-color__chrome__color-wrap {\n  width: 32px;\n}\n.vue-color__chrome__active-color {\n  margin-top: 6px;\n  width: 16px;\n  height: 16px;\n  border-radius: 8px;\n  position: relative;\n  overflow: hidden;\n}\n.vue-color__chrome__sliders {\n  flex: 1;\n}\n.vue-color__chrome__sliders .vue-color__c-hue,\n.vue-color__chrome__sliders .vue-color__c-alpha__gradient {\n  border-radius: 2px;\n}\n.vue-color__chrome__sliders .vue-color__c-alpha__picker,\n.vue-color__chrome__sliders .vue-color__c-hue__picker {\n  width: 12px;\n  height: 12px;\n  border-radius: 6px;\n  transform: translate(-6px, -2px);\n  background-color: #f8f8f8;\n  box-shadow: 0 1px 4px 0 rgba(0,0,0,0.37);\n}\n.vue-color__chrome__fields-wrap {\n  padding-top: 16px;\n  display: flex;\n}\n.vue-color__chrome__fields {\n  display: flex;\n  margin-left: -6px;\n  flex: 1;\n}\n.vue-color__chrome__field {\n  padding-left: 6px;\n  width: 100%;\n}\n.vue-color__chrome__toggle-btn {\n  width: 32px;\n  text-align: right;\n  position: relative;\n}\n.vue-color__chrome__icon {\n  margin-right: -4px;\n  margin-top: 12px;\n  cursor: pointer;\n  position: relative;\n  z-index: 2;\n}\n.vue-color__chrome__icon-highlight {\n  position: absolute;\n  width: 24px;\n  height: 28px;\n  background: #eee;\n  border-radius: 4px;\n  top: 10px;\n  left: 12px;\n}\n.vue-color__chrome__hue-wrap {\n  position: relative;\n  height: 10px;\n  margin-bottom: 8px;\n}\n.vue-color__chrome__alpha-wrap {\n  position: relative;\n  height: 10px;\n}\n.vue-color__chrome__chrome-body {\n  padding: 16px 16px 12px;\n  background-color: #fff;\n}\n.vue-color__chrome__saturation-wrap {\n  width: 100%;\n  padding-bottom: 55%;\n  position: relative;\n  border-radius: 2px 2px 0 0;\n  overflow: hidden;\n}\n.vue-color__chrome__saturation-wrap .vue-color__saturation--circle {\n  width: 12px;\n  height: 12px;\n}\n.vue-color__chrome__fields .vue-color__editable-input__input {\n  font-size: 11px;\n  color: #333;\n  width: 100%;\n  border-rradius: 2px;\n  border: none;\n  box-shadow: inset 0 0 0 1px #dadada;\n  height: 21px;\n  text-align: center;\n}\n.vue-color__chrome__fields .vue-color__editable-input__label {\n  text-transform: uppercase;\n  font-size: 11px;\n  line-height: 11px;\n  color: #969696;\n  text-align: center;\n  display: block;\n  margin-top: 12px;\n}\n", ""]);

	// exports


/***/ }),
/* 65 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _color = __webpack_require__(7);

	var _color2 = _interopRequireDefault(_color);

	var _EditableInput = __webpack_require__(9);

	var _EditableInput2 = _interopRequireDefault(_EditableInput);

	var _Saturation = __webpack_require__(40);

	var _Saturation2 = _interopRequireDefault(_Saturation);

	var _Hue = __webpack_require__(24);

	var _Hue2 = _interopRequireDefault(_Hue);

	var _Alpha = __webpack_require__(46);

	var _Alpha2 = _interopRequireDefault(_Alpha);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	exports.default = {
	  name: 'Chrome',
	  mixins: [_color2.default],
	  props: {},
	  components: {
	    saturation: _Saturation2.default,
	    hue: _Hue2.default,
	    alpha: _Alpha2.default,
	    'ed-in': _EditableInput2.default
	  },
	  data: function data() {
	    return {
	      fields: ['hex', 'rgba', 'hsla'],
	      fieldsIndex: 0,
	      highlight: false
	    };
	  },

	  computed: {
	    activeColor: function activeColor() {
	      var rgba = this.colors.rgba;
	      return 'rgba(' + [rgba.r, rgba.g, rgba.b, rgba.a].join(',') + ')';
	    }
	  },
	  methods: {
	    handlePreset: function handlePreset(c) {
	      this.colorChange({
	        hex: c,
	        source: 'hex'
	      });
	    },
	    childChange: function childChange(data) {
	      this.colorChange(data);
	    },
	    inputChange: function inputChange(data) {
	      if (!data) {
	        return;
	      }
	      if (data.hex) {
	        this.isValidHex(data.hex) && this.colorChange({
	          hex: data.hex,
	          source: 'hex'
	        });
	      } else if (data.r || data.g || data.b || data.a) {
	        this.colorChange({
	          r: data.r || this.colors.rgba.r,
	          g: data.g || this.colors.rgba.g,
	          b: data.b || this.colors.rgba.b,
	          a: data.a || this.colors.rgba.a,
	          source: 'rgba'
	        });
	      }
	    },
	    toggleViews: function toggleViews() {
	      if (this.fieldsIndex >= 2) {
	        this.fieldsIndex = 0;
	        return;
	      }
	      this.fieldsIndex++;
	    },
	    showHighlight: function showHighlight() {
	      this.highlight = true;
	    },
	    hideHighlight: function hideHighlight() {
	      this.highlight = false;
	    }
	  }
	};

/***/ }),
/* 66 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
	  return _c('div', {
	    staticClass: "vue-color__chrome"
	  }, [_c('div', {
	    staticClass: "vue-color__chrome__saturation-wrap"
	  }, [_c('saturation', {
	    on: {
	      "on-change": _vm.childChange
	    },
	    model: {
	      value: (_vm.colors),
	      callback: function($$v) {
	        _vm.colors = $$v
	      },
	      expression: "colors"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__chrome__chrome-body"
	  }, [_c('div', {
	    staticClass: "vue-color__chrome__controls"
	  }, [_c('div', {
	    staticClass: "vue-color__chrome__color-wrap"
	  }, [_c('div', {
	    staticClass: "vue-color__chrome__active-color",
	    style: ({
	      background: _vm.activeColor
	    })
	  })]), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__chrome__sliders"
	  }, [_c('div', {
	    staticClass: "vue-color__chrome__hue-wrap"
	  }, [_c('hue', {
	    on: {
	      "on-change": _vm.childChange
	    },
	    model: {
	      value: (_vm.colors),
	      callback: function($$v) {
	        _vm.colors = $$v
	      },
	      expression: "colors"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__chrome__alpha-wrap"
	  }, [_c('alpha', {
	    on: {
	      "on-change": _vm.childChange
	    },
	    model: {
	      value: (_vm.colors),
	      callback: function($$v) {
	        _vm.colors = $$v
	      },
	      expression: "colors"
	    }
	  })], 1)])]), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__chrome__fields-wrap"
	  }, [_c('div', {
	    directives: [{
	      name: "show",
	      rawName: "v-show",
	      value: (_vm.fieldsIndex === 0),
	      expression: "fieldsIndex === 0"
	    }],
	    staticClass: "vue-color__chrome__fields"
	  }, [_c('div', {
	    staticClass: "vue-color__chrome__field"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "hex"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.hex),
	      callback: function($$v) {
	        _vm.colors.hex = $$v
	      },
	      expression: "colors.hex"
	    }
	  })], 1)]), _vm._v(" "), _c('div', {
	    directives: [{
	      name: "show",
	      rawName: "v-show",
	      value: (_vm.fieldsIndex === 1),
	      expression: "fieldsIndex === 1"
	    }],
	    staticClass: "vue-color__chrome__fields"
	  }, [_c('div', {
	    staticClass: "vue-color__chrome__field"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "r"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.rgba.r),
	      callback: function($$v) {
	        _vm.colors.rgba.r = $$v
	      },
	      expression: "colors.rgba.r"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__chrome__field"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "g"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.rgba.g),
	      callback: function($$v) {
	        _vm.colors.rgba.g = $$v
	      },
	      expression: "colors.rgba.g"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__chrome__field"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "b"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.rgba.b),
	      callback: function($$v) {
	        _vm.colors.rgba.b = $$v
	      },
	      expression: "colors.rgba.b"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__chrome__field"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "a",
	      "arrow-offset": 0.01,
	      "max": 1
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.a),
	      callback: function($$v) {
	        _vm.colors.a = $$v
	      },
	      expression: "colors.a"
	    }
	  })], 1)]), _vm._v(" "), _c('div', {
	    directives: [{
	      name: "show",
	      rawName: "v-show",
	      value: (_vm.fieldsIndex === 2),
	      expression: "fieldsIndex === 2"
	    }],
	    staticClass: "vue-color__chrome__fields"
	  }, [_c('div', {
	    staticClass: "vue-color__chrome__field"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "h"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.hsl.h),
	      callback: function($$v) {
	        _vm.colors.hsl.h = $$v
	      },
	      expression: "colors.hsl.h"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__chrome__field"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "s"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.hsl.s),
	      callback: function($$v) {
	        _vm.colors.hsl.s = $$v
	      },
	      expression: "colors.hsl.s"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__chrome__field"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "l"
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.hsl.l),
	      callback: function($$v) {
	        _vm.colors.hsl.l = $$v
	      },
	      expression: "colors.hsl.l"
	    }
	  })], 1), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__chrome__field"
	  }, [_c('ed-in', {
	    attrs: {
	      "label": "a",
	      "arrow-offset": 0.01,
	      "max": 1
	    },
	    on: {
	      "on-change": _vm.inputChange
	    },
	    model: {
	      value: (_vm.colors.a),
	      callback: function($$v) {
	        _vm.colors.a = $$v
	      },
	      expression: "colors.a"
	    }
	  })], 1)]), _vm._v(" "), _c('div', {
	    staticClass: "vue-color__chrome__toggle-btn",
	    on: {
	      "click": _vm.toggleViews
	    }
	  }, [_c('div', {
	    staticClass: "vue-color__chrome__icon"
	  }, [_c('svg', {
	    staticStyle: {
	      "width": "24px",
	      "height": "24px"
	    },
	    attrs: {
	      "viewBox": "0 0 24 24"
	    },
	    on: {
	      "mouseover": _vm.showHighlight,
	      "mouseenter": _vm.showHighlight,
	      "mouseout": _vm.hideHighlight
	    }
	  }, [_c('path', {
	    attrs: {
	      "fill": "#333",
	      "d": "M12,18.17L8.83,15L7.42,16.41L12,21L16.59,16.41L15.17,15M12,5.83L15.17,9L16.58,7.59L12,3L7.41,7.59L8.83,9L12,5.83Z"
	    }
	  })])]), _vm._v(" "), _c('div', {
	    directives: [{
	      name: "show",
	      rawName: "v-show",
	      value: (_vm.highlight),
	      expression: "highlight"
	    }],
	    staticClass: "vue-color__chrome__icon-highlight"
	  })])])])])
	},staticRenderFns: []}
	if (false) {
	  module.hot.accept()
	  if (module.hot.data) {
	     require("vue-loader/node_modules/vue-hot-reload-api").rerender("data-v-7", module.exports)
	  }
	}

/***/ })
/******/ ])
});
;