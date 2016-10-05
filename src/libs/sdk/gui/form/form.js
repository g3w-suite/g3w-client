var inherit = require('core/utils/utils').inherit;
var resolve = require('core/utils/utils').resolve;
var GUI = require('gui/gui');
var Panel =  require('gui/panel');
var PickCoordinatesInteraction = require('g3w-ol3/src/interactions/pickcoordinatesinteraction');
var QueryService = require('core/query/queryservice');
var ClipBoard = require('core/clipboardservice');

Vue.filter('startcase', function (value) {
  return _.startCase(value);
});

Vue.filter('lowerCase', function (value) {
  return _.lowerCase(value);
});

Vue.filter('relationplural', function (relation) {
  return (relation.plural) ? relation.plural : _.startCase(relation.name);
});

Vue.validator('email', function (val) {
  return /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(val)
});

Vue.validator('integer', function (val) {
  return /^(-?[1-9]\d*|0)$/.test(val);
});

var FormPanel = Vue.extend({
  template: require('./formpanel.html'),
  data: function() {
    return {
      state: {},
      tools : {
        copypaste: false
      }
    }
  },
  transitions: {'addremovetransition': 'showhide'},
  methods: {
    exec: function(cbk) {
      var relations = this.state.relations || null;
      var images = this.state.images || null;
      cbk(this.state.fields, relations, images);
      if (this.$options.form.editor.getPickedFeature()) {
        this.$options.form.editor.cleanUpPickedFeature();
      }
      GUI.closeForm();
    },
    btnEnabled: function(button) {
      return button.type != 'save' || (button.type == 'save' && this.$validation.valid && this.isValidForm());
    },
    hasFieldsRequired: function() {
      return this.$options.form._hasFieldsRequired();
    },
    isEditable: function(field){
      return this.$options.form._isEditable(field);
    },
    isSimple: function(field) {
      return this.$options.form._isSimple(field);
    },
    isTextarea: function(field) {
      return this.$options.form._isTextarea(field);
    },
    isSelect: function(field){
      return this.$options.form._isSelect(field);
    },
    isLayerPicker: function(field){
      return this.$options.form._isLayerPicker(field);
    },
    isFile: function(field) {
      return this.$options.form._isFile(field);
    },
    layerPickerPlaceHolder: function(field){
      return this.$options.form._getlayerPickerLayerName(field.input.options.layerid);
    },
    pickLayer: function(field, relation) {
      this.checkPickLayer();
      this.$options.form._pickLayer(field, relation);
    },
    pickLayerInputFieldChange: function(field, relation) {
      this.$options.form._pickLayerInputFieldChange(field, relation);
    },
    pickLayerToClipBoard: function() {
      var self = this;
      this.checkPickLayer();
      this.$options.form._pickLayerToClipBoard()
      .then(function() {
        //TODO
      })
    },
    isValidForm: function() {
      var self = this;
      var valid = this.$options.form._checkFieldsValidation(this.state.fields);
      _.forEach(this.state.relations, function(relation) {
        _.forEach(relation.elements, function(element) {
          valid = valid && self.$options.form._checkFieldsValidation(element.fields);
        })
      });
      return valid;
    },
    pickLayerInputChange: function() {
      this.$options.form._cleanUpPickLayer();
    },
    checkPickLayer: function() {
      if (this.$options.form._pickInteraction) {
        this.$options.form._cleanUpPickLayer();
      }
    },
    isVisible: function(field){
      return this.$options.form._isVisible(field);
    },
    visibleElements: function(relation) {
      return _.filter(relation.elements,function(element){
        return (element.state != 'NEW_DELETED' && element.state != 'OLD_DELETED');
      });
    },
    showRelation: function(relation){
      return this.$options.form._shouldShowRelation(relation);
    },
    relationPkFieldName: function(relation) {
      return relation.pk;
    },
    isRelationElementDeletable: function(relation,element) {
      if (element.new) {
        return true;
      }
      var min;
      if (relation.type == 'ONE') {
        min = 1;
      }
      else {
        min = Number.NEGATIVE_INFINITY;
      }

      if (relation.min) {
        min = Math.min(min.relation.min);
      }
      return min < relation.elements.length;
    },
    canAddRelationElements: function(relation) {
      var canAdd = true;
      if (relation.type == 'ONE') {
        canAdd = (relation.elements.length) ? false : true; // se è una relazione 1:1 e non ho elementi, lo posso aggiungere, altrimenti no
      }
      else {
        var max = relation.max ? relation.max : Number.POSITIVE_INFINITY;
        canAdd = relation.elements.length < max; 
      }
      return canAdd;
    },
    addRelationElement: function(relation) {
      this.$options.form._addRelationElement(relation);
    },
    removeRelationElement: function(relation,element){
      this.$options.form._removeRelationElement(relation, element);
    },
    fieldsSubset: function(fields) {
      var end = Math.min(3,fields.length);
      return fields.slice(0,end);
    },
    fieldsSubsetLength: function(fields) {
      return this.fieldsSubset(fields).length;
    },
    collapseElementBox: function(relation,element) {
      var boxid = this.getUniqueRelationElementId(relation,element);
      if (this.state.elementsBoxes[boxid]) {
        return this.state.elementsBoxes[boxid].collapsed;
      }
    },
    toggleElementBox: function(relation, element) {
      var boxid = this.getUniqueRelationElementId(relation, element);
      this.state.elementsBoxes[boxid].collapsed = !this.state.elementsBoxes[boxid].collapsed;
    },
    getUniqueRelationElementId: function(relation, element) {
      return this.$options.form.getUniqueRelationElementId(relation, element);
    },
    pasteClipBoardToForm : function() {
      var layerForm = this.$options.form._getLayerFormFromId();
      this.$options.form._pasteClipBoardToForm(layerForm);
      this.$validate(this.state.relations);
      this.$resetValidation()
    },
    copyToClipBoard : function() {
      this.$options.form._copyFormToClipBoard();
    },
    onFileChange: function(e) {
      var files = e.target.files || e.dataTransfer.files;
      if (!files.length) {
        return;
      }
      var fieldName = $(e.target).attr('field');
      this.state.images[fieldName] = files[0];
      //this.createImage(fieldName, files[0]);
    },
    createImage: function(fieldName, file) {
      var self = this;
      var reader = new FileReader();
      reader.onload = function(e) {
        self.state.image = e.target.result;
        self.state.images[fieldName] = e.target.result;
      };
      return reader.readAsDataURL(file);
    },
    removeImage: function() {
      this.state.image = ''
    }
  },
  computed: {
    isValid: function(field) {
      return this.$validate(field.name);
    },
    hasRelations: function() {
      return this.state.relations.length;
    }
  },
  ready: function() {
    var self = this;
    if (this.$options.form.relationOne && this.$options.form.isnew) {
      var relationsOne = this.$options.form._getRelationsOne();
      _.forEach(relationsOne, function(relationOne) {
        if (!relationOne.elements.length) {
          self.addRelationElement(relationOne);
        }
      });
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

Inputs.TEXTAREA = 'textarea';
Inputs.SELECT = 'select';
Inputs.LAYERPICKER = 'layerpicker';
Inputs.FILE = 'file';

Inputs.specialInputs = [Inputs.TEXTAREA,Inputs.SELECT,Inputs.LAYERPICKER];

function Form(options) {
  // proprietà necessarie. In futuro le mettermo in una classe Panel
  // da cui deriveranno tutti i pannelli che vogliono essere mostrati nella sidebar
  this.internalComponent = null;
  this.options =  options || {};
  this.provider = options.provider; // è l' editor che lo chiama
  this.id = options.id; // id del form
  this.name = options.name; // nome del form
  this.dataid = options.dataid; // "accessi", "giunzioni", ecc.
  this.editor = options.editor || {};
  this.relationOne = options.relationOne || null;
  this.pk = options.pk || null; // eventuale chiave primaria (non tutti i form potrebbero avercela o averne bisogno
  this.isnew = (!_.isNil(options.isnew) && _.isBoolean(options.isnew)) ? options.isnew : true;
  this.state = {
    fields: options.fields,
    relations: options.relations,
    images: {}
  };
  this._copyPaste = false;
  this.tools = options.tools;
  // clipboard
  this._clipBoard = ClipBoard;
  //da rivedere
  var formLayer = this.id.split('form')[0];
  this.state.canpaste = _.has(this._clipBoard._data, formLayer);
  this._formPanel = options.formPanel || FormPanel;
  this._defaults = options.defaults || Inputs.defaults;
  this._pickedPromise = null;
  // attributo che mantiene riferimento ai fields del form
  this._layerFields = [];
  this._relationFields = {};
  GUI.setModal(true);
}
inherit(Form, Panel);

var proto = Form.prototype;

// viene richiamato dalla toolbar quando
// il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
proto.mount = function(container) {
  this._setupFields();
  this._setupRelationsFields();
  var panel = this._setupPanel();
  this._mountPanel(panel, container);
  return resolve(true);
};

proto._mountPanel = function(panel, container) {
  panel.$mount().$appendTo(container);
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.unmount = function(){
  this.internalComponent.$destroy(true);
  this.internalComponent = null;
  return resolve(true);
};

proto._checkFieldsValidation = function(fields) {
  var self = this;
  var valid = true;
  var fieldValid = true;
  _.forEach(fields, function(field) {
    if (field.validate && field.validate.required) {
      if (self._copyPaste) {
        // distinguo due condizioni: il copia e incolla
        if (_.isNil(field.value) || !_.trim(field.value)) {
          fieldValid = false;
        }
        valid = valid && fieldValid;
      } else {
        //dall'edit o new
        if (_.isNil(field.value)) {
          fieldValid = false;
        }
        valid = valid && fieldValid;
      }
    }
  });
  return valid;
};

proto.getFields = function() {
  return this._fields;
};

proto._getRelationsOne = function() {
  // overwrite from plugin
  var self = this;
  var relationsOne = [];
  _.forEach(this.state.relations, function(relation, index) {
    if (relation.type == 'ONE') {
      relationsOne.push(self.state.relations[index]);
    }
  });
  return relationsOne;
};

proto._getLayerFormFromId = function() {
  return this.id.split('form')[0];
};

proto._copyFormToClipBoard = function() {
  var formData = _.cloneDeep(this.state);
  this._clipBoard.set(this.id, formData);
  this.state.canpaste = true;
  return true;
};

proto._setFieldValueLayerFromToRelationField = function(relation, name) {
  console.log('questa funzione deve essere sovrascritta dal plugin al momento');
};

proto._pasteStateWithoutPk = function(fields, relations) {
  //prendo vector layer
  var self = this;
  var layerFields = [];
  var copyAndPasteFieldsNotOverwritable = self.editor.getcopyAndPasteFieldsNotOverwritable();
  var relationFields = {};
  // verifico se sono stati settati campi che non devono essere sovrascitti dal copia e incolla
  // è settato dall'editor specifico
  if (!_.isNil(copyAndPasteFieldsNotOverwritable.layer)) {
    layerFields = copyAndPasteFieldsNotOverwritable.layer;
  }
  if (!_.isNil(copyAndPasteFieldsNotOverwritable.relations)) {
    relationFields = copyAndPasteFieldsNotOverwritable.relations;
  }
  // verifico i fields da non modificare sul layer
  _.forEach(fields, function(field, index) {
    if (self.pk == field.name || (layerFields.indexOf(field.name) != -1)) {
      fields[index].value = null;
    }
  });
  // verifico i fileds delle relazioni da non sovrascrivere
  _.forEach(relations, function(relation, relationIndex) {
    _.forEach(relationFields[relation.name], function(relationField) {
      _.forEach(relation.elements, function(element, elementIndex) {
        /// aggiungo allo stato della relazione copiata NEW
        relations[relationIndex].elements[elementIndex].state = 'NEW';
        _.forEach(element.fields, function(field, fieldIndex) {
           if (field.name == relationField) {
             relations[relationIndex].elements[elementIndex].fields[fieldIndex].value = null;
           }
        });
      });
    })
  });
  this._copyPaste = true;
  // setto i nuovi fields e relations lasciando quelli vecchi
  this.state.relations = relations;
  this.state.fields = fields;
  var elementsBoxes = this.getUniqueRelationsElementId(false);
  this.internalComponent.$validate();
  this.state.elementsBoxes = elementsBoxes;
  return true;
};

proto._pasteClipBoardToForm = function(layerForm) {

  var formData = this._clipBoard.get(layerForm);
  this._pasteStateWithoutPk(formData.fields, formData.relations);
  this.state.canpaste = false;
};

proto._isNew = function(){
  return this.isnew;
};

proto._hasFieldsRequired = function() {
  var someFieldsRequired = _.some(this.state.fields, function(field){
    return field.validate && field.validate.required;
  });
  var someRelationsRequired = _.some(this.state.relations,function(relation){
    return relation.validate && relation.validate.required;
  });
  return someFieldsRequired || someRelationsRequired;
};

proto._isVisible = function(field) {
  return !(!field.editable && (field.value == "" || _.isNull(field.value)));
};

proto._isEditable = function(field) {
  return field.editable;
};

proto._isSimple = function(field){
  if (_.includes(Inputs.specialInputs,field.input.type)){
    return false;
  }
  return _.includes(Inputs.simpleFieldTypes,field.type)
};

proto._isTextarea = function(field) {
  return (field.input.type == Inputs.TEXTAREA);
};

proto._isSelect = function(field) {
  return (_.includes(Inputs.specialInputs,field.input.type) && field.input.type == Inputs.SELECT);
};

proto._isLayerPicker = function(field){
  return (_.includes(Inputs.specialInputs,field.input.type) && field.input.type == Inputs.LAYERPICKER);
};

proto._isFile = function(field) {
  return (field.input.type == Inputs.FILE);
};

proto._cleanUpPickLayer = function() {
  var mapService = GUI.getComponent('map').getService();
  mapService.removeInteraction(this._pickInteraction);
  this._pickInteraction = null;
  GUI.setModal(true);
};

proto._pickLayerInputFieldChange = function(field, relation) {
  console.log('funzione che deve essere sovrascritta dal plugin');
};

proto._pickLayer = function(field, relation) {
  // ritorno una promessa, se qualcun altro volesse usare
  // il risultato (es. per settare altri campi in base alla feature selezionata)
  var d = $.Deferred();
  GUI.notify.info("Seleziona un'elemento dalla mappa per ottenere il valore di "+ field.label + " o scrivilo direttamentene");
  var self = this;
  // disabilito temporanemante lo strato modale per permettere l'interazione con la mappa
  GUI.setModal(false);
  var mapService = GUI.getComponent('map').getService();
  var layer = mapService.getProject().getLayerById(field.input.options.layerid);
  var relFieldName = field.input.options.field;
  var relFieldLabel = layer.getAttributeLabel(field.input.options.field);
  this._pickInteraction = new PickCoordinatesInteraction();
  mapService.addInteraction(this._pickInteraction);
  this._pickInteraction.on('picked',function(e){   
    QueryService.queryByLocation(e.coordinate, [layer])
    .then(function(response){
      var featuresForLayers = response.data;
      if (featuresForLayers.length && featuresForLayers[0].features.length) { 
        var attributes = featuresForLayers[0].features[0].getProperties(); // prendo la prima feature del primo (e unico) layer
        var value = attributes[relFieldName] ? attributes[relFieldName] : attributes[relFieldLabel];
        field.value = value;
        d.resolve(attributes);
      }
      else {
        d.reject();
      }
    })
    .fail(function(){
      d.reject();
    })
    .always(function() {
      self._cleanUpPickLayer();
    })
  });
  return d.promise();
};
//funzione che server per poter copiare lo state di una feature identificata
// sul form attuale di un'altra feature
proto._pickLayerToClipBoard = function() {
  //TODO
  var self = this;
  // ritorno una promessa, se qualcun altro volesse
  // usare il risultato (es. per settare altri campi in base alla feature selezionata)
  var d = $.Deferred();
  if (this._pickedPromise) {
    return this._pickedPromise
  }
  // disabilito temporanemante lo strato modale per permettere l'interazione con la mappa
  GUI.setModal(false);
  // recupero mapservice perchè mi permette di ineteragire con la mappa
  var mapService = GUI.getComponent('map').getService();
  var vectorLayer = this.editor.getVectorLayer();
  var layer = mapService.getProject().getLayerById(vectorLayer.id);
  // creo il pickCoordinate interaction da permettermi così di interagire con la mappa
  this._pickInteraction = new PickCoordinatesInteraction();
  // l'aggiungo alla mappa
  mapService.addInteraction(this._pickInteraction);
  // on picked
  this._pickInteraction.on('picked', function(e) {
    // qui passo lo stessso layer su cui sto agendo
    QueryService.queryByLocation(e.coordinate, [layer])
    .then(function(response) {
      var featuresForLayers = response.data;
      // verifico se ci sono features selezionate
      if (featuresForLayers.length && featuresForLayers[0].features.length) {
        // rpendo la prima feature
        var feature = featuresForLayers[0].features[0];
        // prendo dal vectorLayer la feature basato sull'id della richiesta
        feature = vectorLayer.getFeatureById(feature.getId());
        var fields = vectorLayer.getFieldsWithValues(feature);
        var relationsPromise = self.editor.getRelationsWithValues(feature);
        relationsPromise
        .then(function(relations) {
          self._pasteStateWithoutPk(fields, relations);
          d.resolve();
        });
      }
    })
    .fail(function() {
      d.reject();
    })
    .always(function() {
      self._cleanUpPickLayer();
    })
  });
  return d.promise();
};

proto._getDefaultValue = function(field) {
  if (field.input && field.input.options && field.input.options.default) {
    return field.input.options.default;
  }
  else if (this._isSelect(field)) {
    return field.input.options.values[0].key;
  }

  return '';
};

proto._getlayerPickerLayerName = function(layerId){
  mapService = GUI.getComponent('map').getService();
  var layer = mapService.getProject().getLayerById(layerId);
  if (layer){
    return layer.getName();
  }
  return "";
};

proto._shouldShowRelation = function(relation) {
  return true;
};

// per definire i valori di default nel caso si tratta di un nuovo inserimento
proto._setupFields = function() {
  var self = this;
  
  var fields = _.filter(this.state.fields,function(field){
    // tutti i campi eccetto la PK (se non nulla)
    if (self.pk && field.value==null){
      return ((field.name != self.pk));
    }
    return true;
  });
  
  _.forEach(fields,function(field){
    if(_.isNil(field.value)){
      var defaultValue = self._getDefaultValue(field);
      if (defaultValue){
        field.value = defaultValue;
      }
    }
  });
};

proto._setupRelationsFields = function(relations) {
  var self = this;
  relations = relations || this.state.relations;
  if (relations) {
    _.forEach(relations, function(relation) {
      _.forEach(relation.elements, function(element) {
        self._setupRelationElementFields(element);
      })
    });
  }
};

proto._setupRelationElementFields = function(element) {
  var self = this;
  _.forEach(element.fields,function(field){
    if(_.isNil(field.value)){
      field.value = self._getDefaultValue(field);
    }
  })
};

proto._setupPanel = function(){
  var panel = this.internalComponent = new this._formPanel({
    form: this
  });
  if (this.options.buttons) {
    panel.buttons = this.options.buttons;
  }
  var elementsBoxes = this.getUniqueRelationsElementId();
  this.state.elementsBoxes = elementsBoxes;
  // qui associo lo state del pannello allo ste del form
  panel.state = this.state;
  this._setFormTools(this.tools);
  return panel;
};

proto._setFormTools = function(tools) {
  var self = this;
  _.forEach(tools, function(tool) {
    if (_.has(self.internalComponent.tools, tool)) {
      self.internalComponent.tools[tool] = true;
    }
  })
};

proto.getUniqueRelationsElementId = function(bool) {
  var self = this;
  var elementsBoxes = {};
  var collapsed = _.isNil(bool) ? true : bool;
  _.forEach(this.state.relations, function(relation){
    _.forEach(relation.elements, function(element){
      var boxid = self.getUniqueRelationElementId(relation,element);
      elementsBoxes[boxid] = {
        collapsed: collapsed
      }
    })
  });
  return elementsBoxes;
};

proto.getUniqueRelationElementId = function(relation, element){
  return relation.name+'_'+element.id;
};

proto._getField = function(fieldName){
  var field = null;
  _.forEach(this.state.fields,function(f){
    if (f.name == fieldName){
      field = f;
    }
  });
  return field;
};

proto._addRelationElement = function(relation) {
  // chama la funzione editor che crea una relazione
  var element = this.provider.createRelationElement(relation);
  var elementBoxId = this.getUniqueRelationElementId(relation, element);
  Vue.set(this.state.elementsBoxes, elementBoxId,{collapsed:false});
  this._setupRelationElementFields(element);
  relation.elements.push(element);
};

proto._removeRelationElement = function(relation,element){
  var self = this;
  _.forEach(relation.elements,function(_element,idxToRemove){
    if (_element.id == element.id) {
      //relation.elements.splice(idxToRemove,1);
      element.state = element.state+'_DELETED'; // lo marco come elminato
      delete self.state.elementsBoxes.elmentBoxId;
    }
  })
};

proto._getRelationField = function(fieldName, relationName){
  var field = null;
  _.forEach(this.state.relations,function(relation){
    if (relationName == relation.name){
      _.forEach(relation.fields,function(f){
        if (f.name == fieldName){
          field = f;
        }
      })
    }
  });
  return field;
};

proto._getRelationElementField = function(fieldName, element) {
  var field;
  _.forEach(element.fields,function(_field){
    if (_field.name == fieldName) {
      field = _field;
    }
  });
  return field;
};

module.exports = {
  Form: Form,
  FormPanel: FormPanel
};
