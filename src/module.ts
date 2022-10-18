import { MetricsPanelCtrl } from 'grafana/app/plugins/sdk';
import defaultsDeep from 'lodash/defaultsDeep';
import { DataFrame } from '@grafana/data';
import $ from 'jquery';
import './style.css';
import angluar from 'angular';
import { getLocationSrv } from '@grafana/runtime';
import { Loader, LoaderOptions } from 'google-maps';

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
  google: any = null;
  marker: google.maps.Marker[] = [];
  map_markers: { [key: string]: google.maps.Marker } = {};
  marker_circle: { [key: string]: google.maps.Circle } = {};
  selected_sensors: { [key: string]: string } = {};
  input: any = null;
  value: any = null;
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

    this.map = this.googleMapLoad();

    // Create a client instance: Broker, Port, Websocket Path, Client ID
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

  async googleMapLoad(): Promise<google.maps.Map> {
    console.log('googleMapLoad call');
    const options: LoaderOptions = {
      /* todo */
    };
    const loader = new Loader(this.panel.googleApiKey, options);
    this.google = await loader.load();
    var mapProp = {
      center: new this.google.maps.LatLng(40.464794, 17.721235),
      zoom: 8,
    };
    const map = new this.google.maps.Map(document.getElementById('map') as HTMLElement, mapProp);

    return map;
  }

  resolveAfter2Seconds(x) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(x);
      }, 1500);
    });
  }

  async onDataReceived(data) {
    console.log('onDataReceived');
    console.log(this.map);
    //while (this.map === null) {
    //  Promise.resolve(this.map);
    //  console.log('await');
    //}
    this.map = await this.resolveAfter2Seconds(this.map);
    console.log(this.map);
    // variables declaration
    let colLat = -1;
    let colLng = -1;
    let colID = -1;
    const google = this.google;
    var bounds = new google.maps.LatLngBounds();
    var mapProp = {
      center: new google.maps.LatLng(40.464794, 17.721235),
      zoom: 8,
    };
    if (this.map === null) {
      console.log('map is null');
      this.map = new google.maps.Map(document.getElementById('map') as HTMLElement, mapProp);
    }
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
    //console.log('cols = ' + colLat + '-' + colLng + '.');
    // map setting
    //console.log(this.map);
    //if (this.map === null) {
    //  console.log('map is null');
    //  this.map = new google.maps.Map(document.getElementById('map') as HTMLElement, mapProp);
    //}
    if (data.length > 0) {
      if (data[0].type === 'table') {
        // marker circles resetting
        this.DeleteCircles();
        console.log(data[0].rows.length);
        if (data[0].rows.length > 19) {
          // markers resetting
          this.DeleteMarkers();
          this.DeleteSelectedSensors();
          if (colLat !== -1 && colLng !== -1) {
            let marker_id = '';
            let posLat = 0.0;
            let posLng = 0.0;
            data[0].rows.forEach((r) => {
              marker_id = r[colID];
              console.log(marker_id);
              posLat = r[colLat];
              posLng = r[colLng];
              this.map_markers[marker_id] = new google.maps.Marker({
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
              // Add circle overlay and bind to marker
              this.marker_circle[marker_id] = new google.maps.Circle({
                map: this.map,
                radius: 5,
                fillColor: 'yellow',
                fillOpacity: 0.5,
                strokeColor: 'yellow',
                strokeOpacity: 10.0,
                strokeWeight: 0,
                visible: false,
              });
              //Attach click event to the marker.
              (function (marker, circle, selected_sensors) {
                google.maps.event.addListener(marker, 'click', function (e) {
                  //let selected_variables = {};
                  if (circle.getVisible() === false) {
                    circle.setVisible(true);
                    circle.bindTo('center', marker, 'position');
                    circle.setMap(this.map);
                    if (marker.getTitle() !== null && marker.getTitle() !== undefined) {
                      //emp.name !== undefined ? emp.name : ''
                      selected_sensors[marker.getTitle() as string] = marker.getTitle() as string;
                    }
                  } else {
                    circle.setVisible(false);
                    circle.setMap(null);
                    delete selected_sensors[marker.getTitle() as string];
                  }
                  console.log('values:');
                  console.log(Object.values(selected_sensors));
                  getLocationSrv().update({
                    query: {
                      'var-tt_serial_number': Object.values(selected_sensors),
                    },
                    partial: true,
                    replace: true,
                  });
                  //console.log(this.templateSrv.getVariables());
                });
              })(this.map_markers[marker_id], this.marker_circle[marker_id], this.selected_sensors);
              bounds.extend(this.map_markers[marker_id].getPosition()!);
            });
            this.map.fitBounds(bounds);
          }
        } else {
          let marker_id = '';
          this.DeleteSelectedSensors();
          data[0].rows.forEach((r) => {
            marker_id = r[colID];
            console.log(marker_id);
            // set selected markers circle visibility equal to true
            this.marker_circle[marker_id].setVisible(true);
            this.marker_circle[marker_id].bindTo('center', this.map_markers[marker_id], 'position');
            this.marker_circle[marker_id].setMap(this.map);
            this.selected_sensors[marker_id] = marker_id;
          });
          console.log(Object.values(this.selected_sensors));
        }
      }
    }
  }

  DeleteMarkers() {
    if (Object.keys(this.map_markers).length > 0) {
      //Loop through all the markers and remove
      for (let key in this.map_markers) {
        this.map_markers[key].setMap(null);
        delete this.map_markers[key];
      }
      console.log(Object.keys(this.map_markers).length);
    }
  }

  DeleteCircles() {
    if (Object.keys(this.marker_circle).length > 0) {
      console.log('sono nel reset circle');
      for (let key in this.marker_circle) {
        console.log('keys:');
        console.log(key);
        this.marker_circle[key].setMap(null);
        //delete this.marker_circle[key];
      }
    }
  }

  DeleteSelectedSensors() {
    if (Object.keys(this.selected_sensors).length > 0) {
      for (let key in this.selected_sensors) {
        delete this.selected_sensors[key];
      }
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
  }
}

export { GoogleMapPanelCtrl as PanelCtrl };
