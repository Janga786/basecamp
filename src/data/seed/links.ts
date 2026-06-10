import type { ExternalLink } from '../types'

/**
 * Best-effort outbound deep links. On iOS the appUrl is attempted first
 * (opens the native app if installed); webUrl is the always-works fallback.
 * Basecamp NEVER stores macro grams or set-by-set weights — these just bounce
 * the user out to the app that owns that data.
 */
export const HEVY_LINK: ExternalLink = {
  label: 'Open Hevy',
  appUrl: 'hevy://',
  webUrl: 'https://hevy.com/',
}

export const MYNETDIARY_LINK: ExternalLink = {
  label: 'Open MyNetDiary',
  appUrl: 'mynetdiary://',
  webUrl: 'https://www.mynetdiary.com/',
}
