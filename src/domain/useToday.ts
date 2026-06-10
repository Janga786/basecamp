import { useProfile } from '@/data/queries'
import { logicalDateStr } from '@/lib/time'

/** The current logical date (yyyy-MM-dd), honoring the profile's tz + rollover. */
export function useLogicalToday(): string {
  const { data: profile } = useProfile()
  return logicalDateStr(new Date(), profile?.settings.timezone, profile?.settings.rollover_hour)
}
