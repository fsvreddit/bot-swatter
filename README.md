This Devvit app looks for accounts that match the characteristics of a very specific spam wave that has been coming and going for a little over a year. It is not a generic "anti-bot" app at this stage, but may evolve into one in the future.

The specific spam wave consists of users posting top-level LLM-generated comments with a light-hearted tone. These accounts never make replies to comments, only posts, and will typically have either no posts in the user's history or occasionally an image post (e.g. in a cute animals sub) or an AskReddit post.

You can choose to either report the comment for review, or ban the user. I strongly recommend that you run the app in "report" mode for a little while until you're happy that it's detecting users correctly, and only then put it into "ban and remove" mode.

To be detected as a bot, the account must be young enough, low karma enough, have enough distinct subreddits relative to comments, and every comment in their history must be top-level (i.e. not a reply to another comment), must not contain line breaks, must not be edited, and must start with a capital letter. The account must not have any posts other than image posts or posts in /r/AskReddit. The actual comment content itself is not analysed, just account heuristics.

If you do spot LLM bot accounts with minor variations from the configurable options, please get in touch with details of the accounts. Please don't get in touch about other spamming patterns as I'm not looking to make a generic anti-bot app at this time.

This app is open source. You can find the source code on Github [here](https://github.com/fsvreddit/bot-swatter).
