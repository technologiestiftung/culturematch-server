module.exports = {
  port: process.env.PORT,
  filesConfig: {
    storage: {
      destination: process.env.STORAGE_DESTINATION,
      config: {
        s3: {
          endpoint: process.env.S3_ENDPOINT,
          bucket: process.env.S3_BUCKET,
        },
        local: {
          path: process.env.STORAGE_LOCAL_PATH || './server/storage',
        },
      },
    },
    images: {
      download: {
        maxWidth: 2048,
        maxHeight: 2048,
        defaultQuality: 80,
      },
      upload: {},
    },
    allowedFileTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ],
    maxFileSizeInKb: 2000,
  },
};
