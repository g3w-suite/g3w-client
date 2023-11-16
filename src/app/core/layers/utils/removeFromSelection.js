/**
 * @TODO make it a Layers class function ?
 * 
 * @file
 * @since 3.9.0
 */

import GUI                          from 'services/gui';
import CatalogLayersStoresRegistry  from 'store/catalog-layers';


/**
 * @FIXME add description
 *
 * @param layer
 * 
 * ORIGINAL SOURCE: src/app/gui/queryresults/queryresultsservice.js@3.8.12::clearSelectionExtenalLayer
 * 
 * @since 3.9.0
 */
function _clearSelectionExtenalLayer(layer) {
  const service  = GUI.getService('queryresults');
  const map      = service.mapService; // TODO: same as? --> GUI.getService('map')

  layer.selection.active = false;

  const action = service.getActionLayerById({ layer, id: 'selection' });

  layer
    .selection
    .features
    .forEach((feature, index) => {
      // skip when ..
      if (!feature.selection.selected) {
        return;
      }
      feature.selection.selected = false;
      if (action) {
        action.state.toggled[index] = false;
      }
      map.setSelectionFeatures('remove', { feature });
    });
}

/**
 * @since 3.9.0
 */
export function removeFromSelection(layer, storeid) {
  if (!layer) {
    return console.warn('undefined layer');;
  }
  if (layer.external) {
    _clearSelectionExtenalLayer(layer);
  } else if(storeid) {
    CatalogLayersStoresRegistry.getLayersStore(storeid).getLayerById(layer.id).clearSelectionFids();
  }
}