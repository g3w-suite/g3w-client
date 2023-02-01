import GUI from 'services/gui';
const {debounce} = require('core/utils/utils');
const Control = require('g3w-ol/controls/control');

function ZoomHistoryControl() {
  const history = this.history = {
    index: 0,
    items: []
  };
  const self = this;
  const vueButtonElement = Vue.extend({
    data() {
      return {
        history,
      }
    },
    render(h){
      return h('div', {
          style: {
            display: 'flex',
            flexDirection: 'column'
          },
          class: {
            'ol-zoom-history': true,
            'ol-unselectable': true,
            'ol-control': true
          }
        }, [
          h('button', {
            attrs: {
              type: 'button',
            },
            class: {
              'g3w-disabled': this.history.index === 0
            },
            on: {
              click: ()=> {
                this.history.index-=1;
                self.toExtent(this.history.items[this.history.index]);
              }
            },
            directives: [{
              name: 't-tooltip',
              value: 'Back'
            }]
          }, [
            h('i', {
              class: {
                [GUI.getFontClass('arrow-left')]: true
              }
            }),
          ]),
        h('button', {
          attrs: {
            type: 'button',
          },
          class: {
            'g3w-disabled': (this.history.index === 0 && this.history.items.length === 1) ||
                            (this.history.index === this.history.items.length - 1)
          },
          on: {
            click: ()=> {
              this.history.index+=1;
              self.toExtent(this.history.items[this.history.index]);
            }
          },
          directives: [{
            name: 't-tooltip',
            value: 'Forward'
          }]
        }, [
          h('i', {
            class: {
              [GUI.getFontClass('arrow-right')]: true
            }
          }),
        ])
        ]
      )
    }
  });
  const element = new vueButtonElement();
  this.history = element.history;
  const options = {
    name: "history",
    tipLabel: "sdk.mapcontrols.addlayer.tooltip",
    element: element.$mount().$el
  };
  Control.call(this, options);
}

ol.inherits(ZoomHistoryControl, Control);

const proto = ZoomHistoryControl.prototype;

proto.setMap = function(map) {
  Control.prototype.setMap.call(this,map);
  this.history.items.push(map.getView().calculateExtent(map.getSize()));
  map.getView().on('change' , debounce(evt => {
    const extent = evt.target.calculateExtent(map.getSize());
    if (this.history.index !== this.history.items.length -1)
      this.history.items.splice((this.history.index - this.history.items.length) + 1);
    this.history.items.push(extent);
    this.history.index+=1;
  }, 600))
};

proto.toExtent = function(extent){
  this.getMap().getView().fit(extent)
};

proto.layout = function(map) {
  Control.prototype.layout.call(this, map);
};

module.exports = ZoomHistoryControl;
