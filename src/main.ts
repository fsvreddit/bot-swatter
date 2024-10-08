import { Devvit } from "@devvit/public-api";
import { checkForAIBotBehaviours, secondCheckForAIBots } from "./botDetection.js";
import { settingsForAIBotDetection } from "./settings.js";
import { installOrUpgradeHandler } from "./installTasks.js";
import { cleanupDeletedAccounts, handleModAction } from "./unbanTracker.js";

Devvit.addSettings(settingsForAIBotDetection);

Devvit.addTrigger({
    event: "CommentCreate",
    onEvent: checkForAIBotBehaviours,
});

Devvit.addTrigger({
    event: "ModAction",
    onEvent: handleModAction,
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
    events: ["AppInstall", "AppUpgrade"],
    onEvent: installOrUpgradeHandler,
});

Devvit.configure({
    redditAPI: true,
    redis: true,
});

export default Devvit;
