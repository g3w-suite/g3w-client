_gis3wlib._interaction.prototype.addInteraction = function(type){

    var interaction = new this[type]();
    return interaction


};
_gis3wlib._interaction.prototype.removeInteraction = function(interaction){

    this.map.removeInteraction(interaction);


};