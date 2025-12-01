/**
 * @file
 * @since 4.1.0
 */

const ApplicationState  = g3w.state;
const GUI               = g3w.app;
const { XHR, debounce } = g3w.utils;

// wait for map ready
GUI.on('after:setupControls', () => {
  if (ApplicationState.project.state.baselayers.length) {
    new WMSControl(ApplicationState.project.state.baselayers);
  }
});

/**
 * CUSTOM MAP CONTROL: "baselayers"
 */
class WMSControl extends ol.control.Control {
  
  #activeLayer = null;

  constructor(layers) {
    super({
      element: Object.assign(document.createElement('div'), { className: 'ol-wms-control ol-unselectable ol-control' }),
      target: document.querySelector('.g3w-map-controls-left-bottom'),
    });

    // retrieve global map instance (open layers)
    const map   = GUI.getService('map').getMap();

    // base layers
    this.layers = GUI.getBaseLayers();

    // activate base layer (if any)
    this.#activeLayer = this.layers.find(l => l.state.visible);

    this.element.style.order = -1;

    // open layers control
    this.element.innerHTML = /*html*/`
      <button
        type           = "button"
        popovertarget  = "ol-wms-control-popover"
        data-placement = "right"
        title          = "Choose a base layer"
        style          = "
          width:      90px;
          height:     90px;
          background: white url(${window.initConfig.staticurl}client/images/ol-wms-control.png) no-repeat center;
          border:     1px solid #ccc;
          cursor:     pointer;
        "
      ></button>
      <form popover 
        id    = "ol-wms-control-popover" 
        style = "
          position-area: top span-right;
          margin-top: ${-80 - (30 * (this.layers.length-1) ) }px;
          ${'position-area' in document.body.style ? ' margin' : 'inset'}:unset;
          background: #fff;
          border:     1px solid #ccc;
          padding:    10px;
          min-width:  200px;
      ">
        <ul 
          class = "baselayers"
          style = "
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 5px;
            overflow-y: auto;
        ">
          ${
            this.layers.map(layer => /* html */`
              <li data-mapTypeId = "${layer.getId()}">
                <label style = "width: 100%; cursor: pointer;">
                  ${
                    this.#getSrcBaseLayerImage(layers.find(l => layer.getId() === l.id)) /*layers.find(l => layer.getId() === l.id).thumbnail*/
                      ? /* html */ `<img data-mapTypeId = "${layer.getId()}" class = "base-layer-img"  loading = "lazy" src = "${this.#getSrcBaseLayerImage(layers.find(l => layer.getId() === l.id)) /*layers.find(l => layer.getId() === l.id).thumbnail*/}" style = "width: 50px; height: 50px; border-radius: 5px; object-fit: cover; margin: 0 4px 0 8px" />`
                      : /* html */ `<i class = "fas fa-layer-group" style = "margin: 0 10px;"></i>`
                  }
                  ${ layer.getName() }
                </label>
              </li>`
            ).join('')
          }
        </ul>
      </form>
    `;

    // toggle base layers on click
    this.element.querySelector('ul').addEventListener('click', e => {
      const li    = e.target.closest('li');
      //get layer
      const layer = li && ApplicationState.project.getLayerById(li.getAttribute('data-mapTypeId'));
      //if
      if (layer?.isVisible()) {
        this.#activeLayer = null;
      } else if (layer) {
        this.#activeLayer = layer;
      }
      this.#toggleLayer();
    });

    // automatically attach current control to map
    map.addControl(this);

    //Check if base layer is active
    if (this.#activeLayer) {
      this.#toggleLayer();
    }

  }

  #getSrcBaseLayerImage(baseLayer) {
    let image;
    if ('OSM' === baseLayer?.servertype) {
      image = 'osm.png';
    }
    if ('Bing' === baseLayer?.servertype) {
      image = `bing${baseLayer.source.subtype}.png`;
    }
    if (baseLayer.icon) {
      image = baseLayer.icon;
    }
    if (image) {
      return `${GUI.getResourcesUrl()}images/${image}`;
    }
  }

  /** Keep layer visibility/checked status in sync */
  #toggleLayer() {
    ApplicationState.baseLayerId = this.#activeLayer?.getId();
    const images = document.querySelectorAll('ul.baselayers img');
    for (const img of images) {
      img.style.border = (null === this.#activeLayer || ApplicationState.baseLayerId != img.getAttribute('data-mapTypeId')) ? 'none' : `2px solid #000`;
    }
    ApplicationState.project.setBaseLayer(ApplicationState.baseLayerId);
  }

}