const _ = require('lodash');
const { promisify } = require('util');

module.exports.dbBuilder = {
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
        trackStatusId: (process.env.NODE_ENV === 'development') ? 3 : 2, // make live when in devel mode
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
      if (ruleSet.ruleSetId) {
        ruleSet.dbId = ruleSet.ruleSetId 
      } else {
        if ( await this.haveRuleSet(ruleSet)) {
          ruleSet.dbId = await this.haveRuleSet(ruleSet) 
        } else {
          console.log('😸  ** RULE DOSE NOT EXIST !, Importing Track Terminated! **');
          return false;
        }
      }
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
};
