// Builds a deep link to an HCB card grant using the shared `hcb_host` prop.
// HCB's Rails routes mount card grants at `/grants/:hcb_id` (see hcb/config/routes.rb).
export function hcbGrantUrl(hcbHost: string | undefined, hcbId: string | null | undefined): string | null {
  if (!hcbHost || !hcbId) return null
  return `${hcbHost.replace(/\/$/, '')}/grants/${hcbId}`
}
