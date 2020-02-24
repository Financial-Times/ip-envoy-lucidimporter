module.exports = {
    isValidJourneyName: (journeyName) => {
            const regexLiteral = /^([a-zA-Z])[a-zA-Z0-9-]*$/;
            return regexLiteral.test(journeyName);
        }
};
