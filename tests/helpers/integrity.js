import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class IntegrityChecker {
  static getFileSha256(filePath) {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) return null;
    const data = fs.readFileSync(fullPath);
    return crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
  }

  static verifyBackupIntegrity(expectedHash = 'A80F8D5A9012CDD5A5B1F33E3965D3728BAF3FD3FE91218E7BD895F15324BDE4') {
    const backupPath = 'ios_prototype_yedek.html';
    const actualHash = this.getFileSha256(backupPath);
    return {
      filePath: backupPath,
      expected: expectedHash.toUpperCase(),
      actual: actualHash,
      valid: actualHash === expectedHash.toUpperCase()
    };
  }

  static verifyBundleSync() {
    const rootPath = 'ios_prototype.html';
    const bundlePath = 'ios/dars-ios/App/www/ios_prototype.html';
    const rootExists = fs.existsSync(path.resolve(rootPath));
    const bundleExists = fs.existsSync(path.resolve(bundlePath));
    if (!rootExists || !bundleExists) {
      return { inSync: false, rootExists, bundleExists, diff: 'One or both files missing' };
    }
    const rootHash = this.getFileSha256(rootPath);
    const bundleHash = this.getFileSha256(bundlePath);
    return {
      inSync: rootHash === bundleHash,
      rootHash,
      bundleHash
    };
  }

  static parseProjectYml(projectYmlPath = 'ios/project.yml') {
    const fullPath = path.resolve(projectYmlPath);
    if (!fs.existsSync(fullPath)) return null;
    const content = fs.readFileSync(fullPath, 'utf8');

    const result = {
      content,
      rawLines: content.split('\n'),
      currentProjectVersion: null,
      bundleIdentifier: null,
      marketingVersion: null,
      developmentTeam: null,
      deploymentTarget: null,
      targets: []
    };

    const verMatch = content.match(/CURRENT_PROJECT_VERSION:\s*["']?(\d+)["']?/);
    if (verMatch) result.currentProjectVersion = parseInt(verMatch[1], 10);

    const bundleMatch = content.match(/PRODUCT_BUNDLE_IDENTIFIER:\s*([^\s\n]+)/);
    if (bundleMatch) result.bundleIdentifier = bundleMatch[1].trim();

    const teamMatch = content.match(/DEVELOPMENT_TEAM:\s*([^\s\n]+)/);
    if (teamMatch) result.developmentTeam = teamMatch[1].trim();

    const targetMatch = content.match(/deploymentTarget:\s*["']?([^"'\s\n]+)["']?/);
    if (targetMatch) result.deploymentTarget = targetMatch[1].trim();

    return result;
  }

  static parseWorkflow(workflowPath = '.github/workflows/deploy_testflight.yml') {
    const fullPath = path.resolve(workflowPath);
    if (!fs.existsSync(fullPath)) return null;
    const content = fs.readFileSync(fullPath, 'utf8');
    return {
      exists: true,
      content,
      triggersOnMain: /branches:\s*\n\s*-\s*main/.test(content),
      triggersOnMaster: /branches:[\s\S]*?-\s*master/.test(content),
      hasFastlaneStep: content.includes('bundle exec fastlane beta'),
      hasXcodeGenStep: content.includes('xcodegen generate'),
      hasArtifactUpload: content.includes('actions/upload-artifact')
    };
  }
}
