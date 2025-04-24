/**
 * @file ORIGINAL SOURCE: src/app/g3w-ol/controls/measuercontrol.js@v3.10.2
 * @since 3.11.0
 */
import { Compact as ColorPicker } from 'vue-color';

import ApplicationState           from 'store/application';
import GUI                        from 'services/gui';
import InteractionControl         from 'map/controls/interactioncontrol';
import { saveBlob }               from 'utils/saveBlob';
import { createMeasureTooltip }   from 'utils/createMeasureTooltip';
import { areCoordinatesEqual }    from 'utils/areCoordinatesEqual';

const DEFAULTS = {
  /** Incremental number to unique identify id feature */
  fid:       1,
  color:     '244, 78, 59',
  radius:    8,
  width:     3,
  opacity:   0.5,
  rotation:  0,
  circle:    { radius: 0, unit: 1 },
  line:      { length: 0, unit: 1 },
  rectangle: { width:  0, wunit:  1, height: 0, hunit:  1 }
};

export class AnnotationControl extends InteractionControl {

  constructor(opts = {}) {
    super({
      ...opts,
      name:     'annotation',
      clickmap: true,
      enabled:  true,
    });

    this._layer = new ol.layer.Vector({ source: new ol.source.Vector() });

    /** Annotation data */
    this._annotation = {
      type:         null,
      ids:           [],
      /** annotation feature to edit */
      feature:       null,
      style: {
        color:    DEFAULTS.color,
        width:    DEFAULTS.width,
        radius:   DEFAULTS.radius,
        opacity:  DEFAULTS.opacity,
        rotation: DEFAULTS.rotation,
      },
      constraints: {
        circle:    {...DEFAULTS.circle},
        line:      {...DEFAULTS.line},
        rectangle: {...DEFAULTS.rectangle},
      },
      text:          '',
      show_text:     false,
      /** show info feature (cordinates, lenght, area, etc.) */
      show_info:     false,
    };

    this._interaction = null;

    this._measureTooltip = null;

    this._interactions = {};

    // load saved annotations (from server)
    const features = (new ol.format.GeoJSON({
      dataProjection:    GUI.getService('map').getEpsg(),
      featureProjection: GUI.getService('map').getEpsg()
    })).readFeatures(opts.annotations || { type: "FeatureCollection", features: [] });

    // set styles
    features.forEach(f => {
      if ('Circle' === f.get('type')) {
        f.setGeometry(new ol.geom.Circle(f.get('center'), Number(f.get('radius'))));
      }
      DEFAULTS.fid = Math.max(DEFAULTS.fid, f.getId()) + 1; // increment counter from added feautures
      f.setStyle(this.#style(f.get('type')));
    });

    // add features
    this._layer.getSource().addFeatures(features)
    this._layer.getSource().on('addfeature',    this.#onAddFeature.bind(this));
    this._layer.getSource().on('removefeature', this.#onRemoveFeature.bind(this));
    
    this._interactions.select = new ol.interaction.Select({
      layers: [this._layer],
      style:  feature => this.#style(feature.get('type'))(feature)
    });
    
    this._interactions.modify = new ol.interaction.Modify({
      features:              this._interactions.select.getFeatures(),
      insertVertexCondition: () => this._annotation.feature && 'Rectangle' !== this._annotation.feature.get('type'),
    });

    // monkey patch: "ol.interaction.Modify~handleDragEvent"
    this._interactions.modify.handleDragEvent = new Proxy(this._interactions.modify.handleDragEvent, {
      apply: (cb, ctx, args) => { this.#onDrag(...args); return cb(...args); },
    });

    this._interactions.select.on('select',      this.#onSelectInteraction.bind(this));
    this._interactions.modify.on('modifystart', this.#onModifyStart.bind(this));
    this._interactions.modify.on('modifyend',   this.#onModifyEnd.bind(this));

    const CONTROL = this;

    // toolbox (interactions)
    this.on('toggled', ({ toggled }) => {
      if (!toggled) {
        return GUI.closeUserMessage();
      }
      GUI.showUserMessage({
        title:     'sdk.mapcontrols.annotation.title',
        type:      'tool',
        size:      'small',
        iconClass: 'annotation',
        closable:  false,
        hooks: {
          body: {
            components: { ColorPicker },
            data: () => this._annotation,
            template: /* html */ `
              <div style="width: 100%; padding: 5px;">

                <!-- SHAPE TYPES -->
                <div style = "display: flex; justify-content: space-between; flex-flow: wrap; margin-bottom: 5px;">
                  <input
                    v-for                     = "shape in ['Point', 'LineString', 'Polygon', 'Circle', 'Rectangle', 'Text']"
                    v-t-tooltip:bottom.create = "shape"
                    type                      = "radio"
                    :value                    = "shape"
                    v-model                   = "type"
                    @click                    = "type = (type === shape && shape);"
                    :class                    = "[type === shape && 'skin-background-color']"
                    :style                    = "{
                      appearance: 'none',
                      display:    'inline-block',
                      width:      '30px',
                      height:     '30px',
                      border:     '1px solid #ccc',
                      cursor:     'pointer',
                      background: 'url(' + getShapeIconUrl(shape) + ') no-repeat center',
                    }"
                  />
                </div>

                <!-- SHAPES ACTIONS -->
                <div v-if = "feature || (!type && ids.length > 0)" style="display: flex; justify-content: flex-end; gap: 5px; font-size: 1.2em; border-bottom: 1px solid #eee; border-top: 1px solid #eee; padding: 10px 0; margin: 10px 0;">
                  <button :class = "$fa('list')"     @click = "showAll"  style = "background:none; border: none;" :hidden = "!feature || !ids.length"></button>
                  <button :class = "$fa('download')" @click = "download" style = "background:none; border: none;"></button>
                  <button :class = "$fa('trash')"    @click = "remove"   style = "background:none; border: none;"></button>
                </div>

                <!-- SHAPES SAVED -->
                <div v-if   = "!feature && !type && ids.length > 0">
                  <button 
                    v-for  = "item in ids"
                    :key   = "item.id" 
                    @click = "editFeature(item.id)"
                    style  = "width: 100%; margin: 3px; border: solid 1px #ccc"
                  >{{ item.text }}</button>
                </div>

                <!-- SHAPE CONSTRAINT: “Segment length (line)” -->
                <div v-if = "'LineString' === type && !feature" style="display: flex; align-items: end;">
                  <label style="margin: 0; width: 100%">
                    Length
                    <input 
                      class   = "form-control"
                      type    = "number" 
                      name    = "length" 
                      min     = "0" 
                      step    = "1"
                      v-model = "constraints.line.length"
                    />
                  </label>
                  <select style = "max-width: 25%" class = "form-control" v-model = "constraints.line.unit">
                    <option value = "1">m</option>
                    <option value = "1000">km</option>
                  </select> 
                </div>

                <!-- SHAPE CONSTRAINT: “Segment length (polygon)” -->
                <div v-if = "'Polygon' === type && !feature" style="display: flex; align-items: end;">
                  <label style="margin: 0; width: 100%">
                    Length
                    <input 
                      class   = "form-control"
                      type    = "number" 
                      name    = "length" 
                      min     = "0" 
                      step    = "1"
                      v-model = "constraints.line.length"
                    />
                  </label>
                  <select style = "max-width: 25%" class = "form-control" v-model = "constraints.line.unit">
                    <option value = "1">m</option>
                    <option value = "1000">km</option>
                  </select> 
                </div>

                <!-- SHAPE CONSTRAINT: “Segment width (rectangle)” -->
                <div v-if = "'Rectangle' === type && !feature" style="display: flex; align-items: end;">
                  <label style="margin: 0; width: 100%">
                    W Length
                    <input 
                      class   = "form-control"
                      type    = "number" 
                      name    = "width" 
                      min     = "0" 
                      step    = "1"
                      v-model = "constraints.rectangle.width"
                    />
                  </label>
                  <select style = "max-width: 25%" class = "form-control" v-model = "constraints.rectangle.wunit">
                    <option value = "1">m</option>
                    <option value = "1000">km</option>
                  </select> 
                </div>

                <!-- SHAPE CONSTRAINT: “Segment height (rectangle)” -->
                <div v-if = "'Rectangle' === type && !feature" style="display: flex; align-items: end;">
                  <label style="margin: 0; width: 100%">
                    H Length
                    <input 
                      class   = "form-control"
                      type    = "number" 
                      name    = "height" 
                      min     = "0" 
                      step    = "1"
                      v-model = "constraints.rectangle.height"
                    />
                  </label>
                  <select style = "max-width: 25%" class = "form-control" v-model = "constraints.rectangle.hunit">
                    <option value = "1">m</option>
                    <option value = "1000">km</option>
                  </select> 
                </div>

                <!-- SHAPE CONSTRAINT: “Circle radius” -->
                <div v-if = "'Circle' === type && !feature" style="display: flex; align-items: end;">
                  <label style="margin: 0; width: 100%">
                    Radius
                    <input 
                      class   = "form-control"
                      type    = "number" 
                      name    = "radius" 
                      min     = "0" 
                      step    = "1"
                      v-model = "constraints.circle.radius"
                    />
                  </label>
                  <select style = "max-width: 25%" class = "form-control" v-model = "constraints.circle.unit">
                    <option value = "1">m</option>
                    <option value = "1000">km</option>
                  </select> 
                </div>

                <hr v-if = "feature" style = "margin: 5px; 0 border:0;">

                <!-- SHAPE LABEL -->
                <div v-if = "feature" class = "form-group"> 
                  <input 
                    class   = "form-control" 
                    type    = "text" 
                    v-model = "text"
                  />
                </div>

                <!-- SHAPE LABEL (rotation) -->
                <div v-if = "feature && 'Text' === feature.get('type')">
                  <label for = "rotation">Rotation</label>
                  <input 
                    type    = "range" 
                    name    = "rotation" 
                    min     = "-180" 
                    step    = "1"
                    max     = "180" 
                    v-model = "style.rotation"
                  />
                </div>

                <!-- SHAPE COLOR -->
                <div v-if = "feature && 'Text' !== feature.get('type')" style = "margin-bottom: 10px;">
                  <color-picker
                    ref                 = "color_picker"
                    :value              = "picker_color"
                    @click.prevent.stop = ""
                    @hook:beforeDestroy = "() => $refs.color_picker.$off()"
                    @input              = "onChangeColor"
                    style               = "width: 100%"
                  />
                </div>

                <!-- SHAPE RADIUS (point) -->
                <div v-if = "feature && 'Point' === feature.get('type')">
                  <label for = "radius">Radius</label>
                  <input 
                    type    = "range" 
                    name    = "radius" 
                    min     = "3" 
                    step    = "1"
                    max     = "20" 
                    v-model = "style.radius"
                  />
                </div>

                <!-- SHAPE STROKE WIDTH -->
                <div v-if = "feature && ['LineString', 'Polygon', 'Rectangle', 'Circle'].includes(feature.get('type'))">
                  <label for = "stroke">Stroke</label>
                  <input 
                    type    = "range" 
                    name    = "stroke" 
                    min     = "0.5" 
                    step    = "0.5"
                    max     = "8" 
                    v-model = "style.width"
                  />
                </div>

                <!-- SHAPE OPACITY -->
                <div v-if = "feature && ['Polygon', 'Rectangle' , 'Circle'].includes(feature.get('type'))">
                  <label for = "opacity">Opacity</label>
                  <input 
                    type    = "range" 
                    name    = "opacity" 
                    min     = "0" 
                    step    = "0.05"
                    max     = "1" 
                    v-model = "style.opacity"
                  />
                </div>

                <!-- SHAPE INFO -->
                <div v-if="feature" style = "display: flex; justify-content: space-between;">
                  <label>
                    <input 
                      name    = "feature-text"
                      class   = "form-control" 
                      v-model = "show_text"
                      type    = "checkbox"
                    /> Show Text
                  </label>
                  <label :hidden = "'Text' !== feature.get('type')">
                    <input 
                      name    = "feature-info"
                      class   = "form-control" 
                      type    = "checkbox" 
                      v-model = "show_info"
                    /> Info
                  </label>
                </div>

              </div>`,
            computed: {
              picker_color() { 
                return this.style.color.split(',').reduce((a, c, i) => { a[ 0 === i ? 'r' : 1 === i ? 'g' : 'b'] = Number(c); return a; } ,{ r: null, g: null, b: null }) 
              },
            },  
            methods: {
              getShapeIconUrl(type){
                return `${window.initConfig.urls.clienturl}/images/${({
                  Point:      'mActionText',
                  LineString: 'mActionAddPolyline',
                  Polygon:    'mActionAddPolygon',
                  Circle:     'mActionAddBasicCircle',
                  Rectangle:  'mActionAddBasicRectangle',
                  Text:       'mActionTextAnnotation',
                })[type]}.svg`;
              },
              showAll() {
                this.type = null;
                this.feature.selected = false;
                this.feature = null;
                CONTROL._layer.changed();
              },
              onChangeColor(color) {
                this.style.color = `${color.rgba.r}, ${color.rgba.g}, ${color.rgba.b}`;
              },
              remove() {
                if (this.feature) {
                  CONTROL._layer.getSource().removeFeature(this.feature);
                } else {
                  CONTROL._layer.getSource().clear();
                }
                this.feature = null;
              },
              editFeature(id) {
                CONTROL.editFeature(CONTROL._layer.getSource().getFeatureById(id));
              },
              download() {
                ApplicationState.download = true;
                saveBlob(new Blob([new TextEncoder().encode(
                  JSON.stringify(
                    (new ol.format.GeoJSON()).writeFeaturesObject(
                      this.feature ? [this.feature] : CONTROL._layer.getSource().getFeatures(),
                      { dataProjection: GUI.getService('map').getEpsg(), featureProjection: GUI.getService('map').getEpsg()}
                    )
                  )
                )], { type: "application/json;charset=utf-8" }), 'annotation');
                ApplicationState.download = false;
              },
            },
            watch: {
              type(t) {
                CONTROL.changeType(t)
              },
              text(t)             { 
                this.feature.set('text', t);
                this.ids.find(({ id }) => this.feature.getId() === id).text = t;
                if (this.feature.get('show_text')) {
                  CONTROL._layer.changed();
                } 
              },
              show_text(b) {
                this.feature.set('show_text', b);
                CONTROL._layer.changed();
              },
              show_info(b) {
                this.feature.set('show_info', b);
                CONTROL._layer.changed();
              },
              style: {
                deep: true,
                handler(style) {
                  if (this.feature) {
                    this.feature.set('style', Object.assign(this.feature.get('style') || {}, {
                      color:    style.color,
                      width:    Number(style.width),
                      radius:   Number(style.radius),
                      opacity:  Number(style.opacity),
                      rotation: Number(style.rotation) * (Math.PI / 180)
                    }));
                  }
                  CONTROL._layer.changed();
                },
              },
              // Handle measure geometry
              constraints: {
                deep: true,
                handler(constraints) {
                  if (!CONTROL._interaction) {
                    return;
                  }
                  if (constraints.circle) {
                    CONTROL._interaction.radius = constraints.circle.radius * constraints.circle.unit;
                  }
                  if (constraints.line) {
                    CONTROL._interaction.length = constraints.line.length * constraints.line.unit;
                  }
                  if (constraints.rectangle) {
                    CONTROL._interaction.width  = constraints.rectangle.width;
                    CONTROL._interaction.height = constraints.rectangle.height;
                  }
                },
              },
            }, 
            created() {
              // layer has annotations
              if (CONTROL._layer.getSource().getFeatures().length > 0) {
                CONTROL.changeType();
              }
            },
            beforeDestroy() { 
              CONTROL.changeType();
              // unselect all features
              CONTROL._layer.getSource().getFeatures().forEach(f => f.selected = false);
              CONTROL._layer.changed();
            }
          }
        }
      });
    });
  }

  setMap(map) {
    super.setMap(map);
    map.addLayer(this._layer);
  }

  /**
   * @param feature current feature to be edited
   */
  editFeature(feature = null) {
    // a feature is selected 
    if (this._annotation.feature) {
      this._annotation.feature.selected = false;
      this._annotation.feature.changed();
    }

    // no feature = unselected
    if (!feature) {
      this._annotation.feature = null;
      return;
    };

    Object.assign(this._annotation, {
      feature,
      text:      feature.get('text'), 
      show_text: feature.get('show_text'),
      show_info: feature.get('show_info'),
    });

    this._annotation.style.color = feature.get('style').color;

    feature.selected = true;
    feature.changed();
  }

  /**
   * Change annotation type
   * 
   * @param { string } type 
   */
  changeType(type) {

    if (!type) {
      this.getMap().removeInteraction(this._interaction);
      this.getMap().removeInteraction(this._interactions.select);
      this.getMap().removeInteraction(this._interactions.modify);

      this._interactions.select.setActive(false);

      Object.assign(this._annotation, {
        constraints: {
          circle:    { ...DEFAULTS.circle },
          line:      { ...DEFAULTS.line },
          rectangle: { ...DEFAULTS.rectangle }
        },
        style: {
          color:    DEFAULTS.color,
          width:    DEFAULTS.width,
          radius:   DEFAULTS.radius,
          opacity:  DEFAULTS.opacity,
          rotation: DEFAULTS.rotation,
        },
        type:      null,
        feature:   null,
        text:      '',
        show_text: false,
        show_info: false,
      });
      return;
    }

    const interactions = this.getMap().getInteractions().getArray();

    if (!interactions.find(i => i == this._interactions.select)) {
      this.getMap().addInteraction(this._interactions.select);
      this._interactions.select.setActive(true);
    }

    if (!interactions.find(i => i == this._interactions.modify)) {
      this.getMap().addInteraction(this._interactions.modify);
    }

    if (this._interaction) {
      this.getMap().removeInteraction(this._interaction);
      this._interaction = null;
    }  

    if (this._measureTooltip) {
      this._measureTooltip.remove()
      this._measureTooltip = null;
    }

    if ('Rectangle' === type) {
      this._interaction = new ol.interaction.DragBox();
      this._interaction.on('boxstart', this.#onBoxStart.bind(this));
      this._interaction.on('boxdrag', this.#onBoxDrag.bind(this));
      this._interaction.on('boxend', this.#onBoxEnd.bind(this));
    }

    if (['Point', 'LineString', 'Polygon', 'Circle', 'Text'].includes(type)) {
      this._interaction = new ol.interaction.Draw({
        type:             'Text' === type ? 'Point': type,
        source:           this._layer.getSource(),
        geometryFunction: 'Point' !== type && this.#onDrawGeometry.bind(this),
        style:            this.#onDrawStyle.bind(this),
        finishCondition:  this.#onDrawFinish.bind(this)
      });
      this._interaction.on('drawstart', this.#onDrawStart.bind(this));
      this._interaction.on('drawend', this.#onDrawEnd.bind(this));
    }

    if (this._interaction && this._annotation.feature) {
      this._annotation.feature.selected = false;
      this._annotation.feature          = null;
      this._layer.changed();
    }

    if (this._interaction) {
      this._interaction.setActive(true);
      this.getMap().addInteraction(this._interaction);
    }
  }

  #onAddFeature({ feature }) { 
    // clear eventually selected feature
    this._interactions.select.getFeatures().clear();

    // set id and default properties values of new feature
    feature.setId(DEFAULTS.fid); 
    feature.set('text', `${this._annotation.type} ${DEFAULTS.fid++}`); 
    feature.set('show_text', false);
    feature.set('info', '');
    feature.set('show_info', false);
    feature.set('type', this._annotation.type);

    if ('Circle' === this._annotation.type) {
      feature.set('radius', feature.getGeometry().getRadius());
      feature.set('center', feature.getGeometry().getCenter());
    }

    feature.setStyle(this.#style(this._annotation.type));
    
    Object.assign(this._annotation.style, {
      color:    DEFAULTS.color,
      radius:   DEFAULTS.radius,
      width:    DEFAULTS.width,
      opacity:  DEFAULTS.opacity,
      rotation: DEFAULTS.rotation,
    });

    this._annotation.show_text      = 'Text' === this._annotation.type;
    this._annotation.show_info      = false;

    feature.selected          = true;

    feature.set('style', Object.assign(feature.get('style') || {}, this._annotation.style));
    
    Object.assign(this._annotation, {
      feature,                   // current feature
      text: feature.get('text'), // current text (for input value)
      type: null,                // stop to draw. Reset type
    });

    this._annotation.ids.push({ id: DEFAULTS.fid, text: feature.get('text') }); // Add feature to features list
    this._interactions.select.getFeatures().push(feature);                      // add current feature to selection to modify it

  }

  #onRemoveFeature({ feature }) {
    this._annotation.ids = this._annotation.ids.filter(({ id }) => id !== feature.getId() )
  }

  #onSelectInteraction(e) {
    this.editFeature(e.selected[0]);
  }

  #onDrag(e) {
    this._annotation.feature.set('endCoordinates', e.coordinate);

    // get current feature in modify
    const geom = 'Rectangle' === this._annotation.feature.get('type') && this._annotation.feature.get('modifyGeometry');
    const coords = geom && this._annotation.feature.getGeometry().getCoordinates()[0];

    /**
     * (1)---(2)
     *  |     | 
     *  |     |
     * (0)---(3)
     */
    if (geom && coords) {
      let [c0, c1, c2, c3] = coords;
      switch(coords.findIndex(c => e.coordinate[0] === c[0] && e.coordinate[1] === c[1])) {
        case 0:
          c1 = [e.coordinate[0], c1[1]];
          c3 = [c3[0], e.coordinate[1]];
          break;
        case 1:
          c0 = [e.coordinate[0], c0[1]];
          c2 = [c2[0], e.coordinate[1]];
          break;
        case 2:
          c1 = [c1[0], e.coordinate[1]];
          c3 = [e.coordinate[0], c3[1]];
          break;
        case 3:  
          c0 = [c0[0], e.coordinate[1]];
          c2 = [e.coordinate[0], c2[1]];
          break;
      }
      geom.geometry.setCoordinates([[c0, c1, c2, c3, c0]]);
    }
   
    // redraw layer only if feature has show_info to true
    if (this._annotation.feature.get('show_info')) {
      this._layer.changed();
    }
  }

  /**
   * Handle modify start (eg. for rectangles)
   */
  #onModifyStart(e) {
    if ('Rectangle' === this._annotation.feature.get('type')) {
      this._annotation.feature.set(
        'modifyGeometry',
        { geometry: this._annotation.feature.getGeometry().clone() },
        true,
      );
    }
  }

  /**
   * Handle modify end (eg. for rectangles) 
   */
  #onModifyEnd(e) {
    if ('Rectangle' === this._annotation.feature.get('type')) {
      const geom = this._annotation.feature.get('modifyGeometry');
      if (geom) {
        this._annotation.feature.setGeometry(geom.geometry);
        this._annotation.feature.unset('modifyGeometry', true);
      }
    }
    if ('Circle' === this._annotation.feature.get('type')) {
      feature.set('radius', this._annotation.feature.getGeometry().getRadius());
      feature.set('center', this._annotation.feature.getGeometry().getCenter());
    }
  }

  #onDrawStart(e) {
    if (['LineString', 'Polygon', 'Circle'].includes(this._annotation.type)) {
      this._measureTooltip = createMeasureTooltip({ map: this._interaction.getMap(), feature: e.feature });
    }

    if (['LineString', 'Polygon'].includes(this._annotation.type) && Number(this._annotation.constraints.line.length) > 0) {
      this._interaction.length = Number(this._annotation.constraints.line.length) * this._annotation.constraints.line.unit;
    }

    if ('Circle' === this._annotation.type && Number(this._annotation.constraints.circle.radius) > 0) {
      this._interaction.radius = Number(this._annotation.constraints.circle.radius) * this._annotation.constraints.circle.unit;
      e.feature.getGeometry().setRadius(this._interaction.radius);
    }

    //set geometry of draw feature
    this._interaction.geometry = e.feature.getGeometry();
  }

  #onDrawEnd(e) {
    if ('Circle' === this._annotation.type) {
      e.feature.set('endCoordinates', e.feature.getGeometry().getClosestPoint(this._interaction._endCoordinates));
    }

    Object.assign(this._interaction, {
      radius:   null,
      length:   null,
      geometry: null,
    })
  }

  /**
   * @param { Array } coords
   * @param {*} geometry 
   */
  #onDrawGeometry(coords, geometry) {

    // Circle → coords[0] = circle center, coords[1] = mouse position 
    if ('Circle' === this._annotation.type) {
      geometry = geometry || new ol.geom.Circle(0, 0);
      geometry.setCenterAndRadius(
        coords.at(0),
        this._interaction.radius || Math.sqrt((coords.at(0)[0] - coords.at(-1)[0]) ** 2 + (coords.at(0)[1] - coords.at(-1)[1])** 2)
      );
    }

    // Linestring → coords = line vertex
    if ('LineString' === this._annotation.type) {
      geometry = geometry || new ol.geom.LineString([]);
      if (this._interaction.length) {
        coords.push(
          ...(this._interaction.length ? this.#updateLength(coords.splice(-2), this._interaction.length) : []
        ));
      } 
      geometry.setCoordinates(coords);
    }

    if ('Polygon' === this._annotation.type) {
      geometry = geometry || new ol.geom.Polygon([]);
      if (this._interaction.length) {
        const segment = coords[0].splice(-2);
        coords[0].push(...this.#updateLength(segment, this._interaction.length));
        coords = [coords[0]];
      }
      geometry.setCoordinates([[...coords[0], coords[0][0]]]);
      this._interaction.geometry = geometry;
    }

    return geometry;
  }

  #onDrawStyle(feature, resolution) {

    if ('Circle' === this._annotation.type && 'Point' === feature.getGeometry().getType() && !this._interaction.geometry) {
      this._interaction._endCoordinates = feature.getGeometry().getCoordinates()
    }

    if ('Circle' === this._annotation.type && 'Point' === feature.getGeometry().getType() && this._interaction.geometry) {
      this._interaction._endCoordinates = this._interaction.geometry.getClosestPoint(feature.getGeometry().getCoordinates());
      feature.getGeometry().setCoordinates(this._interaction._endCoordinates);
    }

    if ('Circle' === this._annotation.type && 'Circle' === feature.getGeometry().getType()) {
      this._interaction._endCoordinates = feature.getGeometry().getClosestPoint(this._interaction._endCoordinates);
      feature.set('endCoordinates', this._interaction._endCoordinates);
      return this.#style(this._annotation.type)(feature)
    }

    if ('LineString' === this._annotation.type && this._interaction.length && 'Point' === feature.getGeometry().getType() && this._interaction.geometry) {
      feature.getGeometry().setCoordinates(this._interaction.geometry.getLastCoordinate())
    }

    if ('Polygon' === this._annotation.type && this._interaction.length && 'Point' === feature.getGeometry().getType() && this._interaction.geometry) {
      feature.getGeometry().setCoordinates(this._interaction.geometry.getCoordinates()[0][this._interaction.geometry.getCoordinates()[0].length - 2])
    }

    if ('Polygon' === this._annotation.type && this._interaction.length && 'LineString' === feature.getGeometry().getType()) {
      feature.getGeometry().setCoordinates(this._interaction.geometry.getCoordinates()[0].slice(0, -1));
    }

    if ('Polygon' === this._annotation.type && this._interaction.length && 'Polygon' === feature.getGeometry().getType()) {
      feature.getGeometry().setCoordinates(this._interaction.geometry.getCoordinates());
    }

    // fallback to default style function
    return (new ol.interaction.Draw({ type: 'Text' === this._annotation.type ? 'Point': this._annotation.type })).getOverlay().getStyleFunction()(feature, resolution);
  }

  #onDrawFinish(e) {
    this._interaction._endCoordinates = e.coordinate;
    return true;
  }

  #onBoxStart({ coordinate }) {
    this._interaction._startC = coordinate;
  }

  #onBoxDrag(e) {
    this.width  = Number(this._annotation.constraints.rectangle.width);
    this.height = Number(this._annotation.constraints.rectangle.height);
    if (this.width > 0 && this.height > 0) {
      this.width  = this.width  * this._annotation.constraints.rectangle.wunit;
      this.height = this.height * this._annotation.constraints.rectangle.hunit;
      this._interaction.endC = [this._interaction._startC[0] + (this._interaction._startC[0] > e.coordinate[0] ?  -1 : 1) * this.width, this._interaction._startC[1] + (this._interaction._startC[1] > e.coordinate[1] ? -1 : 1)* this.height];
      //Draw box with set dimension (width, height)
      this._interaction.box_.setPixels(this.getMap().getPixelFromCoordinate(this._interaction._startC), this.getMap().getPixelFromCoordinate(this._interaction.endC));
    }
  }

  #onBoxEnd({ coordinate }) {
    this._layer.getSource().addFeature(new ol.Feature(ol.geom.Polygon.fromExtent(ol.extent.boundingExtent([this._interaction._startC, this._interaction.endC || coordinate]))));
    this._annotation.constraints.rectangle.width = this._annotation.constraints.rectangle.height = 0;
    this._annotation.constraints.rectangle.wunit = this._annotation.constraints.rectangle.hunit  = 1;
  }

  /**
   * Handle/Fix lenght segments (LineString or Polygon)
   */
  #updateLength(coords, length) {
    if (areCoordinatesEqual(coords[0], coords[1])) {
      return coords;
    }
    
    //get first coordinate (start)
    let curr = [coords[0]];
    const segments  = [coords[0]];
    for (let i = 1; i < coords.length; i++) {
      const ratio = (length - ol.sphere.getLength(new ol.geom.LineString(curr))) / (ol.sphere.getLength(new ol.geom.LineString([...curr, coords[i]])) - ol.sphere.getLength(new ol.geom.LineString(curr)));
      const newCoord = [
        curr[0][0] + ratio * (coords[i][0] - curr[0][0]),
        curr[0][1] + ratio * (coords[i][1] - curr[0][1])
      ];
      segments.push(newCoord);
      curr = [newCoord];
    }
    return segments;
  }

  /**
   * @param { 'Point' | 'LineString' | 'Polygon' | 'Rectangle' | 'Circle' | 'Text' } type 
   * 
   * @returns an appropriate styling (open layers) for the provided shape type
   */
  #style(type) {

    const fill   = new ol.style.Fill({ color : '#000' });
    const stroke = new ol.style.Stroke({ color: '#FFF', width: 3 });
    const font   = '15px Titillium Web';
    const image  = new ol.style.Circle({ radius: 5, stroke: new ol.style.Stroke({ color: '#000', width: 3 }) });

    const parse_length = len  => len > 100 ? (Math.round((len / 1000) * 100) / 100) +  ' km' : (Math.round(len * 100) / 100) + ' m';
    const parse_area   = area => area > 10000 ? (Math.round((area / 1000000) * 100) / 100) +  ' km²' : (Math.round(area * 100) / 100) + ' m²';

    if ('Text' === type) {
      return feat => new ol.style.Style({  
        text: new ol.style.Text({
          text:      feat.get('text'),
          rotation:  feat.get('style')?.rotation,
          fill,
          font,
          placement: 'point',
          stroke: new ol.style.Stroke({ color: '#FFF', width: 8 }),
        }),
      });
    }

    if ('Point' === type) {
      return feat => new ol.style.Style({
        text: new ol.style.Text({
          placement: 'point',
          text:      `${feat.get('show_info') && `${`${feat.getGeometry().getCoordinates()}`} \n` || ''}${feat.get('show_text') && feat.get('text') || ''}`,
          fill,
          font,
          stroke,
        }),
        image: new ol.style.Circle({
          fill:   new ol.style.Fill({ color: `rgb(${feat.get('style')?.color})` }),
          radius: feat.get('style')?.radius,
        }),
      })
    }

    if ('LineString' === type) {
      return feat => [
        feat.selected && new ol.style.Style({
          stroke: new ol.style.Stroke({ width: feat.get('style')?.width + 3, color: `#FFF` })
        }),
        new ol.style.Style({
          text: new ol.style.Text({
            placement: 'point',
            text:      `${feat.get('show_info') && (parse_length(feat.getGeometry().getLength()) + '\n') || ''}${feat.get('show_text') && feat.get('text') || ''}`,
            fill,
            font,
            stroke,
          }),
          stroke: new ol.style.Stroke({ width: feat.get('style')?.width, color: `rgb(${feat.get('style')?.color})` }),
        }),
        feat.selected && new ol.style.Style({ image, geometry: f => new ol.geom.MultiPoint(f.getGeometry().getCoordinates()) })
      ].filter(Boolean);
    }

    if ('Polygon' === type) {
      return feat => [
        feat.selected && new ol.style.Style({
          stroke: new ol.style.Stroke({ width: feat.get('style')?.width + 3, color: '#FFF' }),
        }),
        new ol.style.Style({
          text: new ol.style.Text({
            placement: 'point',
            text:      `${feat.get('show_info') && (parse_area(feat.getGeometry().getArea()) + '\n') || ''}${feat.get('show_text') && feat.get('text') || ''}`,
            fill,
            font,
            stroke,
          }),
          stroke: new ol.style.Stroke({ width: feat.get('style')?.width, color: `rgb(${feat.get('style')?.color})` }),
          fill:   new ol.style.Fill({ color: `rgba(${feat.get('style')?.color}, ${feat.get('style')?.opacity})` })
        }),
        feat.selected && new ol.style.Style({ image, geometry: f => new ol.geom.MultiPoint(f.getGeometry().getCoordinates()[0]) })
      ].filter(Boolean);
    }

    if ('Rectangle' === type) {
      return feat => [
        feat.selected && new ol.style.Style({
          stroke:   new ol.style.Stroke({ width: feat.get('style')?.width + 3, color: '#FFF' }),
          geometry: () => feat.get('modifyGeometry')?.geometry || feat.getGeometry(),
        }),
        new ol.style.Style({
          text: new ol.style.Text({
            placement: 'point',
            text:      `${feat.get('show_info') && (parse_area(feat.getGeometry().getArea()) + '\n') || ''}${feat.get('show_text') && feat.get('text') || ''}`,
            fill,
            font,
            stroke,
          }),
          stroke:   new ol.style.Stroke({ width: feat.get('style')?.width, color: `rgb(${feat.get('style')?.color})` }),
          fill:     new ol.style.Fill({ color: `rgba(${feat.get('style')?.color}, ${feat.get('style')?.opacity})` }),
          geometry: () => feat.get('modifyGeometry')?.geometry || feat.getGeometry()
        }),
        feat.selected && new ol.style.Style({ image, geometry: () => new ol.geom.MultiPoint((feat.get('modifyGeometry')?.geometry || feat.getGeometry()).getCoordinates()[0]) })
      ].filter(Boolean)
    }

    if ('Circle' === type) {
      return feat => [
        // stroke selection
        feat.selected && new ol.style.Style({
          stroke: new ol.style.Stroke({ width: (feat.get('style')?.width || DEFAULTS.width) + 3, color: '#FFF' }),
        }),
        // circle style
        new ol.style.Style({
          text:   new ol.style.Text({
            placement: 'point',
            text:      feat.get('show_text') && feat.get('text') || '',
            fill,
            font,
            stroke,
          }),
          stroke: new ol.style.Stroke({ width: feat.get('style')?.width || DEFAULTS.width, color: `rgb(${feat.get('style')?.color || '3, 169, 244'})` }),
          fill:   new ol.style.Fill({ color: `rgba(${feat.get('style')?.color || '255, 255, 255'}, ${feat.get('style')?.opacity ?? 0.5})` })
        }),
        feat.selected && feat.get('show_info') && new ol.style.Style({
          stroke:   new ol.style.Stroke({ color: '#FFFFFF', width: 6 }), 
          geometry: f => new ol.geom.LineString([f.getGeometry().getCenter(), feat.get('endCoordinates')]) 
        }),
        new ol.style.Style({
          text:   new ol.style.Text({
            placement: 'line',
            text: `${feat.get('show_info')
              ? `${feat.getGeometry().getRadius() > 100 
                ? (Math.round((feat.getGeometry().getRadius() / 1000) * 100) / 100) +  ' km' 
                : (Math.round(feat.getGeometry().getRadius() * 100) / 100) + ' m'} \n` 
              : ''
            }`,
            fill,
            font,
            stroke,
          }),
          ...(feat.get('show_info') || undefined === feat.get('show_info') 
            ? {
                stroke:   new ol.style.Stroke({ color: `rgb(${feat.get('style')?.color || '3, 169, 244'})`, width: 3 }), 
                geometry: f => new ol.geom.LineString([f.getGeometry().getCenter(), feat.get('endCoordinates')]) 
              } 
            : {}
          )          
        }),
        new ol.style.Style({
          text:   new ol.style.Text({
            placement: 'point',
            offsetX:   20,
            text:      `${feat.get('show_info') && `${parseInt(Math.atan2(feat.getGeometry().getCenter()[0] - feat.get('endCoordinates')[0], feat.getGeometry().getCenter()[1] - feat.get('endCoordinates')[1]) * 180 / Math.PI)}°` || ''}`,
            fill,
            font,
            stroke,
          }),
          geometry: () => new ol.geom.Point(feat.get('endCoordinates'))
        }),
      ].filter(Boolean);
    }

  }


}