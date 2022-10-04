/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.mixins.js@v3.6
 */
export default {
  computed: {
    notvalid() {
      return this.state.validate.valid === false;
    },
    editable() {
      return this.state.editable;
    },
    showhelpicon(){
      return this.state.help && this.state.help.message.trim();
    }
  },
  methods: {
    showHideHelp(){
      this.state.help.visible = !this.state.help.visible
    },
    // used to text input to listen mobile changes
    mobileChange(event){
      this.state.value = event.target.value;
      this.change();
    },
    // called when input value change
    change() {
      this.service.setEmpty();
      // validate input
      this.state.validate.required && this.service.validate();
      // emit change input
      this.$emit('changeinput', this.state);
    },
    isVisible() {}
  },
  mounted() {
    /**
     * in case of input value is fill with default value option we nee to emit changeinput event
     * without check validation. Example:
     * {
        "name": "id",
        "type": "integer",
        "label": "id",
        "editable": false,
        "validate": {
            "required": true,
            "unique": true
        },
        "pk": true,
        "default": "nextval('g3wsuite.zone_id_seq'::regclass)",
        "input": {
            "type": "text",
            "options": {}
        }
      }
     in this case if we start a validation, it fail because default value is a string while input is interger
     */
    this.service && this.service.has_default_value && this.$emit('changeinput', this.state);
  }
};