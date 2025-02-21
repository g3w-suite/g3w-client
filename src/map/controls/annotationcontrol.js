/**
 * @file ORIGINAL SOURCE: src/app/g3w-ol/controls/measuercontrol.js@v3.10.2
 * @since 3.11.0
 */
import GUI                         from 'services/gui';
import InteractionControl          from 'map/controls/interactioncontrol';

let count = 1;

const color  = '255, 0, 0'; //base color
const styleText = new ol.style.Text({
  placement: 'point',
  fill: new ol.style.Fill({ color : '#000000' }),
  font: '15px Titillium Web',
  stroke: new ol.style.Stroke({
    color:     '#FFFFFF',
    width:     3
  }),
});

const styleStroke = new ol.style.Stroke({
  width: 3,
  color: `rgb(${color})`
});

const styleFill = new ol.style.Fill({
  color: `rgba(${color}, 0.5)`
})

const styles = {
  'Point':      new ol.style.Style({
    text: styleText,
    image: new ol.style.Circle({
      fill: new ol.style.Fill({
        color: `rgb(${color})`,
      }),
      radius: 10,
    }),
  }),
  'LineString': new ol.style.Style({
    text:   styleText,
    stroke: styleStroke
  }),
  'Polygon':    new ol.style.Style({
    text:   styleText,
    stroke: styleStroke,
    fill:   styleFill
  }),
  'Circle':     new ol.style.Style({
    text:   styleText,
    stroke: styleStroke,
    fill:   styleFill
  }),
  'Rectangle':  new ol.style.Style({
    text:   styleText,
    stroke: styleStroke,
    fill:   styleFill
  }), 
  'Text':       new ol.style.Style({
    text: new ol.style.Text({
      fill: new ol.style.Fill({ color : '#000000' }),
      font: '15px Titillium Web',
      placement: 'point',
      stroke: new ol.style.Stroke({
        color:     '#FFFFFF',
        width:     8
      }),
    }),
    
  }),
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

    this._layer = opts.layer || new ol.layer.Vector({
      source: new ol.source.Vector()
    });



    //types of annotation

    this._data = {
      types:        ['Point', 'LineString', 'Polygon', 'Circle', 'Rectangle', 'Text'],
      type:         'Point',
      feature:       null, //annotation feature to edit,
      color:         color,
      text:          '',
      show_text:     false, //show text
      show_info:     false, // show info feature (cordinates, lenght, area, etc.)
    };

    this.toggledTool = {
      __title: 'sdk.mapcontrols.annotation.title',
      __iconClass: 'annotation',
      data: () => this._data,
      template: /* html */ `
        <div style="width: 100%; padding: 5px;">
          <select ref="select" style="width: 100%;" :search="false" v-select2="'type'">
            <option v-for="type in types" :value="type" v-t="'sdk.mapcontrols.annotation.types.' + type"></option>
          </select>
          <section v-if = "feature" id = "annotation_item" style = "margin-top: 5px;"> 
            <section id = "annotation-tools" style = "display: flex; justify-content: flex-end; padding: 5px; font-size: 1.2em;">
              <p :class="$fa('download')" style = "cursor: pointer; margin-right: 5px;" @click.stop = "download"></p>
              <p :class="$fa('trash')" style = "color: red; cursor: pointer;" @click.stop = "remove"></p>
            </section>
            <div class = "form-group" style = "margin-bottom: 5px;"> 
              <input 
                class   = "form-control" 
                type    = "text" 
                v-model = "text"/>
            </div>
            <div v-if = "'Text' !== type" style = "display: flex; justify-content: space-between;">
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
            </div>
          </section>
        </div>`,  
      computed: {
        loading: () => ApplicationState.download,
      },  
      methods: {
        remove: () => {
          this.remove();
        },
        download() {}
      },
      watch: {
        type: {
          immediate: true,
          handler: type => this.changeAnnotationType(type)
        },
        text:         t => this.setText(t),
        show_text:    () => this.showText(),
        show_info:    b => this.showInfo(b),
        feature: f    => f && this.setStyle(), 
      },  
      created()       { GUI.toggleUserMessage(false); },
      beforeDestroy() { GUI.toggleUserMessage(true); }
    };
  }

  setText(t = '') {
    this._data.feature.set('text', t);
    this.showText();
  }

  setStyle() {
    this._data.feature.setStyle(styles[this._data.type]);
    this.showText();
  }

  showText() {
    const style = this._data.feature.getStyle();
    style.getText().setText((this._data.show_text || 'Text' === this._data.type) ? this._data.feature.get('text'): '');
    this._data.feature.setStyle(style);
    this._layer.changed();
  }

  showInfo(bool = false) {
    console.log(this._data.type)
  }

  remove() {
    this._layer.getSource().removeFeature(this._data.feature);
    this._data.feature = null;
  }

  changeAnnotationType(type) {

    //set feature null
    this._data.feature = null;

    const map = this.getMap();
    if (this._interaction) {
      map.removeInteraction(this._interaction);
    }  

    if ('Rectangle' === type) {
      let startC;
      this._interaction = new ol.interaction.DragBox();
      this._interaction.setActive(true);
      map.addInteraction(this._interaction);    
      //BBOX START
      this._interaction.on('boxstart', e => startC = e.coordinate );
      //BBOX END
      this._interaction.on('boxend', e => {
        this._data.feature = new ol.Feature(ol.geom.Polygon.fromExtent(ol.extent.boundingExtent([startC, e.coordinate])));
        this._data.feature._type = type;
        this._layer.getSource().addFeature(this._data.feature);
      });

      return;
    
    } 
    
    this._interaction = new ol.interaction.Draw({
      type: 'Text' === type ? 'Point': type,
      source: this._layer.getSource(),
    });

    this._interaction.setActive(true);
    map.addInteraction(this._interaction);

    //DRAW END
    this._interaction.on('drawend', e => {
      e.feature._type    = type;
      this._data.text    = `${type} ${count++}`;
      this._data.feature = e.feature;
    })
  }

}