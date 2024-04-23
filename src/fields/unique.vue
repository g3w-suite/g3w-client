<!--
  @file
  
  ORIGINAL SOURCE: src/components/InputUnique.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-field :state="state">
    <template #input-body="{ tabIndex, editable }">
      <select
        :id          = "id"
        style        = "width: 100%"
        :tabIndex    = "tabIndex"
        v-disabled   = "!editable"
        class        = "form-control"
      >
        <option value="null"></option>
        <option
          v-for  = "value in state.input.options.values"
          :key   = "value"
          :value = "getValue(value)"
        >{{ getValue(value) }}</option>
      </select>
    </template>
  </g3w-field>
</template>

<script>
import G3WField           from 'components/G3WField.vue';
import { selectMixin }    from 'mixins';
import { getUniqueDomId } from 'utils/getUniqueDomId';

Object
    .entries({
      G3WField,
      selectMixin,
      getUniqueDomId,
    })
    .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

export default {

  /** @since 3.8.6 */
  // name: "input-unique",

  components: {
    'g3w-field': G3WField,
  },

  mixins: [
    selectMixin
  ],

  data() {
    return { id: `unique_${getUniqueDomId()}` };
  },

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

  watch: {

    async 'state.input.options.values'(values) {

      this.state.value = this.state.value
        ? this.state.value
        : null;

      if (null !== this.state.value && -1 === values.indexOf(this.state.value)) {
        this.$parent.getInputService().addValueToValues(this.state.value);
      }

      await this.$nextTick();

      if (this.state.value) {
        this.select2.val(this.state.value).trigger('change');
      }

    },

  },

  methods: {

    /**
     * @since 3.9.0 
     */
    getSelect2() {
      let select2 = this.select2;

      if (!select2 && this.state.input.options.editable) {
        select2 = $(`#${this.id}`).select2({ dropdownParent: $('#g3w-view-content'), tags: true, language: this.getLanguage() });
        select2.val(this.state.value).trigger('change');
        select2.on('select2:select', this.onSelect2Change.bind(this));
      }

      return select2;
    },

    /**
     * @since 3.9.0 
     */
    onSelect2Change(e) {
      const { data } = e.params;
      this.changeSelect(data.$value ? data.$value : data.id);
    },
    
    /**
     * @override selectMixin::changeSelect(value)
     */
    changeSelect(value) {
      this.state.value = ('null' === value ? null : value);
      this.$parent.change();
    },

  },

  async mounted() {

    await this.$nextTick();

    this.select2 = this.getSelect2();
  },

};
</script>