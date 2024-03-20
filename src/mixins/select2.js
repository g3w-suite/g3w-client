/**
 * @file
 * @since v3.7
 */

import ApplicationState from 'store/application-state';
import resizeMixin from 'mixins/resize';

export default {
  mixins: [resizeMixin],
  methods: {
    setValue() {
      this.select2.val(this.state.value).trigger('change');
    },
    resize() {
      this.select2 && !ApplicationState.ismobile && this.select2.select2('close');
    }
  },
  beforeDestroy() {
    //destroy a select2  dom element
    this.select2 && this.select2.select2('destroy');
    // remove all event
    this.select2.off();
    this.select2 = null;
  }
};