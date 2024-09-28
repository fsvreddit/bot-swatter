import {Comment, Post, TriggerContext, User} from "@devvit/public-api";
import {CommentCreate} from "@devvit/protos";
import {subDays} from "date-fns";
import {ThingPrefix} from "../utility.js";

function isCommentPotentiallyBot (body: string): boolean {
    if (body.length < 100) {
        return false;
    }

    if (body.length > 1200) {
        return false;
    }

    if (body.split("\n").length > 7) {
        return false;
    }

    return true;
}

export async function checkStyle2BotBehaviours (event: CommentCreate, context: TriggerContext) {
    if (!event.author || !event.comment) {
        return;
    }

    if (event.author.karma > 10000) {
        return;
    }

    if (event.comment.parentId.startsWith(ThingPrefix.Comment)) {
        return;
    }

    if (!isCommentPotentiallyBot(event.comment.body)) {
        return;
    }

    console.log(`Style 2: Running checks on ${event.author.name}`);

    let user: User | undefined;
    try {
        user = await context.reddit.getUserByUsername(event.author.name);
    } catch {
        //
    }

    if (!user) {
        console.log("Style 2: User shadowbanned.");
        return;
    }

    if (user.commentKarma > 1000) {
        console.log("Style 2: Too much karma");
        return;
    }

    const userItems = await context.reddit.getCommentsAndPostsByUser({
        username: user.username,
        sort: "new",
        limit: 100,
    }).all();

    const userPosts = userItems.filter(x => x instanceof Post && x.createdAt > subDays(new Date(), 14)) as Post[];

    if (userPosts.length === 0) {
        console.log("Style 2: No posts.");
        return;
    }

    if (userPosts.some(x => !x.url.includes("i.redd.it"))) {
        console.log("Style 2: Posts that aren't image.");
        return;
    }

    const singleCasePostTitleCount = userPosts.filter(x => x.title === x.title.toLowerCase() || x.title === x.title.toUpperCase()).length;
    if (singleCasePostTitleCount < userPosts.length / 2) {
        console.log("Style 2: User has too many mixed case post titles");
        return;
    }

    const userComments = userItems.filter(x => x instanceof Comment && x.createdAt > subDays(new Date(), 14)) as Comment[];

    if (userComments.some(x => x.parentId.startsWith(ThingPrefix.Comment))) {
        console.log("Style 2: User has non-TLC comments");
        return;
    }

    const boldStartRegex = /^\*\*.+\*\*[:.]/i;
    if (!userComments.some(x => boldStartRegex.test(x.body))) {
        console.log("Style 2: User has no comments that start with bold text");
        return;
    }

    const startsWithLowerCaseRegex = /^(?:\*\*)?[a-z]/;
    const lowerCaseStart = userComments.filter(x => startsWithLowerCaseRegex.test(x.body));
    if (lowerCaseStart.length > userComments.length / 20) {
        console.log("Style 2: User has too many comments starting with lower case");
        return;
    }

    if (userComments.some(x => !x.subredditName.toLowerCase().startsWith("ask") && !x.subredditName.toLowerCase().includes("advice") && !x.subredditName.toLowerCase().includes("aitah"))) {
        console.log("Style 2: User has commments in non-ask or non-advice subs");
        return;
    }

    if (userComments.some(x => !isCommentPotentiallyBot(x.body))) {
        console.log("Style 2: User has non-bottish commments");
        return;
    }

    const comment = await context.reddit.getCommentById(event.comment.id);
    await context.reddit.report(comment, {reason: "Potential Style 2 bot"});
}
