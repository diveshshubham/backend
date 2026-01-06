import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MediaDocument = Media & Document;

@Schema({ timestamps: true })
export class Media {
  @Prop({ type: Types.ObjectId, ref: 'Album', required: true })
  albumId: Types.ObjectId;

  @Prop({ required: true })
  key: string; // S3 object key

  @Prop({ required: true })
  contentType: string;

  @Prop()
  size?: number;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const MediaSchema = SchemaFactory.createForClass(Media);
