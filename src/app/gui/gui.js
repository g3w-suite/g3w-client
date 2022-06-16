import G3WObject from 'core/g3wobject';
import RouterService from 'core/router';
import ComponentsRegistry from 'gui/componentsregistry';

class GUI extends G3WObject {
  constructor() {
    const noop = () => {};
    super({
      setters: {
        setContent(options = {}) {
          this.fire('opencontent', true);
          this._setContent(options);
        },
      },
    });
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
    this._closeUserMessageBeforeSetContent = true;
    /* end spinner */
    this.notify = noop;
    this.dialog = noop;
    this.isMobile = noop;
  }

  addComponent(component, placeholder) {}

  removeComponent(id) {}

  setComponent(component) {
    ComponentsRegistry.registerComponent(component);
  }

  getComponent(id) {
    return ComponentsRegistry.getComponent(id);
  }

  getComponents() {
    return ComponentsRegistry.getComponents();
  }

  getService(idComponent) {
    const component = this.getComponent(idComponent);
    return component && component.getService();
  }

  goto(url) {
    RouterService.goto(url);
  }

  ready() {
    this.fire('ready');
    this.isready = true;
  }

  guiResized() {
    this.fire('guiresized');
  }

  // ready GUI
  isReady() {
    return new Promise((resolve) => (this.isready ? resolve() : this.once('ready', resolve)));
  }

  /**
   * Passing a component application ui id return service that belong to component
   * @param componentId
   * @returns {*}
   */
  getService(componentId) {
    const component = this.getComponent(componentId);
    return component && component.getService();
  }

  /* spinner */
  showSpinner(options = {}) {}

  hideSpinner(id) {}
}

export default new GUI();
