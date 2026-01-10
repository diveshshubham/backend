import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Query,
  Req,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { ApiResponse } from '../../utils/api-response';
import { UsersService } from './users.service';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UpdateProfilePictureDto } from './dto/update-profile-picture.dto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3_CLIENT } from '../../common/s3/s3.provider';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(S3_CLIENT) private readonly s3: S3Client,
  ) {}

  @Get('me')
  async getMe(@Req() req: any) {
    const data = await this.usersService.getMe(req.user.sub);
    return ApiResponse.success('Profile fetched', data);
  }

  @Patch('me')
  async updateMe(@Body() body: UpdateMyProfileDto, @Req() req: any) {
    const data = await this.usersService.updateMe(req.user.sub, body ?? {});
    return ApiResponse.success('Profile updated', data);
  }

  // Client uploads profile picture using this presigned URL
  @Get('me/profile-picture/presigned-url')
  async getProfilePicturePresignedUrl(
    @Query('contentType') contentType: string,
    @Req() req: any,
  ) {
    if (!contentType) {
      throw new BadRequestException('contentType is required');
    }

    const extension = contentType.split('/')[1];
    if (!extension) {
      throw new BadRequestException('Invalid contentType');
    }

    const { v4: uuid } = await import('uuid');
    const key = `users/${req.user.sub}/profile/${uuid()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 60 * 5,
    });

    return ApiResponse.success('Presigned profile picture upload URL generated', {
      uploadUrl,
      key,
    });
  }

  // After uploading to S3, save the key on the profile
  @Patch('me/profile-picture')
  async setProfilePicture(
    @Body() body: UpdateProfilePictureDto,
    @Req() req: any,
  ) {
    const profile = await this.usersService.updateProfilePicture(
      req.user.sub,
      body.profilePicture,
    );
    return ApiResponse.success('Profile picture updated', { profile });
  }
}

