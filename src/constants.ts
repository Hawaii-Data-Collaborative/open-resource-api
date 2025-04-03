export const searchableAttributes = {
  program: [
    'Name',
    'keywords',
    'Service_Description__c',
    'AKA_Name__c',
    'AccountName',
    // 'Accessibility__c',
    // 'Additional_Information__c',
    // 'Eligibility__c',
    'Eligibility_Long__c',
    'Fees_Text__c'
  ]
}

export const filterableAttributes = {
  site: ['_geo']
}

export const sortableAttributes = {
  site: ['_geo']
}

export const COOKIE_NAME = 'Auw211Session'
export const COOKIE_NAME_LANG = 'Auw211Lang'
