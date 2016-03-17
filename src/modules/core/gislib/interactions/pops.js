/* POP UP SECTION*/

_gis3wlib._interaction.prototype.addPopup = function(element){



        this.popup = new ol.Overlay({
            element: element,
            autoPan: true,
            autoPanAnimation: {
                duration: 250
            }
        });


        this.map.addOverlay(this.popup);

};

_gis3wlib._interaction.prototype.closePopup = function(){
        if (this.popup){
            this.popup.setPosition(undefined);
            this.popup.getElement().blur();
        }
};

///* END  POP UP SECTION*/