const mapboxgl = require('mapbox-gl')
const MapboxGeocoder = require('@mapbox/mapbox-gl-geocoder');
const polylabel = require('polylabel')
var intersect = require('@turf/intersect');

mapboxgl.accessToken = 'pk.eyJ1IjoiYnl0aGViYXlkb3Rjb29sIiwiYSI6ImNqajh5eDEwbTMxOXIza3Q0dmhxNnowemkifQ.kgcdaQINw8_7719QVmmT-w';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/bythebaydotcool/cjkk9y9mk5en52qmw32fh7uo7',
  center: [-122.437890, 37.751650],
  zoom: 11.9
});

var districtCentroid = {};
districtCentroid.type = "FeatureCollection";
districtCentroid.features = [];

map.on('load', () => {

  //-- add source for outline
  map.addSource('supervisorDistrictsOutline', {
    type: 'vector',
    url: 'mapbox://bythebaydotcool.dwzd9fsl'
  });

  //-- add layer of outline
  map.addLayer({
    'id': 'supervisor_outline',
    'type': 'line',
    'source': 'supervisorDistrictsOutline',
    'source-layer': 'Current_Supervisor_Districts-62jupx',
    'paint': {
      'line-color': [
        "interpolate",
        ["linear"],
        ["zoom"],
        9,
        "hsla(0, 0%, 27%, 0.5)",
        22,
        "hsla(0, 0%, 0%, 0.5)"
      ],
      'line-width': [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        0.5,
        22,
        3
      ],
    }
  }, 'road-label');

  //-- defines the conditional color layout for fills
  const colorsPerDistrictFilter = [
    "match",
    ["get", "supervisor"],
    "1",
    "hsl(360, 100%, 81%)",
    "2",
    "hsl(108, 99%, 26%)",
    "4",
    "hsl(288, 72%, 64%)",
    "5",
    "hsl(280, 78%, 50%)",
    "3",
    "hsl(190, 100%, 53%)",
    "6",
    "hsl(16, 94%, 60%)",
    "7",
    "hsl(143, 87%, 51%)",
    "8",
    "hsl(211, 100%, 48%)",
    "9",
    "hsl(345, 98%, 56%)",
    "10",
    "hsl(36, 94%, 57%)",
    "11",
    "hsl(54, 100%, 62%)",
    "hsl(0, 0%, 63%)"
  ];
  //-- defines the textsize interpolation based on zoom
  const textSizeInterpolation = [
     "interpolate",
     ["exponential", 1.26],
     ["zoom"],
     8,
     16,
     17,
     48
   ];
   //-- defines the layout. it's repeated, hence the definition.
  const numberLabelsLayout = {
    'text-field': '{supervisor}',
    'text-font': ["Roboto Bold"],
    'text-size': textSizeInterpolation,
    "text-padding": 3,
    "text-letter-spacing": 0.1,
    "text-max-width": 7,
    "text-transform": "uppercase"
  };
  //-- add layer for fill for supervisors
  map.addLayer({
    'id': 'supervisor-fill',
    'type': 'fill',
    'source': 'supervisorDistrictsOutline',
    'source-layer': 'Current_Supervisor_Districts-62jupx',
    'paint': {
      'fill-opacity': .36,
      'fill-color': colorsPerDistrictFilter,
    },
  }, 'landuse');



  //-- filter for geocoder autocomplete
  const filterGeo = (item) => {
    return item.context.map((i) => {
      return (i.id.split('.').shift() === 'place' && i.text === 'San Francisco' );
    }).reduce((acc, cur) => {
      return acc || cur;
    });
  };
  //-- config for geocoder
  const geoConfig = {
    accessToken: mapboxgl.accessToken,
    zoom: 14,
    country: 'us',
    flyTo: true,
    filter: filterGeo,
    autocomplete: true,
    placeholder: "Type your address",
  };
  //-- point for geocoder
  map.addSource('single-point', {
      "type": "geojson",
      "data": {
        "type": "FeatureCollection",
        "features": []
      }
  });

  map.addLayer({
      "id": "point",
      "source": "single-point",
      "type": "circle",
      "paint": {
        "circle-radius": 8,
        "circle-color": "#552CE0",
      }
  });


  var geocoder = new MapboxGeocoder(geoConfig)

  //-- get text input box and add to map
  document.getElementById('geocoder').appendChild(geocoder.onAdd(map));
  // Listen for the `result` event from the MapboxGeocoder that is triggered when a user
   // makes a selection and add a symbol that matches the result.
   geocoder.on('result', function(ev) {
       map.getSource('single-point').setData(ev.result.geometry);
     }
   );
   //-- first places the labels without having to calculate the dynamic centroids
   map.addLayer({
       "id": "district_label",
       "type": "symbol",
       "source": 'supervisorDistrictsOutline',
       "source-layer": "Current_Supervisor_Districts-62jupx",
       "layout": numberLabelsLayout,
       "paint": {
         "text-color": '#fff',
         "text-halo-color": colorsPerDistrictFilter,
         "text-halo-width": 10,
         "text-halo-blur": 0,
       }
   });

   map.addSource('districtCentroid', {
       type: 'geojson',
       data: districtCentroid
   });

   //-- adds the dynamic points
   map.addLayer({
       "id": "district_centroids",
       "type": "symbol",
       "source": "districtCentroid",
       "layout": numberLabelsLayout,
       "paint": {
         "text-color": '#fff',
         "text-halo-color": colorsPerDistrictFilter,
         "text-halo-width": 10,
         "text-halo-blur": 0,
       }
   });

   //-- after any interaction, trigger the calculation after 300ms
   map.on('moveend', function(e) {
    var tileLoad = setInterval(function() {
        if (map.loaded()) {
            dyLabels(map);
            clearInterval(tileLoad);
        }
    }, 300);
  });
});

//thanks https://medium.com/@yixu0215/dynamic-label-placement-with-mapbox-gl-js-turf-polylabel-1f84f1d4bf6b
function dyLabels(map) {
    districtCentroid.features = [];
    var nbhdFeatures = map.queryRenderedFeatures({
        layers: ["supervisor-fill"]
    });

    var mapSW = map.getBounds()._sw;
    var mapNE = map.getBounds()._ne;

    var mapViewBound = {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [mapSW.lng, mapSW.lat],
              [mapSW.lng, mapNE.lat],
              [mapNE.lng, mapNE.lat],
              [mapNE.lng, mapSW.lat],
              [mapSW.lng, mapSW.lat]
            ]
          ]
        }
    };

    var visualCenterList = [];

    var fixedLabelFilter = ["!in", "supervisor"];

    var neighborhoods = groupBy(nbhdFeatures, nbhdFeature => nbhdFeature.properties.supervisor);
    neighborhoods.forEach(function(value, key) {
      fixedLabelFilter.push(key);
      // console.log(key);
      var visualCenter = value.map(obj => getVisualCenter(obj, mapViewBound));
      if (visualCenter.clean().length) {
          visualCenterList.push(visualCenter.clean());
      }
    });
    visualCenterList.map(obj => {
        var coordinatesList = [];
        obj.forEach(function(feature){
            coordinatesList.push(feature.geometry.coordinates);
        });
        var center = getCenter(coordinatesList);
        var neighborhoodCenterFeature = {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: center
            },
            properties: {
                supervisor: obj[0].properties.supervisor,
                // minlng: obj[0].properties.minlng,
                // minlat: obj[0].properties.minlat,
                // maxlng: obj[0].properties.maxlng,
                // maxlat: obj[0].properties.maxlat
            }
        };
        districtCentroid.features.push(neighborhoodCenterFeature);
    });
    map.setFilter("district_label", fixedLabelFilter);
    map.getSource('districtCentroid').setData(districtCentroid);
}
//
// groupBy function
function groupBy(list, keyGetter) {
    var map = new Map();
    list.forEach(function(item) {
        var key = keyGetter(item);
        var collection = map.get(key);
        if (!collection) {
            map.set(key, [item]);
        } else {
            collection.push(item);
        }
    });
    return map;
}

// get visual center
function getVisualCenter(feature, mapViewBound) {
    if (feature.geometry.type == "Polygon") {
        var intersection = intersect.default(mapViewBound, feature.geometry);
        if (intersection) {
            var visualCenter = {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: []
                },
                properties: {}
            };
            if(intersection.geometry.coordinates.length > 1) {
                var intersections = [];
                intersection.geometry.coordinates.forEach(function(coordinate){
                    intersections.push(polylabel(coordinate));
                });
                visualCenter.geometry.coordinates = getCenter(intersections);
            } else {
                visualCenter.geometry.coordinates = polylabel(intersection.geometry.coordinates);
            }
            visualCenter.properties.supervisor = feature.properties.supervisor;
            // visualCenter.properties.minlng = feature.properties.minlng;
            // visualCenter.properties.minlat = feature.properties.minlat;
            // visualCenter.properties.maxlng = feature.properties.maxlng;
            // visualCenter.properties.maxlat = feature.properties.maxlat;
            return visualCenter;
        }
    }
}

// get the center of a coordinates list
function getCenter(coordinates) {
    var lngList = [];
    var latList = [];
    coordinates.map(coordinate => {
        lngList.push(coordinate[0]);
        latList.push(coordinate[1]);
    });
    var meanLng = lngList.reduce((p,c) => p + c, 0) / lngList.length;
    var meanLat = latList.reduce((p,c) => p + c, 0) / latList.length;
    return [meanLng, meanLat];
}

// remove undefined from an array
Array.prototype.clean = function() {
  for (var i = 0; i < this.length; i++) {
    if (!this[i]) {
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};
