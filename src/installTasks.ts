import { AppInstall, AppUpgrade } from "@devvit/protos";
import { TriggerContext } from "@devvit/public-api";
import { addInitialUnbanData } from "./unbanTracker.js";

export async function installOrUpgradeHandler (_: AppInstall | AppUpgrade, context: TriggerContext) {
    // Clear down scheduled tasks and re-add.
    const existingJobs = await context.scheduler.listJobs();
    await Promise.all(existingJobs.map(job => context.scheduler.cancelJob(job.id)));

    // Cleanup job should run every hour. Randomise start time.
    const cleanupMinute = Math.floor(Math.random() * 60);
    const hour = Math.floor(Math.random() * 6);
    console.log(`Cleanup will run at minute ${cleanupMinute} every 6th hour starting at hour ${hour}.`);

    await context.scheduler.runJob({
        name: "cleanupDeletedAccounts",
        cron: `${cleanupMinute} ${hour}/6 * * *`,
    });

    const secondCheckMinute = Math.floor(Math.random() * 60);
    console.log(`Bot second checks will run at minute ${secondCheckMinute}.`);

    await context.scheduler.runJob({
        cron: `${secondCheckMinute} * * * *`,
        name: "secondCheckForAIBots",
    });

    await Promise.all([
        addInitialUnbanData(context),
        sendInstallOrUpgradeMessage(context),
    ]);
}

export async function sendInstallOrUpgradeMessage (context: TriggerContext) {
    const redisKey = "NotificationSent";
    const notificationSent = await context.redis.exists(redisKey);
    if (notificationSent) {
        return;
    }

    const subredditName = context.subredditName ?? await context.reddit.getCurrentSubredditName();
    const subHasBotBouncer = await context.reddit.getModerators({
        subredditName,
        username: "bot-bouncer",
    }).all();

    let message = `Thank you for installing LLM Bot Swatter.

This app is no longer being actively updated with new bot detection features as the developer (/u/fsv) has created a new app (along the lines of BotDefense) that is much more effective at catching spam bots.

LLM Bot Swatter will continue to work, but will not be updated with new bot detection features in the future and bot detection is likely to be rare now, and false positives more frequent.\n\n`;

    if (subHasBotBouncer.length > 0) {
        message += "As you already have Bot Bouncer installed, I suggest uninstalling LLM Bot Swatter as it will not catch a different set of bots than Bot Bouncer.\n\n";
    } else {
        message += "If you would like to try Bot Bouncer instead, you can install it from [here](https://developers.reddit.com/apps/bot-bouncer).\n\n";
        message += "If you have any questions about Bot Bouncer, you can [message the team at /r/BotBouncer](https://www.reddit.com/message/compose/?to=/r/BotBouncer).\n\n";
    }

    await context.reddit.modMail.createModInboxConversation({
        subredditId: context.subredditId,
        subject: "LLM Bot Swatter",
        bodyMarkdown: message,
    });

    await context.redis.set(redisKey, new Date().getTime().toString());
}
