var inherit = require('core/utils/utils').inherit;
var resolve = require('core/utils/utils').resolve;
var G3WObject = require('core/g3wobject');
var base = require('core/utils/utils').base;


function FieldsService(options) {
    base(this);
}

inherit(FieldsService, G3WObject);

module.exports = new FieldsService;

var proto = FieldsService.prototype;

proto.onChange = function(field) {
  console.log('ON CHANGE');
};

proto.onClick = function(field) {
    console.log('ON CLICK');
};

proto.onInput = function(field) {
    console.log('ON INPUT');
};