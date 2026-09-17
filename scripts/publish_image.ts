import { spawn } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config();

// Read environment variables
const rawUsername = process.env.GHCR_USERNAME;
const rawPat = process.env.GHCR_PAT;
const imageName = process.env.IMAGE_NAME || 'gpu-spike-gate-00';
const imageTag = process.env.IMAGE_TAG || 'v1';

// Strict runtime assertion for required credentials
if (!rawUsername || !rawPat) {
  console.error('[ERROR] Missing GHCR_USERNAME or GHCR_PAT in .env');
  process.exit(1);
}

// Explicitly narrowed string bindings
const GHCR_USERNAME: string = rawUsername;
const GHCR_PAT: string = rawPat;
const fullImageUri = `ghcr.io/${GHCR_USERNAME.toLowerCase()}/${imageName}:${imageTag}`;

function runCommand(command: string, args: string[], inputPipe?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: ['pipe', 'inherit', 'inherit'] });

    if (inputPipe) {
      proc.stdin.write(inputPipe);
      proc.stdin.end();
    }

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command "${command} ${args.join(' ')}" exited with code ${code}`));
    });

    proc.on('error', reject);
  });
}

async function publish() {
  try {
    console.log(`=== AUTHENTICATING WITH GHCR ===`);
    // Pipes the PAT directly to stdin to prevent exposing tokens in process logs or shell history
    await runCommand('docker', ['login', 'ghcr.io', '-u', GHCR_USERNAME, '--password-stdin'], `${GHCR_PAT}\n`);
    console.log(`✓ GHCR Login Succeeded.\n`);

    console.log(`=== BUILDING CONTAINER IMAGE ===`);
    console.log(`Target: ${fullImageUri}`);
    await runCommand('docker', ['build', '-t', fullImageUri, '.']);
    console.log(`✓ Docker Build Completed.\n`);

    console.log(`=== PUSHING TO GHCR ===`);
    await runCommand('docker', ['push', fullImageUri]);
    console.log(`\n=== CONTAINER PUBLISHED SUCCESSFULLY ===`);
    console.log(`Image URI for RunPod template: ${fullImageUri}`);
  } catch (err) {
    console.error('\n[FATAL] Publishing failed:', err);
    process.exit(1);
  }
}

publish();