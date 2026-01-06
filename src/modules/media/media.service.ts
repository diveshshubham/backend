import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Media, MediaDocument } from '../../models/media.schema';

@Injectable()
export class MediaService {
  constructor(
    @InjectModel(Media.name)
    private mediaModel: Model<MediaDocument>,
  ) {}

  create(data: {
    albumId: string;
    key: string;
    contentType: string;
    size?: number;
  }) {
    return this.mediaModel.create({
      albumId: new Types.ObjectId(data.albumId),
      key: data.key,
      contentType: data.contentType,
      size: data.size,
    });
  }

  findByAlbum(albumId: string) {
    return this.mediaModel.find({
      albumId,
      isDeleted: false,
    }).sort({ createdAt: -1 });
  }

  markDeleted(mediaId: string) {
    return this.mediaModel.findByIdAndUpdate(mediaId, {
      isDeleted: true,
    });
  }
}
