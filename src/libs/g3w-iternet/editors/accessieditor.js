var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var IternetEditor = require('./iterneteditor');

function AccessiEditor(options){
  base(this,options);
}
inherit(AccessiEditor,IternetEditor);
module.exports = AccessiEditor;
