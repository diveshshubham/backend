import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { AlbumsService } from './albums.service';

@Controller('albums')
@UseGuards(JwtAuthGuard)
export class AlbumsController {
  constructor(private albumsService: AlbumsService) {}

  @Post()
  create(@Body() body: any, @Req() req) {
    return this.albumsService.create({
      ...body,
      userId: req.user.sub,
    });
  }

  @Get('me')
  getMyAlbums(@Req() req) {
    return this.albumsService.findMyAlbums(req.user.sub);
  }
}
