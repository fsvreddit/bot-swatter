import { ModAction } from "@devvit/protos";
import { TriggerContext, User, ZMember } from "@devvit/public-api";
import { addDays, addMinutes, addSeconds } from "date-fns";
import _ from "lodash";
import pluralize from "pluralize";

const UNBAN_STORE = "unbannedUsers";
const DAYS_BETWEEN_CHECKS = 28;

export async function handleModAction (event: ModAction, context: TriggerContext) {
    if (event.action !== "unbanuser" || !event.targetUser) {
        return;
    }

    await context.redis.zAdd(UNBAN_STORE, { member: event.targetUser.name, score: addDays(new Date(), DAYS_BETWEEN_CHECKS).getTime() });
    console.log(`ModAction: ${event.targetUser.name} has been unbanned. Adding to data store.`);
}

export async function userWasPreviouslyBanned (username: string, context: TriggerContext) {
    const score = await context.redis.zScore(UNBAN_STORE, username);

    return score !== undefined;
}

async function userActive (username: string, context: TriggerContext): Promise<boolean> {
    let user: User | undefined;
    try {
        user = await context.reddit.getUserByUsername(username);
    } catch {
        //
    }

    return user !== undefined;
}

interface UserActive {
    username: string;
    isActive: boolean;
}

export async function cleanupDeletedAccounts (_: unknown, context: TriggerContext) {
    console.log("Cleanup: Starting cleanup job");
    const items = await context.redis.zRange(UNBAN_STORE, 0, new Date().getTime(), { by: "score" });
    if (items.length === 0) {
        // No user accounts need to be checked.
        console.log("Cleanup: No users are due a check.");
        return;
    }

    // Grab the app account's user to ensure that platform is stable.
    await context.reddit.getAppUser();

    const itemsToCheck = 50;

    if (items.length > itemsToCheck) {
        console.log(`Cleanup: ${items.length} accounts are due a check. Checking first ${itemsToCheck} in this run.`);
    } else {
        console.log(`Cleanup: ${items.length} accounts are due a check.`);
    }

    // Get the first N accounts that are due a check.
    const usersToCheck = items.slice(0, itemsToCheck).map(item => item.member);
    const userStatuses: UserActive[] = [];

    for (const username of usersToCheck) {
        const isActive = await userActive(username, context);
        userStatuses.push(({ username, isActive } as UserActive));
    }

    const activeUsers = userStatuses.filter(user => user.isActive).map(user => user.username);
    const deletedUsers = userStatuses.filter(user => !user.isActive).map(user => user.username);

    // For active users, set their next check date to be one day from now.
    if (activeUsers.length > 0) {
        console.log(`Cleanup: ${activeUsers.length} users still active out of ${userStatuses.length}. Resetting next check time.`);
        await context.redis.zAdd(UNBAN_STORE, ...activeUsers.map(user => ({ member: user, score: addDays(new Date(), DAYS_BETWEEN_CHECKS).getTime() } as ZMember)));
    }

    // For deleted users, remove them from both the cleanup log and remove previous records of bans and approvals.
    if (deletedUsers.length > 0) {
        console.log(`Cleanup: ${deletedUsers.length} users out of ${userStatuses.length} are deleted or suspended. Removing from data store.`);
        await context.redis.zRem(UNBAN_STORE, deletedUsers);
    }

    // If there were more users in this run than we could process, schedule another run immediately.
    if (items.length > itemsToCheck) {
        await context.scheduler.runJob({
            name: "cleanupDeletedAccounts",
            runAt: addSeconds(new Date(), 5),
        });
    }
}

export async function addInitialUnbanData (context: TriggerContext) {
    const redisKey = "initialUnbanDataStored";

    const initialUnbanDataStored = await context.redis.exists(redisKey);
    if (initialUnbanDataStored) {
        return;
    }

    const subreddit = await context.reddit.getCurrentSubreddit();
    const modLog = await context.reddit.getModerationLog({
        subredditName: subreddit.name,
        type: "unbanuser",
        limit: 1000,
    }).all();

    const unbannedUsers = _.uniq(_.compact(modLog.filter(x => x.target?.author !== "[deleted]").map(x => x.target?.author)));
    await context.redis.zAdd(UNBAN_STORE, ...unbannedUsers.map(user => ({ member: user, score: addMinutes(new Date(), Math.random() * 60 * 24 * 2).getTime() } as ZMember)));
    console.log(`${unbannedUsers.length} ${pluralize("user", unbannedUsers.length)} added to Redis`);

    await context.redis.set(redisKey, "true");
}
