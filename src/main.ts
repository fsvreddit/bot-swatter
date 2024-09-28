import {Devvit} from "@devvit/public-api";
import {checkForAIBotBehaviours, checkUserProperly, secondCheckForAIBots} from "./bots/style1.js";
import {settingsForAIBotDetection} from "./settings.js";
import {checkStyle2BotBehaviours} from "./bots/style2.js";
import {checkStyle3BotBehaviours} from "./bots/style3.js";
import {installOrUpgradeHandler} from "./installTasks.js";
import {cleanupDeletedAccounts, handleModAction} from "./unbanTracker.js";

Devvit.addSettings(settingsForAIBotDetection);

Devvit.addTrigger({
    event: "CommentCreate",
    onEvent: checkForAIBotBehaviours,
});

Devvit.addTrigger({
    event: "CommentCreate",
    onEvent: checkStyle2BotBehaviours,
});

Devvit.addTrigger({
    event: "PostCreate",
    onEvent: checkStyle3BotBehaviours,
});

Devvit.addTrigger({
    event: "ModAction",
    onEvent: handleModAction,
});

Devvit.addTrigger({
    events: ["AppInstall", "AppUpgrade"],
    onEvent: installOrUpgradeHandler,
});

Devvit.addSchedulerJob({
    name: "secondCheckForAIBots",
    onRun: secondCheckForAIBots,
});

Devvit.addSchedulerJob({
    name: "cleanupDeletedAccounts",
    onRun: cleanupDeletedAccounts,
});

Devvit.addTrigger({
    event: "CommentReport",
    onEvent: async (event, context) => {
        if (!event.reason.toLowerCase().includes("spam") && !event.reason.toLowerCase().includes("bot")) {
            return;
        }

        if (!event.comment) {
            return;
        }

        const user = await context.reddit.getUserById(event.comment.author);
        if (!user) {
            return;
        }

        console.log(`Detected a user report for user ${user.username}. Processing Style 1 checks.`);

        const settings = await context.settings.getAll();
        await checkUserProperly(user, context, settings, true);
    },
});

Devvit.addTrigger({
    events: ["AppInstall", "AppUpgrade"],
    async onEvent (event, context) {
        // Clear down existing scheduler jobs, if any, in case a new release changes the schedule
        console.log(`Detected an ${event.type} event. Rescheduling jobs.`);
        const currentJobs = await context.scheduler.listJobs();
        await Promise.all(currentJobs.map(job => context.scheduler.cancelJob(job.id)));

        await context.scheduler.runJob({
            cron: "2 * * * *", // Every hour
            name: "secondCheckForAIBots",
        });
    },
});

Devvit.configure({
    redditAPI: true,
    redis: true,
});

export default Devvit;
