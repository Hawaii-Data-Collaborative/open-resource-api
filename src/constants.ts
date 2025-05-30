export const searchableAttributes = {
  program: [
    'Name',
    'keywords',
    // 'Service_Description__c',
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

export const LANGUAGES = ['haw', 'es', 'zh', 'ja', 'ko', 'vi', 'tl']

export const translationFieldMap = {
  agency: [
    ['Name', 'name'],
    ['Overview__c', 'overview']
  ],
  program: [
    ['Name', 'name'],
    ['Age_Restrictions__c', 'ageRestrictions'],
    ['Age_Restriction_Other__c', 'ageRestrictionOther'],
    ['Eligibility_Long__c', 'eligibilityLong'],
    ['Fees__c', 'fees'],
    ['Fees_Other__c', 'feesOther'],
    ['Intake_Procedure_Multiselect__c', 'intakeProcedureMultiselect'],
    ['Intake_Procedures_Other__c', 'intakeProceduresOther'],
    ['Languages_Consistently_Available__c', 'languagesConsistentlyAvailable'],
    ['Languages_Text__c', 'languagesText'],
    ['Maximum_Age__c', 'maximumAge'],
    ['Minimum_Age__c', 'minimumAge'],
    ['Program_Special_Notes_Hours__c', 'programSpecialNotesHours'],
    ['Service_Description__c', 'serviceDescription']
  ],
  site: [['Name', 'name']],
  taxonomy: [
    ['Name', 'name']
    // ['Definition__c', 'definition']
  ],
  category: [['name', 'name']]
}
