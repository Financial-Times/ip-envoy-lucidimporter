const _ = require('lodash'); // eslint-disable-line no-unused-vars
const logger = require('@financial-times/n-logger').default;

module.exports.handlers = {
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
      logger.warn('Arrow ignored - direction is ambigous');
      return false;
    }

    // Arrows must point, otherwise its just a line
    if ((data['Source Arrow'] === 'None') && (data['Destination Arrow'] === 'None')) {
      logger.warn('Line ignored - line is not an arrow - no relationship created');
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
      && (arrowFromType !== 'Action')
      && (arrowFromType !== 'Boundary')
      && (arrowFromType !== 'Connector')) {
      logger.warn('Arrow ignored - arrows must point from RuleSets, Silos or Actions');
      logger.warn(`Found arrow that pointed from ${arrowFromType}`);
      return false;
    }

    const arrowToType = lucidColletion.index[data['Line Destination']].type;
    if ((arrowToType !== 'RuleSet')
      && (arrowToType !== 'Silo')
      && (arrowToType !== 'Action')
      && (arrowToType !== 'Connector')) {
      logger.warn('Arrow ignored - arrows must point to RuleSets, Silos or Actions');
      logger.warn(`Found arrow that pointed to ${arrowToType}`);
      return false;
    }

    if (arrowToType === '') {
      logger.warn('Arrow must point to something - ignored');
      return false;
    }
    if (arrowToType === '') {
      logger.warn('Arrow must point from something - ignored');
      return false;
    }

    // Arrows that point from Silos must point to Actions or ruleSets
    if ((arrowFromType === 'Silo')
      && (arrowToType !== 'RuleSet')
      && (arrowToType !== 'Silo')
      && (arrowToType !== 'Connector') // This is now allowed, shorthand for autoPass rule
      && (arrowToType !== 'Action')) {
      logger.warn(`Arrow points from a ${arrowFromType} (${arrowFromName}) to a ${arrowToType} (${arrowToName})`);
      return false;
    }

    // Arrows that point from ruleSets must point to silos
    if ((arrowFromType === 'RuleSet')
      && (arrowToType !== 'Connector') // This is now allowed, shorthand for autoPass rule
      && (arrowToType !== 'Silo')) {
      logger.warn(`Arrow points from a ${arrowFromType} (${arrowFromName}) to a ${arrowToType} (${arrowToName})`);
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
      logger.warn('Input arrow ignored - direction is ambigous - it should point to the rule');
      return false;
    }

    // Arrows must point, otherwise its just a line
    if ((data['Source Arrow'] === 'None') && (data['Destination Arrow'] === 'None')) {
      logger.warn('Line ignored - line is not an arrow but its marked as an input - no relationship created');
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
      logger.warn('Input arrow ignored - input arrows must point from Silos');
      logger.warn(`Found input arrow that points from a ${arrowFromType}`);
      return false;
    }
    const arrowToType = lucidColletion.index[data['Line Destination']].type;
    if ((arrowToType !== 'RuleSet') && (arrowToType !== 'Connector')) {
      logger.warn('Input arrow ignored - input arrows must point to RuleSets or connector');
      logger.warn(`Found input arrow that pointed to ${arrowFromType}`);
      return false;
    }

    if (arrowToType === '') {
      logger.warn('Input arrow must point to something - ignored');
      return false;
    }
    if (arrowFromType === '') {
      logger.warn('Input arrow must point from something - ignored');
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
    if (data['Contained By'] === '') {
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
    target.journeyConfig = data.journeyconfig;
  },
  action: (data, target, csvHeaders) => {
    target.actionId = data.actionid;
    target.actionTypeId = data.actiontypeid;

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
};
