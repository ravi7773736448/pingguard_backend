
import mongoose from 'mongoose';
import bcrypt from  'bcrypt';

const userSchema = new mongoose.Schema({
    username: {
    type: String,   
    required: [true,"username is required"],
  },
  email: {              
    type: String,
    required: [true,"email is required"],
    unique: true,
  },        
    password: { 
    type: String,
    select: false,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  avatar: {
    type: String
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },        
    createdAt: {        
    type: Date,
    default: Date.now,
  },
},{timestamps: true});    





userSchema.pre('save', async function(){
    if(!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password,10);
});


userSchema.methods.comparePassword = async function(password){
    return await bcrypt.compare(password, this.password);
};




const userModel = mongoose.model('User', userSchema);

export default userModel;   