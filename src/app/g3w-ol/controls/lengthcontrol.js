const LenghtIteraction = require('g3w-ol/interactions/lengthinteraction');
const MeasureControl   = require('g3w-ol/controls/measurecontrol');

module.exports = class LengthControl extends MeasureControl {
  constructor(options={}) {
    super({
      ...options,
      tipLabel:         "sdk.mapcontrols.measures.length.tooltip",
      label:            "\ue908",
      clickmap:         true,
      interactionClass: LenghtIteraction
    });
  }
}