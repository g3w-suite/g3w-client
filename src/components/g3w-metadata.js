import * as MetadataComp from 'components/Metadata.vue';
import MetadataProjComp  from 'components/MetadataProject.vue';
import Component         from 'core/g3w-component';
import ProjectsRegistry  from 'store/projects';
import GUI               from 'services/gui';
const G3WObject          = require('core/g3wobject');
const { noop }           = require('utils');

/**
 * ORIGINAL SOURCE:
 * - src/app/gui/metadata/vue/metadata.js@v3.9.3
 * - src/app/gui/metadata/metadataservice.js@v3.9.3
 */
export default function(opts) {

  const service = opts.service || new (class extends G3WObject {
    constructor() {
      super();
      this.content = null;
      this.show = false;
      this.state = {
        name: '',
        groups: {}
      };
      this.getProjectMetadata = () => this.state;
      this.getLayersMetadata  = () => this.state.groups.layers;
      this.getLayerMetadata   = id => this.state.groups.layers.filter(l => l.id === id)[0];
      this.showMetadata = b => {
        this.show = b;
        if (this.show) {
          this.content = new Component({ service: this, internalComponent: new (Vue.extend(MetadataProjComp))({ state: this.getProjectMetadata() }) });
          this.content.layout = noop;
          GUI.setContent({ content: this.content, title: "sdk.metadata.title", perc: 100 });
          this.show = true;
        } else {
          GUI.closeContent()
        }
      }
      this._buildProjectGroupMetadata = function() {
        const project = ProjectsRegistry.getCurrentProject().getState();
        this.state.name = project.title;
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
        this.state.groups = groups;
      };
      this.reload = () => {
        this.emit('reload');
        this._buildProjectGroupMetadata();
      };
      this._buildProjectGroupMetadata();
    }
  })(opts);

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