var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var FormPanel = require('g3w/gui/form').FormPanel;
var Form = require('g3w/gui/form').Form;

var IternetFormPanel = FormPanel.extend({});

function IternetForm(options){
  base(this,options);
  this._formPanel = IternetFormPanel;
}
inherit(IternetForm,Form);

var proto = IternetForm.prototype;

proto._isFieldVisible = function(field){
  // nel caso in cui il layer non sia editable e sia vuoto (quindi stiamo inserendo un nuovo elemento) non lo mostro
  /*if(!field.editable && (field.value == "" || _.isNull(field.value))){
    return false
  }*/
  var ret = true;
  switch (field.name){
    case "cod_acc_est":
      var tip_acc = this._getField("tip_acc");
      if (tip_acc.value=="0101"){
        ret = false;
      }
      break;
    case "cod_acc_int":
      var tip_acc = this._getField("tip_acc");
      if (tip_acc.value=="0101" || tip_acc.value=="0501"){
        ret = false;
      }
      break;
  }
  return ret;
};

proto._shouldShowRelation = function(relation){
  if (relation.name=="numero_civico"){
    var tip_acc = this._getField("tip_acc");
    if (tip_acc.value == '0102'){
      return false;
    }
  }
  return true;
};

module.exports = IternetForm;
