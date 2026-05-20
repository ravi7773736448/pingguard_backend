

import { config } from "dotenv";


config()


if(!process.env.MONGO_URI){
    throw new Error("MONGO_URI is not in .env environment");   
}

if(!process.env.JWT_SECRET){
    throw new Error("JWT_SECRET is not in .env environment")
}

if(!process.env.EMAIL_USER){
    throw new Error("EMAIL_USER is not in .env environment")
}

if(!process.env.REFRESH_TOKEN){
    throw new Error("REFRESH_TOKEN is not in .env environment")
}
if(!process.env.CLIENT_SECRET){
    throw new Error("CLIENT_SECRET is not in .env environment")
}

if(!process.env.CLIENT_ID){
    throw new Error("CLIENT_ID is not in .env environment")
}


if(!process.env.REDIS_URL){
    throw new Error("REDIS_URL is not in .env environment")
}

if(!process.env.GOOGLE_GEMINI_KEY){
    throw new Error("GOOGLE_GEMINI_KEY is not in .env environment")
}

if(!process.env.MISTRAL_API_KEY){
    throw new Error("MISTRAL_API_KEY is not in .env environment")
}


if(!process.env.IMAGEKIT_PRIVATE_KEY){
    throw new Error("IMAGEKIT_PRIVATE_KEY is not in .env environment")
}

if(!process.env.IMAGEKIT_PUBLIC_KEY){
    throw new Error("IMAGEKIT_PUBLIC_KEY is not in .env environment")
}





export const Config = {
    MONGO_URI : process.env.MONGO_URI,
    JWT_SECRET : process.env.JWT_SECRET,
    CLIENT_ID : process.env.CLIENT_ID,
    REFRESH_TOKEN : process.env.REFRESH_TOKEN,
    CLIENT_SECRET : process.env.CLIENT_SECRET,
    EMAIL_USER : process.env.EMAIL_USER,
    REDIS_URL : process.env.REDIS_URL,
    GEMINI_API_KEY : process.env.GOOGLE_GEMINI_KEY,
    MISTRAL_API_KEY : process.env.MISTRAL_API_KEY,
    IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY,
    IMAGEKIT_PUBLIC_KEY : process.env.IMAGEKIT_PUBLIC_KEY,

}

