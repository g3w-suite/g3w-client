/**
 * @since 3.9.0
 */
import * as vueComponentOptions from 'components/MapRoute.vue';

const { base, inherit } = require('core/utils/utils');
const Component = require('gui/component/component');

const InternalComponent = Vue.extend(vueComponentOptions);

const MapRouteComponent = function(options={}) {
    base(this);
    const {legs} = options;
    const internalComponent = new InternalComponent({legs});
    this.setInternalComponent(internalComponent);
    this.unmount = function() {
        return base(this, 'unmount');
    }
};

inherit(MapRouteComponent, Component);

module.exports = MapRouteComponent;


