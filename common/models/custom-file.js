const sharp = require('sharp');
const fs = require('fs');
const app = require('../../server/server.js');
const filesConfig = app.get('filesConfig');
const request = require('request');
const fileType = require('file-type');
const sizeOf = require('image-size');
const aws = require('aws-sdk');

let s3;

if (filesConfig.storage.destination === 's3') {
  aws.config.update({
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
    endpoint: process.env.S3_ENDPOINT,
  });

  s3 = new aws.S3();
}

module.exports = function (CustomFile) {
  CustomFile.beforeRemote('create', async (context) => {
    context.res.status(405);

    return Promise.reject({ message: 'Method not allowed.' });
  });

  CustomFile.observe('after delete', async function (context) {
    if (context.instance) {
      switch (filesConfig.storage.destination) {
        case 's3':
          s3.deleteObject({ Bucket: filesConfig.storage.config.s3.bucket, Key: `${context.instance.id}.${context.instance.extension}` }).promise().catch((error) => {
            console.error(error);
          });
          break;

        default:
          fs.unlink(`${filesConfig.storage.config.local.path}/${context.instance.id}.${context.instance.extension}`, (error) => { });
          break;
      }
    }
  });

  CustomFile.createNewFile = async (metadata, file) => {
    try {
      const instance = await CustomFile.create(metadata);

      switch (filesConfig.storage.destination) {
        case 's3':
          const object = { Bucket: filesConfig.storage.config.s3.bucket, Key: `${instance.id}.${instance.extension}`, Body: file.buffer };

          try {
            await s3.putObject(object).promise();
          } catch (error) {
            handleSaveError(instance.id);
            
            return Promise.reject(error);
          }
          break;

        default:
          const path = `${filesConfig.storage.config.local.path}/${instance.id}.${instance.extension}`;

          try {
            fs.writeFileSync(path, file.buffer);
          } catch (error) {
            handleSaveError(instance.id);
            
            return Promise.reject(error);
          }
          break;
      }

      return Promise.resolve(instance);
    } catch (error) {
      return Promise.reject(error);
    }
  };

  function handleSaveError (id) {
    CustomFile.destroyById(id);
  }

  CustomFile.resizeImage = async (file, width, height, square, quality = filesConfig.images.download.defaultQuality, blur) => {
    if (width > filesConfig.images.download.maxWidth) {
      width = filesConfig.images.download.maxWidth;
    }

    if (height > filesConfig.images.download.maxHeight) {
      height = filesConfig.images.download.maxHeight;
    }

    if (square > filesConfig.images.download.maxWidth) {
      square = filesConfig.images.download.maxWidth;
    }

    if (square) {
      width = square;
      height = square;
    }
    
    const buffer = await getFileAsBuffer(file);

    let transformer = sharp(buffer).resize(width, height);

    if (blur && typeof blur === 'number' && blur > 0) {
      try {
        blur = blur > 100 ? 100 : blur;
        transformer = transformer.blur(1 + blur / 2);
      } catch (error) {
        console.error(error);
      }
    }

    switch (file.mimeType) {
      case 'image/jpeg':
        transformer.jpeg({
          quality: quality,
        });
        break;

      case 'image/webp':
        transformer.webp({
          quality: quality,
        });
        break;

      default:
        break;
    }

    try {
      const finalBuffer = await transformer.toBuffer();

      return Promise.resolve(finalBuffer);
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  };

  async function getFileAsBuffer(file) {
    try {
      switch (filesConfig.storage.destination) {
        case 's3':
          const response = await s3.getObject({ Bucket: filesConfig.storage.config.s3.bucket, Key: `${file.id}.${file.extension}` }).promise();

          return Promise.resolve(response.Body);
      
        default:
          const buffer = fs.readFileSync(`${filesConfig.storage.config.local.path}/${file.id}.${file.extension}`);

          return Promise.resolve(buffer);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  CustomFile.upload = async (req) => {
    if (!req.files || !req.files.length) {
      req.res.status(422);
      
      return Promise.reject({ message: 'No file present.' });
    }

    const file = req.files[0];
    const parts = file.originalname.split('.');

    let extension = parts[parts.length - 1];
    let type = 'other';

    if (file.mimetype.indexOf('image/') > -1) {
      type = 'image';

      if (file.mimetype === 'image/jpeg') {
        extension = 'jpg';
      }
    }

    const metadata = {
      extension: extension,
      mimeType: file.mimetype,
      type: type,
      userId: req.accessToken ? req.accessToken.userId : null,
      name: file.originalname,
      size: file.size,
    };

    try {
      const dimensions = sizeOf(req.files[0].buffer);

      metadata.meta = {
        width: dimensions.width,
        height: dimensions.height,
        orientation: dimensions.orientation,
      };
    } catch (_) { }

    try {
      const result = await CustomFile.createNewFile(metadata, file);

      return Promise.resolve(result);
    } catch (error) {
      req.res.status(400);

      return Promise.reject(error);
    }
  };

  CustomFile.remoteMethod('upload', {
    accepts: [
      {
        arg: 'req',
        type: 'object',
        http: (context) => {
          return context.req;
        },
      },
    ],
    returns: {
      arg: 'data',
      type: 'object',
      root: true,
    },
    http: {
      verb: 'post',
      path: '/upload',
    },
  });

  CustomFile.uploadFromUrl = async (req) => {
    const url = req.body.url;

    if (!url) {
      req.res.status(422);

      return Promise.reject({ message: 'url is required.' });
    }

    try {
      const buffer = await downloadRemoteFile(url);
      const meta = fileType(buffer);

      let fileMeta = {
        extension: meta.ext,
        mimeType: meta.mime,
        type: meta.mime.split('/')[0],
        userId: req.accessToken ? req.accessToken.userId : null,
      };

      try {
        const dimensions = sizeOf(buffer);

        fileMeta.meta = {
          width: dimensions.width,
          height: dimensions.height,
          orientation: dimensions.orientation,
        };
      } catch (_) { }

      const file = { buffer };

      const instance = await CustomFile.createNewFile(fileMeta, file);

      return Promise.resolve(instance);
    } catch (error) {
      console.error(error);

      return Promise.reject(error);
    }
  };

  function downloadRemoteFile(url) {
    return new Promise((resolve, reject) => {
      request({
        url: url,
        encoding: null,
      }, (error, response, body) => {
        if (error) {
          return reject(error);
        }

        if (response.statusCode !== 200) {
          return reject('Error: ' + response.statusCode);
        }

        resolve(body);
      });
    });
  }

  CustomFile.remoteMethod('uploadFromUrl', {
    accepts: [
      {
        arg: 'req',
        type: 'object',
        http: (context) => {
          return context.req;
        },
      },
    ],
    returns: {
      arg: 'data',
      type: 'object',
      root: true,
    },
    http: {
      verb: 'post',
      path: '/upload-from-url',
    },
  });

  CustomFile.download = async (id, req, width, height, square, quality, blur) => {
    try {
      const file = await CustomFile.findById(id);

      if (!file) {
        req.res.status(404);

        return Promise.reject({ message: 'File not found in database.' });
      }

      if (file.type === 'image') {
        const buffer = await CustomFile.resizeImage(file, width, height, square, quality, blur);

        return Promise.resolve([buffer, file.mimeType, `filename="${file.id}.${file.extension}"`, 'public, max-age=31536000']);
      }

      const buffer = await getFileAsBuffer(file);

      return Promise.resolve([buffer, file.mimeType, `filename="${file.id}.${file.extension}"`, 'public, max-age=31536000']);
    } catch (error) {
      if (error.code === 'ENOENT') {
        req.res.status(404);

        return Promise.reject({ message: 'File not found in storage.' });
      }

      console.error(error);

      return Promise.reject(error);
    }
  };

  CustomFile.remoteMethod('download', {
    accepts: [
      {
        arg: 'id',
        type: 'string',
        required: true,
      },
      {
        arg: 'req',
        type: 'object',
        http: (context) => {
          return context.req;
        },
      },
      {
        arg: 'width',
        type: 'number',
      },
      {
        arg: 'height',
        type: 'number',
      },
      {
        arg: 'square',
        type: 'number',
      },
      {
        arg: 'quality',
        type: 'number',
      },
      {
        arg: 'blur',
        type: 'number',
      },
    ],
    returns: [
      {
        arg: 'file',
        type: 'file',
        root: true,
      },
      {
        arg: 'Content-Type',
        type: 'string',
        http: {
          target: 'header',
        },
      },
      {
        arg: 'Content-Disposition',
        type: 'string',
        http: {
          target: 'header',
        },
      },
      {
        arg: 'Cache-Control',
        type: 'string',
        http: {
          target: 'header',
        },
      },
    ],
    http: {
      verb: 'get',
      path: '/:id/download',
    },
  });
};
