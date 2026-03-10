import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())
app.get('/',(req,res)=>{
     res.send("hallo complex backend")
})
app.listen(process.env.PORT,()=>{
    console.log("server is running at port 8000")
})
export {app};