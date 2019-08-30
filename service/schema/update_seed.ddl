


INSERT INTO core."entityType"("name") VALUES
  ('user'),
  ('anon')
;

-- Describe the Silo Types
INSERT INTO core."siloType"("siloTypeId", "name", "descr") VALUES
   (1, 'Source', 'Starting point of a user journey')
  ,(2, 'Stage', 'Used for holding users as part of thier journey until something happens')
  ,(3, 'Shelve', 'Holds users until a future manual intervention removes them')
  ,(4, 'Drain', 'End point of a user journey')
  /* Reserved for possible future use
  ,(5, 'Transport', 'Users in this Silo can jump from one track to another. Allows joining of tracks and ability to make modular user journeys')
  */
;

-- Define how users may move between silo types
INSERT INTO core."siloTypeProgression"("siloTypeProgressionId", "fromSiloTypeId", "toSiloTypeId") VALUES
   (1,1,2)
  ,(2,1,3)
  ,(3,1,4)
  ,(4,2,2)
  ,(5,2,3)
  ,(6,2,4)
  ,(7,3,2)
  ,(8,3,3)
  ,(9,3,4)
  /* Reserved for possible future use - a user in drain may only go to Transport
  ,(10,4,5)
  */
   ;

INSERT INTO core."trackStatus" ("trackStatusId", "name", "descr") VALUES
   (1, 'pending', 'Track is initiated, but the initial query has not been run and no entities exist in first silo')
  ,(2, 'primed', 'Initial query has been run and entities are in first silo only, ready for onward processing')
  ,(3, 'live', 'Track is active and entities are being moved between silos')
  ,(4, 'paused', 'Track is live but paused, no rules are being process and entities will not move between silos')
  ,(5, 'halted', 'Track has been stopped and will not be resumed without manual intervention, because an emergency stop has been triggered')
  ,(6, 'edit', 'This track is still being edited by a user and is not yet in use')
  ;

-- INSERT some Test rules to be going on with. Eventually we may import these from Lucidchart

INSERT INTO core.volt_query VALUES
  ('getUserPreferences'),
  ('getEmailData'),
  ('signupViews'),
  ('getOnsiteMessages'),
  ('UserInfo')
  ;
