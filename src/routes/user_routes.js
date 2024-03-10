import { Router } from "express";
import { logOutUser, loginUser, registerUser } from "../controllers/user_controller.js";
import {upload} from "../middlewares/multer_middleware.js"
import { verifyJWT } from "../middlewares/auth_middleware.js";


const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
    )

router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT,logOutUser)

export default router;