import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../models/user.schema';
import {
  UserProfile,
  UserProfileDocument,
} from '../../models/user-profile.schema';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserProfile.name)
    private userProfileModel: Model<UserProfileDocument>,
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

  async getMe(userId: string) {
    const [user, profile] = await Promise.all([
      this.userModel.findById(userId).lean(),
      this.userProfileModel.findOne({ userId }).lean(),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { user, profile };
  }

  private isDuplicateKeyError(err: any) {
    return (
      err &&
      (err.code === 11000 || err?.name === 'MongoServerError') &&
      typeof err.message === 'string' &&
      err.message.includes('E11000')
    );
  }

  async updateMe(userId: string, dto: UpdateMyProfileDto) {
    const email =
      typeof dto.email === 'string' ? dto.email.trim().toLowerCase() : undefined;
    const phoneRaw =
      typeof dto.phone === 'string'
        ? dto.phone
        : typeof dto.mobileNumber === 'string'
          ? dto.mobileNumber
          : undefined;
    const phone = typeof phoneRaw === 'string' ? phoneRaw.trim() : undefined;

    const userSet: Partial<User> = {};
    if (typeof email !== 'undefined') userSet.email = email;
    if (typeof phone !== 'undefined') userSet.phone = phone;

    let user: any = null;
    if (Object.keys(userSet).length > 0) {
      try {
        user = await this.userModel
          .findByIdAndUpdate(userId, { $set: userSet }, { new: true })
          .lean();
      } catch (err: any) {
        if (this.isDuplicateKeyError(err)) {
          throw new BadRequestException('Email or phone already in use');
        }
        throw err;
      }
    } else {
      user = await this.userModel.findById(userId).lean();
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profileSet: Partial<UserProfile> = {};
    if (typeof dto.fullName !== 'undefined') profileSet.fullName = dto.fullName;
    if (typeof dto.bio !== 'undefined') profileSet.bio = dto.bio;
    if (typeof dto.description !== 'undefined' && typeof dto.bio === 'undefined')
      profileSet.bio = dto.description;
    if (typeof dto.dob !== 'undefined') profileSet.dob = new Date(dto.dob);
    if (typeof dto.location !== 'undefined') profileSet.location = dto.location;
    if (typeof dto.experience !== 'undefined')
      profileSet.experience = dto.experience;
    if (typeof dto.website !== 'undefined') profileSet.website = dto.website;
    if (typeof dto.tags !== 'undefined') profileSet.tags = dto.tags as any;
    if (typeof dto.favoriteAlbumIds !== 'undefined')
      profileSet.favoriteAlbumIds = dto.favoriteAlbumIds as any;
    if (typeof dto.favoriteMediaIds !== 'undefined')
      profileSet.favoriteMediaIds = dto.favoriteMediaIds as any;

    const profile =
      Object.keys(profileSet).length > 0
        ? await this.userProfileModel
            .findOneAndUpdate(
              { userId },
              { $set: profileSet, $setOnInsert: { userId } },
              { upsert: true, new: true },
            )
            .lean()
        : await this.userProfileModel.findOne({ userId }).lean();

    return { user, profile };
  }

  async updateProfilePicture(userId: string, profilePicture: string) {
    return this.userProfileModel
      .findOneAndUpdate(
        { userId },
        { $set: { profilePicture }, $setOnInsert: { userId } },
        { upsert: true, new: true },
      )
      .lean();
  }
  
}
