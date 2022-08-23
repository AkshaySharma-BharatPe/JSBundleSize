const core = require("@actions/core");
const github = require("@actions/github");
const { Octokit } = require("@octokit/rest");
const exec = require("@actions/exec");

async function run() {
  function bytesToSize(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 Byte";
    const i = parseInt(Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)));
    return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
  }

  try {
    const inputs = {
      token: core.getInput("token"),
      bootstrap: core.getInput("bootstrap"),
      build_command: core.getInput("build_command"),
      dist_path: core.getInput("dist_path"),
      base_branch: core.getInput("base_branch"),
      head_branch: core.getInput("head_branch"),
    };

    const {
      payload: { pull_request: pullRequest, repository },
    } = github.context;

    if (!pullRequest) {
      core.error("This action only works on pull_request events");
      return;
    }

    const { number: issueNumber } = pullRequest;
    const { full_name: repoFullName } = repository;
    const [owner, repo] = repoFullName.split("/");

    const octokit = new Octokit({
      auth: inputs.token,
    });

    await exec.exec(`git fetch`);
    const branches = [inputs.head_branch, inputs.base_branch];
    const branchesStats = [];
    const branchesHeading = [];

    for (let item of branches) {
      await exec.exec(`git checkout ${item}`);
      await exec.exec(inputs.bootstrap);
      await exec.exec(inputs.build_command);

      core.setOutput(
        "Building repo completed - 1st @ ",
        new Date().toTimeString()
      );

      const outputOptions = {};
      let sizeCalOutput = "";

      outputOptions.listeners = {
        stdout: (data) => {
          sizeCalOutput += data.toString();
        },
        stderr: (data) => {
          sizeCalOutput += data.toString();
        },
      };

      await exec.exec(`du ${inputs.dist_path}`, null, outputOptions);
      core.setOutput("size", sizeCalOutput);

      const arrayOutput = sizeCalOutput.split("\n");

      const arrOp = arrayOutput.map((item) => {
        const i = item.split(/(\s+)/);
        branchesHeading.push(`${i[2]}`);
        return parseInt(i[0]) * 1000;
      });
      branchesStats.push(arrOp);
    }

    const coverage = `|Files Type|New Stats (${
      inputs.head_branch
    })|Old Stats (${inputs.base_branch})|Differences (New - Old)|
|-----|:-----:|:-----:|:-----:|
|${branchesHeading[0]}|${bytesToSize(branchesStats[0][0])}|${bytesToSize(
      branchesStats[1][0]
    )}|${bytesToSize(branchesStats[0][0] - branchesStats[1][0])}|
|${branchesHeading[1]}|${bytesToSize(branchesStats[0][1])}|${bytesToSize(
      branchesStats[1][1]
    )}|${bytesToSize(branchesStats[0][1] - branchesStats[1][1])}|
|${branchesHeading[2]}|${bytesToSize(branchesStats[0][2])}|${bytesToSize(
      branchesStats[1][2]
    )}|${bytesToSize(branchesStats[0][2] - branchesStats[1][2])}|
|${branchesHeading[3]}|${bytesToSize(branchesStats[0][3])}|${bytesToSize(
      branchesStats[1][3]
    )}|${bytesToSize(branchesStats[0][3] - branchesStats[1][3])}|
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
