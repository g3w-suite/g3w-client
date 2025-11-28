/**
 * @file
 * @since 4.1.0
 */

const ApplicationState  = g3w.state;
const GUI               = g3w.app;
const { XHR, debounce } = g3w.utils;

// wait for map ready
GUI.setupControl.baselayers = function () {
  new WMSControl(ApplicationState.project.state.baselayers);
};

/**
 * CUSTOM MAP CONTROL: "baselayers"
 */
class WMSControl extends ol.control.Control {

  #opacityLayer
  
  get #activeLayer() {
    return this.__activeLayer || null;
  };

  // keep browser storage in sync
  set #activeLayer(layer) {
    this.__activeLayer = layer;
    localStorage.setItem('baselayer', [(this.#opacityLayer?.getOpacity?.() ?? 0) / 100, layer?.getId()].join('+').replace(/\+$/, ''));
  };

  constructor(layers) {
    super({
      element: Object.assign(document.createElement('div'), { className: 'ol-wms-control ol-unselectable ol-control' }),
      target: document.querySelector('.g3w-map-controls-left-bottom'),
    });

    // retrieve global map instance (open layers)
    const map = GUI.getService('map').getMap();

    // base layers
    this.layers = layers.map(l => ApplicationState.project.getLayerById(l.id)).filter(Boolean);

    this.#opacityLayer = ApplicationState.project.getLayerById(layers.find(l => l.fixed)?.id);

    // retrieve current baselayer from: URL search params or browser storage
    const [base_opacity, base_id] = (new URLSearchParams(window.location.search).get('baselayer') || localStorage.getItem('baselayer'))?.split?.('+') || [0, null];

    // remove "baselayer" param from URL
    const url = new URL(window.location);
    url.searchParams.delete('baselayer');
    window.history.replaceState(null, null, url);

    this.layers.forEach(l => {
      l.config.toc = false;
      this.#toggleLayer(l, false);
    });

    if (this.#opacityLayer) {
      this.#opacityLayer.getState().opacity = parseFloat(base_opacity) * 100;
      this.#toggleLayer(this.#opacityLayer, true);
    }

    // activate base layer (if any)
    this.#activeLayer = ApplicationState.project.getLayerById(base_id);

    if (this.#activeLayer) {
      this.#toggleLayer(this.#activeLayer, true);
    }

    this.element.style.order = -1;

    // open layers control
    this.element.innerHTML = /*html*/`
      <button
        type="button"
        popovertarget="ol-wms-control-popover"
        data-placement="right"
        title="Choose a base layer"
        style="
          width:      90px;
          height:     90px;
          background: white url(${window.initConfig.staticurl}client/images/ol-wms-control.png) no-repeat center;
          border:     1px solid #ccc;
          cursor:     pointer;
        "
      ></button>
      <form popover id="ol-wms-control-popover" style="
        position-area: top span-right;
        margin-top: ${-145 - (30 * (this.layers.length-1) ) }px;
        ${'position-area' in document.body.style ? ' margin' : 'inset'}:unset;
        background: #fff;
        border:     1px solid #ccc;
        padding:    10px;
        min-width:  200px;
      ">
        <ul style="
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
              <li data-mapTypeId="${layer.getId()}" style="${layer === this.#opacityLayer ? 'border-top: thin solid;margin-top: auto;padding-top: 1em;' : ''}">
                <label style="width: 100%; cursor: ${layer === this.#opacityLayer ? 'default' : 'pointer'};">
                  ${
                    layer === this.#opacityLayer
                      ? /* html */`<i class="fa fa-check"></i>`
                      : /* html */`<input type="radio" name="activeLayer" ${ layer.isVisible() ? 'checked' : '' } />`
                  }
                  ${
                    layers.find(l => layer.getId() === l.id).thumbnail
                      ? /* html */ `<img loading="lazy" src="${layers.find(l => layer.getId() === l.id).thumbnail}" style="width: 51px;height: 28px;object-fit: cover; margin: 0 4px 0 8px" />`
                      : /* html */ `<i class="fas fa-layer-group" style="margin: 0 10px;"></i>`
                  }
                  ${ layer.getName() }
                </label>
              </li>`
            ).join('')
          }
        </ul>
        <hr style="margin: 10px 0;">
        <input list="ol-wms-control-opacity-markers" type="range" min="0" max="1" step="0.01" value="${(this.#opacityLayer?.getOpacity?.() ?? 0) / 100}" ${this.#opacityLayer ? '' : 'disabled'} />
        <datalist id="ol-wms-control-opacity-markers" style="display: flex; justify-content: space-between; font-size: small;">
          <option>0</option>
          <option>0.25</option>
          <option>0.50</option>
          <option>0.75</option>
          <option>1</option>
        </datalist>
      </form>
    `;

    // toggle base layers on click
    this.element.querySelector('ul').addEventListener('click', e => {
      if ('activeLayer' !== e.target.name) {
        return;
      }
      const li    = e.target.closest('li');
      const layer = li && ApplicationState.project.getLayerById(li.getAttribute('data-mapTypeId'));
      if (layer?.isVisible()) {
        this.#toggleLayer(layer, false);
        this.#activeLayer = null;
        e.target.checked = false;
      } else if (layer) {
        this.#toggleLayer(this.#activeLayer, false);
        this.#activeLayer = layer;
        this.#toggleLayer(this.#activeLayer, true);
      }
    });

    this.element.querySelector('input[type="range"]').addEventListener('input', debounce(e => {
      if (this.#opacityLayer) {
        this.#opacityLayer.getState().opacity = parseFloat(e.target.value) * 100;
        this.#opacityLayer.change();
      }
      localStorage.setItem('baselayer', [(this.#opacityLayer?.getOpacity?.() ?? 0) / 100, this.#activeLayer?.getId()].join('+').replace(/\+$/, ''));
    }));

    // automatically attach current control to map
    map.addControl(this);

    // custom URL param
    GUI.onbefore('getPermalink', (url, data) => {
      const baselayer = localStorage.getItem('baselayer');
      if (baselayer) {
        url.searchParams.set('baselayer', localStorage.getItem('baselayer'));
      }
    });

  }

  /** Keep layer visibility/checked status in sync */
  #toggleLayer(layer, visible) {
    layer?.setChecked?.(visible);
    layer?.setVisible?.(visible);
    layer?.change?.();
  }

}