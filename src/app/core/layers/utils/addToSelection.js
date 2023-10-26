/**
 * @TODO make it a Layers class function ? 
 * 
 * @file 
 * @since 3.9.0
 */

import GUI from 'services/gui';

const { createFeatureFromFeatureObject } = require('utils/geo');

/**
 * External layer (vector) added by add external layer tool
 * 
 * @since 3.9.0
 */
function _handleExternalVectorLayerSelection(map, {
  fids,
  layer,
  features,
  index,
  force
} = {}) {
  if (null === fids || undefined === fids) {
    return;
  }
  //Take in account array or single fid
  fids = Array.iArray(fids) ? fids : [fid];
  features = Array.isArray(features) ? features : [features];
  //check if layer.selection.features is undefined
  if (undefined === layer.selection.features) {
    //set array
    layer.selection.features = [];
  }

  fids.forEach((fid, index) => {
    const feature = features[index];
    // Set feature used in selection tool action
    if (undefined === layer.selection.features.find(f => f.getId() === fid)) {
      const feat = createFeatureFromFeatureObject({ feature, id: fid });
      feat.__layerId = layer.id;
      feat.selection = feature.selection;
      layer.selection.features.push(feat);
    }

    //check if feature is already select or feature is already removed (no selected)
    const noChangeSelection =
      ('add' === force && feature.selection.selected) ||
      ('remove' === force && !feature.selection.selected);
    /** If not changes to apply return */
    if (noChangeSelection) {
      return;
    }

    /**Switch selected boolean value */
    feature.selection.selected = !feature.selection.selected;

    /** Need to add selection on map */
    map
      .setSelectionFeatures(
        (feature.selection.selected ? 'add' : 'remove'),
        {
          feature: layer.selection.features.find(selectionFeature => fid === selectionFeature.getId())
        }
      );
  })


  // Set selection layer active based on features selection selected properties.
  layer.selection.active = layer.selection.features.reduce((acc, feature) => acc || feature.selection.selected, false)
}

/**
 * Handle features selection of Project Layers (on TOC)
 * 
 * @since 3.9.0
 */
async function _handleProjectLayerSelection(map, {
  fids,
  layer,
  features,
  index,
  force,
} = {}) {

  // skip invalid fids
  if (null === fids || undefined === fids) {
    return;
  }

  fids     = Array.isArray(fids) ? fids : [fids];
  features = Array.isArray(features) ? features : [features];

  const include = []; // fid of features to include
  const exclude = []; // fid of features to exclude

  fids.forEach((fid, idx) => {
    const feature     = features[idx];
    const is_selected = layer.getFilterActive() || layer.hasSelectionFid(fid);
  
    // if not already selected and feature is not added to OL selection layer on map --> add as feature of selected layer
    if (!is_selected && feature && feature.geometry && !layer.getOlSelectionFeature(fid)) {
      layer.addOlSelectionFeature({ id: fid, feature });
    }
  
    // force action
    if (undefined === force) {
      layer[is_selected ? 'excludeSelectionFid' : 'includeSelectionFid'](fid);
    }

    // force add
    if ('add' === force && !is_selected) {
      include.push(fid);
    }

    // force remove
    if ('remove' === force) {
      exclude.push(fid);
    }
  });

  layer.includeSelectionFids(include, false);
  layer.excludeSelectionFids(exclude, false);

  /** @TODO add description */
  if (layer.getFilterActive()) {
    await layer.createFilterToken();
  }

  const layers = GUI.getService('queryresults').getState().layers;

  /** @TODO add description */
  fids.forEach((fid, idx) => {
    const currentLayer = (
      !layer.hasSelectionFid(fid) &&
      layer.getFilterActive() &&
      layer.getSelectionFids().size > 0 &&
      layers.find(l => l.id === layer.getId())
    );
    if (currentLayer) {
      currentLayer.features.splice(undefined === index ? idx : index, 1);
    }
  })

  map.clearHighlightGeometry();

  /** @TODO add description */
  if (1 === layers.length && !layers[0].features.length) {
    layers.splice(0);
  }
}

/**
 * Add / Remove features from selection
 * 
 * @since 3.9.0
 */
export async function addToSelection(map, params) {
  if (params.layer.external) {
    _handleExternalVectorLayerSelection(map, params);
  } else {
    await _handleProjectLayerSelection(map, params);
  }
}