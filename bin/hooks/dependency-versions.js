const fs = require('fs');

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

const dependencies = Object.assign({}, packageJson.dependencies, packageJson.devDependencies);

let failedDependencies = [];

Object.keys(dependencies).forEach((dependency) => {
  const version = dependencies[dependency];

  const regex = /([~*^]|\b\.x)/;

  if (regex.test(version)) {
    failedDependencies.push(dependency);
  }
});

if (failedDependencies.length > 0) {
  console.log(`Oh no! ${failedDependencies.length} dependencies do not have exact versions specified: ${failedDependencies.join(', ')}. Do not use *, ^, ~, or x in the version, you need to fix this before committing to this repo.`);
  process.exit(1);
}

process.exit(0);
