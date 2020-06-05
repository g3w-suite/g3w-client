const inherit = require('core/utils/utils').inherit;
const base = require('core/utils//utils').base;
const G3WObject = require('core/g3wobject');
const ErrorParser = function() {
  base(this);
};

inherit(ErrorParser, G3WObject);

module.export = ErrorParser;
