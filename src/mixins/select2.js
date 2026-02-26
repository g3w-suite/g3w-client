/**
 * @file
 * @since v3.7
 */

import ApplicationState from 'g3w-state';
import resizeMixin      from 'mixins/resize';

export default {
  mixins: [resizeMixin],
  methods: {
    setValue() {
      // @since 4.0.8 force string type (otherwise Boolean values are not set correctly)
      // https://github.com/g3w-suite/g3w-admin/issues/1294
      this.select2.val(`${this.state.value}`).trigger('change');
    },
    resize() {
      if (this.select2 && !ApplicationState.ismobile) {
        this.select2.select2('close');
      }
    }
  },
  beforeDestroy() {
    //destroy a select2  dom element
    if (this.select2) {
      this.select2.select2('destroy');
      // remove all events
      this.select2.off();
      this.select2 = null;
    }
  }
};