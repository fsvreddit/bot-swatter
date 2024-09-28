import {Comment, Post, TriggerContext} from "@devvit/public-api";
import {PostCreate} from "@devvit/protos";
import {subMonths} from "date-fns";

export async function checkStyle3BotBehaviours (event: PostCreate, context: TriggerContext) {
    if (!event.author || !event.post) {
        return;
    }

    console.log(`Style 3: Checking post ${event.post.id} from ${event.author.name}`);

    const wordwordregex = /^(?:[A-Z][a-z]+){2}$/;
    if (!wordwordregex.test(event.author.name)) {
        console.log(`Style 3: Username ${event.author.name} is not in WordWord format`);
        return;
    }

    const post = await context.reddit.getPostById(event.post.id);

    if (!post.body) {
        return;
    }

    if (post.subredditName.toLowerCase().includes("ask")) {
        console.log("Style 3: Not an Ask sub");
        return;
    }

    const paragraphCount = post.body.split("\n").length;
    if (paragraphCount < 3 || paragraphCount > 7) {
        console.log("Style 3: Wrong para count");
        return;
    }

    const user = await post.getAuthor();
    if (!user) {
        console.log("Style 3: User is shadowbanned or suspended.");
        return;
    }

    if (user.createdAt < subMonths(new Date(), 1)) {
        console.log("Style 3: User is too old");
        return;
    }

    if (user.commentKarma > 500) {
        console.log("Style 3: User has too much comment karma!");
        return;
    }

    const userContent = await context.reddit.getCommentsAndPostsByUser({
        username: post.authorName,
        limit: 100,
    }).all();

    const userPosts = userContent.filter(x => x instanceof Post) as Post[];

    if (!userPosts.some(x => x.subredditName === "aww")) {
        console.log("Style 3: No posts in /r/aww");
        return;
    }

    if (userPosts.some(x => x.subredditName !== "aww" && x.subredditName.toLowerCase().includes("ask") && x.subredditName.toLowerCase().includes("advice"))) {
        console.log("Style 3: Invalid subreddits found");
        return;
    }

    const userComments = userContent.filter(x => x instanceof Comment);

    let reason = "Potential Style 3 bot!";
    if (userComments.length > 0) {
        reason += " Comments in history means possible FP.";
    }

    await context.reddit.report(post, {reason});
    console.log("Style 3: Reported.");
}
