<!--
  @file
  @since 3.9.0
-->
<template>
  <div id="g3w-fields-to-choose">

    <h4 class="title" v-t="'download.fields.title'"></h4>

    <section class="g3w-fields-to-choose-inputs">
      
      <input
        @click.stop = "selectAll"
        :id         = "`select_all_fields_to_choose`"
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

  name: 'chooselayerfields',

  props: {

    fields: {
      type: Array,
      default: [],
      required: true,
    },

  },

  data() {
    return {
      all: true, // Boolen -  Change when select_all_fields_to_choose is change
    }
  },

  computed: {

    gridClass() {
      return this.fields.length > 6; // Boolean. Set a gid css class if there are more than 6 fields
    },

  },

  methods: {

    /**
     * Changes `field.selected` boolean poperty
     * 
     * @param field
     * 
     * @fires selected-fields since 3.9.0
     */
    selectField(field) {
      field.selected = !field.selected;
      this.all = field.selected
        ? undefined === this.fields.find(field => !field.selected)                  // check if all fields are selected
        : false;                                                                    // false = not all fields are selected
      this.$emit(
        'selected-fields',
        (field.selected || undefined !== this.fields.find(field => field.selected)) // check if at least one field is selected 
      );
    },

    /**
     * Select all fields
     */
    selectAll() {
      this.all = !this.all;
      this.fields.forEach(field => field.selected = this.all)
      this.$emit('selected-fields', this.all);
    },
  },

};
</script>
<style scoped>
  #g3w-fields-to-choose label{
    color: #000000 !important;
  }

  #g3w-fields-to-choose .title {
    font-weight: bold;
  }

  #g3w-fields-to-choose .inputs-body.grid {
    display: grid;
    grid-template-columns: 50% 50%
  }
</style>
