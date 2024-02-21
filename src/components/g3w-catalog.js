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

import * as catalogComp            from 'components/Catalog.vue';
import * as LayersComp             from 'components/CatalogLayersGroup.vue';
import * as TreeComp               from 'components/CatalogTristateTree.vue';
import * as LegendComp             from 'components/CatalogLayersLegend.vue';
import * as LegendItemsComp        from 'components/CatalogLayersLegendItems.vue';

Vue.component('g3w-catalog', catalogComp);
Vue.component('layers-group', LayersComp);
Vue.component('tristate-tree', TreeComp);
Vue.component('layerslegend', LegendComp);
Vue.component('layerslegend-items', LegendItemsComp);

/**
 * ORIGINAL SOURCE:
 * - src/app/gui/catalog/vue/catalog.js@v3.9.3
 * - src/app/gui/catalog/catalogservice.js@v3.9.3
 */
export default function(opts = {}) {

  const catalog = CatalogLayersStoresRegistry;

  const state = {
    prstate: ProjectsRegistry.state,
    highlightlayers: false,
    external: {  // external layers
      wms: [],   // added by wms sidebar component
      vector: [] // added to map controls for the moment
    },
    layerstrees: [],
    layersgroups: []
  };

  const service = opts.service || new G3WObject({ setters: {
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
      state.external[type].forEach(l => { if (undefined !== l.selected) l.selected = l === layer ? selected : false; })
      // state.external[type].forEach(l => { l.selected = (undefined === l.selected ? l.selected : (l === layer ? selected : false)); })
    },
  }});

  service.state                       = state;
  service.createLayersGroup           = ({ title = 'Layers Group', layers = [] } = {}) => ({ title, nodes: layers.map(l => l) });
  service.getExternalLayers           = ({ type = 'vector' })     => state.external[type];
  service.getExternalSelectedLayers   = ({ type = 'vector' })     => state.external[type].filter(l => l.selected);
  service.getExternalLayerById        = ({ id, type = 'vector' }) => state.external[type].find(l => l.id === id);
  service.isExternalLayerSelected     = l => !!(service.getExternalLayerById(l) && service.getExternalLayerById(l).selected);
  service.addLayersGroup              = g => { state.layersgroups.push(g); };
  service.addLayersStoreToLayersTrees = s => { state.layerstrees.push({ tree: s.getLayersTree(), storeid: s.getId() }); };
  service.changeMapTheme              = async map_theme => {
    ApplicationService.changeProjectView(true);
    const rootNode = state.layerstrees[0];
    rootNode.checked = true;
    const changes = await ProjectsRegistry.getCurrentProject().setLayersTreePropertiesFromMapTheme({ map_theme, rootNode, layerstree: rootNode.tree[0].nodes });
    ApplicationService.changeProjectView(false);
    return changes;
  };

  // add layers stores to tree
  catalog.getLayersStores().forEach(service.addLayersStoreToLayersTrees);
  catalog.onafter('addLayersStore', service.addLayersStoreToLayersTrees);
  catalog.onafter('removeLayersStore', s => {
    const i = state.layerstrees.findIndex(t => t.storeid === s.getId());
    if (-1 !== i) {
      state.layerstrees.splice(i, 1);
    }
  });
  catalog.onafter('removeLayersStores', () => {
    state.layerstrees.forEach((_, i) => { state.layerstrees.splice(i, 1); });
  });

  const comp = new Component({
    ...opts,
    title: 'catalog',
    resizable: true,
    service,
    internalComponent: new (Vue.extend(catalogComp))({ service, legend: opts.config.legend }),
  });

  _listenToMapVisibility(opts.mapcomponentid);

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
    const ctx = map.getService();
    component.state.visible = !ctx.state.hidden;
    ctx.onafter('setHidden', () => { component.state.visible = !ctx.state.hidden; component.state.expanded = true; });
  };

  if (map) {
    cb(map);
  } else {
    ComponentsRegistry.on('componentregistered', c => c.getId() === map_id && cb(c))
  }
}