const _ = require('lodash'); // eslint-disable-line no-unused-vars
const { promisify } = require('util');
const logger = require('@financial-times/n-logger').default;

module.exports.dbBuilder = {
  knexConnection: null,
  knexConnectionAsync: null,

  async haveAction(action) {
    const res = await this.knexConnectionAsync.select('*').from('core.action').where({
      name: action.name
    });
    if (res.length) { // record exists, so return id
      return res[0].actionId;
    }
    return (await this.knexConnectionAsync.insert([{ // create new and return new id
      name: action.name,
      descr: action.descr,
      config: action.config,
      actionId: action.actionId,
      actionTypeId: action.actionTypeId
    }], 'actionId').into('core.action'))[0];
  },

  async haveJourney(journey) {
    const res1 = await this.knexConnectionAsync.select('*').from('core.journey').where({
      name: journey.name
    });
    let dbJourneyId;
    if (res1.length) { // record exists, so return id
      dbJourneyId = res1[0].journeyId;
    } else {
      [dbJourneyId] = (await this.knexConnectionAsync.insert([{
        name: journey.name,
        descr: journey.descr,
        entityTypeName: journey.entityTypeName,
        journeyStatusId: (process.env.NODE_ENV === 'development') ? 3 : 2, // make live when in devel mode
      }], 'journeyId').into('core.journey'));
    }

    const res2 = await this.knexConnectionAsync.select('*').from('core.journey').where({
      journeyId: dbJourneyId
    });

    let journeyId;
    if (res2.length) { // record exists, so return id
      journeyId = dbJourneyId;
      logger.warn(`Journey already exists with name "${journey.name}" - not re-importing`);
    } else {
      [journeyId] = (await this.knexConnectionAsync.insert([{
        journeyId: dbJourneyId,
        parentJourneyId: null,
        descr: 'auto generated journey revision by Lucid importer V2',
        voltQuery: journey.voltQuery
      }], 'journeyId').into('core.journey'));
    }

    return journeyId;
  },
  async haveSilo(silo, lucidColletion) {
    let journeyId;
    silo.containedBy.forEach((containedBy) => {
      if (lucidColletion.index[containedBy.containerId].type === 'trackContainer') {
        journeyId = lucidColletion.index[containedBy.containerId].dbRevId;
      }
    });

    if (journeyId) {
      return (await this.knexConnectionAsync.insert([{
        name: silo.name,
        descr: silo.descr,
        journeyId,
        siloTypeId: silo.siloTypeId
      }], 'siloId').into('core.silo'))[0];
    }
    return false;
  },

  async addStep(silo, ruleSet, lucidColletion, boundary) {
    let onPassSiloDBId;
    let onFailSiloDBId = null;

    const passSiloLinks = {};

    lucidColletion._connections.bySource[ruleSet.id].forEach((arrow) => {
      if ((arrow.label === '') || (arrow.label === 'yes')) {
        onPassSiloDBId = lucidColletion.index[arrow.targetObjectId].dbId;
        passSiloLinks.yes = lucidColletion.index[arrow.targetObjectId].dbId;
      } else if (arrow.label === 'no') {
        onFailSiloDBId = lucidColletion.index[arrow.targetObjectId].dbId;
      } else {
        passSiloLinks[arrow.label] = lucidColletion.index[arrow.targetObjectId].dbId;
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

    // If we ever want to add some validation to rule names, here is where we would do it

    const stepId = await this.knexConnectionAsync.insert([{
      currentSiloId: silo ? silo.dbId : null,
      ruleSetName: ruleSet.name,
      priority,
      ruleSetParams: ruleSet.ruleParams,
      onPassSiloId: onPassSiloDBId, // DEPRECATED - TODO: remove this line
      onFailSiloId: onFailSiloDBId
    }], 'stepId')
      .into('core.step');

    // TODO: here. This populates step_passingSilos JOIN
    // We'll need to decommision the old column from above and clear

    await Object.keys(passSiloLinks).forEach(async (label) => {
      await this.knexConnectionAsync.insert([{
        stepId: stepId[0],
        onPassSiloId: passSiloLinks[label],
        label
      }], 'stepId').into('core.step_passingSilos');
    });
  },

  // When a silo is connected directly to another silo, this was previously illegal but is now
  // shorthand for "insert an autoPass rule between these silos", when all other rules have been
  // tested. Allows for simpler, smaller charts
  async addAutoPassStep(silo, targetObj) {
    const stepId = await this.knexConnectionAsync.insert([{
      currentSiloId: silo.dbId,
      ruleSetName: 'autoPass',
      priority: 1000, // A low priority, as unless testing something these will always be run last
      ruleSetParams: null, // autoPass rules take no params and never will
      onPassSiloId: targetObj.dbId,
      onFailSiloId: null // autoPass rules cannot fail, even when this feature is implemented
    }], 'stepId').into('core.step');

    await this.knexConnectionAsync.insert([{
      stepId: stepId[0],
      onPassSiloId: targetObj.dbId,
      label: 'yes'
    }], 'stepId').into('core.step_passingSilos');
  },

  async addActionToSilo(siloId, actionObj) {
    await this.knexConnectionAsync.insert([{
      actionId: actionObj.dbId,
      siloId,
      config: JSON.stringify(actionObj.config)
    }]).into('core.action_silo');
    // in the future this is where we could add actionType weighting support here
    // users can set importance of rule weighting by labeling the arrows pointing to the rule
    // in lucid charts or draw2d
  },

  async make(lucidColletion, knexConnection) {
    this.knexConnection = knexConnection;
    this.knexConnectionAsync = promisify(this.knexConnection);

    if (lucidColletion.channel && lucidColletion.action) {
      logger.warn('*** A mix of channels and actions has been found and channels are deprecated***');
      logger.warn('*** Please use only actions from now on, existing channels will be ignored ***');
    }

    if (lucidColletion.action) {
      for (const action of lucidColletion.action) {
        action.dbId = await this.haveAction(action);
      }
    } else if (lucidColletion.channel) {
      logger.warn('*** Old style chart detected that uses channels ***');
      logger.warn('*** There are deprecated, please use asction in new journeys ***');
      for (const action of lucidColletion.channel) {
        action.dbId = await this.haveAction(action);
      }
    } else {
      logger.warn('*** Importing a journey that has no actions (or deprecated channels)! ***');
      logger.warn('This is probably not what you want in a production system');
    }

    for (const journey of lucidColletion.trackcontainer) {
      journey.dbRevId = await this.haveJourney(journey);
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
            if (targetObj.type === 'Action') {
              await this.addActionToSilo(silo.dbId, targetObj);
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
        // connect them to group actions/rulesets etc
        const boundedSilos = lucidColletion.silo.filter((s) => s.containedBy
          .some((cb) => cb.containerId === b.id));
        const arrPointsTo = lucidColletion._connections.bySource[b.id];
        if (arrPointsTo) { // boundary actually points to something
          for (const pointerTo of arrPointsTo) {
            const targetObj = lucidColletion.index[pointerTo.targetObjectId];
            boundedSilos.forEach((silo) => {
              if (targetObj.type === 'Action') {
                this.addActionToSilo(silo.dbId, targetObj);
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
      STRING_AGG(CONCAT(step."ruleSetName", '.', ps.label , ' -> ', "passSilo"."name", '(', "passSilo"."siloId"::text, ')'), ', ') AS "passList",
      STRING_AGG("failSilo"."siloId"::text, ', ') AS "failSiloId",
      STRING_AGG("failSilo"."name", ', ') AS "failSiloName",
      journey.name as "journeyName"
      FROM core."silo"
      LEFT JOIN core."journey" ON silo."journeyId" = "journey"."journeyId"
      LEFT JOIN core."siloType" ON silo."siloTypeId" = "siloType"."siloTypeId"
      LEFT JOIN core.step ON silo."siloId" = step."currentSiloId"
      LEFT JOIN core."step_passingSilos" AS ps ON ps."stepId" = step."stepId"
      LEFT JOIN core.silo as "passSilo" ON "passSilo"."siloId" = ps."onPassSiloId"
      LEFT JOIN core.silo as "failSilo" ON "failSilo"."siloId" = step."onFailSiloId"
      GROUP BY "journey"."journeyId", "siloType"."siloTypeId", silo."siloId", silo.name, "siloType"."name", journey.name, "journey".created, silo."siloId"
      ORDER BY "journey"."journeyId", "journey".created, "siloType"."siloTypeId", silo."siloId"
    `);

    let op = '';
    op += '\n\n-------------- Journey Status Report ---------------\n';

    let journeyNameExisting = '';
    reportRecSet.rows.forEach((row) => {
      if (row.journeyName !== journeyNameExisting) {
        op += `\nFor journey: ${row.journeyName}\n\n`;
        op += 'siloId  siloName                          passList                                          failSilo\n';
        op += ''.padEnd(100, '\u{2500}');
        op += '\n';
      }

      const {
        journeyName, siloId, siloName, siloTypeName, passList, failSiloId, failSiloName
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
      journeyNameExisting = journeyName;
    });
    logger.info(op);
  }
};
