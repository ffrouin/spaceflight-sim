// Launch platform catalog and globe-coordinate conversion.
// Main goal: keep real-world launch-site data separate from Babylon scene code.
// Technique: immutable records with stable IDs feed the UI, 3D markers, and ground-zero atmosphere.

export const LAUNCH_PLATFORMS = Object.freeze([
  {id:'kennedy-lc39a', name:'Kennedy Space Center · LC-39A', country:'United States', lat:28.6084, lon:-80.6043, elevationM:3, type:'Orbital launch pad', operator:'SpaceX / NASA', source:'NASA Kennedy Space Center'},
  {id:'cape-slc40', name:'Cape Canaveral · SLC-40', country:'United States', lat:28.5618, lon:-80.5772, elevationM:3, type:'Orbital launch pad', operator:'SpaceX', source:'U.S. Space Force Cape Canaveral'},
  {id:'vandenberg-slc4e', name:'Vandenberg · SLC-4E', country:'United States', lat:34.6328, lon:-120.6108, elevationM:100, type:'Polar / orbital launch pad', operator:'SpaceX / U.S. Space Force', source:'U.S. Space Force Vandenberg'},
  {id:'wallops-pad0a', name:'Wallops Flight Facility · Pad 0A', country:'United States', lat:37.8338, lon:-75.4881, elevationM:10, type:'Orbital launch pad', operator:'Northrop Grumman / NASA', source:'NASA Wallops Flight Facility'},
  {id:'pacific-spaceport-alaska', name:'Pacific Spaceport Complex · Alaska', country:'United States', lat:57.435, lon:-152.339, elevationM:30, type:'Orbital launch complex', operator:'Alaska Aerospace', source:'Pacific Spaceport Complex Alaska'},
  {id:'kourou-ela3', name:'Guiana Space Centre · ELA-3', country:'French Guiana', lat:5.236, lon:-52.769, elevationM:5, type:'Orbital launch complex', operator:'Arianespace / CNES / ESA', source:'ESA Guiana Space Centre'},
  {id:'baikonur-gagarins-start', name:'Baikonur Cosmodrome · Site 1', country:'Kazakhstan', lat:45.920, lon:63.342, elevationM:90, type:'Orbital launch pad', operator:'Roscosmos', source:'Roscosmos Baikonur Cosmodrome'},
  {id:'jiuquan', name:'Jiuquan Satellite Launch Center', country:'China', lat:40.960, lon:100.290, elevationM:1000, type:'Orbital launch center', operator:'China National Space Administration', source:'China National Space Administration'},
  {id:'wenchang', name:'Wenchang Spacecraft Launch Site', country:'China', lat:19.614, lon:110.951, elevationM:20, type:'Orbital launch site', operator:'China National Space Administration', source:'China National Space Administration'},
  {id:'tanegashima', name:'Tanegashima Space Center', country:'Japan', lat:30.4008, lon:130.9767, elevationM:15, type:'Orbital launch center', operator:'JAXA', source:'JAXA Tanegashima Space Center'},
  {id:'satish-dhawan', name:'Satish Dhawan Space Centre · Sriharikota', country:'India', lat:13.7199, lon:80.2304, elevationM:10, type:'Orbital launch center', operator:'ISRO', source:'ISRO Satish Dhawan Space Centre'},
  {id:'rocket-lab-lc1', name:'Rocket Lab Launch Complex 1 · Mahia', country:'New Zealand', lat:-39.261, lon:177.864, elevationM:100, type:'Orbital launch complex', operator:'Rocket Lab', source:'Rocket Lab Launch Complex 1'}
]);

// Maps geographic coordinates to the Babylon sphere orientation used by the Earth texture.
export function latLonToEarthVector(BABYLON, latitudeDeg, longitudeDeg, radius) {
  const lat = latitudeDeg * Math.PI / 180;
  const lon = longitudeDeg * Math.PI / 180;
  // Babylon's default sphere UV seam places texture longitude 0° at local -X.
  // Rotate the geographic frame by -90° so Greenwich, the Americas, and Asia align with the equirectangular map.
  return new BABYLON.Vector3(-radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), radius * Math.cos(lat) * Math.sin(lon));
}
