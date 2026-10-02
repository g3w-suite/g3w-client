<!--
  @file Render and validate form input controls.
  @since v4.2
-->

<template>
  <!-- Hide invisible fields; child fields recurse through g3w-input instead of rendering a control. -->
  <div v-if = "state.visible">

    <!-- Child groups preserve their field tree and forward the same validation events. -->
    <div
      v-if = "'child' === state.type"
      style = "border-top: 2px solid"
      class = "skin-border-color field-child"
    >
      <h4 style = "font-weight: bold">{{ state.label}}</h4>
      <div> {{ state.description }} </div>
      <g3w-input
        v-for             = "field in state.fields" :key = "field.name"
        :state            = "field"
        @changeinput      = "forwardChangeInput"
        :changeInput      = "changeInput"
        @addinput         = "forwardAddInput"
        :addToValidate    = "addToValidate"
        @removeinput      = "forwardRemoveInput"
        :removeToValidate = "removeToValidate"
      ></g3w-input>
    </div>

    <div v-else>
      <!-- Native controls share labels, validation feedback and help text. -->
      <div v-if = "isNativeInput" class = "form-group">
        <!-- lonlat_input renders separate longitude and latitude labels below. -->
        <template v-if = "'lonlat_input' !== type && (undefined === state.showlabel || state.showlabel)">
          <label
            :for       = "state.name"
            v-disabled = "!editable"
            class      = "control-label"
            style      = "text-align:left !important; padding-top:0 !important; margin-bottom:3px"
          >
            <!-- Localized labels use the translation directive; plain labels stay literal. -->
            <span v-if = "state.i18nLabel" v-t = "state.label"></span><span v-else>{{ state.label }}</span>
            <!-- Required status and help are independent label adornments. -->
            <span v-if = "state.validate && state.validate.required">*</span>
            <i
              v-if        = "showhelpicon"
              class       = "fas fa-info-circle skin-color"
              style       = "margin-left: 3px; cursor: pointer"
              @click.stop = "showHideHelp"
            ></i>
          </label>
        </template>

        <!-- Coordinate inputs render relation status beside each coordinate instead. -->
        <div v-if = "state.relationField && 'lonlat_input' !== type" style = "color: var(--skin-warning); padding: 3px 0 3px 15px">
          <i aria-hidden = "true" class = "fas fa-exclamation-circle"></i>
          <span v-t = "'Relation key field'"></span>
        </div>

        <!-- Show progress only while the input's remote options are loading. -->
        <div v-if = "loadingState === 'loading'" style = "position:relative; width: 100%">
          <div class = "bar-loader" style = "border: 0"></div>
        </div>

        <!-- Text and string schemas share the same single-line editor. -->
        <input
          v-if         = "['text_input', 'string_input'].includes(type)"
          :placeholder = "state.default"
          @keyup       = "isMobile() ? mobileChange($event) : change()"
          :tabIndex    = "tabIndex"
          v-disabled   = "!editable"
          :field       = "state.name"
          v-model      = "state.value"
          class        = "form-control"
          :class       = "{'input-error-validation' : notvalid}"
          :id          = "state.name"
        >

        <!-- Textareas notify on both keystrokes and committed browser changes. -->
        <textarea
          v-else-if      = "'textarea_input' === type"
          @keydown.stop = ""
          :placeholder  = "state.default"
          @input        = "change()"
          @change       = "change()"
          style         = "max-width: 100%; min-width: 100%"
          rows          = "3"
          :tabIndex     = "tabIndex"
          v-disabled    = "!editable"
          :class        = "{'input-error-validation' : notvalid}"
          v-model       = "state.value"
        ></textarea>

        <!-- Numeric aliases use a number control; the schema supplies its step. -->
        <input
          v-else-if     = "['integer_input', 'bigint_input', 'float_input'].includes(type)"
          @change      = "change()"
          @input       = "change()"
          class        = "form-control"
          style        = "width:100%"
          :tabIndex    = "tabIndex"
          v-disabled   = "!editable"
          :class       = "{'input-error-validation' : notvalid}"
          v-model      = "state.value"
          type         = "number"
          :step        = "state.step || 1"
          :placeholder = "state.default"
        >

        <!-- Color values use the browser-native color picker. -->
        <input
          v-else-if     = "'color_input' === type"
          :placeholder = "state.default"
          type         = "color"
          @change      = "change()"
          :tabIndex    = "tabIndex"
          v-disabled   = "!editable"
          :field       = "state.name"
          class        = "form-control"
          style        = "cursor: pointer"
          v-model      = "state.value"
          :class       = "{'input-error-validation' : notvalid}"
          :id          = "state.name"
        >

        <!-- Checkbox booleans are mapped to the configured stored option value. -->
        <div v-else-if = "'check_input' === type" v-disabled = "!editable" style = "height: 20px; margin-top: 8px">
          <input
            @change   = "change()"
            :tabIndex = "tabIndex"
            :class    = "{'input-error-validation' : notvalid}"
            v-model   = "checkboxValue"
            type      = "checkbox"
            :id       = "checkboxId"
          />
          <label :for = "checkboxId">{{ checkboxLabel }}</label>
        </div>

        <!-- Each radio option shares one group name and writes its configured value. -->
        <div v-else-if = "'radio_input' === type">
          <span v-for = "(option, index) in state.input.options.values" :key = "option.key || option.value">
            <input
              :id       = "radioIds[index]"
              :name     = "radioName"
              :value    = "option.value"
              :tabIndex = "tabIndex"
              v-disabled= "!editable"
              :class    = "{'input-error-validation' : notvalid}"
              v-model   = "radioValue"
              type      = "radio"
            />
            <label :for = "radioIds[index]" style = "padding: 5px">{{ option.key || option.value }}</label>
          </span>
        </div>

        <!-- Numeric ranges share validation but keep their type-specific bounds and step. -->
        <template v-else-if = "'range_input' === type">
          <input
            @keydown.69.prevent = ""
            @keydown.13.stop    = ""
            @change             = "checkRangeValue"
            @blur               = "checkRangeValue"
            style               = "width:100%; padding-right: 5px;"
            class               = "form-control"
            :tabIndex           = "tabIndex"
            v-disabled          = "!editable"
            :class              = "{'input-error-validation' : notvalid}"
            v-model             = "state.value"
            type                = "number"
            :step               = "rangeStep"
            :min                = "rangeMin"
            :max                = "rangeMax"
          >
        </template>

        <div v-else-if = "'slider_input' === type">
          <!-- The current value is shown separately because range inputs do not display it. -->
          <span style = "font-weight: bold">{{ state.value }}</span>
          <input
            @change     = "change()"
            style       = "width:100%; padding-right: 5px;"
            :tabIndex   = "tabIndex"
            v-disabled  = "!editable"
            :class      = "{'input-error-validation' : notvalid}"
            v-model     = "state.value"
            :min        = "state.input.options.min"
            :max        = "state.input.options.max"
            type        = "range"
            :step       = "state.input.options.step"
          >
        </div>

        <!-- Uploaded media is previewed by g3w-field and can be cleared independently. -->
        <div v-else-if = "'media_input' === type" v-disabled = "!editable">
          <div
            class           = "g3w_input_button skin-border-color"
            @click          = "onClick"
            style           = "border-style: solid; border-width: 2px; width:100%; cursor: pointer; text-align: center;"
            v-t-tooltip:top = "accept"
          >
            <i class = "fas fa-file-upload fa-2x skin-color" style = "padding: 5px;">
              <input
                :id       = "mediaid"
                style     = "display:none"
                :name     = "state.name"
                :tabIndex = "tabIndex"
                :data-url = "state.input.options.uploadurl"
                :class    = "{'input-error-validation' : notvalid}"
                type      = "file"
                :accept   = "accept"
                @change   = "onChangeFile"
              >
            </i>
          </div>
          <div v-if = "loading" class = "bar-loader" style = "border: 0"></div>
          <g3w-field field-type = "media" :state = "mediaData">
            <div class = "clearmedia" @click.stop = "clearMedia">
              <i class = "far fa-trash-alt g3w-icon"></i>
            </div>
          </g3w-field>
        </div>

        <!-- Unique values can add tags only when the schema allows editing. -->
        <div v-else-if = "'unique_input' === type" v-disabled = "!editable">
          <x-select
            ref               = "select"
            :value            = "getValue(state.value)"
            :tabIndex         = "tabIndex"
            searchable
            :createTag        = "state.input.options.editable ? '' : null"
            @change           = "onUniqueSelect"
          >
            <x-option value = "null"></x-option>
            <x-option v-for = "value in state.input.options.values" :key = "value" :value = "getValue(value)">
              {{ getValue(value) }}
            </x-option>
            <x-option v-if = "null !== state.value && !state.input.options.values.some(value => getValue(value) === getValue(state.value))" :value = "getValue(state.value)">
              {{ getValue(state.value) }}
            </x-option>
          </x-select>
        </div>

        <!-- Fixed choices, autocomplete, map picking and relation filters. -->
        <div v-else-if = "['select_input', 'select_autocomplete_input'].includes(type)">
          <!-- The map-pick affordance is available only for eligible autocomplete layers. -->
          <span
            v-if            = "showPickLayer"
            v-t-tooltip:top = "'Get value from map layer'"
            v-disabled      = "disabled"
            @click.stop     = "pickLayerValue"
            class           = "g3w-input-pick-layer skin-color"
          ><i class = "fas fa-crosshairs"></i></span>
          <!-- Relation filters remain hidden until their initial option lists are ready. -->
          <div
            v-if  = "filterFields.length && isFilterFieldsReady"
            class = "g3w-relation-reference-fields-content"
          >
            <template v-for = "(filter, index) in filterFields">
              <x-select
                :data-filter-id = "filter.id"
                :value          = "filter.value"
                :disabled       = "filter.disabled"
                searchable
                @change         = "onRelationFilterChange(filter, $event)"
              >
                <x-option v-for = "option in filter.values" :key = "option.value" :value = "getValue(option.value)">{{ option.key }}</x-option>
              </x-select>
            </template>
            <span class = "divider"></span>
          </div>
          <!-- Disabled state includes loading and errors. -->
          <div v-disabled = "disabled" :tabIndex = "tabIndex">
            <x-select
              ref               = "select"
              :value            = "getSelectValue()"
              :multiple         = "multiple"
              :searchable       = "true"
              :disabled         = "disabled"
              @change           = "onSelectChange"
              @search-input     = "searchAutocomplete"
            >
              <x-option v-if = "showNullOption" value = "null"></x-option>
              <x-option v-for = "({key, value}) in state.input.options.values" :key = "value" :value = "getValue(value)">
                {{ key }}
              </x-option>
            </x-select>
          </div>
          <!-- Surface remote option-load failures without replacing the select control. -->
          <p v-if = "'error' === loadingState" class = "error-input-message" v-t = "'server_error'"></p>
        </div>

        <!-- The date-picker input is initialized from QGIS formats in mounted(). -->
        <div v-else-if = "'datetimepicker_input' === type" ref = "datetimepicker_body">
          <div class = "input-group date" :id = "iddatetimepicker" v-disabled = "!editable">
            <input
              type      = "text"
              :id       = "idinputdatetimepiker"
              :tabIndex = "tabIndex"
              :readonly = "!editable || isMobile() ? 'readonly' : null"
              :class    = "{'input-error-validation' : notvalid}"
              class     = "form-control"
            />
            <span class = "input-group-addon skin-color" style = "border: 1px solid #ccc; cursor:pointer">
              <span :class = "[!state.input.options.formats[0].date ? 'far fa-clock' : 'fas fa-calendar-alt']"></span>
            </span>
          </div>
        </div>

        <!-- Map-backed controls pick either feature attributes or map coordinates. -->
        <!-- This read-only text field is populated only by a map feature/coordinate pick. -->
        <div v-else-if = "'picklayer_input' === type">
          <span
            style  = "left: 0; top: 7px; position: absolute"
            class  = "fas fa-crosshairs skin-color"
          ></span>
          <input
            @input     = "change()"
            @click     = "pickLayer"
            @blur      = "unpick"
            style      = "width: 100%"
            :style     = "{cursor: editable ? 'pointer' : null}"
            class      = "form-control"
            readonly   = "readonly"
            :tabIndex  = "tabIndex"
            v-disabled = "!editable"
            :class     = "{'input-error-validation' : notvalid}"
            v-model    = "state.value"
          >
        </div>

        <!-- Longitude and latitude are separate editable values with one map-pick action. -->
        <div v-else-if = "'lonlat_input' === type" style = "position: relative">
          <div style = "display: flex; justify-content: flex-end; height: 35px; margin-right: 12px; margin-bottom: 5px">
            <button
              @click.prevent.stop = "toggleGetCoordinate"
              :style              = "{border: coordinatebutton.active ? '2px solid' : 0}"
              data-placement      = "left"
              v-t-tooltip         = "'Click on map to get coordinates'"
              class               = "action skin-color skin-border-color fas fa-crosshairs"
              style               = "border-radius: 5px; font-weight: bold; font-size: 20px; cursor: pointer"
            ></button>
          </div>
          <!-- Keep coordinate labels and constraints independent for accessibility. -->
          <div v-if = "state.visible" class = "form-group">
            <template v-if = "undefined === state.showlabel || state.showlabel">
              <label :for = "lonId" class = "col-sm-4 control-label" style = "text-align:left !important; padding-top:0 !important; margin-bottom:3px">
                {{ state.labels.lon }} <span v-if = "state.validate && state.validate.required">*</span>
              </label>
            </template>
            <div v-if = "state.relationField" style = "color: var(--skin-warning); padding: 3px 0 3px 15px">
              <i aria-hidden = "true" class = "fas fa-exclamation-circle"></i><span v-t = "'Relation key field'"></span>
            </div>
            <input :id = "lonId" @change = "changeLonLat" :class = "{'input-error-validation' : notvalid}" class = "form-control" style = "width:100%; margin-bottom: 5px;" :tabIndex = "tabIndex" v-disabled = "!editable" v-model = "state.values.lon" type = "number" min = "-180" max = "180" placeholder = "Lon">
          </div>
          <!-- Latitude mirrors longitude but uses its own identifier and bounds. -->
          <div v-if = "state.visible" class = "form-group">
            <template v-if = "undefined === state.showlabel || state.showlabel">
              <label :for = "latId" class = "col-sm-4 control-label" style = "text-align:left !important; padding-top:0 !important; margin-bottom:3px">
                {{ state.labels.lat }} <span v-if = "state.validate && state.validate.required">*</span>
              </label>
            </template>
            <div v-if = "state.relationField" style = "color: var(--skin-warning); padding: 3px 0 3px 15px">
              <i aria-hidden = "true" class = "fas fa-exclamation-circle"></i><span v-t = "'Relation key field'"></span>
            </div>
            <input :id = "latId" @change = "changeLonLat" class = "form-control" style = "width:100%; margin-bottom: 5px;" :tabIndex = "tabIndex" v-disabled = "!editable" v-model = "state.values.lat" type = "number" :class = "{'input-error-validation' : notvalid}" min = "-90" max = "90" placeholder = "Lon">
          </div>
        </div>

        <!-- Quill is mounted on this element and synchronized with state.value. -->
        <div
          v-else-if = "'texthtml_input' === type"
          ref        = "quill_editor"
          class      = "form-control"
          @keydown.stop = ""
          :style     = "{ border: state.validate.valid ? '1px solid #ccc' : '1px solid reed' }"
          v-disabled = "!editable"
        ></div>

        <!-- Validation takes precedence over informational helper text. -->
        <p
          v-if   = "notvalid"
          class  = "g3w-long-text error-input-message"
          style  = "margin: 0"
          v-html = "state.validate.message"
        ></p>
        <p v-else-if = "state.info" style = "margin: 0" v-html = "state.info"></p>
        <!-- Help content is expanded only when the field state marks it visible. -->
        <div
          v-if   = "state.help && state.help.visible"
          v-html = "state.help.message"
          class  = "g3w_input_help skin-background-color"
          style  = "background-color: hsl(from var(--skin-color) h s calc(l + 48)) !important;"
        ></div>
      </div>

      <!-- Unknown input types are resolved as registered plugin components. -->
      <component
        v-else
        @changeinput      = "forwardChangeInput"
        :changeInput      = "changeInput"
        @addinput         = "forwardAddInput"
        :addToValidate    = "addToValidate"
        @removeinput      = "forwardRemoveInput"
        :removeToValidate = "removeToValidate"
        :state            = "state"
        :is               = "type"
      ></component>
      <!-- Legacy standalone adapters can suppress the divider; form fields keep it by default. -->
      <span v-if = "showDivider" class = "divider"></span>
    </div>
  </div>
</template>

<script>
  import G3WField                                    from 'components/G3WField.vue';
  import GUI                                         from 'g3w-app';
  import ApplicationState                            from 'g3w-state';
  import { QUERY_POINT_TOLERANCE }                   from 'g3w-constants';
  import { getUniqueDomId }                          from 'utils/getUniqueDomId';
  import { gettext as _ }                            from 'g3w-i18n';
  import { toRawType }                               from 'utils/toRawType';
  import Quill                                       from 'quill';
  import { throttle }                                from 'utils/throttle';
  import { debounce }                                from 'utils/debounce';
  import { convertQGISDateTimeFormatToMoment }        from 'utils/convertQGISDateTimeFormatToMoment';
  import PickFeatureInteraction                      from 'interactions/pick-feature';
  import PickCoordinatesInteraction                  from 'interactions/pick-coordinates';
  import { getCatalogLayerById }                     from 'utils/getCatalogLayerById';

  /**
   * Encode one or more values in the filter syntax used by getFilterData().
   * @param {Object} options Field name, values, comparison operator and join operator.
   * @returns {string} Encoded field expressions joined with the requested logic operator.
   */
  function createSingleFieldParameter({ field, value, operator = 'eq', logicop = 'OR' }) {
    return [].concat(value)
      .map(item => `${field}|${operator.toLowerCase()}|${encodeURIComponent(item)}`)
      .join(`|${logicop},`);
  }

  /**
   * Render a built-in form control or delegate an unrecognized type to a plugin.
   * `inputType` pins the type for legacy standalone adapters; otherwise it is
   * resolved from `state.input.type` (with numeric field-type compatibility).
   * Native controls own the shared form shell, while custom components own theirs.
   *
   * The parent supplies a mutable field schema: `state.value` and `state._value`
   * hold current/original values, `state.validate` holds validation metadata,
   * and `state.input.options` supplies control-specific configuration.
   * Built-in controls update this shared object rather than replacing the prop.
   *
    * Validation and map picking are owned directly by this component; no service
    * wrapper is required between its lifecycle hooks and methods.
   *
    * Lifecycle: created() registers built-in fields and initializes native/select
    * behavior, including relation options; mounted() attaches DOM-dependent widgets.
    * beforeDestroy() releases listeners and interactions; destroyed() unregisters
    * built-in fields from the form.
   *
   * @prop {Object} state Field value, validation metadata and input options.
   * @prop {string|null} inputType Optional explicit type used by legacy adapters.
   * @prop {boolean} showDivider Whether to render the trailing divider.
   * @prop {Function} addToValidate Callback used by the containing form.
   * @prop {Function} changeInput Callback used when the field value changes.
   * @prop {Function} removeToValidate Callback used when the field is destroyed.
   * @fires addinput Registers this field with its containing form.
   * @fires changeinput Reports an updated value and validation state.
   * @fires removeinput Unregisters this field from its containing form.
   * @fires datetimepickershow Legacy event emitted on both date-picker open and close.
   */
  export default {
    name: "g3w-input",
    props: {
      /**
       * @type {string|null} Override type resolution when this component is used as a legacy adapter.
       */
      inputType: {
        type: String,
        default: null
      },
      /**
       * @type {boolean} Control whether the standalone adapter renders its trailing divider.
       */
      showDivider: {
        type: Boolean,
        default: true
      },
      /**
       * @type {Object} Field value, input schema, visibility and validation metadata.
       */
      state: {
        required: true
      },
      /**
       * @type {Function} Register this field with the parent form's validation state.
       */
      addToValidate:{
        type: Function,
        default: () => {}
      },
      /**
       * @type {Function} Remove this field from the parent form when it is destroyed.
       */
      removeToValidate:{
        type: Function,
        default: () => {}
      },
      /**
       * @type {Function} Notify the parent form that this field's value or validity changed.
       */
      changeInput: {
        type: Function,
        default: () => {}
      }
    },
    components: {
      'g3w-field': G3WField,
    },
    /**
     * Values derived from the field schema and the selected input adapter.
     */
    computed: {
      /**
       * Resolve adapter overrides, aliases and legacy numeric fields to a renderer.
       * @returns {string} Registered input component name.
       */
      type() {
        // Legacy adapters pin their renderer type regardless of the field schema.
        if (this.inputType) {
          return this.inputType.endsWith('_input') ? this.inputType : `${this.inputType}_input`;
        }
        // Older numeric fields may declare a text input while retaining a numeric field type.
        /**
         * Preserve legacy numeric fields whose input schema still says "text".
         * @since 4.0.8
         */
        if (['integer', 'bigint', 'float'].includes(this.state.type) && 'text' === this.state.input.type) {
          return `${this.state.type}_input`;
        }
        return `${this.state.input?.type ?? this.state.type}_input`;
      },
      /**
       * Identify types implemented by this component rather than plugin components.
       * @returns {boolean} Whether the resolved type uses the native form shell.
       */
      isNativeInput() {
        return [
          'text_input', 'string_input', 'textarea_input',
          'integer_input', 'bigint_input', 'float_input',
          'color_input', 'check_input', 'radio_input',
          'range_input', 'slider_input', 'media_input', 'unique_input',
          'texthtml_input', 'datetimepicker_input', 'picklayer_input', 'lonlat_input',
          'select_input', 'select_autocomplete_input'
        ].includes(this.type);
      },
      /**
       * Whether this select uses remote autocomplete rather than a fixed list.
       * @returns {boolean}
       */
      autocomplete() {
        return 'select_autocomplete' === this.state.input.type && this.state.input.options.usecompleter;
      },
      /**
       * Whether this select uses the multiple-value encoding.
       * @returns {boolean}
       */
      multiple() {
        return this.allowmulti;
      },
      /**
       * Whether a single-select control should expose its empty option.
       * @returns {boolean}
       */
      showNullOption() {
        return false === this.multiple && [undefined, true].includes(this.state.nullOption);
      },
      /**
       * Whether the field can currently be edited.
       * @returns {boolean}
       */
      editable() {
        return this.state.editable;
      },
      /**
       * Whether the control is read-only or waiting for remote values.
       * @returns {boolean}
       */
      disabled() {
        return !this.editable || ['loading', 'error'].includes(this.loadingState);
      },
      /**
       * Keyboard tab order for editable and read-only controls.
       * @returns {number}
       */
      tabIndex() {
        return this.editable ? 0 : -1;
      },
      /**
       * Whether current field validation has failed.
       * @returns {boolean}
       */
      notvalid() {
        return false === this.state.validate.valid;
      },
      /**
       * Whether the label should show the expandable help control.
       * @returns {boolean|string|null|undefined} Trimmed help text or a falsy value.
       */
      showhelpicon() {
        return this.state.help && this.state.help.message.trim();
      },
      /**
       * Current asynchronous loading state for the field's input options.
       * @returns {string|null}
       */
      loadingState() {
        return this.state.input.options.loading
          ? this.state.input.options.loading.state
          : null;
      },
      /**
       * Minimum allowed value, from the range value tuple or slider options.
       * @returns {number|string}
       */
      rangeMin() {
        return 'range_input' === this.type
          ? this.state.input.options.values[0].min
          : this.state.input.options.min;
      },
      /**
       * Maximum allowed value, from the range tuple or slider options.
       * @returns {number|string}
       */
      rangeMax() {
        return 'range_input' === this.type
          ? this.state.input.options.values[0].max
          : this.state.input.options.max;
      },
      /**
       * Step size, using the legacy capitalized range option when applicable.
       * @returns {number|string}
       */
      rangeStep() {
        return 'range_input' === this.type
          ? this.state.input.options.values[0].Step || 1
          : this.state.input.options.step;
      },
      /**
       * Map the checkbox's boolean state to the matching configured option value.
       * Nullish values remain unchecked; an unmatched non-null value falls back
       * to the configured unchecked option and updates the stored field value.
       */
      checkboxValue: {
        /**
         * @returns {boolean} Whether the currently stored option is checked.
         */
        get() {
          if ([null, undefined].includes(this.state.value)) {
            return false;
          }
          let option = this.state.input.options.values.find(option => this.state.value == option.value);
          if (!option) {
            option = this.state.input.options.values.find(option => false === option.checked);
            if (option) {
              this.state.value = option.value;
            }
          }
          return !!(option || {}).checked;
        },
        /**
         * @param {boolean} checked New checkbox state.
         */
        set(checked) {
          const option = this.state.input.options.values.find(option => checked === option.checked);
          if (option) {
            this.state.value = option.value;
          }
        }
      },
      /**
       * Display label associated with the stored checkbox option.
       * @returns {string|number|undefined}
       */
      checkboxLabel() {
        const option = this.state.input.options.values.find(option => this.state.value == option.value) || {};
        return option.label ?? option.value;
      },
      /**
       * Read and update the currently selected radio option.
       */
      radioValue: {
        /**
         * @returns {*} Stored field value.
         */
        get() {
          return this.state.value;
        },
        /**
         * @param {*} value Newly selected option value.
         */
        set(value) {
          this.state.value = value;
          this.change();
        }
      },
      /**
       * Whether map-coordinate capture is currently active.
       * @returns {boolean}
       */
      getCoordinateActive() {
        return this.coordinatebutton.active;
      }
    },
    /**
     * Allocate per-instance widget identifiers and mutable UI state.
     * @returns {Object} Reactive data for this input instance.
     */
    data() {
      return {
        checkboxId:            getUniqueDomId(),
        radioName:             `name_${getUniqueDomId()}`,
        radioIds:              Array.from({ length: (this.state.input?.options?.values || []).length }, () => getUniqueDomId()),
        mediaData:             { value: null, mime_type: null },
        mediaid:               `media_${getUniqueDomId()}`,
        iddatetimepicker:      `datetimepicker_${getUniqueDomId()}`,
        idinputdatetimepiker:  `inputdatetimepicker_${getUniqueDomId()}`,
        lonId:                 getUniqueDomId(),
        latId:                 getUniqueDomId(),
        coordinatebutton:      { active: false },
        loading:               false,
        edit_state:            { edit: false, show_html: false },
        showPickLayer:         false,
        picked:                false,
        filterFields:          [],
        isFilterFieldsReady:   false,
        allowmulti:            false,
        unwatch:               null,
        filterFieldsUnwatches: null,
        accept:                (this.state.input?.options?.allowed_types || []).map(type => `${type.startsWith('.') ? type : `.${type}`}`).join(','),
      };
    },
    /**
     * Keep validation and third-party widgets synchronized with field changes.
     */
    watch: {
      /**
       * Refresh validation styling for controls whose UI is outside Vue's DOM.
       * @param {boolean} notvalid Whether current field validation has failed.
       */
      async notvalid(notvalid) {
        // Native controls render their own message; custom selects need their trigger styled directly.
        if (this.isNativeInput && notvalid) {
          this.setErrorMessage();
        }
        if (['unique_input', 'select_input', 'select_autocomplete_input'].includes(this.type)) {
          await this.$nextTick();
          this.$refs.select?.trigger?.classList.toggle('input-error-validation', notvalid);
        }
      },
      /**
       * Resynchronize relation-filter widgets after selections or options change.
       */
      filterFields: {
        deep: true,
        handler() {
          this.$nextTick(() => this.syncRelationSelects());
        }
      },
      /**
       * Synchronize newly rendered filters once their initial option lists are ready.
       * @param {boolean} ready Whether relation filters can be rendered.
       */
      isFilterFieldsReady(ready) {
        if (ready) {
          this.$nextTick(() => this.syncRelationSelects());
        }
      },
      /**
       * Reflect external value changes in media, Quill and date-picker widgets.
       */
      async 'state.value'(value) {
        // Expression-backed defaults can update state without a DOM input event.
        if (this.isNativeInput && undefined !== this.state.input.options.default_expression) {
          setTimeout(() => this.change());
        }
        // The media preview is separate from the stored media object.
        if ('media_input' === this.type) {
          this.setMedia();
          this.change();
        }
        // Avoid echoing Quill's own edit back into its DOM; external edits still refresh it.
        if ('texthtml_input' === this.type && this.quill && !this.edit_state.edit) {
          if (this.edit_state.show_html) {
            this.quill.container.firstChild.innerText = this.state.value;
          } else {
            this.quill.container.firstChild.innerHTML = this.state.value;
          }
        }
        // Convert only when the stored value differs from the currently displayed date.
        if ('datetimepicker_input' === this.type && this.datetimefieldformat && value !== $(`#${this.idinputdatetimepiker}`).val()) {
          const date = null !== value
            ? moment(value, this.datetimefieldformat).format(this.datetimedisplayformat)
            : value;
          await this.$nextTick();
          $(`#${this.idinputdatetimepiker}`).val(date);
        }
        if (['unique_input', 'select_input', 'select_autocomplete_input'].includes(this.type)) {
          await this.$nextTick();
          this.setValue();
        }
      },
      /**
       * Keep the selected option aligned when its available values change.
       */
      async 'state.input.options.values'(values = []) {
        if (!['select_input', 'select_autocomplete_input'].includes(this.type) || this.autocomplete) {
          return;
        }
        await this.$nextTick();
        const empty = 0 === values.length;
        let value;
        // Empty option lists and cleared multi-selects reset to the null sentinel.
        if (empty || (this.multiple && 0 === this.getMultiValues().length)) {
          value = null;
        } else if (this.multiple) {
          value = `{${this.getMultiValues().join()}}`;
        // A removed single-select option must not remain selected.
        } else if (!this.multiple) {
          value = (values.find(option => option.value == this.state.value) || { value: null }).value;
        }
        const changed = value != this.state.value;
        if (undefined !== value) {
          this.state.value = value;
        }
        this.setValue();
        if (changed) {
          this.change();
        }
      }
    },
    methods: {
      /**
       * Validate a value using the rule for this field and input control.
       * @param {*} value Value to validate.
       * @returns {*} Usually boolean; the char rule preserves its legacy falsy result.
       */
      validateValue(value) {
        const state = this.state;
        const options = this.validationOptions;
        if ('lonlat_input' === this.type) {
          const values = state.values;
          values.lon = Math.max(-180, Math.min(180, values.lon));
          values.lat = Math.max(-90, Math.min(90, values.lat));
          return !Number.isNaN(1 * values.lon);
        }
        if ('range_input' === this.type) {
          const { min, max } = state.input.options.values[0];
          return 1 * value >= 1 * min && 1 * value <= 1 * max;
        }
        if ('slider_input' === this.type) {
          const { min, max } = state.input.options;
          return 1 * value >= 1 * min && 1 * value <= 1 * max;
        }
        switch (state.type) {
          case 'float':
            return !Number.isNaN(parseFloat(1 * value));
          case 'bigint':
            return Number.isSafeInteger(1 * value) && Math.abs(1 * value) <= Number.MAX_SAFE_INTEGER;
          case 'integer':
            return !Number.isNaN(1 * value) && Math.abs(1 * value) <= 2147483647;
          case 'checkbox':
            return (options.values || []).includes(value);
          case 'datetimepicker':
            return moment(value, options.fielddatetimeformat, true).isValid();
          case 'char':
            return value && 1 === `${value}`.length;
          case 'range':
            return 1 * value >= options.min && 1 * value <= options.max;
          default:
            return true;
        }
      },
      /**
       * Validate emptiness, uniqueness and the active field-type rule in that order.
       * Temporary relation-reference IDs bypass the field-type rule, not uniqueness.
      * @returns {*} Validation result, also written to state.validate.valid.
       */
      validate() {
        const state = this.state;
        // Required empty values fail before uniqueness or type-specific validation.
        if (state.validate.empty) {
          state.value = null;
          state.validate.valid = !state.validate.required;
        // Exclusions compare string forms so numeric and string IDs are treated consistently.
        } else if (state.validate.unique && state.validate.exclude_values?.size) {
          state.validate.valid = !state.validate.exclude_values.has(`${state.value}`);
        } else {
          const temp_id = state.input.options.relation_reference && state?.value?.startsWith?.('_new_');
          state.validate.valid = temp_id || this.validateValue(state.value);
        }
        if (!state.validate.valid) {
          console.log('[G3WInput] invalid field', {
            name: state.name,
            label: state.label,
            type: state.type,
            inputType: state.input.type,
            value: state.value,
            required: state.validate.required,
            message: state.validate.message,
            relationReference: state.input.options.relation_reference,
            relationId: state.input.options.relation_id,
          });
        }
        return state.validate.valid;
      },
      /**
       * Select translated validation feedback without recomputing field validity.
       * Precedence: server errors, cross-field constraints, unique exclusions,
       * then required/type feedback (which may use state.info).
       */
      setErrorMessage() {
        const state = this.state;
        const validate = state.validate;
        // Server-provided errors take precedence over all generated messages.
        if (validate.error) {
          validate.message = _(validate.error);
          return;
        }
        const type = _(state.type);
        if (validate.mutually && !validate.mutually_valid) {
          validate.message = `${_('Field mutually exclusive with ')} ( ${validate.mutually.join(',')} )`;
        } else if (validate.max_field) {
          validate.message = `${_('Value has to be less/equal to field value ')} (${validate.max_field})`;
        } else if (validate.min_field) {
          validate.message = `${_('Value has to be more/equal to field value  ')} (${validate.min_field})`;
        } else if (('unique' === state.input.type || validate.unique) && validate.exclude_values?.size) {
          validate.message = _('Value has to be unique');
        } else if (validate.required) {
          validate.message = state.info || `${_('Mandatory Field or wrong data type')} ( ${type} )`;
        } else {
          validate.message = state.info || `${_('Wrong data type')} ( ${type} )`;
        }
      },
      /**
       * Share the coordinate button's reactive state with a legacy consumer.
       * @param {Object} button Object containing the active boolean flag.
       */
      setCoordinateButtonReactiveObject(button) {
        this.coordinatebutton = button;
      },
      /**
       * Set the options loader state used by the shared progress indicator.
       * @param {boolean} bool True while values are being loaded.
       */
      setLoading(bool) {
        this.state.input.options.loading.state = bool ? 'loading' : 'ready';
      },
      /**
       * Toggle the visibility of the field's help message.
       */
      showHideHelp() {
        this.state.help.visible = !this.state.help.visible;
      },
      /**
       * Store a mobile text edit and run the standard validation/update flow.
       * @param {Event} event Input event from the text control.
       */
      mobileChange(event) {
        this.state.value = event.target.value;
        this.change();
      },
      /**
       * Close active date-picker or select overlays after a layout resize.
       */
      resize() {
        const picker = $(`#${this.iddatetimepicker}`);
        if (picker && picker.data('DateTimePicker')) {
          picker.data('DateTimePicker').hide();
        }
        if (!ApplicationState.ismobile) {
          this.$el?.querySelectorAll?.('x-select').forEach(select => select.close());
        }
      },
      /**
       * Recalculate emptiness, validity and dirty state, then notify the form.
       * @fires changeinput
       */
      change() {
        const state = this.state;
        state.validate.empty = null === state.value || '' === `${state.value}`.trim();
        this.validate();
        const { value, _value } = state;
        if ('media' === state.input.type) {
          const currentValue = 'Object' === toRawType(value) ? value.value : value;
          const originalValue = 'Object' === toRawType(_value) ? _value.value : _value;
          state.update = currentValue != originalValue;
        } else if ('datetimepicker' === state.input.type) {
          state.update = (null !== value ? value.toUpperCase() : value) != (_value ? _value.toUpperCase() : _value);
        } else {
          state.update = value != _value;
        }
        this.forwardChangeInput(this.state);
      },
      /**
       * Legacy visibility hook retained for input-component compatibility.
       */
      isVisible() {},
      /**
       * Forward the changed field through its callback and Vue event interfaces.
       * Avoid invoking the same handler twice when both interfaces share it.
       * @param {Object} state Updated field state.
       * @fires changeinput
       */
      forwardChangeInput(state) {
        if (this.changeInput !== this.$listeners.changeinput) {
          this.changeInput(state);
        }
        this.$emit('changeinput', state);
      },
      /**
       * Register this field through both supported parent-form interfaces.
       * @param {Object} state Field state to register.
       * @fires addinput
       */
      forwardAddInput(state) {
        if (this.addToValidate !== this.$listeners.addinput) {
          this.addToValidate(state);
        }
        this.$emit('addinput', state);
      },
      /**
       * Unregister this field through both supported parent-form interfaces.
       * @param {Object} state Field state to remove.
       * @fires removeinput
       */
      forwardRemoveInput(state) {
        if (this.removeToValidate !== this.$listeners.removeinput) {
          this.removeToValidate(state);
        }
        this.$emit('removeinput', state);
      },
      /**
       * Restore an optional range default and check its bounds.
       * Required empty fields remain invalid.
       */
      checkRangeValue() {
        const empty = null === this.state.value || '' === `${this.state.value}`.trim();
        // Optional ranges restore their schema default instead of persisting an empty value.
        if (empty && !this.state.validate.required) {
          this.state.value = this.state.input.options.values[0].default;
        }
        this.state.validate.valid = !this.state.validate.required;
        // Required empty ranges are already invalid; otherwise validate the configured bounds.
        if (!empty) {
          this.state.validate.valid = this.validateValue(this.state.value);
        }
        this.change();
      },
      /**
       * Adapt null to the string sentinel used by native select options.
       * @param {*} value Option value to adapt.
       * @returns {*} A DOM-safe option value.
       */
      getValue(value) {
        return null === value ? 'null' : value;
      },
      /**
       * Convert the select empty-option sentinel back to null and validate it.
       * @param {*} value Value received from the select.
       * @returns {Promise<void>} Resolves after Vue applies the updated selection.
       */
      async changeSelect(value) {
        // The blank option uses the string sentinel "null".
        this.state.value = 'null' === value ? null : value;
        await this.$nextTick();
        this.change();
      },
      /**
       * Remove every currently available option from the field schema.
       */
      resetValues() {
        this.state.input.options.values.splice(0);
      },
      /**
       * Synchronize the stored coordinate pair or current select value to its widget.
       */
      setValue() {
        if ('lonlat_input' === this.type) {
          this.state.value = [[1 * this.state.values.lon, 1 * this.state.values.lat]];
        } else if (this.$refs.select) {
          this.syncXSelect(this.$refs.select, this.getSelectValue(), this.multiple);
        }
        this.syncRelationSelects();
      },
      /**
       * Synchronize an existing x-select through its public selection methods.
       * @param {HTMLElement} select x-select element.
       * @param {*} value Single stored value or comma-separated multiple values.
       * @param {boolean} multiple Whether values are comma-separated.
       * @returns {boolean} False until the widget is initialized; true after synchronization.
       */
      syncXSelect(select, value, multiple = false) {
        if (!select?.container) {
          return false;
        }
        const options = Array.from(select.container.querySelectorAll('x-option'));
        const values = multiple ? `${value || ''}`.split(',').filter(Boolean) : [`${value ?? ''}`];
        select.selected_options = [];
        options.forEach(option => option.removeAttribute('selected'));
        values.forEach(value => {
          const option = options.find(option => option.value === value);
          if (option) {
            select.select(option, { autoclose: false, emit: false });
          }
        });
        if (multiple) {
          select.select(null, { autoclose: false, emit: false });
        } else if (!select.selected_options.length) {
          select.content.textContent = `${g3w?.gettext?.('Select') || 'Select'}...`;
        }
        select.setAttribute('value', multiple ? values.join(',') : values[0]);
        return true;
      },
      /**
       * Synchronize relation filter controls after their values or options change.
       */
      syncRelationSelects() {
        this.$el?.querySelectorAll?.('x-select[data-filter-id]').forEach(select => {
          const filter = this.filterFields.find(filter => `${filter.id}` === select.dataset.filterId);
          if (filter) {
            this.syncXSelect(select, filter.value);
          }
        });
      },
      /**
       * Return the selected value in x-select's single- or multiple-value format.
       * @returns {*} Single stored value (null becomes "null") or comma-separated values.
       */
      getSelectValue() {
        return this.multiple ? this.getMultiValues().join(',') : this.getValue(this.state.value);
      },
      /**
       * Store a selection made in the unique-value field.
       * @param {CustomEvent} event Change emitted by x-select.
       */
      async onUniqueSelect(event) {
        const selected = event.target.value;
        const value = 'null' === selected
          ? null
          : ['integer', 'float', 'bigint'].includes(this.state.type) ? Number(selected) : selected;
        await this.changeSelect(value);
      },
      /**
       * Store the selected field values in the form's serialized representation.
       * @param {CustomEvent} event Change emitted by x-select.
       */
      onSelectChange(event) {
        if (this.multiple) {
          const values = event.target.selected_options.map(option => option.value).filter(value => 'null' !== value);
          this.changeSelect(values.length ? `{${values.join()}}` : null);
        } else {
          this.changeSelect(event.target.value);
        }
      },
      /**
       * Store relation-filter changes after the control has been initialized.
       * @param {Object} filter Relation filter state.
       * @param {CustomEvent} event Change emitted by x-select.
       */
      onRelationFilterChange(filter, event) {
        filter.value = event.target.value;
      },
      /**
       * Load remote autocomplete options while retaining the current selection.
       * Debounce for 250 ms and ignore responses superseded by a newer search.
       * @param {CustomEvent} event Search emitted by x-select.
       */
      searchAutocomplete({ detail: { value = '' } = {} }) {
        clearTimeout(this.autocompleteSearchTimer);
        const request = this.autocompleteSearchId = (this.autocompleteSearchId || 0) + 1;
        const query = value.trim();
        if (!this.autocomplete || this.state.input.options.filter_expression || !query) {
          return;
        }
        this.autocompleteSearchTimer = setTimeout(async () => {
          try {
            const options = this.state.input.options;
            const results = await this.getData({ key: options.value, value: options.key, search: query });
            if (request !== this.autocompleteSearchId) {
              return;
            }
            const selected = new Set((this.multiple ? this.getMultiValues() : [this.state.value]).map(value => `${value}`));
            const retained = options.values.filter(option => selected.has(`${option.value}`));
            const values = [...retained, ...results.map(({ text, id }) => ({ key: text, value: id }))];
            options.values = Array.from(new Map(values.map(option => [`${option.value}`, option])).values());
            await this.$nextTick();
            this.setValue();
          } catch (error) {
            console.warn(error);
          }
        }, 250);
      },
      /**
       * Query a catalog layer for autocomplete suggestions or selected values.
       * @param {Object} options Layer id, key/value fields and search term(s).
       * @returns {Promise<Array<Object>>} Records containing text, id and $value.
       */
      getData({
        layer_id = this.state.input.options.layer_id,
        key = this.state.input.options.key,
        value = this.state.input.options.value,
        search,
      } = {}) {
        if (!this.selectLayer) {
          this.selectLayer = getCatalogLayerById(layer_id);
        }
        // Selected IDs use exact field filtering; typed terms use the suggestion endpoint.
        const filter = Array.isArray(search)
          ? search.map(item => [].concat(item).map(itemValue => `${key}|eq|${encodeURIComponent(itemValue)}`).join('|null,')).join('|OR,') || ''
          : `${key}|${search}`.trim();
        return this.selectLayer.getDataTable({
          // The layer API uses separate parameter names for these two query modes.
          [Array.isArray(search) ? 'field' : 'suggest']: filter,
          ordering: this.state.input.options.orderbyvalue ? value : key,
        }).then(response => response.features.map(feature => ({
          text: feature.properties[key],
          id: feature.properties[value],
          $value: feature.properties[value],
        })));
      },
      /**
       * Decode the brace-delimited multi-select value and discard stale choices.
       * Remote autocomplete retains IDs whose labels have not been loaded yet.
       * @returns {Array<string>} Unique selected values, filtered for fixed option lists.
       */
      getMultiValues() {
        return [undefined, null, ''].includes(this.state.value)
          ? []
          : Array.from(new Set(`${this.state.value}`.replace(/^{|}$/g, '').replace(/"/g, '').split(',')))
            .filter(value => this.autocomplete || this.state.input.options.values.map(option => `${option.value}`).includes(`${value}`));
      },
      /**
       * Pick a feature, update the selected value and report the pick outcome.
       * A second invocation cancels an active pick operation.
       * @returns {Promise<void>}
       */
      async pickLayerValue() {
        try {
          // Clicking again cancels the active interaction instead of starting another one.
          if (this.picked) {
            this.unpickFeature();
            this.picked = false;
            return;
          }
          this.picked = true;
          const values = await this.pickFeature();
          let value = values[this.state.input.options.key];
          // Do not append a feature value already present in the multi-select.
          if (this.multiple) {
            value = undefined === this.getMultiValues().find(item => value == item)
              ? `{${[...this.getMultiValues(), value].join()}}`
              : this.state.value;
          }
          if (value != this.state.value) {
            // Autocomplete accepts values returned by the picked layer; fixed lists require a match.
            if (this.autocomplete) {
              if (!this.multiple) {
                this.state.input.options.values.splice(0);
              }
              this.state.input.options.values.push({
                key: values[this.state.input.options.value],
                value: values[this.state.input.options.key],
              });
            }
            if (!this.autocomplete && !this.state.input.options.values.find(item => item.value == value)) {
              value = null;
            }
            await this.changeSelect(value);
            this.setValue();
          }
          // Successful matches close the transient feedback automatically.
          if (value) {
            GUI.showUserMessage({ type: 'success', autoclose: true });
          }
          // A missing key or unavailable fixed option needs an explicit warning.
          if (null === value) {
            GUI.showUserMessage({ type: 'warning', message: 'Feature selected is not valid', autoclose: false });
          }
          this.picked = false;
        } catch (error) {
          console.warn(error);
          GUI.showUserMessage({ type: 'warning', message: 'No feature selected. Check if layer is on editing or visible at current scale', autoclose: true });
          this.picked = false;
        }
      },
      /**
       * Open the hidden file input when the media upload affordance is clicked.
       */
      onClick() {
        document.getElementById(this.mediaid).click();
      },
      /**
       * Clear the media preview and propagate a null field value.
       */
      clearMedia() {
        this.mediaData.value = this.mediaData.mime_type = this.state.value = null;
        this.change();
      },
      /**
       * Copy the stored media URL and MIME type into the preview state.
       */
      setMedia() {
        if (this.state.value) {
          this.mediaData.value = this.state.value.value;
          this.mediaData.mime_type = this.state.value.mime_type;
        }
      },
      /**
       * Upload the selected file and store the successful server response.
       * @param {Event} event Change event from the hidden file input.
       * @returns {Promise<void>}
       */
      async onChangeFile(event) {
        const body = new FormData();
        body.append('csrfmiddlewaretoken', this.$cookie.get('csrftoken'));
        body.append(this.state.name, event.target.files[0]);
        this.loading = true;
        try {
          const response = await (await fetch(this.state.input.options.uploadurl, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body,
          })).json();
          // Only successful uploads replace the stored media value.
          if (response?.result) {
            this.state.value = response.data;
          }
          // Application-level upload failures return a message without throwing.
          if (false === response?.result) {
            GUI.showUserMessage({ type: 'alert', message: response.error || this.$t('server_error') });
          }
        } catch (error) {
          console.warn(error);
          GUI.notify.error(this.$t('server_error'));
        }
        this.loading = false;
      },
      /**
       * Validate edited longitude/latitude values and refresh the map-coordinate value.
       */
      changeLonLat() {
        this.change();
        this.setValue();
      },
      /**
       * Toggle map-coordinate capture and update the button's active state.
       */
      toggleGetCoordinate() {
        this.coordinatebutton.active = !this.coordinatebutton.active;
        if (this.coordinatebutton.active) {
          GUI.deactiveMapControls();
          this.mapEpsg = GUI.getCrs();
          this.outputEpsg = this.state.epsg || this.mapEpsg;
          this.map = GUI.getMap();
          this.mapControlToggleEventHandler = event => {
            if (event.target.isToggled() && event.target.isClickMap() && this.coordinatebutton.active) {
              this.toggleGetCoordinate();
            }
          };
          GUI.on('mapcontrol:toggled', this.mapControlToggleEventHandler);
          this.eventMapKey = this.map.on('click', event => {
            event.originalEvent.stopPropagation();
            event.preventDefault();
            const coordinate = this.mapEpsg !== this.outputEpsg
              ? ol.proj.transform(event.coordinate, this.mapEpsg, this.outputEpsg)
              : event.coordinate;
            this.state.value = [coordinate];
            [this.state.values.lon, this.state.values.lat] = coordinate;
          });
        } else {
          this.stopToGetCoordinates();
        }
      },
      /**
       * Remove the map click and map-control listeners used for coordinate capture.
       */
      stopToGetCoordinates() {
        if (this.eventMapKey) {
          ol.Observable.unByKey(this.eventMapKey);
        }
        GUI.off('mapcontrol:toggled', this.mapControlToggleEventHandler);
        this.eventMapKey = null;
      },
      /**
       * Begin feature/coordinate picking for the read-only pick-layer input.
       */
      pickLayer() {
        this.pickFeature()
          .then(value => { this.state.value = value; })
          .catch(() => {});
      },
      /**
       * Defer teardown until the click that launched picking has completed.
       */
      unpick() {
        setTimeout(() => !this.isPicked() && this.unpickFeature(), 200);
      },
      /**
       * Initialize map picking for this component.
       * Vector/map picking uses a feature interaction; WMS uses picked coordinates
       * to query the configured layer after the interaction fires.
       * @param {Object} [options={}] Pick type, layer id and returned attribute names.
       */
      initializePick(options = {}) {
        this.pick_type = options.pick_type || 'wms';
        this.ispicked = false;
        this.fields = options.fields || [options.value];
        this.layerId = options.layer_id;
        this.interaction = 'map' === this.pick_type
          ? new PickFeatureInteraction({ layers: [GUI.getLayerById(this.layerId)] })
          : new PickCoordinatesInteraction();
        this.interaction.set('id', 'picklayer');
      },
      /**
       * Report whether the map interaction is active (separate from select UI flag picked).
       * @returns {boolean}
       */
      isPicked() {
        return this.ispicked;
      },
      /**
       * Cancel active picking when the user presses Escape.
       * Vue supplies the bound handler shared with add/removeEventListener().
       * @param {KeyboardEvent} event Document keyup event.
       */
      escKeyUpHandler(event) {
        if ('Escape' === event.key) {
          this.unpickFeature();
        }
      },
      /**
       * Resolve configured feature attributes and release the map interaction.
       * Reject on a map miss or WMS query failure. Explicit cancellation removes
       * the interaction but does not settle this promise, matching the legacy flow.
       * @returns {Promise<Object>} Selected values keyed by configured attribute name.
       */
      pickFeature() {
        return new Promise((resolve, reject) => {
          document.addEventListener('keyup', this.escKeyUpHandler);
          const values = {};
          this.ispicked = true;
          /**
           * Settle the pick result and tear down the interaction on success or failure.
           * @param {Object|null} feature Picked feature or null on a miss.
           */
          const afterPick = feature => {
            if (feature) {
              const attributes = feature.getProperties();
              this.fields.filter(field => field).forEach(field => { values[field] = attributes[field]; });
              resolve(values);
            } else {
              // Treat a map miss like a rejected pick so callers share one error path.
              reject();
            }
            this.ispicked = false;
            this.unpickFeature();
          };
          GUI.setModal(false);
          GUI.addInteraction(this.interaction);
          this.interaction.once('picked', async event => {
            try {
              let feature = event.feature;
              // WMS picks provide coordinates; vector/map picks already include the feature.
              const layer = 'wms' === this.pick_type && GUI.getProjectLayer(this.layerId);
              if (layer) {
                const response = await layer.query({
                  feature_count: 1,
                  coordinates: event.coordinate,
                  query_point_tolerance: QUERY_POINT_TOLERANCE,
                  mapProjection: GUI.getMap().getView().getProjection(),
                  size: GUI.getMap().getSize(),
                  resolution: GUI.getMap().getView().getResolution(),
                });
                feature = response?.data?.at?.(0)?.features?.at(0) ?? null;
              }
              afterPick(feature);
            } catch (error) {
              console.warn(error);
              afterPick(null);
            }
          });
        });
      },
      /**
       * Remove the interaction, restore the modal and unregister Escape handling.
       * Does not settle a pending pickFeature() promise or reset the select UI flag.
       */
      unpickFeature() {
        GUI.removeInteraction(this.interaction);
        GUI.setModal(true);
        document.removeEventListener('keyup', this.escKeyUpHandler);
        this.ispicked = false;
      },
    },
    /**
     * Keep validation configuration and OpenLayers interactions non-reactive.
     * pick_type, fields and layerId configure the interaction; ispicked tracks activity.
     * These properties stay outside data() to avoid observing third-party objects;
     * the field schema and UI flags in data() retain their normal Vue reactivity.
     */
    beforeCreate() {
      Object.assign(this, {
        validationOptions: null,
        pick_type: null,
        ispicked: false,
        fields: null,
        layerId: null,
        interaction: null,
      });
    },
    /**
     * Initialize schema defaults and behavior needed before the first render.
     * Vue does not wait for this async hook before mounting; select DOM setup
     * and relation-filter readiness are handled separately.
     */
    async created() {
      this.state.input.options = this.state.input.options || {};
      // Coordinate controls consume a dedicated object even when no prior value exists.
      if ('lonlat_input' === this.type) {
        this.state.values = this.state.values || { lon: 0, lat: 0 };
      }
      // Plugin-backed inputs provide their own service and lifecycle.
      if (this.isNativeInput) {
        const state = this.state;
        this.validationOptions = state.input.options || {};
        // Defaults must not overwrite a value already supplied by the form.
        if ([null, undefined].includes(state.value)) {
          const { options } = state.input;
          let defaultValue = options.default;
          // Legacy schemas may store options as an array rather than the current object shape.
          if (Array.isArray(options)) {
            if (options[0].default) {
              defaultValue = options[0].default;
            } else if (options.values?.length) {
              defaultValue = options.values[0]?.value || options.values[0];
            }
          }
          const hasDefault = state.get_default_value && ![null, undefined].includes(defaultValue);
          // Default expressions are evaluated by the server and must not be replaced locally.
          if (hasDefault && undefined === options.default_expression) {
            state.value = defaultValue;
          }
          state.value_from_default_value = hasDefault;
        }
        state.validate.empty = null === state.value || '' === `${state.value}`.trim();
        this.setErrorMessage();
        // Coordinate fields keep separate lon/lat state and validate geographic bounds.
        if ('lonlat_input' === this.type) {
          this.state.values = this.state.values || { lon: 0, lat: 0 };
          this.setValue();
        }
        // Range widgets read bounds from the first value tuple.
        if ('range_input' === this.type) {
          const { min, max } = this.state.input.options.values[0];
          this.state.info = `[MIN: ${min} - MAX: ${max}]`;
        }
        // Slider widgets read bounds directly from input options.
        if ('slider_input' === this.type) {
          const { min, max } = this.state.input.options;
          this.state.info = `[MIN: ${min} - MAX: ${max}]`;
        }
        // The date-picker's resize listener belongs to the global GUI emitter.
        if ('datetimepicker_input' === this.type) {
          const resizeWrapper = this.delayType && { throttle, debounce }[this.delayType] || throttle;
          this.delayResize = this.resize ? resizeWrapper(this.resize.bind(this), this.delayTime) : null;
          GUI.on('resize', this.delayResize);
        }
        // Re-render only visible fields after refreshing their translated error message.
        this.$watch(() => ApplicationState.language, async () => {
          if (this.state.visible) {
            this.state.visible = false;
            this.setErrorMessage();
            await this.$nextTick();
            this.state.visible = true;
          }
        });
        // Required fields need an initial validation before the first user edit.
        if (this.state.editable && this.state.validate.required) {
          this.validate();
        }
        this.forwardAddInput(this.state);
        if (this.state.value_from_default_value) {
          this.forwardChangeInput(this.state);
        }
        // Seed transient UI state from persisted values for controls that own external editors.
        if ('media_input' === this.type) {
          this.setMedia();
        }
        if ('texthtml_input' === this.type) {
          this.state.edit_states = this.state.edit_states || [];
          this.state.edit_states.push(this.edit_state);
        }
        if ('picklayer_input' === this.type) {
          this.initializePick();
        }
      }
      // Select options and relation filters must load before created() resolves.
      if (['select_input', 'select_autocomplete_input'].includes(this.type)) {
        const options = this.state.input.options;
        this.allowmulti = !!options.allowmulti;
        const resizeWrapper = this.delayType && { throttle, debounce }[this.delayType] || throttle;
        this.delayResize = this.resize ? resizeWrapper(this.resize.bind(this), this.delayTime) : null;
        GUI.on('resize', this.delayResize);

        // Only layer-backed autocomplete can offer map picking; table layers cannot be picked on the map.
        if ('select_autocomplete' === this.state.input.type && options.layer_id) {
          try {
            const dependencyLayer = getCatalogLayerById(options.layer_id);
            this.showPickLayer = dependencyLayer && 'table' !== dependencyLayer.getType() &&
              !(this.autocomplete && options.filter_expression);
            // Reuse this interaction for select picking; teardown happens once.
            if (this.showPickLayer) {
              this.initializePick({ ...options, fields: [options.value, options.key], pick_type: 'wms' });
            }
          } catch (error) {
            console.warn(error);
          }
        }
        {
          const {
            relation_id,
            filter_fields = [],
            relation_reference = false,
            chain_filters = false,
          } = this.state.input.options;
          // Relation lookups need both an enabled relation and at least one configured filter field.
          if (relation_reference && Array.isArray(filter_fields) && filter_fields.length) {
            this.setLoading(true);
            this.isFilterFieldsReady = false;
            const {
              referencedLayer,
              referencingLayer,
              fieldRef: { referencingField, referencedField },
            } = ApplicationState.project.getRelationById(relation_id);
            const layer = getCatalogLayerById(referencingLayer);
            const relationLayer = getCatalogLayerById(referencedLayer);
            const relationLayerFields = relationLayer.getFields();
            const getFilterLabel = field => `[${relationLayerFields.find(item => item.name === field).label}]`;

            // Restore filter selections from the saved referenced feature when the field already has a value.
            if (null !== this.state.value) {
              try {
                const { data = [] } = await relationLayer.getFilterData({
                  formatter: 0,
                  field: createSingleFieldParameter({ field: referencedField[0], value: this.state.value }),
                });
                const feature = data[0].features[0];
                this.state.input.options.values = ((await layer.getFilterData({
                  fformatter: referencingField[0],
                  order: referencingField[0],
                  ffield: filter_fields.map((field, index) => {
                    const value = undefined === feature.get(field) ? `null` : feature.get(field);
                    this.filterFields.push({
                      id: field,
                      values: [{ key: getFilterLabel(field), value: `null` }],
                      value,
                      disabled: chain_filters && index > 0 && `null` === this.filterFields[index - 1]?.value,
                    });
                    return createSingleFieldParameter({ field, value });
                  }).join('|AND,'),
                })).data || []).map(([value, key]) => ({ key, value }));

                // Chained filters query each next field using the preceding selections.
                if (chain_filters) {
                  (await relationLayer.getFilterData({ unique: filter_fields[0], ordering: filter_fields[0], formatter: 0 }))
                    .forEach(value => this.filterFields[0].values.push({ key: value, value }));
                  (await Promise.allSettled(filter_fields.slice(1).map((field, index) => relationLayer.getFilterData({
                    unique: filter_fields[index + 1],
                    ordering: filter_fields[index + 1],
                    formatter: 0,
                    field: this.filterFields.slice(0, index + 1)
                      .filter(item => 'null' !== item.value)
                      .map(item => createSingleFieldParameter({ field: item.id, value: item.value }))
                      .join('|AND,'),
                  })))).forEach(({ status, value }, index) => {
                    if ('fulfilled' === status) {
                      value.forEach(item => this.filterFields[index + 1].values.push({ key: item, value: item }));
                    }
                  });
                // Independent filters can load their distinct values concurrently.
                } else {
                  (await Promise.allSettled(filter_fields.map(field => relationLayer.getFilterData({
                    unique: field, ordering: field, formatter: 0,
                  })))).forEach(({ status, value }, index) => {
                    if ('fulfilled' === status) {
                      value.forEach(item => this.filterFields[index].values.push({ key: item, value: item }));
                    }
                  });
                }
              } catch (error) {
                console.warn(error);
              }
            // With no saved value, initialize each filter to its null option.
            } else {
              (await Promise.allSettled(filter_fields.map((field, index) => {
                this.filterFields.push({
                  id: field,
                  values: [{ key: getFilterLabel(field), value: `null` }],
                  value: `null`,
                  disabled: chain_filters && index > 0,
                });
                return relationLayer.getFilterData({ unique: field, formatter: 0, ordering: field });
              }))).forEach(({ status, value }, index) => {
                if ('fulfilled' === status) {
                  value.forEach(item => this.filterFields[index].values.push({ key: item, value: item }));
                }
              });
            }

            this.filterFieldsUnwatches = this.filterFields.map((filter, index) => this.$watch(
              () => filter.value,
              async value => {
                this.setLoading(true);
                // Reset downstream values before requesting options for the changed parent filter.
                if (chain_filters) {
                  for (let i = index + 1; i < this.filterFields.length; i++) {
                    this.filterFields[i].value = `null`;
                    this.filterFields[i].values = [this.filterFields[i].values[0]];
                    this.filterFields[i].disabled = `null` === value;
                  }
                  try {
                    const filterString = this.filterFields.slice(0, index + 1)
                      .filter(item => `null` !== item.value)
                      .map(item => createSingleFieldParameter({ field: item.id, value: item.value }))
                      .join('|AND,');
                    const { data = [] } = await relationLayer.getFilterData({ field: filterString });
                    // A missing feature response leaves downstream option lists at their null choice.
                    if (data[0]?.features) {
                      data[0].features.forEach(feature => {
                        if (index < this.filterFields.length - 1) {
                          const nextValue = feature.get(this.filterFields[index + 1].id);
                          this.filterFields[index + 1].values.push({ key: nextValue, value: nextValue });
                        }
                      });
                    }
                  } catch (error) {
                    console.warn(error);
                  }
                }
                this.state.input.options.values.splice(0);
                await this.$nextTick();
                this.state.input.options.values = ((await layer.getFilterData({
                  fformatter: referencingField[0],
                  ordering: referencingField[0],
                  ffield: this.filterFields
                    .filter(item => `null` !== item.value)
                    .map(item => createSingleFieldParameter({ field: item.id, value: item.value }))
                    .join('|AND,'),
                })).data || []).map(([value, key]) => ({ key, value }));
                this.state.value = this.state.input.options.values?.[0]?.value ?? null;
                await this.changeSelect(this.state.value);
                this.setLoading(false);
              }
            ));
            this.setLoading(false);
            this.isFilterFieldsReady = true;
          }
        }
      }
    },
    /**
     * Attach external widgets after their DOM nodes have been rendered.
     * Selects preload labels and synchronize selection; date/time sets display
     * and storage formats; rich-text fields attach Quill and toolbar handlers.
     */
    async mounted() {
      // Remote autocomplete may need to preload labels for existing values.
      if (['select_input', 'select_autocomplete_input'].includes(this.type)) {
        await this.$nextTick();
        this.resize?.();
        if (this.autocomplete && this.state.value) {
          this.state.input.options.values.splice(0);
          const options = this.state.input.options;
          const values = await this.getData({
            key: options.key,
            value: options.value,
            search: this.multiple ? this.getMultiValues() : this.state.value,
          });
          values.forEach(({ $value, text }) => options.values.push({ key: $value, value: text }));
          options.values.sort((first, second) => {
            const firstValue = first[options.orderbyvalue ? 'value' : 'key'];
            const secondValue = second[options.orderbyvalue ? 'value' : 'key'];
            return firstValue < secondValue ? -1 : firstValue > secondValue ? 1 : 0;
          });
        }
        await this.$nextTick();
        this.setValue();
        return;
      }
      // The date-picker stores field-format values but displays localized dates.
      if ('datetimepicker_input' === this.type) {
        const [{ minDate, maxDate, fieldformat, enabledDates, disabledDates, displayformat, useCurrent }] = this.state.input.options.formats || [];
        await this.$nextTick();
        this.resize?.();
        this.datetimedisplayformat = convertQGISDateTimeFormatToMoment(displayformat);
        this.datetimefieldformat = convertQGISDateTimeFormatToMoment(fieldformat);
        this.validationOptions = { fielddatetimeformat: this.datetimefieldformat };
        $(`#${this.iddatetimepicker}`).datetimepicker({
          defaultDate: moment(this.state.value, this.datetimefieldformat, true).isValid()
            ? moment(this.state.value, this.datetimefieldformat).toDate()
            : null,
          format: this.datetimedisplayformat,
          ignoreReadonly: true,
          locale: window.initConfig.user.i18n || 'en',
          enabledDates,
          disabledDates,
          useCurrent,
          minDate,
          maxDate,
        });
        $(`#${this.iddatetimepicker}`).on('dp.change', () => {
          const newDate = $(`#${this.idinputdatetimepiker}`).val();
          this.state.value = '' === newDate.trim()
            ? null
            : moment(newDate, this.datetimedisplayformat).format(this.datetimefieldformat);
          this.change();
        });
        $(`#${this.iddatetimepicker}`).on('dp.show', () => this.$emit('datetimepickershow'));
        $(`#${this.iddatetimepicker}`).on('dp.hide', () => this.$emit('datetimepickershow'));
        return;
      }
      // The unique selector permits tagging and converts numeric values on selection.
      if ('unique_input' === this.type) {
        await this.$nextTick();
        this.setValue();
        return;
      }
      // Quill edits rich text as HTML unless the source-view toggle is active.
      if ('texthtml_input' === this.type) {
        await this.$nextTick();
        this.quill = new Quill(this.$refs.quill_editor, {
          theme: 'snow',
          modules: {
            clipboard: { matchVisual: false },
            table: true,
            toolbar: {
              container: [
                [{ header: [1, 2, 3, 4, 5, 6, false] }],
                [{ align: '' }, { align: 'center' }, { align: 'right' }, { align: 'justify' }],
                [{ color: [] }, { background: [] }],
                ['bold', 'italic', 'underline', { list: 'ordered' }, { list: 'bullet' }, 'link', 'clean', 'html'],
                ['table', 'column-left', 'column-right', 'column-remove', 'row-above', 'row-below', 'row-remove'],
              ],
              handlers: {
                html: () => {
                  this.edit_state.show_html = !this.edit_state.show_html;
                  const editor = this.quill.container.firstChild;
                  if (this.edit_state.show_html) {
                    editor.innerText = editor.innerHTML;
                  } else {
                    editor.innerHTML = editor.innerText;
                  }
                  this.$el.querySelectorAll('.ql-formats > *').forEach(child => {
                    child.classList.toggle(child.classList.contains('ql-html') ? 'skin-color' : 'g3w-disabled');
                  });
                },
                'column-left': () => this.table.insertColumnLeft(),
                'column-right': () => this.table.insertColumnRight(),
                'column-remove': () => this.table.deleteColumn(),
                'row-above': () => this.table.insertRowAbove(),
                'row-below': () => this.table.insertRowBelow(),
                'row-remove': () => this.table.deleteRow(),
              },
            },
          },
        });
        this.quill.clipboard.dangerouslyPasteHTML(0, this.state.value);
        this.table = this.quill.getModule('table');
        this.$el.querySelector('.ql-formats button[aria-label="align: "]').ariaLabel = 'align: left';
        this.$el.querySelector('.ql-formats .ql-color.ql-picker').title = 'color: text';
        this.$el.querySelector('.ql-formats .ql-color.ql-picker').dataset.placement = 'top';
        this.$el.querySelector('.ql-formats .ql-background.ql-picker').title = 'color: background';
        this.$el.querySelector('.ql-formats .ql-background.ql-picker').dataset.placement = 'top';
        this.$el.querySelectorAll('.ql-formats button').forEach(button => {
          button.title = button.ariaLabel;
          button.dataset.placement = 'top';
        });
        const toolbarIcons = {
          '.ql-html': ['html', 'HTML source'],
          '.ql-column-left': ['<svg fill="currentColor" viewBox="0 0 16 16"><path d="m14 1 1 1v12l-1 1H2l-1-1V2l1-1zM2 0 0 2v12l2 2h12l2-2V2l-2-2z"/><path d="M10 12V4H9L5 8z"/></svg>', 'Add column left'],
          '.ql-column-right': ['<svg fill="currentColor" viewBox="0 0 16 16"><path d="m14 1 1 1v12l-1 1H2l-1-1V2l1-1zM2 0 0 2v12l2 2h12l2-2V2l-2-2z"/><path d="M6 12V4l5 4z"/></svg>', 'Add column right'],
          '.ql-column-remove': ['<svg fill="currentColor" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/><path d="M4.6 4.6a.5.5 0 0 1 .8 0L8 7.3l2.6-2.7a.5.5 0 0 1 .8.8L8.7 8l2.7 2.6a.5.5 0 0 1-.8.8L8 8.7l-2.6 2.7a.5.5 0 0 1-.8-.8L7.3 8 4.6 5.4a.5.5 0 0 1 0-.8"/></svg>', 'Remove column'],
          '.ql-row-above': ['<svg fill="currentColor" viewBox="0 0 16 16"><path d="m14 1 1 1v12l-1 1H2l-1-1V2l1-1zM2 0 0 2v12l2 2h12l2-2V2l-2-2z"/><path d="M4 11h8v-1L8 6z"/></svg>', 'Add row above'],
          '.ql-row-below': ['<svg fill="currentColor" viewBox="0 0 16 16"><path d="M4 7V6h8v1l-4 4z"/><path d="m0 2 2-2h12l2 2v12l-2 2H2l-2-2zm15 0-1-1H2L1 2v12l1 1h12l1-1z"/></svg>', 'Add row below'],
          '.ql-row-remove': ['<svg fill="currentColor" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/><path d="m4 8 .5-.5h7a.5.5 0 0 1 0 1h-7z"/></svg>', 'Remove row'],
        };
        Object.entries(toolbarIcons).forEach(([selector, [label, title]]) => {
          const button = this.$el.querySelector(selector);
          button.innerHTML = label;
          if ('.ql-html' === selector) {
            button.style.width = 'unset';
          }
          button.title = title;
        });
        this.quillHandler = () => {
          const editor = this.quill.container.firstChild;
          this.state.value = this.edit_state.show_html ? editor.innerText : editor.innerHTML;
          this.edit_state.edit = true;
          this.change();
          setTimeout(() => { this.edit_state.edit = false; });
        };
        this.quill.on('text-change', this.quillHandler);
      }
    },
    /**
     * Remove map listeners, global resize hooks, relation watchers and Quill handlers.
      * Invalidate autocomplete responses and release the picking interaction.
     */
    beforeDestroy() {
      // Stop map listeners before releasing shared widget and global resources.
      if ('lonlat_input' === this.type) {
        this.stopToGetCoordinates();
      }
      if (this.interaction) {
        if (this.isPicked()) {
          this.unpickFeature();
        }
        this.interaction = null;
      }
      // Date and select widgets each own a resize registration.
      if ('datetimepicker_input' === this.type) {
        GUI.off('resize', this.delayResize);
        this.delayResize = null;
        this.delayTime = null;
      }
      if (['select_input', 'select_autocomplete_input'].includes(this.type)) {
        clearTimeout(this.autocompleteSearchTimer);
        this.autocompleteSearchId = (this.autocompleteSearchId || 0) + 1;
        GUI.off('resize', this.delayResize);
        this.delayResize = null;
        this.delayTime = null;
        this.filterFieldsUnwatches?.forEach(unwatch => unwatch());
        this.filterFieldsUnwatches = null;
      }
      if (this.quill) {
        this.quill.off('text-change', this.quillHandler);
        this.quill = null;
        this.quillHandler = null;
      }
      this.edit_state.edit = false;
      this.edit_state.show_html = false;
    },
    /**
     * Notify the parent form after a built-in field has been removed.
     */
    destroyed() {
      if (this.isNativeInput) {
        this.forwardRemoveInput(this.state);
      }
    }
  };
</script>

<style scoped>
.g3w-input-pick-layer {
  cursor: pointer;
  position: relative;
  top: 2px;
  font-size: 1.2em;
}
</style>
