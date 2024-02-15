import * as vueComponentOptions from 'components/Form.vue';
import BodyFormComponent from 'components/FormBody.vue';
import GUI from 'services/gui';

const { base, inherit } = require('utils');
const Component = require('gui/component/component');
const Service = require('gui/form/formservice');

function FormComponent(options = {}) {
  const {id='form', name, title, headerComponent} = options;
  base(this, options);
  options.service = options.service ? new options.service : new Service;
  options.vueComponentObject = options.vueComponentObject  || vueComponentOptions;
  //set element of the form
  const components = options.components || [
    {
      id,
      title,
      name,
      root: true,
      component: BodyFormComponent,
      headerComponent
    }
  ];
  options.perc = options.layer.getFormPercentage() !== null ? options.layer.getFormPercentage() : options.perc;
  // initialize component
  this.init(options);
  this.getService().addComponents(components);
  this.getService().setComponent(components[0].component);
  /**
   * Used to add component to form body
   * @param component
   */
  this.addBodyFormComponent = function({component, where='after'}={}){
    this.getInternalComponent().body.components[where].push(component);
  };

  this.addBodyFormComponents = function({components=[], where="after"}={}){
    components.forEach(component =>  this.addBodyFormComponent({
      component,
      where
    }))
  };

  this.addFormComponents = function(components = []) {
    this.getService().addComponents(components);
  };

  this.addFormComponent = function(component) {
    component && this.getService().addComponent(component)
  };
  // some utilities methods
  this.addDependecyComponents = function(components) {
    this.getService().addDependecyComponents(components)
  };
  this.addComponentBeforeBody = function(Component) {
    //this.getService().addedComponentTo('body');
    //this.insertComponentAt(1, Component);
  };

  this.addComponentAfterBody = function(Component) {
    //this.getService().addedComponentTo('body');
    //this.insertComponentAt(2, Component)
  };

  this.addComponentBeforeFooter = function() {
   //TODO
  };

  this.addComponentAfterFooter = function(Component) {
    //TODO
  };
  // overwrite father mount method.
  this.mount = function(parent, append) {
    return base(this, 'mount', parent, append)
    .then(() => {
      // set modal window to true
      GUI.setModal(true);
    });
  };

  this.layout = function() {
    this.internalComponent.reloadLayout();
  };
}

inherit(FormComponent, Component);

module.exports = FormComponent;

