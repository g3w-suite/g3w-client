import RouterService from 'services/router';
import ComponentsRegistry from 'store/components';

const { base, inherit, noop } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

// API della GUI.
// methods have be defined by application
// app should call GUI.ready() when GUI is ready
function GUI() {
  this.setters = {
    setContent(options={}) {
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
  //property to how result has to be add or close all and show new
  // false mean create new and close all open
  this.push_content=false;
  this.setPushContent = function (bool=false) {
    this.push_content = bool;
  };
  this.getPushContent = function(){
    return this.push_content;
  };
  this._closeUserMessageBeforeSetContent = true;
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
    return new Promise(resolve => this.isready ? resolve() : this.once('ready', resolve));
  };
  /**
   * Passing a component application ui id return service that belong to component
   * @param componentId
   * @returns {*}
   */
  this.getService = function(componentId){
    const component = this.getComponent(componentId);
    return component && component.getService();
  };
  /* spinner */
  this.showSpinner = function(options={}){};
  this.hideSpinner = function(id){};
  /* end spinner */
  this.notify = noop;
  this.dialog = noop;
  this.isMobile = noop;
  //useful to registere setters
  base(this);
}

inherit(GUI, G3WObject);

export default new GUI();
