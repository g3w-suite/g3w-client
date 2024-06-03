/**
 * @file
 * @since 3.10.0
 */

import Panel        from 'core/g3w-panel';

import * as vueComp from 'components/QueryBuilder.vue';

const { t } = require('core/i18n/i18n.service');

/**
 * ORIGINAL SOURCE: src/app/gui/querybuilder/querybuilderuifactory.js@v3.9.3
 */
export default {
  show: ({ opts = {} } = {}) => (new Panel(Object.assign(opts, {
      title: t('sdk.querybuilder.title'),
      show: true,
      internalPanel: new (Vue.extend(vueComp))(opts),
    }))).getInternalPanel(),
};