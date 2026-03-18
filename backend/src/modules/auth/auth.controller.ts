import { Controller, Post, Get, Body, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { PinLoginDto, ChangePinDto, ResetPinDto } from './dto/pin-login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Get('stores')
  async getStoreList() {
    return this.authService.getStoreList();
  }

  @Public()
  @Post('pin-login')
  @HttpCode(HttpStatus.OK)
  async pinLogin(@Body() dto: PinLoginDto) {
    return this.authService.pinLogin(dto);
  }

  @Post('change-pin')
  @HttpCode(HttpStatus.OK)
  async changePin(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePinDto) {
    const storeId = user.storePermissions instanceof Map
      ? (user.storePermissions.keys().next().value as string | undefined) ?? 'HQ'
      : 'HQ';
    return this.authService.changePin(storeId, dto);
  }

  @Post('reset-pin')
  @HttpCode(HttpStatus.OK)
  async resetPin(@Body() dto: ResetPinDto) {
    return this.authService.resetPin(dto);
  }

  @Get('pins')
  async getAllPins() {
    return this.authService.getAllPins();
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshDto) {
    await this.authService.logout(dto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }
}
