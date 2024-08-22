import { VIEWPORT }     from 'app/constant';
import ApplicationState from 'store/application-state';

export function setViewSizes() {
  const state = ApplicationState.viewport;

  const primaryView   = state.primaryView;
  const secondaryView = 'map' === state.primaryView ? 'content' : 'map';
  const main_sidebar  = $(".main-sidebar");
  const offset         = main_sidebar.length && main_sidebar.offset().left;
  const width = main_sidebar.length && main_sidebar[0].getBoundingClientRect().width;
  const sideBarSpace   = width + offset;
  const viewportWidth = $('#app')[0].getBoundingClientRect().width - sideBarSpace;
  const viewportHeight = $(document).innerHeight() - $('.navbar-header').innerHeight();
  // assign all width and height of the view to primary view (map)
  let primaryWidth;
  let primaryHeight;
  let secondaryWidth;
  let secondaryHeight;
  // percentage of secondary view (content)
  const is_fullview = ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel[`${state.split === 'h'? 'width' : 'height'}_100`];
  const content_perc = ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel['h' === state.split ? 'width': 'height'];
  const scale = (state.secondaryPerc !== 100 && !is_fullview ? content_perc : 100) / 100;
  if ('h' === state.split ) {
    secondaryWidth  = state.secondaryVisible ? Math.max((viewportWidth * scale), VIEWPORT.resize.content.min) : 0;
    secondaryHeight = viewportHeight;
    primaryWidth    = viewportWidth - secondaryWidth;
    primaryHeight   = viewportHeight;
  } else {
    secondaryWidth  = viewportWidth;
    secondaryHeight = state.secondaryVisible ? Math.max((viewportHeight * scale), VIEWPORT.resize.content.min) : 0;
    primaryWidth    = state.secondaryVisible && scale === 1 ? 0 : viewportWidth;
    primaryHeight   = viewportHeight - secondaryHeight;
  }
  state[primaryView].sizes.width    = primaryWidth;
  state[primaryView].sizes.height   = primaryHeight;
  state[secondaryView].sizes.width  = secondaryWidth;
  state[secondaryView].sizes.height = secondaryHeight;
}