

import { createClient } from "redis";
import { Config } from "./config.js";


const redisclient = createClient({
    url : Config.REDIS_URL
})


redisclient.on("error",function(err){
      console.log("Redis Error",err)
})

redisclient.on("connect",()=>{
    console.log("Redis Connected")
})

await redisclient.connect();

export default redisclient;