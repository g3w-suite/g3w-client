const layout = require('./utils').layout;
const Control = function(options) {
  const name = options.name || "";
  this._enabled = (options.enabled === false) ? false : true;
  this.offline = options.offline !== undefined ? options.offline : true;
  this.name = name.split(' ').join('-').toLowerCase();
  this.id = this.name+'_'+(Math.floor(Math.random() * 1000000));
  this.eventKeys = {}; // store eventKey and original havenHandler
  /*
    tl: top-left
    tr: top-right
    bl: bottom-left
    bt: bottom-right
   */
  this.positionCode = options.position || 'tl';
  this.priority = options.priority || 0;
  if (!options.element) {
    const className = "ol-"+this.name.split(' ').join('-').toLowerCase();
    const customClass = options.customClass;
    const tipLabel = options.tipLabel || this.name;
    const label = options.label || '';
    const mapControlButtonVue =  Vue.extend({
      functional: true,
      render(h){
        return h('div', {
          class: {
            [className]: !!className,
            'ol-unselectable': true,
            'ol-control': true
          }
        }, [
            h('button', {
              attrs: {
                type: 'button',
              },
              directives: [{
                name: 't-tooltip',
                value: tipLabel
              }]
            }, [
                label,
                h('i', {
                  class: {
                    [customClass]: !!customClass
                  }
                })
            ])
          ]
        )
      }
    });
    const mapControlButtonDOMElement = new mapControlButtonVue().$mount().$el;
    options.element = mapControlButtonDOMElement;
  }
  const buttonClickHandler = options.buttonClickHandler || Control.prototype._handleClick.bind(this);
  $(options.element).on('click',buttonClickHandler);
  ol.control.Control.call(this, options);
  this._postRender();
};

ol.inherits(Control, ol.control.Control);

const proto = Control.prototype;

proto.setEventKey = function({eventType, eventKey}){
  this.eventKeys[eventType] = {
    eventKey,
    originalHandler: eventKey.linstener
  };
};

proto.resetOriginalHandlerEvent = function(eventType){
  const eventKey = this.eventKeys[eventType].eventKey;
  eventKey && ol.Observable.unByKey(eventKey);
  this.eventKeys[eventType].eventKey = this.on(eventType, this.eventKeys[eventType].originalHandler);
};

proto.overwriteEventHandler = function({eventType, handler}) {
  const eventKey = this.eventKeys[eventType].eventKey;
  eventKey && ol.Observable.unByKey(eventKey);
  this.eventKeys[eventType].eventKey = this.on(eventType, handler);
};

proto.getPosition = function(positionCode) {
  positionCode = positionCode || this.positionCode;
  const position = {};
  position['top'] = (positionCode.indexOf('t') > -1) ? true : false;
  position['left'] = (positionCode.indexOf('l') > -1) ? true : false;
  position ['bottom'] = (positionCode.indexOf('b') > -1) ? true : false;
  position ['right'] = (positionCode.indexOf('r') > -1) ? true : false;
  return position;
};

proto._handleClick = function(event) {
  event.preventDefault();
  const map = this.getMap();
  let resetControl = null;
  // remove all the other, eventually toggled, interactioncontrols
  const controls = map.getControls();
  controls.forEach((control) => {
    if(control.id && control.toggle && (control.id !== this.id)) {
      control.toggle(false);
      if (control.name === 'reset') {
        resetControl = control;
      }
    }
  });
  if (!this._toggled && resetControl) {
    resetControl.toggle(true);
  }
  this.dispatchEvent('controlclick');
};

//shift of control position
proto.shiftPosition = function(position) {
  $(this.element).css(hWhere, position+'px');
};

// layout handler
proto.layout = function(map) {
  if (map) {
    const position =  this.getPosition();
    const element = $(this.element);
    layout({map, position, element})
  }
};

// change layout of controls // overwrite to customize beahviour
proto.changelayout = function(map) {};

proto.showHide = function() {
  $(this.element).toggle();
};

//called when a control is added ore removed to map (added: map is an ol.Map instance , removed map is null)
proto.setMap = function(map) {
  if (map) {
    this.layout(map);
    ol.control.Control.prototype.setMap.call(this, map);
  }
};

//hide control and move all controls that sit on his right position
proto.hideControl = function() {
  let position = $(this.element).position().left;
  let controlWidth = $(this.element).outerWidth();
  let newPosition = position;
  const controls = $(this.element).siblings('.ol-control-tl');
  controls.each(function() {
    if ($(this).position().left > position) {
      newPosition = $(this).position().left;
      if (controlWidth > $(this).outerWidth()) {
        position = position + (controlWidth - $(this).outerWidth())
      }
      $(this).css('left', position+'px');
      position = newPosition;
      controlWidth = $(this).outerWidth();
    }
  });
  $(this.element).hide();
};

// funzione che abilita e disabilita il controllo
proto.setEnable = function(bool) {
  const controlButton = $(this.element).find('button').first();
  if (bool)  {
    controlButton.removeClass('g3w-ol-disabled');
  } else {
    controlButton.addClass('g3w-ol-disabled');
    controlButton.removeClass('g3w-ol-toggled');
    if (this._interaction) {
      this._interaction.setActive(false);
    }
  }
  this._enabled = bool;
};

proto.getEnable = function() {
  return this._enabled;
};

proto._postRender = function() {};

module.exports = Control;
