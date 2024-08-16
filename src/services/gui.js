import ApplicationService from 'services/application';
import ComponentsRegistry from 'store/components';

const { noop }  = require('utils');
const G3WObject = require('core/g3wobject');

// API della GUI.
// methods have been defined by application
// app should call GUI.ready() when GUI is ready
export default new (class GUI extends G3WObject {
  constructor(opts) {
    super(opts);

    this.setters = {
      setContent(opts = {}) {
        this.emit('opencontent', true);
        this._setContent(opts)
      }
    };

    this.isready          = false;
    // images urls
    this.getResourcesUrl  = noop;
    // show a Vue form
    this.showForm         = noop;
    this.closeForm        = noop;
    this.showListing      = noop;
    this.closeListing     = noop;
    this.hideListing      = noop;
    // modal
    this.setModal         = noop;
    this.showFullModal    = noop;
    // modal
    this.showQueryResults = noop;
    this.hideQueryResults = noop;
    this.showPanel        = noop;
    this.hidePanel        = noop;
    this.reloadComponents = noop;
    this.showUserMessage  = noop;
    this.closeUserMessage = noop;
    this.showModalDialog  = noop;
    this.notify           = noop;
    this.dialog           = noop;
    this.isMobile         = noop;
    //property to how a result has to be adding or close all and show new
    // false mean create new and close all open
    this.push_content     = false;
    this._closeUserMessageBeforeSetContent = true;

  }
  setPushContent(bool = false) {
    this.push_content = bool;
  }

  getPushContent() {
    return this.push_content;
  }

  setComponent(component) {
    ComponentsRegistry.registerComponent(component);
  }
  getComponent(id) {
    return ComponentsRegistry.getComponent(id);
  }

  getComponents() {
    return ComponentsRegistry.getComponents();
  }
  ready() {
    this.emit('ready');
    this.isready = true;
  }

  guiResized() {
    this.emit('guiresized');
  }
  //ready GUI
  isReady() {
    return new Promise(resolve => this.isready ? resolve() : this.once('ready', resolve));
  };
  /**
   * Passing a component application ui id return service that belongs to component
   * @param componentId
   * @returns {*}
   */
  getService(componentId) {
    const component = this.getComponent(componentId);
    return component && component.getService();
  }
  /* spinner */
  showSpinner(opts ={}) {};
  hideSpinner(id) {};
  /* end spinner */
  /**
   * Wrapper for download
   *
   * @param { Function } downloadFnc function to call
   * @param { Object }   options     Object parameters
   *
   * @since 3.9.0
   */
  async downloadWrapper(downloadFnc, options = {}) {
    this.setLoadingContent(true);

    try {
      await downloadFnc(options);
    } catch(e) {
      this.showUserMessage({ type: 'alert', message: e || 'server_error', textMessage: !!e })
    }
    ApplicationService.setDownload(false, ApplicationService.setDownload(true));

    this.setLoadingContent(false);
  }
});
