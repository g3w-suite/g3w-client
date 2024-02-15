import * as catalogComponentOptions from 'components/Catalog.vue';
import * as catalogLayersGroupComponentOptions from 'components/CatalogLayersGroup.vue';
import * as catalogTristateTreeComponentOptions from 'components/CatalogTristateTree.vue';
import * as catalogLayersLegendComponentOptions from 'components/CatalogLayersLegend.vue';
import * as catalogLayersLegendItemsComponentOptions from 'components/CatalogLayersLegendItems.vue';

import ComponentsRegistry from 'store/components';
import GUI from 'services/gui';


const { inherit, base } = require('utils');
const Component = require('gui/component/component');
const Service = require('gui/catalog/catalogservice');

const InternalComponent = Vue.extend(catalogComponentOptions);

Vue.component('g3w-catalog', catalogComponentOptions);
Vue.component('layers-group', catalogLayersGroupComponentOptions);
Vue.component('tristate-tree', catalogTristateTreeComponentOptions);
Vue.component('layerslegend', catalogLayersLegendComponentOptions);
Vue.component('layerslegend-items', catalogLayersLegendItemsComponentOptions);

function CatalogComponent(options={}) {
  options.resizable = true;
  base(this, options);
  const {legend}  = options.config;
  this.title = "catalog";
  this.mapComponentId = options.mapcomponentid;
  const service = options.service || new Service;
  this.setService(service);
  this.setInternalComponent(new InternalComponent({
    service,
    legend
  }));
  this.internalComponent.state = this.getService().state;
  let listenToMapVisibility = map => {
    const mapService = map.getService();
    this.state.visible = !mapService.state.hidden;
    mapService.onafter('setHidden', hidden => {
      this.state.visible = !mapService.state.hidden;
      this.state.expanded = true;
    })
  };
  if (this.mapComponentId) {
    const map = GUI.getComponent(this.mapComponentId);
    !map && ComponentsRegistry.on('componentregistered', component =>
      (component.getId() === this.mapComponentId) && listenToMapVisibility(component))
    || listenToMapVisibility(map);
  }
}

inherit(CatalogComponent, Component);

module.exports = CatalogComponent;
