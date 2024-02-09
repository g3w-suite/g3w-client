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
        <template  v-if      = "0 === hindex">
          <div style="display: flex">
            <select-row
              @selected = "addRemoveSelectedFeature"
              :feature  = "feature"
            />
            <span
              v-if="edit"
              @click.stop="editFeature(feature)"
              v-t-tooltip:top.create="'sdk.tooltips.editing'">
              <i class="action-button skin-color" :class="g3wtemplate.getFontClass('pencil')"></i>
            </span>
          </div>

        </template>

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
import GUI       from 'services/gui';

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
    },
    /** @since 3.10.0 layer is editable? */
    edit: {
      type: Boolean,
      default: false
    },
    /** @since 3.10.0 id of current layer */
    layer_id: {
      type: String,
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
    /**
     * @since 3.10.0
     * @param feature
     */
    editFeature(feature) {
      GUI
        .getService('queryresults')
        .editFeature({
          layer: { id: this.layer_id },
          feature
        })
    },
    getField(feature, header) {
      return {
        value: feature.attributes[header.name],
        label: undefined // temporary to avoid label
      }
    }
  }
};
</script>