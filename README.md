# OpenLayers-Geoserver-NodeJS-Boilerplate
This is a boilerplate template for OpenLayers-Geoserver-NodeJS stack for creating web map applications with openlayers and geoserver.

#### Clone repo or just Download if you don't have git installed

```` git clone https://github.com/Grace-Amondi/OpenLayers-Geoserver-NodeJS-Boilerplate.git````

#### Install modules

````npm install````

## Customizations to code
Replace the following in index.js with your own credentials


```
var featureRequest = new WFS().writeGetFeature({
    srsName: 'EPSG:4326',
    featurePrefix: 'waterApp',
    maxfeatures: 20,
    featureTypes: ['<your-layer>'],
    outputFormat: 'application/json',
})
```

and also


```
var waterPointsSource = new TileWMS({
    url: 'http://<your-ip-address>:8080/geoserver/<your-workspace>/wms',
    params: {
        'LAYERS': ['<your-workspace>:<your-layer>'],
        'TILED': true
    },
    serverType: 'geoserver',
    crossOrigin: 'anonymous'
})
```

and also here

```
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
```

#### For development

```npm start```

Open `http://localhost:1234`


#### Build

```npm run build```

Open `index.html` in browser
