(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.g3wtemplate = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var g3w = {};
g3w.template = {
  ApplicationTemplate: require('./js/template'),
  TemplateConfiguration: require('./js/templateconfiguration')
};
(function (exports) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
      define(function () {
          return g3w;
      });
    }
    else if (typeof module === 'object' && module.exports){
        module.exports = g3w;
    }
    else {
        exports.g3w = g3w;
    }
}(this || {}));

},{"./js/template":2,"./js/templateconfiguration":3}],2:[function(require,module,exports){
//var Application = require('lib/sdk/sdk').core.Application;
//var bootstrap = require('./bootstrap');
var ApplicationTemplate = function(){
  this.config = {};
  this.init = function(templateConfiguration, ApplicationService) {
    this.config = templateConfiguration;
    this.appService = ApplicationService;
    this._buildTemplate();
  };
  this._buildTemplate = function() {
    //codice qui
  }
};

module.exports =  ApplicationTemplate;

},{}],3:[function(require,module,exports){
// questo è la configurazione base del template che conterrà tutti gli
// elementi previsti dal template. Nella definizione sono tutti oggetti vuoti
//Sarà l'applicazione a scegliere di riempire gli elementi
var templateConfiguration = {
  navbar: [
	  {
	    geocode: {}
	  }
  ],
	sidebar: [
	  {
	    search: {}
	  },
	  {
	    catalog: {}
	  }
  ],
  floatbar: [
    {
      result: {}
    }
  ]
};

module.exports = templateConfiguration;
},{}]},{},[1])(1)
});


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImpzL3RlbXBsYXRlLmpzIiwianMvdGVtcGxhdGVjb25maWd1cmF0aW9uLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBnM3cgPSB7fTtcbmczdy50ZW1wbGF0ZSA9IHtcbiAgQXBwbGljYXRpb25UZW1wbGF0ZTogcmVxdWlyZSgnLi9qcy90ZW1wbGF0ZScpLFxuICBUZW1wbGF0ZUNvbmZpZ3VyYXRpb246IHJlcXVpcmUoJy4vanMvdGVtcGxhdGVjb25maWd1cmF0aW9uJylcbn07XG4oZnVuY3Rpb24gKGV4cG9ydHMpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gZzN3O1xuICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKXtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBnM3c7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBleHBvcnRzLmczdyA9IGczdztcbiAgICB9XG59KHRoaXMgfHwge30pKTtcbiIsIi8vdmFyIEFwcGxpY2F0aW9uID0gcmVxdWlyZSgnbGliL3Nkay9zZGsnKS5jb3JlLkFwcGxpY2F0aW9uO1xuLy92YXIgYm9vdHN0cmFwID0gcmVxdWlyZSgnLi9ib290c3RyYXAnKTtcbnZhciBBcHBsaWNhdGlvblRlbXBsYXRlID0gZnVuY3Rpb24oKXtcbiAgdGhpcy5jb25maWcgPSB7fTtcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24odGVtcGxhdGVDb25maWd1cmF0aW9uLCBBcHBsaWNhdGlvblNlcnZpY2UpIHtcbiAgICB0aGlzLmNvbmZpZyA9IHRlbXBsYXRlQ29uZmlndXJhdGlvbjtcbiAgICB0aGlzLmFwcFNlcnZpY2UgPSBBcHBsaWNhdGlvblNlcnZpY2U7XG4gICAgdGhpcy5fYnVpbGRUZW1wbGF0ZSgpO1xuICB9O1xuICB0aGlzLl9idWlsZFRlbXBsYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgLy9jb2RpY2UgcXVpXG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gIEFwcGxpY2F0aW9uVGVtcGxhdGU7XG4iLCIvLyBxdWVzdG8gw6ggbGEgY29uZmlndXJhemlvbmUgYmFzZSBkZWwgdGVtcGxhdGUgY2hlIGNvbnRlcnLDoCB0dXR0aSBnbGlcbi8vIGVsZW1lbnRpIHByZXZpc3RpIGRhbCB0ZW1wbGF0ZS4gTmVsbGEgZGVmaW5pemlvbmUgc29ubyB0dXR0aSBvZ2dldHRpIHZ1b3RpXG4vL1NhcsOgIGwnYXBwbGljYXppb25lIGEgc2NlZ2xpZXJlIGRpIHJpZW1waXJlIGdsaSBlbGVtZW50aVxudmFyIHRlbXBsYXRlQ29uZmlndXJhdGlvbiA9IHtcbiAgbmF2YmFyOiBbXG5cdCAge1xuXHQgICAgZ2VvY29kZToge31cblx0ICB9XG4gIF0sXG5cdHNpZGViYXI6IFtcblx0ICB7XG5cdCAgICBzZWFyY2g6IHt9XG5cdCAgfSxcblx0ICB7XG5cdCAgICBjYXRhbG9nOiB7fVxuXHQgIH1cbiAgXSxcbiAgZmxvYXRiYXI6IFtcbiAgICB7XG4gICAgICByZXN1bHQ6IHt9XG4gICAgfVxuICBdXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHRlbXBsYXRlQ29uZmlndXJhdGlvbjsiXX0=
