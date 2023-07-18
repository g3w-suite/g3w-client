/**
 * @file
 * @since v3.7
 */

import SidebarItemComponent from 'components/SidebarItem.vue';
import G3WObject            from 'core/g3wobject';

const { barstack: Stack }   = require('gui/utils/utils');

/**
 * TODO: temporary need to remove it
 */
const SidebarItem = Vue.extend(SidebarItemComponent);

class SidebarService extends G3WObject {

  /**
   * Setter for close sidebarpanel to catch event
   * of closing panel of the sidebar
   * 
   * @TODO upgrade babel version (class fields seems to be currently unsupported)
   */
  // setters = {
  //   closeSidebarPanel() {},
  //   openCloseItem(bool) {}
  // }

  constructor() {

    super();

    // sidebar stack
    this.stack = new Stack();

    //service state
    this.state = {
      components: [],
      gui: {
        title: ''
      },
      disabled: false
    };

    /**
     * @TODO replace it with class fields (upgrade babel version and remove the followings)
     */
    this.setters = {
      closeSidebarPanel() {
        console.info('closing sidebar panel');
      },
      openCloseItem(bool) {
        console.info('toggle sidebar item');
      }
    };
    this._setupListenersChain(this.setters);

  }


  /**
   * init method
   */
  init(layout) {
    this.layout = layout;
  }

  /**
   * add component to sidebar, internally call `addComponent`
   * method on each component of the sidebar 
   */
  addComponents(components, options = {}) {
    components.forEach(component => this.addComponent(component, options));
    return true;
  }

  /**
   * add component to the sidebar and set position inside the sidebar
   */
  addComponent(component, options={}) {
    const {
      position,
      before = true,
      info
    } = options;

    if (isMobile.any && !component.mobile) {
      return false
    }

    const item       = new SidebarItem({ service: this, info, component });
    item.title       = component.title       || item.title;
    item.info        = component.info        || item.info;
    item.actions     = component.actions     || item.actions;
    item.open        = component.state.open; // (component.open === undefined) ? item.open : component.open;
    item.icon        = component.icon        || item.icon;
    item.iconColor   = component.iconColor;
    item.state       = component.state       || true;
    item.collapsible = ('boolean' === typeof component.collapsible) ? component.collapsible : true;
    item.isolate     = ('boolean' === typeof component.isolate)     ? component.isolate: false;

    // append component to `g3w-sidebarcomponents`
    const el = item.$mount().$el;
    const id = `#g3w-sidebarcomponents${ $('.g3w-sidebarpanel').is(':visible') ? ':hidden': ''}`;

    this.state.components.push(component);

    const children = $(id)
      .children()
      .filter(function() { return this.style.display !== 'none' });

    if (null === position || undefined === position || position < 0 || position >= children.length) {
      $(id).append(el);
    } else {
      children
        .each((index, element) => {
          if (Number.isInteger(position) ? position === index : element.id === position) {
            $(el)[`insert${before ? 'Before' : 'After'}`](element);
          }
        });
    }

    // mount component to `g3w-sidebarcomponent-placeholder`
    component.mount("#g3w-sidebarcomponent-placeholder");

    if (component.initService) {
      component.initService();
    }

    // add click handler
    this.setComponentClickHandler(component);

    return true;
  }

  setComponentClickHandler(component) {
    component.click = ({open = false } = {}) => {
      open = open || false;
      $(component.getInternalComponent().$el).siblings('a').click();
      component.setOpen(open);
    }
  }

  /**
   * get component by id
   */
  getComponent(id) {
    return this.state.components.find(item => item.getId() === id)
  }

  /**
   * get all components
   */
  getComponents() {
    return this.state.components;
  }

  /**
   * close for the moment only conlapsbale
   */
  closeOpenComponents(collapsible=true){
    this
      .getComponents()
      .forEach(item => item.closeWhenViewportContentIsOpen() && item.collapsible && item.click({ open: false }));
  }

  reloadComponent(id) {
    const item = this.getComponent(id);
    if (item) {
      item.reload();
    }
  };

  /**
   * force close and open of the panel
   */
  reloadComponents() {
    this.closePanel();
    this
      .state
      .components
      .forEach(item => {
        if (item.collapsible && item.state.open) {
          item.click({open: false});
        }
        item.reload();
      });
  };

  removeComponent(component, options = {}) {
    const { position } = options;
    this
      .state
      .components
      .forEach((sidebarComponent, index) => {
        if (component === sidebarComponent) {
          component.unmount();
          this.state.components.splice(index, 1);
          if (undefined !== position && Number.isInteger(position)) {
            $('#g3w-sidebarcomponents').children(':visible')[position].remove();
          } else {
            $('#g3w-sidebarcomponents').children(`#${component.id}`).remove();
          }
          return false;
        }
      });
  }

  /**
   * show panel on stack
   */
  showPanel(panel, options = {}) {
    return new Promise((resolve, reject) => {
      this.state.gui.title = panel.title;
      const data           = this.stack.getCurrentContentData();
      if (data) {
        $(data.content.internalPanel.$el).hide();
      }
      this
        .stack
        .push(panel, { parent: "#g3w-sidebarpanel-placeholder", ...options })
        .then(content => resolve(content))
    })
  }

  closePanel() {
    this.state.gui.title = null;
    this.closeSidebarPanel();
    this
      .stack
      .pop()
      .then(content => {
        content    = null;
        const data = this.stack.getCurrentContentData();
        if (data) {
          $(data.content.internalPanel.$el).show();
        }
    });
  }

  closeAllPanels() {
    this.state.gui.title = null;
    this.closeSidebarPanel();
    this.stack.clear();
  }

}

export default new SidebarService();