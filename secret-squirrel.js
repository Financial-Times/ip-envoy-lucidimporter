module.exports = {
  files: {
    allow: [
      '.*\\/?\\.gitignore',
      '.*\\/?\\.npmignore',
      '.*\\.(js|json|yml|yaml|ddl|docker|md|sh|vcl|csv|sample|txt|rm|js\\.snap)',
      '.*\\.(svg)',
      'Makefile',
      'n\\.Makefile',
      'index\\.mk',
      'Procfile',
      '\\.eslintignore',
      '\\.slugignore',
      '\\.bowerrc',
      '.*\\/\\.gitkeep',
      '\\.babelrc',
      '\\.eslintrc',
      'LICENSE',
      '.*\\.editorconfig',
      'CODEOWNERS',
      '\\.snyk'
    ],
    allowOverrides: []
  },
  strings: {
    deny: [
      '[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}', // emails
      '[A-Z0-9]{20}', // AWS access key IDs
      '[A-Za-z0-9/\\\\+=]{40}', // AWS secret access keys
      '[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}', // UUIDs - see [0]
    ],
    denyOverrides: []
  }
};
