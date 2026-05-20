import ImageKit from '@imagekit/nodejs';
import { toFile } from '@imagekit/nodejs';
import { Config } from '../config/config.js';

const client = new ImageKit({
  privateKey: Config.IMAGEKIT_PRIVATE_KEY,
  publicKey: Config.IMAGEKIT_PUBLIC_KEY,
  urlEndpoint: Config.IMAGEKIT_URL_ENDPOINT
});

export const UploadImage = async ({ buffer, fileName, folder = '/profiles' }) => {
  try {
    console.log('[STORAGE] Uploading file:', fileName, 'size:', buffer?.length);
    
    const file = await toFile(buffer, fileName);
    console.log('[STORAGE] File prepared:', file.type, file.size);
    
    const result = await client.files.upload({
      file: file,
      fileName: fileName,
      folder: folder
    });

    console.log('[STORAGE] Upload result:', result.url);

    return {
      url: result.url,
      fileId: result.fileId,
      path: result.filePath
    };
  } catch (error) {
    console.error('[STORAGE] ImageKit upload error:', error.message);
    console.error('[STORAGE] Full error:', error);
    throw error;
  }
};

export const DeleteImage = async (fileId) => {
  try {
    await client.files.delete(fileId);
    return true;
  } catch (error) {
    console.error('[STORAGE] ImageKit delete error:', error.message);
    throw error;
  }
};

export const getImageKitUrl = (path, options = {}) => {
  return client.url(path, options);
};

export default client;