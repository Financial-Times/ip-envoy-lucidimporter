module.exports = {
    is_violateRule: (fileName) => {
            const regexLiteral = /^([a-zA-Z])[a-zA-Z0-9-]*$/;
            return regexLiteral.test(fileName);
        }
};
