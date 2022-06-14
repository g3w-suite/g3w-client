import { layout }  from './utils';
import {Control as OLControl} from 'ol/control'
import {unByKey} from "ol/Observable";

class Control extends OLControl {
  constructor(options={}) {
    let {name="", visible=true, enabled=false, element, customClass, buttonClickHandler} = options;
    name =  name.split(' ').join('-').toLowerCase();
    if (!element) {
      const className = "ol-"+name.split(' ').join('-').toLowerCase();
      const tipLabel = options.tipLabel || name;
      const label = options.label || '';
      const mapControlButtonVue =  Vue.extend({
        functional: true,
        render(h) {
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
    super(options);
    this._enabled = enabled;
    this.offline = options.offline !== undefined ? options.offline : true;
    this.name = name;
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
    buttonClickHandler = options.buttonClickHandler || this._handleClick.bind(this);
    $(options.element).on('click', buttonClickHandler);
    this.setVisible(visible);
    this._postRender();
  }

  //return if clickmap
  isClickMap() {
    return this.clickmap;
  };

  isToggled() {
    return this._toggled;
  };

  setEventKey({eventType, eventKey}) {
    this.eventKeys[eventType] = {
      eventKey,
      originalHandler: eventKey.linstener
    };
  };

  resetOriginalHandlerEvent(eventType) {
    const eventKey = this.eventKeys[eventType].eventKey;
    eventKey && unByKey(eventKey);
    this.eventKeys[eventType].eventKey = this.on(eventType, this.eventKeys[eventType].originalHandler);
  };

  overwriteEventHandler({eventType, handler}) {
    const eventKey = this.eventKeys[eventType].eventKey;
    eventKey && unByKey(eventKey);
    this.eventKeys[eventType].eventKey = this.on(eventType, handler);
  };

  getPosition(positionCode) {
    positionCode = positionCode || this.positionCode;
    const position = {};
    position['top'] = (positionCode.indexOf('t') > -1) ? true : false;
    position['left'] = (positionCode.indexOf('l') > -1) ? true : false;
    position ['bottom'] = (positionCode.indexOf('b') > -1) ? true : false;
    position ['right'] = (positionCode.indexOf('r') > -1) ? true : false;
    return position;
  };

  /**
   * Method to handle toggle map controls
   * @param event
   */
  _handleClick(event) {
    event.preventDefault();
    const map = this.getMap();
    let resetControl = null;
    // remove all the other, eventually toggled, interactioncontrols
    const controls = map.getControls();
    this._toggled && controls.forEach(control => {
      if (control.id && control.toggle && (control.id !== this.id)) {
        control.toggle(false);
        if (control.name === 'reset') resetControl = control;
      }
    });
    if (!this._toggled && resetControl) resetControl.toggle(true);
    this.dispatchEvent('controlclick');
  };

  //shift of control position
  shiftPosition(position) {
    $(this.element).css(hWhere, position+'px');
  };

  // layout handler
  layout(map) {
    if (map) {
      const position =  this.getPosition();
      const element = $(this.element);
      layout({map, position, element})
    }
  };

  // change layout of controls // overwrite to customize beahviour
  changelayout(map) {};

  //called when a control is added ore removed to map (added: map is an ol.Map instance , removed map is null)
  setMap(map) {
    if (map) {
      this.layout(map);
      super.setMap(map);
    }
  };
  /**
   *
   */
  showControl() {
    $(this.element).show();
  };

  //hide control and move all controls that sit on his right position
  hideControl() {
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

  setEnable(enabled, toggled=false) {
    const controlButton = $(this.element).find('button').first();
    if (enabled) controlButton.removeClass('g3w-ol-disabled');
    else {
      controlButton.addClass('g3w-ol-disabled');
      this._interaction && this._interaction.setActive(false);
    }
    this.toggle && this.toggle(toggled);
    this._enabled = enabled;
  };

  getEnable() {
    return this._enabled;
  };

  setVisible(visible=true) {
    this._visible = visible;
    $(this.element)[visible ? 'show': 'hide']();
  };

  isVisible() {
    return this._visible;
  };

  _postRender() {};
}

export default  Control;
