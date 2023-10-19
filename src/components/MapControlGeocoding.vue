<!--
  @file
  @since 3.9.0
-->
<template>
  <div :class="containerClass">

    <div :class="cssClasses.inputTextControl">
      <input
        ref             = "input"
        type            = "text"
        :id             = "cssClasses.inputQueryId"
        autocomplete    = "off"
        :class          = "cssClasses.inputTextInput"
        v-t-placeholder = "placeholder"
        @keyup          = "_onQuery"
        @input          = "_onQuery"
      />
      <button
        type   = "button"
        id     = "search_nominatim"
        class  = "btn"
        @click = "() => ctx.query(document.querySelector(`input.${this.cssClasses.inputTextInput}`).value)"
      >
        <i :class="fontIcon" style="color: #ffffff" aria-hidden="true"></i>
      </button>
      <button
        ref    = "reset"
        type   = "button"
        :id    = "cssClasses.inputResetId"
        :class = "[cssClasses.inputTextReset, cssClassesHidden]"
        @click = "_onReset"
      ></button>
    </div>

    <ul :class="cssClasses.inputTextResult"></ul>

  </div>
</template>

<script>

let timeout;

export default {

  // functional: true,

  data() {
    return { document };
  },

  props: {
  
    containerClass: {
      type: String,
      required: true
    },
  
    cssClasses: {
      type: Object,
      required: true
    },
  
    fontIcon: {
      type: String,
      required: true
    },
  
    placeholder: {
      type: String,
      required: true
    },
  
    ctx: {
      type: Object,
      required: true
    },

  },

  methods: {

    /**
     * @since 3.9.0
     */
     _onQuery(evt) {
      if ('Enter' === evt.key || 13 === evt.which || 13 === evt.keyCode) {
        evt.preventDefault();
        this.ctx.query(evt.target.value.trim());
      }
    },
    
    _onValue(evt) {
      const value = evt.target.value.trim();
      this.$refs.reset.classList.toggle(this.cssClasses.hidden, !value.length);
      if (this.ctx.options.autoComplete && timeout) {
        clearTimeout(timeout)
      }
      if(this.ctx.options.autoComplete) {
        timeout = setTimeout(() => (value.length >= this.ctx.options.autoCompleteMinLength) && this.ctx.query(value), 200);
      }
    },

    /**
     * @since 3.9.0
     */
    _onReset() {
      this.$refs.input.focus();
      this.$refs.input.value = '';
      this.$refs.reset.classList.add(this.cssClasses.hidden);
      this.ctx.clearResults();
    },

  },

};
</script>
