var inherit = require('core/utils/utils').inherit;
var resolve = require('core/utils/utils').resolve;
var G3WObject = require('core/g3wobject');
var base = require('core/utils').base;


function Validator(options) {
    base(this);
}

inherit(Validator, G3WObject);

module.exports = new Validator;

var proto = Validator.prototype;

proto.text = function(field) {
    console.log('TEXT');
};

proto.textarea = function(field) {
    console.log('TEXTAREA');
};

proto.integer = function(field) {
    console.log('INTEGER');
};

proto.float = function(field) {
    console.log('FLOAT');
};

proto.picklayer = function(field) {
    console.log('PICKLAYER');
};