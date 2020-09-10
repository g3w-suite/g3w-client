import ImageComponent from './global-components/image.vue';
import GalleryImagesComponent from './global-components/gallery.vue';
import GeospatialComponet  from './global-components/geo.vue';
import Skeleton from './global-components/skeleton.vue';
import BarLoader from './global-components/bar-loader';

const GlobalComponents = {
  install(Vue) {
    Vue.component(ImageComponent.name, ImageComponent);
    Vue.component(GalleryImagesComponent.name, GalleryImagesComponent);
    Vue.component(GeospatialComponet.name, GeospatialComponet);
    Vue.component(BarLoader.name, BarLoader);
    Vue.component(Skeleton.name, Skeleton);
  }
};

module.exports = GlobalComponents;
