import { Controller, Get, Inject } from '@nestjs/common';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { S3_CLIENT } from './s3.provider';

@Controller('s3-test')
export class S3TestController {
  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
  ) {}

  @Get()
  async test() {
    const result = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: process.env.AWS_S3_BUCKET!,
        MaxKeys: 5,
      }),
    );

    return {
      bucket: process.env.AWS_S3_BUCKET,
      objectCount: result.KeyCount ?? 0,
    };
  }
}
