#! /usr/bin/env bash

set -e

print() {
  echo "[copyDataFromSF] `date -Iseconds` $1"
}

print "start"

node scripts/copyDataFromSF.js Account agency
node scripts/copyDataFromSF.js Program__c program
node scripts/copyDataFromSF.js Site__c site
node scripts/copyDataFromSF.js Site_Program__c site_program
node scripts/copyDataFromSF.js Taxonomy__c taxonomy
node scripts/copyDataFromSF.js Program_Service__c program_service

print "fetched data from Salesforce"

npm run insertData
print "loaded data into sqlite"

npm run processData
print "postprocessed data in sqlite"

npm run meilisearchIngest
print "loaded data into meilisearch"

echo `date -Iseconds` > LAST_SYNC

sudo ./restart.sh

print "end"
