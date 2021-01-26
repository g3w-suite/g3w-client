const GUI = require('gui/gui');

export function init(){
  const metadataComponent = GUI.getComponent('metadata');
  const service = metadataComponent.getService();
}