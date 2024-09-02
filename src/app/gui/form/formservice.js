import { getDefaultExpression }    from 'utils/getDefaultExpression';
import { getFilterExpression }     from "utils/getFilterExpression";

const G3WObject         = require('core/g3wobject');

module.exports = class FormService extends G3WObject {
  constructor(opts = {}) {
    super(opts);

    this.state = null;

    this.eventBus = new Vue();

    this.eventBus.$on('set-loading-form', (bool = false) => this.state.loading = bool);

    /**
     * Whether to force some state property to have a certain value.
     * (e.g., set on a child to parent form service relation)
     *
     * @type {{ valid: boolean, update: boolean }}
     */
    this.force = {
      update: false,
      valid:  false // NOT USED FOR THE MOMENT
    };

    this.layer;

    this.setters = {

      setInitForm(opts = {}) {
        this._setInitForm(opts);
      },

      setFormStructure(formStructure) {
        this.state.formstructure = formStructure;
      },

      setFormFields(fields = []) {
        this.state.fields = fields;
        this.handleFieldsWithExpression(fields);
      },

      setupFields() {},

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

  }
  init(opts = {}) {
    this._setInitForm(opts);
  }

  /**
   * Init form options passed, for example, by editor
   */
  _setInitForm(options = {}) {
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
    this.feature         = feature.clone();

    this.title           = title;

    this.formId          = formId;

    this.name            = name;

    this.buttons         = buttons;

    this.context_inputs  = context_inputs;

    this.parentData      = parentData;

    this.headerComponent = headerComponent;

    /**
     * Force update state of the service
     * (eg. setted on a child to parent form service relation)
     */
    this.state = {
      layerid:              layer.getId(),
      loading:              false,
      components:           [],
      disabledcomponents:   [],
      component:            null,
      headers:              [],
      currentheaderid:      null,
      fields:               null,
      buttons:              this.buttons,
      disabled:             false,
      isnew,
      valid:                true, // global form validation state. True at beginning
      update:               feature.isNew(), // set update in case or not is a new feature
      // when input change will be update
      tovalidate:           {},
      feature,
      componentstovalidate: {},
      footer,
      ready:                false
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

  }

  setReady(bool = false) {
    this.state.ready = bool;
  };

  /**
   * Called when an input change value
   *
   * @param input
   */
  changeInput(input) {
    if (true === this.listenChangeInput) {
      this.evaluateFilterExpressionFields(input);
      this.evaluateDefaultExpressionFields(input);
      this.isValid(input);
      this.isUpdated(input);
    }
  };

  /**
   * Check if the form is updated base on change on input
   *
   * @param input
   */
  isUpdated(input) {
    this.state.update = (
      this.force.update
      || (
        !this.state.update
          ? input.update
          : !!this.state.fields.find(f => f.update)
      )
    );
  };

  /**
   *
   */
  setUpdate(bool = false, options = {}) {
    const { force = false } = options;
    this.force.update = force;
    this.state.update = this.force.update || bool;
    if (false === this.state.update) {
      // set original `field._value` equal to current value to get changes
      this.state.fields.forEach(f => f._value = f.value )
    }
  };

  /**
   * Evaluate filter expression
   *
   * @param input
   */
  evaluateDefaultExpressionFields(input = {}) {
    const filter = this.default_expression_fields_dependencies[input.name];
    if (filter) {
      this.feature.set(input.name, input.value);
      filter.forEach(dependency_field => {
        getDefaultExpression({
          parentData:   this.parentData,
          qgs_layer_id: this.layer.getId(),
          field:        this._getField(dependency_field),
          feature:      this.feature,
        })
      })
    }
  };

  /**
   * Evaluate filter expression fields
   *
   * @param input
   */
  evaluateFilterExpressionFields(input = {}) {
    const filter = this.filter_expression_fields_dependencies[input.name];
    if (filter) {
      // on form service inititalization `filter_expression` option has
      // `referencing_fields` or `referenced_columns` from another layer
      const fieldForm = this._getField(input.name);
      if (fieldForm) { this.feature.set(fieldForm.name, fieldForm.value) }
      filter.forEach(dependency_field => {
        getFilterExpression({
          parentData:   this.parentData,
          qgs_layer_id: this.layer.getId(),
          field:        this._getField(dependency_field),
          feature:      this.feature,
        })
      })
    }
  };

  /**
   * Handle a field that has a `filter_expression` value object
   *
   * @since 3.8.0
   */
  _handleFieldWithFilterExpression(field, filter_expression) {
    if (!filter_expression) { return }

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
    getFilterExpression({
      parentData:   this.parentData,
      qgs_layer_id: this.layer.getId(),
      feature:      this.feature,
      field,
    });
  };

  /**
   * Handle a field that has a `default_value` object and check if `apply_on_update` only
   *
   * @since 3.8.0
   */
  _handleFieldWithDefaultExpression(field, default_expression) {
    if (default_expression) {
      const {
        referencing_fields = [],
        referenced_columns = [],
        apply_on_update    = false,
      } = default_expression;

      // Skip if not apply_on_update (listen dependencies change only for new Feature)
      if (!apply_on_update && !this.state.isnew) { return }

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
        getDefaultExpression({
          field,
          feature:      this.feature,
          qgs_layer_id: this.layer.getId(),
          parentData:   this.parentData,
        });
      }
    }
  };

  /**
   * Handle fields with associated expression
   *
   * @param {Array} [fields = []]
   */
  handleFieldsWithExpression(fields = []) {
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

  setCurrentFormPercentage(perc) {
    this.layer.setFormPercentage(perc)
  };

  setLoading(bool = false) {
    this.state.loading = bool;
  };

  setValidComponent({ id, valid }) {
    this.state.componentstovalidate[id] = valid;
    this.isValid();
  };

  getValidComponent(id) {
    return this.state.componentstovalidate[id];
  };

  /**
   * Every input sends to form its valid value that will change the general state of form
   */
  isValid(input) {
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

          if (!this.state.tovalidate[input_name].validate.empty) { filled.push(input_name)  }

        }
        if (filled.length < 2) {
          filled.forEach((input_name) => {
            this.state.tovalidate[input_name].validate.mutually_valid = true;
            this.state.tovalidate[input_name].validate.valid          = true;
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
      Object.values(this.state.tovalidate).reduce((previous, input) => previous && input.validate.valid, true)
      && Object.values(this.state.componentstovalidate).reduce((previous, valid) => previous && valid, true)
    );
  };

  addComponents(components = []) {
    for (const component of components) {
      this.addComponent(component);
    }
  };

  addComponent(component) {
    if (!component) { return }
    const { id, title, name, icon, valid, headerComponent, header = true } = component;
    if (undefined !== valid) {
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

  replaceComponent({ id, component } = {}) {
    this.state.components.splice(this.state.components.findIndex(c => id === c.id), 1, component);
  };

  disableComponent({id, disabled}) {
    if (disabled) { this.state.disabledcomponents.push(id) }
    else { this.state.disabledcomponents = this.state.disabledcomponents.filter(disableId => id !== disableId) }
  };

  setCurrentComponentById(id) {
    if (!this.state.disabledcomponents.includes(id)) {
      this.setIdHeader(id);
      this.state.component = this.state.components.find(c => id === c.id).component;
      return this.state.component;
    }
  };

  /**
   * setRootComponent (is form)
   */
  setRootComponent() {
    this.state.component = this.state.components.find(c => c.root).component;
  };

  getRootComponent() {
    return this.state.components.find(c => c.root).component;
  };

  isRootComponent(component) {
    return component === this.getRootComponent();
  };

  getComponentById(id) {
    return this.state.components.find(c => id === c.id);
  };

  setComponent(component) {
    this.state.component = component;
  };

  addedComponentTo(formcomponent = 'body') {
    this.state.addedcomponentto[formcomponent] = true;
  };

  addToValidate(input) {
    this.state.tovalidate[input.name] = input;
    // check if is mounted on form gui an otherwise leave form component to run is Valid when form is mounted on dom
    if (this.state.ready) { this.isValid(input) }
  };

  removeToValidate(input) {
    delete this.state.tovalidate[input.name];
    this.isValid();
  };

  getState() {
    return this.state;
  };

  _setState(state) {
    this.state = state;
  };

  getFields() {
    return this.state.fields;
  };

  _getField(fieldName) {
    return this.state.fields.find(f => fieldName === f.name);
  };

  getEventBus() {
    return this.eventBus;
  };

  setIdHeader(id) {
    this.state.currentheaderid = id;
  };

  getContext() {
    return this.context_inputs.context;
  };

  getSession() {
    return this.getContext().session;
  };

  getInputs() {
    return this.context_inputs.inputs;
  };

  /**
   * handleRelation
   */

  handleRelation({relationId, feature}) {
    //OVERWRITE BY  PLUGIN EDITING PLUGIN
  };

  /**
   * Clear all the open things opened by service
   */
  clearAll() {
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
  async saveDefaultExpressionFieldsNotDependencies() {
    if (0 === this.default_expression_fields_on_update.length) { return }

    // disable listen changeInput
    this.listenChangeInput      = false;
    // Array contains field name already resolved with server default_expression request
    const requested_expressions = [];
    // array of defaultExpressionPromises request
    const pending_expressions   = [];

    // loop through default_expression_fields
    for (let i = 0; i < this.default_expression_fields_on_update.length; i++) {

      // extract all dependency fields of current field
      const dFs = Object.keys(this.default_expression_fields_dependencies)
        .filter(field => {
          return (
            // check if dependency field is field on update
            this.default_expression_fields_on_update.find(({name}) => name === field) &&
            // if it has bind current field
            this.default_expression_fields_dependencies[field].find(fieldName => fieldName === this.default_expression_fields_on_update[i].name)
          )
        });

      // id current field has a Array (at least one) dependency fields
      // need to evaluate its value and after evaluate field value expression
      for (let i = 0; i < dFs.length; i++) {
        // in case already done a default_expression request evaluation from server
        if (undefined !== requested_expressions.find(name => dFs[i] === name)) {
          continue;
        }
        // get value. Need to wait response
        try {
          const value = await getDefaultExpression({
            field:        this._getField(dFs[i]),
            feature:      this.feature,
            qgs_layer_id: this.layer.getId(),
            parentData:   this.parentData
          });
          // update field with evaluated value to feature
          this.feature.set(dFs[i], value);
          // add to array
          requested_expressions.push(dFs[i]);
        } catch(e) {
          console.warn(e);
        }
      }

    }

    this.default_expression_fields_on_update.forEach(field => {
      if (undefined === requested_expressions.find(name => field.name === name)) {
        pending_expressions.push(getDefaultExpression({
          field,
          feature:      this.feature,
          qgs_layer_id: this.layer.getId(),
          parentData:   this.parentData
        }))
      }
    });

    try {
      await Promise.allSettled(pending_expressions);
    } catch(e) {
      console.warn(e);
    }

    // enable listen changeInput
    this.listenChangeInput = true;

  };
};
