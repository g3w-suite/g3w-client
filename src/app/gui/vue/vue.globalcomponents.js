import ImageComponent from 'components/GlobalImage.vue';
import GalleryImagesComponent from 'components/GlobalGallery.vue';
import GeospatialComponet  from 'components/GlobalGeo.vue';
import Skeleton from 'components/GlobalSkeleton.vue';
import BarLoader from 'components/GlobalBarLoader.js';
import Progressbar from 'components/GlobalProgressBar.js';
import HelpDiv from 'components/GlobalHelpDiv.vue';
import Resize from 'components/GlobalResize.vue'
import LayerPositions from 'components/GlobalLayerPositions.vue';
import DateTime from 'components/GlobalDateTime.vue';
import Range from 'components/GlobalRange.vue';
import ResizeIcon from 'components/GlobalResizeIcon.vue';
import Tabs from 'components/GlobalTabs.vue';
import Divider from 'components/GlobalDivider.vue';

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
