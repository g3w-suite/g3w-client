import ApplicationState     from 'store/application-state';
import { getReducedSizes }  from 'utils/getReducedSizes';
import { setViewSizes }     from 'utils/setViewSizes';
import { layoutComponents } from 'utils/layoutComponents';

// main layout function
export function layout(event = null) {
  const reducesdSizes = getReducedSizes();
  setViewSizes(reducesdSizes.reducedWidth, reducesdSizes.reducedHeight);
  if (ApplicationState.viewport.immediate_layout) {
    layoutComponents(event);
  }
}