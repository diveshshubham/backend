import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UseGuards,
    Query
} from '@nestjs/common';

import { MediaService } from './media.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject } from '@nestjs/common';
import { S3_CLIENT } from '../../common/s3/s3.provider';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
    constructor(
        @Inject(S3_CLIENT) private readonly s3: S3Client,
        private readonly mediaService: MediaService
    ) { }

    @Get('presigned-url')
    async getPresignedUrl(
        @Query('albumId') albumId: string,
        @Query('contentType') contentType: string,
    ) {
        if (!albumId || !contentType) {
            throw new Error('albumId and contentType are required');
        }

        const extension = contentType.split('/')[1];
        const { v4: uuid } = await import('uuid');
        const key = `albums/${albumId}/${uuid()}.${extension}`;
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: key,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(this.s3, command, {
            expiresIn: 60 * 5, // 5 minutes
        });

        return {
            uploadUrl,
            key,
        };
    }

    @Post()
    async saveMedia(@Body() body: any) {
        const { albumId, key, contentType, size } = body;

        if (!albumId || !key || !contentType) {
            throw new Error('albumId, key and contentType are required');
        }

        return this.mediaService.create({
            albumId,
            key,
            contentType,
            size,
        });
    }

    @Get('album/:albumId')
    async getAlbumMedia(@Param('albumId') albumId: string) {
        return this.mediaService.findByAlbum(albumId);
    }

    @Delete(':mediaId')
    async deleteMedia(@Param('mediaId') mediaId: string) {
        await this.mediaService.markDeleted(mediaId);
        return { success: true };
    }

}
