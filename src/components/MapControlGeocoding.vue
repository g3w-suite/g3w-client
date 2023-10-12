<!--
  @file
  @since 3.9.0
-->
<template>
  <div :class="containerClass">

    <div :class="cssClasses.inputTextControl">
      <input
        type          = "text"
        :id           = "cssClasses.inputQueryId"
        autocomplete  = "off"
        :class        = "cssClasses.inputTextInput"
        v-t-placeholder = "placeholder"
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
        type   = "button"
        :id    = "cssClasses.inputResetId"
        :class = "[cssClasses.inputTextReset, cssClassesHidden]"
      ></button>
    </div>

    <ul :class="cssClasses.inputTextResult"></ul>

  </div>
</template>

<script>
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

};
</script>
