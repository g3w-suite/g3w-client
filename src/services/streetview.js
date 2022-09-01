/**
 * ORIGINAL SOURCE: src/app/gui/streetview/streetviewservice.js@v3.4
 */
import ApplicationState from 'core/applicationstate';
const {base, inherit, XHR} = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const GUI = require('gui/gui');
const StreetViewComponent = require('gui/streetview/vue/streetview');
const GoogleStreetViewApiUrl = `https://maps.googleapis.com/maps/api/js`;

function StreetviewService() {
  this._position = null;
  this.key = null; //get google key
  this.errorKey = null;
  this.setters = {
    postRender(position) {}
  };

  this.init = function() {
    return new Promise(async (resolve, reject) => {
      this.key = ApplicationState.keys.vendorkeys.google;
      if (this.key) {
        try {
          await XHR.get({
            url: `https://maps.googleapis.com/maps/api/streetview?location=0,0&size=456x456&key=${this.key}`
          })
        } catch(error) {
          this.errorKey = error.responseText;
          reject(error);
        }
      }
      $script(`${GoogleStreetViewApiUrl}?${this.key ? 'key=' + this.key : '' }`,
        resolve
      )
    })
  };

  this.getKey = function(){
    return this.key;
  };

  this.setKey = function(key) {
    this.key = key;
  };

  this.getPosition = function() {
    return this._position;
  };

  this.showStreetView = function(position) {
    this._position = position;
    GUI.setContent({
      content: new StreetViewComponent({
        service: this
      }),
      title: 'StreetView'
    });
  };

  base(this);
}

inherit(StreetviewService, G3WObject);

module.exports = new StreetviewService;
