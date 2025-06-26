/**
 * @fil ORIGINAL SOURCE: src/components/MapControlZoomHistory.vue@v3.11.10
 * @since 4.0.0
 */

import ApplicationState    from 'store/application';
import GUI                 from 'services/gui';
import { debounce }        from 'utils/debounce';
import { languageIsReady } from 'g3w-i18n';

// wait for map ready
GUI.once('ready', async () => {
  const map = GUI.getService('map');
  map.setupControl.zoomhistory = function() {
    map.createMapControl({
      id: 'zoomhistory',
      add: false,
      options: {
        ol: new (class extends ol.control.Control {
          constructor() {
            super({
              element: Object.assign(document.createElement('div'), { className: 'ol-zoom-history ol-unselectable ol-control' }),
              target: document.querySelector('.g3w-map-controls-left-bottom'),
            });
            const map     = GUI.getService('map').getMap();
            const history = [];
            let curr      = 0;
            this.element.style.display = 'flex';
            this.element.style.gap     = '5px';
            this.element.innerHTML     = /* html */`
              <div><button type="button" value="last" class="fas fa-reply g3w-disabled" style="font-weight: 900;"></button></div>
              <div><button type="button" value="next" class="fas fa-share g3w-disabled" style="font-weight: 900;"></button></div>
            `;
            (new Vue).$watch(
              () => ApplicationState.language, 
              async (lang) => { 
                await languageIsReady(lang); 
                this.element.querySelectorAll('button')
                  .forEach(btn => btn.parentElement.title = btn.parentElement.dataset.originalTitle = g3wsdk.core.i18n.t('last' === btn.value ? 'sdk.mapcontrols.zoomhistory.zoom_last' : 'sdk.mapcontrols.zoomhistory.zoom_next'))
                }, 
              { immediate: true } 
            );
            this.element.querySelectorAll('button').forEach(btn => {
              $(btn.parentElement).tooltip({ placement: 'top', container: 'body' });
              btn.addEventListener('click', e => {
                curr += 'last' === e.currentTarget.value ? -1 : +1;
                GUI.getService('map').getMap().getView().fit(history.at(curr));
                this.element.querySelector('button[value=last]').classList.toggle('g3w-disabled', 0 === curr);
                this.element.querySelector('button[value=next]').classList.toggle('g3w-disabled', history.length - 1 === curr);
              })
            });
            history.push(map.getView().calculateExtent(map.getSize()));
            map.getView().on('change' , debounce(() => {
              if (curr !== history.length - 1) {
                history.splice((curr - history.length) + 1);
              }
              history.push(map.getView().calculateExtent(map.getSize()));
              curr++;
              this.element.querySelector('button[value=last]').classList.toggle('g3w-disabled', 0 === curr);
              this.element.querySelector('button[value=next]').classList.toggle('g3w-disabled', history.length - 1 === curr);
            }, 600));
            GUI.getService('map').getMap().addControl(this);
          }
        })
      }
    });
  };
});