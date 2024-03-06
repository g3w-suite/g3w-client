/**
 * @file
 * @since 3.10.0
 */

import G3WObject                   from 'core/g3w-object';
import Component                   from 'core/g3w-component';
import ComponentsRegistry          from 'store/components';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import ProjectsRegistry            from 'store/projects';
import GUI                         from 'services/gui';
import ApplicationService          from 'services/application';

import * as vueComp                from 'components/Catalog.vue';

/**
 * ORIGINAL SOURCE:
 * - src/app/gui/catalog/vue/catalog.js@v3.9.3
 * - src/app/gui/catalog/catalogservice.js@v3.9.3
 */
export default function(opts = {}) {

  console.log(opts);

  const state = {
    prstate: ProjectsRegistry.state,
    highlightlayers: false,
    external: {  // external layers
      wms: [],   // added by wms sidebar component
      vector: [] // added to map controls for the moment
    },
    layerstrees: CatalogLayersStoresRegistry.getLayersStores().map(s => ({ tree: s.getLayersTree(), storeid: s.getId() })),
    layersgroups: [],
    legend: Object.assign(opts.config.legend || {}, { place: ApplicationService.getCurrentProject().getLegendPosition() || 'tab' }),
  };

  const service = opts.service || new G3WObject({
    setters: {
      /**
       * @param {{ layer: unknown, type: 'vector' }}
       *
       * @fires CatalogService~addExternalLayer
       *
       * @since 3.8.0
       */
      addExternalLayer({ layer, type='vector' } = {}) {
        layer.removable = true;
        state.external[type].push(layer);
      },
      /**
       * @param {{ name: string, type: 'vector' }}
       *
       * @fires CatalogService~removeExternalLayer
       *
       * @since 3.8.0
       */
      removeExternalLayer({ name, type='vector' } = {}) {
        state.external[type].filter((l, i) => {
          if (l.name === name) {
            state.external[type].splice(i, 1);
            return true;
          }
        });
      },
      /**
       * @param {{ layer: unknown, type: unknown, selected: unknown }}
       *
       * @fires CatalogService~setSelectedExternalLayer
       *
       * @since 3.8.0
       */
      setSelectedExternalLayer({ layer, type, selected }) {
        state.external[type].forEach(l => { l.selected = (undefined === l.selected ? l.selected : (l === layer ? selected : false)); })
      },
    }
  });

  service.state                       = state;
  service.createLayersGroup           = ({ title = 'Layers Group', layers = [] } = {}) => ({ title, nodes: layers.map(l => l) });
  /** @TODO check if deprecated */
  service.getMajorQgisVersion         = () => ProjectsRegistry.getCurrentProject().getQgisVersion({type: 'major'});
  service.getExternalLayers           = ({ type = 'vector' })     => state.external[type];
  service.getExternalSelectedLayers   = ({ type = 'vector' })     => state.external[type].filter(l => l.selected);
  service.getExternalLayerById        = ({ id, type = 'vector' }) => state.external[type].find(l => l.id === id);
  service.isExternalLayerSelected     = l => !!(service.getExternalLayerById(l) || {}).selected;
  service.addLayersGroup              = g => { state.layersgroups.push(g); };
  /** @TODO check if deprecated */
  service.addLayersStoreToLayersTrees = layersStore => state.layerstrees.push({tree: layersStore.getLayersTree(), storeid: layersStore.getId()});
  service.changeMapTheme              = async map_theme => {
    ApplicationService.changeProjectView(true);
    const rootNode = state.layerstrees[0];
    rootNode.checked = true;
    const changes = await ProjectsRegistry.getCurrentProject().setLayersTreePropertiesFromMapTheme({ map_theme, rootNode, layerstree: rootNode.tree[0].nodes });
    ApplicationService.changeProjectView(false);
    return changes;
  };

  // add layers stores to tree

  CatalogLayersStoresRegistry.onafter('addLayersStore',      s => { state.layerstrees.push({ tree: s.getLayersTree(), storeid: s.getId() }); });
  CatalogLayersStoresRegistry.onafter('removeLayersStore',   s => { const i = state.layerstrees.findIndex(t => t.storeid === s.getId()); if (-1 !== i) { state.layerstrees.splice(i, 1); } });
  CatalogLayersStoresRegistry.onafter('removeLayersStores', () => { state.layerstrees.forEach((_, i) => { state.layerstrees.splice(i, 1); }); });

  const comp = new Component({
    ...opts,
    title: 'catalog',
    resizable: true,
    service,
    vueComponentObject: vueComp,
  });

  _listenToMapVisibility(opts.mapcomponentid, comp);

  return comp;
};

/**
 * @TODO check if deprecated
 */
function _listenToMapVisibility(map_id, component) {
  if(!map_id) {
    return;
  }

  component.mapComponentId = map_id;

  const map = GUI.getComponent(map_id);

  const cb = map => {
    const ms = map.getService();
    component.state.visible = !ms.state.hidden;
    ms.onafter('setHidden', () => { component.state.visible = !ms.state.hidden; component.state.expanded = true; });
  };

  if (map) {
    cb(map);
  } else {
    ComponentsRegistry.on('componentregistered', c => map_id === c.getId() && cb(c));
  }
}