/**
 * @file
 * @since 3.10.0
 */

import Component          from 'core/g3w-component';
import ProjectsRegistry   from 'store/projects';
import ApplicationService from 'services/application';

import * as vueComp       from 'components/ProjectsMenu.vue';

/**
 * ORIGINAL SOURCE:
 *  - src/app/gui/projectsmenu/projectsmenu.js@v3.9.3
 *  - src/app/gui/projectsmenu/menu.js@v3.9.3
 */
export default function (opts={}) {
  return new Component({
    ...opts,
    id: 'projectsmenu',
    title: opts.title || 'menu',
    internalComponent: new (Vue.extend(vueComp))({
      host: opts.host,
      state: {
        menuitems: (opts.projects || ProjectsRegistry.getListableProjects()).map(p => ({
          title:       p.title,
          description: p.description,
          thumbnail:   p.thumbnail,
          gid:         p.gid,
          cbk:         opts.cbk || ((o = {}) => ApplicationService.changeProject({ host: opts.host, gid: o.gid })),
        }))
      },
    }),
  });
}