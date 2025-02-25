/**
 * @file ORIGINAL SOURCE: src/app/g3w-ol/controls/measuercontrol.js@v3.10.2
 * @since 3.11.0
 */
import GUI                        from 'services/gui';
import InteractionControl         from 'map/controls/interactioncontrol';
import { Compact as ColorPicker } from 'vue-color';


let count = 1;

const color  = '244, 78, 59'; //base color

const styles = (type) => {
  switch (type) {
    case 'Point': 
      return new ol.style.Style({
        text: new ol.style.Text({
          placement: 'point',
          fill: new ol.style.Fill({ color : '#000000' }),
          font: '15px Titillium Web',
          stroke: new ol.style.Stroke({
            color:     '#FFFFFF',
            width:     3
          }),
        }),
        image: new ol.style.Circle({
          fill: new ol.style.Fill({
            color: `rgb(${color})`,
          }),
          radius: 10,
        }),
      })
    case 'LineString': 
      return new ol.style.Style({
        text:   new ol.style.Text({
          placement: 'point',
          fill: new ol.style.Fill({ color : '#000000' }),
          font: '15px Titillium Web',
          stroke: new ol.style.Stroke({
            color:     '#FFFFFF',
            width:     3
          }),
        }),
        stroke: new ol.style.Stroke({
          width: 3,
          color: `rgb(${color})`
        }),
      })
    case 'Polygon':    
      return new ol.style.Style({
        text:   new ol.style.Text({
          placement: 'point',
          fill: new ol.style.Fill({ color : '#000000' }),
          font: '15px Titillium Web',
          stroke: new ol.style.Stroke({
            color:     '#FFFFFF',
            width:     3
          }),
        }),
        stroke: new ol.style.Stroke({
          width: 3,
          color: `rgb(${color})`
        }),
        fill:   new ol.style.Fill({
          color: `rgba(${color}, 0.5)`
        })
      })
    case 'Circle':     
      return new ol.style.Style({
        text:   new ol.style.Text({
          placement: 'point',
          fill: new ol.style.Fill({ color : '#000000' }),
          font: '15px Titillium Web',
          stroke: new ol.style.Stroke({
            color:     '#FFFFFF',
            width:     3
          }),
        }),
        stroke: new ol.style.Stroke({
          width: 3,
          color: `rgb(${color})`
        }),
        fill:   new ol.style.Fill({
          color: `rgba(${color}, 0.5)`
        })
      })

    case 'Rectangle':  
      return new ol.style.Style({
        text:   new ol.style.Text({
          placement: 'point',
          fill: new ol.style.Fill({ color : '#000000' }),
          font: '15px Titillium Web',
          stroke: new ol.style.Stroke({
            color:     '#FFFFFF',
            width:     3
          }),
        }),
        stroke: new ol.style.Stroke({
          width: 3,
          color: `rgb(${color})`
        }),
        fill:   new ol.style.Fill({
          color: `rgba(${color}, 0.5)`
        })
      }) 
    case 'Text': 
      return new ol.style.Style({  
        text: new ol.style.Text({
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

export class AnnotationControl extends InteractionControl {

  constructor(opts = {}) {
    super({
      ...opts,
      clickmap: true,
      enabled:  true,
      onToggled(toggled) {
        if (toggled) {
          
        }

        if (!toggled) {
          this.getMap().removeInteraction(this._interaction);
        }
      
      }
    });

    this._interaction = null;

    //types of annotation

    this._data = {
      types:        ['Point', 'LineString', 'Polygon', 'Circle', 'Rectangle', 'Text'],
      type:         null,
      ids:           [],
      feature:       null, //annotation feature to edit,
      color:         color,
      text:          '',
      show_text:     false, //show text
      show_info:     false, // show info feature (cordinates, lenght, area, etc.)
    };

    this._layer = opts.layer || new ol.layer.Vector({
      source: new ol.source.Vector()
    });

    this._layer.getSource().on('addfeature', ({ feature })    => { feature.setId(count); this._data.ids.push({id: count, text: feature.get('text')}) });
    this._layer.getSource().on('removefeature', ({ feature }) => this._data.ids = this._data.ids.filter(({id}) => id !== feature.getId() ));

    this.toggledTool = {
      __title: 'sdk.mapcontrols.annotation.title',
      __iconClass: 'annotation',
      components: { ColorPicker },
      data: () => this._data,
      template: /* html */ `
        <div style="width: 100%; padding: 5px;" id = "annotations-content">
          <section class = "annotation-buttons" style = "display: flex; justify-content: space-between; flex-flow: wrap;">
            <button @click.stop = "type = t === type ? null : t " class = "btn" :class = "[type === t && 'skin-background-color' , t ]" v-for = "t in types"></button>
          </section>
          <section v-if = "null === type && ids.length > 0" id = "annotation-list">
            <div v-for = "item in ids" @click.stop = "editFeature(item.id)">{{ item.text }}</div>
          </section>
          <section v-if = "feature" id = "annotation-item" style = "margin-top: 5px;"> 
            <section id = "annotation-tools" style = "display: flex; justify-content: flex-end; padding: 5px; font-size: 1.2em;">
              <p v-if = "ids.length" :class="$fa('back')" style = "cursor: pointer; margin-right: 5px;" @click.stop = "showAll"></p>
              <p :class="$fa('download')" style = "cursor: pointer; margin-right: 5px;" @click.stop = "download"></p>
              <p :class="$fa('trash')" style = "color: red; cursor: pointer;" @click.stop = "remove"></p>
            </section>
            <div class = "form-group"> 
              <input 
                class   = "form-control" 
                type    = "text" 
                v-model = "text"/>
            </div>
            <section v-if = "'Text' !== type">
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
              
              <section id = "info-text" style = "display: flex; justify-content: space-between;">
                <input 
                  id      = "feature-text"
                  class   = "form-control magic-checkbox" 
                  v-model = "show_text"
                  type    = "checkbox"/>
                <label for = "feature-text">Show Text</label>
                <input 
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
          return this.color.split(',').reduce((a, c, i) => { a[ 0 === i ? 'r' : 1 === i ? 'g' : 'b'] = Number(c); return a; } ,{ r: null, g: null, b: null }) 
        },
      },  
      methods: {
        showAll() {
          this.feature = null;
        },
        remove: () => {
          this.remove();
        },
        download() {},
        onChangeColor(val) {
          const { r, g, b} = val.rgba;
          this.color = `${r}, ${g}, ${b}`;
        },
        editFeature: (id) => this.editFeature(id)
      },
      watch: {
        type:         t => this.changeAnnotationType(t),
        text:         t => this.setText(t),
        show_text:    () => this.showText(),
        show_info:    () => this.showText(),
        feature:      f => f && this.setFeature(), 
        color:        () => this.setColor()
      },  
      created()       { GUI.toggleUserMessage(false); },
      beforeDestroy() { GUI.toggleUserMessage(true); }
    };
  }

  editFeature(id) {
    this._data.feature = this._layer.getSource().getFeatureById(id);
  };

  setColor() {
    switch(this._data.type) {
      case 'Point':
        this._data.feature
          .getStyle()
          .getImage()
          .getFill()
          .setColor(`rgb(${this._data.color})`);
        break;
      case 'LineString':
        this._data.feature
          .getStyle()
          .getStroke()
          .setColor(`rgb(${this._data.color})`)
        break; 
      case 'Polygon':
      case 'Rectangle':
      case 'Circle':
        this._data.feature.getStyle()
          .getStroke()
          .setColor(`rgb(${this._data.color})`)

        this._data.feature.getStyle()
          .getFill()
          .setColor(`rgba(${this._data.color}, 0.5)`)  
        break;       
    }

    this._layer.changed()
  }

  setText(t = '') {
    this._data.feature.set('text', t);
    this.showText();
  }

  setFeature() {
    this._data.color = color;
    this._data.feature.setStyle(styles(this._data.type));
    this._data.show_text = 'Text' === this._data.type;
    this._data.show_info = false;
    this._data.text      = `${this._data.type} ${count++}`;
  }

  showText() {
    this._data.feature
      .getStyle()
      .getText()
      .setText(`${this._data.show_info ? `${this.getInfo()} \n` : ''}${this._data.show_text ? this._data.feature.get('text'): ''}`);
    //force change layer to redraw
    this._layer.changed();
  }

  getInfo(bool = false) {
    switch(this._data.type) {
      case 'Point':
        return `${this._data.feature.getGeometry().getCoordinates()}`;
      case 'LineString':
        const length = this._data.feature.getGeometry().getLength();
        if (length > 100) {
          return `${Math.round((length / 1000) * 100) / 100}  km`;
        } 
        return `${Math.round(length * 100) / 100} m`;
      case 'Polygon':
      case 'Reactangle':  
        const area = this._data.feature.getGeometry().getArea();
        if (area > 10000) {
          return `${Math.round((area / 1000000) * 100) / 100} km²`;
        } 
        return `${Math.round(area * 100) / 100} m²`;
      case 'Circle':
        return `${this._data.feature.getGeometry().getCoordinates()}`;
    }

  }

  remove() {
    this._layer.getSource().removeFeature(this._data.feature);
    this._data.feature = null;
  }

  changeAnnotationType(type) {

  
    //set eventually previous feature to null
    this._data.feature = null;

    const map = this.getMap();

    if (this._interaction) {
      map.removeInteraction(this._interaction);
    }  

    switch (type) {
      case null:
        this._interaction = new ol.interaction.Select({
          layers: [this._layer]
        });
        break;
      case 'Rectangle':
        let startC;
        this._interaction = new ol.interaction.DragBox();
        //BBOX START
        this._interaction.on('boxstart', e => startC = e.coordinate );
        //BBOX END
        this._interaction.on('boxend', e => {
          this._data.feature       = new ol.Feature(ol.geom.Polygon.fromExtent(ol.extent.boundingExtent([startC, e.coordinate])));
          this._data.feature._type = type;
          this._layer.getSource().addFeature(this._data.feature);
        });
        break;
      case 'Point':
      case 'LineString':
      case 'Circle':
      case 'Text':  
        this._interaction = new ol.interaction.Draw({
          type: 'Text' === type ? 'Point': type,
          source: this._layer.getSource(),
        });
        //DRAW END
        this._interaction.on('drawend', e => {
          e.feature._type    = type;
          this._data.feature = e.feature;
        })
      break;  
    }
  
    this._interaction.setActive(true);
    map.addInteraction(this._interaction);

    
  }

}