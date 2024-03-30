#! /usr/bin/env bash

set -e

print() {
  echo "[copyDataFromSF] `date -Iseconds` $1"
}

print "start"

node dist/scripts/copyDataFromSF.js Account agency
node dist/scripts/copyDataFromSF.js Program__c program
node dist/scripts/copyDataFromSF.js Site__c site
node dist/scripts/copyDataFromSF.js Site_Program__c site_program
node dist/scripts/copyDataFromSF.js Taxonomy__c taxonomy
node dist/scripts/copyDataFromSF.js Program_Service__c program_service

print "fetched data from Salesforce"

set +e
npm run insertData
exit_code=$?
if [ $exit_code -eq 0 ]; then
  print "loaded data into sqlite"
else
  print "[ERROR] insertData failed"
  sudo ./restart.sh
  exit $exit_code
fi
set -e

npm run processData
print "postprocessed data in sqlite"

npm run meilisearchIngest
print "loaded data into meilisearch"

echo `date -Iseconds` > LAST_SYNC

sudo ./restart.sh

print "end"
