module.exports = {
  files: {
    allow: [
      '.*\\/?\\.gitignore',
      '.*\\/?\\.npmignore',
      '.*\\.(js|json|yml|yaml|ddl|docker|md|sh|vcl|csv|sample|txt|rm|js\\.snap)',
      '.*\\.(svg)',
      'Makefile',
      'n\\.Makefile',
      'index\\.mk',
      'Procfile',
      '\\.eslintignore',
      '\\.slugignore',
      '\\.bowerrc',
      '.*\\/\\.gitkeep',
      '\\.babelrc',
      '\\.eslintrc',
      'LICENSE',
      '.*\\.editorconfig',
      'CODEOWNERS',
      '\\.snyk'
    ],
    allowOverrides: []
  },
  strings: {
    deny: [
      '[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}', // emails
      '[A-Z0-9]{20}', // AWS access key IDs
      '[A-Za-z0-9/\\\\+=]{40}', // AWS secret access keys
      '[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}', // UUIDs - see [0]
    ],
    denyOverrides: [
      '59a009f02cce220004838474', // app/data/development/17-01-2018.csv:13, app/data/development/unsub.csv:13
      '56d422064efa8f03004759c5', // app/data/development/17-01-2018.csv:32, app/data/development/email-test.csv:17, app/data/development/live-test-andrew.csv:15, app/data/development/premium-auto-sub.csv:13, app/data/development/unsub.csv:21|25
      '56caeea88b8aca0300efcbdc', // app/data/development/17-01-2018.csv:51
      '59ad568eae74bf0004a28f94', // app/data/development/email-test.csv:15, app/data/development/live-list-pester.csv:9|34
      '56caef0ea9b6b90300a2283f', // app/data/development/ftAmericasSignup.csv:13
      '56657d10e4b04e04251004fd', // app/data/development/live-test-andrew.csv:17
      '5b98cfd41e56bd0004e74cca', // app/data/unmasking-offsite-LIVE1.csv:125, app/data/unmasking-offsite-rev1.csv:127
      '5b98cffc9670460004419c77', // app/data/unmasking-offsite-LIVE1.csv:126, app/data/unmasking-offsite-rev1.csv:128
      '5b7ec87d8f72fc0004be3ccd', // app/data/unmasking-offsite-LIVE1.csv:127, app/data/unmasking-offsite-rev1.csv:129
      '5b7ec8dc10ba20000452e913', // app/data/unmasking-offsite-LIVE1.csv:128, app/data/unmasking-offsite-rev1.csv:130
      '5b7ec92b8f72fc0004be3cd0', // app/data/unmasking-offsite-LIVE1.csv:129, app/data/unmasking-offsite-rev1.csv:131
      '5b7ec9438f72fc0004be3cd1', // app/data/unmasking-offsite-LIVE1.csv:130, app/data/unmasking-offsite-rev1.csv:132
      '5b7ec99a10ba20000452e914', // app/data/unmasking-offsite-LIVE1.csv:131, app/data/unmasking-offsite-rev1.csv:133
      '5b7ec9bb8f72fc0004be3cd2', // app/data/unmasking-offsite-LIVE1.csv:132, app/data/unmasking-offsite-rev1.csv:134
      '5b7eca328f72fc0004be3cd4', // app/data/unmasking-offsite-LIVE1.csv:133, app/data/unmasking-offsite-rev1.csv:135
      '5b7eca4c8f72fc0004be3cd5', // app/data/unmasking-offsite-LIVE1.csv:134, app/data/unmasking-offsite-rev1.csv:136
      '5b7ecaa410ba20000452e919', // app/data/unmasking-offsite-LIVE1.csv:135, app/data/unmasking-offsite-rev1.csv:137
      '5b7ecabe10ba20000452e91a', // app/data/unmasking-offsite-LIVE1.csv:136, app/data/unmasking-offsite-rev1.csv:138
      '5b7ecb1510ba20000452e91b', // app/data/unmasking-offsite-LIVE1.csv:137, app/data/unmasking-offsite-rev1.csv:139
      '5b7ecb2d8f72fc0004be3cd8', // app/data/unmasking-offsite-LIVE1.csv:138, app/data/unmasking-offsite-rev1.csv:140
      '5b7ecb838f72fc0004be3cd9', // app/data/unmasking-offsite-LIVE1.csv:139, app/data/unmasking-offsite-rev1.csv:141
      '5b7ecb9d10ba20000452e91e', // app/data/unmasking-offsite-LIVE1.csv:140, app/data/unmasking-offsite-rev1.csv:142
      '5b7ecbe68f72fc0004be3cdb', // app/data/unmasking-offsite-LIVE1.csv:141, app/data/unmasking-offsite-rev1.csv:143
      '5b7ecbff8f72fc0004be3cdc', // app/data/unmasking-offsite-LIVE1.csv:142, app/data/unmasking-offsite-rev1.csv:144
      '5b7ed03a8f72fc0004be3ce0', // app/data/unmasking-offsite-LIVE1.csv:143, app/data/unmasking-offsite-rev1.csv:145
      '5b7ed0668f72fc0004be3ce1', // app/data/unmasking-offsite-LIVE1.csv:144, app/data/unmasking-offsite-rev1.csv:146
      '5b7ed0de8f72fc0004be3ce4', // app/data/unmasking-offsite-LIVE1.csv:145, app/data/unmasking-offsite-rev1.csv:147
      '5b7ed0fa10ba20000452e924', // app/data/unmasking-offsite-LIVE1.csv:146, app/data/unmasking-offsite-rev1.csv:148
      '5b7ed1318f72fc0004be3ce5', // app/data/unmasking-offsite-LIVE1.csv:147, app/data/unmasking-offsite-rev1.csv:149
      '5b7ec9d810ba20000452e915',
      '5b7ec8f68f72fc0004be3cce',
      '5b7ec90f8f72fc0004be3ccf',
      '5b7eca7110ba20000452e917',
      '5b7ec9f210ba20000452e916',
      '5b7eca8c10ba20000452e918',
      '5b7eca178f72fc0004be3cd3',
      '5b7ecb4410ba20000452e91c',
      '5b7ecb5c10ba20000452e91d',
      '5b7ecae08f72fc0004be3cd6',
      '5b7ecafa8f72fc0004be3cd7',
      '5b7ecc1e8f72fc0004be3cdd',
      '5b7ecc3710ba20000452e920',
      '5b7ecbb510ba20000452e91f',
      '5b7ecbce8f72fc0004be3cda',
      '5b7ed0898f72fc0004be3ce2',
      '5b7ed0a510ba20000452e923',
      '5b7ed0c08f72fc0004be3ce3',
      '5805fb0bdbdf3f00039c6fe4', // app/data/unmasking-offsite-LIVE1.csv:150, app/data/unmasking-offsite-rev1.csv:152, docs/queue-snippets/unmasking.rm:115
      'f61a5d65-f60f-4e8b-9121-8977f4d85b95', // app/data/unmasking-offsite-LIVE1.csv:156, app/data/unmaskingonsite_09092018.csv:8, app/data/unmaskingonsitev2_08102018.csv:8
      '4e7f36e2-06fb-4b30-bde4-b1d35cf9314f', // app/data/unmasking-offsite-rev1.csv:158, docs/queue-snippets/unmasking.rm:17
      'd4b1a6a2-237f-33af-4c68-296dce875561', // app/db/schema/core/update_seed.ddl:307
      '7f1c3853-71f8-4117-b9b3-1dde98b0660f', // app/db/sql/entity.int.test.js:11, app/testHelpers.js:23
      '48587380-ae87-4f76-aadb-b64b69abb7ce', // app/db/sql/entity.int.test.js:86
      '406d0eba-4020-41c3-a956-5bd55f2ec2d0', // app/stress-test.js:12|13|22
      '05e37779-9dae-4f5b-a10c-706b251f7cdc', // app/stress-test.js:31
      '900e9c8c-283e-48de-88ab-3f78c051ce70', // app/stress-test.js:32
      '0bb830c6-8a1c-11e8-bf9e-8771d5404543', // app/stress-test.js:33
      '4a1bbc85-4f8f-414c-8d4c-1a89350c344f', // docs/API/test-snippets.txt:6|7|10|11|14, docs/api.md:11|12|16|17|20, docs/queue-snippets/general.rm:12|13, docs/queue-snippets/unmasking.rm:13|29|43|63|82|98|112|113|129|130, docs/sql-snippets/general.rm:22|60
      '4d13cf9a-975b-11e7-8b2c-0242ac140004', // docs/API/test-snippets.txt:9, docs/api.md:14
      '43h21v43h35v23H59v120', // docs/DB_ERD_5.svg:1, docs/DB_ERD_6.svg:1, docs/queues.svg:1, docs/queues2.svg:1, docs/trackRef/track1.svg:1, docs/trackRef/track2.svg:1, docs/trackRef/track35.svg:1, docs/trackRef/track39b.svg:1, docs/trackRef/track40.svg:1, docs/trackRef/track41.svg:1, docs/trackRef/track42b.svg:1
      'spreadsheets/d/1ArNmcTv8ZfF18y8mXdzGClDg', // docs/deployment.md:5
      'ed997497-f054-434b-8e36-774f644ce68a', // docs/queue-snippets/unmasking.rm:4
      'bfadf14c-a60e-42fd-9440-ca9b2f21cf9f', // docs/queue-snippets/unmasking.rm:5
      '6cc2306f-3aff-4bcd-b406-17c51eaf1554', // docs/queue-snippets/unmasking.rm:116
      'e86161be-0106-4d61-a0a1-af5746c7a6e8', // docs/trackRef/1.md:12, docs/trackRef/2.md:13, docs/trackRef/35.md:10
      'b7380393-6035-4bdc-b864-9c8452972240', // docs/trackRef/39-40.md:13
      '084109f9-4abd-4673-82ea-b394571709d5', // docs/trackRef/39-40.md:25
      '587c4c1a-ba88-4032-a101-a63c5ee318b3', // docs/trackRef/41.md:13
      '5cb0c223-03a9-4f1b-8dba-c33cc7673789', // docs/trackRef/42.md:11
      'dd687700-a0a6-460d-8e4d-f1937874b802', // docs/sql-snippets/general.rm
      '59fb50b3939c490004713fc7', // app/db/schema/core/update_seed.ddl:775
      '5b895a541d0ddc000494365a', // app/db/schema/core/update_seed.ddl:775
      '5bd1927eedfd020004b0c99c',
      '5bd1e29e639ce40004fcf3b1',
      '5bd1e2db639ce40004fcf3b2',
      '5bd1e37aedfd020004b0c9d1',
      '5bd1e3f8edfd020004b0c9d2',
      '5bd1e41f639ce40004fcf3b3',
      '5bd1e453639ce40004fcf3b4',
      '5bd1e2f4edfd020004b0c9cd',
      '5bd1e325edfd020004b0c9ce',
      '5bd1e344edfd020004b0c9cf',
      '5bd1e360edfd020004b0c9d0',
      '41218b9e-c8ae-c934-43ad-71b13fcb4465',
      '19b95057-4614-45fb-9306-4d54049354db', // (Topics) :- Brexit
      '339ccacc-2c77-40a4-9832-63cb626145ba', // US-China Trade Dispute
      'e58e66fe-7cc6-4382-b781-1161bae8b905', // Technology
      '6f7d5d90-ac15-41fe-9e31-e69b42a013c6', // US Politics & Policy
      'c91b1fad-1097-468b-be82-9a8ff717d54c', // Markets
      '5bb1f37b00c4ce0004abea86', // Email contentId
      '5bb1f19400c4ce0004abea83',
      'ed360505-e3ac-4eaf-84ea-fc8cd7c35c5d', // lucid chart links to journey tests
      '797eae07-b45b-41d9-9821-b6edea1d075d',
      '0a001859-acc2-4d75-ae05-31452973e708',
      '1579416e-e58e-43b1-a692-533112d7fa66',
      '41bcb8e6-1bd3-476e-bc0c-1bf9f7d7ccf2',
      '3d78d6a4-90c6-4a83-a785-708ff73c3214',
      '18022294-6a0e-4095-b852-f0307b9700ad',
      'b327b8f0-7978-4203-a592-a551b07d668b',
      '4fd69a0f-d5df-4f75-9f6e-d33e195caadb',
      '346ca704-be39-4a11-8ad0-64b78c863575',
      '18e7ad07-3787-e272-58fd-b2c26a6801a4',
      'c54c144e-9182-4441-ad27-3ada289e173e',
      // segment ids
      '9c731e17-0fac-dd44-1b50-be5ae1af4041',
      'f30fe9b3-a9f9-418a-686c-5e56c4f2d7e1',
      'a6f3cfff-9ea7-d45b-aa21-eeaf7a842233',
      'e0b9afe6-6716-4825-ce62-4f36c72f02f2',
      '177ba596-aafe-b675-7aa9-f1a1aea05975',
      'd2b9ec8f-29b1-7dbc-9938-250c3600774e',
      'cb5ab23d-cd21-9b78-8d46-d7e48bb9cdf9',
      '55b15e51-6f2c-5399-ec28-8e2a5f5044e8',
      'd0d8f474-ee90-3f78-f2bf-5068994954b7',
      '05a20800-5fe4-57d4-2318-9243170f0e7f',
      '0c8572a8-80eb-6b1f-ce13-acaa8ffee33e',
      '4e298b39-3f6a-d87c-d71e-ebaa78c8ff9b',
      'b40a7aae-3b6e-b400-7e19-b721aed9a983',
      'b3ba8e6b-5bc8-20a1-d624-755a2a1b16aa',
      '682c582d-55d2-ce99-2fdd-203c9600a747',
      'b777c101-fc03-282e-4f00-2dc2dc74ede4',
      'b60a838c-b1d3-bed1-f7f6-0f61549f2b97',
      'ef64b564-75de-8fa5-9439-543a740dfa1c',
      '246017da-1a91-792f-0531-0f152b0fa5c9',
      'd33c603b-909e-5bd6-f3b7-6a165250a0bd',
      '1c8cd799-4d03-4620-12b9-f53a24e0a580',
      'edc743d6-e310-0d31-a34f-1f56b4585f50',
      '0a256b96-e6ff-fb50-634f-27c875539fa7',
      '460abce3-0660-3de6-1c4d-023bd7276120',
      '6578f84c-6290-e2aa-5813-d6185621284b',
      '55ea0c97-5cc0-fe90-7e69-c5c1571565f1',
      '05776af4-1afd-7edb-c53c-0d603d71042e',
      '5012f897-bd5e-73d6-978b-0d3c62a1dce6',
      'de9930b2-6b02-7bcf-feb5-46f96887541c',
      'c1b7e8d7-8cad-0689-cdb0-f40df0f209de',
      'b6665063-b2d1-d2a2-52fb-21ca903c8982',
      'e60b99de-0d63-f357-58e8-dd53e61e8854',
      'b3afb123-1591-6a81-ea15-9bcec0467c9a',
      '0528fa7c-3e1e-858b-ba12-9452a75cc56f',
      '84e2e132-6144-5191-41f3-6c52d94c748c',
      '91bd602c-37e8-ab9a-2cc0-b198be5ff58f',
      '23533455-c8f1-dfdd-0ad1-88b3574d9bf0',
      '2b18ed14-4e34-a6fd-6c5d-4d3e87c664c3',
      '4544bb12-5966-d41c-dbea-6d1007253f16',
      '106bff19-dbe1-9f1f-40dd-ce961061c22b',
      '73b9135c-8b1c-d7f1-599e-a8238798f4b2',
      '3bcd3e9a-64b0-5bf9-c3aa-6ecc9013aae7',
      '468344a3-c315-be7a-8132-0dbf1229bb0b',
      '2277b50e-3601-0fea-9abe-95bcacc47e4c',
      '181ceadc-0176-76b2-75f7-ca67b3d0754f',
      'a60cbb55-5613-4ad6-9256-810737ac94df',
      '5c8b92df81ab3b00044a2110', // TSA CSV
      '5c9ce53de4d69a0004f9f7b5', // first-follow-email-test csv,
      'roland.rat@ftqa.org', // unit tests for email channel
      'roland.rat@ft.com', // unit tests for email channel
      'someone@gmail.com', // unit tests for email channel
      '5c3f5940bcc8c00004fcd176', // First Follow
      'b2bMarketingTriallist',
      'b2bSyndicationLicence'
    ]
  }
};
