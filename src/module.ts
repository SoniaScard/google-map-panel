import { MetricsPanelCtrl } from 'grafana/app/plugins/sdk';
import defaultsDeep from 'lodash/defaultsDeep';
import { DataFrame } from '@grafana/data';
import $ from 'jquery';
import './style.css';
import angluar from 'angular';
import { GoogleMap } from '@googlemaps/map-loader';
//import * as path from 'path';
//import * as fs from 'fs';
//import { Loader, LoaderOptions } from 'google-maps';
//import {} from 'google.maps';

interface KeyValue {
  key: string;
  value: any;
}
export default class GoogleMapPanelCtrl extends MetricsPanelCtrl {
  static templateUrl = 'partials/module.html';

  panelDefaults = {
    googleApiKey: '',
  };
  map: any = null;
  marker: google.maps.Marker[] = [];
  circle: any = null;
  input: any = null;
  value: any = null;
  marker_pos: any = null;
  fs: any = require('browserify-fs');

  // Simple example showing the last value of all data
  firstValues: KeyValue[] = [];

  /** @ngInject */
  constructor($scope, $injector, public templateSrv) {
    super($scope, $injector);
    defaultsDeep(this.panel, this.panelDefaults);

    // Get results directly as DataFrames
    (this as any).dataFormat = 'series';

    // Connect signals
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('render', this.onRender.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));

    // Create a client instance: Broker, Port, Websocket Path, Client ID
    console.log(this.templateSrv);
    //this.map = (window as any).map;
    console.log(this.map);
    //console.log((window as any).L.map);
    angluar.module('grafana.directives').directive('stringToNumber', this.stringToNumber);
  }

  onInitEditMode() {
    this.addEditorTab('Server', `public/plugins/${this.pluginId}/partials/options.server.html`, 2);
  }

  onRender() {
    if (!this.firstValues || !this.firstValues.length) {
      return;
    }

    // Tells the screen capture system that you finished
    this.renderingCompleted();
  }

  onDataError(err: any) {
    console.log('onDataError', err);
  }

  initMap() {
    var mapProp = {
      center: new google.maps.LatLng(51.508742, -0.12085),
      zoom: 5,
    };
    var map1 = new google.maps.Map(document.getElementById('map') as HTMLElement, mapProp);
    console.log(map1);
    return map1;
  }
  onDataReceived(data) {
    console.log('onDataReceived');
    var mapProp = {
      center: new google.maps.LatLng(40.464794, 17.721235),
      zoom: 8,
    };
    if (this.map === null) {
      console.log('sono nell if');
      this.map = new google.maps.Map(document.getElementById('map') as HTMLElement, mapProp);
    }
    console.log(this.map);
    var bounds = new google.maps.LatLngBounds();
    if (data.length > 0) {
      if (data[0].type === 'table') {
        // this.DeleteMarkers();
        console.log(this.marker.length);
        if (this.circle !== null) {
          this.circle.setMap(null);
        }
        if (data[0].rows.length > 1) {
          if (this.marker.length > 0) {
            //Loop through all the markers and remove
            for (var i = 0; i < this.marker.length; i++) {
              this.marker[i].setMap(null);
            }
            this.marker.length = 0;
          }
          let colLat = -1;
          let colLng = -1;
          let colID = -1;

          // Find column tree_talker, lat & lon number
          data[0].columns.forEach((c, i) => {
            if (c.text === 'lat') {
              colLat = i;
            } else if (c.text === 'lng') {
              colLng = i;
            } else if (c.text === 'tree_talker') {
              colID = i;
            }
          });
          console.log('cols = ' + colLat + '-' + colLng + '.');
          if (colLat !== -1 && colLng !== -1) {
            let marker_id = '';
            let posLat = 0.0;
            let posLng = 0.0;
            let i = 0;
            data[0].rows.forEach((r) => {
              marker_id = r[colID];
              console.log(marker_id, i, data[0].rows[0][colID]);
              posLat = r[colLat];
              posLng = r[colLng];
              //this.marker[i].setPosition({ lat: posLat, lng: posLng });
              this.marker[i] = new google.maps.Marker({
                position: { lat: posLat, lng: posLng },
                optimized: false,
                title: marker_id,
                icon: {
                  url:
                    //'https://img.pngio.com/green-tree-32-icon-free-green-tree-icons-tree-icon-transparent-256_256.png',
                    'https://www.gammamedica.it/wp-content/uploads/2012/06/green-map-marker-icon.png',
                  scaledSize: new google.maps.Size(45, 45), // scaled size
                },
                map: this.map,
              });
              bounds.extend(this.marker[i].getPosition()!);
              i = i + 1;
            });
            this.map.fitBounds(bounds);
          }
        } else {
          let colID = -1;
          // Find column tree_talker
          data[0].columns.forEach((c, i) => {
            if (c.text === 'tree_talker') {
              colID = i;
            }
          });
          for (var j = 0; j < this.marker.length; j++) {
            if (this.marker[j].getTitle() === data[0].rows[0][colID]) {
              console.log(this.marker[j].getTitle());
              // Add circle overlay and bind to marker
              this.circle = new google.maps.Circle({
                map: this.map,
                radius: 5,
                fillColor: 'yellow',
                fillOpacity: 0.5,
                strokeColor: 'yellow',
                strokeOpacity: 10.0,
              });
              this.circle.bindTo('center', this.marker[j], 'position');
            }
          }
        }
      }
    }
    //google.maps.event.trigger(this.map, 'resize');
  }

  DeleteMarkers() {
    if (this.marker.length > 0) {
      //Loop through all the markers and remove
      for (var i = 0; i < this.marker.length; i++) {
        this.marker[i].setMap(null);
      }
      this.marker = [];
    }
  }

  // 6.3+ get typed DataFrame directly
  handleDataFrame(data: DataFrame[]) {
    const values: KeyValue[] = [];

    for (const frame of data) {
      for (let i = 0; i < frame.fields.length; i++) {
        values.push({
          key: frame.fields[i].name,
          value: frame.fields[i].values,
        });
      }
    }

    this.firstValues = values;
  }
  // async googleMapLoad(): Promise<google.maps.Map> {
  //   console.log('googleMapLoad call');
  //   var center = { lat: 40.464794, lng: 17.721235 };
  //   //var pos = { lat: 40.34182588, lng: 17.70671345 };
  //   const options: LoaderOptions = {
  //     /* todo */
  //   };
  //   const loader = new Loader(this.panel.googleApiKey, options);
  //   const google = await loader.load();
  //   console.log(google);
  //   const map = await new google.maps.Map(document.getElementById('map') as HTMLElement, {
  //     center: center,
  //     zoom: 8,
  //   });
  //   //for (let i = 0; i < 40; i++) {
  //   //  this.marker[i] = new google.maps.Marker({
  //   //    position: pos,
  //   //    optimized: false,
  //   //    title: 'title',
  //   //    map: map,
  //   //  });
  //   //}
  //   //const infowindow = new google.maps.InfoWindow({
  //   //  content: 'ciao',
  //   //});
  //
  //   //this.marker[10].addListener('click', () => {
  //   //  infowindow.open(this.marker[10].get('map'), this.marker[10]);
  //   //  console.log('press');
  //   //});
  //   //this.marker[10].on('mouseover', function onMouseOver() {
  //   //  console.log('mouseover');
  //   //});
  //   console.log('ciao');
  //   console.log(map);
  //   return map;
  // }

  async loadMap() {
    console.log('load');
    /* Options for how the map should initially render. */
    const mapOptions = {
      center: {
        lat: 40.464794,
        lng: 17.721235,
      },
      zoom: 12,
    };

    /* Options for loading the Maps JS API. */
    const apiOptions = {};

    /*
     * Set ID of the div where the map will be loaded,
     * and whether to append to that div.
     */
    const mapLoaderOptions = {
      apiKey: this.panel.googleApiKey,
      divId: 'map',
      mapOptions: mapOptions,
      apiOptions: apiOptions,
    };

    // Instantiate map loader
    const mapLoader = new GoogleMap();

    // Load the map
    const googleMap = mapLoader.initMap(mapLoaderOptions);
    await googleMap;
    console.log(googleMap);
    return googleMap;
  }

  link(scope: any, elem: any, attrs: any, ctrl: any) {
    this.input = $(elem.find('#value')[0]);
    console.log('link');
    console.log(ctrl);
  }

  stringToNumber() {
    return {
      require: 'ngModel',
      link: function (scope, element, attrs, ngModel) {
        ngModel.$parsers.push(function (value) {
          return '' + value;
        });
        ngModel.$formatters.push(function (value) {
          return parseFloat(value);
        });
      },
    };
  }

  connect() {
    console.log('Call connect');
    //this.map = this.googleMapLoad();
  }
}

export { GoogleMapPanelCtrl as PanelCtrl };
