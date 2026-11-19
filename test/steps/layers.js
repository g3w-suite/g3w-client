const assert = require('node:assert/strict');
const { Before, Then } = require('@cucumber/cucumber');

Before({ tags: '@layer-model' }, async function () {
  await this.corePage.evaluate(() => {
    initConfig.baseurl = location.origin + '/';
    window.fixtureRelations = [];
    window.fixtureLayers = {};
    Object.assign(g3w.state.project, {
      state: { WMSUrl: '/ows/', metadata: { wms_url: '/wfs/' }, wms_getmap_format: 'image/png' },
      getType: () => 'qdjango',
      getId: () => 1,
      getProjection: () => ol.proj.get('EPSG:3857'),
      getRelations: () => fixtureRelations,
      getLayerById: id => fixtureLayers[id],
      getLayers: () => Object.values(fixtureLayers),
    });
    window.createFixtureLayer = (config = {}) => {
      const layer = new g3w.Layer({
        id: 'records', name: 'Records', geometrytype: 'NoGeometry',
        servertype: 'QGIS', source: { type: 'postgres' },
        fields: [{ name: 'name', label: 'Name', type: 'string', show: true }],
        styles: [{ name: 'default', current: true }],
        ...config,
      });
      fixtureLayers[layer.getId()] = layer;
      return layer;
    };
  });
});

Then('table metadata and downloads reflect the layer configuration', async function () {
  const result = await this.corePage.evaluate(() => {
    const layer = createFixtureLayer({
      title: 'Records table', capabilities: 7, metadata: { owner: 'Example' },
      editor_form_structure: [{ name: 'Main form' }], customstyle: '#369',
      fields: [
        { name: 'name', label: 'Name', type: 'string', show: true },
        { name: 'geometry', label: 'Geometry', type: 'geometry', show: true },
        { name: 'secret', label: 'Hidden', type: 'string', show: false },
      ],
      download: true, download_gpkg: true, download_gpx: true, download_csv: true,
      download_xls: true, download_pdf: true, featurecount: 12, qtimeseries: false,
    });
    layer.setAttributeTablePageLength(25);
    layer.setUrl({ type: 'data', url: '/fixture/data/' });
    layer.setInfoFormat('application/json');
    layer.setHidden();
    layer.setSelected(true);
    return {
      identity: [layer.getId(), layer.getName(), layer.getTitle(), layer.getServerType(), layer.getSourceType()],
      sameState: layer.getState() === layer.getConfig() && layer.config === layer.getState(),
      sameProject: layer.getProject() === g3w.state.project,
      source: layer.getSource(),
      metadata: layer.getMetadata(), form: layer.getLayerEditingFormStructure(),
      hasForm: layer.hasFormStructure(), customStyle: layer.getCustomStyle(),
      fields: layer.getFields().map(field => field.name),
      shown: layer.getTableFields().map(field => field.name),
      headers: layer.getTableHeaders().map(field => field.name),
      attributes: layer.getAttributes().map(field => field.name), label: layer.getAttributeLabel('name'),
      formats: layer.getDownloadFormats(),
      downloads: [
        layer.isDownloadable(), layer.isGeoTIFFDownloadable(), layer.isShpDownloadable(),
        layer.isXlsDownloadable(), layer.isGpxDownloadable(), layer.isGpkgDownloadable(), layer.isCsvDownloadable(),
      ],
      downloadPaths: [layer.getDownloadUrl('shapefile'), layer.getDownloadUrl('csv')],
      types: [layer.getType(), layer.isType('table'), layer.isTable(), layer.isRaster(), layer.isVector(), layer.isGeoLayer()],
      capabilities: [
        layer.isQueryable(), layer.isFilterable({ servertype: 'QGIS' }),
        layer.isFilterable({ servertype: 'Other' }), layer.isEditable(), layer.isBaseLayer(), layer.isQtimeseries(),
      ],
      search: layer.getSearchParams(), pageLength: layer.getAttributeTablePageLength(),
      dataUrl: layer.getUrl('data'), format: layer.getInfoFormat(), infoFormats: layer.getInfoFormats(),
      hidden: layer.isHidden(), selected: layer.isSelected(), selection: layer.getSelection().active,
      filter: layer.getFilter().active, count: layer.getFeatureCount(),
    };
  });
  assert.deepEqual(result, {
    identity: ['records', 'Records', 'Records table', 'QGIS', 'postgres'],
    sameState: true, sameProject: true, source: { type: 'postgres' }, metadata: { owner: 'Example' },
    form: [{ name: 'Main form' }], hasForm: true, customStyle: '#369',
    fields: ['name', 'geometry', 'secret'], shown: ['name', 'geometry'], headers: ['name'],
    attributes: ['name', 'geometry', 'secret'], label: 'Name',
    formats: ['shapefile', 'gpkg', 'gpx', 'csv', 'xls', 'pdf'],
    downloads: [true, false, true, true, true, true, true], downloadPaths: ['shp', 'csv'],
    types: ['table', true, true, false, false, false],
    capabilities: [true, true, false, true, false, false], search: { I: 0, J: 0 },
    pageLength: 25, dataUrl: '/fixture/data/', format: 'application/json', infoFormats: [],
    hidden: true, selected: true, selection: false, filter: false, count: 12,
  });
});

Then('related layers retain their relation identities fields and hierarchy', async function () {
  const result = await this.corePage.evaluate(() => {
    fixtureRelations.push(
      {
        id: 'inspections', name: 'Inspection records', referencedLayer: 'roads', referencingLayer: 'checks',
        fieldRef: { referencedField: 'id', referencingField: 'road_id' },
        type: 'MANY', editable: true, prefix: 'inspection_',
      },
      {
        id: 'region', name: 'Region', referencedLayer: 'regions', referencingLayer: 'roads',
        fieldRef: { referencedField: 'id', referencingField: 'region_id' }, type: 'ONE',
      },
    );
    createFixtureLayer({ id: 'checks', download_csv: true });
    const layer = createFixtureLayer({
      id: 'roads', relations: [{ name: 'inspections', fields: ['road_id'] }],
    });
    const store = layer.getRelations();
    const relation = layer.getRelationById('inspections');
    const same = store.getRelationByFatherChildren('roads', 'checks') === relation;
    relation.setLoading(true);
    relation.setName('Site visits');
    relation.setTitle('Inspection title');
    relation.setId('renamed');
    return {
      length: store.getLength(), same, found: layer.getRelationById('renamed') === relation,
      one: Object.keys(store.getRelations({ type: 'ONE' })), many: Object.keys(store.getRelations({ type: 'MANY' })),
      all: Object.keys(store.getRelations()),
      relation: {
        id: relation.getId(), name: relation.getName(), title: relation.getTitle(),
        father: relation.getFather(), child: relation.getChild(), type: relation.getType(),
        fields: relation.getFields(), fatherFields: relation.getFatherField(), childFields: relation.getChildField(),
        loading: relation.isLoading(), editable: relation.isEditable(), prefix: relation.getPrefix(),
        sameState: relation.getState().name === relation.getName(),
      },
      hierarchy: {
        child: layer.isChild(), father: layer.isFather(), hasChildren: layer.hasChildren(),
        hasFathers: layer.hasFathers(), hasRelations: layer.hasRelations(),
        children: layer.getChildren(), fathers: layer.getFathers(),
      },
      fields: layer.getRelationsAttributes(), downloadable: layer.hasDowloadableRelations(),
    };
  });
  assert.deepEqual(result, {
    length: 2, same: true, found: true, one: ['region'], many: ['inspections'], all: ['inspections', 'region'],
    relation: {
      id: 'renamed', name: 'Site visits', title: 'Inspection title', father: 'roads', child: 'checks',
      type: 'MANY', fields: { father: ['id'], child: ['road_id'] },
      fatherFields: ['id'], childFields: ['road_id'], loading: true, editable: true,
      prefix: 'inspection_', sameState: true,
    },
    hierarchy: {
      child: true, father: true, hasChildren: true, hasFathers: true, hasRelations: true,
      children: ['checks'], fathers: ['regions'],
    },
    fields: { inspections: ['road_id'] }, downloadable: true,
  });
});

Then('layer visibility categories and style respect the current scale and ancestors', async function () {
  const result = await this.corePage.evaluate(() => {
    const layer = createFixtureLayer({
      geometrytype: 'Polygon', crs: { epsg: 'EPSG:3857' }, checked: true, visible: true,
      scalebasedvisibility: true, minscale: 10000, maxscale: 1000, opacity: 65,
      parentGroup: { checked: true, parentGroup: { checked: true } },
      styles: [{ name: 'default', current: true }, { name: 'alternative', current: false }],
    });
    const changes = [];
    layer.onafter('change', () => changes.push(layer.isVisible()));
    layer.setCategories([{ ruleKey: 'main', checked: true, _checked: true }, { ruleKey: 'minor', checked: false, _checked: true }]);
    const categories = layer.getCategories();
    const printable = layer.isPrintable({ scale: 5000 });
    layer.state.parentGroup.checked = false;
    const hiddenAncestor = layer.isPrintable({ scale: 5000 });
    layer.state.parentGroup.checked = true;
    layer.setDisabled(g3w.utils.getResolutionFromScale(50000, 'm'));
    const outsideScale = { disabled: layer.isDisabled(), visible: layer.isVisible() };
    layer.setDisabled(g3w.utils.getResolutionFromScale(5000, 'm'));
    const insideScale = { disabled: layer.isDisabled(), visible: layer.isVisible() };
    layer.setChecked(false);
    const uncheckedVisible = layer.setVisible(true);
    layer.setColor('#369');
    layer.setProjection({ epsg: 'EPSG:3857' });
    const metadata = {
      checked: layer.isChecked(), opacity: layer.getOpacity(), style: layer.getStyle(),
      currentStyle: layer.getCurrentStyle().name, styles: layer.getStyles().map(style => style.name),
      color: layer.getColor(), geometry: layer.getGeometryType(), projection: layer.getProjection().getCode(),
      epsg: layer.getEpsg(), crs: layer.getCrs(), multi: layer.isMulti(),
    };
    layer.clearCategories();
    return {
      categories, printable, hiddenAncestor, outsideScale, insideScale, uncheckedVisible, metadata, changes,
      cleared: !layer.state.categories && Object.keys(layer.state.legend.categories).length === 0,
    };
  });
  assert.deepEqual(result, {
    categories: [{ ruleKey: 'main', checked: true, _checked: true }, { ruleKey: 'minor', checked: false, _checked: true }],
    printable: true, hiddenAncestor: false, outsideScale: { disabled: true, visible: false },
    insideScale: { disabled: false, visible: true }, uncheckedVisible: false,
    metadata: {
      checked: false, opacity: 65, style: 'default', currentStyle: 'default', styles: ['default', 'alternative'],
      color: '#369', geometry: 'Polygon', projection: 'EPSG:3857', epsg: 'EPSG:3857', crs: 'EPSG:3857', multi: false,
    },
    changes: [false, true, false], cleared: true,
  });
});

Then('catalog layer and group selections are mutually exclusive', async function () {
  const result = await this.corePage.evaluate(() => {
    const catalogTree = coreTestExports.vueComponents['components/CatalogTree.vue'];
    createFixtureLayer({ id: 'exclusive-first', checked: true });
    const secondLayer = createFixtureLayer({ id: 'exclusive-second', checked: true });
    const layerGroup = { checked: true, 'mutually-exclusive': true, nodes: [] };
    const layerNodes = ['exclusive-first', 'exclusive-second'].map(id => ({
      id, checked: id === 'exclusive-first', disabled: false, projectLayer: true, parentGroup: layerGroup,
    }));
    layerGroup.nodes = layerNodes;
    layerNodes[1].checked = true;
    catalogTree.methods.onLayerChecked.call({ layerstree: layerNodes[1] });

    const parentGroup = { checked: true, 'mutually-exclusive': true, nodes: [] };
    const groupNodes = ['first', 'second'].map((groupId, index) => {
      const id = `group-${groupId}`;
      createFixtureLayer({ id, checked: true });
      return {
        groupId, checked: index === 0, parentGroup,
        nodes: [{ id, checked: true, parentGroup: null }],
      };
    });
    groupNodes.forEach(node => { node.nodes[0].parentGroup = node; });
    parentGroup.nodes = groupNodes;
    groupNodes[1].checked = true;
    catalogTree.methods.onGroupChecked.call({ layerstree: groupNodes[1] });

    return {
      layers: layerNodes.map(node => node.checked),
      selectedLayerVisible: secondLayer.isVisible(),
      groups: groupNodes.map(node => node.checked),
      selectedGroupLayerVisible: g3w.state.project.getLayerById('group-second').isVisible(),
    };
  });
  assert.deepEqual(result, {
    layers: [false, true], selectedLayerVisible: true,
    groups: [false, true], selectedGroupLayerVisible: true,
  });
});

Then('external WMS metadata legends and cache URLs preserve their expected parameters', async function () {
  const result = await this.corePage.evaluate(() => {
    const layer = createFixtureLayer({
      id: 'roads', name: 'Roads:primary', geometrytype: undefined, crs: { epsg: 'EPSG:3857' },
      source: {
        type: 'wms', external: true, layers: ['upstream:roads', 'labels'],
        url: 'http://core.test/external?VERSION=1.3.0&REQUEST=GetMap&tenant=example', format: 'image/jpeg',
      },
      infoformats: ['application/json'], infourl: '/query/', ows: ['WMS', 'WFS'],
      cache_url: 'http://core.test/cache', multilayer: 'road-group', ows_method: 'POST',
    });
    layer.setCategories([{ ruleKey: 'main', checked: true, _checked: false }]);
    const legend = new URL(layer.getLegendUrl({ categories: true, width: 20, format: 'image/png' }));
    const source = new URL(layer.getSource().url);
    const cache = layer.getCacheUrl();
    layer.state.cache_provider = 'mapproxy';
    layer.state.cache_url = 'http://core.test/cache/{z}/{x}/{-y}.png';
    return {
      types: {
        wms: layer.isWMS(), xyz: layer.isXYZ(), external: layer.isExternalWMS(),
        arcgis: layer.isArcgisMapserver(), cached: !!layer.isCached(), proxy: !!layer.useProxy(),
      },
      sourceReserved: [source.searchParams.has('VERSION'), source.searchParams.has('REQUEST')],
      sourceTenant: source.searchParams.get('tenant'),
      query: layer.getQueryUrl() === layer.getSource().url,
      wms: layer.getWmsUrl() === layer.getSource().url, wmsName: layer.getWMSLayerName(),
      infoName: layer.getWMSInfoLayerName(), wfsName: layer.getWFSLayerName(), wfs: layer.getWfsUrl(),
      wfsActive: layer.isWfsActive(), infoUrl: layer.getInfoUrl(), method: layer.getOwsMethod(),
      format: layer.getFormat(), multiId: layer.getMultiLayerId(), cache, mapproxyCache: layer.getCacheUrl(),
      legend: {
        request: legend.searchParams.get('REQUEST'), format: legend.searchParams.get('FORMAT'),
        width: legend.searchParams.get('WIDTH'), layer: legend.searchParams.get('LAYER'),
        enabled: legend.searchParams.get('LEGEND_ON'), tenant: legend.searchParams.get('tenant'),
      },
    };
  });
  assert.deepEqual(result, {
    types: { wms: true, xyz: false, external: true, arcgis: false, cached: true, proxy: true },
    sourceReserved: [false, false], sourceTenant: 'example', query: true, wms: true,
    wmsName: ['upstream:roads', 'labels'], infoName: ['upstream:roads', 'labels'],
    wfsName: 'Roads-primary', wfs: '/wfs/', wfsActive: true, infoUrl: '/query/', method: 'GET', format: 'image/jpeg',
    multiId: 'road-group', cache: 'http://core.test/cache/{z}/{x}/{y}.png',
    mapproxyCache: 'http://core.test/cache/{z}/{x}/{-y}.png',
    legend: {
      request: 'GetLegendGraphic', format: 'image/png', width: '20',
      layer: 'upstream:roads,labels', enabled: 'upstream:roads,labels:main', tenant: 'example',
    },
  });
});

Then('layer data requests preserve pagination fields feature IDs and spatial filters', async function () {
  const requests = [];
  await this.corePage.route('**/vector/data/**', route => {
    const request = route.request();
    requests.push({
      method: request.method(),
      params: Object.fromEntries(new URL(request.url()).searchParams),
      data: request.method() === 'POST' ? request.postDataJSON() : undefined,
    });
    return route.fulfill({ json: {
      result: true, vector: { count: 1, data: {
        type: 'FeatureCollection', features: [
          { type: 'Feature', id: 7, geometry: null, properties: { name: 'Example' } },
        ],
      } },
    } });
  });
  const result = await this.corePage.evaluate(async () => {
    const layer = createFixtureLayer();
    const provider = layer.getProvider('filter');
    const table = await layer.getDataTable({ page: 2, page_size: 10, ordering: 'name', search: 'Example' });
    const byId = await layer.getFeatureByFids({ fids: [7, 9], formatter: 1 });
    const filtered = await layer.getFilterData({ field: 'name|eq|Example', page: 3, page_size: 5 });
    g3w.state.tokens.filtertoken = 'fixture-token';
    g3w.state.map_epsg = 'EPSG:3857';
    const spatial = await layer.query({
      filter: {
        type: 'bbox', value: ol.geom.Polygon.fromExtent([0, 0, 10, 10]),
        config: { spatialMethod: 'within' },
      },
      page: 2, page_size: 20,
    });
    return {
      sameProvider: provider === layer.getProvider('filter'), sameLayer: provider.getLayer() === layer,
      table: { title: table.title, count: table.count, headers: table.headers.map(field => field.name), features: table.features },
      byId,
      filtered: { count: filtered.count, name: filtered.data[0].features[0].get('name') },
      spatial: {
        count: spatial.count, fid: spatial.data[0].features[0].get('g3w_fid'),
        mode: spatial.params.geo_filter_mode, geometry: spatial.params.geo_filter_wkt,
      },
    };
  });
  const features = [{ type: 'Feature', id: 7, geometry: null, properties: { name: 'Example' } }];
  assert.deepEqual(result.table, { title: 'Records', count: 1, headers: ['name'], features });
  assert.deepEqual(result.byId, features);
  assert.deepEqual(result.filtered, { count: 1, name: 'Example' });
  assert.equal(result.sameProvider, true);
  assert.equal(result.sameLayer, true);
  assert.equal(result.spatial.count, 1);
  assert.equal(result.spatial.fid, 7);
  assert.equal(result.spatial.mode, 'contains');
  assert.match(result.spatial.geometry, /^POLYGON/);
  assert.equal(requests.length, 4);
  assert.deepEqual(requests[0].data, { page: 2, page_size: 10, ordering: 'name', search: 'Example', formatter: 0 });
  assert.deepEqual(requests[1].params, { fids: '7,9', formatter: '1' });
  assert.equal(requests[2].data.field, 'name|eq|Example');
  assert.equal(requests[2].data.page, 3);
  assert.equal(requests[2].data.page_size, 5);
  assert.equal(requests[3].data.geo_filter_mode, 'contains');
  assert.equal(requests[3].data.filtertoken, 'fixture-token');
});

Then('changing a layer style refreshes its server-provided metadata', async function () {
  const requests = [];
  await this.corePage.route('**/vector/featurecount/**', route => {
    requests.push({ type: 'count', data: route.request().postDataJSON() });
    return route.fulfill({ json: { result: true, data: 23 } });
  });
  await this.corePage.route('**/vector/editorformstructure/**', route => {
    requests.push({ type: 'form', data: route.request().postDataJSON() });
    return route.fulfill({ json: { result: true, data: {
      fields: [{ name: 'label', label: 'New label', show: true }],
      editor_form_structure: [{ name: 'Alternative form' }],
      scalebasedvisibility: true, minscale: 10000, maxscale: 500,
    } } });
  });
  const result = await this.corePage.evaluate(async () => {
    const layer = createFixtureLayer({
      featurecount: 12, styles: [{ name: 'default', current: true }, { name: 'alternative', current: false }],
    });
    const changes = [];
    layer.onafter('change', () => changes.push(layer.getStyle()));
    const changed = await layer.changeStyle('alternative');
    const repeated = await layer.changeStyle('alternative');
    return {
      changed, repeated, style: layer.getStyle(), count: layer.getFeatureCount(),
      form: layer.getLayerEditingFormStructure(), fields: layer.getFields(),
      range: [layer.state.maxscale, layer.state.minscale], changes,
    };
  });
  assert.deepEqual(result, {
    changed: true, repeated: undefined, style: 'alternative', count: 23,
    form: [{ name: 'Alternative form' }], fields: [{ name: 'label', label: 'New label', show: true }],
    range: [500, 10000], changes: ['alternative'],
  });
  assert.deepEqual(requests, [
    { type: 'count', data: { style: 'alternative' } }, { type: 'form', data: { style: 'alternative' } },
  ]);
});

Then('layer parsers preserve GeoJSON coordinates field labels and raw responses', async function () {
  const result = await this.corePage.evaluate(async () => {
    const layer = createFixtureLayer();
    const collection = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', id: 7, geometry: { type: 'Point', coordinates: [12, 45] }, properties: { Name: 'Road' } }],
    };
    const projection = { crs: 'EPSG:4326', mapCrs: 'EPSG:3857' };
    const json = g3w.Layer._parse('g3w-vector/json', collection, projection);
    const alias = g3w.Layer._parse('g3w-vector/geojson', JSON.stringify(collection), projection);
    const application = g3w.Layer._parse('application/json', {
      layers: [layer], response: collection, projections: { map: ol.proj.get('EPSG:4326'), layer: null },
    });
    const raw = g3w.Layer._parse('text/plain', { layers: [layer], response: 'A plain report' });
    const html = g3w.Layer._parse('text/html', { layers: [layer], response: '<em>HTML report</em>' });
    const unsupported = g3w.Layer._parse('application/unknown', { layers: [layer] });
    const geojson = createFixtureLayer({
      id: 'geojson', geometrytype: undefined, servertype: 'G3WSUITE',
      source: { type: 'geojson', url: 'http://core.test/fixture.geojson' },
    });
    const features = await geojson.getProvider('data').getFeatures({
      data: collection, projection: 'EPSG:4326', mapProjection: 'EPSG:3857',
    });
    return {
      json: json[0].getGeometry().getCoordinates(), alias: alias[0].getGeometry().getCoordinates(),
      provider: features[0].getGeometry().getCoordinates(),
      application: { fid: application[0].features[0].get('g3w_fid'), name: application[0].features[0].get('name') },
      raw: raw[0].rawdata, html: html[0].rawdata, unsupported: unsupported[0].rawdata,
      sameLayers: [application[0], raw[0], html[0], unsupported[0]].every(item => item.layer === layer),
    };
  });
  assert.ok(Math.abs(result.json[0] - 1335833.8895192828) < 0.001);
  assert.ok(Math.abs(result.json[1] - 5621521.486192066) < 0.001);
  assert.deepEqual(result.alias, result.json);
  assert.deepEqual(result.provider, result.json);
  assert.deepEqual(result.application, { fid: 7, name: 'Road' });
  assert.equal(result.raw, 'A plain report');
  assert.equal(result.html, '<em>HTML report</em>');
  assert.equal(result.unsupported, 'Not supported format');
  assert.equal(result.sameLayers, true);
});

Then('the GML parser preserves numeric column names and geographic coordinates', async function () {
  const result = await this.corePage.evaluate(() => {
    const layer = createFixtureLayer({
      id: 'roads', name: 'Roads', geometrytype: 'Point', crs: { epsg: 'EPSG:4326' },
    });
    const response = `<?xml version="1.0"?>
      <wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs" xmlns:gml="http://www.opengis.net/gml" xmlns:qgs="http://www.qgis.org/gml">
        <gml:featureMember>
          <qgs:Roads fid="Roads.7">
            <qgs:name>Main road</qgs:name><qgs:1_code>R1</qgs:1_code>
            <qgs:geometry><gml:Point srsName="EPSG:4326"><gml:coordinates decimal="." cs="," ts=" ">12,45</gml:coordinates></gml:Point></qgs:geometry>
          </qgs:Roads>
        </gml:featureMember>
      </wfs:FeatureCollection>`;
    const parsed = g3w.Layer._parse('application/vnd.ogc.gml', {
      layers: [layer], response,
      projections: { map: ol.proj.get('EPSG:4326'), layer: ol.proj.get('EPSG:4326') },
    });
    const feature = parsed[0].features[0];
    return {
      count: parsed[0].features.length, name: feature.get('name'), code: feature.get('1_code'),
      coordinates: feature.getGeometry().getCoordinates(), sameLayer: parsed[0].layer === layer,
    };
  });
  assert.deepEqual(result, { count: 1, name: 'Main road', code: 'R1', coordinates: [12, 45], sameLayer: true });
});

Then('permalink creation preserves changed layer state and selectable URL parameters', async function () {
  const requests = [];
  await this.corePage.route('**/api/embed/', route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ json: { data: { permalink_code: 'fixture-link' } } });
  });
  const result = await this.corePage.evaluate(async () => {
    const originalStyles = [{ name: 'default', current: true }, { name: 'alternative', current: false }];
    createFixtureLayer({
      id: 'roads', styles: [{ name: 'default', current: false }, { name: 'alternative', current: true }],
    });
    const originalTree = [{ name: 'Transport', checked: true, nodes: [{ id: 'roads', checked: true }] }];
    const currentTree = [{ name: 'Transport', checked: true, nodes: [{ id: 'roads', checked: false }] }];
    g3w.state.project.config = { layerstree: originalTree };
    Object.assign(g3w.state.project.state, {
      layerstree: [{ nodes: currentTree }], layers: [{ id: 'roads', styles: originalStyles }],
    });
    g3w.state.language = 'it';
    g3w.state.baseLayerId = 'background';
    const map = new ol.Map({
      target: 'fixture', layers: [], controls: [], interactions: [],
      view: new ol.View({ center: [0, 0], zoom: 2 }),
    });
    map.setSize([256, 256]);
    const originalMap = g3w.app.getMap;
    g3w.app.getMap = () => map;
    try {
      await g3w.app.getPermalink(new URL('http://core.test/map/?project=roads&lng=it'));
      const dialog = document.querySelector('#share_modal');
      const link = dialog.querySelector('#embed-link');
      const generated = link.value;
      const toggle = dialog.querySelector('input[data-key="permalink_code"]');
      toggle.checked = false;
      toggle.dispatchEvent(new Event('change'));
      const original = link.value;
      const language = dialog.querySelector('input[data-key="lng"]');
      language.checked = false;
      language.dispatchEvent(new Event('change'));
      const selected = link.value;
      const loading = g3w.app.getPermalink.loading;
      dialog.close();
      await coreTestExports.waitFor(() => !document.querySelector('#share_modal'), 1000);
      return { generated, original, selected, loading, released: !g3w.app.getPermalink.loading };
    } finally {
      g3w.app.getMap = originalMap;
      map.setTarget(null);
    }
  });
  assert.deepEqual(result, {
    generated: 'http://core.test/api/embed/fixture-link/',
    original: 'http://core.test/map/?project=roads&lng=it',
    selected: 'http://core.test/map/?project=roads', loading: true, released: true,
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].data.lng, 'it');
  assert.equal(requests[0].data.initbaselayer, 'background');
  assert.deepEqual(requests[0].data.layers, [{
    id: 'roads', styles: [{ name: 'default', current: false }, { name: 'alternative', current: true }],
  }]);
  assert.deepEqual(requests[0].data.layerstree, [{ name: 'Transport', nodes: [{ id: 'roads', checked: false }] }]);
  assert.equal(requests[0].data.initextent.length, 4);
});
