/**
 * @file
 * @since v3.7
 */

import SidebarItemComponent from 'components/SidebarItem.vue';

const { base, inherit } = require('utils');
const { barstack: Stack } = require('gui/utils/utils');
const G3WObject = require('core/g3wobject');

/**
 * TODO: temporary need to remove it
 */
const SidebarItem = Vue.extend(SidebarItemComponent);

function SidebarService() {
  //set sidebar stack
  this.stack = new Stack();
  // set setter for close sidebarpanel to catch event
  // of closing panel of the sidebar
  this.setters = {
    closeSidebarPanel() {},
    openCloseItem(bool) {}
  };
  //service state
  this.state = {
    components: [],
    gui: {
      title: ''
    },
    disabled: false
  };
  //inizialize method
  this.init = function(layout) {
    this.layout = layout;
  };
  // add component to sidebar
  this.addComponents = function(components, options={}) {
    //for each component of the sidebar it is call addComponent method
    components.forEach(component => this.addComponent(component, options));
    return true;
  };
  // add each component to the sidebar
  // add also position insiede the sidebar
  this.addComponent = function(component, options={}) {
    const {position, before=true, info} = options;
    if (isMobile.any && !component.mobile) {
      return false
    }
    const sidebarItem = new SidebarItem({
      service: this,
      info,
      component
    });
    sidebarItem.title = component.title || sidebarItem.title;
    sidebarItem.info = component.info || sidebarItem.info;
    sidebarItem.actions = component.actions || sidebarItem.actions;
    sidebarItem.open = component.state.open; //(component.open === undefined) ? sidebarItem.open : component.open;
    sidebarItem.icon = component.icon || sidebarItem.icon;
    sidebarItem.iconColor = component.iconColor;
    sidebarItem.state = component.state || true;
    sidebarItem.collapsible = (typeof component.collapsible === 'boolean') ? component.collapsible : true;
    sidebarItem.isolate = (typeof component.isolate === 'boolean') ? component.isolate: false;
    //append component to  g3w-sidebarcomponents (template sidebar.html)
    const DOMComponent = sidebarItem.$mount().$el;
    this.state.components.push(component);
    const isPanelSidebarShow = $('.g3w-sidebarpanel').is(':visible');
    const sidebarcomponetsdomid = `#g3w-sidebarcomponents${isPanelSidebarShow ? ':hidden': ''}`;
    const children = $(sidebarcomponetsdomid).children().filter(function(){
      return this.style.display !== 'none'
    });
    const childrenLength = children.length;
    if (position === null || position === undefined || position < 0 || position >= childrenLength) $(sidebarcomponetsdomid).append(DOMComponent);
    else children.each((index, element) => {
      const findElementIndexId = Number.isInteger(position) ? position === index : element.id === position;
      findElementIndexId && $(DOMComponent)[`insert${before ? 'Before' : 'After'}`](element);
    });
    //mount componet to g3w-sidebarcomponent-placeholder (template sidebar-item.html);
    component.mount("#g3w-sidebarcomponent-placeholder");
    // check if componentonent has iniService method
    component.initService && component.initService();
    // add click handler
    this.setComponentClickHandler(component);
    return true;
  };

  this.setComponentClickHandler = function(component){
    component.click = ({open=false}={}) => {
      open = open || false;
      $(component.getInternalComponent().$el).siblings('a').click();
      component.setOpen(open);
    }
  };

  // get component by id
  this.getComponent = function(id) {
    return this.state.components.find(component => component.getId() === id)
  };

  // get all components
  this.getComponents = function() {
    return this.state.components;
  };

  /**
   * close for the moment only conlapsbale
   */
  this.closeOpenComponents = function(collapsible=true){
    this.getComponents().forEach(component => component.closeWhenViewportContentIsOpen() && component.collapsible && component.click({open: false}))
  };

  this.reloadComponent = function(id) {
    const component = this.getComponent(id);
    component && component.reload();
  };

  this.reloadComponents = function() {
    // force close of the panel
    this.closePanel();
    this.state.components.forEach(component => {
      if (component.collapsible && component.state.open) component.click({open: false});
      component.reload();
    })
  };
  //remove component
  this.removeComponent = function(component, options={}) {
    const {position} = options;
    this.state.components.forEach((sidebarComponent, index) => {
      if (component === sidebarComponent) {
        component.unmount();
        this.state.components.splice(index, 1);
        if (position !== undefined && Number.isInteger(position)) $('#g3w-sidebarcomponents').children(':visible')[position].remove();
        else $('#g3w-sidebarcomponents').children(`#${component.id}`).remove();
        return false;
      }
    })
  };
  // show panel on stack
  this.showPanel = function(panel, options={}) {
    return new Promise((resolve, reject) => {
      this.state.gui.title = panel.title;
      const parent =  "#g3w-sidebarpanel-placeholder";
      this.stack.getCurrentContentData() && $(this.stack.getCurrentContentData().content.internalPanel.$el).hide();
      this.stack.push(panel, {
        parent,
        ...options
      }).then(content => resolve(content))
    })
  };

  // close panel
  this.closePanel = function() {
    this.closeSidebarPanel();
    this.stack.pop().then(content => {
      content = null;
      if (this.stack.getCurrentContentData()) {
        $(this.stack.getCurrentContentData().content.internalPanel.$el).show();
        this.state.gui.title = this.stack.getCurrentContentData().content.title;
      }
    });
  };

  this.closeAllPanels = function(){
    this.state.gui.title = null;
    this.closeSidebarPanel();
    this.stack.clear();
  };

  base(this);
}

inherit(SidebarService, G3WObject);

export default new SidebarService();