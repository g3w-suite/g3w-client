<!--
  @file Render formatted field values (read-only) and validated form input controls (editable).
  @since v4.2
-->

<template>
  <!-- INPUT mode: hide invisible fields; child fields recurse instead of rendering a control. -->
  <div v-if = "isInput && state.visible">

    <!-- Child groups preserve their field tree and forward the same validation events. -->
    <div
      v-if = "'child' === state.type"
      style = "border-top: 2px solid"
      class = "skin-border-color field-child"
    >
      <h4 style = "font-weight: bold">{{ state.label}}</h4>
      <div> {{ state.description }} </div>
      <g3w-field
        v-for             = "field in state.fields" :key = "field.name"
        field-type        = "input"
        :state            = "field"
        @changeinput      = "forwardChangeInput"
        :changeInput      = "changeInput"
        @addinput         = "forwardAddInput"
        :addToValidate    = "addToValidate"
        @removeinput      = "forwardRemoveInput"
        :removeToValidate = "removeToValidate"
      ></g3w-field>
    </div>

    <div v-if = "'child' !== state.type">

      <!-- lonlat_input renders separate longitude and latitude labels below. -->
      <template v-if = "'lonlat_input' !== type && (undefined === state.showlabel || state.showlabel)">
        <label
          :for       = "state.name"
          v-disabled = "!editable"
          class      = "control-label"
          style      = "text-align:left !important; padding-top:0 !important; margin-bottom:3px"
        >
          <!-- Localized labels use the translation directive; plain labels stay literal. -->
          <span v-if = "state.i18nLabel" v-t = "state.label"></span><span v-if = "!state.i18nLabel">{{ state.label }}</span>
          <!-- Required status and help are independent label adornments. -->
          <span v-if = "state.validate && state.validate.required">*</span>
          <i
            v-if        = "showhelpicon"
            class       = "fas fa-info-circle skin-color"
            style       = "margin-left: 3px; cursor: pointer"
            @click.stop = "state.help.visible = !state.help.visible"
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
      <div v-if = "['text_input', 'string_input'].includes(type)" class = "form-group">
        <input
          :placeholder = "state.default"
          :tabIndex    = "tabIndex"
          v-disabled   = "!editable"
          :field       = "state.name"
          v-model      = "state.value"
          class        = "form-control"
          :class       = "{'input-error-validation' : notvalid}"
          :id          = "state.name"
        >
      </div>

      <!-- Textareas update the shared field value on input. -->
      <div v-if = "'textarea_input' === type" class = "form-group">
        <textarea
          @keydown.stop = ""
          :placeholder  = "state.default"
          style         = "max-width: 100%; min-width: 100%"
          rows          = "3"
          :tabIndex     = "tabIndex"
          v-disabled    = "!editable"
          :class        = "{'input-error-validation' : notvalid}"
          v-model       = "state.value"
        ></textarea>
      </div>

      <!-- Numeric aliases use a number control; the schema supplies its step. -->
      <div v-if = "['integer_input', 'bigint_input', 'float_input'].includes(type)" class = "form-group">
        <input
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
      </div>

      <!-- Color values use the browser-native color picker. -->
      <div v-if = "'color_input' === type" class = "form-group">
        <input
          :placeholder = "state.default"
          type         = "color"
          :tabIndex    = "tabIndex"
          v-disabled   = "!editable"
          :field       = "state.name"
          class        = "form-control"
          style        = "cursor: pointer"
          v-model      = "state.value"
          :class       = "{'input-error-validation' : notvalid}"
          :id          = "state.name"
        >
      </div>

      <!-- Checkbox booleans are mapped to the configured stored option value. -->
      <div v-if = "'check_input' === type" class = "form-group" v-disabled = "!editable" style = "height: 20px; margin-top: 8px">
        <input
          :tabIndex = "tabIndex"
          :class    = "{'input-error-validation' : notvalid}"
          v-model   = "checkboxValue"
          type      = "checkbox"
          :id       = "checkboxId"
        />
        <label :for = "checkboxId">{{ checkboxLabel }}</label>
      </div>

      <!-- Each radio option shares one group name and writes its configured value. -->
      <div v-if = "'radio_input' === type" class = "form-group">
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
      <div v-if = "'range_input' === type" class = "form-group">
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
      </div>

      <div v-if = "'slider_input' === type" class = "form-group">
        <!-- The current value is shown separately because range inputs do not display it. -->
        <span style = "font-weight: bold">{{ state.value }}</span>
        <input
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
      <div v-if = "'media_input' === type" class = "form-group" v-disabled = "!editable">
        <div
          class           = "g3w_input_button skin-border-color"
          @click          = "$el.ownerDocument.getElementById(mediaid).click()"
          style           = "border-style: solid; border-width: 2px; width:100%; cursor: pointer; text-align: center;"
          data-placement  = "top"
          :title          = "accept"
          :data-i18n-title = "accept"
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
          <div class = "clearmedia" @click.stop = "mediaData.value = mediaData.mime_type = state.value = null">
            <i class = "far fa-trash-alt g3w-icon"></i>
          </div>
        </g3w-field>
      </div>

      <!-- Unique values can add tags only when the schema allows editing. -->
      <div v-if = "'unique_input' === type" class = "form-group" v-disabled = "!editable">
        <x-select
          ref               = "select"
          :value            = "getValue(state.value)"
          :tabIndex         = "tabIndex"
          searchable
          :createTag        = "state.input.options.editable && ''"
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
      <div v-if = "['select_input', 'select_autocomplete_input'].includes(type)" class = "form-group">
        <!-- The map-pick affordance is available only for eligible autocomplete layers. -->
        <span
          v-if            = "showPickLayer"
          data-placement  = "top"
          title           = "Get value from map layer"
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
              @change         = "filter.value = $event.target.value"
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
      <div v-if = "'datetimepicker_input' === type" class = "form-group" ref = "datetimepicker_body">
        <div class = "input-group date" :id = "iddatetimepicker" v-disabled = "!editable">
          <input
            type      = "text"
            :id       = "idinputdatetimepiker"
            :tabIndex = "tabIndex"
            :readonly = "!editable || isMobile()"
            :class    = "{'input-error-validation' : notvalid}"
            class     = "form-control"
          />
          <span class = "input-group-addon skin-color" style = "border: 1px solid #ccc; cursor:pointer">
            <span v-if = "!state.input.options.formats[0].date" class = "far fa-clock"></span>
            <span v-if = "state.input.options.formats[0].date" class = "fas fa-calendar-alt"></span>
          </span>
        </div>
      </div>

      <!-- Map-backed controls pick either feature attributes or map coordinates. -->
      <!-- This read-only text field is populated only by a map feature/coordinate pick. -->
      <div v-if = "'picklayer_input' === type" class = "form-group">
        <span
          style  = "left: 0; top: 7px; position: absolute"
          class  = "fas fa-crosshairs skin-color"
        ></span>
        <input
          @click     = "pickLayer"
          @blur      = "unpick"
          style      = "width: 100%"
          :style     = "{cursor: editable && 'pointer'}"
          class      = "form-control"
          readonly   = "readonly"
          :tabIndex  = "tabIndex"
          v-disabled = "!editable"
          :class     = "{'input-error-validation' : notvalid}"
          v-model    = "state.value"
        >
      </div>

      <!-- Longitude and latitude are separate editable values with one map-pick action. -->
      <div v-if = "'lonlat_input' === type" class = "form-group" style = "position: relative">
        <div style = "display: flex; justify-content: flex-end; height: 35px; margin-right: 12px; margin-bottom: 5px">
          <button
            @click.prevent.stop = "toggleGetCoordinate"
            :class              = "{'g3w-input-coordinate-button-active': coordinatebutton.active}"
            data-placement      = "left"
            title               = "Click on map to get coordinates"
            class               = "action skin-color skin-border-color fas fa-crosshairs"
            style               = "border: 0; border-radius: 5px; font-weight: bold; font-size: 20px; cursor: pointer"
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
          <input :id = "lonId" @change = "setValue" :class = "{'input-error-validation' : notvalid}" class = "form-control" style = "width:100%; margin-bottom: 5px;" :tabIndex = "tabIndex" v-disabled = "!editable" v-model = "state.values.lon" type = "number" min = "-180" max = "180" placeholder = "Lon">
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
          <input :id = "latId" @change = "setValue" class = "form-control" style = "width:100%; margin-bottom: 5px;" :tabIndex = "tabIndex" v-disabled = "!editable" v-model = "state.values.lat" type = "number" :class = "{'input-error-validation' : notvalid}" min = "-90" max = "90" placeholder = "Lon">
        </div>
      </div>

      <!-- Native rich-text editor, with HTML source mode and browser formatting commands. -->
      <div v-if = "'texthtml_input' === type" class = "form-group">
        <div
          class  = "g3w-input-richtext-toolbar"
          :class = "{'g3w-input-richtext-toolbar-source-mode': edit_state.show_html}"
          ref    = "rich_text_toolbar"
          role   = "toolbar"
          @mousedown = "saveEditorSelection"
        >
          <select aria-label = "Heading" title = "Heading" data-placement = "top" :value = "editorFormats.header" :disabled = "!editable" @change = "runEditorCommand('formatBlock', $event.target.value)">
            <option value = "p">Normal</option>
            <option value = "h1">Heading 1</option>
            <option value = "h2">Heading 2</option>
            <option value = "h3">Heading 3</option>
            <option value = "h4">Heading 4</option>
            <option value = "h5">Heading 5</option>
            <option value = "h6">Heading 6</option>
          </select>
          <button type = "button" title = "align: left" aria-label = "align: left" data-placement = "top" :class = "{'g3w-input-richtext-active': 'left' === editorFormats.align}" :disabled = "!editable" @mousedown.prevent @click = "runEditorCommand('justifyLeft')"><i class = "fas fa-align-left"></i></button>
          <button type = "button" title = "align: center" aria-label = "align: center" data-placement = "top" :class = "{'g3w-input-richtext-active': 'center' === editorFormats.align}" :disabled = "!editable" @mousedown.prevent @click = "runEditorCommand('justifyCenter')"><i class = "fas fa-align-center"></i></button>
          <button type = "button" title = "align: right" aria-label = "align: right" data-placement = "top" :class = "{'g3w-input-richtext-active': 'right' === editorFormats.align}" :disabled = "!editable" @mousedown.prevent @click = "runEditorCommand('justifyRight')"><i class = "fas fa-align-right"></i></button>
          <button type = "button" title = "align: justify" aria-label = "align: justify" data-placement = "top" :class = "{'g3w-input-richtext-active': 'justify' === editorFormats.align}" :disabled = "!editable" @mousedown.prevent @click = "runEditorCommand('justifyFull')"><i class = "fas fa-align-justify"></i></button>
          <div class = "g3w-input-richtext-color-picker">
            <button type = "button" title = "color: text" aria-label = "color: text" data-placement = "top" :disabled = "!editable" @mousedown.prevent @click = "toggleEditorColorPicker('text')">A<span class = "g3w-input-richtext-color-indicator" :style = "{borderBottomColor: editorTextColor}"></span></button>
            <div v-if = "'text' === editorColorPicker" class = "g3w-input-richtext-color-palette">
              <button v-for = "color in editorColors" :key = "color" type = "button" :title = "color" :aria-label = "color" data-placement = "top" :style = "{backgroundColor: color}" @mousedown.prevent @click = "applyEditorColor('foreColor', color)"></button>
            </div>
          </div>
          <div class = "g3w-input-richtext-color-picker">
            <button type = "button" title = "color: background" aria-label = "color: background" data-placement = "top" :disabled = "!editable" @mousedown.prevent @click = "toggleEditorColorPicker('background')"><i class = "fas fa-highlighter"></i><span class = "g3w-input-richtext-color-indicator" :style = "{borderBottomColor: editorBackgroundColor}"></span></button>
            <div v-if = "'background' === editorColorPicker" class = "g3w-input-richtext-color-palette">
              <button v-for = "color in editorColors" :key = "color" type = "button" :title = "color" :aria-label = "color" data-placement = "top" :style = "{backgroundColor: color}" @mousedown.prevent @click = "applyEditorColor('hiliteColor', color)"></button>
            </div>
          </div>
          <span class = "g3w-input-richtext-break" aria-hidden = "true"></span>
          <button type = "button" title = "bold" aria-label = "bold" :class = "{'g3w-input-richtext-active': editorFormats.bold}" :disabled = "!editable" @mousedown.prevent @click = "runEditorCommand('bold')"><b>B</b></button>
          <button type = "button" title = "italic" aria-label = "italic" :class = "{'g3w-input-richtext-active': editorFormats.italic}" :disabled = "!editable" @mousedown.prevent @click = "runEditorCommand('italic')"><i>I</i></button>
          <button type = "button" title = "underline" aria-label = "underline" :class = "{'g3w-input-richtext-active': editorFormats.underline}" :disabled = "!editable" @mousedown.prevent @click = "runEditorCommand('underline')"><u>U</u></button>
          <button type = "button" title = "list: ordered" aria-label = "list: ordered" :class = "{'g3w-input-richtext-active': editorFormats.ordered}" :disabled = "!editable" @mousedown.prevent @click = "runEditorCommand('insertOrderedList')"><i class = "fas fa-list-ol"></i></button>
          <button type = "button" title = "list: bullet" aria-label = "list: bullet" :class = "{'g3w-input-richtext-active': editorFormats.bullet}" :disabled = "!editable" @mousedown.prevent @click = "runEditorCommand('insertUnorderedList')"><i class = "fas fa-list-ul"></i></button>
          <button type = "button" title = "link" aria-label = "link" :disabled = "!editable" @mousedown.prevent @click = "openEditorLink"><i class = "fas fa-link"></i></button>
          <button type = "button" title = "clean" aria-label = "clean" :disabled = "!editable" @mousedown.prevent @click = "cleanEditorFormatting"><i class = "fas fa-eraser"></i></button>
          <button type = "button" class = "g3w-input-richtext-html" :class = "{'skin-color': edit_state.show_html}" title = "HTML source" aria-label = "HTML source" :disabled = "!editable" @mousedown.prevent @click = "toggleEditorSource">html</button>
          <span class = "g3w-input-richtext-break" aria-hidden = "true"></span>
          <button type = "button" title = "table" aria-label = "table" :disabled = "!editable" @mousedown.prevent @click = "insertEditorTable"><i class = "fas fa-table"></i></button>
          <button type = "button" title = "Add row above" aria-label = "Add row above" :disabled = "!editable" @mousedown.prevent @click = "editEditorTable('row-above')"><svg fill = "currentColor" width = "16" height = "16" viewBox = "0 0 16 16" aria-hidden = "true"><path d = "m14 1 1 1v12l-1 1H2l-1-1V2l1-1zM2 0 0 2v12l2 2h12l2-2V2l-2-2z"/><path d = "M4 11h8v-1L8 6z"/></svg></button>
          <button type = "button" title = "Add row below" aria-label = "Add row below" :disabled = "!editable" @mousedown.prevent @click = "editEditorTable('row-below')"><svg fill = "currentColor" width = "16" height = "16" viewBox = "0 0 16 16" aria-hidden = "true"><path d = "M4 7V6h8v1l-4 4z"/><path d = "m0 2 2-2h12l2 2v12l-2 2H2l-2-2zm15 0-1-1H2L1 2v12l1 1h12l1-1z"/></svg></button>
          <button type = "button" title = "Remove row" aria-label = "Remove row" :disabled = "!editable" @mousedown.prevent @click = "editEditorTable('row-remove')"><svg fill = "currentColor" width = "16" height = "16" viewBox = "0 0 16 16" aria-hidden = "true"><path d = "M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/><path d = "m4 8 .5-.5h7a.5.5 0 0 1 0 1h-7z"/></svg></button>
          <button type = "button" title = "Add column left" aria-label = "Add column left" :disabled = "!editable" @mousedown.prevent @click = "editEditorTable('column-left')"><svg fill = "currentColor" width = "16" height = "16" viewBox = "0 0 16 16" aria-hidden = "true"><path d = "m14 1 1 1v12l-1 1H2l-1-1V2l1-1zM2 0 0 2v12l2 2h12l2-2V2l-2-2z"/><path d = "M10 12V4H9L5 8z"/></svg></button>
          <button type = "button" title = "Add column right" aria-label = "Add column right" :disabled = "!editable" @mousedown.prevent @click = "editEditorTable('column-right')"><svg fill = "currentColor" width = "16" height = "16" viewBox = "0 0 16 16" aria-hidden = "true"><path d = "m14 1 1 1v12l-1 1H2l-1-1V2l1-1zM2 0 0 2v12l2 2h12l2-2V2l-2-2z"/><path d = "M6 12V4l5 4z"/></svg></button>
          <button type = "button" title = "Remove column" aria-label = "Remove column" :disabled = "!editable" @mousedown.prevent @click = "editEditorTable('column-remove')"><svg fill = "currentColor" width = "16" height = "16" viewBox = "0 0 16 16" aria-hidden = "true"><path d = "M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/><path d = "M4.6 4.6a.5.5 0 0 1 .8 0L8 7.3l2.6-2.7a.5.5 0 0 1 .8.8L8.7 8l2.7 2.6a.5.5 0 0 1-.8.8L8 8.7l-2.6 2.7a.5.5 0 0 1-.8-.8L7.3 8 4.6 5.4a.5.5 0 0 1 0-.8"/></svg></button>
        </div>
        <div
          ref           = "rich_text_editor"
          class         = "form-control g3w-input-richtext"
          @keydown.stop = ""
          @mousedown    = "closeEditorLink"
          @click        = "onRichTextClick"
          @input        = "onRichTextInput"
          @paste        = "onRichTextPaste"
          :contenteditable = "editorContentEditable"
          :class        = "{'g3w-input-richtext-invalid': !state.validate.valid, 'g3w-input-richtext-source': edit_state.show_html}"
          v-disabled    = "!editable"
        ></div>
      </div>

      <!-- VALIDATION text. -->
      <p
        v-if   = "notvalid"
        class  = "g3w-long-text error-input-message"
        style  = "margin: 0"
        v-html = "state.validate.message"
      ></p>

      <!-- HELP text. -->
      <p v-if = "!notvalid && state.info" style = "margin: 0" v-html = "state.info"></p>
      
      <!-- Help text. -->
      <div
        v-if   = "state.help && state.help.visible"
        v-html = "state.help.message"
        class  = "g3w_input_help skin-background-color"
        style  = "background-color: hsl(from var(--skin-color) h s calc(l + 48)) !important;"
      ></div>

      <!-- Legacy standalone adapters can suppress the divider; form fields keep it by default. -->
      <span v-if = "showDivider" class = "divider"></span>
    </div>
  </div>

  <!-- FIELD mode: plain text values, including HTML supplied by the field formatter. -->
  <div v-else-if = "'text' === type" class = "field g3w-field field_text">
    <div v-if = "state.showlabel" class = "field_label">{{ state.label }}</div>
    <div class = "field_value">
      <span style = "word-wrap: break-word;" v-html = "state.value"></span>
    </div>
  </div>

  <!-- External links are opened only after an explicit user action. -->
  <div v-else-if = "'link' === type" class = "field g3w-field">
    <div v-if = "state.showlabel" class = "field_label">{{ state.label }}</div>
    <div class = "field_value">
      <button
        class       = "btn skin-button field_link"
        @click.stop = "$el.ownerDocument.defaultView.open(value, '_blank')"
        :title      = "value"
      >{{ $t('Open') }}</button>
    </div>
  </div>

  <!-- Image values may be a single URL or a collection of photos. -->
  <div v-else-if = "'image' === type" class = "field g3w-field">
    <div v-if = "state.showlabel" class = "field_label">{{ state.label }}</div>
    <div class = "field_value">
      <div style = "text-align: left; display: inline-block;">
        <img
          v-for       = "(img, i) in images"
          :key        = "i"
          class       = "img-responsive"
          style       = "max-height: 50px; cursor: pointer;"
          @click.stop = "showGallery(images, i)"
          :src        = "img.src"
          loading     = "lazy"
        />
      </div>
    </div>
  </div>

  <!-- Uploaded files display their MIME-derived icon and keep caller content in the slot. -->
  <div v-else-if = "'media' === type && value" class = "preview">
    <a :href = "value" target = "_blank">
      <div class = "previewtype" :class = "mediaType">
        <i :class = "['fa-2x', mediaIcon]"></i>
      </div>
    </a>
    <div class = "filename">{{ filename }}</div>
    <slot></slot>
  </div>

  <!-- GeoJSON values can be toggled as a temporary vector layer on the map. -->
  <div v-else-if = "'geo' === type" class = "geo-content">
    <span
      @click.stop = "visible = !visible; layer.setVisible(visible)"
      :class      = "['show-hide-geo', visible ? 'far fa-eye-slash' : 'far fa-eye']">
    </span>
  </div>

  <!-- Custom Vue fields receive both their feature and current value. -->
  <div v-else-if = "'vue' === type" class = "field g3w-field">
    <div v-if = "state.showlabel" class = "field_label">{{ state.label }}</div>
    <div class = "field_value">
      <div>
        <component
          :feature = "feature"
          :value   = "state.value"
          :is      = "state.vueoptions.component"/>
      </div>
    </div>
  </div>
</template>

<script>
  import GUI                                         from 'g3w-app';
  import ApplicationState                            from 'g3w-state';
  import { QUERY_POINT_TOLERANCE }                   from 'g3w-constants';
  import { getUniqueDomId }                          from 'utils/getUniqueDomId';
  import { gettext as _ }                            from 'g3w-i18n';
  import { toRawType }                               from 'utils/toRawType';
  import { throttle }                                from 'utils/throttle';
  import { convertQGISDateTimeFormatToMoment }        from 'utils/convertQGISDateTimeFormatToMoment';
  import PickCoordinatesInteraction                  from 'interactions/pick-coordinates';
  import { getCatalogLayerById }                     from 'utils/getCatalogLayerById';

  /**
   * Unified renderer for read-only field values and editable form inputs.
   *
   * FIELD mode (default): renders text, links, images, uploaded media, GeoJSON and custom Vue fields.
   * `fieldType` may force the renderer (`text`, `link`, `image`, `media`, `geo`, `vue`; legacy
   * `*_field` values are accepted too), otherwise it is inferred from the value shape.
   *
   * INPUT mode: enabled by `fieldType = "input"` (or `*_input`) or by `inputType`.
   * Renders a built-in form control or delegate an unrecognized type to a plugin.
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
    * beforeDestroy() releases listeners and interactions; tabs unregister fields
    * when they become hidden.
   *
   * @prop {Object} state Field value, validation metadata and input options.
   * @prop {*} data Legacy GeoJSON input (field mode), accepted alongside `state.value`.
   * @prop {Object} feature Feature forwarded to a custom Vue field.
   * @prop {string} fieldType Explicit field renderer, or "input" to enable input mode.
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
  const G3WField = {
    name: 'g3w-field',
    props: {
      /**
       * @type {*} Legacy GeoJSON input (field mode).
       */
      data: {},
      /**
       * @type {Object} Feature forwarded to a custom Vue field.
       */
      feature: Object,
      /**
       * @type {string} Explicit field renderer; "input" (or `*_input`) switches to input mode.
       */
      fieldType: String,
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
        type: Object,
        default: () => ({ value: null, mime_type: null, vueoptions: { component: null } })
      },
      /**
       * @type {Function} Register this field with the parent form's validation state.
       */
      addToValidate:{
        type: Function,
        default: () => {}
      },
      /**
        * @type {Function} Remove this field from the parent form when its tab is hidden.
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
    /**
     * Values derived from the field schema and the selected input adapter.
     */
    computed: {
      /**
       * Whether this component renders an editable form control instead of a read-only value.
       * @returns {boolean}
       */
      isInput() {
        return !!this.inputType || 'input' === this.fieldType || !!this.fieldType?.endsWith('_input');
      },
      /**
       * Resolve the renderer: `*_input` names in input mode, field types otherwise.
       * @returns {string}
       */
      type() {
        const pinnedType = this.inputType || (this.fieldType?.endsWith('_input') && this.fieldType);
        // Legacy adapters pin their renderer type regardless of the field schema.
        if (pinnedType && pinnedType.endsWith('_input')) {
          return pinnedType;
        }
        if (pinnedType) {
          return `${pinnedType}_input`;
        }
        /**
         * Preserve legacy numeric fields whose input schema still says "text".
         * @since 4.0.8
         */
        if (this.isInput && ['integer', 'bigint', 'float'].includes(this.state.type) && 'text' === this.state.input.type) {
          return `${this.state.type}_input`;
        }
        if (this.isInput) {
          return `${this.state.input?.type ?? this.state.type}_input`;
        }
        const configuredType = (this.fieldType || '').replace(/_field$/, '');
        if (configuredType) {
          return ({ simple: 'text', text: 'text', photo: 'image' })[configuredType] || configuredType;
        }
        const value = this.state.value;
        if (this.data || value?.coordinates || value?.geometry?.coordinates) { return 'geo'; }
        if (this.state.vueoptions?.component || value?.vue) { return 'vue'; }
        if (this.state.mime_type || value?.mime_type) { return 'media'; }
        if (Array.isArray(value) || value?.photo || (typeof value === 'string' && /\.(png|jpe?g|gif|bmp)(?:[?#].*)?$/i.test(value))) { return 'image'; }
        if (typeof value === 'string' && /^https?:\/\//i.test(value)) { return 'link'; }
        return 'text';
      },
      value() {
        return this.state?.value?.value ?? this.state.value;
      },
      /** Value observed by the shared change callback; empty strings and null are equivalent. */
      inputValue() {
        if (this.isInput && 'child' !== this.type) {
          return null === this.state.value || '' === `${this.state.value}`.trim() ? null : this.state.value;
        }
      },
      images() {
        const imageValue = this.state.value?.mime_type ? this.state.value.value : this.state.value;
        return [].concat(imageValue || []).map(image => {
          let url = (image || {}).photo || image;
          if ('string' !== typeof url) { return { src: '' }; }
          url = `${!url.startsWith('/') && !url.startsWith('http') ? window.initConfig.mediaurl : ''}${url}`;
          return { src: url };
        });
      },
      mediaType() {
        const mime_type = this.state.mime_type || this.state.value?.mime_type;
        switch (mime_type) {
          case 'image/gif':
          case 'image/png':
          case 'image/jpeg':
          case 'image/bmp':
            return 'image';
          case 'application/pdf':
            return 'pdf';
          case 'video/mp4':
          case 'video/ogg':
          case 'video/x-ms-wmv':
          case 'video/x-msvideo':
          case 'video/quicktime':
            return 'video';
          case 'application/gzip':
          case 'application/zip':
            return 'zip';
          case 'application/msword':
          case 'application/vnd.oasis.opendocument.text':
            return 'text';
          case 'application/vnd.ms-office':
          case 'application/vnd.oasis.opendocument.spreadsheet':
            return 'excel';
          case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
          case 'application/vnd.ms-powerpoint':
          case 'application/vnd.oasis.opendocument.presentation':
            return 'ppt';
        }
        return 'unknow';
      },
      mediaIcon() {
        return ({
          image: 'far fa-image',
          pdf: 'fas fa-file-pdf',
          video: 'far fa-file-video',
          zip: 'far fa-file-archive',
          text: 'far fa-file-alt',
          excel: 'far fa-file-excel',
          ppt: 'far fa-file-powerpoint',
          unknow: 'far fa-question-circle',
        })[this.mediaType] || 'far fa-question-circle';
      },
      filename() {
        return this.value ? this.value.split('/').pop() : this.value;
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
        return ['select_input', 'select_autocomplete_input'].includes(this.type) && !!this.state.input.options.allowmulti;
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
        return false === this.state.validate?.valid;
      },
      /**
       * Whether the label should show the expandable help control.
       * @returns {boolean|string|null|undefined} Trimmed help text or a falsy value.
       */
      showhelpicon() {
        return this.state?.help?.message?.trim?.();
      },
      /**
       * Current asynchronous loading state for the field's input options.
       * @returns {string|null}
       */
      loadingState() {
        return this.state.input?.options?.loading?.state ?? null;
      },
      /**
       * Minimum allowed value, from the range value tuple or slider options.
       * @returns {number|string}
       */
      rangeMin() {
        if ('range_input' === this.type) {
          return this.state.input.options.values[0].min;
        }
        return this.state.input.options.min;
      },
      /**
       * Maximum allowed value, from the range tuple or slider options.
       * @returns {number|string}
       */
      rangeMax() {
        if ('range_input' === this.type) {
          return this.state.input.options.values[0].max;
        }
        return this.state.input.options.max;
      },
      /**
       * Step size, using the legacy capitalized range option when applicable.
       * @returns {number|string}
       */
      rangeStep() {
        if ('range_input' === this.type) {
          return this.state.input.options.values[0].Step || 1;
        }
        return this.state.input.options.step;
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
          const options = this.state.input.options.values;
          const selected = options.find(option => this.state.value == option.value);
          const option = selected || options.find(option => false === option.checked);
          if (!selected && option) {
            this.state.value = option.value;
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
        }
      },
      /**
       * Whether map-coordinate capture is currently active.
       * @returns {boolean}
       */
      getCoordinateActive() {
        return this.coordinatebutton.active;
      },
      /**
       * Keep the editor's enumerated contenteditable attribute explicit.
       * @returns {string}
       */
      editorContentEditable() {
        return `${this.editable}`;
      }
    },
    /**
     * Allocate per-instance widget identifiers and mutable UI state.
     * @returns {Object} Reactive data for this input instance.
     */
    data() {
      return {
        layer:                 null,
        visible:               false,
        id:                    `geo_table_${Date.now()}`,
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
        inputValueWatchReady:  false,
        edit_state:            { edit: false, show_html: false },
        editorColorPicker:     null,
        editorTextColor:       '#000000',
        editorBackgroundColor: '#ffffff',
        editorLinkDialog:      false,
        editorLinkValue:       '',
        editorLinkExisting:    false,
        editorFormats:         { bold: false, italic: false, underline: false, ordered: false, bullet: false, align: 'left', header: 'p' },
        editorColors:          ['#000000', '#e60000', '#ff9900', '#ffff00', '#008a00', '#0066cc', '#9933ff', '#ffffff', '#facccc', '#ffebcc', '#ffffcc', '#cce8cc', '#cce0f5', '#ebd6ff', '#f06666', '#ffc266', '#ffff66', '#66b966', '#66a3e0', '#c285ff', '#a10000', '#b26b00', '#b2b200', '#006100', '#0047b2', '#6b24b2', '#5c0000', '#663d00', '#666600', '#003700', '#002966', '#3d1466'],
        showPickLayer:         false,
        picked:                false,
        filterFields:          [],
        isFilterFieldsReady:   false,
        unwatch:               null,
        filterFieldsUnwatches: null,
        validationOptions:     null,
        ispicked:              false,
        fields:                null,
        layerId:               null,
        interaction:           null,
        accept:                (this.state.input?.options?.allowed_types || []).map(type => {
          if (type.startsWith('.')) {
            return type;
          }
          return `.${type}`;
        }).join(','),
      };
    },
    /**
     * Keep validation and third-party widgets synchronized with field changes.
     */
    watch: {
      inputValue() {
        if (!this.inputValueWatchReady) {
          return;
        }
        this.state.validate.empty = null === this.state.value || '' === `${this.state.value}`.trim();
        this.validate();
        let currentValue  = this.state.value;
        let originalValue = this.state._value;
        if ('media' === this.state.input.type && 'Object' === toRawType(this.state.value)) {
          currentValue = this.state.value.value;
        }
        if ('media' === this.state.input.type && 'Object' === toRawType(this.state._value)) {
          originalValue = this.state._value.value;
        }
        if ('media' === this.state.input.type) {
          this.state.update = currentValue != originalValue;
        }
        if ('datetimepicker' === this.state.input.type && null !== this.state.value) {
          currentValue = this.state.value.toUpperCase();
        }
        if ('datetimepicker' === this.state.input.type && this.state._value) {
          originalValue = this.state._value.toUpperCase();
        }
        if ('datetimepicker' === this.state.input.type) {
          this.state.update = currentValue != originalValue;
        }
        if ('media' !== this.state.input.type && 'datetimepicker' !== this.state.input.type) {
          this.state.update = this.state.value != this.state._value;
        }
        this.forwardChangeInput(this.state);
      },
      /**
       * Refresh validation styling for controls whose UI is outside Vue's DOM.
       * @param {boolean} notvalid Whether current field validation has failed.
       */
      async notvalid(notvalid) {
        // Native controls render their own message; custom selects need their trigger styled directly.
        if (notvalid && 'child' !== this.type) {
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
      * Reflect external value changes in media, the rich-text editor and date-picker widgets.
       */
      async 'state.value'(value) {
        if (!this.isInput) {
          return;
        }
        // The media preview is separate from the stored media object.
        if ('media_input' === this.type && this.state.value) {
          this.mediaData.value     = this.state.value.value;
          this.mediaData.mime_type = this.state.value.mime_type;
        }
        // Avoid echoing the editor's own edit back into its DOM; external edits still refresh it.
        const editor = 'texthtml_input' === this.type && this.$refs.rich_text_editor && !this.edit_state.edit && this.$refs.rich_text_editor;
        if (editor && this.edit_state.show_html) {
          editor.textContent = value || '';
        }
        if (editor && !this.edit_state.show_html) {
          editor.innerHTML = this.sanitizeEditorHtml(value);
        }
        // Convert only when the stored value differs from the currently displayed date.
        const updateDate = 'datetimepicker_input' === this.type && this.datetimefieldformat && value !== $(`#${this.idinputdatetimepiker}`).val();
        let date = value;
        if (updateDate && null !== value) {
          date = moment(value, this.datetimefieldformat).format(this.datetimedisplayformat);
        }
        if (updateDate) {
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
        const resetValue = empty || (this.multiple && 0 === this.getMultiValues().length);
        if (resetValue) {
          value = null;
        }
        if (!resetValue && this.multiple) {
          value = `{${this.getMultiValues().join()}}`;
        }
        // A removed single-select option must not remain selected.
        if (!resetValue && !this.multiple) {
          value = (values.find(option => option.value == this.state.value) || { value: null }).value;
        }
        if (undefined !== value) {
          this.state.value = value;
        }
        this.setValue();
      }
    },
    methods: {
      /** Open the image collection in the application gallery. */
      async showGallery(images, index) {
        GUI.showGallery(images, index);
      },
      /** Return whether a value uses the media-field object format. */
      isMedia(value) {
        return !!(value && 'object' === typeof value && Object === value.constructor && value.mime_type);
      },
      /**
       * Validate emptiness, uniqueness and the active field-type rule in that order.
       * Temporary relation-reference IDs bypass the field-type rule, not uniqueness.
      * @returns {*} Validation result, also written to state.validate.valid.
       */
      validate() {
        // Required empty values fail before uniqueness or type-specific validation.
        const is_empty        = this.state.validate.empty;
        const check_unique    = this.state.validate.unique && this.state.validate.exclude_values?.size;
        const is_temp_id      = !is_empty && !check_unique && this.state.input.options.relation_reference && this.state?.value?.startsWith?.('_new_');
        const should_validate = !is_empty && !check_unique && !is_temp_id;
        const is_input        = ['lonlat_input', 'range_input', 'slider_input'].includes(this.type);
        if (is_empty) {
          this.state.value          = null;
          this.state.validate.valid = !this.state.validate.required;
        }
        // Exclusions compare string forms so numeric and string IDs are treated consistently.
        if (!is_empty && check_unique) {
          this.state.validate.valid = !this.state.validate.exclude_values.has(`${this.state.value}`);
        }
        if (is_temp_id || should_validate) {
          this.state.validate.valid = true;
        }
        if (should_validate && 'lonlat_input' === this.type) {
          const values = this.state.values;
          values.lon = Math.max(-180, Math.min(180, values.lon));
          values.lat = Math.max(-90, Math.min(90, values.lat));
          this.state.validate.valid = !Number.isNaN(1 * values.lon);
        }
        if (should_validate && 'range_input' === this.type) {
          this.state.validate.valid = 1 * this.state.value >= 1 * this.state.input.options.values[0].min && 1 * this.state.value <= 1 * this.state.input.options.values[0].max;
        }
        if (should_validate && 'slider_input' === this.type) {
          this.state.validate.valid = 1 * this.state.value >= 1 * this.state.input.options.min && 1 * this.state.value <= 1 * this.state.input.options.max;
        }
        if (should_validate && !is_input && 'float' === this.state.type) {
          this.state.validate.valid = !Number.isNaN(parseFloat(1 * this.state.value));
        }
        if (should_validate && !is_input && 'bigint' === this.state.type) {
          this.state.validate.valid = Number.isSafeInteger(1 * this.state.value) && Math.abs(1 * this.state.value) <= Number.MAX_SAFE_INTEGER;
        }
        if (should_validate && !is_input && 'integer' === this.state.type) {
          this.state.validate.valid = !Number.isNaN(1 * this.state.value) && Math.abs(1 * this.state.value) <= 2147483647;
        }
        if (should_validate && !is_input && 'checkbox' === this.state.type) {
          this.state.validate.valid = (this.validationOptions.values || []).includes(this.state.value);
        }
        if (should_validate && !is_input && 'datetimepicker' === this.state.type) {
          this.state.validate.valid = moment(this.state.value, this.validationOptions.fielddatetimeformat, true).isValid();
        }
        if (should_validate && !is_input && 'char' === this.state.type) {
          this.state.validate.valid = this.state.value && 1 === `${this.state.value}`.length;
        }
        if (should_validate && !is_input && 'range' === this.state.type) {
          this.state.validate.valid = 1 * this.state.value >= this.validationOptions.min && 1 * this.state.value <= this.validationOptions.max;
        }
        this.setErrorMessage();
        if (!this.state.validate.valid) {
          console.log('[G3WInput] invalid field', {
            name:              this.state.name,
            label:             this.state.label,
            type:              this.state.type,
            inputType:         this.state.input.type,
            value:             this.state.value,
            required:          this.state.validate.required,
            message:           this.state.validate.message,
            relationReference: this.state.input.options.relation_reference,
            relationId:        this.state.input.options.relation_id,
          });
        }
        return this.state.validate.valid;
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
          return;
        }
        if (validate.max_field) {
          validate.message = `${_('Value has to be less/equal to field value ')} (${validate.max_field})`;
          return;
        }
        if (validate.min_field) {
          validate.message = `${_('Value has to be more/equal to field value  ')} (${validate.min_field})`;
          return;
        }
        if (('unique' === state.input.type || validate.unique) && validate.exclude_values?.size) {
          validate.message = _('Value has to be unique');
          return;
        }
        if (validate.required) {
          validate.message = state.info || `${_('Mandatory Field or wrong data type')} ( ${type} )`;
          return;
        }
        validate.message = state.info || `${_('Wrong data type')} ( ${type} )`;
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
      * Restore an optional range default; the shared callback validates it.
       */
      checkRangeValue() {
        // Optional ranges restore their schema default instead of persisting an empty value.
        if (!this.state.validate.required && (null === this.state.value || '' === `${this.state.value}`.trim())) {
          this.state.value = this.state.input.options.values[0].default;
        }
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
       * Synchronize the stored coordinate pair or current select value to its widget.
       */
      setValue() {
        if ('lonlat_input' === this.type) {
          const values = this.state.values;
          values.lon = Math.max(-180, Math.min(180, values.lon));
          values.lat = Math.max(-90, Math.min(90, values.lat));
          this.state.value = [[1 * this.state.values.lon, 1 * this.state.values.lat]];
        }
        if ('lonlat_input' !== this.type && this.$refs.select) {
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
        let values;
        if (multiple) {
          values = `${value || ''}`.split(',').filter(Boolean);
        }
        if (!multiple) {
          values = [`${value ?? ''}`];
        }
        select.selected_options = [];
        options.forEach(option => option.removeAttribute('selected'));
        values.forEach(value => {
          const option = options.find(option => option.value === value);
          if (!option) {
            return;
          }
          select.select(option, { autoclose: false, emit: false });
        });
        if (multiple) {
          select.select(null, { autoclose: false, emit: false });
        }
        if (!multiple && !select.selected_options.length) {
          select.content.textContent = `${g3w?.gettext?.('Select') || 'Select'}...`;
        }
        if (multiple) {
          select.setAttribute('value', values.join(','));
        }
        if (!multiple) {
          select.setAttribute('value', values[0]);
        }
        return true;
      },
      /**
       * Synchronize relation filter controls after their values or options change.
       */
      syncRelationSelects() {
        this.$el?.querySelectorAll?.('x-select[data-filter-id]').forEach(select => {
          const filter = this.filterFields.find(filter => `${filter.id}` === select.dataset.filterId);
          if (!filter) {
            return;
          }
          this.syncXSelect(select, filter.value);
        });
      },
      /**
       * Return the selected value in x-select's single- or multiple-value format.
       * @returns {*} Single stored value (null becomes "null") or comma-separated values.
       */
      getSelectValue() {
        if (this.multiple) {
          return this.getMultiValues().join(',');
        }
        return this.getValue(this.state.value);
      },
      /**
       * Store a selection made in the unique-value field.
       * @param {CustomEvent} event Change emitted by x-select.
       */
      async onUniqueSelect(event) {
        const selected = event.target.value;
        let value = selected;
        if ('null' === selected) {
          value = null;
        }
        if ('null' !== selected && ['integer', 'float', 'bigint'].includes(this.state.type)) {
          value = Number(selected);
        }
        // The blank option uses the string sentinel "null".
        this.state.value = 'null' === value ? null : value;
        await this.$nextTick();
      },
      /**
       * Store the selected field values in the form's serialized representation.
       * @param {CustomEvent} event Change emitted by x-select.
       */
      onSelectChange(event) {
        if (!this.multiple) {
          // The blank option uses the string sentinel "null".
          this.state.value = 'null' === event.target.value ? null : event.target.value;
          await this.$nextTick();
          return;
        }
        const values = event.target.selected_options.map(option => option.value).filter(value => 'null' !== value);
        let value = null;
        if (values.length) {
          value = `{${values.join()}}`;
        }
        // The blank option uses the string sentinel "null".
        this.state.value = 'null' === value ? null : value;
        await this.$nextTick();
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
            let selectedValues = [this.state.value];
            if (this.multiple) {
              selectedValues = this.getMultiValues();
            }
            const selected = new Set(selectedValues.map(value => `${value}`));
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
        const hasSearchValues = Array.isArray(search);
        let filter;
        let filterName = 'suggest';
        if (hasSearchValues) {
          filter = search.map(item => [].concat(item).map(itemValue => `${key}|eq|${encodeURIComponent(itemValue)}`).join('|null,')).join('|OR,') || '';
          filterName = 'field';
        }
        if (!hasSearchValues) {
          filter = `${key}|${search}`.trim();
        }
        const query = { [filterName]: filter };
        if (this.state.input.options.orderbyvalue) {
          query.ordering = value;
        }
        if (!this.state.input.options.orderbyvalue) {
          query.ordering = key;
        }
        return this.selectLayer.getDataTable(query).then(response => response.features.map(feature => ({
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
        if ([undefined, null, ''].includes(this.state.value)) {
          return [];
        }
        return Array.from(new Set(`${this.state.value}`.replace(/^{|}$/g, '').replace(/"/g, '').split(',')))
          .filter(value => this.autocomplete || this.state.input.options.values.map(option => `${option.value}`).includes(`${value}`));
      },
      /**
       * Keep rich-text markup to the elements and attributes provided by this editor.
       * @param {string} html HTML to sanitize before rendering or inserting.
       * @returns {string} Sanitized HTML fragment.
       */
      sanitizeEditorHtml(html) {
        const template = document.createElement('template');
        template.innerHTML = String(html || '');
        const allowed = new Set(['a', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'i', 'li', 'ol', 'p', 'pre', 's', 'span', 'strong', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul']);
        const blocked = new Set(['iframe', 'object', 'script', 'style', 'svg']);
        template.content.querySelectorAll('*').forEach(element => {
          const tag = element.tagName.toLowerCase();
          if (blocked.has(tag)) {
            element.remove();
            return;
          }
          if (!allowed.has(tag)) {
            element.replaceWith(...element.childNodes);
            return;
          }
          const styles = {
            color: element.style.color || element.getAttribute('color'),
            backgroundColor: element.style.backgroundColor,
            textAlign: element.style.textAlign,
            border: element.style.border,
            borderCollapse: element.style.borderCollapse,
            padding: element.style.padding,
            width: element.style.width,
          };
          Array.from(element.attributes).forEach(attribute => {
            if ('style' === attribute.name || ('a' === tag && ['href', 'target', 'rel'].includes(attribute.name)) || ['colspan', 'rowspan', 'start'].includes(attribute.name)) {
              return;
            }
            element.removeAttribute(attribute.name);
          });
          if (element.hasAttribute('href') && /^[a-z][a-z\d+.-]*:/i.test(element.getAttribute('href')) && !/^(https?:|mailto:|tel:)/i.test(element.getAttribute('href'))) {
            element.removeAttribute('href');
          }
          if ('a' === tag && !element.hasAttribute('href')) {
            element.removeAttribute('target');
            element.removeAttribute('rel');
          }
          if ('a' === tag && element.hasAttribute('href')) {
            element.setAttribute('target', '_blank');
            element.setAttribute('rel', 'noopener noreferrer');
          }
          element.removeAttribute('style');
          Object.entries(styles).forEach(([property, value]) => {
            if (value) {
              element.style[property] = value;
            }
          });
        });
        return template.innerHTML;
      },
      /**
       * Apply a native rich-text command at the current editor selection.
       * @param {string} command Browser editing command.
       * @param {string|null} value Optional command value.
       */
      runEditorCommand(command, value = null) {
        if (this.edit_state.show_html) {
          return;
        }
        this.editorColorPicker = null;
        const editor = this.$refs.rich_text_editor;
        editor.focus();
        const range = this.restoreEditorSelection();
        if (!range) {
          return;
        }
        if ('bold' === command) {
          this.toggleEditorInlineFormat('strong');
        }
        if ('italic' === command) {
          this.toggleEditorInlineFormat('em');
        }
        if ('underline' === command) {
          this.toggleEditorInlineFormat('u');
        }
        if ('foreColor' === command) {
          this.wrapEditorSelection('span', { color: value });
        }
        if ('hiliteColor' === command) {
          this.wrapEditorSelection('span', { backgroundColor: value });
        }
        if (['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'].includes(command)) {
          const align = { justifyLeft: 'left', justifyCenter: 'center', justifyRight: 'right', justifyFull: 'justify' }[command];
          const block = this.getEditorBlock(range.startContainer);
          if (block) {
            block.style.textAlign = align;
          }
        }
        if ('formatBlock' === command) {
          const block = this.getEditorBlock(range.startContainer);
          const formatBlock = !block || 'li' !== block.tagName.toLowerCase();
          if (formatBlock) {
            const replacement = document.createElement(value.toLowerCase());
            if (block) {
              replacement.style.cssText = block.style.cssText;
              replacement.append(...block.childNodes);
              block.replaceWith(replacement);
            }
            if (!block) {
              replacement.append(range.extractContents());
              if (!replacement.childNodes.length) {
                replacement.append(document.createElement('br'));
              }
              range.insertNode(replacement);
              const caret = document.createRange();
              caret.selectNodeContents(replacement);
              caret.collapse(true);
              const selection = window.getSelection();
              selection.removeAllRanges();
              selection.addRange(caret);
            }
          }
        }
        if ('insertOrderedList' === command) {
          this.toggleEditorList('ol');
        }
        if ('insertUnorderedList' === command) {
          this.toggleEditorList('ul');
        }
        this.onRichTextInput();
        this.updateEditorFormats();
      },
      /**
       * Restore the toolbar-saved range, if it still belongs to this editor.
       * @returns {Range|null} Current editor range.
       */
      restoreEditorSelection() {
        const editor = this.$refs.rich_text_editor;
        const selection = window.getSelection();
        if (this.editorSelection && editor.contains(this.editorSelection.commonAncestorContainer)) {
          selection.removeAllRanges();
          selection.addRange(this.editorSelection);
        }
        this.editorSelection = null;
        if (!selection?.rangeCount || !editor.contains(selection.getRangeAt(0).commonAncestorContainer)) {
          return null;
        }
        return selection.getRangeAt(0);
      },
      /**
       * Find the nearest formatting or block element around a DOM node.
       * @param {Node} node Node inside the editor.
       * @param {string} selector CSS selector to match.
       * @returns {Element|null}
       */
      getEditorAncestor(node, selector) {
        const parent = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
        const element = parent?.closest(selector);
        return element && element !== this.$refs.rich_text_editor && this.$refs.rich_text_editor.contains(element) ? element : null;
      },
      /**
       * Find the current text block, excluding list-item wrappers.
       * @param {Node} node Node inside the editor.
       * @returns {HTMLElement|null}
       */
      getEditorBlock(node) {
        return this.getEditorAncestor(node, 'p, h1, h2, h3, h4, h5, h6, div, li, blockquote');
      },
      /**
       * Wrap the selected contents with an element and optional inline styles.
       * @param {string} tag Wrapper element name.
       * @param {Object} styles Inline styles to apply.
       */
      wrapEditorSelection(tag, styles = {}) {
        const range = this.restoreEditorSelection();
        if (!range || range.collapsed) {
          return;
        }
        const wrapper = document.createElement(tag);
        Object.assign(wrapper.style, styles);
        wrapper.append(range.extractContents());
        range.insertNode(wrapper);
        range.selectNodeContents(wrapper);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      },
      /**
       * Toggle a semantic inline format on the selected text.
       * @param {string} tag Inline formatting element.
       */
      toggleEditorInlineFormat(tag) {
        const range = this.restoreEditorSelection();
        if (!range || range.collapsed) {
          return;
        }
        const wrapper = this.getEditorAncestor(range.startContainer, tag);
        if (wrapper && wrapper.contains(range.endContainer) && range.toString() === wrapper.textContent) {
          const parent = wrapper.parentNode;
          while (wrapper.firstChild) {
            parent.insertBefore(wrapper.firstChild, wrapper);
          }
          wrapper.remove();
          return;
        }
        const element = document.createElement(tag);
        element.append(range.extractContents());
        range.insertNode(element);
      },
      /**
       * Toggle the current block between a list and a paragraph.
       * @param {string} tag List element name.
       */
      toggleEditorList(tag) {
        const range = this.restoreEditorSelection();
        const listItem = range && this.getEditorAncestor(range.startContainer, 'li');
        if (listItem && listItem.parentElement.tagName.toLowerCase() === tag) {
          const list = listItem.parentElement;
          Array.from(list.children).forEach(item => {
            const paragraph = document.createElement('p');
            paragraph.append(...item.childNodes);
            list.parentNode.insertBefore(paragraph, list);
          });
          list.remove();
          return;
        }
        if (listItem) {
          const currentList = listItem.parentElement;
          const replacement = document.createElement(tag);
          replacement.append(...currentList.childNodes);
          currentList.replaceWith(replacement);
          return;
        }
        const block = range && this.getEditorBlock(range.startContainer);
        if (!block && range) {
          const list = document.createElement(tag);
          const item = document.createElement('li');
          item.append(range.extractContents());
          if (!item.childNodes.length) {
            item.append(document.createElement('br'));
          }
          list.append(item);
          range.insertNode(list);
          const caret = document.createRange();
          caret.selectNodeContents(item);
          caret.collapse(true);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(caret);
          return;
        }
        if (!block) {
          return;
        }
        const list = document.createElement(tag);
        const item = document.createElement('li');
        item.append(...block.childNodes);
        list.append(item);
        block.replaceWith(list);
      },
      /**
       * Reflect the active Quill-style formats at the current selection.
       */
      updateEditorFormats() {
        const editor = this.$refs.rich_text_editor;
        const selection = window.getSelection();
        if (!editor || this.edit_state.show_html || !selection?.rangeCount || !editor.contains(selection.anchorNode)) {
          return;
        }
        const node = selection.anchorNode;
        const block = this.getEditorBlock(node);
        this.editorFormats.bold = !!this.getEditorAncestor(node, 'b, strong');
        this.editorFormats.italic = !!this.getEditorAncestor(node, 'i, em');
        this.editorFormats.underline = !!this.getEditorAncestor(node, 'u');
        this.editorFormats.ordered = !!this.getEditorAncestor(node, 'ol');
        this.editorFormats.bullet = !!this.getEditorAncestor(node, 'ul');
        this.editorFormats.align = block?.style.textAlign || 'left';
        this.editorFormats.header = 'p';
        if (/^H[1-6]$/.test(block?.tagName || '')) {
          this.editorFormats.header = block.tagName.toLowerCase();
        }
      },
      /**
       * Remove inline, link, block, list and alignment formats like Quill's clean action.
       */
      cleanEditorFormatting() {
        if (this.edit_state.show_html) {
          return;
        }
        this.$refs.rich_text_editor.focus();
        const range = this.restoreEditorSelection();
        if (!range || range.collapsed) {
          return;
        }
        const fragment = range.extractContents();
        fragment.querySelectorAll('b, strong, i, em, u, s, a, font, span').forEach(element => {
          const parent = element.parentNode;
          while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
          }
          element.remove();
        });
        fragment.querySelectorAll('h1, h2, h3, h4, h5, h6, blockquote, li').forEach(element => {
          const paragraph = document.createElement('p');
          paragraph.append(...element.childNodes);
          element.replaceWith(paragraph);
        });
        fragment.querySelectorAll('ol, ul').forEach(list => list.remove());
        fragment.querySelectorAll('p, div').forEach(element => { element.style.cssText = ''; });
        range.insertNode(fragment);
        this.onRichTextInput();
      },
      /**
       * Toggle one of the Quill-style foreground/background color palettes.
       * @param {string} picker Palette identifier.
       */
      toggleEditorColorPicker(picker) {
        if (!this.editable || this.edit_state.show_html) {
          return;
        }
        if (this.editorColorPicker === picker) {
          this.editorColorPicker = null;
          return;
        }
        this.editorColorPicker = picker;
      },
      /**
       * Apply a palette color to the current selection.
       * @param {string} command Native color command.
       * @param {string} color Hexadecimal color.
       */
      applyEditorColor(command, color) {
        if ('foreColor' === command) {
          this.editorTextColor = color;
        }
        if ('hiliteColor' === command) {
          this.editorBackgroundColor = color;
        }
        this.runEditorCommand(command, color);
      },
      /**
       * Preserve the editor selection while a toolbar control takes focus.
       */
      saveEditorSelection(event) {
        if (this.editorLinkDialog && !event?.target?.closest?.('.g3w-input-richtext-link-picker')) {
          this.closeEditorLink();
        }
        if (this.editorColorPicker && !event?.target?.closest?.('.g3w-input-richtext-color-picker')) {
          this.editorColorPicker = null;
        }
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) {
          return;
        }
        const range = selection.getRangeAt(0);
        if (!this.$refs.rich_text_editor.contains(range.commonAncestorContainer)) {
          return;
        }
        this.editorSelection = range.cloneRange();
      },
      /**
       * Update the stored HTML or source text after an editor change.
       */
      onRichTextInput() {
        const editor = this.$refs.rich_text_editor;
        if (this.edit_state.show_html) {
          this.state.value = editor.innerText;
        }
        if (!this.edit_state.show_html) {
          this.state.value = editor.innerHTML;
        }
        this.edit_state.edit = true;
        setTimeout(() => { this.edit_state.edit = false; });
      },
      /**
       * Sanitize rich HTML pasted into the visual editor.
       * @param {ClipboardEvent} event Paste event.
       */
      onRichTextPaste(event) {
        if (this.edit_state.show_html) {
          return;
        }
        event.preventDefault();
        const html = event.clipboardData.getData('text/html');
        const text = event.clipboardData.getData('text/plain');
        const range = this.restoreEditorSelection();
        if (!range) {
          return;
        }
        range.deleteContents();
        if (html) {
          const template = document.createElement('template');
          template.innerHTML = this.sanitizeEditorHtml(html);
          range.insertNode(template.content);
        }
        if (!html) {
          range.insertNode(document.createTextNode(text));
        }
        this.onRichTextInput();
      },
      /**
       * Toggle between visual editing and the plain-text HTML source.
       */
      toggleEditorSource() {
        const editor = this.$refs.rich_text_editor;
        const showHtml = !this.edit_state.show_html;
        this.editorColorPicker = null;
        this.closeEditorLink();
        this.editorSelection = null;
        this.edit_state.show_html = showHtml;
        if (this.edit_state.show_html) {
          editor.textContent = editor.innerHTML;
        }
        if (!this.edit_state.show_html) {
          editor.innerHTML = this.sanitizeEditorHtml(editor.innerText);
        }
        this.onRichTextInput();
      },
      /**
       * Open the link editor for the selected text or existing link.
       */
      openEditorLink() {
        if (this.edit_state.show_html || !this.editable) {
          return;
        }
        if (this.editorLinkDialog) {
          this.closeEditorLink();
          return;
        }
        this.editorColorPicker = null;
        const editor = this.$refs.rich_text_editor;
        const selection = window.getSelection();
        let range = this.editorSelection;
        if (!range && selection?.rangeCount) {
          range = selection.getRangeAt(0);
        }
        if (!range || !editor.contains(range.commonAncestorContainer)) {
          return;
        }
        const node = range.startContainer;
        let parent = node.parentElement;
        if (node.nodeType === Node.ELEMENT_NODE) {
          parent = node;
        }
        let link = parent?.closest('a');
        if (!link || !editor.contains(link)) {
          link = null;
        }
        this.showEditorLink(range, link);
      },
      /**
       * Open the link editor when an existing link is clicked in the document.
       * @param {MouseEvent} event Editor click.
       */
      onRichTextClick(event) {
        if (!this.editable || this.edit_state.show_html) {
          return;
        }
        const link = event.target.closest('a');
        if (!link || !this.$refs.rich_text_editor.contains(link)) {
          return;
        }
        event.preventDefault();
        const range = document.createRange();
        range.selectNodeContents(link);
        range.collapse(false);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        this.showEditorLink(range, link);
      },
      /**
       * Show the URL editor for a selection and optional existing link.
       * @param {Range} range Editor selection to restore after editing.
       * @param {HTMLAnchorElement|null} link Existing link, if selected.
       */
      showEditorLink(range, link) {
        this.editorSelection = range.cloneRange();
        this.editorLinkElement = link;
        this.editorLinkExisting = !!link;
        this.editorLinkValue = link?.getAttribute('href') || range.toString();
        const message = document.createElement('div');
        message.style.display = 'grid';
        message.style.gap = '8px';
        message.style.minWidth = 'min(320px, calc(100vw - 64px))';
        const label = document.createElement('label');
        label.textContent = _('Link URL');
        const input = document.createElement('input');
        input.className = 'form-control';
        input.type = 'text';
        input.value = this.editorLinkValue;
        input.placeholder = 'https://';
        input.autocomplete = 'url';
        input.spellcheck = false;
        let visit = null;
        const updateVisitLink = () => {
          if (!visit) {
            return;
          }
          const href = this.getEditorLinkHref(input.value);
          if (href) {
            visit.href = href;
            visit.removeAttribute('aria-disabled');
          }
          if (!href) {
            visit.removeAttribute('href');
            visit.setAttribute('aria-disabled', 'true');
          }
        };
        input.addEventListener('input', () => {
          input.setCustomValidity('');
          updateVisitLink();
        });
        message.append(label, input);
        if (link) {
          visit = document.createElement('a');
          visit.target = '_blank';
          visit.rel = 'noopener noreferrer';
          visit.textContent = _('Visit link');
          message.append(visit);
          updateVisitLink();
        }
        const buttons = {
          cancel: {
            label: _('Cancel'),
            className: 'btn-default',
            callback: () => this.closeEditorLink(),
          },
        };
        if (link) {
          buttons.remove = {
            label: _('Remove link'),
            className: 'btn-danger',
            callback: () => {
              const link = this.editorLinkElement;
              if (!link || !this.$refs.rich_text_editor.contains(link)) {
                this.closeEditorLink();
                return;
              }
              const parent = link.parentNode;
              while (link.firstChild) {
                parent.insertBefore(link.firstChild, link);
              }
              link.remove();
              this.onRichTextInput();
              this.closeEditorLink();
            },
          };
        }
        buttons.save = {
          label: _('Save'),
          className: 'btn-primary',
          callback: () => {
            this.editorLinkValue = input.value;
            const href = this.getEditorLinkHref(this.editorLinkValue);
            if (!href) {
              return;
            }
            const editor = this.$refs.rich_text_editor;
            editor.focus();
            const range = this.restoreEditorSelection();
            const selection = window.getSelection();
            if (!range) {
              return;
            }
            if (this.editorLinkElement && editor.contains(this.editorLinkElement)) {
              this.editorLinkElement.setAttribute('href', href);
              this.editorLinkElement.setAttribute('target', '_blank');
              this.editorLinkElement.setAttribute('rel', 'noopener noreferrer');
            }
            if (!this.editorLinkElement || !editor.contains(this.editorLinkElement)) {
              if (range.collapsed) {
                const link = document.createElement('a');
                link.setAttribute('href', href);
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
                link.textContent = href;
                range.insertNode(link);
                const linkRange = document.createRange();
                linkRange.selectNodeContents(link);
                selection.removeAllRanges();
                selection.addRange(linkRange);
              }
              if (!range.collapsed) {
                const link = document.createElement('a');
                link.setAttribute('href', href);
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
                link.append(range.extractContents());
                range.insertNode(link);
              }
            }
            this.onRichTextInput();
            this.closeEditorLink();
          },
        };
        this.editorLinkDialog = GUI.dialog({ title: _('Link'), message, buttons });
        this.editorLinkDialog.addEventListener('click', event => {
          const saveButton = event.target.closest('button[value="save"]');
          if (!saveButton || this.getEditorLinkHref(input.value)) {
            return;
          }
          event.preventDefault();
          input.setCustomValidity(_('Enter a valid URL'));
          input.reportValidity();
        });
        input.focus();
        input.select();
      },
      /**
       * Normalize a link URL and reject unsafe protocols.
       * @param {string} value URL from the link dialog.
       * @returns {string|null} Safe href, or null when invalid.
       */
      getEditorLinkHref(value) {
        let href = value.trim();
        if (!href) {
          return null;
        }
        const hasProtocol = /^[a-z][a-z\d+.-]*:/i.test(href);
        const isRelative = href.startsWith('/') || href.startsWith('#') || href.startsWith('?');
        if (!hasProtocol && !isRelative) {
          href = `https://${href}`;
        }
        try {
          const parsedUrl = new URL(href, document.baseURI);
          if (!['http:', 'https:', 'mailto:', 'tel:'].includes(parsedUrl.protocol)) {
            return null;
          }
        } catch (error) {
          return null;
        }
        return href;
      },
      /**
       * Close the link editor and return focus to the selected editor range.
       */
      closeEditorLink() {
        const editor = this.$refs.rich_text_editor;
        const dialog = this.editorLinkDialog;
        this.editorLinkDialog = false;
        if (dialog?.open) {
          dialog.close();
        }
        if (editor && this.editorSelection) {
          editor.focus();
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(this.editorSelection);
        }
        this.editorLinkValue = '';
        this.editorLinkExisting = false;
        this.editorLinkElement = null;
        this.editorSelection = null;
      },
      /**
       * Insert a small editable table at the current selection.
       */
      insertEditorTable() {
        if (this.edit_state.show_html) {
          return;
        }
        this.$refs.rich_text_editor.focus();
        const range = this.restoreEditorSelection();
        if (!range) {
          return;
        }
        const table = document.createElement('table');
        table.style.cssText = 'border-collapse:collapse;width:100%';
        const row = table.insertRow();
        const cell = row.insertCell();
        cell.style.cssText = 'border:1px solid #999;padding:4px';
        cell.append(document.createElement('br'));
        range.deleteContents();
        range.insertNode(table);
        this.onRichTextInput();
      },
      /**
       * Add or remove a row or column at the selected table cell.
       * @param {string} action Table operation identifier.
       */
      editEditorTable(action) {
        if (this.edit_state.show_html) {
          return;
        }
        const selection = window.getSelection();
        const node = selection?.anchorNode;
        let parent = node?.parentElement;
        if (node?.nodeType === Node.ELEMENT_NODE) {
          parent = node;
        }
        const cell = parent?.closest('td, th');
        if (!cell || !this.$refs.rich_text_editor.contains(cell)) {
          return;
        }
        const row = cell.parentElement;
        const table = cell.closest('table');
        let index = cell.cellIndex;
        if ('row-above' === action || 'row-below' === action) {
          const newRow = row.cloneNode(false);
          Array.from(row.cells).forEach(() => {
            const newCell = newRow.insertCell();
            newCell.style.border = '1px solid #999';
            newCell.style.padding = '4px';
            newCell.innerHTML = '<br>';
          });
          if ('row-above' === action) {
            row.parentNode.insertBefore(newRow, row);
          }
          if ('row-below' === action) {
            row.parentNode.insertBefore(newRow, row.nextSibling);
          }
        }
        if ('row-remove' === action) {
          row.remove();
        }
        if ('column-right' === action) {
          index++;
        }
        if (['column-left', 'column-right'].includes(action)) {
          Array.from(table.rows).forEach(tableRow => {
            const newCell = tableRow.insertCell(index);
            newCell.style.border = '1px solid #999';
            newCell.style.padding = '4px';
            newCell.innerHTML = '<br>';
          });
        }
        if ('column-remove' === action) {
          Array.from(table.rows).forEach(tableRow => {
            if (tableRow.cells[index]) {
              tableRow.deleteCell(index);
            }
          });
        }
        this.onRichTextInput();
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
          let multiValues = [];
          if (this.multiple) {
            multiValues = this.getMultiValues();
          }
          const alreadySelected = this.multiple && undefined !== multiValues.find(item => value == item);
          if (this.multiple && !alreadySelected) {
            value = `{${[...multiValues, value].join()}}`;
          }
          if (alreadySelected) {
            value = this.state.value;
          }
          const options = this.state.input.options;
          const autocomplete = this.autocomplete;
          const valueChanged = value != this.state.value;
          // Autocomplete accepts values returned by the picked layer; fixed lists require a match.
          if (valueChanged && autocomplete && !this.multiple) {
            options.values.splice(0);
          }
          if (valueChanged && autocomplete) {
            options.values.push({
              key: values[options.value],
              value: values[options.key],
            });
          }
          if (valueChanged && !autocomplete && !options.values.find(item => item.value == value)) {
            value = null;
          }
          if (valueChanged) {
            // The blank option uses the string sentinel "null".
            this.state.value = 'null' === value ? null : value;
            await this.$nextTick();
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
       * Toggle map-coordinate capture and update the button's active state.
       */
      toggleGetCoordinate() {
        this.coordinatebutton.active = !this.coordinatebutton.active;
        const active = this.coordinatebutton.active;
        if (active) {
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
            let coordinate = event.coordinate;
            if (this.mapEpsg !== this.outputEpsg) {
              coordinate = ol.proj.transform(event.coordinate, this.mapEpsg, this.outputEpsg);
            }
            this.state.value = [coordinate];
            [this.state.values.lon, this.state.values.lat] = coordinate;
          });
        }
        if (!active) {
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
            }
            if (!feature) {
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
              const layer = GUI.getProjectLayer(this.layerId);
              if (layer) {
                const response = await layer.query({
                  feature_count: 1,
                  coordinates:           event.coordinate,
                  query_point_tolerance: QUERY_POINT_TOLERANCE,
                  mapProjection:         GUI.getMap().getView().getProjection(),
                  size:                  GUI.getMap().getSize(),
                  resolution:            GUI.getMap().getView().getResolution(),
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
     * Initialize schema defaults and behavior needed before the first render.
     * Vue does not wait for this async hook before mounting; select DOM setup
     * and relation-filter readiness are handled separately.
     */
    async created() {
      if ('geo' === this.type) {
        const data = this.data || this.state.value?.value || this.state.value;
        if (data && GUI.getMap()) {
          const mapProjection = GUI.getProjection().getCode();
          let style;
          switch (data.type) {
            case 'Point':
            case 'MultiPoint':
              style = [new ol.style.Style({
                image: new ol.style.Circle({
                  radius: 6,
                  fill: new ol.style.Fill({ color: [255, 255, 255, 1.0] }),
                  stroke: new ol.style.Stroke({ color: [0, 0, 0, 1.0], width: 2 })
                })
              }), new ol.style.Style({
                image: new ol.style.Circle({
                  radius: 2,
                  fill: new ol.style.Fill({ color: [255, 255, 255, 1.0] }),
                  stroke: new ol.style.Stroke({ color: [0, 0, 0, 1.0], width: 2 })
                })
              })];
              break;
            case 'Line':
            case 'LineString':
            case 'MultiLineString':
            case 'Polygon':
            case 'MultiPolygon':
              style = new ol.style.Style({
                fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.3)' }),
                stroke: new ol.style.Stroke({ color: [0, 0, 0, 1.0], width: 2 })
              });
          }
          this.layer = new ol.layer.Vector({
            source: new ol.source.Vector({
              features: new ol.format.GeoJSON().readFeatures(data, { featureProjection: mapProjection })
            }),
            visible: this.visible,
            style
          });
          GUI.getMap().addLayer(this.layer);
        }
      }
      if (!this.isInput) {
        return;
      }
      // Built-in controls share this component's defaults, validation and lifecycle; plugins own their own behavior.
      const is_parent = 'child' !== this.state.type;
      const is_select = ['select_input', 'select_autocomplete_input'].includes(this.type);

      this.state.input.options = this.state.input.options || {};
      this.validationOptions   = this.state.input.options || {};

      // Coordinate controls consume a dedicated object even when no prior value exists.
      this.state.values = 'lonlat_input' === this.type ? (this.state.values || { lon: 0, lat: 0 }) : this.state.values;

      // Keep an existing form value; otherwise prefer the schema default, then the legacy first-option fallback.
      const hasNoValue = [null, undefined].includes(this.state.value);

      // Legacy schemas may store options as an array rather than the current object shape.
      const hasFirstDefault = is_parent && hasNoValue && Array.isArray(this.state.input.options) && !!this.state.input.options[0].default;

      let defaultValue;

      if (hasNoValue) {
        defaultValue = this.state.input.options.default;
      }

      if (hasFirstDefault) {
        defaultValue = this.state.input.options[0].default;
      }

      if (is_parent && hasNoValue && !hasFirstDefault && hasNoValue && Array.isArray(this.state.input.options) && !!this.state.input.options.values?.length) {
        defaultValue =  this.state.input.options.values[0]?.value || this.state.input.options.values[0];
      }

      const hasDefault = is_parent && hasNoValue && this.state.get_default_value && ![null, undefined].includes(defaultValue);

      // Default expressions are evaluated by the server and must not be replaced locally.
      if (hasDefault && undefined === this.state.input.options.default_expression) {
        this.state.value = defaultValue;
      }

      if (is_parent && hasNoValue) {
        this.state.value_from_default_value = hasDefault;
      }

      if (is_parent) {
        this.state.validate.empty = null === this.state.value || '' === `${this.state.value}`.trim();
      }

      // Coordinate fields keep separate lon/lat state and validate geographic bounds.
      if ('lonlat_input' === this.type) {
        this.state.values = this.state.values || { lon: 0, lat: 0 };
        this.setValue();
      }

      // Range widgets read bounds from the first value tuple.
      if ('range_input' === this.type) {
        this.state.info = `[MIN: ${this.state.input.options.values[0].min} - MAX: ${this.state.input.options.values[0].max}]`;
      }

      // Slider widgets read bounds directly from input options.
      if ('slider_input' === this.type) {
        this.state.info = `[MIN: ${this.state.input.options.min} - MAX: ${this.state.input.options.max}]`;
      }

      if (is_parent) {
        this.setErrorMessage();
      }

      // The date-picker's resize listener belongs to the global GUI emitter.
      if ('datetimepicker_input' === this.type) {
        this.resize = throttle(this.resize.bind(this));
        GUI.on('resize', this.resize);
      }

      // Re-render only visible fields after refreshing their translated error message.
      if (is_parent) {
        this.$watch(() => ApplicationState.language, async () => {
          if (this.state.visible) {
            this.state.visible = false;
            this.setErrorMessage();
            await this.$nextTick();
            this.state.visible = true;
          }
        });
      }

      // Required fields need an initial validation before the first user edit.
      if (is_parent && this.state.editable && this.state.validate.required) {
        this.validate();
      }

      if (is_parent) {
        this.forwardAddInput(this.state);
      }

      if (is_parent && this.state.value_from_default_value) {
        this.forwardChangeInput(this.state);
      }

      // Seed transient UI state from persisted values for controls that own external editors.
      if ('media_input' === this.type && this.state.value) {
        this.mediaData.value     = this.state.value.value;
        this.mediaData.mime_type = this.state.value.mime_type;
      }

      if ('texthtml_input' === this.type) {
        this.state.edit_states = this.state.edit_states || [];
        this.state.edit_states.push(this.edit_state);
      }

      this.$nextTick(() => { this.inputValueWatchReady = true; });

      if (is_select) {
        this.resize = throttle(this.resize.bind(this));
        GUI.on('resize', this.resize);
      }

      try {
        // Only layer-backed autocomplete can offer map picking; table layers cannot be picked on the map.
        if ('select_autocomplete' === this.state.input.type && this.state.input.options.layer_id) {
          const dependencyLayer = getCatalogLayerById(this.state.input.options.layer_id);
          this.showPickLayer = dependencyLayer && 'table' !== dependencyLayer.getType() && !(this.autocomplete && this.state.input.options.filter_expression);
        }
        // Reuse this interaction for select picking; teardown happens once.
        if (this.showPickLayer) {
          this.fields = [this.state.input.options.value, this.state.input.options.key];
          this.layerId = this.state.input.options.layer_id;
        }
        if ('picklayer_input' === this.type) {
          this.fields = [undefined];
          this.layerId = undefined;
        }
        if (this.showPickLayer || 'picklayer_input' === this.type) {
          this.ispicked = false;
          this.interaction = new PickCoordinatesInteraction();
          this.interaction.set('id', 'picklayer');
        }
      } catch (e) {
        console.warn(e);
      }

      // Relation controls need both an enabled relation and at least one configured filter field.
      const hasRelationFilters = is_select && this.state.input.options.relation_reference && Array.isArray(this.state.input.options.filter_fields) && this.state.input.options.filter_fields.length;

      if (hasRelationFilters) {
        this.setLoading(true);
        this.isFilterFieldsReady = false;
      }

      const {
        referencedLayer,
        referencingLayer,
        fieldRef: { referencingField, referencedField },
      }                         = hasRelationFilters && ApplicationState.project.getRelationById(this.state.input.options.relation_id) || { fieldRef: {} };
      const layer               = hasRelationFilters && getCatalogLayerById(referencingLayer);
      const relationLayer       = hasRelationFilters && getCatalogLayerById(referencedLayer);
      const relationLayerFields = hasRelationFilters && relationLayer.getFields();
      const getFilterLabel      = hasRelationFilters && (field => `[${relationLayerFields.find(item => item.name === field).label}]`);
      const hasSavedValue       = hasRelationFilters && null !== this.state.value;

      // Restore selected relation filters and available choices when editing an existing value.
      try {
        if (hasRelationFilters && hasSavedValue) {
          const { data = [] } = await relationLayer.getFilterData({
            formatter: 0,
            field: [].concat(this.state.value)
              .map(value => `${referencedField[0]}|eq|${encodeURIComponent(value)}`)
              .join('|OR,'),
          });
          this.state.input.options.values = ((await layer.getFilterData({
            fformatter: referencingField[0],
            order:      referencingField[0],
            ffield: this.state.input.options.filter_fields.map((field, index) => {
              let value = data[0].features[0].get(field);
              if (undefined === value) {
                value = `null`;
              }
              this.filterFields.push({
                id: field,
                values: [{ key: getFilterLabel(field), value: `null` }],
                value,
                disabled: this.state.input.options.chain_filters && index > 0 && `null` === this.filterFields[index - 1]?.value,
              });
              return [].concat(value)
                .map(item => `${field}|eq|${encodeURIComponent(item)}`)
                .join('|OR,');
            }).join('|AND,'),
          })).data || []).map(([value, key]) => ({ key, value }));
        }

        // Chained filters fetch each later field's choices using the selections before it.
        if (hasRelationFilters && hasSavedValue && this.state.input.options.chain_filters) {
          (await relationLayer
            .getFilterData({
              unique: this.state.input.options.filter_fields[0],
              ordering: this.state.input.options.filter_fields[0],
              formatter: 0
            })
          ).forEach(value => this.filterFields[0].values.push({ key: value, value }));
        }

        if (hasRelationFilters && hasSavedValue && this.state.input.options.chain_filters) {
          (await Promise.allSettled(
            this.state.input.options.filter_fields
              .slice(1)
              .map((field, index) => relationLayer.getFilterData({
                  unique:   this.state.input.options.filter_fields[index + 1],
                  ordering: this.state.input.options.filter_fields[index + 1],
                  formatter: 0,
                  field: this.filterFields
                    .slice(0, index + 1)
                    .filter(item => 'null' !== item.value)
                    .map(item => [].concat(item.value)
                      .map(value => `${item.id}|eq|${encodeURIComponent(value)}`)
                      .join('|OR,'))
                    .join('|AND,'),
                })
              )
            )
          ).forEach(({ status, value }, index) => {
            if ('fulfilled' === status) {
              value.forEach(item => this.filterFields[index + 1].values.push({ key: item, value: item }));
            }
          });
        }

        // Without chaining, each filter's choices are independent and can load concurrently.
        if (hasRelationFilters && hasSavedValue && !this.state.input.options.chain_filters) {
          (
            await Promise.allSettled(
            this.state.input.options.filter_fields
              .map(field => relationLayer.getFilterData({ unique: field, ordering: field, formatter: 0 }))
            )
          ).forEach(({ status, value }, index) => {
            if ('fulfilled' === status) {
              value.forEach(item => this.filterFields[index].values.push({ key: item, value: item }));
            }
          });
        }
      } catch (e) {
        console.warn(e);
      }

      // A new relation value starts with null selections; chained fields after the first stay disabled.
      if (hasRelationFilters && !hasSavedValue) {
        (await Promise.allSettled(
          this.state.input.options.filter_fields.map((field, index) => {
            this.filterFields.push({
              id: field,
              values: [{ key: getFilterLabel(field), value: `null` }],
              value: `null`,
              disabled: this.state.input.options.chain_filters && index > 0,
            });
            return relationLayer.getFilterData({ unique: field, formatter: 0, ordering: field });
          })
        )).forEach(({ status, value }, index) => {
          if ('fulfilled' === status) {
            value.forEach(item => this.filterFields[index].values.push({ key: item, value: item }));
          }
        });
      }

      // Watch filter changes only after every configured filter has been initialized.
      if (hasRelationFilters) {
        this.filterFieldsUnwatches = this.filterFields.map((filter, index) => this.$watch(
          () => filter.value,
          async value => {
            this.setLoading(true);
            // Reset downstream values before requesting options for the changed parent filter.
            // Chained mode invalidates downstream selections and reloads the next field's choices.
            if (this.state.input.options.chain_filters) {
              for (let i = index + 1; i < this.filterFields.length; i++) {
                this.filterFields[i].value = `null`;
                this.filterFields[i].values = [this.filterFields[i].values[0]];
                this.filterFields[i].disabled = `null` === value;
              }
              try {
                const filterString = this.filterFields.slice(0, index + 1)
                  .filter(item => `null` !== item.value)
                  .map(item => [].concat(item.value)
                    .map(value => `${item.id}|eq|${encodeURIComponent(value)}`)
                    .join('|OR,'))
                  .join('|AND,');
                const { data = [] } = await relationLayer.getFilterData({ field: filterString });
                // A missing feature response leaves downstream option lists at their null choice.
                (data[0]?.features || []).forEach(feature => {
                  if (index >= this.filterFields.length - 1) {
                    return;
                  }
                  const nextValue = feature.get(this.filterFields[index + 1].id);
                  this.filterFields[index + 1].values.push({ key: nextValue, value: nextValue });
                });
              } catch (error) {
                console.warn(error);
              }
            }
            this.state.input.options.values.splice(0);
            await this.$nextTick();
            this.state.input.options.values = ((await layer.getFilterData({
              fformatter: referencingField[0],
              ordering:   referencingField[0],
              ffield: this.filterFields
                .filter(item => `null` !== item.value)
                .map(item => [].concat(item.value)
                  .map(value => `${item.id}|eq|${encodeURIComponent(value)}`)
                  .join('|OR,'))
                .join('|AND,'),
            })).data || []).map(([value, key]) => ({ key, value }));
            this.state.value = this.state.input.options.values?.[0]?.value ?? null;
            // The blank option uses the string sentinel "null".
            this.state.value = 'null' === this.state.value ? null : this.state.value;
            await this.$nextTick();
            this.setLoading(false);
          }
        ));
      }

      // Reveal the filters only after initial option loading and watcher setup are complete.
      if (hasRelationFilters) {
        this.setLoading(false);
        this.isFilterFieldsReady = true;
      }
    },
    /**
     * Attach external widgets after their DOM nodes have been rendered.
     * Selects preload labels and synchronize selection; date/time sets display
    * and storage formats; rich-text fields attach their native editor handlers.
     */
    async mounted() {
      if (!this.isInput) {
        return;
      }
      const is_select   = ['select_input', 'select_autocomplete_input'].includes(this.type);
      const is_datetime ='datetimepicker_input' === this.type;

      if (is_select) {
        await this.$nextTick();
        this.resize?.();
      }

      // Remote autocomplete may need to preload labels for existing values.
      const preloadAutocomplete = is_select && this.autocomplete && this.state.value;
      if (preloadAutocomplete) {
        this.state.input.options.values.splice(0);
      }

      let search = is_select && this.state.value;

      if (is_select && preloadAutocomplete && this.multiple) {
        search = this.getMultiValues();
      }

      if (is_select && preloadAutocomplete) {
        (await this.getData({
          key:   this.state.input.options.key,
          value: this.state.input.options.value,
          search,
        })).forEach(({ $value, text }) => this.state.input.options.values.push({ key: $value, value: text }));
          this.state.input.options.values.sort((first, second) => {
            let firstValue = first.key;
            let secondValue = second.key;
            if (this.state.input.options.orderbyvalue) {
              firstValue = first.value;
              secondValue = second.value;
            }
            if (firstValue < secondValue) {
              return -1;
            }
            if (firstValue > secondValue) {
              return 1;
            }
            return 0;
          });
      }

      if (is_select) {
        await this.$nextTick();
        this.setValue();
      }

      // The date-picker stores field-format values but displays localized dates.
      if (is_datetime) {
        await this.$nextTick();
        this.resize?.();
      }

      this.datetimedisplayformat = is_datetime ? convertQGISDateTimeFormatToMoment(this.state?.input?.options?.formats?.[0]?.displayformat) : this.datetimedisplayformat;
      this.datetimefieldformat   = is_datetime ? convertQGISDateTimeFormatToMoment(this.state?.input?.options?.formats?.[0]?.fieldformat) : this.datetimefieldformat;
      this.validationOptions     = is_datetime ? { fielddatetimeformat: this.datetimefieldformat } : this.validationOptions;

      if (is_datetime) {
        $(`#${this.iddatetimepicker}`).datetimepicker({
          defaultDate:    is_datetime && moment(this.state.value, this.datetimefieldformat, true).isValid() ? moment(this.state.value, this.datetimefieldformat).toDate() : null,
          format:         this.datetimedisplayformat,
          ignoreReadonly: true,
          locale:         window.initConfig.user.i18n || 'en',
          enabledDates:   this.state?.input?.options?.formats?.[0]?.enabledDates,
          disabledDates:  this.state?.input?.options?.formats?.[0]?.disabledDates,
          useCurrent:     this.state?.input?.options?.formats?.[0]?.useCurrent,
          minDate:        this.state?.input?.options?.formats?.[0]?.minDate,
          maxDate:        this.state?.input?.options?.formats?.[0]?.maxDate,
        });
        $(`#${this.iddatetimepicker}`).on('dp.change', () => {
          const newDate    = $(`#${this.idinputdatetimepiker}`).val();
          this.state.value = '' !== newDate.trim() ? moment(newDate, this.datetimedisplayformat).format(this.datetimefieldformat) : null;
        });
        $(`#${this.iddatetimepicker}`).on('dp.show', () => this.$emit('datetimepickershow'));
        $(`#${this.iddatetimepicker}`).on('dp.hide', () => this.$emit('datetimepickershow'));
      }

      // The unique selector permits tagging and converts numeric values on selection.
      if ('unique_input' === this.type) {
        await this.$nextTick();
        this.setValue();
      }

      // Rich-text fields use the browser's native contenteditable surface.
      if ('texthtml_input' === this.type) {
        await this.$nextTick();
        this.$refs.rich_text_toolbar.querySelectorAll('button[title]').forEach(button => {
          button.dataset.placement = 'top';
        });
        this.$refs.rich_text_editor.innerHTML = this.sanitizeEditorHtml(this.state.value);
        document.addEventListener('selectionchange', this.updateEditorFormats);
        this.updateEditorFormats();
      }
    },
    /**
    * Remove map listeners, global resize hooks and relation watchers.
      * Invalidate autocomplete responses and release the picking interaction.
     */
    beforeDestroy() {
      if (this.layer && GUI.getMap()) {
        GUI.getMap().removeLayer(this.layer);
      }
      // Stop map listeners before releasing shared widget and global resources.
      if ('lonlat_input' === this.type) {
        this.stopToGetCoordinates();
      }
      if (this.interaction && this.isPicked()) {
        this.unpickFeature();
      }
      this.interaction = null;
      // Date and select widgets each own a resize registration.
      if ('datetimepicker_input' === this.type) {
        GUI.off('resize', this.resize);
      }
      if (['select_input', 'select_autocomplete_input'].includes(this.type)) {
        clearTimeout(this.autocompleteSearchTimer);
        this.autocompleteSearchId = (this.autocompleteSearchId || 0) + 1;
        GUI.off('resize', this.resize);
        this.filterFieldsUnwatches?.forEach(unwatch => unwatch());
        this.filterFieldsUnwatches = null;
      }
      if ('texthtml_input' === this.type) {
        document.removeEventListener('selectionchange', this.updateEditorFormats);
        if (this.editorLinkDialog) {
          this.closeEditorLink();
        }
      }
      this.edit_state.edit = false;
      this.edit_state.show_html = false;
    }
  };

  // Self-registration keeps recursion (child groups, media preview) working for extended aliases (eg. "g3w-input").
  G3WField.components = { 'g3w-field': G3WField };

  export default G3WField;
</script>

<style scoped>
.field_link {
  max-width: 100%;
}
.show-hide-geo {
  color: #3C8DBC;
  cursor: pointer;
  font-size: 1.2em;
}
.field_text_table {
  background-color: transparent !important;
}
.field_text_table .field_label {
  font-weight: bold;
}
.g3w-input-pick-layer {
  cursor: pointer;
  position: relative;
  top: 2px;
  font-size: 1.2em;
}
.g3w-input-coordinate-button-active {
  border: 2px solid !important;
}
.g3w-input-richtext {
  border: 1px solid #ccc;
  box-sizing: border-box;
  line-height: 1.42;
  min-height: 72px;
  overflow: auto;
  padding: 12px 15px;
  height: auto;
}
.g3w-input-richtext-toolbar {
  align-items: center;
  border: 1px solid #ccc;
  border-bottom: 0;
  color: #444;
  column-gap: 4px;
  display: flex;
  flex-wrap: wrap;
  padding: 4px 5px;
}
.g3w-input-richtext-toolbar button {
  background: transparent;
  border: 0;
  border-radius: 2px;
  color: inherit;
  cursor: pointer;
  font-size: 15px;
  height: 28px;
  line-height: 1;
  min-width: 30px;
  padding: 4px 6px;
  flex: 0 0 auto;
}
.g3w-input-richtext-toolbar button:hover:not(:disabled),
.g3w-input-richtext-toolbar button:focus-visible {
  background: #e6e6e6;
}
.g3w-input-richtext-toolbar button.g3w-input-richtext-active {
  background: #e8f2ff;
  color: #06c;
}
.g3w-input-richtext-toolbar button:disabled {
  cursor: default;
  opacity: .45;
}
.g3w-input-richtext-break {
  flex-basis: 100%;
  height: 0;
}
.g3w-input-richtext-toolbar select {
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  font-size: 16px;
  height: 28px;
  min-width: 118px;
  padding: 0 20px 0 8px;
}
.g3w-input-richtext-toolbar select:disabled {
  cursor: default;
}
.g3w-input-richtext-color-picker {
  display: inline-block;
  position: relative;
  vertical-align: middle;
}
.g3w-input-richtext-color-indicator {
  border-bottom: 2px solid #000;
  bottom: 3px;
  left: 6px;
  position: absolute;
  right: 6px;
}
.g3w-input-richtext-color-palette {
  background: #fff;
  border: 1px solid #ccc;
  box-shadow: 0 2px 5px #0003;
  display: grid;
  grid-template-columns: repeat(7, 18px);
  left: 0;
  padding: 4px;
  position: absolute;
  top: 30px;
  width: max-content;
  z-index: 10;
}
.g3w-input-richtext-color-palette button {
  border: 1px solid #ddd;
  height: 16px;
  min-width: 16px;
  padding: 0;
  width: 16px;
}
.g3w-input-richtext-toolbar-source-mode select,
.g3w-input-richtext-toolbar-source-mode button:not(.g3w-input-richtext-html) {
  cursor: not-allowed;
  opacity: .45;
  pointer-events: none;
}
.g3w-input-richtext-color-picker > button {
  font-size: 17px !important;
  font-weight: 600;
}
.g3w-input-richtext-html {
  font-weight: 700;
  text-transform: lowercase;
}
.g3w-input-richtext.g3w-input-richtext-source {
  font-family: monospace;
  white-space: pre-wrap;
}
.g3w-input-richtext.g3w-input-richtext-invalid {
  border: 1px solid red;
}
</style>
