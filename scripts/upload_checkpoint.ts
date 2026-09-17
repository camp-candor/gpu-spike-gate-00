import fs from 'node:fs';
import path from 'node:path';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import dotenv from 'dotenv';

dotenv.config();

const {
  R2_ENDPOINT_URL,
  R2_BUCKET,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  CHECKPOINT_KEY: DEFAULT_CHECKPOINT_KEY = 'checkpoints/wan2.2_i2v_high_noise_14B_Q3_K_S.gguf',
} = process.env;

if (!R2_ENDPOINT_URL || !R2_BUCKET || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  console.error('[ERROR] Missing R2 credentials in .env file');
  process.exit(1);
}

const localFilePath = process.argv[2];

if (!localFilePath) {
  console.error('Usage: npx tsx scripts/upload_checkpoint.ts <path-to-file> [optional-destination-key]');
  process.exit(1);
}

const resolvedPath = path.resolve(localFilePath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`[ERROR] File not found: ${resolvedPath}`);
  process.exit(1);
}

// Support CLI argument 2 as destination key, fallback to ENV, then default
const targetKey = process.argv[3] || DEFAULT_CHECKPOINT_KEY;

const fileStats = fs.statSync(resolvedPath);
const totalSizeMb = (fileStats.size / (1024 * 1024)).toFixed(2);
const totalSizeGb = (fileStats.size / (1024 * 1024 * 1024)).toFixed(2);

console.log(`=== PREPARING R2 MULTIPART UPLOAD ===`);
console.log(`Source File: ${resolvedPath}`);
console.log(`File Size:   ${totalSizeMb} MB (~${totalSizeGb} GB)`);
console.log(`Destination: ${R2_BUCKET}/${targetKey}`);

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

async function uploadFile() {
  const fileStream = fs.createReadStream(resolvedPath);
  const startTime = Date.now();

  const parallelUpload = new Upload({
    client: s3Client,
    params: {
      Bucket: R2_BUCKET,
      Key: targetKey,
      Body: fileStream,
      ContentType: 'application/octet-stream',
    },
    // Split into 20MB parts with 4 parallel TCP connections
    partSize: 20 * 1024 * 1024,
    queueSize: 4,
  });

  parallelUpload.on('httpUploadProgress', (progress) => {
    if (!progress.loaded) return;
    const loadedMb = (progress.loaded / (1024 * 1024)).toFixed(1);
    const percent = progress.total ? ((progress.loaded / progress.total) * 100).toFixed(1) : '??';
    process.stdout.write(`\r[Uploading] ${loadedMb} MB / ${totalSizeMb} MB (${percent}%)`);
  });

  try {
    await parallelUpload.done();
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== UPLOAD SUCCESSFUL in ${elapsedSeconds}s ===`);
  } catch (error) {
    console.error('\n[FATAL] Upload failed:', error);
    process.exit(1);
  }
}

uploadFile();