/**
 * @file
 * @since v3.7
 */

import G3WObject    from 'core/g3w-object';
import { BarStack } from 'core/g3w-barstack';
import vueComp      from 'components/SidebarItem.vue';

export default new (class SidebarService extends G3WObject {

  constructor() {
    super();

    // sidebar stack
    this.stack = new BarStack();

    // service state
    this.state = {
      components: [],
      gui: {
        title: ''
      },
      disabled: false
    };

    /**
     * setter for close sidebarpanel to catch event
     * of closing panel of the sidebar
     */
    this.setters = {
      closeSidebarPanel() {
        console.info('closing sidebar panel');
      },
      openCloseItem(bool) {
        console.info('toggle sidebar panel');
      }
    };

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
  addComponents(components, options={}) {
    components.forEach(c => this.addComponent(c, options));
    return true;
  };

  /**
   * add component to the sidebar and set position inside the sidebar
   */
  addComponent(comp, opts={}) {

    if (isMobile.any && !comp.mobile) {
      return false
    }

    opts.before      = undefined === opts.before ? true : opts.before;

    const item       = new (Vue.extend(vueComp))({ service: this, component: comp });
    item.title       = comp.title       || item.title;
    item.info        = comp.info        || item.info;
    item.actions     = comp.actions     || item.actions;
    item.open        = comp.state.open; // (comp.open === undefined) ? item.open : comp.open;
    item.icon        = comp.icon        || item.icon;
    item.iconColor   = comp.iconColor;
    item.state       = comp.state       || true;
    item.collapsible = ('boolean' === typeof comp.collapsible) ? comp.collapsible : true;
    item.isolate     = ('boolean' === typeof comp.isolate)     ? comp.isolate     : false;

    // append component to `g3w-sidebarcomponents`
    const el = item.$mount().$el;
    const id = `#g3w-sidebarcomponents${ $('.g3w-sidebarpanel').is(':visible') ? ':hidden': ''}`;

    this.state.components.push(comp);

    const children = $(id).children().filter(function() { return this.style.display !== 'none' });
  
    if (null === opts.position || undefined === opts.position || opts.position < 0 || opts.position >= children.length) {
      $(id).append(el);
    } else {
      children.each((i, c) => {
        const found = Number.isInteger(opts.position) ? opts.position === i : c.id === opts.position;
        if (found) {
          $(el)[`insert${opts.before ? 'Before' : 'After'}`](c);
        }
      });
    }

    // mount component to `g3w-sidebarcomponent-placeholder`
    comp.mount("#g3w-sidebarcomponent-placeholder");

    if (comp.initService) {
      comp.initService();
    }

    // add click handler
    this.setComponentClickHandler(comp);

    return true;
  }

  /**
   * @param comp component
   */
  setComponentClickHandler(comp) {
    comp.click = ({ open = false } = {}) => {
      open = open || false;
      $(comp.getInternalComponent().$el).siblings('a').click();
      comp.setOpen(open);
    };
  }

  /**
   * get component by id
   */
  getComponent(id) {
    return this.state.components.find(c => c.getId() === id)
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
  closeOpenComponents(collapsible=true) {
    this.getComponents().forEach(c => c.getOpen() && c.state.closewhenshowviewportcontent && c.collapsible && c.click({ open: false }))
  }

  reloadComponent(id) {
    const component = this.getComponent(id);
    component && component.reload();
  }

  reloadComponents() {
    // force close of the panel
    this.closePanel();
    this.state.components.forEach(c => { if (c.collapsible && c.state.open) { c.click({open: false}); } component.reload(); })
  }

  /**
   * remove component 
   */
  removeComponent(comp, opts={}) {
    this.state.components.forEach((c, i) => {
      if (comp === c) {
        comp.unmount();
        this.state.components.splice(i, 1);
        if (opts.position !== undefined && Number.isInteger(opts.position)) {
          $('#g3w-sidebarcomponents').children(':visible')[opts.position].remove();
        } else {
          $('#g3w-sidebarcomponents').children(`#${comp.id}`).remove();
        }
        return false;
      }
    })
  }

  /**
   * show panel on stack
   */
  async showPanel(panel, options={}) {
    this.state.gui.title = panel.title;
    const data = this.stack.getCurrentContentData();
    if (data) {
      $(data.content.internalPanel.$el).hide();
    } 
    return await this.stack.push(panel, { parent: '#g3w-sidebarpanel-placeholder', ...options });
  }

  /**
   * close panel
   */
  closePanel() {
    this.closeSidebarPanel();
    this.stack.pop().then(content => {
      content = null;
      const data = this.stack.getCurrentContentData();
      if (data) {
        $(data.content.internalPanel.$el).show();
        this.state.gui.title = data.content.title;
      }
    });
  }

  closeAllPanels() {
    this.state.gui.title = null;
    this.closeSidebarPanel();
    this.stack.clear();
  }

})();