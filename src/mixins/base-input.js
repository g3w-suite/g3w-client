/**
 * @file
 * @deprecated since 3.9.0. Will be removed in 4.x. Use g3wInputMixin instead. 
 */

import g3wInputMixin from './g3w-input';

export default {

  computed: {
    tabIndex:     g3wInputMixin.computed.tabIndex,
    notvalid:     g3wInputMixin.computed.notvalid,
    editable:     g3wInputMixin.computed.editable,
    showhelpicon: g3wInputMixin.computed.showhelpicon,
    disabled:     g3wInputMixin.computed.disabled,
    loadingState: g3wInputMixin.computed.loadingState,
  },

  methods: {
    showHideHelp: g3wInputMixin.methods.showHideHelp,
    mobileChange: g3wInputMixin.methods.mobileChange,
    change:       g3wInputMixin.methods.change,
    isVisible:    g3wInputMixin.methods.isVisible,
  },

};