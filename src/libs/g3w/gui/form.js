var GUI = require('g3w/gui/gui');
var ProjectService = require('g3w/core/projectservice').ProjectService;
var MapService = require('g3w/core/mapservice');

Vue.filter('startcase', function (value) {
  return _.startCase(value);
});

var FormPanel = Vue.extend({
  template: require('./formpanel.html'),
  methods: {
    exec: function(cbk){
      var relations = this.state.relations || null;
      cbk(this.state.fields,relations);
      GUI.closeForm();
    },
    isNotEditable: function(field){
      return !this.editable;
    },
    isSimple: function(field){
      return this.$options.form._isSimple(field);
    },
    isSelect: function(field){
      return this.$options.form._isSelect(field);
    },
    isLayerPicker: function(field){
      return this.$options.form._isLayerPicker(field);
    },
    layerPickerPlaceHolder: function(field){
      return this.$options.form._getlayerPickerLayerName(field.input.options.layerid);
    },
    pickLayer: function(field){
      this.$options.form._pickLayer(field);
    },
    isVisible: function(field){
      return this.$options.form._isFieldVisible(field);
    },
    showRelation: function(relation){
      return this.$options.form._shouldShowRelation(relation);
    }
  }
});

var Inputs = {};
Inputs.STRING = 'string';
Inputs.INTEGER = 'integer';
Inputs.FLOAT = 'float';

Inputs.defaults = {};
Inputs.defaults[Inputs.STRING] = "";
Inputs.defaults[Inputs.INTEGER] = 0;
Inputs.defaults[Inputs.FLOAT] = 0.0;
Inputs.simpleFieldTypes = [Inputs.STRING,Inputs.INTEGER,Inputs.FLOAT];

Inputs.SELECT = 'select';
Inputs.LAYERPICKER = 'layerpicker';

Inputs.specialInputs = [Inputs.SELECT,Inputs.LAYERPICKER];

function Form(options){
  // proprietà necessarie. In futuro le mettermo in una classe Panel da cui deriveranno tutti i pannelli che vogliono essere mostrati nella sidebar
  this.panelComponent = null;
  this.options =  options || {};
  this.id = options.id; // id del form
  this.name = options.name; // nome del form
  this.dataid = options.dataid; // "accessi", "giunzioni", ecc.
  this.pk = options.pk || null, // eventuale chiave primaria (non tutti i form potrebbero avercela o averne bisogno
  
  this.state = {
    // i dati del form possono avere o meno una primary key
    fields: options.fields,
    relations: options.relations
  }
  
  this._formPanel = options.formPanel || FormPanel;
  this._defaults = options.defaults || Inputs.defaults;
}

var proto = Form.prototype;

// viene richiamato dalla toolbar quando il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
proto.onShow = function(container){
  this._setupFields();
  var panel = this._setupPanel();
  this._mountPanel(panel,container);
  return panel;
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.onClose = function(){
  this.panelComponent.$destroy(true);
  this.panelComponent = null;
  return true;
};

// se c'è una chiave primaria, e il suo valore è vuoto o null, suppongo si tratti di un form per un nuovo inserimento
proto._isNewInsertForm = function(){
  var pk = this.pk;
  var pkField = this._getField(pk);
  return (pk && _.isNull(pkField.value));
};

proto._isFieldVisible = function(field){
  if(!field.editable && (field.value == "" || _.isNull(field.value))){
    return false
  }
  return true;
};

proto._isSimple = function(field){
  if (_.includes(Inputs.specialInputs,field.input.type)){
    return false;
  }
  return _.includes(Inputs.simpleFieldTypes,field.type)
};

proto._isSelect = function(field){
  return (_.includes(Inputs.specialInputs,field.input.type) && field.input.type == Inputs.SELECT);
};

proto._isLayerPicker = function(field){
  return (_.includes(Inputs.specialInputs,field.input.type) && field.input.type == Inputs.LAYERPICKER);
};

proto._pickLayer = function(field){
  // disabilito temporanemante lo strato modale per permettere l'interazione con la mappa
  GUI.setModal(false);
  var layerId = field.input.options.layerid;
  var relFieldName = field.input.options.field;
  var relFieldLabel = ProjectService.getLayerAttributeLabel(layerId,field.input.options.field);
  MapService.getFeatureInfo(layerId)
  .then(function(attributes){
    var value = attributes[relFieldName] ? attributes[relFieldName] : attributes[relFieldLabel];
    field.value = value;
  })
  .always(function(){
    GUI.setModal(true);
  });
};

proto._getDefaultValue = function(field){
  var defaultValue = null;
  if (field.input && field.input.options.default){
    defaultValue = field.input.options.default;
  }
  else if (this._isSelect(field)){
    defaultValue = field.input.options.values[0].key;
  }
  /*else {
    defaultValue = this._defaults[field.type];
  }*/
  return defaultValue;
};

proto._getlayerPickerLayerName = function(id){
  var layer = ProjectService.getLayer(id);
  if (layer){
    return layer.name;
  }
  return "";
};

proto._shouldShowRelation = function(relation){
  return true;
};

// per definire i valori di default nel caso si tratta di un nuovo inserimento
proto._setupFields = function(){
  var self = this;
  
  var fields = _.filter(this.state.fields,function(field){
    // tutti i campi eccetto la PK (se non nulla)
    if (self.pk && field.value==null){
      return ((field.name != self.pk));
    }
    return true;
  });
  
  _.forEach(fields,function(field){
    var defaultValue = self._getDefaultValue(field);
    if (defaultValue){
      field.value = defaultValue;
    }
  });
  
  if (this.state.relations){
    var relations = this.state.relations;
    _.forEach(relations,function(relation){
      _.forEach(relation.fields,function(field){
        var defaultValue = self._getDefaultValue(field);
        if (defaultValue){
          field.value = defaultValue;
        }
      });
    })
  }
};

proto._setupPanel = function(){
  var panel = this.panelComponent = new this._formPanel({
    form: this
  });
  if (this.options.buttons) {
    panel.buttons = this.options.buttons;
  }
  panel.state = this.state;
  return panel
};

proto._mountPanel = function(panel,container){
  panel.$mount().$appendTo(container);
};

proto._getField = function(name){
  var field = null;
  _.forEach(this.state.fields,function(f){
    if (f.name == name){
      field = f;
    }
  })
  return field;
};

module.exports = {
  Form: Form,
  FormPanel: FormPanel
}
