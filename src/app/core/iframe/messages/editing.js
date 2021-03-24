const TEMPLATE_EDITING_MESSAGE ={
  editing: {
    qgis_layer_id: null, // layeridname
    save: 'permanent', // temporary, permanent(default)
    add: [{
      geometry: { // in case of 
        type: null, // Point, LinesTring, ect..
        coordinates: []
      },
      properties: {} // key values
    }],
    update: [{
      type: null, // type of update action: attribute, move, copy, vertex to enable related tool,
      feature: {
        id: 16 // field name and value
      },
      geometry: { // in case of 
        type: null, // Point, LineString, ect..
        coordinates: []
      },
      properties: {} // key values
    }],
    delete:[] // array of fids of the features that we want delete
  }
};