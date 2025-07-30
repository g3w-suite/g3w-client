/**
 * @file ORIGINAL SOURCE: src/app/core/layers/layersstore.js@v3.10.2
 * @since 3.11.0
 */

import G3WObject          from 'g3w-object';

export class LayersStore extends G3WObject {

  constructor(config = {}) {
    super();

    this.config = {
      id:         config.id || Date.now(),
      projection: config.projection,
      extent:     config.extent,
      initextent: config.initextent,
      wmsUrl:     config.wmsUrl,
      catalog:    config.catalog ?? true
    };

    this.state = {
      layerstree: [],
      relations:  null
    };

    this._isQueryable = config.queryable ?? true;

    this._layers = this.config.layers || {};

    this.setters = [
      'setLayerSelected',
      'addLayers',
      'addLayer',
      'removeLayer',
    ];
  }

  /**
   * @since 4.0.0 
   */
  setLayerSelected(id, selected) {
    this.getLayers().forEach(l => l.state.selected = (id === l.getId()) ? selected : false);
  }

  /**
   * @since 4.0.0 
   */
  addLayers(layers = []) {
    layers.forEach(l => this.addLayer(l))
  }

  /**
   * @since 4.0.0 
   */
  addLayer(layer) {
    this._layers[layer.getId()] = layer;
  }

  /**
   * @since 4.0.0 
   */
  removeLayer(layer) {
    delete this._layers[layer.getId()];
  }

  isQueryable() {
    return this._isQueryable;
  }

  /**
   *
   * @param { Boolean } bool
   */
  setQueryable(bool) {
    this._isQueryable = !!bool;
  }

  showOnCatalog() {
    return this.config.catalog;
  }

  setOptions(config = {}) {
    this.config = config;
  }

  getId() {
    return this.config.id;
  }

  removeLayers() {
    Object
      .entries(this._layers)
      .forEach(([_, layer]) => this.removeLayer(layer))
  }

  getLayersDict(filter = {}, options = {}) {

    // skip when no filter is provided (eg. `filter = null`)
    if (
      !filter ||
      [
        filter.PRINTABLE,
        filter.QUERYABLE,
        filter.FILTERABLE,
        filter.EDITABLE,
        filter.VISIBLE,
        filter.SELECTED,
        filter.CACHED,
        filter.SELECTED_OR_ALL,
        filter.SERVERTYPE,
        filter.BASELAYER,
        filter.GEOLAYER,
        filter.VECTORLAYER,
        filter.HIDDEN,
        filter.DISABLED,
        filter.IDS,
      ].every(f => undefined === f)
    ) {
      return this._layers;
    }

    let layers = Object.values(this._layers);

    if (filter.IDS) {
      const ids = [].concat(filter.IDS);
      layers = layers.filter(l => ids.includes(l.getId()));
    }

    // check if there are `selected` layers otherwise get all `layers`
    if (filter.SELECTED_OR_ALL) {
      const selected = layers.filter(l => l.isSelected());
      layers         = selected.length > 0 ? selected : layers;
    }

    // checks if a boolean filter is setted
    const has = f => 'boolean' === typeof f;

    if (has(filter.SELECTED) && !filter.SELECTED_OR_ALL)                    layers = layers.filter(l => filter.SELECTED    === l.isSelected());
    if (has(filter.QUERYABLE))                                              layers = layers.filter(l => filter.QUERYABLE   === l.isQueryable());
    if (has(filter.FILTERABLE))                                             layers = layers.filter(l => filter.FILTERABLE  === l.isFilterable(options.filtrable || null));
    if (has(filter.EDITABLE))                                               layers = layers.filter(l => filter.EDITABLE    === l.isEditable());
    if (has(filter.VISIBLE))                                                layers = layers.filter(l => filter.VISIBLE     === l.isVisible());
    if (has(filter.CACHED))                                                 layers = layers.filter(l => filter.CACHED      === l.isCached());
    if (has(filter.BASELAYER))                                              layers = layers.filter(l => filter.BASELAYER   === l.isBaseLayer());
    if (has(filter.GEOLAYER))                                               layers = layers.filter(l => filter.GEOLAYER    === l.isGeoLayer());
    if (has(filter.VECTORLAYER))                                            layers = layers.filter(l => filter.VECTORLAYER === l.isType('vector'));
    if (has(filter.HIDDEN))                                                 layers = layers.filter(l => filter.HIDDEN      === l.isHidden());
    if (has(filter.DISABLED))                                               layers = layers.filter(l => filter.DISABLED    === l.isDisabled());
    if ('string'  === typeof filter.SERVERTYPE && filter.SERVERTYPE.length) layers = layers.filter(l => filter.SERVERTYPE  === l.getServerType());
    if (filter.PRINTABLE)                                                   layers = layers.filter(l => l.isGeoLayer() && l.isPrintable({ scale: filter.PRINTABLE.scale }));

    /**@since v3.10.3 order TOC */
    if (options.TOC_ORDER && this.state.layerstree) {
      // get all siblings children layers id
      let nodes = [];
      let traverse = tree => {
        tree.nodes.forEach(n => {
          if (n.id) { nodes.push(n.id) }
          else { traverse(n) }
        });
      };
      traverse(this.state.layerstree[0]);
      return nodes.map(id => layers.find(l => id === l.getId())).filter(id => id);
    }

    return layers;
  }

  // return layers array
  getLayers(filter = {}, options = {}) {
    return Object.values(this.getLayersDict(filter, options));
  }

  getBaseLayers() {
    return this.getLayersDict({ BASELAYER: true });
  }

  getLayerById(id) {
    return this.getLayersDict()[id];
  }

  getLayerByName(name) {
    return this._layers.find(l => name === l.getName());
  }

  getLayerAttributes(id) {
    return this.getLayerById(id).getAttributes();
  }

  getLayerAttributeLabel(id, name) {
    return this.getLayerById(id).getAttributeLabel(name);
  }

  getGeoLayers() {
    return this.getLayers({ GEOLAYER: true })
  }

  selectLayer(id, selected) {
    this.setLayerSelected(id, selected);
  }

  getProjection() {
    return this.config.projection;
  }

  getExtent() {
    return this.config.extent;
  }

  getInitExtent() {
    return this.config.initextent;
  }

  getWmsUrl() {
    return this.config.wmsUrl;
  }

  removeLayersTree() {
    this.state.layerstree.splice(0, this.state.layerstree.length);
  }

  getLayersTree() {
    return this.state.layerstree;
  }

}

