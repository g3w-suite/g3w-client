var MESSAGE = {
  id: null,
  action: 'editing:update',
  data: {
    qgis_layer_id: 'edifici20180829155021867', // layeridname
    type: 'attribute', // type of update action: attribute, move, copy, vertex to enable related tool,
    feature: {
      field: 'id',
      value: 17// field name and value /unique feature
    },
    geometry: null,
    properties: {} // key values
  }
}
