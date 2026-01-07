import { BadRequestException, Injectable } from '@nestjs/common';
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
    const email = typeof data.email === 'string' ? data.email.trim() : undefined;
    const phone = typeof data.phone === 'string' ? data.phone.trim() : undefined;

    const query = email ? { email } : phone ? { phone } : null;
    if (!query) {
      throw new BadRequestException('Email or phone required');
    }

    const setOnInsert: Partial<User> = {};
    if (email) setOnInsert.email = email;
    if (phone) setOnInsert.phone = phone;

    return this.userModel.findOneAndUpdate(
      query,
      { $setOnInsert: setOnInsert },
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
