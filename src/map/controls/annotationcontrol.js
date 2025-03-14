/**
 * @file ORIGINAL SOURCE: src/app/g3w-ol/controls/measuercontrol.js@v3.10.2
 * @since 3.11.0
 */
import GUI                        from 'services/gui';
import ApplicationState           from 'store/application';
import { saveBlob }               from 'utils/saveBlob';
import InteractionControl         from 'map/controls/interactioncontrol';
import { Compact as ColorPicker } from 'vue-color';
import { createMeasureTooltip }   from 'utils/createMeasureTooltip';
import { removeMeasureTooltip }   from 'utils/removeMeasureTooltip';
import { areCoordinatesEqual }    from 'utils/areCoordinatesEqual';

let count = 1; //incremental number to unique identify id feature

const color         = '244, 78, 59'; //deafult color;
const radius        = 8; // deafult radius point
const width         = 3; // default width stroke
const opacity       = 0.5; //default opacity
const rotation      = 0; //default rotation text

//creation feature constraints

const circle = {
  radius: 0,
  unit:   1
};

const line = {
  length: 0,
  unit:   1
};

const rectangle = {
  width:  0,
  wunit:  1,
  height: 0,
  hunit:  1,
};

//set feature stye properties
const setFeatureStyleProperties = (feature, style = {}) => {
  feature.set('style', {
    ...(feature.get('style') || {}),
    ...style,
  });
};

//Method to handle fix lengyh segments of LineString or Polygon
const handleLengthGeometry = ({ coordinates, length } ) => {
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
 * 
 * @param { String } type 
 * @returns { Array<ol.style.Style> }
 */
const styles = (type) => {
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
        return [
          //stroke selection
          ...(feature.selected 
            ? [new ol.style.Style({
                stroke: new ol.style.Stroke({
                  width: (style.width || width) + 3,
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
              width: style.width || width,
              color: `rgb(${style.color || '3, 169, 244'})`
            }),
            fill:   new ol.style.Fill({
              color: `rgba(${style.color || '255, 255, 255'}, ${undefined === style.opacity ? 0.5 : style.opacity})`
            })
          }),
          ...(feature.selected && feature.get('show_info') 
            ? [new ol.style.Style({
                stroke: new ol.style.Stroke({ color: '#FFFFFF', width: 6 }), 
                geometry: f => new ol.geom.LineString([f.getGeometry().getCenter(), f.endCoordinates]) 
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
                geometry: f => new ol.geom.LineString([f.getGeometry().getCenter(), f.endCoordinates]) 
              } 
              : {}
            )
            
          }),
          new ol.style.Style({
            text:   new ol.style.Text({
              placement: 'point',
              offsetX: 20,
              text: `${feature.get('show_info') 
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
          this.resetContraints();
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
    this._layer.getSource().on('addfeature', ({ feature }) => { 
      const text = `${this._data.type} ${count++}`;

      //set id and default properties values of new feature
      feature.setId(count); 
      feature.set('text', text); 
      feature.set('show_text', false);
      feature.set('info', '');
      feature.set('show_info', false);
      feature.set('type', this._data.type);
      feature.setStyle(styles(this._data.type));
      
      this._data.style.color    = color;
      this._data.style.radius   = radius;
      this._data.style.width    = width;
      this._data.style.opacity  = opacity;
      this._data.style.rotation = rotation;
      this._data.show_text      = 'Text' === this._data.type;
      this._data.show_info      = false;
      feature.selected          = true;

      //set style properties of feature
      setFeatureStyleProperties(feature, this._data.style);
      
      //set current feature
      this._data.feature = feature;
      //set current text for input value
      this._data.text = text; 
      //stop to draw. Reset type
      this._data.type = null
      //Add feature to features list
      this._data.ids.push({ id: count, text: feature.get('text') }); 

    });

    //on Remove feature
    this._layer.getSource().on('removefeature', ({ feature }) => this._data.ids = this._data.ids.filter(({ id }) => id !== feature.getId() ));

    //Annotation data
    this._data = {
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
      
      constraints: {
        circle:    {...circle},
        line:      {...line},
        rectangle: {...rectangle},
      },
      text:          '',
      show_text:     false, //show text
      show_info:     false, // show info feature (cordinates, lenght, area, etc.)
    };

    this._interaction = null;

    this._measureTooltip = null;

    const self = this;

    this._selectInteraction = new ol.interaction.Select({
      layers: [this._layer],
      style:  feature => styles(feature.get('type'))(feature)
    });

    this._selectInteraction.on('select', (e) => {
      this.setCurrentEditFeature(e.selected[0]);
    });

    //Modify Feature
    this._modifyInteraction = new (class AnnotatioModify extends ol.interaction.Modify {
      constructor() {
        super({ 
          features:              self._selectInteraction.getFeatures(),
          insertVertexCondition: () => self._data.feature && 'Rectangle' !== self._data.feature.get('type'),//In case of recatngle annotation, can't
        });

        //Modify start. Useful for Rectangle
        this.on('modifystart', e => {
          if ('Rectangle' === self._data.feature.get('type')) {
            self._data.feature.set(
              'modifyGeometry',
              { geometry: self._data.feature.getGeometry().clone() },
              true,
            );
          }
        })

        //Modify end. Useful for Rectangle
        this.on('modifyend', e => {
          if ('Rectangle' === self._data.feature.get('type')) {
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
        if ('Rectangle' === self._data.feature.get('type')) {
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
        if (self._data.feature.get('show_info')) {
          self.change();
        }
      }

    });

    // //Translate Feature
    // this._translateInteraction = new ol.interaction.Translate({
    //   features: this._selectInteraction.getFeatures(),
    // });

    this.toggledTool = {
      __title:     'sdk.mapcontrols.annotation.title',
      __iconClass: 'annotation',
      components: { ColorPicker },
      data: () => this._data,
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
        dowload:         ()   =>  this.dowload(),
        editFeature:     id   => this.editFeature(id),
        change:          ()   => this.change(),
        resetContraints: ()   => this.resetContraints()
      },
      watch: {
        type:               t => { if (null === t) this.resetContraints(); this.changeAnnotationType(t) },
        text(t)             { 
          this.feature.set('text', t);
          this.ids.find(({ id }) => this.feature.getId() === id).text = t;
          if (this.feature.get('show_text')) {
            this.change();
          } 
        },
        show_text       (b) { this.feature.set('show_text', b); this.change() },
        show_info       (b) { this.feature.set('show_info', b); this.change() },
        'style.color'   (c) { setFeatureStyleProperties(this.feature, { color: c }); this.change() },
        'style.width'   (w) { setFeatureStyleProperties(this.feature, { width: Number(w) }); this.change() },
        'style.radius'  (r) { setFeatureStyleProperties(this.feature, { radius: Number(r) }); this.change() },
        'style.opacity' (o) { setFeatureStyleProperties(this.feature, { opacity: Number(o) }); this.change() },
        'style.rotation'(r) { setFeatureStyleProperties(this.feature, { rotaion: Number(r) * (Math.PI/180) }); this.change() },
        //Handle meausure geometry
        'constraints.circle': {
          deep : true,
          handler() { if (self._interaction) self._interaction.radius = this.constraints.circle.radius * this.constraints.circle.unit },
        }, 
        'constraints.line': {
          deep : true,
          handler() { if (self._interaction) self._interaction.length = this.constraints.line.length * this.constraints.line.unit },
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
      created()       { GUI.toggleUserMessage(false); },
      beforeDestroy() { GUI.toggleUserMessage(true);  }
    };
  }
  /**
  * Reset data contraints 
  */
  resetContraints() { 
    this._data.constraints = { circle: { ...circle }, line: { ...line }, rectangle: { ...rectangle } } 
  }

  /**
   * 
   * @param {Set current feature to edit} feature 
   */
  setCurrentEditFeature(feature = null) {
    //In case a current feature is selected 
    if (this._data.feature) {
      this._data.feature.selected = false;
      this._data.feature.changed();
    }
    //if no feature is passed, unselected
    if (!feature) {
      this._data.feature = null;
      return;
    };

    this._data.feature     = feature;
    this._data.text        = this._data.feature.get('text'); 
    this._data.style.color = this._data.feature.get('style').color;
    this._data.show_text   = this._data.feature.get('show_text');
    this._data.show_info   = this._data.feature.get('show_info');
    
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
    const self = this;
    const map  = this.getMap();

    if (this._interaction) {
      map.removeInteraction(this._interaction);
      this._interaction = null;
    }  

    if (this._measureTooltip) {
      removeMeasureTooltip({ map: this.getMap(), ...this._measureTooltip });
      this._measureTooltip = null;
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
          let endC;
          this.width;
          this.height;
          this._interaction = new ol.interaction.DragBox();

          //BBOX START
          this._interaction.on('boxstart', ({ coordinate }) => startC = coordinate);

          this._interaction.on('boxdrag', (e) => {
            this.width  = Number(this._data.constraints.rectangle.width);
            this.height = Number(this._data.constraints.rectangle.height);
            if (this.width > 0 && this.height > 0) {
              this.width  = this.width  * this._data.constraints.rectangle.wunit;
              this.height = this.height * this._data.constraints.rectangle.hunit;
              endC = [startC[0] + (startC[0] > e.coordinate[0] ?  -1 : 1) * this.width, startC[1] + (startC[1] > e.coordinate[1] ? -1 : 1)* this.height];
              //Draw box with set dimension (width, height)
              this._interaction.box_.setPixels(this.getMap().getPixelFromCoordinate(startC), this.getMap().getPixelFromCoordinate(endC));
            }
          })

          //BBOX END
          this._interaction.on('boxend', ({ coordinate }) => {
            this._layer.getSource().addFeature(new ol.Feature(ol.geom.Polygon.fromExtent(ol.extent.boundingExtent([startC, endC || coordinate]))));
            this._data.constraints.rectangle.width = this._data.constraints.rectangle.height = 0; 
            this._data.constraints.rectangle.wunit = this._data.constraints.rectangle.hunit  = 1;        
          });
          break;
        } 
        //used by circle
        let endCoordinates     = null; 
        const { constraints }  = this._data;
        const source = this._layer.getSource();
        const defaultStyleFnc = (new ol.interaction.Draw({ type: 'Text' === type ? 'Point': type })).getOverlay().getStyleFunction();
        this._interaction = new (class D extends ol.interaction.Draw {
          constructor() {
            super({
              type: 'Text' === type ? 'Point': type,
              source,
              geometryFunction: ['LineString', 'Polygon', 'Circle', 'Rectangle'].includes(type) 
                ? function(coordinates, geometry) {
                    //coordinates is array contains each single click point
                    //Circle - coordinate[0] center of circle, coordinate[1] mouse position 
                    //Linestring - coordinates contains vertex of Linestring
                    switch(type) {

                      case 'Circle':
                        const center = coordinates[0];
                        const last   = coordinates[coordinates.length - 1];
                        const dx     = center[0] - last[0];
                        const dy     = center[1] - last[1];
                        const radius = this.radius || Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
                        if (!geometry) {
                          geometry = new ol.geom.Circle(center, radius);
                        } else {
                          geometry.setCenterAndRadius(center, radius);
                        }
                        break;

                      case 'LineString':
                        geometry = geometry || new ol.geom.LineString([]);
                        if (this.length) {
                          coordinates.push(
                            ...(this.length ? handleLengthGeometry({ coordinates: coordinates.splice(-2), length: this.length }) : []
                          ));
                        } 
                        geometry.setCoordinates(coordinates);
                        
                        break; 

                      case 'Polygon':
                        geometry          = geometry || new ol.geom.Polygon([]);
                        if (this.length) {
                          const segment = coordinates[0].splice(-2);
                          coordinates[0].push(...handleLengthGeometry({ coordinates: segment, length: this.length }));
                          coordinates = [coordinates[0]];
                        }
                        geometry.setCoordinates([[...coordinates[0], coordinates[0][0]]]);
                        
                        this.geometry = geometry;
                        break;

                      case 'Recatangle':
                        break;
          

                    };

                    return geometry;
                  
                }
              : null,
              style: (feature, resolution) => {

                if ('Circle' === type) {
                  if ('Point' === feature.getGeometry().getType()) {
                    if (this.geometry) {
                      endCoordinates = this.geometry.getClosestPoint(feature.getGeometry().getCoordinates());
                      feature.getGeometry().setCoordinates(endCoordinates);
                    } else {
                      endCoordinates = feature.getGeometry().getCoordinates()
                    }
                  }

                  if ('Circle' === feature.getGeometry().getType()) {
                    endCoordinates = feature.getGeometry().getClosestPoint(endCoordinates);
                    feature.endCoordinates = endCoordinates;
                    return styles(type)(feature)
                  }
                }

                if ('LineString' === type && this.length) {
                  if ('Point' === feature.getGeometry().getType() && this.geometry) {
                    feature.getGeometry().setCoordinates(this.geometry.getLastCoordinate())
                  }
                } 
                  
                if ('Polygon' === type && this.length) {
                  if ('Point' === feature.getGeometry().getType() && this.geometry) {
                    feature.getGeometry().setCoordinates(this.geometry.getCoordinates()[0][this.geometry.getCoordinates()[0].length - 2])
                  }

                  if ('LineString' === feature.getGeometry().getType()) {
                    feature.getGeometry().setCoordinates(this.geometry.getCoordinates()[0].slice(0, -1));
                  }

                  if ('Polygon' === feature.getGeometry().getType()) {
                    feature.getGeometry().setCoordinates(this.geometry.getCoordinates());
                  }
                  
                }
                
                return defaultStyleFnc(feature, resolution);

              },
              finishCondition(e) {
                endCoordinates = e.coordinate;
                return true;
              }
            });

            //DRAW START EVENT
            this.on('drawstart', function(e) {
              switch(type) {
                case 'LineString':
                case 'Polygon':
                  self._measureTooltip = createMeasureTooltip({ map: this.getMap(), feature: e.feature });
                  if (Number(constraints.line.length) > 0) {
                    this.length   = Number(constraints.line.length) * constraints.line.unit;
                  }
                  break;
                case 'Circle':
                  self._measureTooltip = createMeasureTooltip({ map: this.getMap(), feature: e.feature });
                  if (Number(constraints.circle.radius) > 0) {
                    this.radius = Number(constraints.circle.radius) * constraints.circle.unit;
                    e.feature.getGeometry().setRadius(this.radius);
                  }
                  break;   
              }
              //set geometry of draw feature
              this.geometry = e.feature.getGeometry();
            });
            //DRAW END
            this.on('drawend', e => {
              
              if ('Circle' === type) {
                e.feature.endCoordinates = e.feature.getGeometry().getClosestPoint(endCoordinates);
                this.radius = null;
              }
              if (['LineString', 'Polygon'].includes(type)) {
                this.length = null;
              }

              this.geometry =  null;
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