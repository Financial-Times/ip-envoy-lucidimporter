const _ = require('lodash');
const logger = require('@financial-times/n-logger').default;

const { promisify } = require('util');
const { resolveTemplate, deepResolveTemplate } = require('./tepmplateResolver');
const { handlers } = require('./handlers');
const { isViolateRule } = require('./isViolateRule');

module.exports.preParser = {
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

    if ((type === '') && (data.Name === 'Line')) {
      this.handlers._arrowMangler(data, this.lucidColletion);
      return false; // nothing further to process for this line, so exit
    }

    if ((type === 'input') && (data.Name === 'Line')) {
      this.handlers._arrowManglerInput(data, this.lucidColletion);
      return false; // nothing further to process for this line, so exit
    }

    if (type === '') {
      return false;
    }

    if (typeof this.handlers[type] !== 'function') {
      logger.warn(`There is no data importer for object type "${type}"`);
      logger.warn('Please check your Lucid diagram or extend the import library for');
      logger.warn('your new object');
      return false;
    }

    const typeTarget = this.getBranch(type);
    // find out what objects contain this one (normally campaigns and journeys)
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

    logger.info('Checking if any of the journeys name satisfy the nameing rule ...');
    const journeyNames = lc.trackcontainer.map((journey) => journey.name.toLowerCase());
    console.log(isViolateRule(journeyNames[0]));
    if (!isViolateRule(journeyNames[0])) {
      logger.info(`*** JOURNEY NAME violate rules, please check the name!, Journey:${journeyNames[0]} ***`);
      return false;
    }

    logger.info('Checking if any of the journeys already exist...');
  
    const res = await knexConnectionAsync.select('name').from('core.journey');
    const existingJourneyNames = res.map((dbJourney) => dbJourney.name.toLowerCase());

    if (existingJourneyNames.includes(journeyNames[0])) {
      logger.info('Journey Exist!, No new journeys to import');
      return false;
    }

    // Arrow forking/converging:
    logger.info('Processing any converging or forking arrows...');
    this.arrowJoiner('_connections');
    this.arrowJoiner('_inputs');

    this.lucidCollectionPreped = _.cloneDeep(lc); // manipulator target
    // Class Mangling:
    logger.info('Seeing if there are any classes to mangle...');
    if (!lc.ref && !lc.class) {
      logger.info('No classes found in this chart, moving on...');
      return true;
    }
    logger.info('Yes there are, let\'s get mangling...');

    // we have new objects to create so find the current max Id as starting point
    const divertionMap = {}; // map old ids to new instance ids
    const classObjects = ['Boundary', 'Silo', 'RuleSet', 'Action'];
    logger.info('copying classes...');

    classObjects.forEach((objType) => {
      const dm = this.copyClassObjects(objType, divertionMap);
      Object.keys(dm).forEach((ref) => {
        Object.keys(dm[ref]).forEach((oldId) => {
          if (!divertionMap[ref]) divertionMap[ref] = {};
          divertionMap[ref][oldId] = dm[ref][oldId];
        });
      });
    });
    logger.info('Diverting arrows to new class instances...');
    this.divertArrows(divertionMap, '_connections');
    this.divertArrows(divertionMap, '_inputs');
    logger.info('Class mangling complete');
    return true;
  },
  getBranch(type) {
    if (!Object.prototype.hasOwnProperty.call(this.lucidColletion, type)) {
      this.lucidColletion[type] = [];
    }
    return this.lucidColletion[type];
  },
  handlers
};
