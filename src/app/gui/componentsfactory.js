import GUI from 'gui/gui';
import Component from './vue/component';

const ComponentsFactory = {
  // build a componet
  build({ vueComponentObject, service, propsData }, options = {}) {
    const component = new Component(options);
    component.init({
      vueComponentObject,
      service,
      propsData,
    });
    return component;
  },
  // buildSidebarComponent and add to sidebar
  buildSidebar({ vueComponentObject, service, propsData }, options = {}) {
    const {
      id,
      title,
      open = false,
      collapsible = true,
      isolate = false,
      mobile = true,
      iconConfig = {},
      events = {},
      sidebarOptions = { position: 1 },
    } = options;

    const component = this.build({ vueComponentObject }, {
      id,
      title,
      open,
      collapsible,
      isolate,
      iconColor: iconConfig.color && iconConfig.color,
      icon: iconConfig.icon && GUI.getFontClass(iconConfig.icon),
      mobile,
      events,
    });

    GUI.addComponent(component, 'sidebar', sidebarOptions);
    return component;
  },
};

export default ComponentsFactory;
