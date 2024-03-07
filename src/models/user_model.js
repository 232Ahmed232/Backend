import mongoose ,{Schema} from "mongoose";
import jwt  from "jsonwebtoken";
import bcrypt  from "bcrypt"


const userSchema = new Schema({
    username:{
        type:String,
        required : true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true,
    },
    email:{
        type:String,
        required : true,
        unique:true,
        lowercase:true,
        trim:true,
        
    },
    fullname:{
        type:String,
        required : true,
        index:true,
        trim:true,
        
    },
    avatar:{
        type:String,
        required : true,
        
    },
    coverImage:{
        type:String,
        
        
    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:"Video"
        }
    ],
    password:{
        type:String,
        required:[true,"Password is required"],
    },
    refreshToken:{
        type:String,
    }
},{timestamps:true})

userSchema.pre("save",async function(next){
    if (!this.isModified("password")) return next();
        
    
    this.password = await bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
   return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessTokent = function (){
  return  jwt.sign(
        {
            _id:this.id,
            email:this.email,
            username:this.username,
            fullname:this.fullname,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRAY
        }
    )
}
userSchema.methods.generateRefreshTokent = function (){
    return  jwt.sign(
        {
            _id:this.id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRAY
        }
    )
}

export const User = mongoose.model("User",userSchema)