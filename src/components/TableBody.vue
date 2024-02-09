<!--
  @file
  @since v3.7
-->

<template>
  <tbody id="table_body_attributes" >
    <tr
      v-for           = "(feature, index) in features" :key="feature.id"
      role            = "row"
      class           = "feature_attribute"
      style           = "cursor: pointer"
      @mouseover      = "zoomAndHighLightFeature(feature, false)"
      @click.stop     = "zoomAndHighLightFeature(feature, true)"
      :selected       = "selectedRow === index"
      :class          = "[
        index %2 == 1 ? 'odd' : 'pair',
        { geometry: !!feature.geometry },
        { 'selected': feature.selected }
      ]">
      <td
        v-for="(header, hindex) in headers"
        :tab-index="1"
      >
        <select-row
          v-if      = "0 === hindex"
          @selected = "addRemoveSelectedFeature"
          :feature  = "feature"
        />
        <field
           v-else
          :feature = "feature"
          :state   = "getField(feature, header)"
        />
      </td>
    </tr>
  </tbody>
</template>

<script>
import SelectRow from 'components/TableSelectRow.vue'
import Field     from 'components/FieldG3W.vue';

export default {
  name: "table-body",
  props: {
    headers: {
      required: true,
      type: Array
    },
    features: {
      required: true,
      type: Array
    },
    zoomAndHighLightFeature: {
      type: Function
    },
    addRemoveSelectedFeature: {
      type: Function
    },
    filter: {
      type: Object,
      default: {
        active: false
      }
    }
  },
  data() {
    return {
      selectedRow: null
    }
  },
  components: {
    Field,
    SelectRow
  },
  methods: {
    getField(feature, header) {
      return {
        value: feature.attributes[header.name],
        label: undefined // temporary to avoid label
      }
    }
  }
};
</script>