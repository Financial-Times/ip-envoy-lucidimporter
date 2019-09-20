CREATE SCHEMA IF NOT EXISTS core;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

/* set up Entity Tables */

CREATE TABLE IF NOT EXISTS core."entityType"(
  "name" VARCHAR(16) NOT NULL PRIMARY KEY
);

COMMENT ON TABLE core."entityType" IS 'Defines Entities, in most cases this will be users but can
be expanded to anything';
COMMENT ON COLUMN core."entityType"."name" IS 'A description of what the entity is about';

CREATE TABLE IF NOT EXISTS core."entity"(
  "entityId" VARCHAR(60) NOT NULL DEFAULT uuid_generate_v1() PRIMARY KEY,
  "entityTypeName" VARCHAR(16) NOT NULL REFERENCES core."entityType"("name"),
  "created" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ruleSetRun" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currentData" JSON
);

/* set up Journey */

CREATE TABLE IF NOT EXISTS core."journeyStatus"(
  "journeyStatusId" SMALLSERIAL PRIMARY KEY,
  "name" VARCHAR(32) NOT NULL,
  "descr" VARCHAR(128) NULL
);


CREATE TABLE IF NOT EXISTS core."journey"(
  "journeyId" SERIAL PRIMARY KEY,
  "created" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "journeyStatusId" SMALLINT NOT NULL REFERENCES core."journeyStatus"("journeyStatusId") DEFAULT 2,
  "parentJourneyId" INT NULL REFERENCES core."journey"("journeyId"),
  "entityTypeName" VARCHAR(16) NOT NULL REFERENCES core."entityType"("name"),
  "name" VARCHAR(64) NOT NULL,
  "descr" VARCHAR(128) NULL,
  "deleted" TIMESTAMP NULL,
  "voltQuery" TEXT NULL,
  "GUIData" JSON
);
COMMENT ON TABLE core."journey" IS 'Defines journeys';

/* set up Silos */

CREATE TABLE IF NOT EXISTS core."siloType"(
  "siloTypeId" SMALLSERIAL PRIMARY KEY,
  "name" VARCHAR(32) NOT NULL,
  "descr" VARCHAR(128) NULL
);
COMMENT ON TABLE core."siloType" IS 'Defines whether a Silo is of type source, holding, drain etc';

CREATE TABLE IF NOT EXISTS core."siloTypeProgression"(
  "siloTypeProgressionId" SMALLSERIAL PRIMARY KEY,
  "descr" VARCHAR(64) NULL,
  "fromSiloTypeId" SMALLINT NOT NULL REFERENCES core."siloType"("siloTypeId"),
  "toSiloTypeId" SMALLINT NOT NULL REFERENCES core."siloType"("siloTypeId"),
  unique("fromSiloTypeId", "toSiloTypeId")
);
COMMENT ON TABLE core."siloTypeProgression" IS 'Describes how entities should move between silo
types. For example, entities should start at a source and progress their way to a drain, not the
other way around';

CREATE TABLE IF NOT EXISTS core."silo"(
  "siloId" SERIAL PRIMARY KEY,
  "siloTypeId" SMALLINT NOT NULL REFERENCES core."siloType"("siloTypeId"),
  "journeyId" INT NOT NULL REFERENCES core."journey"("journeyId"),
  "name" VARCHAR(32) NOT NULL,
  "descr" VARCHAR(64) NULL,
  "props" JSONB NULL,
  "GUIref" UUID
);
COMMENT ON TABLE core."silo" IS 'Defines each silo that entities can reside in
during their journeys';

COMMENT ON COLUMN core."silo"."props" IS 'This is reserved for future use, should we want to add properties to silos';

/* entityType Tables - reserved for future use */

/* actions */

CREATE TABLE IF NOT EXISTS core."actionType"(
  "actionTypeId" SMALLSERIAL PRIMARY KEY,
  "name" VARCHAR(32) NOT NULL UNIQUE,
  "config" JSON NULL
);

-- COMMENT ON TABLE core."actionType" IS 'Defines action type such as SMS, OSM, phone, whatsApp etc,
-- along with any additional metadata required to communicate with that action';


CREATE TABLE IF NOT EXISTS core."silo_weighting"(
  "siloId" INT NOT NULL REFERENCES core."silo"("siloId"),
  "actionTypeId" SMALLINT NOT NULL REFERENCES core."actionType"("actionTypeId"),
  "weighting" REAL NOT NULL,
  PRIMARY KEY("siloId", "actionTypeId")
);

COMMENT ON TABLE core."silo_weighting" IS 'Give some silos a bigger weighting and importance than
others. Weighting can be separated by actionType. Messages in a higher weighted Silo will win over
messages in a lower weighted silo in the event they compete (OSM for example)';


CREATE TABLE IF NOT EXISTS core."action"(
  "actionId" SMALLSERIAL PRIMARY KEY,
  "actionTypeId" SMALLINT NOT NULL REFERENCES core."actionType"("actionTypeId"),
  "name" VARCHAR(32) NOT NULL UNIQUE,
  "descr" VARCHAR(64) NULL,
  "config" JSON NULL
);

COMMENT ON TABLE core."action" IS 'Defines actions. metadata can be used for any arbitrary
information needed by the action';

CREATE TABLE IF NOT EXISTS core."action_silo"(
  "action_silo_id" SERIAL PRIMARY KEY,
  "actionId" SMALLINT NOT NULL REFERENCES core."action"("actionId"),
  "siloId" INT NOT NULL REFERENCES core."silo"("siloId"),
  "config" JSON NULL,
  "temp_tata" JSON NULL,
  "GUIref" UUID
);

COMMENT ON TABLE core."action_silo" IS 'Links silos to actions. In other words, when a entity
lands in a silo, this table decides what actions are triggered.';
COMMENT ON COLUMN core."action_silo"."config" IS 'specific configuration to use for this action instance on this specific silo. For example, email templateId';

/* rules engine */

CREATE TABLE IF NOT EXISTS core.volt_query(
  proc_name VARCHAR(32) NOT NULL PRIMARY KEY
);

/* steps to build up journeys */

CREATE TABLE IF NOT EXISTS core."step"(
  "stepId" SERIAL PRIMARY KEY,
  "priority" SMALLINT DEFAULT 1,
  "currentSiloId" INT NULL REFERENCES core."silo"("siloId"),
  "ruleSetName" VARCHAR(64) NOT NULL,
  "ruleSetParams" JSON NULL,
  "onPassSiloId" INT NULL REFERENCES core."silo"("siloId"), -- COL DEPRECATED! - NULL constraint removed
  "onFailSiloId" INT NULL REFERENCES core."silo"("siloId")
);

COMMENT ON TABLE core."step" IS 'Defines how the entities moves from one silo to another
depending on the outcome of a series of rulesets. In other words, this table defines all journeys';
COMMENT ON COLUMN core."step"."currentSiloId" IS 'The current silo to which this rule applies. If null then it collects from entities table';
COMMENT ON COLUMN core."step"."ruleSetParams" IS 'Silo specific rulesets params to pass to ruleSet. Eg: a value for time delay.';

/* Johns mucking about - add support for multiple output rulesets experiment */

CREATE TABLE IF NOT EXISTS core."step_passingSilos"(
  "stepId" INT NOT NULL REFERENCES core."step"("stepId"),
  "onPassSiloId" INT NOT NULL REFERENCES core."silo"("siloId"),
  "label" VARCHAR(255) NOT NULL DEFAULT 'yes',
  PRIMARY KEY("stepId", "onPassSiloId")
);
COMMENT ON TABLE core."step_passingSilos" IS 'Allows a ruleset to have more than one outcome, instead
of a boolean pass/fail, it can support multiple onward passing silos';

/* scheduling */

CREATE TABLE IF NOT EXISTS core."schedule"(
  "stepId" INT NOT NULL REFERENCES core."step"("stepId"),
  "entityId" VARCHAR(60) NOT NULL REFERENCES core."entity"("entityId"),
  "nextTrigger" TIMESTAMP NOT NULL,
  "triggerCount" INT NOT NULL,
  PRIMARY KEY("stepId", "entityId")
);

COMMENT ON TABLE core."schedule" IS 'A table of rescheduled triggers. Generally used to make delay rules and polling more effecient';
COMMENT ON COLUMN core."schedule"."nextTrigger" IS 'The scheduled rules attached to this silo should not be reriggered until this time has passed';
COMMENT ON COLUMN core."schedule"."triggerCount" IS 'Keeps a count of how often this has been trtriggered. When silo maxTries exceeded this stops';

/* This may be removed in the future in favour of JSONB persistance for entity journey positions */

CREATE TABLE IF NOT EXISTS core."entity_silo"(
  "entity_silo_id" SERIAL PRIMARY KEY,
  "parent_entity_silo_id" INT NULL REFERENCES core."entity_silo"("entity_silo_id"),
  "lastStepId" INT NULL REFERENCES core."step"("stepId"),
  "ruleSetResult" JSON NULL,
  "entityId" VARCHAR(60) NOT NULL REFERENCES core."entity"("entityId"),
  "entityTypeName" VARCHAR(16) NOT NULL REFERENCES core."entityType"("name"),
  "siloId" INT NOT NULL REFERENCES core."silo"("siloId"),
  "created" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "siloVisitCount" INT NULL
);

COMMENT ON TABLE core."entity_silo" IS 'Keeps a record what silo an entiy occupies and the movement
history between silos';
COMMENT ON COLUMN core."entity_silo"."siloId" IS 'The siloId in which the entity resides';
COMMENT ON COLUMN core."entity_silo"."lastStepId" IS 'The last stepId that was taken that caused
the entity to be in the current silo';
COMMENT ON COLUMN core."entity_silo"."ruleSetResult" IS 'Info about the rule/s that fired within the ruleset that caused this entity to be here';

CREATE TABLE IF NOT EXISTS core."action_entity_silo_log"(
  "action_entity_silo_log_id" SERIAL PRIMARY KEY,
  "entity_silo_id" INT NOT NULL REFERENCES core."entity_silo"("entity_silo_id"),
  "actionKey" UUID NOT NULL DEFAULT uuid_generate_v1(),
  "action_silo_id" INT NOT NULL REFERENCES core."action_silo"("action_silo_id"),
  "created" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "logData" JSON NULL,
  unique ("actionKey")
);

COMMENT ON TABLE core."action_entity_silo_log" IS 'Keeps a note of what action is activated for
each entity and prevents duplicates';

CREATE INDEX entity_silo_entityid_fkey ON core.entity_silo ("entityId");
CREATE INDEX entity_silo_siloid_fkey ON core.entity_silo ("siloId");
CREATE UNIQUE INDEX entity_id_silo_id_key ON core.entity_silo ("entityId", "siloId");
