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
 * 
 * Used by the following plugins: "editing", "cadastre", "geonotes", "iternet"  
 */
export default class FormComponent extends Component {
  constructor(opts = {}) {
    super({
      ...opts,
      id:                 opts.id || 'form',
      perc:               null !== opts.layer.getFormPercentage() ? opts.layer.getFormPercentage() : opts.perc,
      service:            new (opts.service || Service)(),
      vueComponentObject: opts.vueComponentObject || vueComp,
    });

    // set element of the form
    const components = opts.components || [{
      id:              opts.id,
      title:           opts.title,
      name:            opts.name,
      root:            true,
      component:       BodyFormComp,
      headerComponent: opts.headerComponent
    }];

    this.getService().addComponents(components);
    this.getService().setComponent(components[0].component);

    this.onafter('mount', () => GUI.setModal(true))
  }

  addFormComponents(c = []) { this.getService().addComponents(c); }
  addFormComponent(c)       { c && this.getService().addComponent(c); }
  layout()                  { this.getInternalComponent().reloadLayout(); }

  /** @TODO check if deprecated */
  addBodyFormComponent(c)   { c && this.getInternalComponent().body.components[c.where || 'after'].push(c.component); };
  /** @TODO check if deprecated */
  addBodyFormComponents(cs) { cs && (cs.components || []).forEach(c => this.addBodyFormComponent({ component: c, where: cs.where || 'after' })); }
  /** @TODO check if deprecated */
  addDependecyComponents(c) { this.getService().addDependecyComponents(c); }
  /** @TODO check if superflous */
  mount(parent, append)     { return super.mount(parent, append).then(() => { GUI.setModal(true); }); }

};