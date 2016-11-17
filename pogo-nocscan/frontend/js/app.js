﻿window.fe = (function() {
    var pokeTable = ["", "Bulbasaur","Ivysaur","Venusaur","Charmander","Charmeleon","Charizard","Squirtle","Wartortle","Blastoise","Caterpie","Metapod","Butterfree","Weedle","Kakuna","Beedrill","Pidgey","Pidgeotto","Pidgeot","Rattata","Raticate","Spearow","Fearow","Ekans","Arbok","Pikachu","Raichu","Sandshrew","Sandslash","Nidoran♀","Nidorina","Nidoqueen","Nidoran♂","Nidorino","Nidoking","Clefairy","Clefable","Vulpix","Ninetales","Jigglypuff","Wigglytuff","Zubat","Golbat","Oddish","Gloom","Vileplume","Paras","Parasect","Venonat","Venomoth","Diglett","Dugtrio","Meowth","Persian","Psyduck","Golduck","Mankey","Primeape","Growlithe","Arcanine","Poliwag","Poliwhirl","Poliwrath","Abra","Kadabra","Alakazam","Machop","Machoke","Machamp","Bellsprout","Weepinbell","Victreebel","Tentacool","Tentacruel","Geodude","Graveler","Golem","Ponyta","Rapidash","Slowpoke","Slowbro","Magnemite","Magneton","Farfetch’d","Doduo","Dodrio","Seel","Dewgong","Grimer","Muk","Shellder","Cloyster","Gastly","Haunter","Gengar","Onix","Drowzee","Hypno","Krabby","Kingler","Voltorb","Electrode","Exeggcute","Exeggutor","Cubone","Marowak","Hitmonlee","Hitmonchan","Lickitung","Koffing","Weezing","Rhyhorn","Rhydon","Chansey","Tangela","Kangaskhan","Horsea","Seadra","Goldeen","Seaking","Staryu","Starmie","Mr. Mime","Scyther","Jynx","Electabuzz","Magmar","Pinsir","Tauros","Magikarp","Gyarados","Lapras","Ditto","Eevee","Vaporeon","Jolteon","Flareon","Porygon","Omanyte","Omastar","Kabuto","Kabutops","Aerodactyl","Snorlax","Articuno","Zapdos","Moltres","Dratini","Dragonair","Dragonite","Mewtwo","Mew"];

    var scanners = ko.observableArray([]);
    var currentAccount = ko.observable();
    var displayedCell = ko.observable();

    var scannerInstances = {};
    var encounterMarkers = {};

    var allCatchable = ko.observableArray([]);
    var allNearby = ko.observableArray([]);

    var map;    
    var displayedCellPoly;
    var activeAccountMarker;

    var showTimeout;

    function getScanners() {
        $.getJSON("/scanners", function(data) {
            scanners(data);

            // Create scanner instances for those that don't exist.
            _.each(data, function(scannerName) {
                if(!(scannerName in scannerInstances))
                    scannerInstances[scannerName] = scannerInstance(scannerName);
            });

            // Kill those that don't exist anymore.
            _.forOwn(scannerInstances, function(instance, scannerName) {
                if(_.find(data, function(item) { return item == scannerName; }) == null) {
                    instance.kill();
                    delete scannerInstances[scannerName];
                }
            });

            if(currentAccount() == null)
                showAccount(data[0]);
        });
    }

    function createEncounterMarker(encounter) {
        // Check if we have already created a marker for this encounter.
        if(encounter.encounter_id in encounterMarkers)
            return;

        // Create the encounter marker.
        encounterMarkers[encounter.encounter_id] = new PokeMarker(
            new google.maps.LatLng(encounter.latitude, encounter.longitude), 
            map,
            {
                id: encounter.pokemon_id
            }
        );
        //encounterMarkers[encounter.encounter_id].setZIndex(5);
    }

    function scannerInstance(name) {
        var nearbyCircle;
        var catchableCircle;

        var pollInterval = window.setInterval(poll, 10000);
        poll();

        function poll() {
            $.getJSON("/mapobjects/" + name, handleMapObjects);
            $.getJSON("/position/" + name, handlePosition);
        }

        function handleMapObjects(mapObjects) {
            var tmpNearby = [];
            var tmpCatchable = [];

            if(mapObjects != null && map != null) {
                _.each(mapObjects.map_cells, function(cell, idx) {                
                    _.each(cell.catchable_pokemons, function(item) {
                        item.s2_cell_id = cell.s2_cell_id; 
                        tmpCatchable.push(item);

                        createEncounterMarker(item);
                    });
                    _.each(cell.nearby_pokemons, function(item) { 
                        item.s2_cell_id = cell.s2_cell_id; 
                        tmpNearby.push(item); 
                    });
                });
            }
        
            if(name == currentAccount()) {
                allNearby(tmpNearby);
                allCatchable(tmpCatchable);
            }
        }

        function handlePosition(data) {
            if(map != null && data != null) {
                if(name == currentAccount()) {
                    map.setCenter(data);

                    if(activeAccountMarker == null) {
                        activeAccountMarker = new google.maps.Marker({
                            position: data,
                            map: map,
                            zIndex: 99999999
                        });
                    } else {
                        activeAccountMarker.setPosition(data);
                    }
                }

                if(nearbyCircle != null) 
                    nearbyCircle.setCenter(data);
                else {
                    nearbyCircle = new google.maps.Circle({
                        strokeColor: '#00FF00',
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: '#00FF00',
                        fillOpacity: 0.35,
                        map: map,
                        center: data,
                        radius: 200,
                        zIndex: 1
                    });
                }

                if(catchableCircle != null)
                    catchableCircle.setCenter(data);
                else {        
                    catchableCircle = new google.maps.Circle({
                        strokeColor: '#0000FF',
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: '#0000FF',
                        fillOpacity: 0.35,
                        map: map,
                        center: data,
                        radius: 70,
                        zIndex: 2
                    });
                }
            }
        }

        function kill() {
            window.clearInterval(pollInterval);
            if(nearbyCircle != null) nearbyCircle.setMap(null);
            if(catchableCircle != null) catchableCircle.setMap(null);
        }        

        return {
            poll: poll,
            kill: kill,        
            nearbyCircle: nearbyCircle,
            catchableCircle: catchableCircle
        }
    }

    function showAccount(account) {
        currentAccount(account);
        scannerInstances[currentAccount()].poll();
    }

    function clearAll() {
        currentAccount(null);
        allCatchable([]);
        allNearby([]);
    }
    
    google.maps.event.addDomListener(window, 'load', initMap);
    function initMap() {
        console.log("Initializing map...");

        map = new google.maps.Map(document.getElementById('map'), {
          zoom: 17,
          center: {lat: 0, lng: 0}
        });

        window.setInterval(getScanners, 10000);
        getScanners();
    }

    function showMenu(id) {
        $('.popout-menu').slideUp();

        if($('#' + id).is(':visible'))
            $('#' + id).slideUp();
        else
            $('#' + id).slideDown();
    }

    function highlightCell(cellId) {
        if(displayedCell() == cellId)
            return;
        
        displayedCell(cellId);

        var key = S2.S2Cell.idToKey(cellId);
        var corners = S2.S2Cell.FromHilbertQuadKey(key).getCornerLatLngs();

        if(displayedCellPoly != null)
            displayedCellPoly.setMap(null);
        
        displayedCellPoly = new google.maps.Polygon({
          paths: corners,
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0.35,
          zIndex: 3
        });
        displayedCellPoly.setMap(map);
    }

    /**
     * START CUSTOM MARKER
     * ------------------------------------------------------------------------
     */
    var cMarkerId = 0;
    function PokeMarker(latlng, map, args) {
        this.latlng = latlng;	
        this.args = args;	
        this.setMap(map);	

        cMarkerId++;
        this.markerId = cMarkerId;
    }

    PokeMarker.prototype = new google.maps.OverlayView();

    PokeMarker.prototype.draw = function() {
        
        var self = this;
        
        var div = this.div;
        
        if (!div) {
        
            div = this.div = document.createElement('div');
            
            div.className = 'marker';
            
            div.style.position = 'absolute';
            div.style.cursor = 'pointer';
            div.style.width = '40px';
            div.style.height = '40px';
            div.style.background = 'rgba(0, 0, 0, 0.3)';
            div.style['background-image'] = "url(/frontend/img/pokemon/" + self.args.id + ".png)";
            div.style['background-repeat'] = "no-repeat";
            div.style['background-size'] = "contain";
            div.style['background-position'] = "center center";
            div.style['border-radius'] = "40px";
            div.style['border'] = "5px solid rgba(0, 0, 0, 0.3)";
            div.style['z-index'] = "5";

            div.innerHTML = "<div class='marker-notch'></div>"

            div.id = "mrk-" + self.markerId;
            
            google.maps.event.addDomListener(div, "click", function(event) {			
                google.maps.event.trigger(self, "click");
            });
            
            var panes = this.getPanes();
            panes.overlayImage.appendChild(div);
        }
        
        var point = this.getProjection().fromLatLngToDivPixel(this.latlng);
        
        if (point) {
            div.style.left = (point.x - 20) + 'px';
            div.style.top = (point.y - 50) + 'px';
        }
    };

    PokeMarker.prototype.remove = function() {
        if (this.div) {
            this.div.parentNode.removeChild(this.div);
            this.div = null;
        }	
    };

    PokeMarker.prototype.getPosition = function() {
        return this.latlng;	
    };


    return {
        pokeTable: pokeTable,

        showAccount: showAccount,
        showMenu: showMenu,
        initMap: initMap,
        highlightCell: highlightCell,

        scanners: scanners,                
        allNearby: allNearby,
        allCatchable: allCatchable
    };
})();


ko.applyBindings(window.fe);