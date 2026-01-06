import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Album, AlbumDocument } from '../../models/albums.schema';

@Injectable()
export class AlbumsService {
  constructor(
    @InjectModel(Album.name) private albumModel: Model<AlbumDocument>,
  ) {}

  create(data: Partial<Album>) {
    return this.albumModel.create(data);
  }

  findMyAlbums(userId: string) {
    return this.albumModel.find({ userId }).sort({ createdAt: -1 });
  }
}
