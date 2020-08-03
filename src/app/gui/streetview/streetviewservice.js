import  { GOOGLE_API_KEY } from 'config/keys'
const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const G3WObject = require('core/g3wobject');
const GUI = require('gui/gui');
const StreetViewComponent = require('gui/streetview/vue/streetview');

function StreetViewService() {
  this._position = null;
  this.setters = {
    postRender: function(position) {}
  };

  this.init = function() {
    return new Promise((resolve) => {
      $script(`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}`, () => {
        resolve()
      })
    })
  };

  base(this);
}

inherit(StreetViewService, G3WObject);

const proto = StreetViewService.prototype;

proto.getPosition = function() {
  return this._position;
};

proto.showStreetView = function(position) {
  this._position = position;
  GUI.setContent({
    content: new StreetViewComponent({
      service: this
    }),
    title: 'StreetView'
  });
};


module.exports = StreetViewService;
