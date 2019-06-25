


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

INSERT INTO core."ruleSet"("ruleSetId", "name", "descr", "ruleData", "scheduled", "volt_query", "volt_query_key") VALUES

  (1, 'timeDelay', 'A simple 1 minute hardwired time delay for testing', '{}', true, null, null),
  (5, 'newSecondarySchoolUsers', 'Check if user now has is on SSI license', '{}', false, null, null),
  (7, 'autoPass', 'Auto return true for rull pass (usually after channel send)', '{}', false, null, null),
  (8, 'newPremiumUsers', 'Check if user now has premium subscription', '{}', false, 'getUserPreferences', null),

  (10, 'signup-click', 'signup user to firstft americas if click on signup link', '{}', false, null, null),

  (34, 'subscription-payment-success', 'check if payment success', '{}', false, null, null),
  (36, 'control-group-10-percent', 'random split at 10 percent', '{}', false, null, null),
  (38, 'delay-7-days', 'wait till midnight 7 days later', '{}', true, null, null),
  (39, 'licence-suspended', 'check if user licence-suspended', '{}', false, null, null),
  (41, 'subscription-payment-failure', 'check if payment failure', '{}', false, null, null),
  (46, 'avios-signup', 'check if signup due to avios promotion', '{}', false, null, null),
  (47, 'subscription-valid-15-days', 'check if subscription is valid after cooloff period', '{}', true, null, null),
  (48, 'subscription-cancelled', 'check if subscription cancel request processed', '{}', false, null, null),

  (100, 'delay', 'Delay by given number of minutes, hours or days', '{}', true, null, null),
  (101, 'delay-days', 'Delay until midnight after given number of days', '{}', true, null, null),
  (102, 'delay-until', 'Delay until specific or recurring, date and time, or weekday', '{}', true, null, null),

  (103, 'split', 'Split entities by percentage. Used for creating control groups', '{}', false, null, null),
  (104, 'silo-count', 'Pass according to entity count in another silo', '{}', false, null, null),
  (105, 'flow-rate', 'Pass according to flow rate of entities through given silo', '{}', false, null, null),

  (107, 'email-action', 'Pass if an entity has taken an action on an email', '{}', false, null, null),
  (108, 'component-action', 'Pass if an entity has taken an action on an component', '{}', false, null, null),
  (109, 'myft-notification-action', 'Pass if an entity has taken an action on the myft component', '{}', false, null, null),

  (110, 'daysOfWeek', 'An entity is held until it is the given day/s of week', '{}', true, null, null),
  (111, 'daysOfMonth', 'An entity is held until it is the given day/s of month', '{}', true, null, null),
  (112, 'daysOfYear', 'An entity is held until it is the given day/s of year', '{}', true, null, null),

  (113, 'universal', 'A universal and fully configurable rule', '{}', false, null, null),
  (114, 'universal-getUserPreferences', 'A universal and fully configurable rule with userPref voltData', '{}', false, 'getUserPreferences', null),
  (116, 'email-action-within-window', 'Pass if an entity has taken an action within the window', '{}', false, null, null),
  (117, 'myft-page-view-topic-count', 'Pass if an entity landed on the page', '{}', false, null, null),
  (118, 'scs', 'Check entity with the Single Consent Store', '{}', false, null, null),
  (119, 'licence-allocation', 'Pass if an entity has be allocated to a specific licence', '{}', false, null, null),
  (120, 'licence-deallocation', 'Pass if an entity has be deallocated from a specific licence', '{}', false, null, null),
  (121, 'universal-userInfo', 'A universal and fully configurable rule with userInfo voltData', '{}', false, 'UserInfo', null),
  (122, 'component-action-count', 'Pass if an entity has taken an action on an component and the count is matched', '{}', false, null, null),
  (123, 'b2b-prospect-action', 'Pass if an entity has taken an action on a b2b prospect component', '{}', false, null, null),
  (124, 'site-visited', 'An entity has visited the site within the given timeframe', '{}', false, 'UserInfo', null),
  (125, 'seeded-split', 'Consistenly split entities into groups. A user in group x will always be in group x', '{}', false, null, null),
  (126, 'subscription-purchased', 'An entity has purchased a subscription with a specific offer ID', '{}', false, null, null),
  (128, 'myft-follow', 'A user has followed a myFT topic', '{}', false, null, null),
  (129, 'article-view', 'A user has viewed a premium article', '{}', false, null, null),
  (130, 'cancelled-trialist', 'A user has cancelled during their trial', '{}', false, null, null),
  (127, 'book-your-consult', 'When the user send book your consult email from people stage', '{}', false, null, null),
  (131, 'email-action-book-your-consult', 'An entity has taken an action on the book your consult email', '{}', false, null, null),
  (132, 'my-ft-welcome', 'A subscription has been purchased', '{}', false, null, null),
  (133, 'global-control', 'Check entity with global control group', '{}', false, null, null),
  (134, 'anon-page-view', 'Handle anon page view event', '{}', false, null, null),
  (135, 'ips', 'Pass if user ip is in list', '{}', false, null, null),
  (136, 'newsletter-subscription', 'User has subscribed to one or more newsletters', '{}', false, null, null),
  (137, 'segment-ids', 'Pass if user segment id is in list', '{}', false, null, null),
  (138, 'companies', 'Pass if user ip/segment id is in list', '{}', false, null, null),
  (140, 'user-lists', 'Get number of newsletters entity is subscribed to', '{}', false, null, null),
  (142, 'tech-scroll-entrance', 'Entrance criteria for Tech Scroll Asia journey', '{}', false, null, null),
  (143, 'tech-overindexing', 'Does the user read a high amount of tech articles', '{}', false, null, null),
  (144, 'newsletter-sub-event', 'User has subscribed to a newsletter with the passed in ID', '{}', false, null, null),
  (145, 'app-promo', 'Entrance criteria for app promo journey', '{}', false, null, null),
  (146, 'component-action-count-anon', 'Pass if an entity has taken an action on an component and the count is matched', '{}', false, null, null),
  (147, 'my-ft-first-follow', 'User follows first My FT topic', '{}', false, null, null)
  ;

-- Start automatic ruleset range (that will be used when GUI creates new rules) somewhere out of the way
SELECT SETVAL('core."ruleSet_ruleSetId_seq"', 1000);
