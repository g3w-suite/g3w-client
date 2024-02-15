import inputService               from 'core/expression/inputservice';
import G3WObject                  from 'core/g3wobject';
import { inherit, base }          from 'utils';
import DataRouterService          from 'services/data';

const { convertFeatureToGEOJSON } = require('utils/geo');

function FormService() {

  this.state = null;

  this.eventBus = new Vue();

  /**
   * Whether to force some state property to have a certain value.
   * (eg. setted on a child to parent form service relation)
   * 
   * @type {{ valid: boolean, update: boolean }}
   */
  this.force = {
    update: false,
    valid: false // NOT USED FOR THE MOMENT
  };

  this.layer;

  this.setters = {

    setInitForm(options={}) {
      this._setInitForm(options);
    },

    setFormStructure(formStructure) {
      this.state.formstructure = formStructure;
    },

    setFormFields(fields=[]) {
      this.state.fields = fields;
      this.handleFieldsWithExpression(fields);
    },

    setupFields() {
      this._setupFields();
    },

    setFormData(fields) {
      this.setFormFields(fields);
    },

    setField(field) {},

    setState(state) {
      this._setState(state);
    },

    addActionsForForm(actions) {},

    postRender(element) {
      // hook for listener to chenge DOM

    }

  };

  base(this);

  this.init = function(options={}) {
    this._setInitForm(options);
  };

  /**
   * Init form options passed for example by editor
   */
  this._setInitForm = function(options = {}) {
    const {
      fields,
      feature,
      parentData,
      layer,
      title = 'Form',
      formId,
      name,
      buttons = {},
      context_inputs,
      isnew,
      footer = {},
      headerComponent,
    } = options;

    this.layer = layer;

    /**
     * Cloned feature
     */
    this.feature = feature.clone();

    this.title = title;

    this.formId = formId;

    this.name = name;

    this.buttons = buttons;

    this.context_inputs = context_inputs;

    this.parentData = parentData;

    this.headerComponent = headerComponent;

    /**
     * Force update state of the service
     * (eg. setted on a child to parent form service relation)
     */
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
      isnew,
      valid: true, // global form validation state. True at beginning
      update: feature.isNew(), // set update in case or not is a new feature
      // when input change will be update
      tovalidate: {},
      feature,
      componentstovalidate: {},
      footer,
      ready: false
    };
  
    this.force.update = feature.isNew();
  
    /**
     * Expression fields dependencies from filter_expression
     */
    this.filter_expression_fields_dependencies = {}; // 
  
    /**
     * Expression fields dependencies from default_expression
     */
    this.default_expression_fields_dependencies = {};
  
    /**
     * @since 3.8.0
     */
    this.default_expression_fields_on_update = []; 
  
    /**
     * Wheter to listen for changes when `saveDefaultExpressionFieldsNotDependencies` is called
     * 
     * @since 3.8.0
     */
    this.listenChangeInput = true;
  
    this.setFormFields(fields);
  
    if (this.layer && options.formStructure) {
      this.setFormStructure(this.layer.getLayerEditingFormStructure(fields));
    }

  };
  this.eventBus.$on('set-loading-form', (bool=false) => this.state.loading = bool);
}

inherit(FormService, G3WObject);

const proto = FormService.prototype;

proto.setReady = function(bool=false) {
  this.state.ready = bool;
};

/**
 * Called when an input change value
 * 
 * @param input
 */
proto.changeInput = function(input) {
  if (true === this.listenChangeInput) {
    this.evaluateFilterExpressionFields(input);
    this.evaluateDefaultExpressionFields(input);
    this.isValid(input);
    this.isUpdated(input);
  }
};

/**
 * Check if form is updated base on change on input
 * 
 * @param input
 */
proto.isUpdated = function(input) {
  this.state.update = (
    this.force.update
    || (
      !this.state.update
        ? input.update
        : !!this.state.fields.find(field => field.update)
      )
  );
};

/**
 *
 */
proto.setUpdate = function(bool=false, options={}) {
  const { force = false } = options;
  this.force.update = force;
  this.state.update = this.force.update || bool;
  if (false === this.state.update) {
    // set original `field._value` equal to current value to get changes
    this.state.fields.forEach(field => { field._value = field.value; })
  }
};

/**
 * Evaluate filter expression
 * 
 * @param input
 */
proto.evaluateDefaultExpressionFields = function(input={}) {
  const filter = this.default_expression_fields_dependencies[input.name];
  if (filter) {
    this.feature.set(input.name, input.value);
    filter.forEach(dependency_field =>{
      FormService._getDefaultExpression({
        parentData: this.parentData,
        qgs_layer_id: this.layer.getId(),
        field: this._getField(dependency_field),
        feature: this.feature,
      })
    })
  }
};

/**
 * Evaluate filter expression fields
 * 
 * @param input
 */
proto.evaluateFilterExpressionFields = function(input={}) {
  const filter = this.filter_expression_fields_dependencies[input.name];
  if (filter) {
    // on form service inititalization `filter_expression` option has
    // `referencing_fields` or `referenced_columns` from another layer
    const fieldForm = this._getField(input.name);
    if (fieldForm) {
     this.feature.set(fieldForm.name, fieldForm.value);
    }
    filter.forEach(dependency_field => {
      FormService._getFilterExpression({
        parentData: this.parentData,
        qgs_layer_id: this.layer.getId(),
        field: this._getField(dependency_field),
        feature: this.feature,
      })
    })
  }
};

/**
 * Handle a field that has a `filter_expression` value object
 * 
 * @since 3.8.0
 */
proto._handleFieldWithFilterExpression = function(field, filter_expression) {
  if (!filter_expression) {
    return;
  }

  const {
    referencing_fields = [],
    referenced_columns = []
  } = filter_expression;

  const dependency_fields = new Set();

  // TODO: add description
  [
    ...referenced_columns,
    ...referencing_fields
  ].forEach(dependency_field => dependency_fields.add(dependency_field));

  dependency_fields.forEach(dependency_field => {
    // TODO: shorten variable name
    if (undefined === this.filter_expression_fields_dependencies[dependency_field]) {
      this.filter_expression_fields_dependencies[dependency_field] = [];
    }
    this.filter_expression_fields_dependencies[dependency_field].push(field.name);
  });

  // Call input service if a field has a `filter_expression` every time we open a form
  FormService._getFilterExpression({
    parentData: this.parentData,
    qgs_layer_id: this.layer.getId(),
    field,
    feature: this.feature
  });
};

/**
 * Handle a field that has a `default_value` object and check if `apply_on_update` only
 * 
 * @since 3.8.0
 */
proto._handleFieldWithDefaultExpression = function(field, default_expression) {
  if (default_expression) {
    const {
      referencing_fields = [],
      referenced_columns = [],
      apply_on_update = false,
    } = default_expression;

    // Skip if not apply_on_update (listen dependencies change only for new Feature)
    if (!apply_on_update && !this.state.isnew) {
      return;
    }

    const dependency_fields = new Set();

    // Get array of dependency fields on default expression if exist
    // add each of it in a Set (unique array items)
    [
      ...referenced_columns,
      ...referencing_fields
    ].forEach(dependency_field => dependency_fields.add(dependency_field));


    // Only in apply update listen changeInput
    if (apply_on_update) {

      this.default_expression_fields_on_update.push(field);

      dependency_fields.forEach(dependency_field => {
        // TODO: shorten variable name
        if (undefined === this.default_expression_fields_dependencies[dependency_field]) {
          this.default_expression_fields_dependencies[dependency_field] = [];
        }
        this.default_expression_fields_dependencies[dependency_field].push(field.name);
      });
    }

    // Call input service if a field has a default_expression and is a new feature
    if (this.state.isnew) {
      FormService._getDefaultExpression({
        field,
        feature: this.feature,
        qgs_layer_id: this.layer.getId(),
        parentData: this.parentData,
      });
    }
  }
};

/**
 * Handle fields with associated expression
 * 
 * @param {Array} [fields = []]
 */
proto.handleFieldsWithExpression = function(fields=[]) {
  // TODO: add description
  fields.forEach(field => {
    const { options = {} } = field.input;
    this._handleFieldWithFilterExpression(field, options.filter_expression);
    this._handleFieldWithDefaultExpression(field, options.default_expression);
  });
  // start to evaluate filter expression field
  Object.keys(this.filter_expression_fields_dependencies).forEach(name => {
    this.evaluateFilterExpressionFields({ name });
  });
};

proto.setCurrentFormPercentage = function(perc) {
  this.layer.setFormPercentage(perc)
};

proto.setLoading = function(bool=false) {
  this.state.loading = bool;
};

proto.setValidComponent = function({id, valid}) {
  this.state.componentstovalidate[id] = valid;
  this.isValid();
};

proto.getValidComponent = function(id) {
  return this.state.componentstovalidate[id];
};

/**
 * Every input send to form its valid value that will change the general state of form
 */
proto.isValid = function(input) {
  if (input) {
    // check mutually
    if (input.validate.mutually && !input.validate.required && !input.validate.empty) {
      input.validate._valid         = input.validate.valid;
      input.validate.mutually_valid = input.validate.mutually.reduce((previous, inputname) => previous && this.state.tovalidate[inputname].validate.empty, true);
      input.validate.valid          = input.validate.mutually_valid && input.validate.valid;
    }
    if (input.validate.mutually && !input.validate.required && input.validate.empty) {
      input.value                   = null;
      input.validate.mutually_valid = true;
      input.validate.valid          = true;
      input.validate._valid         = true;
      // count not empty input_name
      let filled = [];
      for (let i = input.validate.mutually.length; i--;) {
        const input_name = input.validate.mutually[i];
        if (!this.state.tovalidate[input_name].validate.empty) {
          filled.push(input_name) ;
        }
      }
      if (filled.length < 2) {
        filled.forEach((input_name) => {
          this.state.tovalidate[input_name].validate.mutually_valid = true;
          this.state.tovalidate[input_name].validate.valid = true;
          setTimeout(() => {
            this.state.tovalidate[input_name].validate.valid = this.state.tovalidate[input_name].validate._valid;
            this.state.valid = this.state.valid && this.state.tovalidate[input_name].validate.valid;
          })
        })
      }
    }
    // check if min_field or max_field is set
    if (!input.validate.mutually && !input.validate.empty && (input.validate.min_field || input.validate.max_field)) {
        const input_name = input.validate.min_field || input.validate.max_field;
        input.validate.valid = (
          input.validate.min_field
            ? this.state.tovalidate[input.validate.min_field].validate.empty || 1 * input.value > 1 * this.state.tovalidate[input.validate.min_field].value
            : this.state.tovalidate[input.validate.max_field].validate.empty || 1 * input.value < 1 * this.state.tovalidate[input.validate.max_field].value
          );
        if (input.validate.valid) {
          this.state.tovalidate[input_name].validate.valid = true;
        }
    }
  }
  this.state.valid = (
    Object.values(this.state.tovalidate).reduce((previous, input) => previous && input.validate.valid, true) &&
    Object.values(this.state.componentstovalidate).reduce((previous, valid) => previous && valid, true)
  );
};

proto.addComponents = function(components = []) {
  for (const component of components) {
    this.addComponent(component);
  }
};

proto.addComponent = function(component) {
  const {id, title, name, icon, valid, headerComponent, header=true} = component;
  if (valid !== undefined) {
    this.state.componentstovalidate[id] = valid;
    this.state.valid = this.state.valid && valid;
    this.eventBus.$emit('add-component-validate', {
      id,
      valid
    });
  }
  // Set a component that can be part of headers (tabs or not)
  if (header) {
    this.state.headers.push({title, name, id, icon, component:headerComponent});
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

proto.setCurrentComponentById = function(id) {
  if (this.state.disabledcomponents.indexOf(id) === -1) {
    this.setIdHeader(id);
    this.state.component = this.state.components.find(component => component.id === id).component;
    return this.state.component;
  }
};

/**
 * setRootComponent (is form)
 */
proto.setRootComponent = function() {
  this.state.component = this.state.components.find(component => component.root).component;
};

proto.getRootComponent = function() {
  return this.state.components.find(component => component.root).component;
};

proto.isRootComponent = function(component) {
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
  // check if is mounted on form gui otherwise leave form component to run is Valid whe form is mounted on dom
  if (this.state.ready) {
   this.isValid(input);
  }
};

proto.removeToValidate = function(input) {
  delete this.state.tovalidate[input.name];
  this.isValid();
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

proto._getField = function(fieldName) {
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

proto.handleRelation = function({relationId, feature}) {
  //OVERWRITE BY  PLUGIN EDITING PLUGIN
};

/**
 * Clear all the open things opened by service
 */
proto.clearAll = function() {
  this.eventBus.$off('addtovalidate');
  this.eventBus.$off('set-main-component');
  this.eventBus.$off('set-loading-form');
  this.eventBus.$off('component-validation');
  this.eventBus.$off('disable-component');
};

/**
 * @returns {Promise<void>}
 * 
 * @since 3.8.0
 */
proto.saveDefaultExpressionFieldsNotDependencies = async function() {
  if (0 === this.default_expression_fields_on_update.length) {
    return;
  }

  // disable listen changeInput
  this.listenChangeInput = false;

  // Array contain field name already resolved with server default_expression request
  const requested_expressions = [];
  // array of defaultExpressionPromises request
  const pending_expressions = [];

  // loop through default_expression_fields
  for (let i = 0; i < this.default_expression_fields_on_update.length; i++) {

    // extract all dependency fields of current field
    const dFs = Object.keys(this.default_expression_fields_dependencies)
      .filter(field => {
        return (
          // check if dependency field is field on update
          this.default_expression_fields_on_update.find(({name}) => name === field) &&
          // if has bind current field
          this.default_expression_fields_dependencies[field].find(fieldName => fieldName === this.default_expression_fields_on_update[i].name)
        )
      });

    // id current field has a Array (at least one) dependency fields
    // need to evaluate its value and after evaluate field value expression
    for (let i = 0; i < dFs.length; i++) {
      // in case already done a default_expression request evaluation from server
      if ("undefined" !== typeof requested_expressions.find(name => name === dFs[i])) {
        continue;
      }
      // get value. Need to wait response
      try {
        const value = await FormService._getDefaultExpression({
          field: this._getField(dFs[i]),
          feature: this.feature,
          qgs_layer_id: this.layer.getId(),
          parentData: this.parentData
        });
        // update field with evaluated value to feature
        this.feature.set(dFs[i], value);
        // add to array
        requested_expressions.push(dFs[i]);
      } catch(err) {
        console.warn(err);
      }
    }

  }

  this.default_expression_fields_on_update.forEach(field => {
    if ("undefined" === typeof requested_expressions.find(name => name === field.name)) {
      pending_expressions.push(FormService._getDefaultExpression({
        field,
        feature: this.feature,
        qgs_layer_id: this.layer.getId(),
        parentData: this.parentData
      }))
    }
  });

  try {
    await Promise.allSettled(pending_expressions);
  } catch(err) {
    console.warn(err);
  }

  // enable listen changeInput
  this.listenChangeInput = true;

};

/**
 * ORIGINAL SOURCE: src/app/core/expression/inputservice.js@3.8.6
 * 
 * @param expr.field        related field
 * @param expr.feature      feature to transform in form_data
 * @param expr.qgs_layer_id layer id owner of the feature data 
 * @param expr.parentData
 * 
 * @returns { void | Promise<unknown> }
 * 
 * @since 3.9.0
 */
FormService._getFilterExpression = async function({
  field,
  feature,
  qgs_layer_id,
  parentData,
} = {}) {
 let {
   key,
   value,
   layer_id = qgs_layer_id,
   filter_expression,
   loading,
 } = field.input.options;

 /**
  * @FIXME should return Promise.reject('some error message') ?
  */
 if (!filter_expression) {
   return;
 }

 loading.state = 'loading';

 try {

   const features = await DataRouterService.getData('expression:expression', {
     inputs: {
       field_name: field.name,
       layer_id,
       qgs_layer_id,
       form_data: convertFeatureToGEOJSON(feature),
       parent: parentData && ({
         form_data: convertFeatureToGEOJSON(parentData.feature),
         qgs_layer_id: parentData.qgs_layer_id,
         formatter: 0,
       }),
       formatter: 0,
       expression: filter_expression.expression,
     },
     outputs: false,
   });

   if('select_autocomplete' === field.input.type) {
     field.input.options.values = [];
     // temporary array to sort the keys
     const values = [];
     for (let i = 0; i < features.length; i++) {
       values.push({
         key: features[i].properties[key],
         value: features[i].properties[value]
       })
     }
     values.sort(({ key: aKey }, { key: bKey }) => {
       if ('string' === typeof aKey ) {
         aKey = aKey.toLowerCase();
         bKey = bKey.toLowerCase()
       }
       if (aKey < bKey) return -1;
       if (aKey > bKey) return 1;
       return 0;
     });
     field.input.options.values = values;
   }

   return features;

 } catch(err) {
   return Promise.reject(err);
 } finally {
   loading.state = 'ready';
 }

};

/**
 * ORIGINAL SOURCE: src/app/core/expression/inputservice.js@3.8.6
 * 
 * @param expr.field        related field
 * @param expr.feature      feature to transform in form_data
 * @param expr.qgs_layer_id layer id owner of the feature data 
 * @param expr.parentData
 *  
 * @returns { void | Promise<unknown> } 
 * 
 * @since 3.9.0
 */
FormService._getDefaultExpression = async function({
  field,
  feature,
  qgs_layer_id,
  parentData,
} = {}) {
  
  const {
    layer_id = qgs_layer_id,
    default_expression,
    loading,
    default: default_value,
  } = field.input.options;

  /**
   * @FIXME should return Promise.reject('some error message') ?
   */
  if (!default_expression) {
    return;
  }

  loading.state = 'loading';

  // Call `expression:expression_eval` to get value from expression and set it to field
  try {

    const value = await DataRouterService.getData('expression:expression_eval', {
      inputs: {
        field_name: field.name,
        layer_id, //
        qgs_layer_id, //layer id owner of the data
        form_data: convertFeatureToGEOJSON(feature),
        formatter: 0,
        expression: default_expression.expression,
        parent: parentData && {
          form_data: convertFeatureToGEOJSON(parentData.feature),
          qgs_layer_id: parentData.qgs_layer_id,
          formatter: 0
        }
      },
      outputs: false
    });

    field.value = value;

    return value;

  } catch(err) {
    if ("undefined" !== typeof default_value) {
      field.value = default_value
    }
    return Promise.reject(err);
  } finally {
    loading.state = 'ready';
  }

};

module.exports = FormService;
