const {base, inherit, noop} = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const RouterService = require('core/router');
const ComponentsRegistry = require('gui/componentsregistry');

// API della GUI.
// methods have be defined by application
// app shold call GUI.ready() when GUI is ready
function GUI() {
  this.setters = {
    setContent: function(options={}) {
      this.emit('opencontent', true);
      this._setContent(options)
    }
  };
  this.isready = false;
  // images urls
  this.getResourcesUrl = noop;
  // show a Vue form
  this.showForm = noop;
  this.closeForm = noop;
  this.showListing = noop;
  this.closeListing = noop;
  this.hideListing = noop;
  // modal
  this.setModal = noop;
  this.showFullModal = noop;
  // modal
  this.showQueryResults = noop;
  this.hideQueryResults = noop;
  this.showPanel = noop;
  this.hidePanel = noop;
  this.reloadComponents = noop;
  this.showUserMessage = noop;
  this.closeUserMessage = noop;
  this.showModalDialog = noop;
  this.addComponent = function(component, placeholder) {};
  this.removeComponent = function(id) {};
  this.setComponent = function(component) {
    ComponentsRegistry.registerComponent(component);
  };
  this.getComponent = function(id) {
    return ComponentsRegistry.getComponent(id);
  };
  this.getComponents = function() {
    return ComponentsRegistry.getComponents();
  };
  this.goto = function(url) {
    RouterService.goto(url);
  };

  this.ready = function() {
    this.emit('ready');
    this.isready = true;
  };

  this.guiResized = function() {
    this.emit('guiresized');
  };

  //ready GUI
  this.isReady = function(){
    return new Promise(resolve =>{
      this.isready ? resolve() : this.once('ready', resolve);
    })
  };

  /* spinner */
  this.showSpinner = function(options){};
  this.hideSpinner = function(id){};
  /* end spinner */

  this.notify = noop;
  this.dialog = noop;
  this.isMobile = noop;

  //useful to registere setters
  base(this);
}

inherit(GUI, G3WObject);

module.exports = new GUI;
