import GUI                    from 'services/gui';
import { InteractionControl } from 'g3w-ol/controls/interactioncontrol';

const AreaInteraction         = require('g3w-ol/interactions/areainteraction');
const LengthInteraction       = require('g3w-ol/interactions/lengthinteraction');

export class MeasureControl extends InteractionControl {

  constructor(opts = {}) {
    super({
      ...opts,
      clickmap: true,
      enabled:  true,
      onToggled(toggled) {
        // toggle current iteraction
        this._interaction.setActive(this.isToggled());
        // when not toggled
        if (!toggled) { this._interaction.clear() }
        // check if first interaction is current interaction
        if (!toggled && this.interactions[this.types[0]] !== this._interaction) {
          //remove current interaction from the map
          this.getMap().removeInteraction(this._interaction);
          this._interaction = this.interactions[this.types[0]];
          //add first interaction
          this.getMap().addInteraction(this._interaction);
        }
      }
    });

    this.types = [];

    this.interactions = {};

    (opts.types || []).forEach(type => this.addType(type));

    // no type set, hide control
    if (0 === this.types.length) {
      this.setVisible(false);
    }

    this.on('setMap', e => e.map.addInteraction(this._interaction));
  }

  /**
   * @param { 'area' | 'length' } type 
   *
   * @since 3.11.0
   */
  addType(type) {
    this.types.push(type);

    this.interactions[type] = new ({
      area:   AreaInteraction,
      length: LengthInteraction,
    })[type](this._interactionClassOptions);

    this.interactions[type].setActive(false);

    if (!this._interaction) {
      this._interaction = this.interactions[type];
    }

    if (this.types.length > 1 && !this.toggledTool) {
      this.createControlTool();
    }
  }

  createControlTool() {
    return super.createControlTool({
      type: 'custom',
      component: {
        __title: 'sdk.mapcontrols.measures.title',
        data: () => ({ types: this.types, type: this.types[0] }),
        template: /* html */ `
          <div style="width: 100%; padding: 5px;">
            <select ref="select" style="width: 100%" :search="false" v-select2="'type'">
              <option v-for="type in types" :value="type" v-t="'sdk.mapcontrols.measures.' + type + '.tooltip'"></option>
            </select>
          </div>`,
        watch: {
          // change measure interaction
          type: (ntype, otype) => {
            // deactivate previous interaction
            this.interactions[otype].setActive(false);
            this.interactions[otype].clear();
            this.getMap().removeInteraction(this.interactions[otype]);
            // activate new interacion
            this.getMap().addInteraction(this.interactions[ntype]);
            this.interactions[ntype].setActive(true);
            this._interaction = this.interactions[ntype];
          },
        },
        created()       { GUI.setCloseUserMessageBeforeSetContent(false); },
        beforeDestroy() { GUI.setCloseUserMessageBeforeSetContent(true); }
      }
    });
  }

}