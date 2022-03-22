import inputService from 'core/expression/inputservice';
const {inherit, base} = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

function FormService() {
  this.state = null;
  this.eventBus = new Vue();
  this.layer;
  this.setters = {
    setInitForm(options={}) {
      this._setInitForm(options);
    },
    setFormStructure(formStructure) {
      this.state.formstructure = formStructure;
    },
    // setter change fields
    setFormFields(fields=[]) {
      this.state.fields = fields;
      this.handleFieldsWithExpression(fields);
    },
    setupFields() {
      this._setupFields();
    },
    // setter insert data into form
    setFormData(fields) {
      this.setFormFields(fields);
    },
    // setter single field
    setField(field) {},
    // settere state
    setState(state) {
      this._setState(state);
    },
    // setter add action
    addActionsForForm(actions) {},
    postRender(element) {
      // hook for listener to chenge DOM
    }
  };
  base(this);
  this.init = function(options={}) {
    this._setInitForm(options);
  };
  // init form options passed for example by editor
  this._setInitForm = function(options = {}) {
    const {fields, feature, layer, title= 'Form', formId, name, buttons={}, context_inputs, isnew, footer={}} = options;
    this.layer = layer;
    this.feature = feature;
    this.title = title;
    this.formId = formId;
    this.name = name;
    this.buttons = buttons;
    this.context_inputs = context_inputs;
    this.state = {
      layerid: layer.getId(),
      loading:false,
      components: [],
      disabledcomponents: [],
      component: null,
      headers: [],
      currentheaderid: null,
      fields: null,
      buttons: this.buttons,
      disabled: false,
      valid: true, // global form validation state. True at beginning
      // when input change will be update
      tovalidate: {},
      feature,
      componentstovalidate: {},
      footer
    };
    this.expression_fields_dependencies = {};
    this.setFormFields(fields);
    if (this.layer && options.formStructure) {
      const formstructure = this.layer.getLayerEditingFormStructure(fields);
      this.setFormStructure(formstructure);
    }
  };
  this.eventBus.$on('set-loading-form', (bool=false) => {
    this.state.loading = bool;
  })
}

inherit(FormService, G3WObject);

const proto = FormService.prototype;

proto.handleFieldsWithExpression = function(fields=[]){
  fields.forEach(field => {
    const {options={}} = field.input;
    if (options.filter_expression){
      const {referencing_fields=[]} = options.filter_expression;
      referencing_fields.forEach(referencing_field =>{
        if (referencing_field) {
          if (this.expression_fields_dependencies[referencing_field] === undefined)
            this.expression_fields_dependencies[referencing_field] = [];
          this.expression_fields_dependencies[referencing_field].push(field.name);
        }
      })
    }
  });
  // start to evaluate field
  Object.keys(this.expression_fields_dependencies).forEach(name =>{
    const field = this.state.fields.find(field => field.name === name);
    field && this.evaluateExpression(field);
  })
};

proto.setCurrentFormPercentage = function(perc){
  this.layer.setFormPercentage(perc)
};

proto.setLoading = function(bool=false) {
  this.state.loading = bool;
};

proto.setValidComponent = function({id, valid}){
  this.state.componentstovalidate[id] = valid;
  this.isValid();
};

proto.getValidComponent = function(id) {
  return this.state.componentstovalidate[id];
};

proto.changeInput = function(input){
  this.evaluateExpression(input);
  this.isValid(input);
};

proto.evaluateExpression = function(input){
  const expression_fields_dependencies = this.expression_fields_dependencies[input.name];
  if (expression_fields_dependencies) {
    const feature = this.feature.clone();
    feature.set(input.name, input.value);
    expression_fields_dependencies.forEach(expression_dependency_field =>{
      const field = this.state.fields.find(field => field.name === expression_dependency_field);
      const qgs_layer_id = this.layer.getId();
      inputService.handleFormInput({
        qgs_layer_id, // the owner of feature
        field, // field related
        feature //featute to tranform in form_data
      })
    })
  }
};

// Every input send to form it valid value that will change the genaral state of form
proto.isValid = function(input) {
  if (input) {
    // check mutually
    if (input.validate.mutually) {
      if (!input.validate.required) {
        if (!input.validate.empty) {
          input.validate._valid = input.validate.valid;
          input.validate.mutually_valid = input.validate.mutually.reduce((previous, inputname) => {
            return previous && this.state.tovalidate[inputname].validate.empty;
          }, true);
          input.validate.valid = input.validate.mutually_valid && input.validate.valid;
        } else {
          input.value = null;
          input.validate.mutually_valid = true;
          input.validate.valid = true;
          input.validate._valid = true;
          let countNoTEmptyInputName = [];
          for (let i = input.validate.mutually.length; i--;) {
            const inputname = input.validate.mutually[i];
            !this.state.tovalidate[inputname].validate.empty && countNoTEmptyInputName.push(inputname) ;
          }
          if (countNoTEmptyInputName.length < 2) {
            countNoTEmptyInputName.forEach((inputname) => {
              this.state.tovalidate[inputname].validate.mutually_valid = true;
              this.state.tovalidate[inputname].validate.valid = true;
              setTimeout(()=>{
                this.state.tovalidate[inputname].validate.valid = this.state.tovalidate[inputname].validate._valid;
                this.state.valid = this.state.valid && this.state.tovalidate[inputname].validate.valid;
              })
            })
          }
        }
      }
      //check if min_field or max_field is set
    } else if (!input.validate.empty && (input.validate.min_field || input.validate.max_field)) {
        const input_name = input.validate.min_field || input.validate.max_field;
        input.validate.valid = input.validate.min_field ?
          this.state.tovalidate[input.validate.min_field].validate.empty || 1*input.value > 1*this.state.tovalidate[input.validate.min_field].value :
          this.state.tovalidate[input.validate.max_field].validate.empty || 1*input.value < 1*this.state.tovalidate[input.validate.max_field].value;
        if (input.validate.valid) this.state.tovalidate[input_name].validate.valid = true
    }
  }

  this.state.valid = Object.values(this.state.tovalidate).reduce((previous, input) => {
    return previous && input.validate.valid;
  }, true) && Object.values(this.state.componentstovalidate).reduce((previous, valid) => {
    return previous && valid
  }, true);
};


proto.addComponents = function(components = []) {
  for (const component of components) {
    this.addComponent(component);
  }
};

proto.addComponent = function(component) {
  const {id, title, name, icon, valid, header=true} = component;
  if (valid !== undefined) {
    this.state.componentstovalidate[id] = valid;
    this.state.valid = this.state.valid && valid;
    this.eventBus.$emit('add-component-validate', {
      id,
      valid
    });
  }
  // we can set a component cthat can be part of headeres (tabs or not)
  if (header) {
    this.state.headers.push({title, name, id, icon});
    this.state.currentheaderid = this.state.currentheaderid || id;
  }

  this.state.components.push(component);
};

proto.replaceComponent = function({id, component}={}) {
  const index = this.state.components.findIndex(component => component.id === id);
  this.state.components.splice(index, 1, component);
};

proto.disableComponent = function({id, disabled}) {
  if (disabled) this.state.disabledcomponents.push(id);
  else this.state.disabledcomponents = this.state.disabledcomponents.filter(disableId => disabledId !== id);
};

proto.setCurrentComponentById = function(id){
  if (this.state.disabledcomponents.indexOf(id) === -1) {
    this.setIdHeader(id);
    this.state.component = this.state.components.find(component => component.id === id).component;
    return this.state.component;
  }
};

/**
 * setRootComponent (is form )
 */
proto.setRootComponent = function(){
  this.state.component = this.state.components.find(component => component.root).component;
};

proto.getRootComponent = function(){
  return this.state.components.find(component => component.root).component;
};

proto.isRootComponent = function(component){
  return this.getRootComponent() == component;
};

proto.getComponentById = function(id) {
  return this.state.components.find(component => component.id === id);
};

proto.setComponent = function(component) {
  this.state.component = component;
};

proto.addedComponentTo = function(formcomponent = 'body') {
  this.state.addedcomponentto[formcomponent] = true;
};

proto.addToValidate = function(input) {
  this.state.tovalidate[input.name] = input;
};

proto.getState = function () {
  return this.state;
};

proto._setState = function(state) {
  this.state = state;
};

proto.getFields = function() {
  return this.state.fields;
};

proto._getField = function(fieldName){
  return this.state.fields.find(field => field.name === fieldName);
};

proto.getEventBus = function() {
  return this.eventBus;
};

proto.setIdHeader = function(id) {
  this.state.currentheaderid = id;
};

proto.getContext = function() {
  return this.context_inputs.context;
};

proto.getSession = function() {
  return this.getContext().session;
};

proto.getInputs = function() {
  return this.context_inputs.inputs;
};

/**
 * handleRelation
 */

proto.handleRelation = function({relationId, feature}){
  //OVERWRITE BY  PLUGIN EDITING PLUGIN
};

//method to clear all the open thinghs opened by service
proto.clearAll = function() {
  this.eventBus.$off('addtovalidate');
  this.eventBus.$off('set-main-component');
  this.eventBus.$off('set-loading-form');
  this.eventBus.$off('component-validation');
  this.eventBus.$off('disable-component');
};


module.exports = FormService;
