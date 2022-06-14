import OnClickControl  from './onclickcontrol';
class ScreenshotControl extends OnClickControl{
  constructor(options={}) {
    options.visible = false;
    options.name = options.name || "maptoimage";
    options.tipLabel =  options.tipLabel|| "Screenshot";
    options.label = options.label || "\ue90f";
    options.toggled = false;
    super(options);
    this.layers = options.layers || [];
    // setVisibility at start time
    this.change(this.layers);
  }

  change(layers=[]) {
    const visible = this.checkVisible(layers);
    this.setVisible(visible);
  };

  checkVisible(layers=[]) {
    const find = layers.find(layer => layer.isExternalWMS ? layer.isExternalWMS() : false);
    return !find;
  };

}


export default  ScreenshotControl;
