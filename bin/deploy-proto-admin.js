const fs = require('fs');
const { execSync } = require('child_process');

async function deployProtoAdmin() {
  try {
    fs.mkdirSync('./client/proto-admin');

    const adminConfig = require(`${process.cwd()}/server/proto-admin-config.json`);
    const adminVersion = adminConfig.version;

    if (!adminVersion) { return; }

    const baseUrl = process.argv[2];

    if (!baseUrl) {
      console.error('A base url is required!');

      process.exit(1);
    }

    const baseHref = adminConfig.baseHref || '/admin/';

    console.log(`Fetching version ${adminVersion} of proto-admin}`);

    execSync(`cd client/proto-admin && git clone git@git.prototype.berlin:prototype-berlin/proto-admin.git --branch ${adminVersion} --depth=1 .`);

    execSync('cd client/proto-admin && rm -rf .git');

    let environmentFile = fs.readFileSync('./client/proto-admin/src/environments/environment.prod.ts', { encoding: 'utf-8' });

    environmentFile = environmentFile.replace(/(baseUrl:\s')(.*?)(')/g, '$1' + 'https://' + baseUrl + '$3');

    fs.writeFileSync('./client/proto-admin/src/environments/environment.prod.ts', environmentFile);

    execSync('cd client/proto-admin && npm i');

    execSync(`cd client/proto-admin && ng build --base-href ${baseHref} --c=production`);
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
}

deployProtoAdmin();
