const { t } = require('core/i18n/i18n.service');
const { base, inherit, merge } = require('core/utils/utils');
const Component = require('gui/component/component');
const GUI = require('gui/gui');
const ProjectsRegistry = require('core/project/projectsregistry');
const compiledTemplate = Vue.compile(require('./menu.html'));

const fakeImage = '/static/client/images/FakeProjectThumb.png';

const InternalComponent = Vue.extend({
  ...compiledTemplate,
  data() {
    return {
      state: null,
      loading: false,
    };
  },
  methods: {
    trigger(item) {
      if (item.cbk) {
        // set full screen modal
        GUI.showFullModal({
          show: true,
        });
        GUI.setLoadingContent(true);
        const { gid } = item;
        item.cbk.call(item, {
          gid,
        }).then((promise) => {
          // changeProject is a setter so it return a promise
          promise
            .then((project) => document.title = project.state.html_page_title)
            .fail(() => {
              GUI.notify.error(`<h4>${t('error_map_loading')}</h4>`
                  + `<h5>${t('check_internet_connection_or_server_admin')}</h5>`);
            })
            .always(() => {
              GUI.showFullModal({
                show: false,
              });
              GUI.setLoadingContent(false);
            });
        });
      } else if (item.href) window.open(item.href, '_blank');
      else if (item.route) GUI.goto(item.route);
      else console.log(`No action for ${item.title}`);
    },
    logoSrc(src) {
      let imageSrc;
      if (src) {
        imageSrc = src.indexOf(ProjectsRegistry.config.mediaurl) !== -1 ? src : (src.indexOf('static') === -1 && src.indexOf('media') === -1)
          ? `${ProjectsRegistry.config.mediaurl}${src}` : fakeImage;
      } else imageSrc = fakeImage;
      return this.$options.host && `${this.$options.host}${imageSrc}` || imageSrc;
    },
  },
});

function MenuComponent(options = {}) {
  base(this, options);
  this.title = options.title || 'menu';
  this.state.visible = true;
  this.state.menuitems = options.menuitems;
  const { host } = options;
  merge(this, options);
  this.internalComponent = new InternalComponent({
    service: this,
    host,
  });
  this.internalComponent.state = this.state;
}
inherit(MenuComponent, Component);

const proto = MenuComponent.prototype;

proto.trigger = function (item) {};

module.exports = MenuComponent;
