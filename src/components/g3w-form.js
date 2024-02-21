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
export default function(opts = {}) {
  opts.id                 = opts.id || 'form';
  opts.service            = opts.service ? new opts.service : new Service();
  opts.vueComponentObject = opts.vueComponentObject  || vueComp;
  opts.perc               = null !== opts.layer.getFormPercentage() ? opts.layer.getFormPercentage() : opts.perc;
  
  const comp              = new Component(opts);

  comp.init(opts);

  // set element of the form
  const components = opts.components || [{
    id: opts.id,
    title: opts.title,
    name: opts.name,
    root: true,
    component: BodyFormComp,
    headerComponent
  }];

  comp._service.addComponents(components);
  comp._service.setComponent(components[0].component);

  // add component to form body
  comp.addFormComponents = c => comp._service.addComponents(c);
  comp.addFormComponent  = c => comp._service.addComponent(c);
  comp.layout            = () => { comp.internalComponent.reloadLayout(); };

  // set modal window to true
  comp.onafter('mount', () => GUI.setModal(true));

  return comp;
};