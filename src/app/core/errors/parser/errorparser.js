import G3WObject from 'core/g3wobject';

const { inherit, base } = require('core/utils/utils');

const ErrorParser = function() {
  base(this);
};

inherit(ErrorParser, G3WObject);

module.export = ErrorParser;
