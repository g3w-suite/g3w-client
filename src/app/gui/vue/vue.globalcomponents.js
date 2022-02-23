import ImageComponent from './global-components/image.vue';
import GalleryImagesComponent from './global-components/gallery.vue';
import GeospatialComponet  from './global-components/geo.vue';
import Skeleton from './global-components/skeleton.vue';
import BarLoader from './global-components/bar-loader';
import Progressbar from './global-components/progressbar';
import HelpDiv from './global-components/helpdiv.vue';
import Resize from './global-components/resize.vue'
import DateTime from './global-components/datetime.vue';
import Range from './global-components/range.vue';
import ResizeIcon from './global-components/resize-icon.vue';
import Tabs from './global-components/tabs/tabs.vue';
import Divider from './global-components/divider.vue';

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
    Vue.component(DateTime.name, DateTime);
    Vue.component(Range.name, Range);
    Vue.component(ResizeIcon.name, ResizeIcon);
    Vue.component(Tabs.name, Tabs);
    Vue.component(Divider.name, Divider);
  }
};

module.exports = GlobalComponents;
