/**
 * @file
 * @since 3.10.0
 */

import Component    from 'core/g3w-component';
import GUI          from 'services/gui';
import { noop }     from 'utils/noop';

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

  comp.getService().addComponents(components);
  comp.getService().setComponent(components[0].component);

  // add component to form body
  comp.addBodyFormComponent     = (c = {}) => { comp.getInternalComponent().body.components[c.where || 'after'].push(c.component); };
  comp.addBodyFormComponents    = (c = {}) => { (c.components || []).forEach(c => comp.addBodyFormComponent({ component: c, where: c.where || 'after' })) };
  comp.addFormComponents        = (c = []) => { comp.getService().addComponents(c); };
  comp.addFormComponent         = c => { c && comp.getService().addComponent(c) };
  comp.addDependecyComponents   = c => { comp.getService().addDependecyComponents(c) };
  comp.layout                   = () => { comp.internalComponent.reloadLayout(); };
  comp.addComponentBeforeBody   = noop;
  comp.addComponentAfterBody    = noop;
  comp.addComponentBeforeFooter = noop;
  comp.addComponentAfterFooter  = noop;

  // set modal window to true
  comp.onafter('mount', () => GUI.setModal(true));

  return comp;
};