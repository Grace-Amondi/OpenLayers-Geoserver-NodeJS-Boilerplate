import 'ol/ol.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import TileWMS from 'ol/source/TileWMS';
import GeoJSON from 'ol/format/GeoJSON';
import WFS from 'ol/format/WFS'
import VectorSource from 'ol/source/Vector'
import { Vector as VectorLayer} from 'ol/layer'
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style';
import Overlay from 'ol/Overlay';
import LayerGroup from 'ol/layer/Group';

/**
 * Elements that make up the popup.
 */
var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');
var sidebar = document.getElementById('reservoir-list')
var myChart = document.getElementById('story1')
// request for WfS Layer
var featureRequest = new WFS().writeGetFeature({
    srsName: 'EPSG:4326',
    featurePrefix: 'waterApp',
    maxfeatures: 20,
    featureTypes: ['reservoirs'],
    outputFormat: 'application/json',
})
/**
 * Create an overlay to anchor the popup to the map.
 */
var overlay = new Overlay({
    element: container,
    autoPan: true,
    autoPanAnimation: {
        duration: 250
    }
});

/**
 * Add a click handler to hide the popup.
 * @return {boolean} Don't follow the href.
 */
closer.onclick = function () {
    overlay.setPosition(undefined);
    closer.blur();
    return false;
};

// set view-zoom level and centering
const VIEW = new View({
    center: [37.656133, 0.299586],
    projection: 'EPSG:4326',
    zoom: 7
})

// Basemap
var baseMap = new TileLayer({
    source: new OSM()
})

var vectorPoints = new VectorLayer({
    source: new VectorSource({
        url: 'http://localhost:8080/geoserver/waterApp/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=waterApp%3Areservoirs&maxFeatures=50&outputFormat=application%2Fjson',
        format: new GeoJSON()
    }),
    style: new Style({
        image: new CircleStyle({
            radius: 10,
            fill: new Fill({ color: 'rgba(255, 0, 0, 0.1)' }),
            stroke: new Stroke({ color: 'red', width: 1 })
        }),
    }),
})

var waterPointsSource = new TileWMS({
    url: 'http://localhost:8080/geoserver/waterApp/wms',
    params: {
        'LAYERS': ['waterApp:reservoirs'],
        'TILED': true
    },
    serverType: 'geoserver',
    crossOrigin: 'anonymous'
})
// // request waterpoints data from geoserver
var waterPoints = new TileLayer({
    source: waterPointsSource
})

var layerGroup = new LayerGroup({
    layers: [baseMap, vectorPoints]
});
// render map container
const map = new Map({
    target: 'map',
    layers: [layerGroup],
    view: VIEW,
    overlays: [overlay]
});

//show attribute info on click
map.on('singleclick', function (evt) {
    var coordinate = evt.coordinate;

    overlay.setPosition(coordinate);
    var viewResolution = VIEW.getResolution();
    var url = waterPoints.getSource().getGetFeatureInfoUrl(
        evt.coordinate, viewResolution, VIEW.getProjection(),
        { 'INFO_FORMAT': 'application/json' });
    if (url) {
        fetch(url)
            .then(function (response) { return response.json() })
            .then(function (json) {
                var reserviorAttr = json.features
                console.log(reserviorAttr)
                if (reserviorAttr.length) {
                    renderPopup(reserviorAttr)
                } else {
                    overlay.setPosition(undefined);
                    closer.blur();
                    return false;
                }
            });
    }
});

function renderPopup(reserviorAttr) {

    var jName = reserviorAttr["0"].properties.name
    var jStorage = reserviorAttr["0"].properties.resstorage
    var jCapacity = reserviorAttr["0"].properties.conscap

    content.innerHTML = `
    <p>Reservior Name:${jName}<br>Storage Capacity:${jStorage}<br>Occupied Capacity:${jCapacity}</p>
    `;
}
map.on('pointermove', function (evt) {
    if (evt.dragging) {
        return;
    }
    var pixel = map.getEventPixel(evt.originalEvent);
    var hit = map.forEachLayerAtPixel(pixel, function () {
        return true;
    });
    map.getTargetElement().style.cursor = hit ? 'pointer' : '';
});



function determineColor(n) {
    if (n <= 20) { return 'marker-cat1'; }
    if (n <= 40) { return 'marker-cat2'; }
    if (n <= 60) { return 'marker-cat3'; }
    if (n <= 80) { return 'marker-cat4'; }
    if (n <= 100) { return 'marker-cat5'; }
}
// then post the request and add the received features to a layer
fetch('http://localhost:8080/geoserver/waterApp/wfs ', {
    method: 'POST',
    body: new XMLSerializer().serializeToString(featureRequest)
}).then(function (response) {
    return response.json();
}).then(function (json) {
    var waterList = json.features;
    mySidebar(waterList)
});

function flyTo(location, done) {
    var duration = 2000;
    var zoom = VIEW.getZoom();
    var parts = 2;
    var called = false;
    function callback(complete) {
        --parts;
        if (called) {
            return;
        }
        if (parts === 0 || !complete) {
            called = true;
            done(complete);
        }
    }
    VIEW.animate({
        center: location,
        duration: duration
    }, callback);
    VIEW.animate({
        zoom: zoom - 1,
        duration: duration / 2
    }, {
        zoom: 11,
        duration: duration / 2
    }, callback);
}


function mySidebar(waterList) {
    for (var i = 0; i < waterList.length; i++) {
        var lat = waterList[i].geometry.coordinates["0"]
        var lon = waterList[i].geometry.coordinates["1"]
        var wName = waterList[i].properties.name
        var storage = waterList[i].properties.resstorage
        var percentFull = waterList[i].properties.percfull
        var capacity = waterList[i].properties.conscap

        sidebar.innerHTML += `<div class="reservoir-item">
        <header>
          <h2>${wName} <button class="zoom-to-map" data-lat="${lat}" data-lon="${lon}"> View map</button><button class="show-chat"  data-capacity="${capacity}" data-storage="${storage}">View chart</button></h2>
        
          <p>Last updated today</p>
        </header>
        <div class="row-bar">
          <span class="bar-color ${determineColor(percentFull)}" style="width: ${percentFull}%"></span>
        </div>
        <p class='bar-label'>${ percentFull} percent full</p>
        <dl>
          <div class="stat">
            <dt>Water in reservoir</dt>
            <dd>${storage} acre-feet</dd>
          </div>
          <div class="stat">
            <dt>Reservoir capacity</dt>
            <dd>${capacity} acre-feet</dd>
          </div>
        </dl>
      </div>`;

        //zooms to clicked element
        const mapZooms = $('.zoom-to-map');

        // jquery to loop through mapZooms element and handle click event
        mapZooms.each(function (index) {
            $(this).on("click", function () {
                // For the boolean value
                var lat = $(this).data('lat');
                // For the mammal value
                var lon = $(this).data('lon');
                var coords = [lat, lon]
                flyTo(coords, function () { });
                renderPopup(reserviorAttr)
            })
        })

        const showChart = $('.show-chat')
        showChart.each(function (index) {
            $(this).on("click", function () {
                var fcapacity = $(this).data('capacity');
                var fstorage = $(this).data('storage');
                var fwName = $(this).data('wName');
                var emptySpace = fcapacity - fstorage
                myChart.style.boxShadow = '0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24)';
                myChart.style.backgroundColor = 'white'

                // show pie chart
                Highcharts.chart(`pie`, {
                    chart: {
                        type: 'pie',
                        options3d: {
                            enabled: true,
                            alpha: 45
                        }
                    },
                    title: {
                        text: `<h1>Available water amount vs Storage Capacity</hr>`
                    },
                    subtitle: {
                        text: fwName
                    },
                    plotOptions: {
                        pie: {
                            innerSize: 100,
                            depth: 100
                        }
                    },
                    series: [{
                        name: 'Reservior amount',
                        data: [
                            ['Empty Space', emptySpace],
                            ['Occupied', fstorage],
                        ]
                    }]
                });


                Highcharts.chart('bar', {
                    chart: {
                        type: 'bar'
                    },
                    title: {
                        text: `Pie chart`
                    },
                    xAxis: {
                        categories: ['Empty Space', 'Occupied']
                    },
                    // yAxis: {
                    //     title: {
                    //         text: 'Fruit eaten'
                    //     }
                    // },
                    series: [{
                        name: 'Water quantity',
                        data: [emptySpace]
                    }, {
                        name: 'Storage',
                        data: [fstorage]
                    }]
                });



            })


        })



    }
}

const reservoirItems = $('.reservoir-item');
const offset = status === 'small' ? 0 : 0.05;




// mapZooms.bind('click', e => {

//     console.log(e)


//     // onClick('fly-to-bern', function () {
//     // });
//     var featureView = new View({
//         coordinate:[0,0],
//         projection:'EPSG:4326',
//         zoom:1
//     })



//     map.setView(featureView)
//     // let clicked = $(e.target);
//     const zoomCoord = [clicked.attr('data-lat'), clicked.attr('data-lon')]
//     console.log(zoomCoord)
//     // flyTo(zoomCoord, function () { });


//     // map.setView([clicked.attr('data-lat'), parseFloat(clicked.attr('data-lon')) - offset], 12);

//     // let itemParent = clicked.parent().parent().parent();
//     // reservoirItems.removeClass('reservoir-item-active');
//     // itemParent.addClass('reservoir-item-active');
// });
