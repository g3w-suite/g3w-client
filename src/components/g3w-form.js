/**
 * @file
 * @since 3.10.0
 */

import Component    from 'core/g3w-component';
import GUI          from 'services/gui';

import * as vueComp from 'components/Form.vue';
import BodyFormComp from 'components/FormBody.vue';

const Service  = require('gui/form/formservice');

/**
 * ORIGINAL SOURCE: src/app/gui/form/vue/form.js@v3.9.3 
 */
export default class FormComponent extends Component {
  constructor(opts={}) {
    super({
      ...opts,
      id: opts.id || 'form',
      perc: null !== opts.layer.getFormPercentage() ? opts.layer.getFormPercentage() : opts.perc,
      service: new (opts.service || Service)(),
      vueComponentObject: opts.vueComponentObject || vueComp,
    });

    // set element of the form
    const components = opts.components || [{
      id: opts.id,
      title: opts.title,
      name: opts.name,
      root: true,
      component: BodyFormComp,
      headerComponent: opts.headerComponent
    }];

    this.getService().addComponents(components);
    this.getService().setComponent(components[0].component);

    this.onafter('mount', () => GUI.setModal(true))
  }

  /**
   * Used to add component to form body
   * @param component
   */
  addBodyFormComponent({component, where='after'}={}){
    this.getInternalComponent().body.components[where].push(component);
  };

  addBodyFormComponents({components=[], where="after"}={}){
    components.forEach(component => this.addBodyFormComponent({
      component,
      where
    }))
  };

  addFormComponents(components = []) {
    this.getService().addComponents(components);
  };

  addFormComponent(component) {
    component && this.getService().addComponent(component)
  };
  // some utilities methods
  addDependecyComponents(components) {
    this.getService().addDependecyComponents(components)
  };

  // overwrite father mount method.
  mount(parent, append) {
    return super.mount(parent, append)
      .then(() => {
        // set a modal window to true
        GUI.setModal(true);
      });
  };

  layout() {
    this.getInternalComponent().reloadLayout();
  };

};