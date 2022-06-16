import ApplicationState from 'core/applicationstate';
import { t } from 'core/i18n/i18n.service';
import { barstack as Stack } from 'gui/utils/utils';
import G3WObject from 'core/g3wobject';
import templateSidebar from './sidebar.html';
import templateSidebarItem from './sidebar-item.html';

const SIDEBAREVENTBUS = new Vue();

// sidebar item is a <li> dom element of the sidebar . Where is possible set
// title, icon type etc ..  is possible to customize component
const SidebarItem = Vue.extend({
  template: templateSidebarItem,
  data() {
    return {
      info: this.$options.info || {
        state: null,
        style: null,
        class: null,
      },
      main: true,
      component: this.$options.component,
      active: false,
      title: '',
      open: false,
      icon: null,
      iconColor: null,
      collapsible: null,
    };
  },
  methods: {
    onClickItem(evt) {
      // force to close
      this.component.isolate && evt.stopPropagation();
      if (!this.component.isolate) {
        // set state of opened component
        this.$options.service.state.components.forEach((component) => {
          if (component !== this.component) {
            if (component.getOpen()) {
              component.click({
                open: component.isolate,
              });
            }
          }
        });
        !this.component.collapsible && isMobile.any && SIDEBAREVENTBUS.$emit('sidebaritemclick');
      }
      this.component.setOpen(!this.component.state.open);
    },
  },
  created() {
    this.component.openClose = () => this.$refs.anchor_click.click();
  },
  async mounted() {
    await this.$nextTick();
    $('.sidebaritem .action[data-toggle="tooltip"]').tooltip();
  },
});

class SidebarService extends G3WObject {
  constructor() {
    // set setter for close sidebarpanel to catch event
    // of closing panel of the sidebar
    super({
      setters: {
        closeSidebarPanel() {},
        openCloseItem(bool) {},
      },
    });
    // set sidebar stack
    this.stack = new Stack();
    // service state
    this.state = {
      components: [],
      gui: {
        title: '',
      },
      disabled: false,
    };
  }

  // inizialize method
  init(layout) {
    this.layout = layout;
  }

  // add component to sidebar
  addComponents(components, options = {}) {
    // for each component of the sidebar it is call addComponent method
    components.forEach((component) => this.addComponent(component, options));
    return true;
  }

  // add each component to the sidebar
  // add also position insiede the sidebar
  addComponent(component, options = {}) {
    const { position, before = true, info } = options;
    if (isMobile.any && !component.mobile) {
      return false;
    }
    const sidebarItem = new SidebarItem({
      service: this,
      info,
      component,
    });
    sidebarItem.title = component.title || sidebarItem.title;
    sidebarItem.info = component.info || sidebarItem.info;
    sidebarItem.actions = component.actions || sidebarItem.actions;
    sidebarItem.open = component.state.open; // (component.open === undefined) ? sidebarItem.open : component.open;
    sidebarItem.icon = component.icon || sidebarItem.icon;
    sidebarItem.iconColor = component.iconColor;
    sidebarItem.state = component.state || true;
    sidebarItem.collapsible = (typeof component.collapsible === 'boolean') ? component.collapsible : true;
    sidebarItem.isolate = (typeof component.isolate === 'boolean') ? component.isolate : false;
    // append component to  g3w-sidebarcomponents (template sidebar.html)
    const DOMComponent = sidebarItem.$mount().$el;
    this.state.components.push(component);
    const isPanelSidebarShow = $('.g3w-sidebarpanel').is(':visible');
    const sidebarcomponetsdomid = `#g3w-sidebarcomponents${isPanelSidebarShow ? ':hidden' : ''}`;
    const children = $(sidebarcomponetsdomid).children().filter(function () {
      return this.style.display !== 'none';
    });
    const childrenLength = children.length;
    if (position === null || position === undefined || position < 0 || position >= childrenLength) $(sidebarcomponetsdomid).append(DOMComponent);
    else {
      children.each((index, element) => {
        const findElementIndexId = Number.isInteger(position) ? position === index : element.id === position;
        findElementIndexId && $(DOMComponent)[`insert${before ? 'Before' : 'After'}`](element);
      });
    }
    // mount componet to g3w-sidebarcomponent-placeholder (template sidebar-item.html);
    component.mount('#g3w-sidebarcomponent-placeholder');
    // check if componentonent has iniService method
    component.initService && component.initService();
    // add click handler
    this.setComponentClickHandler(component);
    return true;
  }

  setComponentClickHandler(component) {
    component.click = ({ open = false } = {}) => {
      open = open || false;
      $(component.getInternalComponent().$el).siblings('a').click();
      component.setOpen(open);
    };
  }

  // get component by id
  getComponent(id) {
    return this.state.components.find((component) => component.getId() === id);
  }

  // get all components
  getComponents() {
    return this.state.components;
  }

  /**
   * close for the moment only conlapsbale
   */
  closeOpenComponents(collapsible = true) {
    this.getComponents().forEach((component) => component.closeWhenViewportContentIsOpen() && component.collapsible && component.click({ open: false }));
  }

  reloadComponent(id) {
    const component = this.getComponent(id);
    component && component.reload();
  }

  reloadComponents() {
    // force close of the panel
    this.closePanel();
    this.state.components.forEach((component) => {
      if (component.collapsible && component.state.open) component.click({ open: false });
      component.reload();
    });
  }

  // remove component
  removeComponent(component, options = {}) {
    const { position } = options;
    this.state.components.forEach((sidebarComponent, index) => {
      if (component === sidebarComponent) {
        component.unmount();
        this.state.components.splice(index, 1);
        if (position !== undefined && Number.isInteger(position)) $('#g3w-sidebarcomponents').children(':visible')[position].remove();
        else $('#g3w-sidebarcomponents').children(`#${component.id}`).remove();
        return false;
      }
    });
  }

  // show panel on stack
  showPanel(panel, options = {}) {
    return new Promise((resolve, reject) => {
      this.state.gui.title = panel.title;
      const parent = '#g3w-sidebarpanel-placeholder';
      this.stack.getCurrentContentData() && $(this.stack.getCurrentContentData().content.internalPanel.$el).hide();
      this.stack.push(panel, {
        parent,
        ...options,
      }).then((content) => resolve(content));
    });
  }

  // close panel
  closePanel() {
    this.state.gui.title = null;
    this.closeSidebarPanel();
    this.stack.pop().then((content) => {
      content = null;
      this.stack.getCurrentContentData() && $(this.stack.getCurrentContentData().content.internalPanel.$el).show();
    });
  }

  closeAllPanels() {
    this.state.gui.title = null;
    this.closeSidebarPanel();
    this.stack.clear();
  }
}

const sidebarService = new SidebarService();
const SidebarComponent = Vue.extend({
  template: templateSidebar,
  data() {
    	return {
      components: sidebarService.state.components,
      panels: sidebarService.stack.state.contentsdata,
      bOpen: true,
      bPageMode: false,
      header: t('main navigation'),
      state: sidebarService.state,
    };
  },
  computed: {
    disabled() {
      return ApplicationState.gui.sidebar.disabled;
    },
    panelsinstack() {
      return this.panels.length > 0;
    },
    showmainpanel() {
      return this.components.length > 0 && !this.panelsinstack;
    },
    componentname() {
      return this.components.length ? this.components.slice(-1)[0].getTitle() : '';
    },
    panelname() {
      let name = '';
      if (this.panels.length) {
        name = this.panels.slice(-1)[0].content.getTitle();
      }
      return name;
    },
  },
  methods: {
    closePanel() {
      sidebarService.closePanel();
    },
    closeAllPanels() {
      sidebarService.closeAllPanels();
    },
  },
  created() {
    this.iframe = ApplicationState.iframe;
    SIDEBAREVENTBUS.$on('sidebaritemclick', () => $('.sidebar-toggle').click());
  },
});

export default {
  SidebarService: sidebarService,
  SidebarComponent,
};
