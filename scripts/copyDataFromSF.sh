#! /usr/bin/env bash

set -e

echo "[copyDataFromSF] start=`date -Iseconds`"
node scripts/copyDataFromSF.js Account agency
node scripts/copyDataFromSF.js Program__c program
node scripts/copyDataFromSF.js Site__c site
node scripts/copyDataFromSF.js Site_Program__c site_program
node scripts/copyDataFromSF.js Taxonomy__c taxonomy

# node scripts/copyDataFromSF.js Program_Service__c program_service
# node scripts/copyDataFromSF.js Program__Feed programFeed
# node scripts/copyDataFromSF.js Program__Share programShare
# node scripts/copyDataFromSF.js Site__c siteC
# node scripts/copyDataFromSF.js SiteFeed siteFeed
# node scripts/copyDataFromSF.js Site__Feed siteFeed2
# node scripts/copyDataFromSF.js Referral__c referral
# node scripts/copyDataFromSF.js Request__c request
# node scripts/copyDataFromSF.js Case case
# node scripts/copyDataFromSF.js ServiceChannel serviceChannel
# node scripts/copyDataFromSF.js ServiceResource serviceResource
# node scripts/copyDataFromSF.js X211_Agency__c agencyX211C

yarn insertData
echo `date -Iseconds` > LAST_SYNC
echo "[copyDataFromSF] end=`date -Iseconds`"
