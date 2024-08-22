import Component         from 'core/g3w-component';
import G3WObject         from 'core/g3w-object';
import ProjectsRegistry  from 'store/projects';
import GUI               from 'services/gui';
import { noop }          from 'utils/noop';

import * as MetadataComp from 'components/Metadata.vue';
import MetadataProjComp  from 'components/MetadataProject.vue';

const GROUPS = {
  general: ['title', 'name', 'description', 'abstract', 'keywords', 'fees', 'accessconstraints', 'contactinformation', 'wms_url'],
  spatial: ['crs', 'extent'],
  layers: ['layers'],
};

/**
 * ORIGINAL SOURCE:
 * - src/app/gui/metadata/vue/metadata.js@v3.9.3
 * - src/app/gui/metadata/metadataservice.js@v3.9.3
 */
export default function(opts) {

  const state = {
    name: '',
    groups: {}
  };

  const comp = new Component({
    ...opts,
    title: 'sdk.metadata.title',
    service: Object.assign(opts.service || new G3WObject(), {
      state,
      content: null,
      show: false,
      reload(emit = true) {
        if (emit) {
          comp.getService().emit('reload');
        }
        const project = ProjectsRegistry.getCurrentProject().getState();
        state.name    = project.title;
        state.groups  = Object.entries(GROUPS).reduce((g, [name, fields]) => {
          g[name] = fields.reduce((f, field) => {
            const value = project.metadata && project.metadata[field] ? project.metadata[field] : project[field];
            if (value) {
              f[field] = { value, label: `sdk.metadata.groups.${name}.fields.${field}` };
            }
            return f;
          }, {});
          return g;
        }, {});
      }
    }),
    vueComponentObject: MetadataComp,
  });

  // build project group metadata
  comp.getService().reload(false);
  comp.getService().on('reload', () => comp.setOpen(false));

  // show metadata
  comp._setOpen = b => {
    const service = comp.getService();
    service.show = b;
    if (b) {
      service.content        = new Component({ service, internalComponent: new (Vue.extend(MetadataProjComp))({ state }) });
      service.content.layout = noop;
      GUI.setContent({ content: service.content, title: 'sdk.metadata.title', perc: 100 });
      service.show = true;
    } else {
      GUI.closeContent()
    }
  };

  GUI.on('closecontent', () => comp.state.open = false);

  return comp;
};