/**
 * @file
 * @since v3.8
 */

import GUI from 'services/gui';

const BaseQueryPolygonControl = require('g3w-ol/controls/basequerypolygoncontrol');

const QueryByDrawPolygonControl = function(options={}) {

  const _options = {
    name: "querybydrawpolygon",
    tipLabel: "sdk.mapcontrols.querybydrawpolygon.tooltip",
    customClass: GUI.getFontClass('draw'),
    clickmap: true, // set ClickMap
    interactionClass: ol.interaction.Draw,
    interactionClassOptions: {
      type: 'Polygon'
    },
    enabled: true
  };

  BaseQueryPolygonControl.call(this, { ...options, ..._options });
};

ol.inherits(QueryByDrawPolygonControl, BaseQueryPolygonControl);

const proto = QueryByDrawPolygonControl.prototype;

/**
 * @param {ol.Map} map
 */
proto.setMap = function(map) {
  
  BaseQueryPolygonControl.prototype.setMap.call(this, map);

  this._interaction.on('drawend', evt => {
    this.dispatchEvent({ type: 'drawend', feature: evt.feature });
    if (this._autountoggle) {
      this.toggle();
    }
  });

};

module.exports = QueryByDrawPolygonControl;