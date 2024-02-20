import Component         from 'core/g3w-component';
import G3WObject         from 'core/g3w-object';
import ProjectsRegistry  from 'store/projects';
import GUI               from 'services/gui';
import { noop }          from 'utils/noop';

import * as MetadataComp from 'components/Metadata.vue';
import MetadataProjComp  from 'components/MetadataProject.vue';

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

  const service              = opts.service || new G3WObject();
  service.state              = state;
  service.content            = null;
  service.show               = false;
  service.getProjectMetadata = () => state;
  service.getLayersMetadata  = () => state.groups.layers;
  service.getLayerMetadata   = id => state.groups.layers.filter(l => l.id === id)[0];

  service.showMetadata = b => {
    service.show = b;
    if (service.show) {
      service.content        = new Component({ service, internalComponent: new (Vue.extend(MetadataProjComp))({ state }) });
      service.content.layout = noop;
      GUI.setContent({ content: service.content, title: "sdk.metadata.title", perc: 100 });
      service.show = true;
    } else {
      GUI.closeContent()
    }
  }

  service.reload = (emit = true) => {
    if (emit) {
      service.emit('reload');
    }
    const project = ProjectsRegistry.getCurrentProject().getState();
    state.name = project.title;
    const groups = {};
    Object.entries({
      general: ['title', 'name', 'description', 'abstract', 'keywords', 'fees', 'accessconstraints', 'contactinformation', 'wms_url'],
      spatial: ['crs', 'extent'],
      layers: ['layers']
    }).forEach(([groupName, value]) => {
      groups[groupName] = {};
      value.forEach(field => {
        const fieldValue = project.metadata && project.metadata[field] ? project.metadata[field] : project[field];
        if (!!fieldValue) {
          groups[groupName][field] = {
            label: ['sdk','metadata','groups', groupName, 'fields', field].join('.'),
            value: fieldValue
          }
        }
      })
    });
    state.groups = groups;
  };

  // build project group metadata
  service.reload(false);

  const comp = new Component({
    ...opts,
    title: 'sdk.metadata.title',
    service,
    internalComponent: new (Vue.extend(MetadataComp))({ service }),
  });

  comp._service.on('reload', () => { comp.setOpen(false); });

  comp._setOpen = b => { comp._service.showMetadata(b); };

  GUI.on('closecontent', () => { comp.state.open = false; })

  return comp;
};