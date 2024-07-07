// Visit developers.reddit.com/docs to learn Devvit!

import {Devvit} from "@devvit/public-api";
import {checkForAIBotBehaviours, secondCheckForAIBots} from "./botDetection.js";
import {settingsForAIBotDetection} from "./settings.js";

Devvit.addSettings(settingsForAIBotDetection);

Devvit.addTrigger({
    event: "CommentCreate",
    onEvent: checkForAIBotBehaviours,
});

Devvit.addSchedulerJob({
    name: "secondCheckForAIBots",
    onRun: secondCheckForAIBots,
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
