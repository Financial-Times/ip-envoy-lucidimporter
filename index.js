
const _ = require('lodash');
const { promisify } = require('util');
//const knex = require('./lib/connect');

function resolveTemplate(str, vars) {
  // based on code pinched from: https://github.com/mikemaccana/dynamic-template/blob/master/index.js
  // console.log(templateString);
  if (typeof str !== 'string') return false;
  if (!str.includes('${')) return false; // can't include template so don't bother parsing it
  const keys = Object.keys(vars);
  const values = Object.values(vars);
  // Only trusted usesrs may use the lucidChart importer, otherwise this will need protecting more
  try {
    const templateFunction = new Function(...keys, `return \`${str}\`;`); // eslint-disable-line no-new-func
    return templateFunction(...values);
  } catch (e) {
    console.log(`string fed into resolveTemple was ${str}`);
    console.log(`keys fed into resolveTemple were ${keys}`);

    throw e;
  }
}

// loosely based on code found here: https://stackoverflow.com/questions/25333918/js-deep-map-function
function deepResolveTemplate(obj, iterator, context) {
  return _.transform(obj, (result, val, key) => {
    delete result[key];
    result[resolveTemplate(key, context) || key] = _.isObject(val)
      ? deepResolveTemplate(val, iterator, context) : iterator.call(context, val);
  });
}

/* eslint-disable eqeqeq */

module.exports = {
  preParser: {
    newCollection() {
      this.lucidColletion = {
        _connections: { // arrows that connect silos together are processed and their data added
          bySource: {}, // arrows sorted by source
          byTarget: {} // arrows sorted by target, mainly for convenience
        },
        _inputs: { // input arrows that provide inputs from silos to rulesets
          bySource: {}, // input arrows sorted by source
          byTarget: {} // input arrows sorted by target, mainly for convenience
        },
        index: {}, // for convenience, a quick lookup of objects by lucidId
        csvHeaders: []
      };
    },
    have(data) {
      const type = data.type.toLowerCase();
      // row must be representing an arrow

      if (!this.lucidColletion.csvHeaders.length) {
        this.lucidColletion.csvHeaders = Object.keys(data);
      }

      if ((type == '') && (data.Name === 'Line')) {
        this.handlers._arrowMangler(data, this.lucidColletion);
        return false; // nothing further to process for this line, so exit
      }

      if ((type == 'input') && (data.Name === 'Line')) {
        this.handlers._arrowManglerInput(data, this.lucidColletion);
        return false; // nothing further to process for this line, so exit
      }

      if (type == '') {
        return false;
      }
      if (typeof this.handlers[type] !== 'function') {
        console.log(`There is no data importer for object type "${type}"`);
        console.log('Please check your Lucid diagram or extend the import library for');
        console.log('your new object');
        console.log(`There is no data importer for object type "${type}"`);
        console.log('Please check your Lucid diagram or extend the import library for');
        console.log('your new object');
        return false;
      }
      const typeTarget = this.getBranch(type);
      // find out what objects contain this one (normally campaigns and tracks)
      const containedBy = this.handlers._containerMangler(data);
      // decorate container lucidIds into base object
      const len = typeTarget.push(this.handlers._baseMixin(data, { containedBy }));
      // object specific handling depending on how the type attribute is set

      this.handlers[type](data, typeTarget[len - 1], this.lucidColletion.csvHeaders);
      // create a lucidId based index for easy look-up later
      this.lucidColletion.index[data.Id] = typeTarget[len - 1];
      return true;
    },

    resolveFarReference(id, arrowBank) {
      const lc = this.lucidColletion;
      const o = lc.index[id];
      const connectIds = [];
      const containers = o.containedBy.filter((cb) => (lc.index[cb.containerId].type === 'ref'));
      containers.forEach((container) => {
        const { classRef } = lc.index[container.containerId];

        lc.connector.filter((c) => {
          if (c.idx !== o.idx) return false;
          return c.containedBy.some((cb) => {
            if (lc.index[cb.containerId].type !== 'class') return false;
            const { className } = lc.index[cb.containerId];
            return (classRef === className);
          });
        }).forEach((c) => { // This gives us the class connector
          // we want array of ids of the connecting class object/s
          Object.keys(lc[arrowBank].bySource).forEach((arrowId) => {
            lc[arrowBank].bySource[arrowId].forEach((classArrow) => {
              if (classArrow.targetObjectId === c.id) {
                connectIds.push({
                  containerName: lc.index[container.containerId].name,
                  oldObjectId: classArrow.srcObjectId,
                  label: classArrow.label
                });
              }
              if (classArrow.srcObjectId === c.id) {
                connectIds.push({
                  containerName: lc.index[container.containerId].name,
                  oldObjectId: classArrow.targetObjectId,
                  label: classArrow.label
                });
              }
            });
          });
        });
      });
      return connectIds;
    },

    divertArrows(divertionMap, arrowBank) {
      const lc = this.lucidColletion;
      const lcp = this.lucidCollectionPreped;

      const arrowRegistry = this.lucidColletion[arrowBank].bySource;
      const newArrows = [];

      // Resolve all arrows attached to a connector
      Object.keys(arrowRegistry).forEach((id) => {
        const arrows = arrowRegistry[id];
        arrows.forEach((arrow) => {
          const srcObj = lc.index[arrow.srcObjectId];
          const targetObj = lc.index[arrow.targetObjectId];

          if (srcObj.type === 'Connector' && targetObj.type === 'Connector') {
            this.resolveFarReference(arrow.srcObjectId, arrowBank).forEach((from) => {
              this.resolveFarReference(arrow.targetObjectId, arrowBank).forEach((to) => {
                const newArrow = _.cloneDeep(arrow);
                newArrow.srcObjectId = divertionMap[from.containerName][from.oldObjectId];
                newArrow.targetObjectId = divertionMap[to.containerName][to.oldObjectId];
                if (from.label) newArrow.label += from.label;
                if (to.label) newArrow.label += to.label;
                newArrows.push(newArrow);
              });
            });
          }

          if (srcObj.type === 'Connector' && targetObj.type !== 'Connector') {
            this.resolveFarReference(arrow.srcObjectId, arrowBank).forEach((from) => {
              // target reference does not need resolving because its not a connector
              const newArrow = _.cloneDeep(arrow);
              newArrow.srcObjectId = divertionMap[from.containerName][from.oldObjectId];
              if (from.label) newArrow.label += from.label;
              newArrows.push(newArrow);
            });
          }

          if (srcObj.type !== 'Connector' && targetObj.type === 'Connector') {
            this.resolveFarReference(arrow.targetObjectId, arrowBank).forEach((to) => {
              // source reference does not need resolving because its not a connector
              const newArrow = _.cloneDeep(arrow);
              newArrow.targetObjectId = divertionMap[to.containerName][to.oldObjectId];
              if (to.label) newArrow.label += to.label;
              newArrows.push(newArrow);
            });
          }
          if (srcObj.type !== 'Connector' && targetObj.type !== 'Connector') {
            if (lcp.index[srcObj.id] && lcp.index[targetObj.id]) {
              const newArrow = _.cloneDeep(arrow);
              newArrows.push(newArrow);
            }
          }
        });
      });

      // Copy arrows in class into their instances
      Object.keys(divertionMap).forEach((instanceName) => {
        Object.keys(arrowRegistry).forEach((id) => {
          const arrows = arrowRegistry[id];
          arrows.forEach((arrow) => {
            const srcChanged = Object.prototype.hasOwnProperty
              .call(divertionMap[instanceName], arrow.srcObjectId);
            const targetChanged = Object.prototype.hasOwnProperty
              .call(divertionMap[instanceName], arrow.targetObjectId);
            if (srcChanged && targetChanged) {
              const newArrow = _.cloneDeep(arrow);
              newArrow.srcObjectId = divertionMap[instanceName][arrow.srcObjectId];
              newArrow.targetObjectId = divertionMap[instanceName][arrow.targetObjectId];
              newArrows.push(newArrow);
            }
          });
        });
      });

      const arrowsBySource = {};
      const arrowsByTarget = {};
      newArrows.forEach((arrow) => {
        if (!arrowsBySource[arrow.srcObjectId]) arrowsBySource[arrow.srcObjectId] = [];
        arrowsBySource[arrow.srcObjectId].push(arrow);
        if (!arrowsByTarget[arrow.targetObjectId]) arrowsByTarget[arrow.targetObjectId] = [];
        arrowsByTarget[arrow.targetObjectId].push(arrow);
      });
      lcp[arrowBank].bySource = arrowsBySource;
      lcp[arrowBank].byTarget = arrowsByTarget;
    },

    copyClassObjects(objType, divertionMap) {
      const objNameLower = objType.toLowerCase();
      const lc = this.lucidColletion;
      const lcp = this.lucidCollectionPreped;
      let newId = Object.keys(lcp.index).pop() * 1;
      const dm = [];

      lc.ref.forEach((ref) => { // itterate over class references
        dm[ref.name] = {};
        // For each refBox, get the class its referring to:
        const targetClass = lc.class.filter((o) => (o.className === lc.index[ref.id].classRef))[0];
        Object.keys(lc.index).filter((id) => {
          if (lc.index[id].type !== objType) return false;
          if (!lc.index[id].containedBy) return false;
          return (lc.index[id].containedBy.some((c) => c.containerId === targetClass.id));
        }).forEach((id) => {
          newId += 1;
          dm[ref.name][id] = newId;

          const newInstance = _.cloneDeep(lc.index[id]);
          // delete from registries:
          delete lcp.index[id];
          lcp[objNameLower] = lcp[objNameLower].filter((o) => o.id !== id);
          // modify object as needed depending on type
          newInstance.id = newId;
          if (objType === 'Silo') { // special handling for silos
            if (!newInstance.name.includes('${')) { // use a sensible default if class silo given a plain name
              newInstance.name = `${ref.name}:${newInstance.name}`;
            }
            const idx = newInstance.containedBy.findIndex((e) => {
              if (lc.index[e.containerId].type === 'Boundary') {
                return Object.keys(divertionMap[ref.name]).some((f) => {
                  return (e.containerId === f);
                });
              }
              return false;
            });
            if (idx !== -1) {
              const newBoundaryContainer = {
                containerId: divertionMap[ref.name][newInstance.containedBy[idx].containerId]
              };
              ref.containedBy.push(newBoundaryContainer);
            }
            newInstance.containedBy = ref.containedBy;
          }
          Object.keys(newInstance).forEach((k) => {
            const nk = resolveTemplate(k, ref.config) || k;
            if (typeof newInstance[k] === 'string') {
              const nv = resolveTemplate(newInstance[k], ref.config) || newInstance[k];
              delete newInstance[k];
              newInstance[nk] = nv;
            }
            if (typeof newInstance[k] === 'object') { // recurse over object
              newInstance[k] = deepResolveTemplate(newInstance[k], (v) => {
                return resolveTemplate(v, ref.config) || v;
              }, ref.config);
            }
          });
          // shove new object into registries:
          lcp.index[newId] = newInstance;
          lcp[objNameLower].push(newInstance);
        });
      });
      return dm;
    },
    // when arrows are connected to arrows, this resolves the ultimate destination
    resolveArrowChain(pointId, bank, arrowsFlat, isSrc = false) {
      const mode = (isSrc) ? 'srcObjectId' : 'targetObjectId';
      // search for arrow who has this id:
      if (Object.prototype.hasOwnProperty.call(arrowsFlat, pointId)) {
        // object is arrow, recurse:
        const arrowId = Object.keys(arrowsFlat).filter((id) => id === pointId);
        return this.resolveArrowChain(arrowsFlat[arrowId][mode], bank, isSrc);
      }
      return pointId;
    },
    arrowJoiner(bank) {
      const newSrcs = {};
      const newTags = {};
      const arrowsFlat = [];

      Object.keys(this.lucidColletion[bank].bySource).forEach((src) => {
        return this.lucidColletion[bank].bySource[src].forEach((a) => {
          arrowsFlat[a.id] = a;
        });
      });

      Object.keys(this.lucidColletion[bank].bySource).forEach((src) => {
        this.lucidColletion[bank].bySource[src].forEach((a) => {
          a.srcObjectId = this.resolveArrowChain(a.srcObjectId, bank, arrowsFlat, true);
          a.targetObjectId = this.resolveArrowChain(a.targetObjectId, bank, arrowsFlat, false);

          if (!newSrcs[a.srcObjectId]) newSrcs[a.srcObjectId] = [];
          if (!newTags[a.targetObjectId]) newTags[a.targetObjectId] = [];

          newSrcs[a.srcObjectId].push(a);
          newTags[a.targetObjectId].push(a);
        });
      });

      this.lucidColletion[bank].bySource = newSrcs;
      this.lucidColletion[bank].byTarget = newTags;
    },

    async prepare(knexConnection) {
      const knexConnectionAsync = promisify(knexConnection);

      const lc = this.lucidColletion;

      // At this stage all data has been read in.
      // This is the ideal place to do any manipulation prior to writing to the db
      // For example, unpacking any classes present in the chart

      console.log('Checking if any of the tracks already exist...');
      const trackNames = lc.trackcontainer.map((track) => track.name);
      const res = await knexConnectionAsync.select('*').from('core.track').whereIn('name', trackNames);
      const existingTrackNames = res.map((dbTrack) => dbTrack.name);

      lc.trackcontainer = lc.trackcontainer.filter((trackNameIn) => !existingTrackNames
        .some((existingTrackName) => existingTrackName === trackNameIn.name));

      if (!lc.trackcontainer.length) {
        console.log('No new tracks to import');
        return false;
      }

      // Arrow forking/converging:
      console.log('Processing any converging or forking arrows...');
      this.arrowJoiner('_connections');
      this.arrowJoiner('_inputs');

      this.lucidCollectionPreped = _.cloneDeep(lc); // manipulator target
      // Class Mangling:
      console.log('Seeing if there are any classes to mangle...');
      if (!lc.ref && !lc.class) {
        console.log('No classes found in this chart, moving on...');
        return true;
      }
      console.log('Yes there are, let\'s get mangling...');

      // we have new objects to create so find the current max Id as starting point
      const divertionMap = {}; // map old ids to new instance ids
      const classObjects = ['Boundary', 'Silo', 'RuleSet', 'Channel'];
      console.log('copying classes...');

      classObjects.forEach((objType) => {
        const dm = this.copyClassObjects(objType, divertionMap);
        Object.keys(dm).forEach((ref) => {
          Object.keys(dm[ref]).forEach((oldId) => {
            if (!divertionMap[ref]) divertionMap[ref] = {};
            divertionMap[ref][oldId] = dm[ref][oldId];
          });
        });
      });
      console.log('Diverting arrows to new class instances...');
      this.divertArrows(divertionMap, '_connections');
      this.divertArrows(divertionMap, '_inputs');
      console.log('Class mangling complete');
      return true;
    },

    getBranch(type) {
      if (!Object.prototype.hasOwnProperty.call(this.lucidColletion, type)) {
        this.lucidColletion[type] = [];
      }
      return this.lucidColletion[type];
    },
    handlers: {
      _baseMixin: (data, mixer = {}) => { // attributes here are pulled into all object types
        return Object.assign({
          id: data.Id,
          type: data.type,
          name: data.name ? data.name : null,
          descr: data.descr ? data.descr : null
        }, mixer);
      },
      _arrowMangler: (data, lucidColletion) => {
        const connections = lucidColletion._connections;

        // Arrows must point only one way
        if ((data['Source Arrow'] === 'Arrow') && (data['Destination Arrow'] === 'Arrow')) {
        console.log('Arrow ignored - direction is ambigous');
          return false;
        }

        // Arrows must point, otherwise its just a line
        if ((data['Source Arrow'] === 'None') && (data['Destination Arrow'] === 'None')) {
        console.log('Line ignored - line is not an arrow - no relationship created');
          return false;
        }

        // Detect if arrow pointing to/from another arrow and apply special handling:
        if ((
          (data.Name === 'Line')
            && (data['Shape Library'] === '')
            && (data['Line Source'] !== '')
            && (data['Line Destination'] !== ''))
            && (!lucidColletion.index[data['Line Source']] || !lucidColletion.index[data['Line Destination']]
            )) {
          const arrow = {
            id: data.Id,
            srcObjectId: data['Line Source'],
            targetObjectId: data['Line Destination'],
            srcArrow: data['Source Arrow'],
            targetArrow: data['Destination Arrow'],
            label: data['Text Area 1']
          };

          if (!Object.prototype.hasOwnProperty.call(connections.bySource, arrow.srcObjectId)) {
            connections.bySource[arrow.srcObjectId] = [];
          }
          connections.bySource[arrow.srcObjectId].push(arrow);
          // For convenience, do the reverse. Will make it easier to search later...
          if (!Object.prototype.hasOwnProperty.call(connections.byTarget, arrow.targetObjectId)) {
            connections.byTarget[arrow.targetObjectId] = [];
          }
          connections.byTarget[arrow.targetObjectId].push(arrow);
          return true;
        }

        // Arrows must point to/from allowed object, not any old random stuff
        const arrowFromType = lucidColletion.index[data['Line Source']].type;
        const arrowFromName = lucidColletion.index[data['Line Source']].name;
        const arrowToName = lucidColletion.index[data['Line Destination']].name;

        if ((arrowFromType !== 'RuleSet')
          && (arrowFromType !== 'Silo')
          && (arrowFromType !== 'Channel')
          && (arrowFromType !== 'Boundary')
          && (arrowFromType !== 'Connector')) {
      console.log('Arrow ignored - arrows must point from RuleSets, Silos or Channels');
      console.log(`Found arrow that pointed from ${arrowFromType}`);
          return false;
        }

        const arrowToType = lucidColletion.index[data['Line Destination']].type;
        if ((arrowToType !== 'RuleSet')
          && (arrowToType !== 'Silo')
          && (arrowToType !== 'Channel')
          && (arrowToType !== 'Connector')) {
            console.log('Arrow ignored - arrows must point to RuleSets, Silos or Channels');
            console.log(`Found arrow that pointed to ${arrowToType}`);
          return false;
        }

        if (arrowToType === '') {
          console.log('Arrow must point to something - ignored');
          return false;
        }
        if (arrowToType === '') {
          console.log('Arrow must point from something - ignored');
          return false;
        }

        // Arrows that point from Silos must point to channels or ruleSets
        if ((arrowFromType === 'Silo')
          && (arrowToType !== 'RuleSet')
          && (arrowToType !== 'Silo')
          && (arrowToType !== 'Connector') // This is now allowed, shorthand for autoPass rule
          && (arrowToType !== 'Channel')) {
            console.log(`Arrow points from a ${arrowFromType} (${arrowFromName}) to a ${arrowToType} (${arrowToName})`);
          return false;
        }

        // Arrows that point from ruleSets must point to silos
        if ((arrowFromType === 'RuleSet')
          && (arrowToType !== 'Connector') // This is now allowed, shorthand for autoPass rule
          && (arrowToType !== 'Silo')) {
            console.log(`Arrow points from a ${arrowFromType} (${arrowFromName}) to a ${arrowToType} (${arrowToName})`);
          return false;
        }

        const arrow = {
          id: data.Id,
          srcObjectId: data['Line Source'],
          targetObjectId: data['Line Destination'],
          srcArrow: data['Source Arrow'],
          targetArrow: data['Destination Arrow'],
          label: data['Text Area 1']
        };

        if (!Object.prototype.hasOwnProperty.call(connections.bySource, arrow.srcObjectId)) {
          connections.bySource[arrow.srcObjectId] = [];
        }
        connections.bySource[arrow.srcObjectId].push(arrow);
        // For convenience, do the reverse. Will make it easier to search later...
        if (!Object.prototype.hasOwnProperty.call(connections.byTarget, arrow.targetObjectId)) {
          connections.byTarget[arrow.targetObjectId] = [];
        }
        connections.byTarget[arrow.targetObjectId].push(arrow);
        return true;
      },
      _arrowManglerInput: (data, lucidColletion) => {
        const inputs = lucidColletion._inputs;

        // Arrows must point only one way
        if ((data['Source Arrow'] === 'Arrow') && (data['Destination Arrow'] === 'Arrow')) {
          console.log('Input arrow ignored - direction is ambigous - it should point to the rule');
          return false;
        }

        // Arrows must point, otherwise its just a line
        if ((data['Source Arrow'] === 'None') && (data['Destination Arrow'] === 'None')) {
          console.log('Line ignored - line is not an arrow but its marked as an input - no relationship created');
          return false;
        }

        // Detect if arrow pointing to/from another arrow and apply special handling:
        if ((
          (data.Name === 'Line')
          && (data['Shape Library'] === '')
          && (data['Line Source'] !== '')
          && (data['Line Destination'] !== ''))
          && (
            !lucidColletion.index[data['Line Source']]
            || !lucidColletion.index[data['Line Destination']]
          )) {
          const arrow = {
            id: data.Id,
            srcObjectId: data['Line Source'],
            targetObjectId: data['Line Destination'],
            srcArrow: data['Source Arrow'],
            targetArrow: data['Destination Arrow'],
            label: data['Text Area 1'],
            data
          };

          if (!Object.prototype.hasOwnProperty.call(inputs.bySource, arrow.srcObjectId)) {
            inputs.bySource[arrow.srcObjectId] = [];
          }
          inputs.bySource[arrow.srcObjectId].push(arrow);
          // For convenience, do the reverse. Will make it easier to search later...
          if (!Object.prototype.hasOwnProperty.call(inputs.byTarget, arrow.targetObjectId)) {
            inputs.byTarget[arrow.targetObjectId] = [];
          }
          inputs.byTarget[arrow.targetObjectId].push(arrow);

          return true;
        }

        // Input arrows must point from a silo or connector to a ruleset or connector
        const arrowFromType = lucidColletion.index[data['Line Source']].type;

        if ((arrowFromType !== 'Silo') && (arrowFromType !== 'Connector')) {
          console.log('Input arrow ignored - input arrows must point from Silos');
          console.log(`Found input arrow that points from a ${arrowFromType}`);
          return false;
        }
        const arrowToType = lucidColletion.index[data['Line Destination']].type;
        if ((arrowToType !== 'RuleSet') && (arrowToType !== 'Connector')) {
          console.log('Input arrow ignored - input arrows must point to RuleSets or connector');
          console.log(`Found input arrow that pointed to ${arrowFromType}`);
          return false;
        }

        if (arrowToType === '') {
          console.log('Input arrow must point to something - ignored');
          return false;
        }
        if (arrowFromType === '') {
          console.log('Input arrow must point from something - ignored');
          return false;
        }

        const arrow = {
          id: data.Id,
          srcObjectId: data['Line Source'],
          targetObjectId: data['Line Destination'],
          srcArrow: data['Source Arrow'],
          targetArrow: data['Destination Arrow'],
          label: data['Text Area 1'],
          data
        };
        if (!Object.prototype.hasOwnProperty.call(inputs.bySource, arrow.srcObjectId)) {
          inputs.bySource[arrow.srcObjectId] = [];
        }
        inputs.bySource[arrow.srcObjectId].push(arrow);
        // For convenience, do the reverse. Will make it easier to search later...
        if (!Object.prototype.hasOwnProperty.call(inputs.byTarget, arrow.targetObjectId)) {
          inputs.byTarget[arrow.targetObjectId] = [];
        }

        inputs.byTarget[arrow.targetObjectId].push(arrow);
        return true;
      },
      _containerMangler: (data) => {
        if (data['Contained By'] == '') {
          return false;
        }
        const arrContainers = data['Contained By'].split('|');
        const containedBy = [];
        arrContainers.forEach((container) => {
          const arrContainerDetails = container.split(':');
          containedBy.push({
            containerId: arrContainerDetails[0],
            index: arrContainerDetails[1] || '0'
          });
        });
        return containedBy;
      },

      department: () => {
        // pass - reserved for future use. function receives (data, target)
      },
      campaigncontainer: () => {
        // pass - reserved for future use. function receives (data, target)
      },
      boundary: () => {
        // pass - nothing particular to do at this time. reserved for future use
      },
      trackcontainer: (data, target) => {
        // possible todo: additional rule checking. ie, must belongn to campaigncontainer
        target.voltQuery = data.voltquery;
        target.entityTypeName = data.entitytypename;
      },
      channel: (data, target, csvHeaders) => {
        target.channelId = data.channelid;
        target.channelTypeId = data.channeltypeid;

        // remove stuff we already have in config or stuff that is useless...
        const remove = ['config', 'Page ID', 'type', 'name', 'Name', 'Shape Library', 'Contained By', 'Text Area 1'];
        const pick = csvHeaders.filter((field) => !remove.includes(field));
        target.config = (data.config) ? JSON.parse(data.config) : {};
        Object.keys(data).filter((key) => pick.includes(key)).reduce((obj, key) => {
          if (data[key].trim() !== '') { // disallow space only strings
            obj[key] = data[key];
          }
          return obj;
        }, target.config);
      },
      silo: (data, target) => {
        target.siloTypeId = data.silotypeid;
        const arrSiloLabel = data['Text Area 1'].split('-');
        [target.name, target.descr] = arrSiloLabel;
      },
      ruleset: (data, target, csvHeaders) => {
        target.name = data.name ? data.name.replace(/ /g, '-') : null;
        target.ruleSetId = data.rulesetid;

        const remove = ['config', 'Page ID', 'type', 'name', 'Name', 'Shape Library', 'Contained By', 'Text Area 1'];
        const pick = csvHeaders.filter((field) => !remove.includes(field));

        target.ruleParams = JSON.parse(data.ruleparams || '{}');

        Object.keys(data).filter((key) => pick.includes(key)).reduce((obj, key) => {
          if (data[key].trim() !== '') { // disallow space only strings
            obj[key] = data[key];
          }
          return obj;
        }, target.ruleParams);
      },
      class: (data, target) => {
        target.className = data.classname;
      },
      connector: (data, target) => {
        target.idx = data.idx;
      },
      ref: (data, target, csvHeaders) => {
        target.classRef = data.classref;

        const remove = ['config', 'Page ID', 'type', 'Shape Library', 'Contained By', 'Text Area 1'];
        const pick = csvHeaders.filter((field) => !remove.includes(field));

        target.config = JSON.parse(data.ruleparams || '{}');

        Object.keys(data).filter((key) => pick.includes(key)).reduce((obj, key) => {
          if (data[key].trim() !== '') { // disallow space only strings
            obj[key] = data[key];
          }
          return obj;
        }, target.config);
      }
    }
  },

  dbBuilder: {
    knexConnection: null,
    knexConnectionAsync: null,
    async haveDepartment(department) {
      const res = await this.knexConnectionAsync.select('*').from('core.department').where({
        name: department.name
      });
      if (res.length) { // record exists, so return id
        return res[0].departmentId;
      }
      return (await this.knexConnectionAsync.insert([{ // create new and return new id
        name: department.name,
        descr: department.descr
      }], 'departmentId').into('core.department'))[0];
    },

    async haveRuleSet(ruleSet) {
      // takes ruleSet, adds if not exists, always returns id
      const res = await this.knexConnectionAsync.select('*').from('core.ruleSet').where({
        name: ruleSet.name
      });
      if (res.length) { // record exists, so return id
        return res[0].ruleSetId;
      }
      return (await this.knexConnectionAsync.insert([{ // create new and return new id
        name: ruleSet.name,
        descr: ruleSet.descr,
        ruleData: ruleSet.metaData
      }], 'ruleSetId').into('core.ruleSet'))[0];
    },

    async haveChannel(channel) {
      const res = await this.knexConnectionAsync.select('*').from('core.channel').where({
        name: channel.name
      });
      if (res.length) { // record exists, so return id
        return res[0].channelId;
      }
      return (await this.knexConnectionAsync.insert([{ // create new and return new id
        name: channel.name,
        descr: channel.descr,
        config: channel.config,
        channelId: channel.channelId,
        channelTypeId: channel.channelTypeId
      }], 'channelId').into('core.channel'))[0];
    },
    async haveCampaign(campaign, parentDepartmentId) {
      const res1 = await this.knexConnectionAsync.select('*').from('core.campaign').where({
        name: campaign.name
      });
      let dbCampaignId;
      if (res1.length) { // record exists, so return id
        dbCampaignId = res1[0].campaignId;
      } else {
        /*
        For now we will wire all campaigns to what should be the first and only department specified
        in the chart. However, if we expand this in the future so that a chart can have multiple
        campaigns in different departments then here is where you would expand the code to do this
        */
        [dbCampaignId] = (await this.knexConnectionAsync.insert([{
          name: campaign.name,
          descr: campaign.descr,
          departmentId: parentDepartmentId
        }], 'campaignId').into('core.campaign'));
      }
      const res2 = await this.knexConnectionAsync.raw(`
        SELECT MAX("campaignRevId") FROM core."campaignRev" WHERE "campaignId" = '${dbCampaignId}'
      `);
      return (await this.knexConnectionAsync.insert([{
        campaignId: dbCampaignId,
        parentRevId: ((res2.length) ? res2[0].campaignRevId : null),
        descr: 'auto generated campaign revision by Lucid importer'
      }], 'campaignRevId').into('core.campaignRev'))[0];
    },
    async setCurrentTrackRev(trackId, trackRevId) {
      try {
        await this.knexConnectionAsync.raw(`
          UPDATE core."track" SET
          "currentTrackRevId" = ?
          WHERE track."trackId" = ?
          `, [trackRevId, trackId]);
      } catch (e) {
        console.log(e);
      }
      return true;
    },
    async haveTrack(track, containingObjectId) {
      const res1 = await this.knexConnectionAsync.select('*').from('core.track').where({
        name: track.name
      });
      let dbTrackId;
      if (res1.length) { // record exists, so return id
        dbTrackId = res1[0].trackId;
      } else {
        [dbTrackId] = (await this.knexConnectionAsync.insert([{
          name: track.name,
          descr: track.descr,
          entityTypeName: track.entityTypeName,
          campaignRevId: containingObjectId,
          trackStatusId: 2, // make live when in devel mode
        }], 'trackId').into('core.track'));
      }

      const res2 = await this.knexConnectionAsync.select('*').from('core.trackRev').where({
        trackId: dbTrackId
      });

      let trackRevId;
      if (res2.length) { // record exists, so return id
        trackRevId = false;
        console.log(`Track already exists with name "${track.name}" - not re-importing`);
      } else {
        [trackRevId] = (await this.knexConnectionAsync.insert([{
          trackId: dbTrackId,
          parentTrackRevId: null,
          descr: 'auto generated track revision by Lucid importer',
          voltQuery: track.voltQuery
        }], 'trackRevId').into('core.trackRev'));
      }
      return trackRevId;
    },
    async haveSilo(silo, lucidColletion) {
      let trackRevId;
      silo.containedBy.forEach((containedBy) => {
        if (lucidColletion.index[containedBy.containerId].type === 'trackContainer') {
          trackRevId = lucidColletion.index[containedBy.containerId].dbRevId;
        }
      });

      if (trackRevId) {
        return (await this.knexConnectionAsync.insert([{
          name: silo.name,
          descr: silo.descr,
          trackRevId,
          siloTypeId: silo.siloTypeId
        }], 'siloId').into('core.silo'))[0];
      }
      return false;
    },

    async addStep(silo, ruleSet, lucidColletion, boundary) {
      let onPassSiloDBId;
      let onFailSiloDBId = null;

      lucidColletion._connections.bySource[ruleSet.id].forEach((arrow) => {
        if ((arrow.label === '') || (arrow.label === 'yes')) {
          onPassSiloDBId = lucidColletion.index[arrow.targetObjectId].dbId;
        }
        if (arrow.label === 'no') {
          onFailSiloDBId = lucidColletion.index[arrow.targetObjectId].dbId;
        }
      });

      // does this rule have silo information being refered to it as input?
      // (only some rules such as thoses that count entities in a silo use this)
      ruleSet.ruleParams.arrowData = [];
      if (lucidColletion._inputs.byTarget[ruleSet.id]) {
        // pick which arrow props from lucidchart to import (just reduces noise over importing
        // everything)

        const collectData = (arrow) => {
          return {
            monitorSiloId: lucidColletion.index[arrow.srcObjectId].dbId,
            ...Object.keys(arrow.data)
              .filter((key) => lucidColletion.csvHeaders.includes(key)).reduce((obj, key) => {
                obj[key] = arrow.data[key];
                return obj;
              }, {})
          };
        };

        if (lucidColletion._inputs.byTarget[ruleSet.id].length === 1) { // single arrow mode
          ruleSet.ruleParams = collectData(lucidColletion._inputs.byTarget[ruleSet.id][0]);
        } else {
          lucidColletion._inputs.byTarget[ruleSet.id].forEach((arrow) => {
            // many arrows pointing to ruleset, must be something special so handle differently
            // (will need to create a special operator for this and envoy will need expanding
            // further to use this feature, look for 'processor' in ruleset.js)
            ruleSet.ruleParams.arrowData.push(collectData(arrow));
          });
        }
      }

      let priority = 100;
      if (lucidColletion._connections.byTarget[ruleSet.id]) { // protect from source rule
        lucidColletion._connections.byTarget[ruleSet.id].forEach(async (arrow) => {
          const v = parseInt(arrow.label, 10);
          if (boundary) { // special mode - inherit priorities from boundary container instead
            if (arrow.srcObjectId === boundary.id) {
              priority = Number.isNaN(v) ? 100 : v;
            }
          } else if (arrow.srcObjectId === silo.id) {
            priority = Number.isNaN(v) ? 100 : v;
          }
        });
      }

      await this.knexConnectionAsync.insert([{
        currentSiloId: silo ? silo.dbId : null,
        ruleSetId: ruleSet.dbId,
        priority,
        ruleSetParams: ruleSet.ruleParams,
        onPassSiloId: onPassSiloDBId,
        onFailSiloId: onFailSiloDBId
      }], 'stepId').into('core.step');
    },

    // When a silo is connected directly to another silo, this was previously illegal but is now
    // shorthand for "insert an autoPass rule between these silos", when all other rules have been
    // tested. Allows for simpler, smaller charts
    async addAutoPassStep(silo, targetObj) {
      await this.knexConnectionAsync.insert([{
        currentSiloId: silo.dbId,
        ruleSetId: 7, // hardwired - this value will not chnage
        priority: 1000, // A low priority, as unless testing something these will always be run last
        ruleSetParams: null, // autoPass rules take no params and never will
        onPassSiloId: targetObj.dbId,
        onFailSiloId: null // autoPass rules cannot fail, even when this feature is implemented
      }], 'stepId').into('core.step');
    },

    async addChannelToSilo(siloId, channelObj) {
      await this.knexConnectionAsync.insert([{
        channelId: channelObj.dbId,
        siloId,
        config: JSON.stringify(channelObj.config)
      }]).into('core.channel_silo');
      // in the future this is where we could add channelType weighting support here
      // users can set importance of rule weighting by labeling the arrows pointing to the rule
      // in lucid charts or draw2d
    },

    async make(lucidColletion, knexConnection) {
      this.knexConnection = knexConnection;
      this.knexConnectionAsync = promisify(this.knexConnection);

      // TODO: This lot needs a major refactor but for now it works

      for (const department of lucidColletion.department) {
        department.dbId = await this.haveDepartment(department);
      }

      for (const ruleSet of lucidColletion.ruleset) {
        // If the chart already gives a ruleSetId, then just use that. Don't add rule to db...
        ruleSet.dbId = (ruleSet.ruleSetId) ? ruleSet.ruleSetId : await this.haveRuleSet(ruleSet);
      }

      if (lucidColletion.channel) {
        for (const channel of lucidColletion.channel) {
          channel.dbId = await this.haveChannel(channel);
        }
      } else {
        console.log('*** Importing a track that has no channels! ***');
        console.log('This is probably not what you want in a production system');
      }

      for (const campaign of lucidColletion.campaigncontainer) {
        campaign.dbRevId = await this.haveCampaign(campaign, lucidColletion.department[0].dbId);
      }

      for (const track of lucidColletion.trackcontainer) {
        const containingObjectId = lucidColletion.campaigncontainer.find((campaign) => {
          return (campaign.id === track.containedBy[0].containerId);
        }).dbRevId;
        track.dbRevId = await this.haveTrack(track, containingObjectId);
      }

      for (const silo of lucidColletion.silo) {
        silo.dbId = await this.haveSilo(silo, lucidColletion);
      }

      for (const silo of lucidColletion.silo) {
        if (silo.dbId) {
          const arrPointsTo = lucidColletion._connections.bySource[silo.id];
          if (arrPointsTo) { // silo actually points to something
            for (const pointerTo of arrPointsTo) {
              const targetObj = lucidColletion.index[pointerTo.targetObjectId];
              if (targetObj.type === 'Channel') {
                await this.addChannelToSilo(silo.dbId, targetObj);
              }
              if (targetObj.type === 'RuleSet') {
                await this.addStep(silo, targetObj, lucidColletion);
              }

              if (targetObj.type === 'Silo') { // special shorthand condition - autoPass
                await this.addAutoPassStep(silo, targetObj, lucidColletion);
              }
            }
          }
        }
      }

      if (lucidColletion.boundary) {
        lucidColletion.boundary.forEach((b) => {
          // Find all silos contained by this boundary and
          // connect them to group channels/rulesets etc
          const boundedSilos = lucidColletion.silo.filter((s) => s.containedBy
            .some((cb) => cb.containerId === b.id));
          const arrPointsTo = lucidColletion._connections.bySource[b.id];
          if (arrPointsTo) { // boundary actually points to something
            for (const pointerTo of arrPointsTo) {
              const targetObj = lucidColletion.index[pointerTo.targetObjectId];
              boundedSilos.forEach((silo) => {
                if (targetObj.type === 'Channel') {
                  this.addChannelToSilo(silo.dbId, targetObj);
                }
                if (targetObj.type === 'RuleSet') {
                  // here
                  this.addStep(silo, targetObj, lucidColletion, b);
                }
                if (targetObj.type === 'Silo') { // special shorthand condition - autoPass
                  this.addAutoPassStep(silo, targetObj, lucidColletion);
                }
              });
            }
          }
        });
      }
      // Finally, look for Source silos with special rules that point not from another silo but
      // point from NULL and therefore should collect from entity table
      for (const silo of lucidColletion.silo) {
        if (silo.dbId) {
          if (silo.siloTypeId === '1') { // find source silos only
            // find all rules pointing from NULL to the source silo
            const connections = lucidColletion._connections.byTarget[silo.id];
            for (const connection of connections) {
              // find all connections that are ruleSets:
              const ruleSet = (lucidColletion.ruleset.filter((elem) => {
                return elem.id === connection.srcObjectId;
              }))[0];
              if (ruleSet) {
                // We now know the object is a ruleset, so now make sure the ruleSet doesn't point
                // from any other object by making sure it's not the target for any other object
                const isSourceRule = !lucidColletion._connections.byTarget[ruleSet.id];
                if (isSourceRule) {
                  await this.addStep(null, ruleSet, lucidColletion);
                }
              }
            }
          }
        }
      }

      const reportRecSet = await this.knexConnectionAsync.raw(`
          SELECT silo."siloId", silo.name AS "siloName", "siloType"."name" AS "siloTypeName",
          STRING_AGG(DISTINCT("passSilo"."siloId")::text, ', ') AS "DISTINCT passSiloIds",
          STRING_AGG(CONCAT(rs.name, ' -> ', "passSilo"."name", '(', "passSilo"."siloId"::text, ')'), ', ') AS "passList",
          STRING_AGG("failSilo"."siloId"::text, ', ') AS "failSiloId",
          STRING_AGG("failSilo"."name", ', ') AS "failSiloName",
          track.name as "trackName",
          campaign.name as CampaignName, department.name as DepartmentName
          FROM core."silo"
          LEFT JOIN core."trackRev" ON silo."trackRevId" = "trackRev"."trackRevId"
          LEFT JOIN core."track" ON "trackRev"."trackId" = "track"."trackId"

          LEFT JOIN core."campaignRev" ON "campaignRev"."campaignRevId" = track."campaignRevId"
          LEFT JOIN core.campaign ON campaign."campaignId" = "campaignRev"."campaignId"
          LEFT JOIN core.department ON department."departmentId" = campaign."departmentId"

          LEFT JOIN core."siloType" ON silo."siloTypeId" = "siloType"."siloTypeId"
          LEFT JOIN core.step ON silo."siloId" = step."currentSiloId"
          LEFT JOIN core.silo as "passSilo" ON "passSilo"."siloId" = step."onPassSiloId"
          LEFT JOIN core.silo as "failSilo" ON "failSilo"."siloId" = step."onFailSiloId"
          LEFT JOIN core."ruleSet" AS rs
          ON rs."ruleSetId" = step."ruleSetId"
          GROUP BY "track"."trackId", "siloType"."siloTypeId", silo."siloId", silo.name, "siloType"."name", track.name, campaign.name, department.name, "trackRev".created, silo."siloId"
          ORDER BY "track"."trackId", "trackRev".created, "siloType"."siloTypeId", silo."siloId"
        `);

      let op = '';
      op += '\n\n-------------- Track Status Report ---------------\n';

      let trackNameExisting = '';
      reportRecSet.rows.forEach((row) => {
        if (row.trackName !== trackNameExisting) {
          op += `\nFor track: ${row.trackName}\n\n`;
          op += 'siloId  siloName                          passList                                          failSilo\n';
          op += ''.padEnd(100, '\u{2500}');
          op += '\n';
        }

        const {
          trackName, siloId, siloName, siloTypeName, passList, failSiloId, failSiloName
        } = row;
        const targetsArr = passList.split(',');
        const id = siloId.toString().padEnd(8, ' ');
        const silofmt = ((siloTypeName === 'Stage') ? `${siloName}` : `${siloName} (${siloTypeName})`).padEnd(32, ' ');
        const failSiloIdfmt = (failSiloId === null) ? '' : `${failSiloName}(${failSiloId})`;

        if (targetsArr[0] === ' -> ()') {
          op += `${id}${silofmt}\u{2500} End of Branch / Journey Finish\n`;
        } else if (targetsArr.length === 1) {
          const passListfmt = passList.padEnd(50, ' ');
          op += `${id}${silofmt}\u{2500} ${passListfmt}${failSiloIdfmt}\n`;
        } else { // multi-line
          const arrPassList = passList.split(',');
          const firstLine = arrPassList.shift();
          const firstLinefmt = firstLine.padEnd(50, ' ');
          op += `${id}${silofmt}\u{252C} ${firstLinefmt}${failSiloIdfmt}\n`;
          arrPassList.forEach((passLine, idx, array) => {
            const pad = ''.padStart(39, ' ');
            let passLinefmt = '';
            if (idx === array.length - 1) {
              passLinefmt = `${pad} \u{2514}${passLine}`;
            } else {
              passLinefmt = `${pad} \u{251C}${passLine}`;
            }
            op += `${passLinefmt}\n`;
          });
        }
        trackNameExisting = trackName;
      });
      console.log(op);
    }
  }
};

// usefull box drawing unicode: http://jrgraphix.net/r/Unicode/2500-257F