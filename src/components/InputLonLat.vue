<!--
  @file
  @since v3.7
-->

<template>
  <div style = "position: relative">
    <div style = "display: flex;justify-content: flex-end;height: 35px;margin-right: 12px; margin-bottom: 5px">
      <button
        ref                 = "g3w-input-lat-lon"
        @click.prevent.stop = "toggleGetCoordinate"
        :style              = "{border: coordinatebutton.active ? '2px solid' : 0}"
        data-placement      = "left"
        data-container      = "body"
        data-toggle         = "tooltip"
        v-t-tooltip         = "'sdk.form.inputs.tooltips.lonlat'"
        class               = "action skin-tooltip-left skin-color skin-border-color"
        style               = "border-radius: 5px; font-weight: bold; font-size: 20px; cursor: pointer"
        :class              = "g3wtemplate.font['crosshairs']">
      </button>
    </div>

    <baseinput :state = "state">
      <label slot = "label" :for = "lonId" class = "col-sm-4 control-label">{{state.labels.lon}}
        <span v-if = "state.validate && state.validate.required">*</span>
      </label>
      <div slot="body">
        <input
          :id         = "lonId"
          @change     = "changeLonLat"
          :class      = "{'input-error-validation' : notvalid}"
          class       = "form-control"
          style       = "width:100%; margin-bottom: 5px;"
          :tabIndex   = "tabIndex"
          v-disabled  = "!editable"
          v-model     = "state.values.lon"
          type        = "number"
          min         = "-180"
          max         = "180"
          placeholder = "Lon">
      </div>
    </baseinput>

    <baseinput :state = "state">
      <label slot = "label" :for = "latId" class = "col-sm-4 control-label">{{ state.labels.lat }}
        <span v-if = "state.validate && state.validate.required">*</span>
      </label>
      <div slot = "body" >
        <input
          :id         = "latId"
          @change     = "changeLonLat"
          class       = "form-control"
          style       = "width:100%; margin-bottom: 5px;"
          :tabIndex   = "tabIndex"
          v-disabled  = "!editable"
          v-model     = "state.values.lat"
          type        = "number"
          :class      = "{'input-error-validation' : notvalid}"
          min         = "-90"
          max         = "90"
          placeholder = "Lon">
      </div>
    </baseinput>

  </div>
</template>

<script>
  import { getUniqueDomId } from 'utils/getUniqueDomId';

  export default {
    /** @since 3.8.6 */
    name: 'input-lonlat',
    data() {
      return {
        lonId: getUniqueDomId(),
        latId: getUniqueDomId(),
        coordinatebutton: {
          active: false
        }
      }
    },
    computed:{
      getCoordinateActive() {
        return this.service.state.getCoordinateActive;
      }
    },
    methods: {
      toggleGetCoordinate() {
        this.service.toggleGetCoordinate();
      },
      changeLonLat() {
        this.change();
        this.setValue();
      },
      setValue() {
        this.state.value = [[1*this.state.values.lon, 1*this.state.values.lat]]
      }
    },
    created() {
      this.state.values = this.state.values || {lon:0, lat:0};
      this.setValue();
      this.service.setCoordinateButtonReactiveObject(this.coordinatebutton);
    },
    async mounted() {
      await this.$nextTick();
      $(this.$refs['g3w-input-lat-lon']).tooltip({ trigger: 'hover' });

    },
    destroyed() {
      this.service.clear();
    }
  };
</script>