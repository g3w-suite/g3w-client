import GUI                    from 'services/gui';
import { InteractionControl } from 'g3w-ol/controls/interactioncontrol';
import AreaIteraction         from 'g3w-ol/interactions/areainteraction';
import LengthInteraction      from 'g3w-ol/interactions/lengthinteraction';

const INTERACTIONSCLASS = {
  area:   AreaIteraction,
  length: LengthInteraction,
}
module.exports = class MeasureControl extends InteractionControl {
  constructor(opts = {}) {
    super({
      ...opts,
      clickmap: true,
      label:    "\ue908",
      enabled:  true,
      onToggled() {
        //active or deactive current iteraction
        this._interaction.setActive(this.isToggled());
        //in case is not toggled
        if (!this.isToggled()) {
          this._interaction.clear();
          //check if first interaction is current interaction
          if (this.interactions[this.types[0]] !== this._interaction) {
            //reomve current interaction from map
            this.getMap().removeInteraction(this._interaction);
            this._interaction = this.interactions[this.types[0]];
            //add first interaction
            this.getMap().addInteraction(this._interaction);
          }
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
   * @since 3.11.0
   * @param type <String> area or length
   */
  addType(type) {
    this.types.push(type);
    this.interactions[type] = new INTERACTIONSCLASS[type](this._interactionClassOptions);
    this.interactions[type].setActive(false);

    if (!this._interaction) { this._interaction = this.interactions[type] }

    if (this.types.length > 1 && !this.toggledTool) { this.createControlTool() }
  };

  createControlTool() {
    const types = this.types;
    return super.createControlTool({
      type: 'custom',
      component: {
        __title: 'sdk.mapcontrols.measures.title',
        data() {
          return {
            types,
            type: types[0],
          }
        },
        template: `
          <div style="width: 100%; padding: 5px;">
            <select ref="select" style="width: 100%" :search="false" v-select2="'type'">
              <option v-for="type in types" :value="type" v-t = "'sdk.mapcontrols.measures.' + type + '.tooltip'"></option>
            </select>
          </div>`,
        watch: {
          'type': (ntype, otype) => this.changeMeasureInteraction(ntype, otype)
        },
        created() {
          GUI.setCloseUserMessageBeforeSetContent(false);
        },
        beforeDestroy() {
          GUI.setCloseUserMessageBeforeSetContent(true);
        }
      }
    });
  }

  changeMeasureInteraction(ntype, otype) {
    const map = this.getMap();
    //deactive old interaction
    this.interactions[otype].setActive(false);
    this.interactions[otype].clear();
    map.removeInteraction(this.interactions[otype]);
    //add and active new interacion
    map.addInteraction(this.interactions[ntype]);
    this.interactions[ntype].setActive(true);
    this._interaction = this.interactions[ntype];
  }

}