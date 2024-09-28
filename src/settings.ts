import { SettingsFormField } from "@devvit/public-api";

export enum Setting {
    Action = "action",
    BanMessage = "banMessage",
    MinimumCommentCount = "minCommentCount",
    MaximumAgeMonths = "maximumAgeInMonths",
    MaxKarma = "maximumKarma",
    MaxCommentLength = "maxCommentLength",
}

export enum AIBotDetectionAction {
    None = "none",
    Report = "report",
    BanAndRemove = "banandremove",
}

export const settingsForAIBotDetection: SettingsFormField[] = [
    {
        name: Setting.Action,
        type: "select",
        label: "Action to take",
        options: [
            { label: "No action (disable)", value: AIBotDetectionAction.None },
            { label: "Report", value: AIBotDetectionAction.Report },
            { label: "Ban and Remove", value: AIBotDetectionAction.BanAndRemove },
        ],
        defaultValue: [AIBotDetectionAction.Report],
    },
    {
        name: Setting.BanMessage,
        type: "string",
        label: "Ban reason",
        defaultValue: "LLM Bot",
    },
    {
        name: Setting.MinimumCommentCount,
        type: "number",
        label: "Minimum comments on account to allow checking",
        helpText: "If this is set too low, false positives on new non-bot accounts will occur. Users will be re-checked every few hours.",
        defaultValue: 1,
    },
    {
        name: Setting.MaximumAgeMonths,
        type: "number",
        label: "Maximum account age in months",
        helpText: "Most LLM bot accounts are relatively young. Keep this as low as possible to detect bots without false positives.",
        defaultValue: 3,
    },
    {
        name: Setting.MaxKarma,
        type: "number",
        label: "Maximum account comment karma",
        helpText: "Most LLM bot accounts are low karma. Keep this as low as possible to detect bots without false positives.",
        defaultValue: 50,
    },
    {
        name: Setting.MaxCommentLength,
        type: "number",
        label: "Maximum comment length",
        helpText: "Most LLM bot accounts leave short comments only. Keep this number as low as possible to avoid false positives",
        defaultValue: 500,
    },
];
