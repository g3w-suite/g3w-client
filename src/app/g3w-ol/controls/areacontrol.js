const AreaIteraction = require('g3w-ol/interactions/areainteraction');
const MeasureControl = require('g3w-ol/controls/measurecontrol');

module.exports = class AreaControl extends MeasureControl {
  constructor(options={}) {
    super({
      ...options,
      tipLabel:         "sdk.mapcontrols.measures.area.tooltip",
      label:            "\ue909",
      clickmap:         true,
      interactionClass: AreaIteraction
    })
  }
}