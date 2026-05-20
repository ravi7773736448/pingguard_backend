
import {body, validationResult} from 'express-validator';


function validate(req,res,next){
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors : errors.array()})
    }   
    next();
}   

export const urlValidator = [
    body("url")
        .trim() 
        .notEmpty().withMessage("URL is required")
        .isURL().withMessage("Please provide a valid URL"),

    validate    


]