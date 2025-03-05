/**
 * @file ORIGINAL SOURCE: src/app/g3w-ol/controls/measuercontrol.js@v3.10.2
 * @since 3.11.0
 */
import GUI                        from 'services/gui';
import ApplicationState           from 'store/application';
import { saveBlob }               from 'utils/saveBlob';
import InteractionControl         from 'map/controls/interactioncontrol';
import { Compact as ColorPicker } from 'vue-color';
import QueryResultsActionChooseLayer from 'components/QueryResultsActionChooseLayer.vue';
import { containsCoordinate } from 'ol/extent';

let count = 1; //incremental number to unique identify id feature

const color         = '244, 78, 59'; //deafult color;
const radius        = 8; // deafult radius point
const width         = 3; // default width stroke
const opacity       = 0.5; //default opacity
const rotation      = 0; //default rotation text
/**
 * 
 * @param {Styles} type 
 * @param {*} selected 
 * @returns 
 */
const styles = (type) => {
  switch (type) {
    case 'Point': 
      return (feature) => {
        return new ol.style.Style({
          text: new ol.style.Text({
            placement: 'point',
            text: `${feature.show_info ? `${`${feature.getGeometry().getCoordinates()}`} \n` : ''}${feature.show_text ? feature.get('text'): ''}`,
            fill: new ol.style.Fill({ color : '#000000' }),
            font: '15px Titillium Web',
            stroke: new ol.style.Stroke({
              color: '#FFFFFF',
              width: 3
            }),
          }),
          image: new ol.style.Circle({
            fill: new ol.style.Fill({
              color: `rgb(${feature.color})`,
            }),
            radius: feature.radius,
          }),
        })
      }

    case 'LineString': 
      return (feature) => {
        return [
          ...(feature.selected 
            ? [new ol.style.Style({
                stroke: new ol.style.Stroke({
                  width: feature.width + 3,
                  color: `#FFFFFF`,
                }),
             })] 
            : []
          ),
          new ol.style.Style({
            text:   new ol.style.Text({
              placement: 'point',
              text: `${feature.show_info 
                ? `${feature.getGeometry().getLength() > 100 
                  ? (Math.round((feature.getGeometry().getLength() / 1000) * 100) / 100) +  ' km' 
                  : (Math.round(feature.getGeometry().getLength() * 100) / 100) + ' m'} \n` 
                : ''}${feature.show_text ? feature.get('text'): ''
              }`,
              fill: new ol.style.Fill({ color : '#000000' }),
              font: '15px Titillium Web',
              stroke: new ol.style.Stroke({
                color: '#FFFFFF',
                width: 3
              }),
            }),
            stroke: new ol.style.Stroke({
              width: feature.width,
              color: `rgb(${feature.color})`
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
        return [
          ...(feature.selected 
            ? [new ol.style.Style({
                stroke: new ol.style.Stroke({
                  width: feature.width + 3,
                  color: `#FFFFFF`,
                }),
             })] 
            : []
          ),
          new ol.style.Style({
            text:   new ol.style.Text({
              placement: 'point',
              text: `${feature.show_info 
                ? `${feature.getGeometry().getArea() > 10000 
                  ? (Math.round((feature.getGeometry().getArea() / 1000000) * 100) / 100) +  ' km²' 
                  : (Math.round(feature.getGeometry().getArea() * 100) / 100) + ' m²'} \n` 
                : ''}${feature.show_text ? feature.get('text'): ''
              }`,
              fill: new ol.style.Fill({ color : '#000000' }),
              font: '15px Titillium Web',
              stroke: new ol.style.Stroke({
                color: '#FFFFFF',
                width: 3
              }),
            }),
            stroke: new ol.style.Stroke({
              width: feature.width,
              color: `rgb(${feature.color})`
            }),
            fill:   new ol.style.Fill({
              color: `rgba(${feature.color}, ${feature.opacity})`
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
        const geometry = (feature.get('modifyGeometry') && feature.get('modifyGeometry').geometry) || feature.getGeometry();
        return [
          ...(feature.selected 
            ? [new ol.style.Style({
                stroke: new ol.style.Stroke({
                  width: feature.width + 3,
                  color: `#FFFFFF`,
                }),
                geometry: () => geometry,
             })] 
            : []
          ),
          new ol.style.Style({
            text:   new ol.style.Text({
              placement: 'point',
              text: `${feature.show_info 
                ? `${feature.getGeometry().getArea() > 10000 
                  ? (Math.round((feature.getGeometry().getArea() / 1000000) * 100) / 100) +  ' km²' 
                  : (Math.round(feature.getGeometry().getArea() * 100) / 100) + ' m²'} \n` 
                : ''}${feature.show_text ? feature.get('text'): ''
              }`,
              fill: new ol.style.Fill({ color : '#000000' }),
              font: '15px Titillium Web',
              stroke: new ol.style.Stroke({
                color: '#FFFFFF',
                width: 3
              }),
            }),
            stroke: new ol.style.Stroke({
              width: feature.width,
              color: `rgb(${feature.color})`
            }),
            fill: new ol.style.Fill({
              color: `rgba(${feature.color}, ${feature.opacity})`
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
        console.log(feature.selected)
        return [
          ...(feature.selected || undefined === feature.selected 
            ? [new ol.style.Style({
                stroke: new ol.style.Stroke({
                  width: (feature.width || width) + 3,
                  color: `#FFFFFF`,
                }),
             })] 
            : []
          ),
          new ol.style.Style({
            text:   new ol.style.Text({
              placement: 'point',
              text: `${feature.show_text ? feature.get('text'): ''}`,
              fill: new ol.style.Fill({ color : '#000000' }),
              font: '15px Titillium Web',
              stroke: new ol.style.Stroke({
                color: '#FFFFFF',
                width: 3
              }),
            }),
            stroke: new ol.style.Stroke({
              width: feature.width || width,
              color: `rgb(${feature.color || '3, 169, 244'})`
            }),
            fill:   new ol.style.Fill({
              color: `rgba(${feature.color || color}, ${feature.opacity || 0})`
            })
          }),
          ...(feature.selected || undefined === feature.selected 
            ? [new ol.style.Style({
                stroke: new ol.style.Stroke({ color: '#FFFFFF', width: 6 }), 
                geometry: f => new ol.geom.LineString([f.getGeometry().getCenter(), f.endCoordinates]) 
             })] 
            : []
          ),
          new ol.style.Style({
            text:   new ol.style.Text({
              placement: 'line',
              text: `${feature.show_info || undefined === feature.show_info //case draw circle
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
            stroke: new ol.style.Stroke({ color: `rgb(${feature.color || '3, 169, 244'})`, width: 3 }), 
            geometry: f => new ol.geom.LineString([f.getGeometry().getCenter(), f.endCoordinates]) 
          }),
          new ol.style.Style({
            text:   new ol.style.Text({
              placement: 'point',
              offsetX: 20,
              text: `${feature.show_info || undefined === feature.show_info //case draw circle
                ? `${parseInt(Math.atan2(feature.getGeometry().getCenter()[0] - feature.endCoordinates[0], feature.getGeometry().getCenter()[1] - feature.endCoordinates[1]) * 180 / Math.PI)}°`
                : ''
              }`,
              fill: new ol.style.Fill({ color : '#000000' }),
              font: '15px Titillium Web',
              stroke: new ol.style.Stroke({
                color: '#FFFFFF',
                width: 3
              }),
            }),
            geometry: f => new ol.geom.Point(f.endCoordinates) 
          }),
        ]
      }

    case 'Text': 
      return (feature) => {
        return new ol.style.Style({  
          text: new ol.style.Text({
            text: `${feature.get('text')}`,
            rotation: `${feature.rotation}`,
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

export class AnnotationControl extends InteractionControl {

  constructor(opts = {}) {
    super({
      ...opts,
      clickmap: true,
      enabled:  true,
      onToggled(toggled) {
        if (toggled) {
          //add and active interaction
          this._selectInteraction.setActive(true);
          this.getMap().addInteraction(this._selectInteraction);
          this.getMap().addInteraction(this._modifyInteraction);
          // this._translateInteraction.setActive(true);
          // this.getMap().addInteraction(this._translateInteraction);
        }
        if (toggled && this._layer.getSource().getFeatures().length > 0) {
          //when toggled and layer has features annotation
          this.changeAnnotationType(null);
        }
        if (!toggled) {
          //remove Interactions
          this.getMap().removeInteraction(this._interaction);
          this.getMap().removeInteraction(this._selectInteraction);
          this.getMap().removeInteraction(this._modifyInteraction);
          // this.getMap().removeInteraction(this._translateInteraction);
          //reset start value
          this._data.type        = null,
          this._data.feature     = null;
          this._data.text        = ''; 
          this._data.style       = { color, width, radius, opacity, rotation };
          this._data.show_text   = false;
          this._data.show_info   = false;
          //set al features not selected
          this._layer.getSource().getFeatures().forEach(f => f.selected = false);
          this.change();
        }
      }
    });

    this._layer = opts.layer || new ol.layer.Vector({
      source: new ol.source.Vector()
    });

    //On add feature
    this._layer.getSource().on('addfeature', ({ feature })    => { 
      const text = `${this._data.type} ${count++}`;

      feature.setId(count); 
      feature.set('text', text); 
      feature.setStyle(styles(this._data.type));
      
      feature.type      = this._data.type; // set type
      feature.color     = this._data.style.color    = color;
      feature.radius    = this._data.style.radius   = radius;
      feature.width     = this._data.style.width    = width;
      feature.opacity   = this._data.style.opacity  = opacity;
      feature.rotation  = this._data.style.rotation = rotation;
      feature.show_text = this._data.show_text      = 'Text' === this._data.type;
      feature.show_info = this._data.show_info      = false;
      feature.selected  = true;
      
      //set current feature
      this._data.feature = feature;
      //set current text for input value
      this._data.text = text; 
      //stop to draw
      this._data.type = null
      this._data.ids.push({ id: count, text: feature.get('text') }); 
      this._selectInteraction.setActive(true);
    });

    //on Remove feature
    this._layer.getSource().on('removefeature', ({ feature }) => this._data.ids = this._data.ids.filter(({ id }) => id !== feature.getId() ));

    //types of annotation
    this._data = {
      types:        ['Point', 'LineString', 'Polygon', 'Circle', 'Rectangle', 'Text'],
      type:         null,
      ids:           [],
      feature:       null, //annotation feature to edit,
      style: {
        color,
        width,
        radius,
        opacity,
        rotation,
      },
      text:          '',
      show_text:     false, //show text
      show_info:     false, // show info feature (cordinates, lenght, area, etc.)
    };

    this._interaction = null;

    this._selectInteraction = new ol.interaction.Select({
      layers:       [this._layer],
      style:        f => styles(f.type)(f) ,
      hitTolerance: (isMobile && isMobile.any) ? 10 : 0,
    })

    //Select Interaction to select feature to modify
    this._selectInteraction.on('select', e => {
      //get selected feature
      const feature = e.selected[0];
    
      //in case already in editing, skip
      if (feature && this._data.feature && feature.getId() === this._data.feature.getId()) {
        return;
      }

      this._modifyInteraction.setActive(!!feature)
      this.setCurrentEditFeature(feature);
      
    })
    const self = this;

    //Modify Feature
    this._modifyInteraction = new (class AnnotatioModify extends ol.interaction.Modify {
      constructor() {
        super({ 
          source:                self._layer.getSource(),
          insertVertexCondition: () => 'Rectangle' !== self._data.feature.type,//In case of recatngle annotation, can't
          //modify only selected feature  
          condition(e) {
            const features = e.map.getFeaturesAtPixel(e.pixel, {
              layerFilter: l => self._layer === l,
              hitTolerance: (isMobile && isMobile.any) ? 10 : 0,
            });
            return (features.length && features[0].selected) || false;
          },
        });

        //Modify start. Useful for Rectangle
        this.on('modifystart', (e) => {
          if ('Rectangle' === self._data.feature.type) {
            self._data.feature.set(
              'modifyGeometry',
              { geometry: self._data.feature.getGeometry().clone() },
              true,
            );
          }
        })

        //Modify end. Useful for Rectangle
        this.on('modifyend', (e) => {
          if ('Rectangle' === self._data.feature.type) {
            const modifyGeometry = self._data.feature.get('modifyGeometry');
            if (modifyGeometry) {
               self._data.feature.setGeometry(modifyGeometry.geometry);
               self._data.feature.unset('modifyGeometry', true);
            }
          }
        })
      }

      handleDragEvent(e) {
        self._data.feature.endCoordinates = e.coordinate;
        super.handleDragEvent(e);
        if ('Rectangle' === self._data.feature.type) {
          //get current feature in modify
          const modifyFeature  = self._data.feature;
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
        if (self._data.feature.show_info) {
          self.change();
        }
      }

    });

    // //Translate Feature
    // this._translateInteraction = new ol.interaction.Translate({
    //   features: this._selectInteraction.getFeatures(),
    // });

    this.toggledTool = {
      __title: 'sdk.mapcontrols.annotation.title',
      __iconClass: 'annotation',
      components: { ColorPicker },
      data: () => this._data,
      template: /* html */ `
        <div style="width: 100%; padding: 5px;" id = "annotations-content">
          <section class = "annotation-buttons" style = "display: flex; justify-content: space-between; flex-flow: wrap; margin-bottom: 5px;">
            <button @click.stop = "type = t === type ? null : t " class = "btn" :class = "[type === t && 'skin-background-color' , t ]" v-for = "t in types"></button>
          </section>
          <section v-if = "feature || (null === type && ids.length > 0)" id = "annotation-tools">
            <divider/>
            <div style = "display: flex; justify-content: flex-end; margin-top: 10px; font-size: 1.2em;">
              <p v-if = "feature && ids.length > 0" :class="$fa('back')" style = "cursor: pointer; margin-right: 5px;" @click.stop = "showAll"></p>
              <p :class = "$fa('download')" style = "cursor: pointer; margin-right: 5px;" @click.stop = "dowload"></p>
              <p :class = "$fa('trash')"    style = "color: red; cursor: pointer;" @click.stop = "remove"></p>
            </div>
            <divider/>
          </section>
          <section v-if = "null === feature && null === type && ids.length > 0" id = "annotation-list">
            <button 
              v-for       = "item in ids" :key = "item.id" 
              @click.stop = "editFeature(item.id)"
              class       = "btn"
              style       = "width: 100%; margin: 3px; border: solid 1px #ccc"
              >
                {{ item.text }}
            </button>
          </section>
          <section v-if = "feature" id = "annotation-item" style = "margin-top: 5px;"> 
            <div class = "form-group"> 
              <input 
                class   = "form-control" 
                type    = "text" 
                v-model = "text"/>
            </div>
            <!-- ROTATION TEXT STYLE CHANGE -->
            <section v-if = "'Text' === feature.type" id = "style-rotation-text">
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
            <section v-if = "'Text' !== feature.type">
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
              <section v-if = "'Point' === feature.type" id = "style-radius">
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
              <section v-if = "['LineString', 'Polygon', 'Rectangle', 'Circle'].includes(feature.type)" id = "style-stroke-width">
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
              <section v-if = "['Polygon', 'Rectangle' , 'Circle'].includes(feature.type)" id = "style-opacity">
                <label for = "opacity">Opacity</label>
                <input 
                  id      = "opacity" 
                  type    = "range" 
                  name    = "width" 
                  min     = "0" 
                  step    = "0.1"
                  max     = "1" 
                  v-model = "style.opacity" />
              </section>
              
              <section id = "info-text" style = "display: flex; justify-content: space-between;">
                <input 
                  id      = "feature-text"
                  class   = "form-control magic-checkbox" 
                  v-model = "show_text"
                  type    = "checkbox"/>
                <label for = "feature-text">Show Text</label>
                <input 
                  v-if    = "'Text' !== feature.type"
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
        showAll      () { this.type = null; this.feature.selected = false; this.feature = null; this.change(); },
        onChangeColor({ rgba: {r, g, b } }) { this.style.color = `${r}, ${g}, ${b}` },
        remove:      ()   =>  this.remove(),
        dowload:     ()   =>  this.dowload(),
        editFeature: (id) => this.editFeature(id),
        change:      ()   => this.change(),
      },
      watch: {
        type:               (t) => this.changeAnnotationType(t),
        text(t)             { 
          this.feature.set('text', t);
          this.ids.find(({ id }) => this.feature.getId() === id).text = t;
          if (this.feature.show_text) {
            this.change();
          } 
        },
        show_text(b)        { this.feature.show_text = b; this.change() },
        show_info(b)        { this.feature.show_info = b; this.change() },
        'style.color'(c)    { this.feature.color     = c; this.change() },
        'style.width'(w)    { this.feature.width     = w; this.change() },
        'style.opacity'(o)  { this.feature.opacity   = o; this.change() },
        'style.radius'(r)   { this.feature.radius    = r; this.change() },
        'style.rotation'(r) { this.feature.rotation  = r * (Math.PI/180); this.change() },
      },  
      created()       { GUI.toggleUserMessage(false); },
      beforeDestroy() { GUI.toggleUserMessage(true); }
    };
  }

  /**
   * 
   * @param {Set current feature to edit} feature 
   */
  setCurrentEditFeature(feature = null) {
    //In case a current feature is selected 
    if (this._data.feature) {
      this._data.feature.selected = false;
    }
    //if no feature is passed, unselected
    if (!feature) {
      this._data.feature = null;
      return;
    };

    this._data.feature     = feature;
    this._data.text        = this._data.feature.get('text'); 
    this._data.style.color = this._data.feature.color;
    this._data.show_text   = this._data.feature.show_text;
    this._data.show_info   = this._data.feature.show_info;
    
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
    //force change layer to redraw
    this._layer.changed();
  }

  /**
   * Download feature or all features layer
   */
  dowload() {
    ApplicationState.download = true;
    
    const bytes = new TextEncoder().encode(JSON.stringify((new ol.format.GeoJSON()).writeFeaturesObject(this._data.feature ? [this._data.feature] : this._layer.getSource().getFeatures(), { dataProjection: GUI.getService('map').getEpsg(), featureProjection: GUI.getService('map').getEpsg()} )));
    const blob = new Blob([bytes], { type: "application/json;charset=utf-8" });
    saveBlob(blob, 'annotation');

    ApplicationState.download = false;
  }

  /**
   * Remove all features or single feature
   */
  remove() {
    if (this._data.feature) {
      this._layer.getSource().removeFeature(this._data.feature);
    } else {
      this._layer.getSource().clear();
    }
    
    this._data.feature = null;
  }

  /**
   * 
   * @param {*} type 
   */
  changeAnnotationType(type) {
    const map = this.getMap();

    if (this._interaction) {
      map.removeInteraction(this._interaction);
      this._interaction = null;
    }  

    switch(type) {
      case 'Rectangle':
      case 'Point':
      case 'LineString':
      case 'Polygon':  
      case 'Circle':
      case 'Text':  
        //In case of rectangle
        if ('Rectangle' === type) {
          let startC;
          this._interaction = new ol.interaction.DragBox();
          //BBOX START
          this._interaction.on('boxstart', e => startC = e.coordinate );
          //BBOX END
          this._interaction.on('boxend', e => {
            this._layer.getSource().addFeature(new ol.Feature(ol.geom.Polygon.fromExtent(ol.extent.boundingExtent([startC, e.coordinate]))));
          });
          break;
        } 
        let endCoordinates = null; //used by circle
        const source = this._layer.getSource();
        const defaultStyleFnc = (new ol.interaction.Draw({ type: 'Text' === type ? 'Point': type })).getOverlay().getStyleFunction();
        this._interaction = new (class D extends ol.interaction.Draw {
          constructor() {
            super({
              type: 'Text' === type ? 'Point': type,
              source,
              style(feature, resolution) {
                if ('Point' === feature.getGeometry().getType()) {
                  endCoordinates = feature.getGeometry().getCoordinates();
                }

                if ('Circle' === feature.getGeometry().getType()) {
                  feature.endCoordinates = endCoordinates;
                  return styles(type)(feature)
                }

                return defaultStyleFnc(feature, resolution);

              },
              finishCondition(e) {
                endCoordinates = e.coordinate;
                return true
              }
            })
            //DRAW END
            this.on('drawend', e => {
              e.feature.endCoordinates = endCoordinates;
            })
          }
        })
          
        break;  
    }

    if (this._interaction) {
      if (this._data.feature) {
        this._data.feature.selected = false;
        this._data.feature          = null;
        this.change();
      }
      this._interaction.setActive(true);
      map.addInteraction(this._interaction);
    }

  }

}