import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document,Types } from 'mongoose';

export type UserDocument = UserProfile & Document;

@Schema({ timestamps: true })
export class UserProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', unique: true })
  userId: Types.ObjectId;

  @Prop()
  fullName?: string;

  @Prop()
  bio?: string;

  @Prop()
  dob?: Date;

  @Prop()
  location?: string;

  @Prop()
  experience?: string; // trekking, cycling, etc (tags later)

  @Prop()
  website?: string;
}
