import ApplicationState from 'store/application-state';

/**
 * ORIGINAL SOURCE: src/services/viewport.js@v3.10.2
 */
export function getReducedSizes() {
  const contentEl = $('.content');
  let reducedWidth  = 0;
  let reducedHeight = 0;
  const sideBarToggleEl = $('.sidebar-aside-toggle');
  const is_fullview = ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel[`${ApplicationState.viewport.split === 'h'? 'width' : 'height'}_100`];
  if (contentEl && ApplicationState.viewport.secondaryVisible && is_fullview) {
    if (sideBarToggleEl && sideBarToggleEl.is(':visible')) {
      const toggleWidth = sideBarToggleEl.outerWidth();
      contentEl.css('padding-left', toggleWidth + 5);
      reducedWidth = (toggleWidth - 5);
    }
  } else {
    const toggleWidth = sideBarToggleEl.outerWidth();
    contentEl.css('padding-left', ApplicationState.viewport.secondaryPerc === 100 ? toggleWidth + 5 : 15);
  }
  return {
    reducedWidth,
    reducedHeight
  }
}