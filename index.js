const core = require("@actions/core");
const github = require("@actions/github");
const { Octokit } = require("@octokit/rest");


async function run() {
  try {
    const inputs = {
      token: core.getInput("token"),
    };

    const {
      payload: { pull_request: pullRequest, repository }
    } = github.context;

    if (!pullRequest) {
      core.error("This action only works on pull_request events");
      return;
    }

    const { number: issueNumber } = pullRequest;
    const { full_name: repoFullName } = repository;
    const [owner, repo] = repoFullName.split("/");

    const octokit = new Octokit({
      auth: inputs.token
    })


    const coverage = `<!--json:nMeta)}-->
|${inputs.title}| %                           | values                                                              |
|---------------|:---------------------------:|:-------------------------------------------------------------------:|
|Statements     |Statements|Statements|
|Branches       |Statements  |Statements   |
|Functions      |Statements|Statements  |
|Lines          |Statements     |Statements          |
`;

    octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: coverage,
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}


run();