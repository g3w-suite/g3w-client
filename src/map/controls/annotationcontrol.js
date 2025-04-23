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
import { removeMeasureTooltip }   from 'utils/removeMeasureTooltip';
import { areCoordinatesEqual }    from 'utils/areCoordinatesEqual';

const DEFAULTS = {
  /** Incremental number to unique identify id feature */
  FID:       1,
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

    //Passing layer or create a new one
    this._layer = new ol.layer.Vector({ source: new ol.source.Vector() });

    // map projection
    const projection = GUI.getService('map').getEpsg();

    //Add features if passed
    const features = opts.annotations 
      ? (new ol.format.GeoJSON({ dataProjection: projection, featureProjection: projection })).readFeatures(opts.annotations) 
      : [];

    // set styles
    features.forEach(f => {
      if ('Circle' === f.get('type')) {
        f.setGeometry(new ol.geom.Circle(f.get('center'), Number(f.get('radius'))));
      }
      DEFAULTS.FID = Math.max(DEFAULTS.FID, f.getId()) + 1; // increment counter from added feautures
      f.setStyle(get_style(f.get('type')));
    });

    // add features
    this._layer.getSource().addFeatures(features)
    this._layer.getSource().on('addfeature', this.#onAddFeature.bind(this));
    this._layer.getSource().on('removefeature', this.#onRemoveFeature.bind(this));

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
    
    this._interactions.select = new ol.interaction.Select({
      layers: [this._layer],
      style:  feature => get_style(feature.get('type'))(feature)
    });
    
    this._interactions.modify = new ol.interaction.Modify({
      features:              this._interactions.select.getFeatures(),
      insertVertexCondition: () => this._annotation.feature && 'Rectangle' !== this._annotation.feature.get('type'),
    });

    this._interactions.select.on('select', this.#onSelectInteraction.bind(this));

    // monkey patch: "ol.interaction.Modify~handleDragEvent"
    this._interactions.modify._handleDragEvent = this._interactions.modify.handleDragEvent;
    this._interactions.modify.handleDragEvent = this.#handleDragEvent.bind(this);

    this._interactions.modify.on('modifystart', this.#onModifyStart.bind(this));
    this._interactions.modify.on('modifyend', this.#onModifyEnd.bind(this));

    const self = this;

    // toolbox (interactions)
    this.on('toggled', ({ toggled }) => {
      if (!toggled) {
        return GUI.closeUserMessage();
      }
      GUI.showUserMessage({
        title: 'sdk.mapcontrols.annotation.title',
        type: 'tool',
        size: 'small',
        iconClass: 'annotation',
        closable: false,
        hooks: {
          body: {
            components: { ColorPicker },
            data: () => this._annotation,
            template: /* html */ `
              <div style="width: 100%; padding: 5px;" id = "annotations-content">
                <section class = "annotation-buttons" style = "display: flex; justify-content: space-between; flex-flow: wrap; margin-bottom: 5px;">
                  <!--- ANNOTATION TYPES -->
                  <button v-for = "t in ['Point', 'LineString', 'Polygon', 'Circle', 'Rectangle', 'Text']" 
                    @click.stop = "type = t === type ? null : t " 
                    class       = "btn" 
                    :class      = "[type === t && 'skin-background-color' , t ]" >
                  </button>
                </section>
                <section v-if = "feature || (null === type && ids.length > 0)" id = "annotation-tools">
                  <divider/>
                  <div style  = "display: flex; justify-content: flex-end; margin-top: 10px; font-size: 1.2em;">
                    <p v-if   = "feature && ids.length > 0" :class="$fa('list')" style = "cursor: pointer; margin-right: 5px;" @click.stop = "showAll"></p>
                    <p :class = "$fa('download')" style = "cursor: pointer; margin-right: 5px;" @click.stop = "dowload"></p>
                    <p :class = "$fa('trash')"    style = "color: red; cursor: pointer;" @click.stop = "remove"></p>
                  </div>
                  <divider/>
                </section>
                <section v-if   = "null === feature && null === type && ids.length > 0" id = "annotation-list">
                  <button 
                    v-for       = "item in ids" :key = "item.id" 
                    @click.stop = "editFeature(item.id)"
                    class       = "btn"
                    style       = "width: 100%; margin: 3px; border: solid 1px #ccc"
                    >
                      {{ item.text }}
                  </button>
                </section>
                <!-- ANNOTATION CONSTRAINTS --> 
                <section v-if = "!feature" id = "annotation-constraints">
                  <!-- LINE LENGTH  -->
                  <section v-if = "'LineString' === type" id = "line-length">
                    <label for = "llength">Length</label>
                    <div style = "display: flex;">
                      <input 
                      id      = "llength" 
                      class   = "form-control"
                      type    = "number" 
                      name    = "length" 
                      min     = "0" 
                      step    = "1"
                      v-model  = "constraints.line.length" />
                      <select id = "cllengthunit" style = "width: 25%" class = "form-control" v-model = "constraints.line.unit">
                        <option value = "1">m</option>
                        <option value = "1000">km</option>
                      </select> 
                    </div>
                  </section>
                  <!-- POLYGON SEGMENT LENGTH -->
                  <section v-if = "'Polygon' === type" id = "polygon-length">
                    <label for  = "plength">Length</label>
                    <div style  = "display: flex;">
                      <input 
                        id      = "plength" 
                        class   = "form-control"
                        type    = "number" 
                        name    = "length" 
                        min     = "0" 
                        step    = "1"
                        v-model  = "constraints.line.length" />
                      <select id = "cplengthunit" style = "width: 25%" class = "form-control" v-model = "constraints.line.unit">
                        <option value = "1">m</option>
                        <option value = "1000">km</option>
                      </select> 
                    </div>
                  </section>
                  <!-- RECTANGLE SEGMENT LENGTH -->
                  <section v-if = "'Rectangle' === type" id = "rectangle-lengths">
                    <label for = "rwlength">W Length</label>
                    <div style = "display: flex;">
                      <input 
                        id      = "rwlength" 
                        class   = "form-control"
                        type    = "number" 
                        name    = "width" 
                        min     = "0" 
                        step    = "1"
                        v-model  = "constraints.rectangle.width" />
                      <select id = "rwidthunit" style = "width: 25%" class = "form-control" v-model = "constraints.rectangle.wunit">
                        <option value = "1">m</option>
                        <option value = "1000">km</option>
                      </select> 
                    </div>
                    <label for = "rhlength">H Length</label>
                    <div style = "display: flex;">
                      <input 
                        id      = "rhlength" 
                        class   = "form-control"
                        type    = "number" 
                        name    = "height" 
                        min     = "0" 
                        step    = "1"
                        v-model  = "constraints.rectangle.height" />
                      <select id = "rheighthunit" style = "width: 25%" class = "form-control" v-model = "constraints.rectangle.hunit">
                        <option value = "1">m</option>
                        <option value = "1000">km</option>
                      </select> 
                    </div>
                  </section>
                  <!-- CIRCLE RADIUS SET -->
                  <section v-if = "'Circle' === type" id = "circle-radius">
                    <label for = "cradius">Radius</label>
                    <div style = "display: flex;">
                      <input 
                        id      = "cradius" 
                        class   = "form-control"
                        type    = "number" 
                        name    = "radius" 
                        min     = "0" 
                        step    = "1"
                        v-model  = "constraints.circle.radius" />
                      <select id = "cradiusunit" style = "width: 25%" class = "form-control" v-model = "constraints.circle.unit">
                        <option value = "1">m</option>
                        <option value = "1000">km</option>
                      </select> 
                    </div>
                  </section>
                </section> 
                
                <section v-if = "feature" id = "annotation-item" style = "margin-top: 5px;"> 
                  <div class = "form-group"> 
                    <input 
                      class   = "form-control" 
                      type    = "text" 
                      v-model = "text"/>
                  </div>
                  <!-- ROTATION TEXT STYLE CHANGE -->
                  <section v-if = "'Text' === feature.get('type')" id = "style-rotation-text">
                    <label for = "rotation">Rotation</label>
                    <input 
                      id      = "rotation"
                      type    = "range" 
                      name    = "width" 
                      min     = "-180" 
                      step    = "1"
                      max     = "180" 
                      v-model = "style.rotation" />
                  </section>
                  <!-- COLOR STYLE CHANGE -->
                  <section v-if = "'Text' !== feature.get('type')">
                    <section id = "color" style = "margin-bottom: 10px;">
                      <color-picker
                        ref                 = "color_picker"
                        :value              = "picker_color"
                        @click.prevent.stop = ""
                        @hook:beforeDestroy = "() => $refs.color_picker.$off()"
                        @input              = "onChangeColor"
                        style               = "width: 100%"
                      />
                    </section>
                    <!-- RADIUS POINT STYLE CHANGE -->
                    <section v-if = "'Point' === feature.get('type')" id = "style-radius">
                      <label for = "radius">Radius</label>
                      <input 
                        id      = "radius" 
                        type    = "range" 
                        name    = "radius" 
                        min     = "3" 
                        step    = "1"
                        max     = "20" 
                        v-model = "style.radius" />
                    </section>
                    <!-- STROKE WIDTH STYLE CHANGE -->
                    <section v-if = "['LineString', 'Polygon', 'Rectangle', 'Circle'].includes(feature.get('type'))" id = "style-stroke-width">
                      <label for = "stroke">Stroke</label>
                      <input 
                        id      = "stroke" 
                        type    = "range" 
                        name    = "width" 
                        min     = "0.5" 
                        step    = "0.5"
                        max     = "8" 
                        v-model = "style.width" />
                    </section>
      
                    <!-- OPACITY STYLE CHANGE -->
                    <section v-if = "['Polygon', 'Rectangle' , 'Circle'].includes(feature.get('type'))" id = "style-opacity">
                      <label for = "opacity">Opacity</label>
                      <input 
                        id      = "opacity" 
                        type    = "range" 
                        name    = "opacity" 
                        min     = "0" 
                        step    = "0.05"
                        max     = "1" 
                        v-model = "style.opacity" />
                    </section>
                    <!-- INFO TEXT CHOOSE -->
                    <section id = "info-text" style = "display: flex; justify-content: space-between;">
                      <input 
                        id      = "feature-text"
                        class   = "form-control magic-checkbox" 
                        v-model = "show_text"
                        type    = "checkbox"/>
                      <label for = "feature-text">Show Text</label>
                      <input 
                        v-if    = "'Text' !== feature.get('type')"
                        id      = "feature-info"
                        class   = "form-control magic-checkbox" 
                        type    = "checkbox" 
                        v-model = "show_info"/>
                      <label for = "feature-info">Info</label>
                    </section>
                    
                  </section>
                </section>
              </div>`,  
            computed: {
              picker_color() { 
                return this.style.color.split(',').reduce((a, c, i) => { a[ 0 === i ? 'r' : 1 === i ? 'g' : 'b'] = Number(c); return a; } ,{ r: null, g: null, b: null }) 
              },
            },  
            methods: {
              showAll          () { this.type = null; this.feature.selected = false; this.feature = null; this.change(); },
              onChangeColor    ({ rgba: {r, g, b } }) { this.style.color = `${r}, ${g}, ${b}` },
              remove:          ()   =>  this.remove(),
              dowload:         ()   =>  {
                ApplicationState.download = true;
                saveBlob(new Blob([new TextEncoder().encode(
                  JSON.stringify(
                    (new ol.format.GeoJSON()).writeFeaturesObject(
                      this._annotation.feature ? [this._annotation.feature] : this._layer.getSource().getFeatures(),
                      { dataProjection: GUI.getService('map').getEpsg(), featureProjection: GUI.getService('map').getEpsg()}
                    )
                  )
                )], { type: "application/json;charset=utf-8" }), 'annotation');
                ApplicationState.download = false;
              },
              editFeature:     id   => this.editFeature(id),
              change:          ()   => this.change(),
              resetContraints: ()   => this.resetContraints()
            },
            watch: {
              type:               t => { if (null === t) this.resetContraints(); this.changeType(t) },
              text(t)             { 
                this.feature.set('text', t);
                this.ids.find(({ id }) => this.feature.getId() === id).text = t;
                if (this.feature.get('show_text')) {
                  this.change();
                } 
              },
              show_text       (b) { this.feature.set('show_text', b); this.change() },
              show_info       (b) { this.feature.set('show_info', b); this.change() },
              'style.color'   (c) { self.#updateStyle(this.feature, { color: c }); this.change() },
              'style.width'   (w) { self.#updateStyle(this.feature, { width: Number(w) }); this.change() },
              'style.radius'  (r) { self.#updateStyle(this.feature, { radius: Number(r) }); this.change() },
              'style.opacity' (o) { self.#updateStyle(this.feature, { opacity: Number(o) }); this.change() },
              'style.rotation'(r) { self.#updateStyle(this.feature, { rotaion: Number(r) * (Math.PI/180) }); this.change() },
              //Handle meausure geometry
              'constraints.circle': {
                deep : true,
                handler() {
                  if (self._interaction) {
                    self._interaction.radius = this.constraints.circle.radius * this.constraints.circle.unit;
                  }
                },
              }, 
              'constraints.line': {
                deep : true,
                handler() {
                  if (self._interaction) {
                    self._interaction.length = this.constraints.line.length * this.constraints.line.unit;
                  }
                },
              }, 
              'constraints.rectangle': {
                deep : true,
                handler() { 
                  if (self._interaction) {
                    self._interaction.width  = this.constraints.rectangle.width; 
                    self._interaction.height = this.constraints.rectangle.height;
                  }  
                },
              }, 
            }, 
            created: () => {
              // when toggled and layer has features annotation
              if (this._layer.getSource().getFeatures().length > 0) {
                this.changeType(null);
              }
            },
            beforeDestroy: () => { 
              this.getMap().removeInteraction(this._interaction);
              this.getMap().removeInteraction(this._interactions.select);
              this.getMap().removeInteraction(this._interactions.modify);
              // this.getMap().removeInteraction(this._translateInteraction);
              this._annotation.type        = null,
              this._annotation.feature     = null;
              this._annotation.text        = ''; 
              this._annotation.style       = {
                color:    DEFAULTS.color,
                width:    DEFAULTS.width,
                radius:   DEFAULTS.radius,
                opacity:  DEFAULTS.opacity,
                rotation: DEFAULTS.rotation,
              };
              this._annotation.show_text   = false;
              this._annotation.show_info   = false;
              this.resetContraints();
              // unselect all features
              this._layer.getSource().getFeatures().forEach(f => f.selected = false);
              this.change();
              }
          }
        }
      });

      this._interactions.select.setActive(true);
      this.getMap().addInteraction(this._interactions.select);
      this.getMap().addInteraction(this._interactions.modify);
      // this._translateInteraction.setActive(true);
      // this.getMap().addInteraction(this._translateInteraction);
    });
  }

  setMap(map) {
    super.setMap(map);
    map.addLayer(this._layer);
  }

  /**
   * Reset data contraints 
   */
  resetContraints() { 
    this._annotation.constraints = {
      circle:    { ...DEFAULTS.circle },
      line:      { ...DEFAULTS.line },
      rectangle: { ...DEFAULTS.rectangle }
    }; 
  }

  /**
   * @param {Set current feature to edit} feature 
   */
  setCurrentEditFeature(feature = null) {
    //In case a current feature is selected 
    if (this._annotation.feature) {
      this._annotation.feature.selected = false;
      this._annotation.feature.changed();
    }

    //if no feature is passed, unselected
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

    feature.selected       = true;
    feature.changed();
  }

  /**
   * 
   * @param {*} id 
   */
  editFeature(id) {
    this.setCurrentEditFeature(this._layer.getSource().getFeatureById(id));
  };

  /**
   * Redraw annotaion layer
   */
  change() {
    this._layer.changed();
  }

  /**
   * Remove all features or single feature
   */
  remove() {
    if (this._annotation.feature) {
      this._layer.getSource().removeFeature(this._annotation.feature);
    } else {
      this._layer.getSource().clear();
    }
    this._annotation.feature = null;
  }

  /**
   * Change annotation type
   * 
   * @param { string } type 
   */
  changeType(type) {
    if (this._interaction) {
      this.getMap().removeInteraction(this._interaction);
      this._interaction = null;
    }  

    if (this._measureTooltip) {
      removeMeasureTooltip({ map: this.getMap(), ...this._measureTooltip });
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
      this.change();
    }

    if (this._interaction) {
      this._interaction.setActive(true);
      this.getMap().addInteraction(this._interaction);
    }
  }

  #onAddFeature({ feature }) { 
    //clear eventually selected feature
    this._interactions.select.getFeatures().clear();

    //set id and default properties values of new feature
    feature.setId(DEFAULTS.FID); 
    feature.set('text', `${this._annotation.type} ${DEFAULTS.FID++}`); 
    feature.set('show_text', false);
    feature.set('info', '');
    feature.set('show_info', false);
    feature.set('type', this._annotation.type);

    if ('Circle' === this._annotation.type) {
      this.#updateCircle(feature);
    }

    feature.setStyle(get_style(this._annotation.type));
    
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

    this.#updateStyle(feature, this._annotation.style);                         // set style properties of feature
    
    Object.assign(this._annotation, {
      feature,                   // current feature
      text: feature.get('text'), // current text (for input value)
      type: null,                // stop to draw. Reset type
    });

    this._annotation.ids.push({ id: DEFAULTS.FID, text: feature.get('text') }); // Add feature to features list
    this._interactions.select.getFeatures().push(feature);                  // add current feature to selection to modify it

  }

  #onRemoveFeature({ feature }) {
    this._annotation.ids = this._annotation.ids.filter(({ id }) => id !== feature.getId() )
  }

  #onSelectInteraction(e) {
    this.setCurrentEditFeature(e.selected[0]);
  }

  #handleDragEvent(e) {
    this._annotation.feature.set('endCoordinates', e.coordinate);

    this._interactions.modify._handleDragEvent.call(this._interactions.modify, e);

    if ('Rectangle' === this._annotation.feature.get('type')) {
      //get current feature in modify
      const modifyFeature  = this._annotation.feature;
      const modifyGeometry = modifyFeature.get('modifyGeometry');
      if (modifyGeometry) {
        const vertex       = e.coordinate;   
        const coordinates  = modifyFeature.getGeometry().getCoordinates()[0];
        const index        = coordinates.findIndex(c => vertex[0] === c[0] && vertex[1] === c[1]);
        /**
          *    (1)-------(2)
          *      |       | 
          *      |       |
          * (0,4) -------(3)
          * 
          */
        let [c0, c1, c2, c3, c4] = coordinates;
        switch(index) {
          case 0:
            c1 = [vertex[0], c1[1]];
            c3 = [c3[0], vertex[1]];
            break;
          case 1:
            c0 = c4 = [vertex[0], c4[1]];
            c2 = [c2[0], vertex[1]];
            break;
          case 2:
            c1 = [c1[0], vertex[1]];
            c3 = [vertex[0], c3[1]];
            break;
          case 3:  
            c0 = c4 = [c4[0], vertex[1]];
            c2 = [vertex[0], c2[1]];
            break;
        }
        modifyGeometry.geometry.setCoordinates([[c0, c1, c2, c3, c4]]);
      }
    }
   
    //redraw layer only if feature has show_info to true
    if (this._annotation.feature.get('show_info')) {
      this.change();
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
      this.#updateCircle(this._annotation.feature);
    }
  }

  #onDrawStart(e) {
    const { constraints }  = this._annotation;
    switch(this._annotation.type) {
      case 'LineString':
      case 'Polygon':
        this._measureTooltip = createMeasureTooltip({ map: this._interaction.getMap(), feature: e.feature });
        if (Number(constraints.line.length) > 0) {
          this._interaction.length   = Number(constraints.line.length) * constraints.line.unit;
        }
        break;
      case 'Circle':
        this._measureTooltip = createMeasureTooltip({ map: this._interaction.getMap(), feature: e.feature });
        if (Number(constraints.circle.radius) > 0) {
          this._interaction.radius = Number(constraints.circle.radius) * constraints.circle.unit;
          e.feature.getGeometry().setRadius(this._interaction.radius);
        }
        break;
    }
    //set geometry of draw feature
    this._interaction.geometry = e.feature.getGeometry();
  }

  #onDrawEnd(e) {
    if ('Circle' === this._annotation.type) {
      e.feature.set('endCoordinates', e.feature.getGeometry().getClosestPoint(this._interaction._endCoordinates));
      this._interaction.radius = null;
    }
    if (['LineString', 'Polygon'].includes(this._annotation.type)) {
      this._interaction.length = null;
    }

    this._interaction.geometry =  null;
  }

  #onDrawGeometry(coordinates, geometry) {
    //coordinates is array contains each single click point
    //Circle - coordinate[0] center of circle, coordinate[1] mouse position 
    //Linestring - coordinates contains vertex of Linestring
    switch(this._annotation.type) {

      case 'Circle':
        const center = coordinates[0];
        const last   = coordinates[coordinates.length - 1];
        const dx     = center[0] - last[0];
        const dy     = center[1] - last[1];
        const radius = this._interaction.radius || Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
        if (!geometry) {
          geometry = new ol.geom.Circle(center, radius);
        } else {
          geometry.setCenterAndRadius(center, radius);
        }
        break;

      case 'LineString':
        geometry = geometry || new ol.geom.LineString([]);
        if (this._interaction.length) {
          coordinates.push(
            ...(this._interaction.length ? this.#updateLength({ coordinates: coordinates.splice(-2), length: this._interaction.length }) : []
          ));
        } 
        geometry.setCoordinates(coordinates);
        
        break; 

      case 'Polygon':
        geometry          = geometry || new ol.geom.Polygon([]);
        if (this._interaction.length) {
          const segment = coordinates[0].splice(-2);
          coordinates[0].push(...this.#updateLength({ coordinates: segment, length: this._interaction.length }));
          coordinates = [coordinates[0]];
        }
        geometry.setCoordinates([[...coordinates[0], coordinates[0][0]]]);
        
        this._interaction.geometry = geometry;
        break;

      case 'Recatangle':
        break;


    };

    return geometry;
  }

  #onDrawStyle(feature, resolution) {
    const type = this._annotation.type;

    if ('Circle' === type && 'Point' === feature.getGeometry().getType() && !this._interaction.geometry) {
      this._interaction._endCoordinates = feature.getGeometry().getCoordinates()
    }

    if ('Circle' === type && 'Point' === feature.getGeometry().getType() && this._interaction.geometry) {
      this._interaction._endCoordinates = this._interaction.geometry.getClosestPoint(feature.getGeometry().getCoordinates());
      feature.getGeometry().setCoordinates(this._interaction._endCoordinates);
    }

    if ('Circle' === type && 'Circle' === feature.getGeometry().getType()) {
      this._interaction._endCoordinates = feature.getGeometry().getClosestPoint(this._interaction._endCoordinates);
      feature.set('endCoordinates', this._interaction._endCoordinates);
      return get_style(type)(feature)
    }

    if ('LineString' === type && this._interaction.length && 'Point' === feature.getGeometry().getType() && this._interaction.geometry) {
      feature.getGeometry().setCoordinates(this._interaction.geometry.getLastCoordinate())
    }

    if ('Polygon' === type && this._interaction.length && 'Point' === feature.getGeometry().getType() && this._interaction.geometry) {
      feature.getGeometry().setCoordinates(this._interaction.geometry.getCoordinates()[0][this._interaction.geometry.getCoordinates()[0].length - 2])
    }

    if ('Polygon' === type && this._interaction.length && 'LineString' === feature.getGeometry().getType()) {
      feature.getGeometry().setCoordinates(this._interaction.geometry.getCoordinates()[0].slice(0, -1));
    }

    if ('Polygon' === type && this._interaction.length && 'Polygon' === feature.getGeometry().getType()) {
      feature.getGeometry().setCoordinates(this._interaction.geometry.getCoordinates());
    }

    // fallback to default style function
    return (new ol.interaction.Draw({ type: 'Text' === type ? 'Point': type })).getOverlay().getStyleFunction()(feature, resolution);
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
  #updateLength({ coordinates, length } ) {
    if (areCoordinatesEqual(coordinates[0], coordinates[1])) {
      return coordinates;
    }
    //get first coordinate (start)
    let currentSegment = [coordinates[0]];
    const segments     = [coordinates[0]];
    for (let i = 1; i < coordinates.length; i++) {
      let newCoordinate = null;
      const start = ol.sphere.getLength(new ol.geom.LineString(currentSegment));
      const end   = ol.sphere.getLength(new ol.geom.LineString([...currentSegment, coordinates[i]]));
      const ratio = (length - start) / (end - start);
      newCoordinate = [
        currentSegment[0][0] + ratio * (coordinates[i][0] - currentSegment[0][0]),
        currentSegment[0][1] + ratio * (coordinates[i][1] - currentSegment[0][1])
      ];
      segments.push(newCoordinate);
      currentSegment = [newCoordinate];
    }
    return segments;
  }

  /**
   * save geometry info to properties to create feature  when passed geojson features from server
   */
  #updateCircle(feature) {
    feature.set('radius', feature.getGeometry().getRadius());
    feature.set('center', feature.getGeometry().getCenter());
  }

  /**
   * set feature stye properties
   */
  #updateStyle(feature, style = {}) {
    feature.set('style', Object.assign(feature.get('style') || {}, style));
  }
}

/**
 * @param { String } type 
 * @returns { Array<ol.style.Style> }
 */
function get_style(type) {
  switch (type) {
    case 'Point': 
      return (feature) => {
        const style = feature.get('style') || {};
        return new ol.style.Style({
          text: new ol.style.Text({
            placement: 'point',
            text: `${feature.get('show_info') ? `${`${feature.getGeometry().getCoordinates()}`} \n` : ''}${feature.get('show_text') ? feature.get('text'): ''}`,
            fill: new ol.style.Fill({ color : '#000000' }),
            font: '15px Titillium Web',
            stroke: new ol.style.Stroke({
              color: '#FFFFFF',
              width: 3
            }),
          }),
          image: new ol.style.Circle({
            fill: new ol.style.Fill({
              color: `rgb(${style.color})`,
            }),
            radius: style.radius,
          }),
        })
      }

    case 'LineString': 
      return (feature) => {
        const style = feature.get('style') || {};
        return [
          ...(feature.selected 
            ? [new ol.style.Style({
                stroke: new ol.style.Stroke({
                  width: style.width + 3,
                  color: `#FFFFFF`,
                }),
             })] 
            : []
          ),
          new ol.style.Style({
            text:   new ol.style.Text({
              placement: 'point',
              text: `${feature.get('show_info') 
                ? `${feature.getGeometry().getLength() > 100 
                  ? (Math.round((feature.getGeometry().getLength() / 1000) * 100) / 100) +  ' km' 
                  : (Math.round(feature.getGeometry().getLength() * 100) / 100) + ' m'} \n` 
                : ''}${feature.get('show_text') ? feature.get('text'): ''
              }`,
              fill: new ol.style.Fill({ color : '#000000' }),
              font: '15px Titillium Web',
              stroke: new ol.style.Stroke({
                color: '#FFFFFF',
                width: 3
              }),
            }),
            stroke: new ol.style.Stroke({
              width: style.width,
              color: `rgb(${style.color})`
            }),
          }),
          ...(feature.selected ? [
            new ol.style.Style({
              image: new ol.style.Circle({
                radius: 5,
                stroke: new ol.style.Stroke({ color: '#000000', width: 3 }) 
              }),
              geometry: f => new ol.geom.MultiPoint(f.getGeometry().getCoordinates())
            })
          ] : [])
        ]
      }

    case 'Polygon':    
      return (feature) => {
        const style = feature.get('style') || {};
        return [
          ...(feature.selected 
            ? [new ol.style.Style({
                stroke: new ol.style.Stroke({
                  width: style.width + 3,
                  color: `#FFFFFF`,
                }),
             })] 
            : []
          ),
          new ol.style.Style({
            text:   new ol.style.Text({
              placement: 'point',
              text: `${feature.get('show_info') 
                ? `${feature.getGeometry().getArea() > 10000 
                  ? (Math.round((feature.getGeometry().getArea() / 1000000) * 100) / 100) +  ' km²' 
                  : (Math.round(feature.getGeometry().getArea() * 100) / 100) + ' m²'} \n` 
                : ''}${feature.get('show_text') ? feature.get('text'): ''
              }`,
              fill: new ol.style.Fill({ color : '#000000' }),
              font: '15px Titillium Web',
              stroke: new ol.style.Stroke({
                color: '#FFFFFF',
                width: 3
              }),
            }),
            stroke: new ol.style.Stroke({
              width: style.width,
              color: `rgb(${style.color})`
            }),
            fill:   new ol.style.Fill({
              color: `rgba(${style.color}, ${style.opacity})`
            })
          }),
          ...(feature.selected ? [
            new ol.style.Style({
              image: new ol.style.Circle({
                radius: 5,
                stroke: new ol.style.Stroke({ color: '#000000', width: 3 }) 
              }),
              geometry: f => new ol.geom.MultiPoint(f.getGeometry().getCoordinates()[0])
            })
          ] : [])
        ]
      }

    case 'Rectangle':  
      return (feature) => {
        //take in account modify
        const style    = feature.get('style') || {};
        const geometry = (feature.get('modifyGeometry') && feature.get('modifyGeometry').geometry) || feature.getGeometry();
        return [
          ...(feature.selected 
            ? [new ol.style.Style({
                stroke: new ol.style.Stroke({
                  width: style.width + 3,
                  color: `#FFFFFF`,
                }),
                geometry: () => geometry,
             })] 
            : []
          ),
          new ol.style.Style({
            text:   new ol.style.Text({
              placement: 'point',
              text: `${feature.get('show_info') 
                ? `${feature.getGeometry().getArea() > 10000 
                  ? (Math.round((feature.getGeometry().getArea() / 1000000) * 100) / 100) +  ' km²' 
                  : (Math.round(feature.getGeometry().getArea() * 100) / 100) + ' m²'} \n` 
                : ''}${feature.get('show_text') ? feature.get('text'): ''
              }`,
              fill: new ol.style.Fill({ color : '#000000' }),
              font: '15px Titillium Web',
              stroke: new ol.style.Stroke({
                color: '#FFFFFF',
                width: 3
              }),
            }),
            stroke: new ol.style.Stroke({
              width: style.width,
              color: `rgb(${style.color})`
            }),
            fill: new ol.style.Fill({
              color: `rgba(${style.color}, ${style.opacity})`
            }),
            geometry: () => geometry
          }),
          ...(feature.selected 
            ? [
                new ol.style.Style({
                  image: new ol.style.Circle({
                  radius: 5,
                  stroke: new ol.style.Stroke({ color: '#000000', width: 3 }) 
                }),
                geometry: f => new ol.geom.MultiPoint(geometry.getCoordinates()[0])
                })
              ] 
            : []
          )
        ]
      }

    case 'Circle':     
      return (feature) => {
        const style = feature.get('style') || {};
        const endCoordinates = feature.get('endCoordinates');
        return [
          //stroke selection
          ...(feature.selected 
            ? [new ol.style.Style({
                stroke: new ol.style.Stroke({
                  width: (style.width || DEFAULTS.width) + 3,
                  color: `#FFFFFF`,
                }),
             })] 
            : []
          ),
          //crcle style
          new ol.style.Style({
            text:   new ol.style.Text({
              placement: 'point',
              text: `${feature.get('show_text') ? feature.get('text'): ''}`,
              fill: new ol.style.Fill({ color : '#000000' }),
              font: '15px Titillium Web',
              stroke: new ol.style.Stroke({
                color: '#FFFFFF',
                width: 3
              }),
            }),
            stroke: new ol.style.Stroke({
              width: style.width || DEFAULTS.width,
              color: `rgb(${style.color || '3, 169, 244'})`
            }),
            fill:   new ol.style.Fill({
              color: `rgba(${style.color || '255, 255, 255'}, ${undefined === style.opacity ? 0.5 : style.opacity})`
            })
          }),
          ...(feature.selected && feature.get('show_info') 
            ? [new ol.style.Style({
                stroke: new ol.style.Stroke({ color: '#FFFFFF', width: 6 }), 
                geometry: f => new ol.geom.LineString([f.getGeometry().getCenter(), endCoordinates]) 
             })] 
            : []
          ),
          new ol.style.Style({
            text:   new ol.style.Text({
              placement: 'line',
              text: `${feature.get('show_info')
                ? `${feature.getGeometry().getRadius() > 100 
                  ? (Math.round((feature.getGeometry().getRadius() / 1000) * 100) / 100) +  ' km' 
                  : (Math.round(feature.getGeometry().getRadius() * 100) / 100) + ' m'} \n` 
                : ''
              }`,
              fill: new ol.style.Fill({ color : '#000000' }),
              font: '15px Titillium Web',
              stroke: new ol.style.Stroke({
                color: '#FFFFFF',
                width: 3
              }),
            }),
            ...(feature.get('show_info') || undefined === feature.get('show_info') 
              ? 
                {
                  stroke: new ol.style.Stroke({ color: `rgb(${style.color || '3, 169, 244'})`, width: 3 }), 
                geometry: f => new ol.geom.LineString([f.getGeometry().getCenter(), endCoordinates]) 
              } 
              : {}
            )
            
          }),
          new ol.style.Style({
            text:   new ol.style.Text({
              placement: 'point',
              offsetX: 20,
              text: `${feature.get('show_info') 
                ? `${parseInt(Math.atan2(feature.getGeometry().getCenter()[0] - endCoordinates[0], feature.getGeometry().getCenter()[1] - endCoordinates[1]) * 180 / Math.PI)}°`
                : ''
              }`,
              fill: new ol.style.Fill({ color : '#000000' }),
              font: '15px Titillium Web',
              stroke: new ol.style.Stroke({
                color: '#FFFFFF',
                width: 3
              }),
            }),
            geometry: f => new ol.geom.Point(endCoordinates)
          }),
        ]
      }

    case 'Text': 
      return (feature) => {
        const style = feature.get('style');
        return new ol.style.Style({  
          text: new ol.style.Text({
            text: `${feature.get('text')}`,
            rotation: `${style.rotation}`,
            fill: new ol.style.Fill({ color : '#000000' }),
            font: '15px Titillium Web',
            placement: 'point',
            stroke: new ol.style.Stroke({
              color:     '#FFFFFF',
              width:     8
            }),
          }),
        })
      }
  }
}