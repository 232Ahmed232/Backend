import { aysncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from '../models/user_model.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })
    return { accessToken, refreshToken }
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
  }
}

const registerUser = aysncHandler(async (req, res) => {
  // get user data from frontend
  // validation -not empty
  // check if user already exit: username % email
  // check for images and avatar
  // upload to cloudinary, avatar
  // create user object - create entry in DB 
  // REMOVE password and refresh token 
  // check user creation 
  // return response 

  const { fullname, username, email, password } = req.body

  // console.log("Email: ",email);
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All Fields are Required")
  }

  const exitedUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (exitedUser) {
    throw new ApiError(409, "User with email or username exist")
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //  const coverImageLocalPath = req.files?.coverImage[0]?.path; 

  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar File is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!avatar) {
    throw new ApiError(400, "Avatar File is required")

  }
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )
  if (!createdUser) {
    throw new ApiError(500, "SOMETHING went wrong while save user")
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser, "User register successfullty")
  )
})

const loginUser = aysncHandler(async (req, res) => {
  // req body -> data
  // username or email
  // find the user
  // password  check
  // access and refresh token 
  // send cookie

  const { email, username, password } = req.body
  if (!(username || email)) {
    throw new ApiError(400, "username or email is required")
  }

  const user = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (!user) {
    throw new ApiError(404, "User does not exist")
  }

  const isPassordValid = await user.isPasswordCorrect(password)

  if (!isPassordValid) {
    throw new ApiError(401, "Invalid user credentials")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

  const LoggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true,
  }
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200,
        {
          user: LoggedInUser, accessToken, refreshToken
        },
        "User Loggen in successfully"
      )
    )


})

const logOutUser = aysncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    }, {
    new: true,
  }
  )

  const options = {
    httpOnly: true,
    secure: true,
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = aysncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)

    if (!user) {
      throw new ApiError(401, "Invalid refresh token")
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired")
    }

    const options = {
      httpOnly: true,
      secure: true
    }

    const { newrefreshToken, accessToken } = await generateAccessAndRefreshTokens(user._id)

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new ApiResponse(200,
          {
            accessToken, newrefreshToken
          },
          "Access token refresh"
        )
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid token")
  }
})

const changeCurrentPassword = aysncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body
  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old Password")
  }

  user.password = newPassword
  await user.save({ validateBeforeSave: false })

  return res.status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})


const getCurrentUser = aysncHandler(async (req, res) => {
  return res.status(200)
    .json(new ApiResponse(200, req.user, "Cureent user fetched successfully"));
})


const updateAccountDetails = aysncHandler(async (req, res) => {
  const { fullname, email } = req.body
  if (!fullname || !email) {
    throw new ApiError(400, "User name and email are req")
  }

  const user = User.findByIdAndUpdate(req.user?._id,
    {
      $set: {
        fullname,
        email: email
      }
    }, {
    new: true
  }).select("-password")

  return res.status(200)
    .json(new ApiResponse(200, user, "Account Details successfully"))

})


const updateUserCoverImage = aysncHandler(async (req, res) => {
  const coverLocalPath = req.file?.path

  if (!coverLocalPath) {
    throw new ApiError(400, "CoveriMage file not found")
  }

  const coverImage = await uploadOnCloudinary(avatarLocalPath)

  if (!coverImage.url) {
    throw new ApiError(400, "While uploading Cover Image")
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    }, { new: true }).select("-password")

  return res.status(200)
    .json(new ApiResponse(200, user, "Cover I mage successfully"))
})


const updateUserAvatar = aysncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file not found")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if (!avatar.url) {
    throw new ApiError(400, "While uploading avatar")
  }

  await User.findByIdAndUpdate(req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    }, { new: true }).select("-password")

  return res.status(200)
    .json(new ApiResponse(200, user, "Avatar I mage successfully"))
})


const getUserChannelProfile = aysncHandler(async (req, res) => {
  const { username } = req.params

  if (!username.trim()) {
    throw new ApiError(400, "Username is missing")
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    }, {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscriberTo"
      }
    }, 
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        },
        channelsSubscribetoCount: {
          $size: "$subscriberTo"
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false
          }
        }
      }

    },
    {
      $project: {

      }
    }
  ])


  if (!channel?.length){
    throw new ApiError(400,"Channel does not exist")
  }

  return res.status(200)
  .json( new ApiResponse(200, channel[0],"User channel fetched successfully"))

})


const getWatchHistory = aysncHandler(async(req,res)=>{

  const user = await User.aggregate([
    {
      $match:{
        _id:new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup:{
        from:"videos",
        localField:"watchHistory",
        foreignField:"_id",
        as:"watchHistroy",
        pipeline:[
          {
            $lookup:{
              from:"users",
              localField:"owner",
              foreignField:"_id",
              as:"owner",
              pipeline:[
                {
                  $project:{
                    fullname:1,
                    username:1,
                    avatar:1
                  }
                }
              ]
            }
          },
          {
            $addFields:{
                owner:{
                    $first: "$owner"
                }
            }
        }
        ]
      }
    }
  ])

  return res.status(200)
  .json( new ApiResponse(200,user[0].watchHistory, "Watch history "))
})


export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
}