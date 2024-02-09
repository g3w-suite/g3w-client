/**
 * @file
 * @since 3.10.0
 */

import GUI                         from 'services/gui';
import ComponentsRegistry          from 'store/components';
import Component                   from 'core/g3w-component';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import ProjectsRegistry            from 'store/projects';
import ApplicationService          from 'services/application';

import * as catalogComp            from 'components/Catalog.vue';
import * as LayersComp             from 'components/CatalogLayersGroup.vue';
import * as TreeComp               from 'components/CatalogTristateTree.vue';
import * as LegendComp             from 'components/CatalogLayersLegend.vue';
import * as LegendItemsComp        from 'components/CatalogLayersLegendItems.vue';

const { base, inherit }            = require('utils');
const G3WObject                    = require('core/g3wobject');

Vue.component('g3w-catalog', catalogComp);
Vue.component('layers-group', LayersComp);
Vue.component('tristate-tree', TreeComp);
Vue.component('layerslegend', LegendComp);
Vue.component('layerslegend-items', LegendItemsComp);

/**
 * ORIGINAL SOURCE: src/app/gui/catalog/vue/catalog.js@v3.9.3 
 */
export default function(opts = {}) {

  const service = opts.service || new CatalogService();

  const comp = new Component({
    ...opts,
    title: "catalog",
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

/**
 * ORIGINALE SOURCE: src/app/gui/catalog/catalogservice.js@v3.9.3
 */
function CatalogService() {
  this.state = {
    prstate: ProjectsRegistry.state,
    highlightlayers: false,
    external: {
      wms: [], // added by wms cside bar component
      vector: [] // added to map controls for the moment
    },
    layerstrees: [],
    layersgroups: []
  };

  this.setters = {

    /**
     * @param {{ layer: unknown, type: 'vector' }}
     * 
     * @fires CatalogService~addExternalLayer
     * 
     * @since 3.8.0
     */
    addExternalLayer({layer, type='vector'} = {}) {
      layer.removable = true;
      this.state.external[type].push(layer);
    },

    /**
     * @param {{ name: string, type: 'vector' }}
     * 
     * @fires CatalogService~removeExternalLayer
     * 
     * @since 3.8.0
     */
    removeExternalLayer({name, type='vector'} = {}) {
      this.state.external[type].filter((layer, index) => {
        if (layer.name === name) {
          this.state.external[type].splice(index, 1);
          return true
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
    setSelectedExternalLayer({layer, type, selected}) {
      this.state.external[type].forEach(externalLayer => {
        if (typeof externalLayer.selected != "undefined")
          externalLayer.selected = (layer === externalLayer) ? selected : false;
      })
    },

  };

  base(this);

  const layersStores = CatalogLayersStoresRegistry.getLayersStores();

  layersStores.forEach(layersStore => this.addLayersStoreToLayersTrees(layersStore));

  CatalogLayersStoresRegistry.onafter('addLayersStore', layersStore => {
    this.addLayersStoreToLayersTrees(layersStore)
  });

  CatalogLayersStoresRegistry.onafter('removeLayersStore', layersStore => {
    this.state.layerstrees.find((layersTree, idx) => {
      if (layersTree.storeid === layersStore.getId()) {
        this.state.layerstrees.splice(idx, 1);
        return true;
      }
    });
  });
  CatalogLayersStoresRegistry.onafter('removeLayersStores', () => {
    this.state.layerstrees.forEach((layersTree, idx) => {
      this.state.layerstrees.splice(idx, 1);
    });
  });
}

inherit(CatalogService, G3WObject);

const proto = CatalogService.prototype;

proto.createLayersGroup = function({title = 'Layers Group', layers =[]} = {}) {
  const nodes = [];
  layers.forEach(layer => nodes.push(layer));
  return {
    title,
    nodes
  }
};

proto.getMajorQgisVersion = function() {
  return ProjectsRegistry.getCurrentProject().getQgisVersion({
    type: 'major'
  });
};

// method to add a custom layers group
proto.addLayersGroup = function(layersGroup) {
  this.state.layersgroups.push(layersGroup);
};

proto.addLayersStoreToLayersTrees = function(layersStore) {
  this.state.layerstrees.push({
    tree: layersStore.getLayersTree(),
    storeid: layersStore.getId()
  });
};

proto.changeMapTheme = async function(map_theme) {
  // set is changing project view
  ApplicationService.changeProjectView(true);
  const {currentProject} = this.state.prstate;
  const rootNode = this.state.layerstrees[0];
  rootNode.checked = true;
  const layerstree = rootNode.tree[0].nodes;
  const changeMapThemeProjectObj = await currentProject.setLayersTreePropertiesFromMapTheme({
    map_theme,
    layerstree,
    rootNode
  });
  ApplicationService.changeProjectView(false);
  return changeMapThemeProjectObj;
};

/**
 * @param {{ type: 'vector' }}
 * 
 * @returns {unknown}
 * 
 * @since 3.8.0
 */
proto.getExternalLayers = function({type='vector'}) {
  return this.state.external[type];
};

/**
 * @param {{ type: 'vector' }}
 * 
 * @returns {unknown}
 * 
 * @since 3.8.0
 */
proto.getExternalSelectedLayers = function({type='vector'}) {
  return this.getExternalLayers({type}).filter(layer => layer.selected);
};

/**
 * @param {{ id: string, type: 'vector' }}
 * 
 * @returns {unknown}
 * 
 * @since 3.8.0
 */
proto.getExternalLayerById = function({id, type='vector'}) {
  return this.state.external[type].find(layer => layer.id === id);
};

/**
 * @param {{ id: string, type: unknown }}
 * 
 * @returns {boolean}
 * 
 * @since 3.8.0
 */
proto.isExternalLayerSelected = function({id, type}) {
  const externalLayer = this.getExternalLayerById({ id, type });
  return !!(externalLayer && externalLayer.selected);
};