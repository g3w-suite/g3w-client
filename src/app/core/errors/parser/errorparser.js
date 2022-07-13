const { inherit, base } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

const ErrorParser = function () {
  base(this);
};

inherit(ErrorParser, G3WObject);

module.export = ErrorParser;
