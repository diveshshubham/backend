import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../models/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  findByPhone(phone: string) {
    return this.userModel.findOne({ phone });
  }

  async upsertUser(data: Partial<User>) {
    return this.userModel.findOneAndUpdate(
      data,
      { $setOnInsert: data },
      { upsert: true, new: true },
    );
  }

  updateOtp(userId: string | any, otp: string, expiresAt: Date) {
    return this.userModel.findByIdAndUpdate(userId, {
      otp,
      otpExpiresAt: expiresAt,
    });
  }
  
  verifyOtp(userId: string | any) {
    return this.userModel.findByIdAndUpdate(userId, {
      otp: null,
      otpExpiresAt: null,
      isVerified: true,
    });
  }
  
}
