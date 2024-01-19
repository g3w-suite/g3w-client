<!--
  @file
  
  ORIGINAL SOURCE: src/components/InputLonLat.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-field :state="state">

    <!-- 
      @example <g3w-field mode="input" _type="lonlat" />
     -->
    <template #default>
      <div style="position: relative">

        <div class="g3w-input-lat-lon">
          <button
            ref                 = "g3w-input-lat-lon"
            @click.prevent.stop = "toggleGetCoordinate"
            :style              = "{ border: (coordinatebutton.active ? '2px solid' : 0) }"
            data-placement      = "left"
            data-container      = "body"
            data-toggle         = "tooltip"
            v-t-tooltip         = "'sdk.form.inputs.tooltips.lonlat'"
            class               = "action skin-tooltip-left skin-color skin-border-color"
            :class              = "g3wtemplate.font['crosshairs']"
          ></button>
        </div>

        <!-- LONGITUDE -->
        <g3w-field :state="state" mode="input">

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

        </g3w-field>

        <!-- LATITUDE -->
        <g3w-field :state="state" mode="input">

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

        </g3w-field>
      </div>
    </template>

  </g3w-field>
</template>

<script>
import G3WField           from 'components/G3WField.vue';
import { getUniqueDomId } from 'utils/getUniqueDomId';

Object
    .entries({
      G3WField,
      getUniqueDomId,
    })
    .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

export default {

  /** @since 3.8.6 */
  // name: 'input-lonlat',

  components: {
    'g3w-field': G3WField,
  },

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
      const { coordinatebutton } = this.$parent.getInputService();
      if (coordinatebutton.active) {
        this._stopToGetCoordinates();
      } else {
        this._startToGetCoordinates();
      }
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/lonlat/service.js@3.8::startToGetCoordinates()
     * 
     * @since 3.9.0
     */
    _startToGetCoordinates() {
      const service              = this.$parent.getInputService();
      const { coordinatebutton } = service;

      coordinatebutton.active = true;

      service.mapService.deactiveMapControls();
      service.mapService.on('mapcontrol:toggled', this._mapControlToggleEventHandler.bind(this));
      service.eventMapKey = service.map.on('click', this._onMapClick)
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/lonlat/service.js@3.8::startToGetCoordinates()
     * 
     * @since 3.9.0
     */
    _stopToGetCoordinates() {
      const service              = this.$parent.getInputService();
      const { coordinatebutton } = service;

      coordinatebutton.active = false;

      ol.Observable.unByKey(service.eventMapKey);
      service.mapService.off('mapcontrol:toggled', this._mapControlToggleEventHandler.bind(this));
    },

    
    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/lonlat/service.js@3.8
     * 
     * @param event.target
     * 
     * @since 3.9.0
     */
    _mapControlToggleEventHandler({ target }) {
      const { coordinatebutton } = this.$parent.getInputService();
      if (
        target.isToggled() &&
        target.isClickMap() &&
        coordinatebutton.active
      ) {
        this.toggleGetCoordinate();
      }
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/lonlat/service.js@3.8
     * 
     * @since 3.9.0
     */
    _onMapClick(evt) {
      evt.originalEvent.stopPropagation();
      evt.preventDefault();
      const service = this.$parent.getInputService();
      const coord   = service.mapEpsg !== service.outputEpsg
        ? ol.proj.transform(evt.coordinate, service.mapEpsg, service.outputEpsg)
        : evt.coordinate;
      service._setValue([coord]);
      service.getState().values.lon = coord[0];
      service.getState().values.lat = coord[1];
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
    this.$parent.getInputService().coordinatebutton = this.coordinatebutton;
  },

  async mounted() {
    await this.$nextTick();
    await this.$nextTick();

    $(this.$refs['g3w-input-lat-lon']).tooltip({ trigger: 'hover' });
  },

  destroyed() {
    this._stopToGetCoordinates();
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