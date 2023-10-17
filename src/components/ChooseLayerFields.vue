<template>
  <div id="g3w-fields-to-choose">
    <h4 style="font-weight: bold" v-t="'download.fields.title'"></h4>
    <section class="g3w-fields-to-choose-inputs">
      <input
        @click.stop = "selectAll"
        :id         = "`select_all_fields_to_download`"
        type        = "checkbox"
        class       = "magic-checkbox"
        :checked    = "all"
      >
      <label
        :for  = "`select_all_fields_to_choose`"
        style = "color: #FFF" v-t="'download.fields.all'">
      </label>
      <divider/>
      <section class="inputs-body" :class="{grid: gridClass}">
        <template v-for="field in fields" >
          <input
            @click.stop = "selectField(field)"
            :id         = "`${field.name}_${index}_select_field_to_choose`"
            type        = "checkbox"
            class       = "magic-checkbox"
            :checked    = "field.selected"
          >
          <label
            :for  = "`${field.name}_${index}_select_field_to_choose`"
            style = "color: #FFF"> {{ field.label }}
          </label>
        </template>

      </section>
    </section>
  </div>

</template>

<script>
export default {
  name: 'downloadfieldslayer',
  props: {
    fields: {
      type: Array,
      default: [],
      required: true
    }
  },
  data() {
    return {
      all: true,
    }
  },
  computed: {
    gridClass() {
      return this.fields.length > 6
    }
  },
  methods: {
    selectField(field) {
      field.selected = !field.selected;
      if (field.selected) {
        this.all = undefined === this.fields.find(field => !field.selected);
        this.$emit('selected-fields', true);
      } else {
        this.all = false;
        this.$emit('selected-fields', undefined !== this.fields.find(field => field.selected));
      }
    },
    selectAll() {
      this.all = !this.all;

      this
        .fields
        .forEach(field => field.selected = this.all)

      this.$emit('selected-fields', this.all);
    }
  },
};
</script>
<style scoped>
  #g3w-fields-to-choose label{
    color: #000000 !important;
  }
  #g3w-fields-to-choose .inputs-body.grid {
    display: grid;
    grid-template-columns: 50% 50%
  }
</style>
