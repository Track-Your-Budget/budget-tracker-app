import apiClient from '@/lib/api-client'

export interface OnboardingResult {
  /** Number of sample transactions added; 0 when the user declined. */
  created: number
}

/**
 * Answer the welcome dialog. With `sampleData` the server fills the empty
 * account with about two months of example transactions. Either way the
 * dialog is not shown again.
 */
export async function completeOnboarding(sampleData: boolean): Promise<OnboardingResult> {
  const response = await apiClient.post<OnboardingResult>('/onboarding/', {
    sample_data: sampleData,
  })
  return response.data
}
