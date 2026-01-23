import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Album, AlbumDocument } from '../../models/albums.schema';
const DEFAULT_ALBUM_COVER = 'https://picsum.photos/seed/picsum/200/300';


@Injectable()
export class AlbumsService {
  constructor(
    @InjectModel(Album.name) private albumModel: Model<AlbumDocument>,
  ) {}

  async create(data: {
    title: string;
    description?: string;
    location?: string;
    story?: string;
    coverImage?: string;
    isPublic?: boolean;
    userId: string;
  }) {
    return this.albumModel.create({
      title: data.title,
      description: data.description,
      location: data.location,
      story: data.story,
      userId: data.userId,
      // albums always start private; if the user wants public, we store intent and
      // enable public once the album has media
      isPublic: false,
      isPublicRequested: Boolean(data.isPublic),
      coverImage: data.coverImage ?? DEFAULT_ALBUM_COVER,
      photoCount: 0,
    });
  }

  async findMyAlbums(userId: string) {
    return this.albumModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean(); // lean = faster, plain objects
  }

  private async findOwnedAlbum(albumId: string, userId: string) {
    if (!Types.ObjectId.isValid(albumId)) {
      throw new BadRequestException('Invalid albumId');
    }

    const album = await this.albumModel.findById(albumId);
    if (!album) {
      throw new NotFoundException('Album not found');
    }

    if (String(album.userId) !== String(userId)) {
      throw new ForbiddenException('You do not have access to this album');
    }

    return album;
  }

  async assertAlbumOwnedByUser(albumId: string, userId: string) {
    await this.findOwnedAlbum(albumId, userId);
  }

  async setCoverImage(albumId: string, userId: string, coverImage: string) {
    const album = await this.findOwnedAlbum(albumId, userId);
    album.coverImage = coverImage;
    await album.save();
    return album;
  }

  async requestVisibility(albumId: string, userId: string, isPublic: boolean) {
    const album = await this.findOwnedAlbum(albumId, userId);

    if (isPublic) {
      album.isPublicRequested = true;
      // cannot be public unless it has media; schema pre-save will also enforce this
      if ((album.photoCount ?? 0) > 0) {
        album.isPublic = true;
      } else {
        album.isPublic = false;
      }
    } else {
      album.isPublic = false;
      album.isPublicRequested = false;
    }

    await album.save();
    return album;
  }

  async updateDetails(
    albumId: string,
    userId: string,
    patch: {
      title?: string;
      description?: string;
      location?: string;
      story?: string;
      isPublic?: boolean;
    },
  ) {
    const album = await this.findOwnedAlbum(albumId, userId);

    let changed = false;

    if (typeof patch.title === 'string') {
      album.title = patch.title;
      changed = true;
    }
    if (typeof patch.description === 'string') {
      album.description = patch.description;
      changed = true;
    }
    if (typeof patch.location === 'string') {
      album.location = patch.location;
      changed = true;
    }
    if (typeof patch.story === 'string') {
      album.story = patch.story;
      changed = true;
    }

    if (typeof patch.isPublic === 'boolean') {
      if (patch.isPublic) {
        album.isPublicRequested = true;
        album.isPublic = (album.photoCount ?? 0) > 0;
      } else {
        album.isPublic = false;
        album.isPublicRequested = false;
      }
      changed = true;
    }

    if (!changed) {
      throw new BadRequestException('No valid fields to update');
    }

    await album.save();
    return album;
  }
}
