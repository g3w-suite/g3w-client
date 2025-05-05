/**
 * @file
 * @since 4.0.0
 */

import ApplicationState           from 'store/application';
import GUI                        from 'services/gui';
import InteractionControl         from 'map/controls/interactioncontrol';
import { saveBlob }               from 'utils/saveBlob';
import { createMeasureTooltip }   from 'utils/createMeasureTooltip';
import { areCoordinatesEqual }    from 'utils/areCoordinatesEqual';

const DEFAULTS = {
  /** Incremental number to unique identify id feature */
  fid:       1,
  color:     'rgb(244, 78, 59)',
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
      tipLabel:  "sdk.mapcontrols.annotation.title",
      clickmap: true,
      enabled:  true,
    });

    /** Annotation data */
    this._annotation = {
      layer:        new ol.layer.Vector({ source: new ol.source.Vector() }),
      type:         null,
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

    // load saved annotations from local storage (TODO: load it from server config?)
    const features = (new ol.format.GeoJSON({
      dataProjection:    GUI.getService('map').getEpsg(),
      featureProjection: GUI.getService('map').getEpsg()
    })).readFeatures((localStorage.getItem('annotations') ? JSON.parse(localStorage.getItem('annotations')) : opts.annotations) || { type: "FeatureCollection", features: [] });

    // set styles
    features.forEach(f => {
      if ('Circle' === f.get('type')) {
        f.setGeometry(new ol.geom.Circle(f.get('center'), Number(f.get('radius'))));
      }
      DEFAULTS.fid = Math.max(DEFAULTS.fid, f.getId()) + 1; // increment counter from added feautures
      f.setStyle(this.#style(f.get('type')));
    });

    // add features
    this._annotation.layer.getSource().addFeatures(features)
    this._annotation.layer.getSource().on('addfeature', this.#onAddFeature.bind(this));
    // this._annotation.layer.getSource().on('removefeature', this.#onRemoveFeature.bind(this));

    // update local storage
    this._annotation.layer.on('change', () => {
      localStorage.setItem('annotations', JSON.stringify((new ol.format.GeoJSON()).writeFeaturesObject(
        this._annotation.layer.getSource().getFeatures(),
        { dataProjection: GUI.getService('map').getEpsg(), featureProjection: GUI.getService('map').getEpsg() }
      )));
    });
    
    this._interactions.select = new ol.interaction.Select({
      layers: [this._annotation.layer],
      style:  feature => this.#style(feature.get('type'))(feature)
    });
    
    this._interactions.modify = new ol.interaction.Modify({
      features:              this._interactions.select.getFeatures(),
      insertVertexCondition: () => this._annotation.feature && 'Rectangle' !== this._annotation.feature.get('type'),
    });

    // monkey patch: "ol.interaction.Modify~handleDragEvent"
    this._interactions.modify.handleDragEvent = new Proxy(this._interactions.modify.handleDragEvent, {
      apply: (cb, ctx, args) => { Reflect.apply(cb, ctx, args); return this.#onDrag(...args); },
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
                    @click.stop               = "type = type === shape ? null : shape"
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
                <div v-if = "feature || (!type && features.length > 0)" style="display: flex; justify-content: flex-end; gap: 5px; font-size: 1.2em; border-bottom: 1px solid #eee; border-top: 1px solid #eee; padding: 10px 0; margin: 10px 0;">
                  <button :class = "$fa('list')"     @click.stop = "showAll"  style = "background:none; border: none;"             v-t-tooltip:bottom.create = "'Show all'" :hidden = "!feature || !features.length"></button>
                  <button :class = "$fa('download')" @click.stop = "download" style = "background:none; border: none;"             v-t-tooltip:bottom.create = "'Download'"></button>
                  <button :class = "$fa('trash')"    @click.stop = "remove"   style = "background:none; border: none; color: red;" v-t-tooltip:bottom.create = "'Remove'"></button>
                </div>

                <!-- SHAPES SAVED -->
                <div v-if   = "!feature && !type && features.length > 0">
                  <button 
                    v-for  = "feat in features"
                    :key   = "feat.getId()" 
                    @click = "editFeature(feat)"
                    style  = "width: 100%; margin: 3px; border: solid 1px #ccc"
                  >{{ feat.get('text') }}</button>
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

                <!-- SHAPE LABEL -->
                <input
                  v-if    = "feature" 
                  class   = "form-control" 
                  type    = "text" 
                  v-model = "text"
                  style   = "display: block; margin: 5px; 0 border:0;"
                />

                <!-- SHAPE LABEL (rotation) -->
                <label v-if = "feature && 'Text' === feature.get('type')" style = "display: block;">
                  Rotation
                  <input 
                    type    = "range" 
                    name    = "rotation" 
                    min     = "-180" 
                    step    = "1"
                    max     = "180" 
                    v-model = "style.rotation"
                  />
                </label>

                <!-- SHAPE COLOR -->
                <div
                  v-if  = "feature && 'Text' !== feature.get('type')"
                  style = "display: flex; justify-content: space-between; flex-flow: wrap; margin-bottom: 10px; gap: 5px; justify-content: center;"
                >
                  <input
                    v-for                     = "color in [
                      'rgb(77, 77, 77)', 'rgb(153, 153, 153)', 'rgb(255, 255, 255)', 'rgb(244, 78, 59)', 'rgb(254, 146, 0)', 'rgb(252, 220, 0)', 'rgb(219, 223, 0)', 'rgb(164, 221, 0)', 'rgb(104, 204, 202)', 'rgb(115, 216, 255)', 'rgb(174, 161, 255)', 'rgb(253, 161, 255)',
                      'rgb(51, 51, 51)', 'rgb(128, 128, 128)', 'rgb(204, 204, 204)', 'rgb(211, 49, 21)', 'rgb(226, 115, 0)', 'rgb(252, 196, 0)', 'rgb(176, 188, 0)', 'rgb(104, 188, 0)', 'rgb(22, 165, 165)',  'rgb(0, 156, 224)',   'rgb(123, 100, 255)', 'rgb(250, 40, 255)',
                      'rgb(0, 0, 0)',    'rgb(102, 102, 102)', 'rgb(179, 179, 179)', 'rgb(159, 5, 0)',   'rgb(196, 81, 0)',  'rgb(251, 158, 0)', 'rgb(128, 137, 0)', 'rgb(25, 77, 51)',  'rgb(12, 121, 125)',  'rgb(0, 98, 177)',    'rgb(101, 50, 148)',  'rgb(171, 20, 158)',
                    ]"
                    v-t-tooltip:bottom.create = "color"
                    type                      = "radio"
                    :value                    = "color"
                    v-model                   = "style.color"
                    :style                    = "{
                      appearance: 'none',
                      display:    'inline-block',
                      width:      '20px',
                      height:     '20px',
                      border:     style.color == color ? 'solid' : '1px solid #ccc',
                      cursor:     'pointer',
                      background: color,
                    }"
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
                  <label :hidden = "'Text' === feature.get('type')">
                    <input 
                      name    = "feature-text"
                      type    = "checkbox"
                      v-model = "show_text"
                      style   = "width: 1.25em; aspect-ratio: 1; vertical-align: sub; accent-color: var(--skin-color);"
                    /> Show Text
                  </label>
                  <label :hidden = "'Text' === feature.get('type')">
                    <input 
                      name    = "feature-info"
                      type    = "checkbox" 
                      v-model = "show_info"
                      style   = "width: 1.25em; aspect-ratio: 1; vertical-align: sub; accent-color: var(--skin-color);"
                    /> Info
                  </label>
                </div>

              </div>`,
            computed: {
              /** get only saved features related to current PID */
              features() {
                return this.layer.getSource().getFeatures().filter(f => [undefined, ApplicationState.project.getId()].includes(f.get('pid')));
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
                this.type             = null;
                this.feature.selected = false;
                this.feature          = null;
                this.layer.changed();
              },
              remove() {
                if (this.feature) {
                  this.layer.getSource().removeFeature(this.feature);
                } else {
                  this.layer.getSource().clear();
                }
                this.feature = null;
              },
              editFeature(feat) {
                CONTROL.editFeature(feat);
              },
              download() {
                ApplicationState.download = true;
                saveBlob(new Blob([new TextEncoder().encode(
                  JSON.stringify(
                    (new ol.format.GeoJSON()).writeFeaturesObject(
                      this.feature ? [this.feature] : this.layer.getSource().getFeatures(),
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
              text(t) { 
                //@TODO Check why if showAll, also text
                if (this.feature) {
                  this.feature.set('text', t);
                }
                this.layer.changed();
              },
              show_text(b) {
                if (this.feature) {
                  this.feature.set('show_text', b);
                }
                this.layer.changed();
              },
              show_info(b) {
                if (this.feature) {
                  this.feature.set('show_info', b);
                }
                this.layer.changed();
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
                  this.layer.changed();
                },
              },
              // Handle measure geometry
              constraints: {
                deep: true,
                handler(constraints) {
                  if (!CONTROL.getInteraction()) {
                    return;
                  }
                  if (constraints.circle) {
                    CONTROL.getInteraction().radius = constraints.circle.radius * constraints.circle.unit;
                  }
                  if (constraints.line) {
                    CONTROL.getInteraction().length = constraints.line.length * constraints.line.unit;
                  }
                  if (constraints.rectangle) {
                    CONTROL.getInteraction().width  = constraints.rectangle.width;
                    CONTROL.getInteraction().height = constraints.rectangle.height;
                  }
                },
              },
            }, 
            created() {
              // layer has annotations
              if (this.layer.getSource().getFeatures().length > 0) {
                CONTROL.changeType();
              }
              CONTROL.getMap().addInteraction(CONTROL._interactions.select);
              CONTROL.getMap().addInteraction(CONTROL._interactions.modify);
              CONTROL._interactions.select.setActive(true);
            },
            beforeDestroy() { 
              CONTROL.changeType();
              CONTROL.getMap().removeInteraction(CONTROL._interactions.select);
              CONTROL.getMap().removeInteraction(CONTROL._interactions.modify);
              // unselect all features
              this.layer.getSource().getFeatures().forEach(f => f.selected = false);
              this.layer.changed();
            }
          }
        }
      });
    });
  }

  setMap(map) {
    super.setMap(map);
    map.addLayer(this._annotation.layer);
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
      //set type null to show list
      this._annotation.type    = null;
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

      this._interactions.select.setActive(true);

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

    this._interactions.select.setActive(false);

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
    }

    if (['Point', 'LineString', 'Polygon', 'Circle', 'Text'].includes(type)) {
      this._interaction = new ol.interaction.Draw({
        type:             'Text' === type ? 'Point': type,
        source:           this._annotation.layer.getSource(),
        geometryFunction: !['Point', 'Text'].includes(type) && this.#onDrawGeometry.bind(this),
        style:            this.#onDrawStyle.bind(this),
        finishCondition:  this.#onDrawFinish.bind(this)
      });
    }

    this._interaction.on('boxstart',  this.#onBoxStart.bind(this));
    this._interaction.on('boxdrag',   this.#onBoxDrag.bind(this));
    this._interaction.on('boxend',    this.#onBoxEnd.bind(this));
    this._interaction.on('drawstart', this.#onDrawStart.bind(this));
    this._interaction.on('drawend',   this.#onDrawEnd.bind(this));

    if (this._interaction && this._annotation.feature) {
      this._annotation.feature.selected = false;
      this._annotation.feature          = null;
      this._annotation.layer.changed();
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
    feature.set('pid', ApplicationState.project.getId());
    feature.set('text', `${this._annotation.type} ${DEFAULTS.fid}`); 
    feature.set('show_text', 'Text' === this._annotation.type);
    feature.set('info', '');
    feature.set('show_info', false);
    feature.set('type', this._annotation.type);

    if ('Circle' === this._annotation.type) {
      feature.set('radius', feature.getGeometry().getRadius());
      feature.set('center', feature.getGeometry().getCenter());
    }

    // set default style
    Object.assign(this._annotation.style, {
      color:    DEFAULTS.color,
      radius:   DEFAULTS.radius,
      width:    DEFAULTS.width,
      opacity:  DEFAULTS.opacity,
      rotation: DEFAULTS.rotation,
    });

    //set style property of feature
    feature.set('style', Object.assign(feature.get('style') || {}, this._annotation.style));

    //set feature style
    feature.setStyle(this.#style(this._annotation.type));

    this._annotation.show_text      = 'Text' === this._annotation.type;
    this._annotation.show_info      = false;

    //selected feature
    feature.selected                = true;

    Object.assign(this._annotation, {
      feature,                   // current feature
      text: feature.get('text'), // current text (for input value)
    });

    this._interactions.select.getFeatures().push(feature); // add current feature to selection to modify it

    //set current annotation feature
    this._annotation.feature = feature;

    //Reomve create feature interaction
    this.getMap().removeInteraction(this._interaction);

    //set active interaction
    this._interactions.select.setActive(true);

    //Increment fid
    DEFAULTS.fid++;
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
      this._annotation.layer.changed();
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
      this._annotation.feature.set('radius', this._annotation.feature.getGeometry().getRadius());
      this._annotation.feature.set('center', this._annotation.feature.getGeometry().getCenter());
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
      e.feature.set('endCoordinates', e.feature.getGeometry().getClosestPoint(this._annotation.endCoordinates));
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
      this._annotation.endCoordinates = feature.getGeometry().getCoordinates()
    }

    if ('Circle' === this._annotation.type && 'Point' === feature.getGeometry().getType() && this._interaction.geometry) {
      this._annotation.endCoordinates = this._interaction.geometry.getClosestPoint(feature.getGeometry().getCoordinates());
      feature.getGeometry().setCoordinates(this._annotation.endCoordinates);
    }

    if ('Circle' === this._annotation.type && 'Circle' === feature.getGeometry().getType()) {
      this._annotation.endCoordinates = feature.getGeometry().getClosestPoint(this._annotation.endCoordinates);
      feature.set('endCoordinates', this._annotation.endCoordinates);
      return this.#style(this._annotation.type)(feature)
    }

    if ('LineString' === this._annotation.type && this._interaction.length && 'Point' === feature.getGeometry().getType() && this._interaction.geometry) {
      feature.getGeometry().setCoordinates(this._interaction.geometry.getCoordinates()[0].at(-1))
    }

    if ('Polygon' === this._annotation.type && this._interaction.length && 'Point' === feature.getGeometry().getType() && this._interaction.geometry) {
      feature.getGeometry().setCoordinates(this._interaction.geometry.getCoordinates()[0].at(-2))
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
    this._annotation.endCoordinates = e.coordinate;
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
    this._annotation.layer.getSource().addFeature(new ol.Feature(ol.geom.Polygon.fromExtent(ol.extent.boundingExtent([this._interaction._startC, this._interaction.endC || coordinate]))));
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
          fill:   new ol.style.Fill({ color: feat.get('style')?.color }),
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
          stroke: new ol.style.Stroke({ width: feat.get('style')?.width, color: feat.get('style')?.color }),
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
          stroke: new ol.style.Stroke({ width: feat.get('style')?.width, color: feat.get('style')?.color }),
          fill:   new ol.style.Fill({ color: `rgba(${feat.get('style')?.color?.replace?.(/rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/g, '$1, $2, $3')}, ${feat.get('style')?.opacity})` })
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
          stroke:   new ol.style.Stroke({ width: feat.get('style')?.width, color: feat.get('style')?.color }),
          fill:     new ol.style.Fill({ color: `rgba(${feat.get('style')?.color?.replace?.(/rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/g, '$1, $2, $3')}, ${feat.get('style')?.opacity})` }),
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
          stroke: new ol.style.Stroke({ width: feat.get('style')?.width || DEFAULTS.width, color: feat.get('style')?.color || 'rgb(3, 169, 244)' }),
          fill:   new ol.style.Fill({ color: `rgba(${feat.get('style')?.color?.replace?.(/rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/g, '$1, $2, $3') || '255, 255, 255'}, ${feat.get('style')?.opacity ?? 0.5})` })
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
                stroke:   new ol.style.Stroke({ color: feat.get('style')?.color || 'rgb(3, 169, 244)', width: 3 }), 
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