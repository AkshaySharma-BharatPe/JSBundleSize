const core = require("@actions/core");
const exec = require("@actions/exec");
const github = require("@actions/github");

async function run() {
  function bytesToSize(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 Byte";
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
  }
  try {
    // --------------- octokit initialization  ---------------
    const token = core.getInput("token");
    console.log("Initializing oktokit with token", token);
    const octokit = new github.GitHub(token);
    // --------------- End octokit initialization ---------------
    // ---------------Action Initialization----------------------
    const bootstrap = core.getInput("bootstrap"),
      build_command = core.getInput("build_command"),
      dist_path = core.getInput("dist_path"),
      base_branch = core.getInput("base_branch"),
      head_branch = core.getInput("head_branch");

    // Handle PR Branches
    await exec.exec(`git fetch`);

    const branches = [head_branch, base_branch];

    const branchesStats = [];

    for (let item of branches) {
      console.log("item", item);
      console.log(`Switching Branch - ${item}`);
      await exec.exec(`git checkout ${item}`);

      //----------------------Action Initialization End-------------

      // --------------- Build repo  ---------------

      console.log(`Bootstrapping repo`);
      await exec.exec(bootstrap);

      console.log(`Building Changes`);
      await exec.exec(build_command);

      core.setOutput(
        "Building repo completed - 1st @ ",
        new Date().toTimeString()
      );

      // --------------- End Build repo  ---------------

      // --------------- Comment repo size  ---------------
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
      await exec.exec(`du ${dist_path}`, null, outputOptions);
      core.setOutput("size", sizeCalOutput);
      const context = github.context,
        pull_request = context.payload.pull_request;

      const arrayOutput = sizeCalOutput.split("\n");
      let result = `Bundled size for the package is listed below - ${item}: \n \n`;
      // arrayOutput.forEach((item) => {
      //   const i = item.split(/(\s+)/);
      //   if (item) {
      //     // result += `**${i[2]}**: ${bytesToSize(parseInt(i[0]) * 1000)} \n`;
      //     result += `**${i[2]}**: ${bytesToSize(parseInt(i[0]) * 1000)} \n`;
      //   }
      // });
      const arrOp = arrayOutput.map((item) => {
        const i = item.split(/(\s+)/);
        return parseInt(i[0]) * 1000;
      });

      branchesStats.push(arrOp);

      if (pull_request) {
        // on pull request commit push add comment to pull request
        octokit.issues.createComment(
          Object.assign(Object.assign({}, context.repo), {
            issue_number: pull_request.number,
            body: result,
          })
        );
      }
    }

    const statsDifference = [];

    for (let i = 0; i < 4; i++) {
      statsDifference.push(branchesStats[1][i] - branchesStats[0][i]);
    }

    console.table(statsDifference);

    // --------------- End Comment repo size  ---------------
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
