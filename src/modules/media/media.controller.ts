import {
    Body,
    BadRequestException,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Req,
    UseGuards,
    Query
} from '@nestjs/common';

import { MediaService } from './media.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject } from '@nestjs/common';
import { S3_CLIENT } from '../../common/s3/s3.provider';
import { UpdateMediaTagsDto } from './dto/update-media-tags.dto';
import { ApiResponse } from '../../utils/api-response';

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
        @Req() req: any,
    ) {
        if (!albumId || !contentType) {
            throw new BadRequestException('albumId and contentType are required');
        }

        await this.mediaService.assertAlbumOwnedByUser(albumId, req.user.sub);

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

        return ApiResponse.success('Presigned upload URL generated', { uploadUrl, key });
    }

    @Post()
    async saveMedia(@Body() body: any, @Req() req: any) {
        const { albumId, key, contentType, size } = body;

        if (!albumId || !key || !contentType) {
            throw new BadRequestException('albumId, key and contentType are required');
        }

        const media = await this.mediaService.create({
            albumId,
            key,
            contentType,
            size,
            userId: req.user.sub,
        });

        return ApiResponse.success('Media saved', { media });
    }

    @Get('album/:albumId')
    async getAlbumMedia(@Param('albumId') albumId: string, @Req() req: any) {
        const media = await this.mediaService.findByAlbum(albumId, req.user.sub);
        return ApiResponse.success('Album media fetched', { media });
    }

    @Delete(':mediaId')
    async deleteMedia(@Param('mediaId') mediaId: string, @Req() req: any) {
        await this.mediaService.markDeleted(mediaId, req.user.sub);
        return ApiResponse.success('Media deleted');
    }

    @Patch(':mediaId/tags')
    async updateMediaTags(
        @Param('mediaId') mediaId: string,
        @Body() body: UpdateMediaTagsDto,
        @Req() req: any,
    ) {
        // allow partial update; default to empty array only if explicitly passed
        if (!body || !Array.isArray(body.tags)) {
            throw new BadRequestException('tags must be an array of strings');
        }

        const media = await this.mediaService.updateTags(mediaId, req.user.sub, body.tags);
        return ApiResponse.success('Media tags updated', { media });
    }

}
