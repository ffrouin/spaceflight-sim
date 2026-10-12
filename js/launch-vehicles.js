// Crewed launch-vehicle catalog and component definitions.
// Main goal: give the launch wizard honest, reviewable vehicle choices with detachable stages.
// Technique: immutable records describe physical dimensions, crew role, and a staged component tree;
// Babylon geometry is created later by rocket-system.js so data and rendering stay separate.

export const LAUNCH_VEHICLES = Object.freeze([
  {
    id: 'ariane-6-crew-concept',
    name: 'Ariane 6 · crewed concept',
    country: 'Europe',
    launcher: 'Ariane 64-derived launcher',
    crewed: true,
    operationalCrewRating: false,
    humanFlightNote: 'Conceptual European crewed adaptation: Ariane 6 is modeled with a detachable crew capsule, but this is not an operationally certified crew vehicle.',
    heightM: 62,
    diameterM: 5.4,
    source: 'ESA Ariane 6',
    components: [
      {id:'ariane-crew-capsule', name:'European crew capsule', kind:'crew-capsule', heightM:5.0, diameterM:4.5, detachable:true, detachAtS:540},
      {id:'ariane-upper-stage', name:'Upper stage · Vinci / cryogenic stage', kind:'upper-stage', heightM:11.6, diameterM:5.4, detachable:true, detachAtS:560},
      {id:'ariane-core-stage', name:'Core stage · Vulcain 2.1', kind:'core-stage', heightM:32.0, diameterM:5.4, detachable:true, detachAtS:520},
      {id:'ariane-solid-booster-left', name:'P120C solid booster · left', kind:'booster', heightM:13.5, diameterM:3.4, detachable:true, detachAtS:135},
      {id:'ariane-solid-booster-right', name:'P120C solid booster · right', kind:'booster', heightM:13.5, diameterM:3.4, detachable:true, detachAtS:135},
      {id:'ariane-solid-booster-aft', name:'P120C solid booster · aft', kind:'booster', heightM:13.5, diameterM:3.4, detachable:true, detachAtS:135},
      {id:'ariane-solid-booster-front', name:'P120C solid booster · front', kind:'booster', heightM:13.5, diameterM:3.4, detachable:true, detachAtS:135},
      {id:'ariane-launch-escape', name:'Crew escape tower', kind:'escape-tower', heightM:6.0, diameterM:1.1, detachable:true, detachAtS:180}
    ]
  },
  {
    id: 'starship-crewed',
    name: 'Starship · crewed configuration',
    country: 'United States',
    launcher: 'Super Heavy + Starship',
    crewed: true,
    operationalCrewRating: false,
    humanFlightNote: 'Human-flight configuration modeled from the reusable Super Heavy / Starship architecture; operational crew certification remains mission-dependent.',
    heightM: 124.4,
    diameterM: 9.0,
    source: 'SpaceX Starship',
    components: [
      {id:'starship-crew-deck', name:'Starship crew and payload section', kind:'crew-capsule', heightM:18.0, diameterM:8.7, detachable:false, detachAtS:null},
      {id:'starship-upper-stage', name:'Starship upper stage', kind:'upper-stage', heightM:50.0, diameterM:9.0, detachable:false, detachAtS:null},
      {id:'starship-hotstage-ring', name:'Hot-stage / interstage ring', kind:'interstage', heightM:5.0, diameterM:9.0, detachable:true, detachAtS:190},
      {id:'super-heavy-booster', name:'Super Heavy booster', kind:'booster', heightM:71.0, diameterM:9.0, detachable:true, detachAtS:190},
      {id:'starship-launch-escape', name:'Crew abort / escape provisions', kind:'escape-system', heightM:4.0, diameterM:7.6, detachable:false, detachAtS:null}
    ]
  },
  {
    id: 'long-march-2f-shenzhou',
    name: 'Long March 2F · Shenzhou',
    country: 'China',
    launcher: 'Long March 2F + Shenzhou crew spacecraft',
    crewed: true,
    operationalCrewRating: true,
    humanFlightNote: 'Operational Chinese human-spaceflight stack with a launch-escape system and staged expendable launcher.',
    heightM: 58.3,
    diameterM: 3.35,
    source: 'China Manned Space Agency / Shenzhou launch architecture',
    components: [
      {id:'shenzhou-return-module', name:'Shenzhou return module', kind:'crew-capsule', heightM:3.0, diameterM:2.5, detachable:true, detachAtS:510},
      {id:'shenzhou-orbital-module', name:'Shenzhou orbital module', kind:'orbital-module', heightM:2.8, diameterM:2.8, detachable:true, detachAtS:14400},
      {id:'long-march-escape-tower', name:'Launch escape tower', kind:'escape-tower', heightM:8.0, diameterM:1.0, detachable:true, detachAtS:195},
      {id:'long-march-second-stage', name:'Long March 2F second stage', kind:'upper-stage', heightM:15.0, diameterM:3.35, detachable:true, detachAtS:510},
      {id:'long-march-core-stage', name:'Long March 2F core stage', kind:'core-stage', heightM:27.0, diameterM:3.35, detachable:true, detachAtS:145},
      {id:'long-march-booster-left', name:'Long March 2F booster · left', kind:'booster', heightM:15.0, diameterM:2.25, detachable:true, detachAtS:125},
      {id:'long-march-booster-right', name:'Long March 2F booster · right', kind:'booster', heightM:15.0, diameterM:2.25, detachable:true, detachAtS:125},
      {id:'long-march-booster-aft', name:'Long March 2F booster · aft', kind:'booster', heightM:15.0, diameterM:2.25, detachable:true, detachAtS:125},
      {id:'long-march-booster-front', name:'Long March 2F booster · front', kind:'booster', heightM:15.0, diameterM:2.25, detachable:true, detachAtS:125}
    ]
  },
  {
    id: 'soyuz-2-1a-soyuz-ms',
    name: 'Soyuz-2.1a · Soyuz MS',
    country: 'Russia',
    launcher: 'Soyuz-2.1a + Soyuz MS crew spacecraft',
    crewed: true,
    operationalCrewRating: true,
    humanFlightNote: 'Operational Russian human-spaceflight stack with four strap-on boosters, a central core, upper stage, and Soyuz spacecraft.',
    heightM: 46.3,
    diameterM: 2.95,
    source: 'Roscosmos / Soyuz crew launch architecture',
    components: [
      {id:'soyuz-return-module', name:'Soyuz descent module', kind:'crew-capsule', heightM:2.2, diameterM:2.2, detachable:true, detachAtS:510},
      {id:'soyuz-orbital-module', name:'Soyuz orbital module', kind:'orbital-module', heightM:2.6, diameterM:2.3, detachable:true, detachAtS:14400},
      {id:'soyuz-launch-escape', name:'SAS launch escape system', kind:'escape-tower', heightM:6.0, diameterM:1.0, detachable:true, detachAtS:115},
      {id:'soyuz-upper-stage', name:'Soyuz upper stage', kind:'upper-stage', heightM:8.1, diameterM:2.95, detachable:true, detachAtS:510},
      {id:'soyuz-core-stage', name:'Soyuz central core stage', kind:'core-stage', heightM:27.0, diameterM:2.95, detachable:true, detachAtS:118},
      {id:'soyuz-booster-left', name:'Soyuz booster · left', kind:'booster', heightM:19.6, diameterM:2.68, detachable:true, detachAtS:118},
      {id:'soyuz-booster-right', name:'Soyuz booster · right', kind:'booster', heightM:19.6, diameterM:2.68, detachable:true, detachAtS:118},
      {id:'soyuz-booster-front', name:'Soyuz booster · front', kind:'booster', heightM:19.6, diameterM:2.68, detachable:true, detachAtS:118},
      {id:'soyuz-booster-aft', name:'Soyuz booster · aft', kind:'booster', heightM:19.6, diameterM:2.68, detachable:true, detachAtS:118}
    ]
  }
]);
