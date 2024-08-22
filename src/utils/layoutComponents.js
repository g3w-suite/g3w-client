import ApplicationState    from 'store/application-state';

import { getReducedSizes } from 'utils/getReducedSizes';
import { setViewSizes }    from 'utils/setViewSizes';

/**
 * load components of viewport after right size setting
 * 
 * ORIGINAL SOURCE: src/services/viewport.js@v3.10.2
 */
export function layoutComponents(event = null) {
  requestAnimationFrame(() => {
    const reducesdSizes = getReducedSizes();
    const reducedWidth  = reducesdSizes.reducedWidth || 0;
    const reducedHeight = reducesdSizes.reducedHeight || 0;
    // for each component
    setViewSizes();
    Object.entries(ApplicationState.viewport.components).forEach(([name, component]) => {
      const width = ApplicationState.viewport[name].sizes.width - reducedWidth ;
      const height = ApplicationState.viewport[name].sizes.height - reducedHeight;
      component.layout(width, height);
    });
    if (event) {
      setTimeout(() => { /*this.emit(event);*/ GUI.emit(event); })
    }
  });
}