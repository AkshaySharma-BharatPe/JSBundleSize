// const core = require("@actions/core");
// const exec = require("@actions/exec");
// const github = require("@actions/github");

// async function run() {
//   function bytesToSize(bytes) {
//     const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
//     if (bytes === 0) return "0 Byte";
//     const i = parseInt(Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)));
//     return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
//   }

//   try {
//     const token = core.getInput("token");

//     console.log("Initializing oktokit with token", token);
//     const octokit = new github.GitHub(token);
//     const context = github.context,
//     pull_request = context.payload.pull_request;
//     const bootstrap = core.getInput("bootstrap"),
//       build_command = core.getInput("build_command"),
//       dist_path = core.getInput("dist_path"),
//       base_branch = core.getInput("base_branch"),
//       head_branch = core.getInput("head_branch");

//     await exec.exec(`git fetch`);
//     const branches = [head_branch, base_branch];
//     const branchesStats = [];
//     const branchesHeading = [];

//     for (let item of branches) {
//       console.log("item", item);
//       console.log(`Switching Branch - ${item}`);
//       await exec.exec(`git checkout ${item}`);

//       console.log(`Bootstrapping repo`);
//       await exec.exec(bootstrap);

//       console.log(`Building Changes`);
//       await exec.exec(build_command);

//       core.setOutput(
//         "Building repo completed - 1st @ ",
//         new Date().toTimeString()
//       );


//       const outputOptions = {};
//       let sizeCalOutput = "";

//       outputOptions.listeners = {
//         stdout: (data) => {
//           sizeCalOutput += data.toString();
//         },
//         stderr: (data) => {
//           sizeCalOutput += data.toString();
//         },
//       };
//       await exec.exec(`du ${dist_path}`, null, outputOptions);
//       core.setOutput("size", sizeCalOutput);

//       const arrayOutput = sizeCalOutput.split("\n");

//       const arrOp = arrayOutput.map((item) => {
//         const i = item.split(/(\s+)/);
//         branchesHeading.push(`${i[2]}`);
//         return parseInt(i[0]) * 1000;
//       });
//       branchesStats.push(arrOp);
//     }

//     for(let i of branchesHeading){
//       console.log(i);
//     }

//     const statsDifference = [];
//     for (let i = 0; i < 4; i++) {
//       statsDifference.push(`${bytesToSize(branchesStats[0][i] - branchesStats[1][i])}`);
//     }

//     let result = "Bundled size Difference for the package is listed below: \n \n";
//     statsDifference.forEach((item, index) => {
//       result += `${branchesHeading[index]} - ${item} \n`;
//     });

//     if (pull_request) {
//       octokit.issues.createComment(
//         Object.assign(Object.assign({}, context.repo), {
//           issue_number: pull_request.number,
//           body: result,
//         })
//       );
//     }
//     console.table(statsDifference);

//     const resultv2 = `
//     | Files Type  | Old Size (${head_branch}) | New Size (${base_branch}) | Difference |
//     | ------------- |:------------- |:------------- |:-------------:|
//     | ${branchesHeading[0]}  | ${bytesToSize(branchesStats[0][0])}  |   ${bytesToSize(branchesStats[1][0])}  | ${bytesToSize(branchesStats[0][0] - branchesStats[1][0])}|
//     | ${branchesHeading[1]}  | ${bytesToSize(branchesStats[0][1])} |   ${bytesToSize(branchesStats[1][1])}  | ${bytesToSize(branchesStats[0][1] - branchesStats[1][1])}|
//     | ${branchesHeading[2]}  | ${bytesToSize(branchesStats[0][2])}  |   ${bytesToSize(branchesStats[1][2])}  | ${bytesToSize(branchesStats[0][2] - branchesStats[1][2])}|
//     | ${branchesHeading[3]}  | ${bytesToSize(branchesStats[0][3])}  |   ${bytesToSize(branchesStats[1][3])}  | ${bytesToSize(branchesStats[0][3] - branchesStats[1][3])}|
//     `;

//     if (pull_request) {
//       octokit.issues.createComment(
//         Object.assign(Object.assign({}, context.repo), {
//           issue_number: pull_request.number,
//           body: resultv2,
//         })
//       );
//     }

//     // --------------- End Comment repo size  ---------------
//   } catch (error) {
//     core.setFailed(error.message);
//   }
// }

// run();


const core = require("@actions/core");
const github = require("@actions/github");

const originMeta = {
  commentFrom: 'Comment Test Coverage as table',
}

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

    const octokit = new github.getOctokit(inputs.token);

    const coverage = `<!--json:nMeta)}-->
|${inputs.title}| %                           | values                                                              |
|---------------|:---------------------------:|:-------------------------------------------------------------------:|
|Statements     |Statements|Statements|
|Branches       |Statements  |Statements   |
|Functions      |Statements|Statements  |
|Lines          |Statements     |Statements          |
`;

    await deletePreviousComments({
      issueNumber,
      octokit,
      owner,
      repo,
    });

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: coverage,
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function deletePreviousComments({ owner, repo, octokit, issueNumber }) {
  const onlyPreviousCoverageComments = (comment) => {
    const regexMarker = /^<!--json:{.*?}-->/;
    const extractMetaFromMarker = (body) => JSON.parse(body.replace(/^<!--json:|-->(.|\n|\r)*$/g, ''));

    if (comment.user.type !== 'Bot') return false;
    if (!regexMarker.test(comment.body)) return false;

    const meta = extractMetaFromMarker(comment.body);

    return meta.commentFrom === originMeta.commentFrom;
  }

  const asyncDeleteComment = (comment) => {
    return octokit.issues.deleteComment({ owner, repo, comment_id: comment.id });
  }

  const commentList = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
  }).then(response => response.data);

  await Promise.all(
    commentList
    .filter(onlyPreviousCoverageComments)
    .map(asyncDeleteComment)
  );
}

run();