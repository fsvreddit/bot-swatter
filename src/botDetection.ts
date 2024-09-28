import { Comment, Post, TriggerContext, User, SettingsValues, ScheduledJobEvent } from "@devvit/public-api";
import { ThingPrefix } from "./utility.js";
import { addDays, addHours, subMonths } from "date-fns";
import { CommentSubmit } from "@devvit/protos";
import pluralize from "pluralize";
import _ from "lodash";
import { AIBotDetectionAction, Setting } from "./settings.js";

const startsWithLowerCaseRegex = /^[a-z]/;

export async function checkUserProperly (user: User, context: TriggerContext, settings: SettingsValues) {
    const userItems = await context.reddit.getCommentsAndPostsByUser({
        username: user.username,
        sort: "new",
        limit: 100,
    }).all();

    const userComments = userItems.filter(item => item instanceof Comment);

    let isBot = true;

    if (userItems.some(item => item instanceof Post && (item.subredditName !== "AskReddit" || item.url.includes("i.redd.it")))) {
        console.log(`${user.username}: User has posts in their history.`);
        isBot = false;
    }

    if (userComments.some(comment => comment.parentId.startsWith(ThingPrefix.Comment))) {
        console.log(`${user.username}: User has non-TLC comments`);
        isBot = false;
    }

    if (userComments.some(item => startsWithLowerCaseRegex.test(item.body))) {
        console.log(`${user.username}: User has comments that start with a lower case character`);
        isBot = false;
    }

    const maxCommentLength = settings[Setting.MaxCommentLength] as number | undefined ?? 500;
    if (userComments.some(comment => comment.body.length > maxCommentLength)) {
        console.log(`${user.username}: User has comments that are too long or too short.`);
        isBot = false;
    }

    if (userComments.some(comment => comment.body.includes("\n"))) {
        console.log(`${user.username}: User has comments with line breaks.`);
        isBot = false;
    }

    if (userComments.some(comment => comment.edited)) {
        console.log(`${user.username}: User has at least one edited comment`);
        isBot = false;
    }

    const minCommentCount = settings[Setting.MinimumCommentCount] as number | undefined ?? 3;
    if (userComments.length < minCommentCount) {
        console.log(`${user.username}: User doesn't have enough comments.`);
        if (isBot) {
            console.log(`${user.username}: Queued additional check for 18 hours from now.`);
            await context.redis.zAdd("aibotchecker-queue", { member: user.username, score: addHours(new Date(), 18).getTime() });
        }
        return;
    }

    const distinctSubs = _.uniq(userComments.map(comment => comment.subredditId));
    const diversityRatio = settings[Setting.SubredditDiversity] as number | undefined ?? 2.5;
    if (userComments.length / distinctSubs.length > diversityRatio) {
        console.log(`${user.username}: Not enough sub diversity. Comment count: ${userComments.length}, Sub count: ${distinctSubs.length}`);
        isBot = false;
    }

    const redisKey = `aibotchecker-${user.username}`;

    if (!isBot) {
        // Don't check the user again for another week
        await context.redis.set(redisKey, new Date().getTime.toString(), { expiration: addDays(new Date(), 7) });
        return;
    }

    console.log(`${user.username}: User is a likely AI Bot!`);
    await context.redis.del(redisKey);

    const [action] = settings[Setting.Action] as string[] | undefined ?? [AIBotDetectionAction.None];

    if (action as AIBotDetectionAction === AIBotDetectionAction.None) {
        return;
    }

    const comments = userComments.filter(comment => comment.subredditId === context.subredditId);
    if (comments.length === 0) {
        // Shouldn't be possible at this point.
        return;
    }

    if (action as AIBotDetectionAction === AIBotDetectionAction.Report) {
        await Promise.all(comments.map(comment => context.reddit.report(comment, { reason: "Potential AI Bot. Check for history elsewhere and consider taking action." })));
    } else if (action as AIBotDetectionAction === AIBotDetectionAction.BanAndRemove) {
        await Promise.all(comments.map(comment => comment.remove(true)));
        console.log(`${user.username}: Removed ${comments.length} ${pluralize("comment", comments.length)} from ${user.username}`);

        const banMessage = settings[Setting.BanMessage] as string | undefined ?? "LLM Bot";
        await context.reddit.banUser({
            subredditName: comments[0].subredditName,
            username: user.username,
            context: comments[0].id,
            message: banMessage,
            reason: banMessage,
        });
        console.log(`${user.username}: Banned user`);
    }
}

const defaultUsernameRegex = /^(?:[A-Z][a-z]+[-_]?){2}\d+$/;

export async function checkForAIBotBehaviours (event: CommentSubmit, context: TriggerContext) {
    if (!event.comment || !event.author) {
        return;
    }

    if (event.comment.parentId.startsWith(ThingPrefix.Comment)) {
        return;
    }

    if (startsWithLowerCaseRegex.test(event.comment.body)) {
        return;
    }

    if (event.comment.body.includes("\n")) {
        return;
    }

    const settings = await context.settings.getAll();

    const [action] = settings[Setting.Action] as string[] | undefined ?? [AIBotDetectionAction.Report];
    if (action as AIBotDetectionAction === AIBotDetectionAction.None) {
        return;
    }

    const maxCommentLength = settings[Setting.MaxCommentLength] as number | undefined ?? 500;
    if (event.comment.body.length > maxCommentLength) {
        return;
    }

    const maxKarma = settings[Setting.MaxKarma] as number | undefined ?? 500;
    if (event.author.karma > maxKarma) {
        return;
    }

    if (settings[Setting.AutogenUsersOnly] && !defaultUsernameRegex.test(event.author.name)) {
        return;
    }

    const redisKey = `aibotchecker-${event.author.name}`;
    const alreadyChecked = await context.redis.get(redisKey);
    if (alreadyChecked) {
        return;
    }

    console.log(`${event.author.name}: Checking user`);

    let user: User | undefined;
    try {
        user = await context.reddit.getUserById(event.author.id);
    } catch {
        //
    }

    if (!user) {
        console.log(`${event.author.name}: User is shadowbanned.`);
        return;
    }

    const maxAccountAgeInMonths = settings[Setting.MaximumAgeMonths] as number;
    if (user.createdAt < subMonths(new Date(), maxAccountAgeInMonths)) {
        console.log(`${event.author.name}: Account is too old.`);
        return;
    }

    if (user.commentKarma > maxKarma) {
        console.log(`${event.author.name}: Too much karma`);
        return;
    }

    await checkUserProperly(user, context, settings);
}

export async function secondCheckForAIBots (_: ScheduledJobEvent, context: TriggerContext) {
    const settings = await context.settings.getAll();

    const queue = await context.redis.zRange("aibotchecker-queue", 0, new Date().getTime(), { by: "score" });
    if (queue.length === 0) {
        return;
    }

    await context.redis.zRem("aibotchecker-queue", queue.map(item => item.member));

    for (const { member } of queue) {
        if (settings[Setting.AutogenUsersOnly] && !defaultUsernameRegex.test(member)) {
            continue;
        }

        console.log(`${member}: Second check for user`);
        let user: User | undefined;
        try {
            user = await context.reddit.getUserByUsername(member);
        } catch {
            //
        }

        if (!user) {
            console.log(`${member}: User is shadowbanned or deleted.`);
            continue;
        }

        // Check to see if user has aged out or now has too much karma.
        const maxAccountAgeInMonths = settings[Setting.MaximumAgeMonths] as number;
        if (user.createdAt < subMonths(new Date(), maxAccountAgeInMonths)) {
            console.log(`${user.username}: Account is too old.`);
            continue;
        }

        const maxKarma = settings[Setting.MaxKarma] as number | undefined ?? 500;
        if (user.commentKarma > maxKarma) {
            console.log(`${user.username}: Account has too much karma.`);
            continue;
        }

        await checkUserProperly(user, context, settings);
    }
}
