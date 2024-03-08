import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs' 

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME , 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET, 
});

const uploadOnCloudinary = async (localFilepath) =>{
  try {
    if (!localFilepath) return null
     const resposne = await cloudinary.uploader.upload(localFilepath,{
      resource_type:"auto"
    })
    // console.log("File is upload on cloudinary",resposne.url);
    fs.unlinkSync(localFilepath)
    return resposne;
  } catch (error) {
    fs.unlinkSync(localFilepath)
    return null
  }
}

export {uploadOnCloudinary}