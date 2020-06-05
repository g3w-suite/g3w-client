const Component = require('./vue/component');
const ComponentsFactory = {
  build({vueComponentObject, service}, options={}) {
    const component = new Component(options);
    component.init({
      vueComponentObject,
      service
    });
    return component
  }
};

module.exports = ComponentsFactory;
