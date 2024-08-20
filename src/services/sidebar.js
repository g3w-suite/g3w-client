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
      gui:        { title: '' },
      disabled:   false
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
  addComponents(components, opts = {}) {
    components.forEach(c => this.addComponent(c, opts));
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
    item.open        = comp.state.open;
    item.icon        = comp.icon        || item.icon;
    item.iconColor   = comp.iconColor;
    item.state       = comp.state       || true;
    item.collapsible = false !== comp.collapsible;

    // append component to `g3w-sidebarcomponents`
    const el = item.$mount().$el;
    const id = `#g3w-sidebarcomponents${ $('.g3w-sidebarpanel').is(':visible') ? ':hidden': ''}`;

    this.state.components.push(comp);

    const children = $(id).children().filter(function() { return 'none' !== this.style.display });
  
    if ([null, undefined].includes(opts.position) || opts.position < 0 || opts.position >= children.length) {
      $(id).append(el);
    } else {
      children.each((i, c) => {
        if (Number.isInteger(opts.position) ? i === opts.position : c.id === opts.position) {
          $(el)[`insert${opts.before ? 'Before' : 'After'}`](c);
        }
      });
    }

    comp.mount("#g3w-sidebarcomponent-placeholder");

    // set component click handler
    comp.click = ({ open = false } = {}) => {
      $(comp.getInternalComponent().$el).siblings('a').click();
      comp.setOpen(open || false);
    };

    return true;
  }

  /**
   * get component by id
   */
  getComponent(id) {
    return this.state.components.find(c => c.getId() === id)
  }

  /**
   * close for the moment only conlapsbale
   */
  closeOpenComponents() {
    this.state.components.forEach(c => c.getOpen() && c.state.closewhenshowviewportcontent && c.collapsible && c.click({ open: false }))
  }

  reloadComponents() {
    // force close of the panel
    this.closePanel();
    this.state.components.forEach(c => { if (c.collapsible && c.state.open) { c.click({open: false}); } component.reload(); })
  }

  /**
   * remove component 
   */
  removeComponent(comp, opts = {}) {
    this.state.components.forEach((c, i) => {
      if (comp === c) {
        comp.unmount();
        this.state.components.splice(i, 1);
        if (undefined !== opts.position && Number.isInteger(opts.position)) {
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
  async showPanel(panel, opts = {}) {
    this.state.gui.title = panel.title;
    const data           = this.stack.getCurrentContentData();
    if (data) {
      $(data.content.internalPanel.$el).hide();
    } 
    return await this.stack.push(panel, { parent: '#g3w-sidebarpanel-placeholder', ...opts });
  }

  /**
   * close panel
   */
  closePanel() {
    this.stack.pop().then(content => {
      content = null;
      const data = this.stack.getCurrentContentData();
      if (data) {
        $(data.content.internalPanel.$el).show();
        this.state.gui.title = data.content.title;
      }
    });
  }

})();