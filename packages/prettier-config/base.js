/**
 * @type {import("prettier").Config}
 * */
const config = {
    semi: true,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: "all",
    printWidth: 80,
    bracketSpacing: true,
    arrowParens: "always",
    endOfLine: "auto",
    overrides: [
        {
            files: "*.{json,yml,yaml}",
            options: {
                tabWidth: 2,
                useTabs: false,
            },
        },
    ],
};

export { config };
