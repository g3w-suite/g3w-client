import { SPATIAL_METHODS }    from 'app/constant';
import GUI                    from 'services/gui';
import { InteractionControl } from 'g3w-ol/controls/interactioncontrol';

const { t }                   = require('core/i18n/i18n.service');

module.exports = class MeasureControl extends InteractionControl {

  constructor(opts = {}) {
    super({
      ...opts,
      clickmap: true,
      label:    "\ue903",
      tipLabel: "sdk.mapcontrols.queryby.title",
      enabled:  true,
      // onToggled() {
      //   // toggle current iteraction
      //   this._interaction.setActive(this.isToggled());
      //   const toggled = this.isToggled();
      //   // when not toggled
      //   if (!toggled) {
      //     this._interaction.clear();
      //   }
      //   // check if first interaction is current interaction
      //   if (!toggled && this.interactions[this.types[0]] !== this._interaction) {
      //     //reomve current interaction from map
      //     this.getMap().removeInteraction(this._interaction);
      //     this._interaction = this.interactions[this.types[0]];
      //     //add first interaction
      //     this.getMap().addInteraction(this._interaction);
      //   }
      // }
    });

    this.types = [];

    (opts.types || []).forEach(type => this.addType(type));

    // no type set, hide control
    if (0 === this.types.length) {
      this.setVisible(false);
    }
  }

  /**
   * @param { 'area' | 'length' } type 
   *
   * @since 3.11.0
   */
  addType(type) {
    this.types.push(type);

    if (!this.toggledTool) {
      this.createControlTool();
    }
  }

  createControlTool() {
    return super.createControlTool({
      type: 'custom',
      component: {
        __title: 'sdk.mapcontrols.queryby.title',
        data: () => ({
          types: this.types,
          type: this.types[0],
          methods: SPATIAL_METHODS,
          method: this.getSpatialMethod(),
        }),
        template: /* html */ `
          <div style="width: 100%;">
            <div style="padding: 5px;">
              <select :search="false" v-select2="'type'">
                <option v-for="type in types" :value="type" v-t="'sdk.mapcontrols.queryby.' + type + '.tooltip'"></option>
              </select>
            </div>
            <div style="padding: 5px;">
              <select :search="false" v-select2="'method'">
                <option v-for="method in methods">{{ method }}</option>
              </select>
            </div>
            <p style="text-align: center;"><a href="#" @click.prevent="help">Help</a></p>
            <button class="btn btn-block btn-success" @click="confirm">OK</button>
          </div>`,
        watch: {
          method: m => this.setSpatialMethod(m),
        },
        methods: {
          help() {
            const control = GUI.getService('map').getMapControlByType(this.type);
            GUI.showModalDialog({
              title: t(control._help.title),
              message: t(control._help.message),
            });
          },
          confirm() {
            const control = GUI.getService('map').getMapControlByType(this.type);
            control.toggle(true);
          },
        },
        created()       { GUI.setCloseUserMessageBeforeSetContent(false); },
        beforeDestroy() { GUI.setCloseUserMessageBeforeSetContent(true); }
      }
    });
  }

}