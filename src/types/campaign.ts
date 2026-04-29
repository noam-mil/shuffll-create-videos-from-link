// Campaign status enums matching database
export const CAMPAIGN_CLIENT_STATUS = {
  NONE: 'none',
  CONCEPT_SENT: 'concept_sent',
  CONCEPT_APPROVED: 'concept_approved',
  WORKING_ON_CREATIVE: 'working_on_creative',
  LIST_UPLOADED_FOR_RENDERS: 'list_uploaded_for_renders',
  READY_FOR_INTERNAL_TESTS: 'ready_for_internal_tests',
  READY_FOR_TESTS_WITH_CLIENT: 'ready_for_tests_with_client',
  LIST_UPLOADED_FOR_SEND: 'list_uploaded_for_send',
  CLIENT_REJECTS: 'client_rejects',
  CLIENT_APPROVED_SEND: 'client_approved_send',
} as const;

export const CAMPAIGN_SYSTEM_STATUS = {
  LIST_SUCCESSFULLY_LOADED: 'list_successfully_loaded',
  RENDERING: 'rendering',
  READY_TO_SEND: 'ready_to_send',
  TESTS_DONE: 'tests_done',
} as const;

export type CampaignClientStatus = typeof CAMPAIGN_CLIENT_STATUS[keyof typeof CAMPAIGN_CLIENT_STATUS];
export type CampaignSystemStatus = typeof CAMPAIGN_SYSTEM_STATUS[keyof typeof CAMPAIGN_SYSTEM_STATUS];

export interface Campaign {
  id: string;
  organization_id: string;
  name: string;
  client_status: CampaignClientStatus;
  system_status: CampaignSystemStatus | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignEntry {
  id: string;
  campaign_id: string;
  data: Record<string, unknown>;
  created_at: string;
}

// Translation keys for statuses
export const CLIENT_STATUS_KEYS: Record<CampaignClientStatus, string> = {
  [CAMPAIGN_CLIENT_STATUS.NONE]: 'campaigns.clientStatus.none',
  [CAMPAIGN_CLIENT_STATUS.CONCEPT_SENT]: 'campaigns.clientStatus.conceptSent',
  [CAMPAIGN_CLIENT_STATUS.CONCEPT_APPROVED]: 'campaigns.clientStatus.conceptApproved',
  [CAMPAIGN_CLIENT_STATUS.WORKING_ON_CREATIVE]: 'campaigns.clientStatus.workingOnCreative',
  [CAMPAIGN_CLIENT_STATUS.LIST_UPLOADED_FOR_RENDERS]: 'campaigns.clientStatus.listUploadedForRenders',
  [CAMPAIGN_CLIENT_STATUS.READY_FOR_INTERNAL_TESTS]: 'campaigns.clientStatus.readyForInternalTests',
  [CAMPAIGN_CLIENT_STATUS.READY_FOR_TESTS_WITH_CLIENT]: 'campaigns.clientStatus.readyForTestsWithClient',
  [CAMPAIGN_CLIENT_STATUS.LIST_UPLOADED_FOR_SEND]: 'campaigns.clientStatus.listUploadedForSend',
  [CAMPAIGN_CLIENT_STATUS.CLIENT_REJECTS]: 'campaigns.clientStatus.clientRejects',
  [CAMPAIGN_CLIENT_STATUS.CLIENT_APPROVED_SEND]: 'campaigns.clientStatus.clientApprovedSend',
};

export const SYSTEM_STATUS_KEYS: Record<CampaignSystemStatus, string> = {
  [CAMPAIGN_SYSTEM_STATUS.LIST_SUCCESSFULLY_LOADED]: 'campaigns.systemStatus.listSuccessfullyLoaded',
  [CAMPAIGN_SYSTEM_STATUS.RENDERING]: 'campaigns.systemStatus.rendering',
  [CAMPAIGN_SYSTEM_STATUS.READY_TO_SEND]: 'campaigns.systemStatus.readyToSend',
  [CAMPAIGN_SYSTEM_STATUS.TESTS_DONE]: 'campaigns.systemStatus.testsDone',
};

// Status badge color mapping
export const CLIENT_STATUS_COLORS: Record<CampaignClientStatus, string> = {
  [CAMPAIGN_CLIENT_STATUS.NONE]: 'bg-muted text-muted-foreground',
  [CAMPAIGN_CLIENT_STATUS.CONCEPT_SENT]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [CAMPAIGN_CLIENT_STATUS.CONCEPT_APPROVED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [CAMPAIGN_CLIENT_STATUS.WORKING_ON_CREATIVE]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [CAMPAIGN_CLIENT_STATUS.LIST_UPLOADED_FOR_RENDERS]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  [CAMPAIGN_CLIENT_STATUS.READY_FOR_INTERNAL_TESTS]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  [CAMPAIGN_CLIENT_STATUS.READY_FOR_TESTS_WITH_CLIENT]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  [CAMPAIGN_CLIENT_STATUS.LIST_UPLOADED_FOR_SEND]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  [CAMPAIGN_CLIENT_STATUS.CLIENT_REJECTS]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  [CAMPAIGN_CLIENT_STATUS.CLIENT_APPROVED_SEND]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
};

export const SYSTEM_STATUS_COLORS: Record<CampaignSystemStatus, string> = {
  [CAMPAIGN_SYSTEM_STATUS.LIST_SUCCESSFULLY_LOADED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [CAMPAIGN_SYSTEM_STATUS.RENDERING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [CAMPAIGN_SYSTEM_STATUS.READY_TO_SEND]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [CAMPAIGN_SYSTEM_STATUS.TESTS_DONE]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
};
