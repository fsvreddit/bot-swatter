import { AppInstall, AppUpgrade } from "@devvit/protos";
import { TriggerContext } from "@devvit/public-api";
import { addInitialUnbanData } from "./unbanTracker.js";

export async function installOrUpgradeHandler (_: AppInstall | AppUpgrade, context: TriggerContext) {
    // Clear down scheduled tasks and re-add.
    const existingJobs = await context.scheduler.listJobs();
    await Promise.all(existingJobs.map(job => context.scheduler.cancelJob(job.id)));

    // Cleanup job should run every hour. Randomise start time.
    const minute = Math.floor(Math.random() * 60);
    console.log(`Running cleanup job at ${minute} past the hour.`);

    await context.scheduler.runJob({
        name: "cleanupDeletedAccounts",
        cron: `${minute} * * * *`,
    });

    await addInitialUnbanData(context);
}
