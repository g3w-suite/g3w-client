<!--
  @file
  @since v3.7
-->

<template>
  <g3w-input :state="state">
    <template #default>
      <div style="position: relative">

        <div class="g3w-input-lat-lon">
          <button
            ref                 = "g3w-input-lat-lon"
            @click.prevent.stop = "toggleGetCoordinate"
            :style              = "{ border: (coordinatebutton.active ? '2px solid' : 0) }"
            data-placement      = "left"
            data-toggle         = "tooltip"
            v-t-tooltip         = "'sdk.form.inputs.tooltips.lonlat'"
            class               = "action skin-tooltip-left skin-color skin-border-color"
            :class              = "g3wtemplate.font['crosshairs']"
          ></button>
        </div>

        <!-- LONGITUDE -->
        <g3w-input :state="state">

          <template #input-label>
            <label :for="lonId" class="col-sm-4 control-label">{{state.labels.lon}} <span v-if="is_required">*</span></label>
          </template>

          <template #input-body="{ tabIndex, editable, notvalid }">
            <div>
              <input
                :id         = "lonId"
                @change     = "changeLonLat"
                :class      = "{ 'input-error-validation' : notvalid }"
                class       = "form-control"
                style       = "width: 100%; margin-bottom: 5px;"
                :tabIndex   = "tabIndex"
                v-disabled  = "!editable"
                v-model     = "state.values.lon"
                type        = "number"
                min         = "-180"
                max         = "180"
                placeholder = "Lon"
              >
            </div>
          </template>

        </g3w-input>

        <!-- LATITUDE -->
        <g3w-input :state="state">

          <template #input-label>
            <label :for="latId" class="col-sm-4 control-label">{{ state.labels.lat }} <span v-if="is_required">*</span></label>
          </template>

          <template #input-body="{ tabIndex, editable, notvalid }">
            <div>
              <input
                :id         = "latId"
                @change     = "changeLonLat"
                class       = "form-control"
                style       = "width: 100%; margin-bottom: 5px;"
                :tabIndex   = "tabIndex"
                v-disabled  = "!editable"
                v-model     = "state.values.lat"
                type        = "number"
                :class      = "{ 'input-error-validation' : notvalid }"
                min         = "-90"
                max         = "90"
                placeholder = "Lon"
              >
            </div>
          </template>

        </g3w-input>
      </div>
    </template>
  </g3w-input>
</template>

<script>
const { getUniqueDomId } = require('core/utils/utils');

export default {

  /** @since 3.8.6 */
  name: 'input-lonlat',

  data() {
    return {
      lonId:            getUniqueDomId(),
      latId:            getUniqueDomId(),
      coordinatebutton: { active: false },
    };
  },

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

  computed:{

    /**
     * @TODO check if deprecated
     */
    getCoordinateActive() {
      return this.$parent.getInputService().state.getCoordinateActive;
    },

    /**
     * @since 3.9.0
     */
    is_required() {
      return this.state.validate && this.state.validate.required;
    }

  },

  methods: {

    toggleGetCoordinate() {
      this.$parent.getInputService().toggleGetCoordinate();
    },

    changeLonLat() {
      this.$parent.change();
      this.$parent.setValue();
    },

    setValue() {
      this.state.value = [
        [
          1 * this.state.values.lon,
          1 * this.state.values.lat,
        ],
      ];
    },

  },

  created() {
    this.state.values = this.state.values || { lon:0, lat:0 };
    this.$parent.setValue();
    this.$parent.getInputService().setCoordinateButtonReactiveObject(this.coordinatebutton);
  },

  async mounted() {
    await this.$nextTick();
    await this.$nextTick();

    $(this.$refs['g3w-input-lat-lon']).tooltip({ trigger: 'hover' });
  },

  destroyed() {
    this.$parent.getInputService().clear();
  },

};
</script>

<style scoped>
  div.g3w-input-lat-lon {
    display: flex;
    justify-content: flex-end;
    height: 35px;
    margin-right: 12px;
    margin-bottom: 5px;
  }
  div.g3w-input-lat-lon > button.action {
    border-radius: 5px;
    font-weight: bold;
    font-size: 20px;
    cursor: pointer;
  }
</style>