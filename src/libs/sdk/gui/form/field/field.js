var inherit = require('core/utils/utils').inherit;
var resolve = require('core/utils/utils').resolve;
var FieldService = require('./fieldsservices');
var G3WObject = require('core/g3wobject');
var base = require('core/utils/utils').base;


function Field(options) {

    base(this);
    this._id = options.id || null;
    this._type = options.type || 'text';
    this._service = FieldService;
    this._validator = options.validator || null;
}

inherit(Field, G3WObject);

module.exports = Field;

var proto = Field.prototype;