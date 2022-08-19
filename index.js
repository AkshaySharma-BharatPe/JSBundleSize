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
    const token = core.getInput("token");
    console.log("Initializing oktokit with token", token);
    const octokit = new github.GitHub(token);
    const context = github.context,
    pull_request = context.payload.pull_request;
    const bootstrap = core.getInput("bootstrap"),
      build_command = core.getInput("build_command"),
      dist_path = core.getInput("dist_path"),
      base_branch = core.getInput("base_branch"),
      head_branch = core.getInput("head_branch");

    await exec.exec(`git fetch`);
    const branches = [head_branch, base_branch];
    const branchesStats = [];
    const branchesHeading = [];

    for (let item of branches) {
      console.log("item", item);
      console.log(`Switching Branch - ${item}`);
      await exec.exec(`git checkout ${item}`);

      console.log(`Bootstrapping repo`);
      await exec.exec(bootstrap);

      console.log(`Building Changes`);
      await exec.exec(build_command);

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
      await exec.exec(`du ${dist_path}`, null, outputOptions);
      core.setOutput("size", sizeCalOutput);

      const arrayOutput = sizeCalOutput.split("\n");

      const arrOp = arrayOutput.map((item) => {
        const i = item.split(/(\s+)/);
        branchesHeading.push(`${i[2]}`);
        return parseInt(i[0]) * 1000;
      });
      branchesStats.push(arrOp);
    }

    for(let i of branchesHeading){
      console.log(i);
    }

    const statsDifference = [];
    for (let i = 0; i < 4; i++) {
      statsDifference.push(`${bytesToSize(branchesStats[1][i] - branchesStats[0][i])}`);
    }

    let result = "Bundled size for the package is listed below: \n \n";
    statsDifference.forEach((item, index) => {
      result += `${branchesHeading[index]} - ${item} \n`;
    });

    if (pull_request) {
      octokit.issues.createComment(
        Object.assign(Object.assign({}, context.repo), {
          issue_number: pull_request.number,
          body: result,
        })
      );
    }
    console.table(statsDifference);

    // --------------- End Comment repo size  ---------------
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
