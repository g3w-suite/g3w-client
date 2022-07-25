import ImageComponent from 'components/G3WImage.vue';
import GalleryImagesComponent from 'components/G3WGallery.vue';
import GeospatialComponet  from 'components/G3WGeo.vue';
import Skeleton from 'components/G3WSkeleton.vue';
import BarLoader from 'components/G3WBarLoader.js';
import Progressbar from 'components/G3WProgressBar.js';
import HelpDiv from 'components/G3WHelpDiv.vue';
import Resize from 'components/G3WResize.vue'
import LayerPositions from 'components/G3WLayerPositions.vue';
import DateTime from 'components/G3WDateTime.vue';
import Range from 'components/G3WRange.vue';
import ResizeIcon from 'components/G3WResizeIcon.vue';
import Tabs from 'components/G3WTabs.vue';
import Divider from 'components/G3WDivider.vue';

const GlobalComponents = {
  install(Vue) {
    Vue.component(ImageComponent.name, ImageComponent);
    Vue.component(GalleryImagesComponent.name, GalleryImagesComponent);
    Vue.component(GeospatialComponet.name, GeospatialComponet);
    Vue.component(BarLoader.name, BarLoader);
    Vue.component(Progressbar.name, Progressbar);
    Vue.component(Skeleton.name, Skeleton);
    Vue.component(HelpDiv.name, HelpDiv);
    Vue.component(Resize.name, Resize);
    Vue.component(LayerPositions.name, LayerPositions);
    Vue.component(DateTime.name, DateTime);
    Vue.component(Range.name, Range);
    Vue.component(ResizeIcon.name, ResizeIcon);
    Vue.component(Tabs.name, Tabs);
    Vue.component(Divider.name, Divider);
  }
};

module.exports = GlobalComponents;
