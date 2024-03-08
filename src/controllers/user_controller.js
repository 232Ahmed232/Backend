import {aysncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from '../models/user_model.js'
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js" 


const registerUser = aysncHandler (async(req,res)=>{
  // get user data from frontend
  // validation -not empty
  // check if user already exit: username % email
  // check for images and avatar
  // upload to cloudinary, avatar
  // create user object - create entry in DB 
  // REMOVE password and refresh token 
  // check user creation 
  // return response 
  
  const {fullname,username,email,password} = req.body

  // console.log("Email: ",email);
  if (
    [fullname,email,username,password].some((field)=> field?.trim()==="")
  ) {
    throw  new ApiError(400,"All Fields are Required")
  }

  const exitedUser = await User.findOne({
    $or:[{username},{ email }]
  })

  if (exitedUser) {
    throw new ApiError(409,"User with email or username exist")
  }

 const avatarLocalPath =  req.files?.avatar[0]?.path;
//  const coverImageLocalPath = req.files?.coverImage[0]?.path; 

 let coverImageLocalPath;
 if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0) {
    coverImageLocalPath = req.files.coverImage[0].path
 } 
 
 if (!avatarLocalPath) {
  throw new ApiError(400,"Avatar File is required")
 }

 const avatar =  await uploadOnCloudinary(avatarLocalPath)
 const coverImage =  await uploadOnCloudinary(coverImageLocalPath)

 if (!avatar) {
  throw new ApiError(400,"Avatar File is required")

 }
 const user = await User.create({
  fullname,
  avatar:avatar.url,
  coverImage:coverImage?.url || "",
  email,
  password,
  username:username.toLowerCase()
 })

 const createdUser = await User.findById(user._id).select(
  "-password -refreshToken"
 )
  if (!createdUser) {
    throw new ApiError(500,"SOMETHING went wrong while save user")
  }

  return res.status(201).json(
    new ApiResponse(200,createdUser,"User register successfullty")
  )
})

export {registerUser}