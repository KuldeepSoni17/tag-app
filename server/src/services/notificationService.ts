/**
 * Push notifications (FCM). Wire credentials in env; safe no-op when unset.
 */
export async function notifyTagRequest(input: { targetUserId: string; fromUsername: string }): Promise<void> {
  // TODO: map userId -> device tokens table + FCM multicast
  console.info(`[push] Tag request for ${input.targetUserId} from @${input.fromUsername}`);
}

export async function notifyContestClosingSoon(userIds: string[]): Promise<void> {
  console.info(`[push] Contest closing soon → ${userIds.length} users`);
}

export async function notifyWinnerAnnounced(userIds: string[]): Promise<void> {
  console.info(`[push] Winner announced → ${userIds.length} users`);
}
