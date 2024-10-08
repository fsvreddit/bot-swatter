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

    await addInitialUnbanData(context);
}
