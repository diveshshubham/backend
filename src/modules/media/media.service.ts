import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Media, MediaDocument } from '../../models/media.schema';
import { Album, AlbumDocument } from '../../models/albums.schema';
import { UpdateMediaDetailsDto } from './dto/update-media-details.dto';

@Injectable()
export class MediaService {
  constructor(
    @InjectModel(Media.name)
    private mediaModel: Model<MediaDocument>,
    @InjectModel(Album.name)
    private albumModel: Model<AlbumDocument>,
  ) {}

  async assertAlbumOwnedByUser(albumId: string, userId: string) {
    if (!Types.ObjectId.isValid(albumId)) {
      throw new BadRequestException('Invalid albumId');
    }

    const album = await this.albumModel.findById(albumId).select('userId').lean();
    if (!album) {
      throw new NotFoundException('Album not found');
    }

    if (String(album.userId) !== String(userId)) {
      throw new ForbiddenException('You do not have access to this album');
    }
  }

  async create(data: {
    albumId: string;
    key: string;
    contentType: string;
    size?: number;
    userId: string;
    title?: string;
    description?: string;
    location?: string;
    story?: string;
    tags?: string[];
    isPublic?: boolean;
  }) {
    await this.assertAlbumOwnedByUser(data.albumId, data.userId);

    const media = await this.mediaModel.create({
      albumId: data.albumId,
      key: data.key,
      contentType: data.contentType,
      size: data.size,
      title: data.title,
      description: data.description,
      location: data.location,
      story: data.story,
      tags: data.tags,
      isPublic: typeof data.isPublic === 'boolean' ? data.isPublic : undefined,
    });

    const album = await this.albumModel.findById(data.albumId);
    if (!album) {
      // should be impossible because assertAlbumOwnedByUser already checked, but keep safe
      throw new NotFoundException('Album not found');
    }

    // increment photo count
    album.photoCount += 1;

    // auto set cover image if missing
    if (!album.coverImage) {
      album.coverImage = data.key;
    }

    // album can only be public once it has media
    if (album.photoCount >= 1 && album.isPublicRequested) {
      album.isPublic = true;
    }

    await album.save();

    return media;
  }


  async findByAlbum(albumId: string, userId: string) {
    await this.assertAlbumOwnedByUser(albumId, userId);
    return this.mediaModel.find({
      albumId,
      isDeleted: false,
    }).sort({ createdAt: -1 });
  }

  async markDeleted(mediaId: string, userId: string) {
    if (!Types.ObjectId.isValid(mediaId)) {
      throw new BadRequestException('Invalid mediaId');
    }

    const media = await this.mediaModel.findById(mediaId);
    if (!media) {
      throw new NotFoundException('Media not found');
    }

    await this.assertAlbumOwnedByUser(String(media.albumId), userId);

    if (media.isDeleted) {
      return media;
    }

    media.isDeleted = true;
    await media.save();

    const album = await this.albumModel.findById(media.albumId);
    if (!album) {
      return media;
    }

    album.photoCount = Math.max(0, (album.photoCount ?? 0) - 1);

    // if album becomes empty, it must be private
    if (album.photoCount <= 0) {
      album.isPublic = false;
    }

    await album.save();

    return media;
  }

  async updateTags(mediaId: string, userId: string, tags: string[]) {
    if (!Types.ObjectId.isValid(mediaId)) {
      throw new BadRequestException('Invalid mediaId');
    }

    const media = await this.mediaModel.findById(mediaId);
    if (!media || media.isDeleted) {
      throw new NotFoundException('Media not found');
    }

    await this.assertAlbumOwnedByUser(String(media.albumId), userId);

    media.tags = tags;
    await media.save();
    return media;
  }

  async updateDetails(mediaId: string, userId: string, details: UpdateMediaDetailsDto) {
    if (!Types.ObjectId.isValid(mediaId)) {
      throw new BadRequestException('Invalid mediaId');
    }

    const media = await this.mediaModel.findById(mediaId);
    if (!media || media.isDeleted) {
      throw new NotFoundException('Media not found');
    }

    await this.assertAlbumOwnedByUser(String(media.albumId), userId);

    if (typeof details.title !== 'undefined') media.title = details.title;
    if (typeof details.description !== 'undefined') media.description = details.description;
    if (typeof details.location !== 'undefined') media.location = details.location;
    if (typeof details.story !== 'undefined') media.story = details.story;
    if (typeof details.isPublic !== 'undefined') media.isPublic = details.isPublic;
    if (typeof details.tags !== 'undefined') media.tags = details.tags ?? [];

    await media.save();
    return media;
  }

  async setAsAlbumCover(mediaId: string, userId: string) {
    if (!Types.ObjectId.isValid(mediaId)) {
      throw new BadRequestException('Invalid mediaId');
    }

    const media = await this.mediaModel.findById(mediaId);
    if (!media || media.isDeleted) {
      throw new NotFoundException('Media not found');
    }

    await this.assertAlbumOwnedByUser(String(media.albumId), userId);

    const album = await this.albumModel.findById(media.albumId);
    if (!album) {
      throw new NotFoundException('Album not found');
    }

    album.coverImage = media.key;
    await album.save();
    return album;
  }
}
