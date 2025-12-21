#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getCommitCount() {
  try {
    return parseInt(execSync('git rev-list --count HEAD').toString().trim(), 10);
  } catch {
    return 0;
  }
}

function getPackageVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
    const parts = pkg.version.split('.');
    return { major: parts[0] || '1', minor: parts[1] || '0' };
  } catch {
    return { major: '1', minor: '0' };
  }
}

const { major, minor } = getPackageVersion();
const patch = getCommitCount();
const version = `${major}.${minor}.${patch}`;

const versionInfo = {
  version,
  buildTime: new Date().toISOString()
};

fs.writeFileSync(path.join(__dirname, '..', 'version.json'), JSON.stringify(versionInfo, null, 2));
console.log(`Generated version: ${version}`);
