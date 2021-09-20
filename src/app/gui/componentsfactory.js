const Component = require('./vue/component');
const ComponentsFactory = {
  build({vueComponentObject, service, propsData}, options={}) {
    const component = new Component(options);
    component.init({
      vueComponentObject,
      service,
      propsData
    });
    return component
  }
};

module.exports = ComponentsFactory;
