const core = require("@actions/core");
const github = require("@actions/github");
const { Octokit } = require("@octokit/rest");


async function run() {
  // function bytesToSize(bytes) {
  //   const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  //   if (bytes === 0) return "0 Byte";
  //   const i = parseInt(Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)));
  //   return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
  // }

  try {
    const inputs = {
      token: core.getInput("token"),
      bootstrap : core.getInput("bootstrap"),
      build_command : core.getInput("build_command"),
      dist_path : core.getInput("dist_path"),
      base_branch : core.getInput("base_branch"),
      head_branch : core.getInput("head_branch"),
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

    console.log(inputs.token, inputs.bootstrap, inputs.build_command, inputs.dist_path, inputs.base_branch, inputs.head_branch);

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