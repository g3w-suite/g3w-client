const Control = require('./control');
function OnClickControl(options = {}) {
  this._onclick = options.onclick;
  Control.call(this, options);
}

ol.inherits(OnClickControl, Control);

const proto = OnClickControl.prototype;

proto.setMap = function(map) {
  Control.prototype.setMap.call(this,map);
  const controlElement = $(this.element);
  const buttonControl = controlElement.children('button');
  let cliccked = false;
  controlElement.on('click', ()  => {
    if (!cliccked) {
      cliccked = true;
      buttonControl.addClass('g3w-ol-disabled');
      this._onclick && this._onclick().then(() => {}).then(()=> {
        buttonControl.removeClass('g3w-ol-disabled');
        cliccked = false;
      })
    }
  })
};

module.exports = OnClickControl;
