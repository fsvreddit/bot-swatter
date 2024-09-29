This Devvit app looks for accounts that match the characteristics of a very specific spam wave that has been coming and going for a little over a year. It is not a generic "anti-bot" app at this stage, but may evolve into one in the future.

The specific spam wave consists of users posting top-level LLM-generated comments with a light-hearted tone. These accounts never make replies to comments, only posts, and will typically have either no posts in the user's history or occasionally an image post (e.g. in a cute animals sub) or an AskReddit post.

You can choose to either report the comment for review, or ban the user. I strongly recommend that you run the app in "report" mode for a little while until you're happy that it's detecting users correctly, and only then put it into "ban and remove" mode.

To be detected as a bot, all of the following must apply:

* The username must match one of a number of specific patterns. The current LLM Bot spam wave consists of a number of distinctive username patterns
* The user must not have made any replies to other comments anywhere - just top level comments
* The user must not have made any comments with line breaks
* The user must not have edited any comment
* The user must not have made any posts, other than image posts or posts in r/AskReddit

Username patterns checked:

* Usernames that superficially resemble Reddit-generated account names (Word-Word-Number) but that do NOT use any of the keywords that Reddit suggests. E.g. Laura_Harris_1624, Deborah_Phillips358
* Reddit-generated account names but only for exceptionally low karma accounts
* Usernames such as Margaret3U88Nelson, Elizabeth5O3Perez20, patricia0E8efimov
* Usernames such as Patricia99kozlov, Michelle2012danilov
* Usernames such as MichelleWilson3g33, RuthGreen1r60, Laura9l7m
* Usernames such as Laura_Parker_ea, Sandra_Jones_jd

If you do spot LLM bot accounts with minor variations from the configurable options, please get in touch with details of the accounts. Please don't get in touch about other spamming patterns as I'm not looking to make a generic anti-bot app at this time.

This app is open source. You can find the source code on Github [here](https://github.com/fsvreddit/bot-swatter).

## Change History

### v1.1:

* Overhaul username detections as bots have evolved. Removed options for subreddit diversity to allow very new accounts to be detected.
* Lower default karma limit
