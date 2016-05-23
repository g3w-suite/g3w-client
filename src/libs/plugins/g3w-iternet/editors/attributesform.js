var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var ProjectService = require('g3w/core/projectservice').ProjectService;
var FormPanel = require('g3w/gui/form').FormPanel;
var Form = require('g3w/gui/form').Form;

var IternetFormPanel = FormPanel.extend({});

function IternetForm(options){
  base(this,options);
  this._formPanel = IternetFormPanel;
}
inherit(IternetForm,Form);

var proto = IternetForm.prototype;

proto._isVisible = function(field){
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

proto._isEditable = function(field){
  if (field.name == "tip_acc" && !this._isNew()){
    return false;
  };
  return Form.prototype._isEditable.call(this,field);
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

proto._pickLayer = function(field){
  var self = this;
  var layerId = field.input.options.layerid;
  
  Form.prototype._pickLayer.call(this,field)
  .then(function(attributes){
    var linkedField;
    var linkedFieldAttributeName;
    
    switch (field.name) {
      case 'cod_ele':
        linkedField = self._getRelationField("cod_top","numero_civico");
        break;
      case 'cod_top':
        linkedField = self._getField("cod_ele");;
    }
    
    if (linkedField) {
      linkedFieldAttributeName = ProjectService.getLayerAttributeLabel(layerId,linkedField.input.options.field);
      if (linkedField && attributes[linkedFieldAttributeName]){
        linkedField.value = attributes[linkedFieldAttributeName];
      }
    }
  })
};

module.exports = IternetForm;
