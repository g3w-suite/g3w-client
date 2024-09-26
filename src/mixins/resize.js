/**
 * @file
 * @since v3.7
 */

import GUI          from 'services/gui';
import { throttle } from 'utils/throttle';
import { debounce } from 'utils/debounce';

const DELAY_TYPE = {
  throttle,
  debounce,
};

export default {
  created() {
    const delayWrapper = this.delayType && DELAY_TYPE[this.delayType] || DELAY_TYPE.throttle;
    this.delayResize   = this.resize ? delayWrapper(this.resize.bind(this), this.delayTime): null;
    GUI.on('resize', this.delayResize);
  },
  async mounted() {
    await this.$nextTick();
    if (this.resize) { this.resize(); }
  },
  beforeDestroy() {
    GUI.off('resize', this.delayResize);
    this.delayResize = null;
    this.delayTime   = null;
  }
};