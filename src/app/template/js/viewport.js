var inherit = require('sdk').core.utils.inherit;
var base = require('sdk').core.utils.base;
var merge = require('sdk').core.utils.merge;
var G3WObject = require('sdk').core.G3WObject;
var GUI = require('sdk').gui.GUI;

var ViewportService = function(){  
  this.state = {
    primaryViewTag: 'one', // di default la vista primaria è la prima
    secondaryVisible: false,
    ratioDenom: 2,
    split: 'h',
    viewSizes: {
      one: {
        width: 0,
        height: 0
      },
      two: {
        width: 0,
        height: 0
      }
    }
  };
  
  this.setters = {
    setPrimaryComponent: function(componentId) {
      var component = this._viewsByComponentId[componentId];
      if(component) {
        var viewTag = component.viewTag;
        this._setPrimaryView(viewTag);
      }
    }
  }
  
  this._viewsByComponentId = {};
  var _components = null;
  this._secondaryViewMinWidth = 300;
  this._secondaryViewMinHeight = 200;
  
  /* INTERFACCIA PUBBLICA */
  
  this.addComponents = function(components){
    var self = this;
    var regiteredComponents = _.keys(self._viewsByComponentId);

    // la viewport ha al massimo due viste, ognuna contente al massimo un componente. Se viene richiesta l'aggiunta di più di due componenti questi vengono ignorati
    components = components.slice(0,3);
    if (regiteredComponents.length == 2) {
      return false;
    }
    
    var sliceStart = regiteredComponents.length;
    var sliceEnd = regiteredComponents.length + components.length;
    var viewTags = ['one','two'].slice(sliceStart,sliceEnd);
    _.forEach(viewTags, function(viewTag,idx){
      var component = components[idx];
      component.mount('#g3w-view-'+viewTag,true).
      then(function(){
        var componentId = component.getId();
        self._viewsByComponentId[componentId] = {
          viewTag: viewTag,
          component: component
        }
      });
    })
    return true;
  };
  
  this.addComponent = function(component) {
    return this.addComponents[component];
  };
  
  this.showSecondaryView = function(split,ratioDenom) {
    this.state.secondaryVisible = true;
    this.state.split = split ? split : this.state.split;
    this.state.ratioDenom = ratioDenom ? ratioDenom : this.state.ratioDenom;
    this._layout();
  };
  
  this.hideSecondaryView = function() {
    this.state.secondaryVisible = false;
    this._layout();
  };
  
  /* FINE INTERFACCIA PUBBLICA */
  
  this._otherTag = function(viewTag) {
    return (viewTag == 'one') ? 'two' : 'one';
  };
  
  // meccanismo per il ricalcolo delle dimensioni della viewport e dei suoi componenti figli
  
  this._setPrimaryView = function(viewTag) {
    this.state.primaryView = viewTag;
    //this._layout();
  };
  
  this._prepareLayout = function() {
    var self = this;
    var drawing = false;
    var resizeFired = false;
    
    function triggerResize() {
      resizeFired = true;
      drawResize();
    } 

    function drawResize() {
      if (resizeFired === true) {
          resizeFired = false;
          drawing = true;
          self._layout();
          requestAnimationFrame(drawResize);
      } else {
          drawing = false;
      }
    }
    
    GUI.on('ready',function(){
      // primo layout
      var primaryViewTag = self.state.primaryViewTag;
      var seondaryViewTag = self._otherTag(primaryViewTag);
      var secondaryEl = $(".g3w-viewport ."+seondaryViewTag);
      
      var seondaryViewMinWidth = secondaryEl.css('min-width');
      if ((seondaryViewMinWidth != "") && !_.isNaN(parseFloat(seondaryViewMinWidth))) {
        self._secondaryViewMinWidth =  parseFloat(seondaryViewMinWidth);
      }
      var seondaryViewMinHeight = secondaryEl.css('min-height');
      if ((seondaryViewMinHeight != "") && !_.isNaN(parseFloat(seondaryViewMinHeight))) {
        self._secondaryViewMinHeight =  parseFloat(seondaryViewMinHeight);
      }

      self._layout();
      
      // resize scatenato da GUI
      GUI.on('guiresized',function(){
        triggerResize();
      });
      
      // resize della window
      $(window).resize(function() {
        // set resizedFired to true and execute drawResize if it's not already running
        if (drawing === false) {
            triggerResize();
        }
      });
      
      // resize sul ridimensionamento della sidebar
      $('.main-sidebar').on('webkitTransitionEnd transitionend msTransitionEnd oTransitionEnd', function () {
          $(this).trigger('trans-end');
          triggerResize();
      });
    });
  };
  
  this._setViewSizes = function() {
    var primaryViewTag = this.state.primaryViewTag;
    var seondaryViewTag = this._otherTag(primaryViewTag);
    
    var viewportWidth = this._viewportWidth();
    var viewportHeight = this._viewportHeight();
    
    var primaryWidth = viewportWidth;
    var primaryHeight = viewportHeight;
    
    var ratio = this.state.ratioDenom;
    if (ratio > 0) {
      if (this.state.split == 'h') {
        secondaryWidth = this.state.secondaryVisible ? Math.max((viewportWidth / ratio),this._secondaryViewMinWidth) : 0;
        secondaryHeight = viewportHeight;
        primaryWidth = viewportWidth - secondaryWidth;
        primaryHeight = viewportHeight;
      }
      else {
        secondaryWidth = viewportWidth;
        secondaryHeight = this.state.secondaryVisible ? Math.max((viewportHeight / ratio),this._secondaryViewMinHeight) : 0;
        primaryWidth = viewportWidth;
        primaryHeight = viewportHeight - secondaryHeight;
      }
    }
    
    this.state.viewSizes[primaryViewTag].width = primaryWidth;
    this.state.viewSizes[primaryViewTag].height = primaryHeight;
    //var primaryEl = $(".g3w-viewport ."+primaryViewTag);
    
    
    this.state.viewSizes[seondaryViewTag].width = secondaryWidth;
    this.state.viewSizes[seondaryViewTag].height = secondaryHeight;
    //var secondaryEl = $(".g3w-viewport ."+seondaryViewTag);
  };
  
  this._viewportHeight = function() {
    var topHeight = $(".navbar").innerHeight();
    return $(window).innerHeight() - topHeight;
  };
    
  this._viewportWidth = function() {
    var offset = $(".main-sidebar").offset().left;
    var width = $(".main-sidebar").innerWidth();
    var sideBarSpace = width + offset;
    return $(window).innerWidth() - sideBarSpace;
  };
  
  this._layout = function() {
    var splitClassToAdd = (this.state.split == 'h') ? 'split-h' : 'split-v';
    var splitClassToRemove =  (this.state.split == 'h') ? 'split-v' : 'split-c';
    $(".g3w-viewport .g3w-view").addClass(splitClassToAdd);
    $(".g3w-viewport .g3w-view").removeClass(splitClassToRemove);
    
    this._setViewSizes();
    this._layoutComponents();
  };
  
  this._layoutComponents = function() {
    var self = this;
    if (!_components){
      _components = _.map(this._viewsByComponentId,function(view){ return view.component; });
    }
    _.forEach(_components,function(component){
      // viene chiamato il metodo per il ricacolo delle dimensioni nei componenti figli
      var viewTag = self._viewsByComponentId[component.getId()].viewTag;
      var width = self.state.viewSizes[viewTag].width;
      var height = self.state.viewSizes[viewTag].height;
      component.layout(width,height);
    })
  };
  
  this._prepareLayout();
  base(this);
};
inherit(ViewportService, G3WObject);

var viewportService = new ViewportService;

var ViewportComponent = Vue.extend({
  template: require('../html/viewport.html'),
  data: function() {
    return {
      state: viewportService.state
    }
  }
});

module.exports = {
  ViewportService: viewportService,
  ViewportComponent: ViewportComponent
}
