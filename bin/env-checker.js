const fs = require('fs');
const readline = require('readline');

Promise.all([
  fileToArray('.env.example'),
  fileToArray('.remote-env'),
]).then((files) => {
  const envExample = files[0];
  const remoteEnv = files[1];

  if (envExample.length != remoteEnv.length) {
    console.error(`Example and remote env file do have a different number of lines: ${envExample.length} vs. ${remoteEnv.length}`);
    process.exit(1);
  }

  compareEnvKeys(envExample, remoteEnv);
});

function fileToArray(path) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(path),
    });

    const lines = [];

    rl.on('line', function (line) {
      lines.push(line);
    });

    rl.on('close', function () {
      resolve(lines);
    });
  });
}

function compareEnvKeys(example, remote) {
  let lineNumber = 0;
  let missmatches = [];
  example.forEach((exampleLine) => {
    let keyExample = exampleLine.match(/(\w+)(=)/g);
    let keyRemote = remote[lineNumber].match(/(\w+)(=)/g);

    keyExample = keyExample ? keyExample[0] : keyExample;
    keyRemote = keyRemote ? keyRemote[0] : keyRemote;

    if (keyExample != keyRemote) {
      missmatches.push({
        lineNumber: lineNumber,
        keyExample: keyExample,
        keyRemote: keyRemote,
      });
    }
    lineNumber++;
  });

  if (missmatches.length > 0) {
    console.error('The following lines do not match:');
    console.log();
    missmatches.forEach((missmatch) => {
      console.log(`${missmatch.lineNumber}: ${missmatch.keyExample} in .env.example vs. ${missmatch.keyRemote} in .env`);
    });
    console.log();
    console.error('Aborting deployment.');
    process.exit(1);
  }
}
